"""
Offer Comparison Calculator.

Compare multiple job offers on an apples-to-apples basis by normalizing
different CTC structures to actual in-hand salary.
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
class OfferComparisonCalculator(BaseCalculator):

    @property
    def calculator_id(self) -> str:
        return "offer_comparison"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def name(self) -> str:
        return "Offer Comparison Calculator"

    @property
    def description(self) -> str:
        return (
            "Compare 2 or more job offers on actual in-hand salary by normalizing "
            "different CTC structures, PF policies, and benefit compositions."
        )

    @property
    def supported_financial_years(self) -> list[str]:
        return ["2026-27"]

    def get_input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "required": ["offers", "financial_year"],
            "properties": {
                "offers": {
                    "type": "array",
                    "minItems": 2,
                    "maxItems": 5,
                    "items": {
                        "type": "object",
                        "required": ["name", "annual_ctc"],
                        "properties": {
                            "name": {"type": "string", "description": "Company/offer name"},
                            "annual_ctc": {"type": "number", "minimum": 0},
                            "basic_percent": {"type": "number", "default": 40},
                            "hra_percent_of_basic": {"type": "number", "default": 50},
                            "pf_on_full_basic": {"type": "boolean", "default": False},
                            "employer_pf_in_ctc": {"type": "boolean", "default": True},
                            "gratuity_in_ctc": {"type": "boolean", "default": True},
                            "insurance_annual": {"type": "number", "default": 0},
                            "variable_pay_annual": {"type": "number", "default": 0, "description": "Annual bonus/variable (not guaranteed)"},
                            "esops_annual_value": {"type": "number", "default": 0, "description": "Estimated annual ESOP value"},
                            "other_benefits_annual": {"type": "number", "default": 0},
                        },
                    },
                },
                "financial_year": {"type": "string", "enum": ["2026-27"]},
                "state": {"type": "string", "default": "karnataka"},
            },
        }

    def get_output_schema(self) -> dict[str, Any]:
        return {"type": "object", "properties": {"comparison": {"type": "array"}}}

    def validate_inputs(self, inputs: dict[str, Any]) -> list[str]:
        errors = []
        if "offers" not in inputs:
            errors.append("offers array is required")
        elif not isinstance(inputs["offers"], list):
            errors.append("offers must be an array")
        elif len(inputs["offers"]) < 2:
            errors.append("At least 2 offers are required for comparison")
        else:
            for i, offer in enumerate(inputs["offers"]):
                if "name" not in offer:
                    errors.append(f"Offer {i+1}: name is required")
                if "annual_ctc" not in offer:
                    errors.append(f"Offer {i+1}: annual_ctc is required")
        if "financial_year" not in inputs:
            errors.append("financial_year is required")
        elif inputs["financial_year"] not in self.supported_financial_years:
            errors.append(f"financial_year must be one of {self.supported_financial_years}")
        return errors

    def _compute_offer(self, offer: dict[str, Any], state: str, rules: dict[str, Any]) -> dict[str, Any]:
        """Compute in-hand for a single offer."""
        ctc = offer["annual_ctc"]
        basic_pct = offer.get("basic_percent", 40) / 100
        hra_pct = offer.get("hra_percent_of_basic", 50) / 100
        pf_on_full = offer.get("pf_on_full_basic", False)
        employer_pf_in_ctc = offer.get("employer_pf_in_ctc", True)
        gratuity_in_ctc = offer.get("gratuity_in_ctc", True)
        insurance = offer.get("insurance_annual", 0)
        variable = offer.get("variable_pay_annual", 0)
        esops = offer.get("esops_annual_value", 0)
        other_benefits = offer.get("other_benefits_annual", 0)

        basic_annual = round(ctc * basic_pct)
        basic_monthly = round(basic_annual / 12)

        pf_data = calculate_pf_contribution(basic_monthly, rules, pf_on_full)
        employer_pf = pf_data["employer_pf_annual"] if employer_pf_in_ctc else 0
        gratuity = round(basic_annual * 0.0481) if gratuity_in_ctc else 0

        gross_annual = ctc - employer_pf - gratuity - insurance
        hra_annual = round(basic_annual * hra_pct)
        special_annual = max(0, gross_annual - basic_annual - hra_annual)

        gross_monthly = round(gross_annual / 12)
        pt_data = calculate_professional_tax(gross_monthly, state, rules)
        employee_pf = pf_data["employee_pf_annual"]
        pt_annual = pt_data["annual"]

        fixed_take_home_annual = gross_annual - employee_pf - pt_annual
        total_comp = fixed_take_home_annual + variable + esops + other_benefits

        return {
            "name": offer["name"],
            "annual_ctc": ctc,
            "gross_annual": gross_annual,
            "basic_annual": basic_annual,
            "hra_annual": hra_annual,
            "special_annual": special_annual,
            "employer_pf_annual": employer_pf,
            "gratuity_annual": gratuity,
            "employee_pf_annual": employee_pf,
            "professional_tax_annual": pt_annual,
            "fixed_take_home_annual": fixed_take_home_annual,
            "fixed_take_home_monthly": round(fixed_take_home_annual / 12),
            "variable_pay_annual": variable,
            "esops_annual_value": esops,
            "other_benefits_annual": other_benefits,
            "total_compensation_annual": total_comp,
            "pf_on_full_basic": pf_on_full,
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

        state = inputs.get("state", "karnataka")
        offers = inputs["offers"]

        results = [self._compute_offer(offer, state, rules) for offer in offers]

        # Sort by fixed take-home (most relevant for comparison)
        results_sorted = sorted(results, key=lambda x: x["fixed_take_home_annual"], reverse=True)

        # Compute differences vs best offer
        best_take_home = results_sorted[0]["fixed_take_home_annual"]
        for r in results_sorted:
            r["difference_from_best"] = r["fixed_take_home_annual"] - best_take_home
            r["difference_from_best_monthly"] = round((r["fixed_take_home_annual"] - best_take_home) / 12)

        winner_fixed = results_sorted[0]["name"]
        winner_total = max(results, key=lambda x: x["total_compensation_annual"])["name"]

        return CalculationResult(
            calculator_id=self.calculator_id,
            calculator_version=self.version,
            financial_year=financial_year,
            inputs=inputs,
            outputs={
                "comparison": results_sorted,
                "best_fixed_take_home": winner_fixed,
                "best_total_compensation": winner_total,
                "offer_count": len(results),
            },
            breakdown=results_sorted,
            assumptions=[
                "Variable pay and ESOPs are not guaranteed",
                "Tax impact not included (use Income Tax Calculator separately)",
                "All offers assumed in same city/state for fair PT comparison",
                f"Professional tax computed for {state}",
                "Comparison based on fixed monthly in-hand (most reliable metric)",
            ],
            formula_references=[
                "EPF & MP Act, 1952",
                "Payment of Gratuity Act, 1972",
                "CTC structure norms in Indian corporate sector",
            ],
            metadata={"state": state, "winner_fixed": winner_fixed, "winner_total": winner_total},
        )
