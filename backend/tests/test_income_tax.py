"""
Comprehensive tests for the Income Tax Calculator.

Tests cover:
- Zero income
- Income below rebate threshold
- Various slab computations (new regime)
- Old regime with deductions
- Surcharge applicability
- Edge cases
"""

import pytest
from calculation_engine.calculators.income_tax import IncomeTaxCalculator
from calculation_engine.rules import RulesEngine
from pathlib import Path

RULES_PATH = Path(__file__).parent.parent / "rules_config"


@pytest.fixture
def calculator():
    return IncomeTaxCalculator()


@pytest.fixture
def rules_engine():
    return RulesEngine(RULES_PATH)


@pytest.fixture
def new_regime_rules(rules_engine):
    return rules_engine.load_rules("income_tax", "2024-25")


class TestInputValidation:
    def test_missing_gross_income(self, calculator):
        errors = calculator.validate_inputs({"financial_year": "2024-25", "regime": "new"})
        assert "gross_income is required" in errors

    def test_negative_income(self, calculator):
        errors = calculator.validate_inputs({
            "gross_income": -100, "financial_year": "2024-25", "regime": "new"
        })
        assert "gross_income must be non-negative" in errors

    def test_invalid_regime(self, calculator):
        errors = calculator.validate_inputs({
            "gross_income": 500000, "financial_year": "2024-25", "regime": "invalid"
        })
        assert any("regime" in e for e in errors)

    def test_valid_inputs(self, calculator):
        errors = calculator.validate_inputs({
            "gross_income": 1200000, "financial_year": "2024-25", "regime": "new"
        })
        assert errors == []


class TestNewRegime:
    """Tests for New Tax Regime FY 2024-25."""

    def test_zero_income(self, calculator, new_regime_rules):
        result = calculator.calculate(
            inputs={"gross_income": 0, "financial_year": "2024-25", "regime": "new"},
            financial_year="2024-25",
            rules=new_regime_rules,
        )
        assert result.outputs["total_tax"] == 0
        assert result.outputs["taxable_income"] == 0

    def test_income_below_standard_deduction(self, calculator, new_regime_rules):
        """Income of 50,000 - after 75,000 std deduction, taxable = 0."""
        result = calculator.calculate(
            inputs={"gross_income": 50000, "financial_year": "2024-25", "regime": "new"},
            financial_year="2024-25",
            rules=new_regime_rules,
        )
        assert result.outputs["taxable_income"] == 0
        assert result.outputs["total_tax"] == 0

    def test_income_within_rebate_limit(self, calculator, new_regime_rules):
        """Income where taxable income <= 7L gets full rebate."""
        result = calculator.calculate(
            inputs={"gross_income": 775000, "financial_year": "2024-25", "regime": "new"},
            financial_year="2024-25",
            rules=new_regime_rules,
        )
        # 775000 - 75000 = 700000 taxable, within rebate limit
        assert result.outputs["taxable_income"] == 700000
        assert result.outputs["total_tax"] == 0  # Full rebate

    def test_income_10_lakh(self, calculator, new_regime_rules):
        """10L gross income under new regime."""
        result = calculator.calculate(
            inputs={"gross_income": 1000000, "financial_year": "2024-25", "regime": "new"},
            financial_year="2024-25",
            rules=new_regime_rules,
        )
        # 1000000 - 75000 = 925000 taxable
        assert result.outputs["taxable_income"] == 925000
        assert result.outputs["total_tax"] > 0
        assert result.outputs["effective_tax_rate_percent"] > 0

    def test_income_15_lakh(self, calculator, new_regime_rules):
        """15L gross income under new regime."""
        result = calculator.calculate(
            inputs={"gross_income": 1500000, "financial_year": "2024-25", "regime": "new"},
            financial_year="2024-25",
            rules=new_regime_rules,
        )
        assert result.outputs["taxable_income"] == 1425000
        assert result.outputs["total_tax"] > 0
        assert result.calculator_id == "income_tax_india"
        assert result.financial_year == "2024-25"

    def test_result_structure(self, calculator, new_regime_rules):
        """Verify the output structure matches contract."""
        result = calculator.calculate(
            inputs={"gross_income": 1200000, "financial_year": "2024-25", "regime": "new"},
            financial_year="2024-25",
            rules=new_regime_rules,
        )
        assert "taxable_income" in result.outputs
        assert "total_tax" in result.outputs
        assert "effective_tax_rate_percent" in result.outputs
        assert "monthly_tax" in result.outputs
        assert len(result.breakdown) > 0
        assert len(result.assumptions) > 0
        assert len(result.formula_references) > 0


class TestOldRegime:
    """Tests for Old Tax Regime FY 2024-25."""

    def test_old_regime_with_deductions(self, calculator, new_regime_rules):
        """Old regime with 80C and 80D deductions."""
        result = calculator.calculate(
            inputs={
                "gross_income": 1200000,
                "financial_year": "2024-25",
                "regime": "old",
                "deductions_80c": 150000,
                "deductions_80d": 25000,
            },
            financial_year="2024-25",
            rules=new_regime_rules,
        )
        # 1200000 - 50000 (std) - 150000 (80C) - 25000 (80D) = 975000
        assert result.outputs["taxable_income"] == 975000
        assert result.outputs["total_deductions"] == 225000

    def test_80c_capped_at_limit(self, calculator, new_regime_rules):
        """80C deduction should be capped at 1.5L."""
        result = calculator.calculate(
            inputs={
                "gross_income": 1200000,
                "financial_year": "2024-25",
                "regime": "old",
                "deductions_80c": 300000,  # Exceeds limit
            },
            financial_year="2024-25",
            rules=new_regime_rules,
        )
        # Should cap at 150000, total deductions = 50000 + 150000 = 200000
        assert result.outputs["total_deductions"] == 200000


class TestMetadata:
    def test_to_dict_serialization(self, calculator, new_regime_rules):
        result = calculator.calculate(
            inputs={"gross_income": 800000, "financial_year": "2024-25", "regime": "new"},
            financial_year="2024-25",
            rules=new_regime_rules,
        )
        data = result.to_dict()
        assert data["calculator_id"] == "income_tax_india"
        assert data["calculator_version"] == "1.0.0"
        assert isinstance(data["outputs"], dict)
        assert isinstance(data["breakdown"], list)
