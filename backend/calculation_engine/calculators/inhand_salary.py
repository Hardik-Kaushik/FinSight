"""
In-Hand Salary Calculator.

Given gross salary components, calculates actual monthly take-home
after all statutory deductions (PF, PT, TDS).
"""

from typing import Any
from calculation_engine.base import BaseCalculator, CalculationResult
from calculation_engine.registry import CalculatorRegistry
from calculation_engine.rules import RulesEngine
from calculation_engine.calculators.salary_common import (
    calculate_pf_contribution,
    calculate_professional_tax,
    calculate_hra_exemption,
)


@CalculatorRegistry.register
class InHandSalaryCalculator(BaseCalculator):

    @property
    def calculator_id(self) -> str:
        return "inhand_salary"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def name(self) -> str:
        return "In-Hand Salary Calculator"

    @property
    def description(self) -> str:
        return (
            "Calculate your actual monthly in-hand salary from gross salary "
            "after PF, Professional Tax, and estimated TDS deductions."
        )

    @property
    def supported_financial_years(self) -> list[str]:
        return ["2024-25"]

    def get_input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "required": ["basic_monthly", "hra_monthly", "financial_year"],
            "properties": {
                "basic_monthly": {"type": "number", "minimum": 0, "description": "Monthly basic salary"},
                "hra_monthly": {"type": "number", "minimum": 0, "description": "Monthly HRA"},
                "special_allowance_monthly": {"type": "number", "minimum": 0, "default": 0},
                "other_allowances_monthly": {"type": "number", "minimum": 0, "default": 0},
                "financial_year": {"type": "string", "enum": ["2024-25"]},
                "pf_on_full_basic": {"type": "boolean", "default": False},
                "rent_paid_monthly": {"type": "number", "minimum": 0, "default": 0, "description": "Monthly rent for HRA exemption"},
                "is_metro": {"type": "boolean", "default": True},
                "state": {"type": "string", "default": "karnataka"},
                "regime": {"type": "string", "enum": ["old", "new"], "default": "new"},
                "monthly_tds": {"type": "number", "minimum": 0, "default": 0, "description": "Monthly TDS as per employer (if known)"},
            },
        }

    def get_output_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "gross_monthly": {"type": "number"},
                "total_deductions_monthly": {"type": "number"},
                "net_inhand_monthly": {"type": "number"},
            },
        }

    def validate_inputs(self, inputs: dict[str, Any]) -> list[str]:
        errors = []
        if "basic_monthly" not in inputs:
            errors.append("basic_monthly is required")
        elif inputs["basic_monthly"] < 0:
            errors.append("basic_monthly must be non-negative")
        if "hra_monthly" not in inputs:
            errors.append("hra_monthly is required")
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

        basic = inputs["basic_monthly"]
        hra = inputs["hra_monthly"]
        special = inputs.get("special_allowance_monthly", 0)
        other = inputs.get("other_allowances_monthly", 0)
        pf_on_full = inputs.get("pf_on_full_basic", False)
        state = inputs.get("state", "karnataka")
        rent_paid = inputs.get("rent_paid_monthly", 0)
        is_metro = inputs.get("is_metro", True)
        monthly_tds = inputs.get("monthly_tds", 0)

        gross_monthly = basic + hra + special + other

        # PF deduction
        pf_data = calculate_pf_contribution(basic, rules, pf_on_full)
        employee_pf = pf_data["employee_pf_monthly"]

        # Professional tax
        pt_data = calculate_professional_tax(gross_monthly, state, rules)
        pt_monthly = pt_data["monthly"]

        # HRA exemption (for info)
        hra_data = None
        if rent_paid > 0:
            hra_data = calculate_hra_exemption(basic, 0, hra, rent_paid, is_metro, rules)

        # Total deductions
        total_deductions = employee_pf + pt_monthly + monthly_tds
        net_inhand = gross_monthly - total_deductions

        breakdown = [
            {"component": "Basic Salary", "amount": round(basic), "type": "earning"},
            {"component": "HRA", "amount": round(hra), "type": "earning"},
            {"component": "Special Allowance", "amount": round(special), "type": "earning"},
            {"component": "Other Allowances", "amount": round(other), "type": "earning"},
            {"component": "Employee PF (12%)", "amount": round(employee_pf), "type": "deduction"},
            {"component": "Professional Tax", "amount": round(pt_monthly), "type": "deduction"},
            {"component": "TDS (Income Tax)", "amount": round(monthly_tds), "type": "deduction"},
        ]

        outputs = {
            "gross_monthly": round(gross_monthly),
            "gross_annual": round(gross_monthly * 12),
            "employee_pf_monthly": round(employee_pf),
            "professional_tax_monthly": round(pt_monthly),
            "tds_monthly": round(monthly_tds),
            "total_deductions_monthly": round(total_deductions),
            "total_deductions_annual": round(total_deductions * 12),
            "net_inhand_monthly": round(net_inhand),
            "net_inhand_annual": round(net_inhand * 12),
        }

        if hra_data:
            outputs["hra_exemption_monthly"] = hra_data["exemption_monthly"]
            outputs["taxable_hra_monthly"] = hra_data["taxable_hra_monthly"]

        assumptions = [
            f"PF on {'full basic' if pf_on_full else 'capped ₹15,000'}",
            f"Professional tax: {state} state",
            "DA assumed as 0 (typical for private sector)",
        ]
        if monthly_tds > 0:
            assumptions.append(f"TDS of ₹{monthly_tds:,.0f}/month as provided")
        else:
            assumptions.append("TDS not included - use Income Tax Calculator for estimate")

        return CalculationResult(
            calculator_id=self.calculator_id,
            calculator_version=self.version,
            financial_year=financial_year,
            inputs=inputs,
            outputs=outputs,
            breakdown=breakdown,
            assumptions=assumptions,
            formula_references=[
                "EPF & MP Act, 1952",
                "Professional Tax - State-specific",
                "Section 10(13A) - HRA Exemption",
            ],
            metadata={"state": state, "pf_on_full_basic": pf_on_full},
        )
