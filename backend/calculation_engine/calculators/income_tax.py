"""Income Tax Calculator - Supports Old and New regime for India."""

from typing import Any
from calculation_engine.base import BaseCalculator, CalculationResult
from calculation_engine.registry import CalculatorRegistry
from calculation_engine.rules import RulesEngine


@CalculatorRegistry.register
class IncomeTaxCalculator(BaseCalculator):
    """
    Indian Income Tax Calculator.

    Supports both Old and New tax regimes with:
    - Slab-based tax computation
    - Standard deduction
    - Section 87A rebate
    - Surcharge
    - Health & Education Cess
    - Deductions (80C, 80D) for old regime
    """

    @property
    def calculator_id(self) -> str:
        return "income_tax_india"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def name(self) -> str:
        return "Income Tax Calculator (India)"

    @property
    def description(self) -> str:
        return (
            "Calculate Indian income tax under both Old and New regimes "
            "with full slab breakdown, surcharge, and cess."
        )

    @property
    def supported_financial_years(self) -> list[str]:
        return ["2024-25"]

    def get_input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "required": ["gross_income", "financial_year", "regime"],
            "properties": {
                "gross_income": {
                    "type": "number",
                    "minimum": 0,
                    "description": "Total gross annual income in INR",
                },
                "financial_year": {
                    "type": "string",
                    "enum": ["2024-25"],
                    "description": "Financial year for tax computation",
                },
                "regime": {
                    "type": "string",
                    "enum": ["old", "new"],
                    "description": "Tax regime to apply",
                },
                "deductions_80c": {
                    "type": "number",
                    "minimum": 0,
                    "default": 0,
                    "description": "Deductions under Section 80C (old regime only)",
                },
                "deductions_80d": {
                    "type": "number",
                    "minimum": 0,
                    "default": 0,
                    "description": "Deductions under Section 80D (old regime only)",
                },
                "hra_exemption": {
                    "type": "number",
                    "minimum": 0,
                    "default": 0,
                    "description": "HRA exemption amount (old regime only)",
                },
                "other_deductions": {
                    "type": "number",
                    "minimum": 0,
                    "default": 0,
                    "description": "Other eligible deductions (old regime only)",
                },
            },
        }

    def get_output_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "taxable_income": {"type": "number"},
                "tax_before_cess": {"type": "number"},
                "surcharge": {"type": "number"},
                "cess": {"type": "number"},
                "total_tax": {"type": "number"},
                "effective_tax_rate": {"type": "number"},
                "monthly_tax": {"type": "number"},
            },
        }

    def validate_inputs(self, inputs: dict[str, Any]) -> list[str]:
        """Validate calculator inputs."""
        errors = []
        if "gross_income" not in inputs:
            errors.append("gross_income is required")
        elif inputs["gross_income"] < 0:
            errors.append("gross_income must be non-negative")

        if "financial_year" not in inputs:
            errors.append("financial_year is required")
        elif inputs["financial_year"] not in self.supported_financial_years:
            errors.append(f"financial_year must be one of {self.supported_financial_years}")

        if "regime" not in inputs:
            errors.append("regime is required")
        elif inputs["regime"] not in ("old", "new"):
            errors.append("regime must be 'old' or 'new'")

        return errors

    def calculate(
        self,
        inputs: dict[str, Any],
        financial_year: str,
        rules_engine: RulesEngine | None = None,
        rules: dict[str, Any] | None = None,
    ) -> CalculationResult:
        """
        Execute income tax calculation.

        Args:
            inputs: Validated input parameters.
            financial_year: Financial year string (e.g., "2024-25").
            rules_engine: Optional RulesEngine instance for loading rules.
            rules: Optional pre-loaded rules dict (for testing).
        """
        # Load rules
        if rules is None:
            if rules_engine is None:
                raise ValueError("Either rules_engine or rules must be provided")
            rules = rules_engine.load_rules("income_tax", financial_year)

        regime = inputs["regime"]
        regime_rules = rules["regimes"][regime]
        gross_income = inputs["gross_income"]

        # Step 1: Calculate deductions
        standard_deduction = regime_rules["standard_deduction"]
        if regime == "old":
            deductions_80c = min(
                inputs.get("deductions_80c", 0),
                regime_rules.get("section_80c_limit", 150000),
            )
            deductions_80d = min(
                inputs.get("deductions_80d", 0),
                regime_rules.get("section_80d_limit_self", 25000),
            )
            hra_exemption = inputs.get("hra_exemption", 0)
            other_deductions = inputs.get("other_deductions", 0)
            total_deductions = (
                standard_deduction + deductions_80c + deductions_80d
                + hra_exemption + other_deductions
            )
        else:
            total_deductions = standard_deduction

        # Step 2: Taxable income
        taxable_income = max(0, gross_income - total_deductions)

        # Step 3: Slab-based tax calculation
        slabs = regime_rules["slabs"]
        tax_on_slabs = 0
        breakdown = []

        for slab in slabs:
            slab_from = slab["from"]
            slab_to = slab["to"] if slab["to"] is not None else float("inf")
            rate = slab["rate"]

            if taxable_income <= slab_from:
                break

            taxable_in_slab = min(taxable_income, slab_to) - slab_from + 1
            if slab_from == 0:
                taxable_in_slab = min(taxable_income, slab_to) - slab_from
                if taxable_income > slab_to:
                    taxable_in_slab = slab_to - slab_from
            else:
                taxable_in_slab = min(taxable_income, slab_to) - slab_from
                if slab_to == float("inf"):
                    taxable_in_slab = taxable_income - slab_from + 1

            # Cleaner slab calculation
            lower = slab_from
            upper = slab_to if slab_to != float("inf") else taxable_income
            amount_in_slab = max(0, min(taxable_income, upper) - lower)
            if slab_from == 0:
                amount_in_slab = min(taxable_income, upper)
            else:
                amount_in_slab = max(0, min(taxable_income, upper) - lower)

            tax_for_slab = amount_in_slab * rate / 100
            tax_on_slabs += tax_for_slab

            breakdown.append({
                "slab": f"₹{slab_from:,.0f} - ₹{upper:,.0f}" if slab["to"] else f"Above ₹{slab_from:,.0f}",
                "amount_in_slab": round(amount_in_slab),
                "rate_percent": rate,
                "tax": round(tax_for_slab),
            })

        # Step 4: Apply Section 87A rebate
        rebate = 0
        rebate_limit = regime_rules.get("rebate_87a_limit", 0)
        rebate_max = regime_rules.get("rebate_87a_max", 0)
        if taxable_income <= rebate_limit:
            rebate = min(tax_on_slabs, rebate_max)

        tax_after_rebate = max(0, tax_on_slabs - rebate)

        # Step 5: Surcharge
        surcharge = 0
        surcharge_slabs = regime_rules.get("surcharge_slabs", [])
        for s_slab in surcharge_slabs:
            s_from = s_slab["from"]
            s_to = s_slab["to"] if s_slab["to"] is not None else float("inf")
            if s_from <= taxable_income <= s_to or (s_to == float("inf") and taxable_income >= s_from):
                surcharge = tax_after_rebate * s_slab["rate"] / 100
                break

        # Step 6: Health & Education Cess
        cess_rate = regime_rules.get("cess_rate", 4)
        cess = (tax_after_rebate + surcharge) * cess_rate / 100

        # Final
        total_tax = round(tax_after_rebate + surcharge + cess)
        effective_rate = (total_tax / gross_income * 100) if gross_income > 0 else 0

        return CalculationResult(
            calculator_id=self.calculator_id,
            calculator_version=self.version,
            financial_year=financial_year,
            inputs=inputs,
            outputs={
                "gross_income": round(gross_income),
                "total_deductions": round(total_deductions),
                "taxable_income": round(taxable_income),
                "tax_on_slabs": round(tax_on_slabs),
                "rebate_87a": round(rebate),
                "tax_after_rebate": round(tax_after_rebate),
                "surcharge": round(surcharge),
                "cess": round(cess),
                "total_tax": total_tax,
                "effective_tax_rate_percent": round(effective_rate, 2),
                "monthly_tax": round(total_tax / 12),
            },
            breakdown=breakdown,
            assumptions=[
                "Income is from salary only",
                "No capital gains or other special income sources",
                f"Standard deduction of ₹{standard_deduction:,.0f} applied",
                "Surcharge marginal relief not applied (simplified)",
            ],
            formula_references=[
                "Income Tax Act, 1961",
                f"Finance Act {financial_year} - {regime_rules['name']}",
                "Section 87A - Rebate for individuals",
            ],
            metadata={
                "regime": regime,
                "regime_name": regime_rules["name"],
            },
        )
