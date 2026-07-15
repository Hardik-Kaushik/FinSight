"""Tests for SIP Calculator and Stock Portfolio Calculator."""

import pytest
from pathlib import Path
from calculation_engine.rules import RulesEngine
from calculation_engine.calculators.sip_calculator import SIPCalculator
from calculation_engine.calculators.stock_portfolio import StockPortfolioCalculator

RULES_PATH = Path(__file__).parent.parent / "rules_config"


@pytest.fixture
def rules_engine():
    return RulesEngine(RULES_PATH)


@pytest.fixture
def investment_rules(rules_engine):
    return rules_engine.load_rules("investments", "2024-25")


class TestSIPCalculator:
    @pytest.fixture
    def calc(self):
        return SIPCalculator()

    def test_basic_sip(self, calc, investment_rules):
        result = calc.calculate(
            inputs={"monthly_sip": 10000, "duration_years": 10, "financial_year": "2024-25"},
            financial_year="2024-25",
            rules=investment_rules,
        )
        assert result.outputs["total_invested"] == 1200000  # 10K * 12 * 10
        assert result.outputs["total_value"] > 1200000  # Should grow
        assert result.outputs["wealth_multiplier"] > 1

    def test_step_up_sip_grows_more(self, calc, investment_rules):
        flat = calc.calculate(
            inputs={"monthly_sip": 10000, "duration_years": 10, "step_up_percent": 0, "financial_year": "2024-25"},
            financial_year="2024-25", rules=investment_rules,
        )
        step_up = calc.calculate(
            inputs={"monthly_sip": 10000, "duration_years": 10, "step_up_percent": 10, "financial_year": "2024-25"},
            financial_year="2024-25", rules=investment_rules,
        )
        assert step_up.outputs["total_value"] > flat.outputs["total_value"]
        assert step_up.outputs["total_invested"] > flat.outputs["total_invested"]

    def test_lump_sum_included(self, calc, investment_rules):
        without_lump = calc.calculate(
            inputs={"monthly_sip": 5000, "duration_years": 5, "lump_sum": 0, "financial_year": "2024-25"},
            financial_year="2024-25", rules=investment_rules,
        )
        with_lump = calc.calculate(
            inputs={"monthly_sip": 5000, "duration_years": 5, "lump_sum": 100000, "financial_year": "2024-25"},
            financial_year="2024-25", rules=investment_rules,
        )
        assert with_lump.outputs["total_value"] > without_lump.outputs["total_value"]
        assert with_lump.outputs["total_invested"] == without_lump.outputs["total_invested"] + 100000

    def test_ltcg_tax_estimated(self, calc, investment_rules):
        result = calc.calculate(
            inputs={"monthly_sip": 25000, "duration_years": 15, "financial_year": "2024-25"},
            financial_year="2024-25", rules=investment_rules,
        )
        # Large gains should have LTCG tax
        assert result.outputs["ltcg_tax_estimate"] > 0
        assert result.outputs["post_tax_value"] < result.outputs["total_value"]

    def test_scenarios_present(self, calc, investment_rules):
        result = calc.calculate(
            inputs={"monthly_sip": 10000, "duration_years": 10, "financial_year": "2024-25"},
            financial_year="2024-25", rules=investment_rules,
        )
        assert result.outputs["conservative_value"] < result.outputs["total_value"]
        assert result.outputs["aggressive_value"] > result.outputs["total_value"]

    def test_year_by_year_breakdown(self, calc, investment_rules):
        result = calc.calculate(
            inputs={"monthly_sip": 10000, "duration_years": 5, "financial_year": "2024-25"},
            financial_year="2024-25", rules=investment_rules,
        )
        assert len(result.breakdown) == 5
        assert result.breakdown[0]["year"] == 1
        assert result.breakdown[4]["year"] == 5
        # Each year should have increasing portfolio value
        for i in range(1, len(result.breakdown)):
            assert result.breakdown[i]["portfolio_value"] > result.breakdown[i-1]["portfolio_value"]

    def test_validation(self, calc):
        errors = calc.validate_inputs({"duration_years": 10, "financial_year": "2024-25"})
        assert "monthly_sip is required" in errors

        errors = calc.validate_inputs({"monthly_sip": 50, "duration_years": 10, "financial_year": "2024-25"})
        assert any("100" in e for e in errors)


class TestStockPortfolioCalculator:
    @pytest.fixture
    def calc(self):
        return StockPortfolioCalculator()

    def test_single_holding(self, calc):
        result = calc.calculate(
            inputs={
                "holdings": [{"symbol": "RELIANCE", "quantity": 10, "buy_price": 2000, "current_price": 2500, "sector": "Energy"}],
                "financial_year": "2024-25",
            },
            financial_year="2024-25",
        )
        assert result.outputs["total_invested"] == 20000
        assert result.outputs["current_value"] == 25000
        assert result.outputs["total_gain_loss"] == 5000
        assert result.outputs["overall_return_percent"] == 25.0

    def test_multiple_holdings(self, calc):
        result = calc.calculate(
            inputs={
                "holdings": [
                    {"symbol": "TCS", "quantity": 5, "buy_price": 3000, "current_price": 3500, "sector": "IT"},
                    {"symbol": "SBIN", "quantity": 100, "buy_price": 600, "current_price": 550, "sector": "Banking"},
                ],
                "financial_year": "2024-25",
            },
            financial_year="2024-25",
        )
        assert result.outputs["number_of_stocks"] == 2
        assert result.outputs["total_invested"] == 75000  # 15000 + 60000
        assert result.outputs["current_value"] == 72500  # 17500 + 55000
        assert result.outputs["total_gain_loss"] == -2500

    def test_allocation_percent(self, calc):
        result = calc.calculate(
            inputs={
                "holdings": [
                    {"symbol": "A", "quantity": 10, "buy_price": 100, "current_price": 100, "sector": "IT"},
                    {"symbol": "B", "quantity": 10, "buy_price": 100, "current_price": 100, "sector": "Banking"},
                ],
                "financial_year": "2024-25",
            },
            financial_year="2024-25",
        )
        # Each should be 50% allocation
        assert result.breakdown[0]["allocation_percent"] == 50.0
        assert result.breakdown[1]["allocation_percent"] == 50.0

    def test_sector_breakdown_in_metadata(self, calc):
        result = calc.calculate(
            inputs={
                "holdings": [
                    {"symbol": "TCS", "quantity": 5, "buy_price": 3000, "current_price": 3000, "sector": "IT"},
                    {"symbol": "INFY", "quantity": 10, "buy_price": 1500, "current_price": 1500, "sector": "IT"},
                    {"symbol": "SBIN", "quantity": 50, "buy_price": 600, "current_price": 600, "sector": "Banking"},
                ],
                "financial_year": "2024-25",
            },
            financial_year="2024-25",
        )
        sectors = result.metadata["sector_breakdown"]
        assert len(sectors) == 2
        sector_names = [s["sector"] for s in sectors]
        assert "IT" in sector_names
        assert "Banking" in sector_names

    def test_validation(self, calc):
        errors = calc.validate_inputs({"financial_year": "2024-25"})
        assert "holdings array is required" in errors

        errors = calc.validate_inputs({"holdings": [], "financial_year": "2024-25"})
        assert "At least 1 holding is required" in errors
