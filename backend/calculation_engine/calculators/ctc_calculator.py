"""
CTC (Cost to Company) Calculator.

Breaks down CTC into gross salary, take-home, and all components.
Supports company-specific structures via configurable percentages.
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
class CTCCalculator(BaseCalculator):
    """
    CTC to In-Hand Salary Calculator.

    Decomposes CTC into:
    - Basic salary
    - HRA
    - Special/Flexible allowance
    - Employer PF contribution
    - Gratuity provisioning
    - Insurance (if applicable)

    Then calculates net take-home after:
    - Employee PF
    - Professional Tax
    - Income Tax (estimated)
    """

    @property
    def calculator_id(self) -> str:
        return "ctc_calculator"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def name(self) -> str:
        return "CTC Calculator"

    @property
    def description(self) -> str:
        return (
            "Break down your CTC into gross salary, deductions, and in-hand salary. "
            "Supports custom basic%, HRA%, PF policy per company structure."
        )

    @property
    def supported_financial_years(self) -> list[str]:
        return ["2024-25"]

    def get_input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "required": ["annual_ctc", "financial_year"],
            "properties": {
                "annual_ctc": {
                    "type": "number", "minimum": 0,
                    "description": "Annual CTC in INR",
                },
                "financial_year": {"type": "string", "enum": ["2024-25"]},
                "basic_percent": {
                    "type": "number", "minimum": 20, "maximum": 60, "default": 40,
                    "description": "Basic as % of CTC (typically 40-50%)",
                },
                "hra_percent_of_basic": {
                    "type": "number", "minimum": 0, "maximum": 100, "default": 50,
                    "description": "HRA as % of Basic (50% metro, 40% non-metro)",
                },
                "pf_on_full_basic": {
                    "type": "boolean", "default": False,
                    "description": "Whether PF is calculated on full basic or capped at ₹15,000",
                },
                "employer_pf_in_ctc": {
                    "type": "boolean", "default": True,
                    "description": "Whether employer PF is included in CTC",
                },
                "gratuity_in_ctc": {
                    "type": "boolean", "default": True,
                    "description": "Whether gratuity provisioning is included in CTC",
                },
                "insurance_annual": {
                    "type": "number", "minimum": 0, "default": 0,
                    "description": "Annual group insurance premium (part of CTC)",
                },
                "state": {
                    "type": "string", "default": "karnataka",
                    "description": "State for professional tax calculation",
                },
                "is_metro": {
                    "type": "boolean", "default": True,
                    "description": "Whether employee is in metro city",
                },
            },
        }

    def get_output_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "annual_ctc": {"type": "number"},
                "gross_salary_annual": {"type": "number"},
                "net_take_home_monthly": {"type": "number"},
                "net_take_home_annual": {"type": "number"},
            },
        }

    def validate_inputs(self, inputs: dict[str, Any]) -> list[str]:
        errors = []
        if "annual_ctc" not in inputs:
            errors.append("annual_ctc is required")
        elif inputs["annual_ctc"] < 0:
            errors.append("annual_ctc must be non-negative")
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

        annual_ctc = inputs["annual_ctc"]
        basic_pct = inputs.get("basic_percent", 40) / 100
        hra_pct = inputs.get("hra_percent_of_basic", 50) / 100
        pf_on_full_basic = inputs.get("pf_on_full_basic", False)
        employer_pf_in_ctc = inputs.get("employer_pf_in_ctc", True)
        gratuity_in_ctc = inputs.get("gratuity_in_ctc", True)
        insurance_annual = inputs.get("insurance_annual", 0)
        state = inputs.get("state", "karnataka")

        # Step 1: Basic salary
        basic_annual = round(annual_ctc * basic_pct)
        basic_monthly = round(basic_annual / 12)

        # Step 2: Employer PF
        pf_data = calculate_pf_contribution(basic_monthly, rules, pf_on_full_basic)
        employer_pf_annual = pf_data["employer_pf_annual"] if employer_pf_in_ctc else 0

        # Step 3: Gratuity provisioning (4.81% of basic)
        gratuity_annual = round(basic_annual * 0.0481) if gratuity_in_ctc else 0

        # Step 4: Gross salary = CTC - employer contributions
        total_employer_cost = employer_pf_annual + gratuity_annual + insurance_annual
        gross_salary_annual = annual_ctc - total_employer_cost

        # Step 5: HRA
        hra_annual = round(basic_annual * hra_pct)
        hra_monthly = round(hra_annual / 12)

        # Step 6: Special allowance (balancing figure)
        special_allowance_annual = gross_salary_annual - basic_annual - hra_annual
        special_allowance_annual = max(0, special_allowance_annual)
        special_allowance_monthly = round(special_allowance_annual / 12)

        # Step 7: Employee deductions
        employee_pf_annual = pf_data["employee_pf_annual"]
        gross_monthly = round(gross_salary_annual / 12)
        pt_data = calculate_professional_tax(gross_monthly, state, rules)
        pt_annual = pt_data["annual"]

        # Step 8: Net take-home (before income tax)
        total_deductions_annual = employee_pf_annual + pt_annual
        net_annual = gross_salary_annual - total_deductions_annual
        net_monthly = round(net_annual / 12)

        breakdown = [
            {"component": "Basic Salary", "monthly": basic_monthly, "annual": basic_annual, "type": "earning"},
            {"component": "HRA", "monthly": hra_monthly, "annual": hra_annual, "type": "earning"},
            {"component": "Special Allowance", "monthly": special_allowance_monthly, "annual": special_allowance_annual, "type": "earning"},
            {"component": "Employer PF", "monthly": round(employer_pf_annual / 12), "annual": employer_pf_annual, "type": "employer_contribution"},
            {"component": "Gratuity", "monthly": round(gratuity_annual / 12), "annual": gratuity_annual, "type": "employer_contribution"},
            {"component": "Insurance", "monthly": round(insurance_annual / 12), "annual": insurance_annual, "type": "employer_contribution"},
            {"component": "Employee PF", "monthly": pf_data["employee_pf_monthly"], "annual": employee_pf_annual, "type": "deduction"},
            {"component": "Professional Tax", "monthly": pt_data["monthly"], "annual": pt_annual, "type": "deduction"},
        ]

        return CalculationResult(
            calculator_id=self.calculator_id,
            calculator_version=self.version,
            financial_year=financial_year,
            inputs=inputs,
            outputs={
                "annual_ctc": annual_ctc,
                "basic_annual": basic_annual,
                "basic_monthly": basic_monthly,
                "hra_annual": hra_annual,
                "hra_monthly": hra_monthly,
                "special_allowance_annual": special_allowance_annual,
                "special_allowance_monthly": special_allowance_monthly,
                "employer_pf_annual": employer_pf_annual,
                "gratuity_annual": gratuity_annual,
                "insurance_annual": insurance_annual,
                "gross_salary_annual": gross_salary_annual,
                "gross_salary_monthly": gross_monthly,
                "employee_pf_annual": employee_pf_annual,
                "employee_pf_monthly": pf_data["employee_pf_monthly"],
                "professional_tax_annual": pt_annual,
                "professional_tax_monthly": pt_data["monthly"],
                "total_deductions_annual": total_deductions_annual,
                "net_take_home_annual": net_annual,
                "net_take_home_monthly": net_monthly,
            },
            breakdown=breakdown,
            assumptions=[
                f"Basic is {inputs.get('basic_percent', 40)}% of CTC",
                f"HRA is {inputs.get('hra_percent_of_basic', 50)}% of Basic",
                f"PF calculated on {'full basic' if pf_on_full_basic else 'capped at ₹15,000'}",
                f"Employer PF {'included' if employer_pf_in_ctc else 'excluded'} in CTC",
                f"Gratuity {'included' if gratuity_in_ctc else 'excluded'} in CTC",
                "Income tax not deducted (use Income Tax Calculator separately)",
                f"Professional tax as per {state} state rules",
            ],
            formula_references=[
                "EPF & MP Act, 1952 - Employee contribution 12% of Basic",
                "Payment of Gratuity Act, 1972 - 4.81% provisioning",
                "Professional Tax - State-specific slabs",
            ],
            metadata={"state": state, "pf_on_full_basic": pf_on_full_basic},
        )
