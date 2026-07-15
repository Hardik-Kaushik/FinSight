"""
Stock Portfolio Calculator / Viewer.

Allows users to input their stock holdings and calculates:
- Current portfolio value (using provided prices or placeholder)
- Gain/loss per stock
- Portfolio allocation %
- Sector diversification analysis
"""

from typing import Any
from calculation_engine.base import BaseCalculator, CalculationResult
from calculation_engine.registry import CalculatorRegistry
from calculation_engine.rules import RulesEngine


@CalculatorRegistry.register
class StockPortfolioCalculator(BaseCalculator):

    @property
    def calculator_id(self) -> str:
        return "stock_portfolio"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def name(self) -> str:
        return "Stock Portfolio Tracker"

    @property
    def description(self) -> str:
        return (
            "Track your stock portfolio with gain/loss analysis, allocation breakdown, "
            "and day change. Enter your holdings to see the full picture."
        )

    @property
    def supported_financial_years(self) -> list[str]:
        return ["2024-25"]

    def get_input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "required": ["holdings", "financial_year"],
            "properties": {
                "holdings": {
                    "type": "array",
                    "minItems": 1,
                    "maxItems": 50,
                    "items": {
                        "type": "object",
                        "required": ["symbol", "quantity", "buy_price"],
                        "properties": {
                            "symbol": {"type": "string", "description": "Stock symbol (e.g., RELIANCE, TCS, INFY)"},
                            "quantity": {"type": "number", "minimum": 1, "description": "Number of shares held"},
                            "buy_price": {"type": "number", "minimum": 0, "description": "Average buy price per share"},
                            "current_price": {"type": "number", "minimum": 0, "description": "Current market price (optional - provide for offline calc)"},
                            "sector": {"type": "string", "default": "Other", "description": "Sector classification"},
                        },
                    },
                },
                "financial_year": {"type": "string", "enum": ["2024-25"]},
            },
        }

    def get_output_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "total_invested": {"type": "number"},
                "current_value": {"type": "number"},
                "total_gain_loss": {"type": "number"},
                "overall_return_percent": {"type": "number"},
            },
        }

    def validate_inputs(self, inputs: dict[str, Any]) -> list[str]:
        errors = []
        if "holdings" not in inputs:
            errors.append("holdings array is required")
        elif not isinstance(inputs["holdings"], list):
            errors.append("holdings must be an array")
        elif len(inputs["holdings"]) < 1:
            errors.append("At least 1 holding is required")
        else:
            for i, h in enumerate(inputs["holdings"]):
                if "symbol" not in h:
                    errors.append(f"Holding {i+1}: symbol is required")
                if "quantity" not in h:
                    errors.append(f"Holding {i+1}: quantity is required")
                if "buy_price" not in h:
                    errors.append(f"Holding {i+1}: buy_price is required")
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
        holdings = inputs["holdings"]

        total_invested = 0
        current_value = 0
        stock_details = []
        sector_allocation: dict[str, float] = {}

        for h in holdings:
            symbol = h["symbol"].upper()
            qty = h["quantity"]
            buy_price = h["buy_price"]
            # Use provided current_price, or fallback to buy_price (user should provide live prices)
            current_price = h.get("current_price", buy_price)
            sector = h.get("sector", "Other")

            invested = qty * buy_price
            value = qty * current_price
            gain_loss = value - invested
            return_pct = (gain_loss / invested * 100) if invested > 0 else 0

            total_invested += invested
            current_value += value
            sector_allocation[sector] = sector_allocation.get(sector, 0) + value

            stock_details.append({
                "symbol": symbol,
                "quantity": qty,
                "buy_price": round(buy_price, 2),
                "current_price": round(current_price, 2),
                "invested": round(invested),
                "current_value": round(value),
                "gain_loss": round(gain_loss),
                "return_percent": round(return_pct, 2),
                "sector": sector,
            })

        # Sort by current value (largest holdings first)
        stock_details.sort(key=lambda x: x["current_value"], reverse=True)

        # Calculate allocation %
        for stock in stock_details:
            stock["allocation_percent"] = round(stock["current_value"] / current_value * 100, 2) if current_value > 0 else 0

        # Sector breakdown
        sector_breakdown = [
            {"sector": s, "value": round(v), "percent": round(v / current_value * 100, 2) if current_value > 0 else 0}
            for s, v in sorted(sector_allocation.items(), key=lambda x: x[1], reverse=True)
        ]

        total_gain_loss = current_value - total_invested
        overall_return = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0

        # Top gainers and losers
        gainers = sorted([s for s in stock_details if s["gain_loss"] > 0], key=lambda x: x["return_percent"], reverse=True)[:3]
        losers = sorted([s for s in stock_details if s["gain_loss"] < 0], key=lambda x: x["return_percent"])[:3]

        return CalculationResult(
            calculator_id=self.calculator_id,
            calculator_version=self.version,
            financial_year=financial_year,
            inputs=inputs,
            outputs={
                "total_invested": round(total_invested),
                "current_value": round(current_value),
                "total_gain_loss": round(total_gain_loss),
                "overall_return_percent": round(overall_return, 2),
                "number_of_stocks": len(stock_details),
                "number_of_sectors": len(sector_breakdown),
                "top_holding": stock_details[0]["symbol"] if stock_details else "",
                "top_holding_percent": stock_details[0]["allocation_percent"] if stock_details else 0,
            },
            breakdown=stock_details,
            assumptions=[
                "Current prices are user-provided (for real-time, connect a market data API)",
                "Returns are unrealized (no tax impact until sold)",
                "LTCG applies on gains above ₹1.25L at 12.5% if held > 12 months",
                "Brokerage and STT not factored in",
            ],
            formula_references=[
                "Gain/Loss = (Current Price - Buy Price) × Quantity",
                "Allocation % = Stock Value / Total Portfolio Value × 100",
                "Finance Act 2024 - Section 112A (LTCG on equity)",
            ],
            metadata={
                "sector_breakdown": sector_breakdown,
                "top_gainers": gainers,
                "top_losers": losers,
            },
        )
