"""
Salary Breakup Calculator.

Given a gross or CTC figure, generates a detailed component-wise
salary structure following standard Indian corporate norms.
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
class SalaryBreakupCalculator(BaseCalculator):

    @property
    def calculator_id(self) -> str:
        return "salary_breakup"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def name(self) -> str:
        return "Salary Breakup Calculator"

    @property
    def description(self) -> str:
        return (
            "Generate a detailed salary structure from CTC or gross salary. "
            "Shows all components: basic, HRA, allowances, PF, gratuity, and deductions."
        )

    @property
    def supported_financial_years(self) -> list[str]:
        return ["2026-27"]

    def get_input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "required": ["amount", "amount_type", "financial_year"],
            "properties": {
                "amount": {"type": "number", "minimum": 0, "description": "Annual amount in INR"},
                "amount_type": {"type": "string", "enum": ["ctc", "gross"], "description": "Whether amount is CTC or Gross"},
                "financial_year": {"type": "string", "enum": ["2026-27"]},
                "basic_percent": {"type": "number", "minimum": 20, "maximum": 60, "default": 40},
                "hra_percent_of_basic": {"type": "number", "minimum": 0, "maximum": 100, "default": 50},
                "pf_on_full_basic": {"type": "boolean", "default": False},
                "include_lta": {"type": "boolean", "default": True, "description": "Include Leave Travel Allowance"},
                "include_medical": {"type": "boolean", "default": False, "description": "Include Medical Allowance"},
                "state": {"type": "string", "default": "karnataka"},
                "is_metro": {"type": "boolean", "default": True},
            },
        }

    def get_output_schema(self) -> dict[str, Any]:
        return {"type": "object", "properties": {"components": {"type": "array"}}}

    def validate_inputs(self, inputs: dict[str, Any]) -> list[str]:
        errors = []
        if "amount" not in inputs:
            errors.append("amount is required")
        elif inputs["amount"] < 0:
            errors.append("amount must be non-negative")
        if "amount_type" not in inputs:
            errors.append("amount_type is required")
        elif inputs["amount_type"] not in ("ctc", "gross"):
            errors.append("amount_type must be 'ctc' or 'gross'")
        if "financial_year" not in inputs:
            errors.append("financial_year is required")
        elif inputs["financial_year"] not in self.supported_financial_years:
            errors.append(f"financial_year must be one of {self.supported_financial_years}")
        return errors

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

        amount = inputs["amount"]
        amount_type = inputs["amount_type"]
        basic_pct = inputs.get("basic_percent", 40) / 100
        hra_pct = inputs.get("hra_percent_of_basic", 50) / 100
        pf_on_full = inputs.get("pf_on_full_basic", False)
        include_lta = inputs.get("include_lta", True)
        state = inputs.get("state", "karnataka")

        # Determine CTC and Gross
        if amount_type == "ctc":
            ctc = amount
            basic_annual = round(ctc * basic_pct)
            basic_monthly = round(basic_annual / 12)
            pf_data = calculate_pf_contribution(basic_monthly, rules, pf_on_full)
            employer_pf = pf_data["employer_pf_annual"]
            gratuity = round(basic_annual * 0.0481)
            gross_annual = ctc - employer_pf - gratuity
        else:
            gross_annual = amount
            ctc = None
            basic_annual = round(gross_annual * basic_pct)
            basic_monthly = round(basic_annual / 12)
            pf_data = calculate_pf_contribution(basic_monthly, rules, pf_on_full)
            employer_pf = pf_data["employer_pf_annual"]
            gratuity = round(basic_annual * 0.0481)
            ctc = gross_annual + employer_pf + gratuity

        hra_annual = round(basic_annual * hra_pct)

        # LTA: typically 1 month basic or fixed
        lta_annual = round(basic_monthly) if include_lta else 0

        # Special allowance = balancing
        special_annual = gross_annual - basic_annual - hra_annual - lta_annual
        special_annual = max(0, special_annual)

        gross_monthly = round(gross_annual / 12)
        pt_data = calculate_professional_tax(gross_monthly, state, rules)

        # Build component table
        components = [
            {"component": "Basic Salary", "monthly": round(basic_annual / 12), "annual": basic_annual, "category": "Fixed Pay"},
            {"component": "HRA", "monthly": round(hra_annual / 12), "annual": hra_annual, "category": "Fixed Pay"},
            {"component": "Special Allowance", "monthly": round(special_annual / 12), "annual": special_annual, "category": "Fixed Pay"},
        ]
        if include_lta:
            components.append({"component": "LTA", "monthly": round(lta_annual / 12), "annual": lta_annual, "category": "Fixed Pay"})

        components.extend([
            {"component": "Gross Salary", "monthly": gross_monthly, "annual": gross_annual, "category": "Subtotal"},
            {"component": "Employer PF (12%)", "monthly": round(employer_pf / 12), "annual": employer_pf, "category": "Employer Cost"},
            {"component": "Gratuity (4.81%)", "monthly": round(gratuity / 12), "annual": gratuity, "category": "Employer Cost"},
            {"component": "CTC", "monthly": round(ctc / 12), "annual": ctc, "category": "Total"},
        ])

        # Deductions
        employee_pf = pf_data["employee_pf_annual"]
        pt_annual = pt_data["annual"]
        total_deductions = employee_pf + pt_annual
        net_annual = gross_annual - total_deductions

        components.extend([
            {"component": "Employee PF (12%)", "monthly": pf_data["employee_pf_monthly"], "annual": employee_pf, "category": "Deduction"},
            {"component": "Professional Tax", "monthly": pt_data["monthly"], "annual": pt_annual, "category": "Deduction"},
            {"component": "Net Take-Home (pre-tax)", "monthly": round(net_annual / 12), "annual": net_annual, "category": "Net"},
        ])

        return CalculationResult(
            calculator_id=self.calculator_id,
            calculator_version=self.version,
            financial_year=financial_year,
            inputs=inputs,
            outputs={
                "ctc_annual": ctc,
                "gross_annual": gross_annual,
                "basic_annual": basic_annual,
                "hra_annual": hra_annual,
                "special_allowance_annual": special_annual,
                "lta_annual": lta_annual,
                "employer_pf_annual": employer_pf,
                "gratuity_annual": gratuity,
                "employee_pf_annual": employee_pf,
                "professional_tax_annual": pt_annual,
                "net_take_home_annual": net_annual,
                "net_take_home_monthly": round(net_annual / 12),
            },
            breakdown=components,
            assumptions=[
                f"Basic: {inputs.get('basic_percent', 40)}% of {'CTC' if amount_type == 'ctc' else 'Gross'}",
                f"HRA: {inputs.get('hra_percent_of_basic', 50)}% of Basic",
                f"PF on {'full basic' if pf_on_full else '₹15,000 cap'}",
                "Gratuity provisioned at 4.81% of basic",
                "Special allowance is the balancing component",
                "Income tax (TDS) not included in deductions",
            ],
            formula_references=[
                "EPF & MP Act, 1952",
                "Payment of Gratuity Act, 1972",
                "Standard CTC structures in Indian IT/Corporate sector",
            ],
            metadata={"amount_type": amount_type, "state": state},
        )
