"""
SIP (Systematic Investment Plan) Returns Calculator.

Supports:
- Regular SIP
- Step-up SIP (annual increase in SIP amount)
- Lump sum + SIP combination
- Multiple return scenarios (conservative/moderate/aggressive)
- LTCG tax estimation
"""

from typing import Any
from calculation_engine.base import BaseCalculator, CalculationResult
from calculation_engine.registry import CalculatorRegistry
from calculation_engine.rules import RulesEngine


@CalculatorRegistry.register
class SIPCalculator(BaseCalculator):

    @property
    def calculator_id(self) -> str:
        return "sip_calculator"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def name(self) -> str:
        return "SIP Returns Calculator"

    @property
    def description(self) -> str:
        return (
            "Project wealth growth with SIP investments. Supports step-up SIP, "
            "lump sum, multiple fund categories, and LTCG tax estimation."
        )

    @property
    def supported_financial_years(self) -> list[str]:
        return ["2024-25"]

    def get_input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "required": ["monthly_sip", "duration_years", "financial_year"],
            "properties": {
                "monthly_sip": {
                    "type": "number", "minimum": 100,
                    "description": "Monthly SIP amount in INR",
                },
                "duration_years": {
                    "type": "number", "minimum": 1, "maximum": 40,
                    "description": "Investment duration in years",
                },
                "expected_return_percent": {
                    "type": "number", "minimum": 1, "maximum": 30, "default": 12,
                    "description": "Expected annual return percentage",
                },
                "step_up_percent": {
                    "type": "number", "minimum": 0, "maximum": 50, "default": 0,
                    "description": "Annual step-up (increase) in SIP amount (%)",
                },
                "lump_sum": {
                    "type": "number", "minimum": 0, "default": 0,
                    "description": "One-time lump sum investment at start",
                },
                "fund_category": {
                    "type": "string",
                    "enum": ["large_cap", "mid_cap", "small_cap", "index_fund_nifty50", "debt_fund", "hybrid_fund", "custom"],
                    "default": "custom",
                    "description": "Fund category for typical return ranges",
                },
                "financial_year": {"type": "string", "enum": ["2024-25"]},
            },
        }

    def get_output_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "total_invested": {"type": "number"},
                "total_value": {"type": "number"},
                "total_returns": {"type": "number"},
                "absolute_return_percent": {"type": "number"},
                "xirr_percent": {"type": "number"},
            },
        }

    def validate_inputs(self, inputs: dict[str, Any]) -> list[str]:
        errors = []
        if "monthly_sip" not in inputs:
            errors.append("monthly_sip is required")
        elif inputs["monthly_sip"] < 100:
            errors.append("monthly_sip must be at least ₹100")
        if "duration_years" not in inputs:
            errors.append("duration_years is required")
        elif inputs["duration_years"] < 1 or inputs["duration_years"] > 40:
            errors.append("duration_years must be between 1 and 40")
        if "financial_year" not in inputs:
            errors.append("financial_year is required")
        elif inputs["financial_year"] not in self.supported_financial_years:
            errors.append(f"financial_year must be one of {self.supported_financial_years}")
        return errors

    def _calculate_sip(
        self,
        monthly_sip: float,
        duration_years: int,
        annual_return: float,
        step_up_percent: float,
        lump_sum: float,
    ) -> dict[str, Any]:
        """Core SIP calculation with monthly compounding."""
        monthly_rate = annual_return / 100 / 12
        total_months = duration_years * 12
        total_invested = lump_sum
        current_sip = monthly_sip

        # Year-by-year breakdown
        yearly_breakdown = []
        portfolio_value = lump_sum

        for year in range(1, duration_years + 1):
            year_invested = 0
            for month in range(12):
                portfolio_value = (portfolio_value + current_sip) * (1 + monthly_rate)
                year_invested += current_sip
                total_invested += current_sip

            yearly_breakdown.append({
                "year": year,
                "sip_monthly": round(current_sip),
                "invested_this_year": round(year_invested),
                "total_invested": round(total_invested),
                "portfolio_value": round(portfolio_value),
                "returns": round(portfolio_value - total_invested),
            })

            # Step-up at year end
            if step_up_percent > 0:
                current_sip = current_sip * (1 + step_up_percent / 100)

        total_value = round(portfolio_value)
        total_returns = total_value - round(total_invested)
        absolute_return = (total_returns / total_invested * 100) if total_invested > 0 else 0

        return {
            "total_invested": round(total_invested),
            "total_value": total_value,
            "total_returns": total_returns,
            "absolute_return_percent": round(absolute_return, 2),
            "wealth_multiplier": round(total_value / total_invested, 2) if total_invested > 0 else 0,
            "yearly_breakdown": yearly_breakdown,
        }

    def _estimate_ltcg(self, total_returns: float, rules: dict[str, Any]) -> dict[str, float]:
        """Estimate LTCG tax on returns."""
        tax_rules = rules["sip"]["taxation"]
        threshold = tax_rules["ltcg_threshold"]
        rate = tax_rules["ltcg_rate_percent"] / 100

        taxable_gains = max(0, total_returns - threshold)
        tax = round(taxable_gains * rate)

        return {
            "total_gains": round(total_returns),
            "exempt_amount": threshold,
            "taxable_gains": round(taxable_gains),
            "ltcg_tax": tax,
            "post_tax_returns": round(total_returns - tax),
            "effective_tax_percent": round(tax / total_returns * 100, 2) if total_returns > 0 else 0,
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
            rules = rules_engine.load_rules("investments", financial_year)

        monthly_sip = inputs["monthly_sip"]
        duration_years = int(inputs["duration_years"])
        expected_return = inputs.get("expected_return_percent", 12)
        step_up = inputs.get("step_up_percent", 0)
        lump_sum = inputs.get("lump_sum", 0)
        fund_category = inputs.get("fund_category", "custom")

        # Calculate main scenario
        main = self._calculate_sip(monthly_sip, duration_years, expected_return, step_up, lump_sum)

        # Calculate conservative and aggressive scenarios for comparison
        if fund_category != "custom" and fund_category in rules["sip"]["typical_returns"]:
            cat_returns = rules["sip"]["typical_returns"][fund_category]
            conservative = self._calculate_sip(monthly_sip, duration_years, cat_returns["conservative"], step_up, lump_sum)
            aggressive = self._calculate_sip(monthly_sip, duration_years, cat_returns["aggressive"], step_up, lump_sum)
        else:
            conservative = self._calculate_sip(monthly_sip, duration_years, max(6, expected_return - 3), step_up, lump_sum)
            aggressive = self._calculate_sip(monthly_sip, duration_years, expected_return + 3, step_up, lump_sum)

        # LTCG estimation
        ltcg = self._estimate_ltcg(main["total_returns"], rules)

        # Inflation-adjusted value (assume 6% inflation)
        inflation_rate = 6
        real_value = round(main["total_value"] / ((1 + inflation_rate / 100) ** duration_years))

        breakdown = main["yearly_breakdown"]

        return CalculationResult(
            calculator_id=self.calculator_id,
            calculator_version=self.version,
            financial_year=financial_year,
            inputs=inputs,
            outputs={
                "monthly_sip": round(monthly_sip),
                "duration_years": duration_years,
                "expected_return_percent": expected_return,
                "step_up_percent": step_up,
                "lump_sum": round(lump_sum),
                "total_invested": main["total_invested"],
                "total_value": main["total_value"],
                "total_returns": main["total_returns"],
                "absolute_return_percent": main["absolute_return_percent"],
                "wealth_multiplier": main["wealth_multiplier"],
                "inflation_adjusted_value": real_value,
                "conservative_value": conservative["total_value"],
                "aggressive_value": aggressive["total_value"],
                "ltcg_tax_estimate": ltcg["ltcg_tax"],
                "post_tax_value": main["total_value"] - ltcg["ltcg_tax"],
                "post_tax_returns": ltcg["post_tax_returns"],
            },
            breakdown=breakdown,
            assumptions=[
                f"Expected annual return: {expected_return}%",
                "Returns compounded monthly",
                f"Step-up: {step_up}% annual increase in SIP" if step_up > 0 else "No step-up (flat SIP)",
                f"Lump sum of ₹{lump_sum:,.0f} invested at start" if lump_sum > 0 else "No lump sum",
                "Past returns do not guarantee future performance",
                "LTCG tax: 12.5% on gains above ₹1.25L (FY 2024-25 rules)",
                "Inflation assumed at 6% for real value calculation",
            ],
            formula_references=[
                "FV = P × [(1+r)^n - 1] / r × (1+r) — SIP future value formula",
                "Finance Act 2024 - Section 112A (LTCG on equity)",
                "Step-up SIP: SIP increases by X% every year",
            ],
            metadata={
                "fund_category": fund_category,
                "scenarios": {
                    "conservative": {"value": conservative["total_value"], "returns": conservative["total_returns"]},
                    "moderate": {"value": main["total_value"], "returns": main["total_returns"]},
                    "aggressive": {"value": aggressive["total_value"], "returns": aggressive["total_returns"]},
                },
                "ltcg_details": ltcg,
            },
        )
