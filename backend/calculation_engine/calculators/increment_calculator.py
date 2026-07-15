"""
Increment / Salary Hike Calculator.

Calculates the impact of a salary increment on CTC, gross,
and in-hand salary. Shows effective increase after PF and tax changes.
"""

from typing import Any
from calculation_engine.base import BaseCalculator, CalculationResult
from calculation_engine.registry import CalculatorRegistry
from calculation_engine.rules import RulesEngine
from calculation_engine.calculators.salary_common import (
    calculate_pf_contribution,
    calculate_professional_tax,
)


@CalculatorRegistry.register
class IncrementCalculator(BaseCalculator):

    @property
    def calculator_id(self) -> str:
        return "increment_calculator"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def name(self) -> str:
        return "Increment / Hike Calculator"

    @property
    def description(self) -> str:
        return (
            "Calculate the real impact of a salary hike on your in-hand salary. "
            "Shows how much of the increment translates to actual take-home increase."
        )

    @property
    def supported_financial_years(self) -> list[str]:
        return ["2024-25"]

    def get_input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "required": ["current_ctc", "financial_year"],
            "properties": {
                "current_ctc": {"type": "number", "minimum": 0, "description": "Current annual CTC"},
                "new_ctc": {"type": "number", "minimum": 0, "description": "New annual CTC (provide this OR hike_percent)"},
                "hike_percent": {"type": "number", "minimum": 0, "description": "Hike percentage (provide this OR new_ctc)"},
                "financial_year": {"type": "string", "enum": ["2024-25"]},
                "basic_percent": {"type": "number", "minimum": 20, "maximum": 60, "default": 40},
                "hra_percent_of_basic": {"type": "number", "minimum": 0, "maximum": 100, "default": 50},
                "pf_on_full_basic": {"type": "boolean", "default": False},
                "employer_pf_in_ctc": {"type": "boolean", "default": True},
                "gratuity_in_ctc": {"type": "boolean", "default": True},
                "state": {"type": "string", "default": "karnataka"},
            },
        }

    def get_output_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "hike_percent": {"type": "number"},
                "ctc_increase": {"type": "number"},
                "inhand_increase_monthly": {"type": "number"},
                "effective_hike_percent": {"type": "number"},
            },
        }

    def validate_inputs(self, inputs: dict[str, Any]) -> list[str]:
        errors = []
        if "current_ctc" not in inputs:
            errors.append("current_ctc is required")
        elif inputs["current_ctc"] <= 0:
            errors.append("current_ctc must be positive")
        if "new_ctc" not in inputs and "hike_percent" not in inputs:
            errors.append("Either new_ctc or hike_percent is required")
        if "financial_year" not in inputs:
            errors.append("financial_year is required")
        elif inputs["financial_year"] not in self.supported_financial_years:
            errors.append(f"financial_year must be one of {self.supported_financial_years}")
        return errors

    def _compute_inhand(self, ctc: float, inputs: dict[str, Any], rules: dict[str, Any]) -> dict[str, float]:
        """Compute in-hand for a given CTC."""
        basic_pct = inputs.get("basic_percent", 40) / 100
        hra_pct = inputs.get("hra_percent_of_basic", 50) / 100
        pf_on_full = inputs.get("pf_on_full_basic", False)
        employer_pf_in_ctc = inputs.get("employer_pf_in_ctc", True)
        gratuity_in_ctc = inputs.get("gratuity_in_ctc", True)
        state = inputs.get("state", "karnataka")

        basic_annual = round(ctc * basic_pct)
        basic_monthly = round(basic_annual / 12)

        pf_data = calculate_pf_contribution(basic_monthly, rules, pf_on_full)
        employer_pf = pf_data["employer_pf_annual"] if employer_pf_in_ctc else 0
        gratuity = round(basic_annual * 0.0481) if gratuity_in_ctc else 0

        gross_annual = ctc - employer_pf - gratuity
        gross_monthly = round(gross_annual / 12)

        pt_data = calculate_professional_tax(gross_monthly, state, rules)
        employee_pf = pf_data["employee_pf_annual"]
        pt_annual = pt_data["annual"]

        net_annual = gross_annual - employee_pf - pt_annual
        net_monthly = round(net_annual / 12)

        return {
            "ctc": ctc,
            "gross_annual": gross_annual,
            "gross_monthly": gross_monthly,
            "basic_monthly": basic_monthly,
            "employee_pf_monthly": pf_data["employee_pf_monthly"],
            "employer_pf_annual": employer_pf,
            "gratuity_annual": gratuity,
            "net_annual": net_annual,
            "net_monthly": net_monthly,
        }

    def calculate(
        self,
        inputs: dict[str, Any],
        financial_year: str,
        rules_engine: RulesEngine | None = None,
        rules: dict[str, Any] | None = None,
    ) -> CalculationResult:
        if rules is None:
            if rules_engine is None:
                raise ValueError("Either rules_engine or rules must be provided")
            rules = rules_engine.load_rules("salary", financial_year)

        current_ctc = inputs["current_ctc"]

        # Determine new CTC
        if "new_ctc" in inputs and inputs["new_ctc"]:
            new_ctc = inputs["new_ctc"]
            hike_percent = round((new_ctc - current_ctc) / current_ctc * 100, 2)
        elif "hike_percent" in inputs:
            hike_percent = inputs["hike_percent"]
            new_ctc = round(current_ctc * (1 + hike_percent / 100))
        else:
            raise ValueError("Either new_ctc or hike_percent must be provided")

        ctc_increase = new_ctc - current_ctc

        # Compute before and after
        before = self._compute_inhand(current_ctc, inputs, rules)
        after = self._compute_inhand(new_ctc, inputs, rules)

        inhand_increase_monthly = after["net_monthly"] - before["net_monthly"]
        inhand_increase_annual = after["net_annual"] - before["net_annual"]

        # Effective hike = actual take-home increase / old take-home
        effective_hike = round(inhand_increase_annual / before["net_annual"] * 100, 2) if before["net_annual"] > 0 else 0

        # PF increase
        pf_increase_monthly = after["employee_pf_monthly"] - before["employee_pf_monthly"]
        employer_pf_increase = after["employer_pf_annual"] - before["employer_pf_annual"]

        breakdown = [
            {"metric": "CTC", "before": round(current_ctc), "after": round(new_ctc), "change": round(ctc_increase)},
            {"metric": "Gross (Annual)", "before": before["gross_annual"], "after": after["gross_annual"], "change": after["gross_annual"] - before["gross_annual"]},
            {"metric": "Gross (Monthly)", "before": before["gross_monthly"], "after": after["gross_monthly"], "change": after["gross_monthly"] - before["gross_monthly"]},
            {"metric": "Employee PF (Monthly)", "before": before["employee_pf_monthly"], "after": after["employee_pf_monthly"], "change": pf_increase_monthly},
            {"metric": "In-Hand (Monthly)", "before": before["net_monthly"], "after": after["net_monthly"], "change": inhand_increase_monthly},
            {"metric": "In-Hand (Annual)", "before": before["net_annual"], "after": after["net_annual"], "change": inhand_increase_annual},
        ]

        return CalculationResult(
            calculator_id=self.calculator_id,
            calculator_version=self.version,
            financial_year=financial_year,
            inputs=inputs,
            outputs={
                "current_ctc": round(current_ctc),
                "new_ctc": round(new_ctc),
                "hike_percent": hike_percent,
                "ctc_increase": round(ctc_increase),
                "current_inhand_monthly": before["net_monthly"],
                "new_inhand_monthly": after["net_monthly"],
                "inhand_increase_monthly": inhand_increase_monthly,
                "inhand_increase_annual": inhand_increase_annual,
                "effective_hike_percent": effective_hike,
                "pf_increase_monthly": pf_increase_monthly,
                "employer_pf_increase_annual": employer_pf_increase,
                "lost_to_pf_and_gratuity": round(ctc_increase - inhand_increase_annual - (after["employer_pf_annual"] - before["employer_pf_annual"]) - (after["gratuity_annual"] - before["gratuity_annual"])),
            },
            breakdown=breakdown,
            assumptions=[
                f"Hike of {hike_percent}% applied uniformly to CTC",
                "Same salary structure (basic%, HRA%) maintained post-hike",
                f"PF on {'full basic' if inputs.get('pf_on_full_basic', False) else '₹15,000 cap'}",
                "Tax impact not included (effective hike will be lower post-tax)",
                "No change in company PF policy assumed",
            ],
            formula_references=[
                "EPF & MP Act, 1952",
                "Standard increment calculation methodology",
            ],
            metadata={
                "hike_percent": hike_percent,
                "effective_hike_percent": effective_hike,
            },
        )
