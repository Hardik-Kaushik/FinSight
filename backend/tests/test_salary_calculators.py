"""
Tests for the Income Module calculators:
- CTC Calculator
- In-Hand Salary Calculator
- Salary Breakup Calculator
- Offer Comparison Calculator
- Increment Calculator
"""

import pytest
from pathlib import Path
from calculation_engine.rules import RulesEngine
from calculation_engine.calculators.ctc_calculator import CTCCalculator
from calculation_engine.calculators.inhand_salary import InHandSalaryCalculator
from calculation_engine.calculators.salary_breakup import SalaryBreakupCalculator
from calculation_engine.calculators.offer_comparison import OfferComparisonCalculator
from calculation_engine.calculators.increment_calculator import IncrementCalculator

RULES_PATH = Path(__file__).parent.parent / "rules_config"


@pytest.fixture
def rules_engine():
    return RulesEngine(RULES_PATH)


@pytest.fixture
def salary_rules(rules_engine):
    return rules_engine.load_rules("salary", "2024-25")


class TestCTCCalculator:
    @pytest.fixture
    def calc(self):
        return CTCCalculator()

    def test_basic_ctc_breakup(self, calc, salary_rules):
        result = calc.calculate(
            inputs={"annual_ctc": 1200000, "financial_year": "2024-25"},
            financial_year="2024-25",
            rules=salary_rules,
        )
        assert result.outputs["annual_ctc"] == 1200000
        assert result.outputs["basic_annual"] == 480000  # 40% of 12L
        assert result.outputs["net_take_home_monthly"] > 0
        assert result.outputs["gross_salary_annual"] < 1200000  # Less after employer costs

    def test_pf_on_full_basic(self, calc, salary_rules):
        """PF on full basic should result in lower take-home."""
        result_capped = calc.calculate(
            inputs={"annual_ctc": 1200000, "financial_year": "2024-25", "pf_on_full_basic": False},
            financial_year="2024-25", rules=salary_rules,
        )
        result_full = calc.calculate(
            inputs={"annual_ctc": 1200000, "financial_year": "2024-25", "pf_on_full_basic": True},
            financial_year="2024-25", rules=salary_rules,
        )
        # Full basic PF = more deductions = less take-home
        assert result_full.outputs["net_take_home_monthly"] < result_capped.outputs["net_take_home_monthly"]
        assert result_full.outputs["employee_pf_monthly"] > result_capped.outputs["employee_pf_monthly"]

    def test_different_basic_percent(self, calc, salary_rules):
        result_40 = calc.calculate(
            inputs={"annual_ctc": 1500000, "financial_year": "2024-25", "basic_percent": 40},
            financial_year="2024-25", rules=salary_rules,
        )
        result_50 = calc.calculate(
            inputs={"annual_ctc": 1500000, "financial_year": "2024-25", "basic_percent": 50},
            financial_year="2024-25", rules=salary_rules,
        )
        assert result_50.outputs["basic_annual"] > result_40.outputs["basic_annual"]
        assert result_50.outputs["hra_annual"] > result_40.outputs["hra_annual"]

    def test_validation_missing_ctc(self, calc):
        errors = calc.validate_inputs({"financial_year": "2024-25"})
        assert "annual_ctc is required" in errors

    def test_breakdown_has_all_components(self, calc, salary_rules):
        result = calc.calculate(
            inputs={"annual_ctc": 1000000, "financial_year": "2024-25"},
            financial_year="2024-25", rules=salary_rules,
        )
        component_types = [b["type"] for b in result.breakdown]
        assert "earning" in component_types
        assert "deduction" in component_types
        assert "employer_contribution" in component_types


class TestInHandSalaryCalculator:
    @pytest.fixture
    def calc(self):
        return InHandSalaryCalculator()

    def test_basic_inhand(self, calc, salary_rules):
        result = calc.calculate(
            inputs={
                "basic_monthly": 40000,
                "hra_monthly": 20000,
                "special_allowance_monthly": 20000,
                "financial_year": "2024-25",
            },
            financial_year="2024-25", rules=salary_rules,
        )
        assert result.outputs["gross_monthly"] == 80000
        assert result.outputs["net_inhand_monthly"] < 80000
        assert result.outputs["employee_pf_monthly"] > 0

    def test_pf_capped_at_15k(self, calc, salary_rules):
        """With PF capped, PF should be 12% of 15000 = 1800."""
        result = calc.calculate(
            inputs={
                "basic_monthly": 50000,
                "hra_monthly": 25000,
                "financial_year": "2024-25",
                "pf_on_full_basic": False,
            },
            financial_year="2024-25", rules=salary_rules,
        )
        assert result.outputs["employee_pf_monthly"] == 1800  # 12% of 15000

    def test_with_rent_shows_hra_exemption(self, calc, salary_rules):
        result = calc.calculate(
            inputs={
                "basic_monthly": 40000,
                "hra_monthly": 20000,
                "financial_year": "2024-25",
                "rent_paid_monthly": 15000,
                "is_metro": True,
            },
            financial_year="2024-25", rules=salary_rules,
        )
        assert "hra_exemption_monthly" in result.outputs
        assert result.outputs["hra_exemption_monthly"] > 0


class TestSalaryBreakupCalculator:
    @pytest.fixture
    def calc(self):
        return SalaryBreakupCalculator()

    def test_ctc_breakup(self, calc, salary_rules):
        result = calc.calculate(
            inputs={"amount": 1800000, "amount_type": "ctc", "financial_year": "2024-25"},
            financial_year="2024-25", rules=salary_rules,
        )
        assert result.outputs["ctc_annual"] == 1800000
        assert result.outputs["gross_annual"] < 1800000
        assert result.outputs["net_take_home_monthly"] > 0

    def test_gross_breakup(self, calc, salary_rules):
        result = calc.calculate(
            inputs={"amount": 1500000, "amount_type": "gross", "financial_year": "2024-25"},
            financial_year="2024-25", rules=salary_rules,
        )
        assert result.outputs["gross_annual"] == 1500000
        assert result.outputs["ctc_annual"] > 1500000  # CTC includes employer costs

    def test_components_complete(self, calc, salary_rules):
        result = calc.calculate(
            inputs={"amount": 1200000, "amount_type": "ctc", "financial_year": "2024-25"},
            financial_year="2024-25", rules=salary_rules,
        )
        categories = [b["category"] for b in result.breakdown]
        assert "Fixed Pay" in categories
        assert "Employer Cost" in categories
        assert "Deduction" in categories


class TestOfferComparisonCalculator:
    @pytest.fixture
    def calc(self):
        return OfferComparisonCalculator()

    def test_compare_two_offers(self, calc, salary_rules):
        result = calc.calculate(
            inputs={
                "offers": [
                    {"name": "Company A", "annual_ctc": 1500000, "pf_on_full_basic": False},
                    {"name": "Company B", "annual_ctc": 1400000, "pf_on_full_basic": False},
                ],
                "financial_year": "2024-25",
            },
            financial_year="2024-25", rules=salary_rules,
        )
        comparison = result.outputs["comparison"]
        assert len(comparison) == 2
        # Higher CTC should win on fixed take-home
        assert comparison[0]["name"] == "Company A"
        assert comparison[0]["fixed_take_home_monthly"] > comparison[1]["fixed_take_home_monthly"]

    def test_pf_policy_impacts_comparison(self, calc, salary_rules):
        """Company with PF on full basic should have lower take-home."""
        result = calc.calculate(
            inputs={
                "offers": [
                    {"name": "IT Corp", "annual_ctc": 1500000, "pf_on_full_basic": True},
                    {"name": "Startup", "annual_ctc": 1500000, "pf_on_full_basic": False},
                ],
                "financial_year": "2024-25",
            },
            financial_year="2024-25", rules=salary_rules,
        )
        comparison = result.outputs["comparison"]
        # Same CTC but capped PF = more take-home
        startup = next(c for c in comparison if c["name"] == "Startup")
        it_corp = next(c for c in comparison if c["name"] == "IT Corp")
        assert startup["fixed_take_home_monthly"] > it_corp["fixed_take_home_monthly"]

    def test_validation_needs_two_offers(self, calc):
        errors = calc.validate_inputs({
            "offers": [{"name": "A", "annual_ctc": 1000000}],
            "financial_year": "2024-25",
        })
        assert any("At least 2 offers" in e for e in errors)


class TestIncrementCalculator:
    @pytest.fixture
    def calc(self):
        return IncrementCalculator()

    def test_hike_by_percent(self, calc, salary_rules):
        result = calc.calculate(
            inputs={"current_ctc": 1200000, "hike_percent": 20, "financial_year": "2024-25"},
            financial_year="2024-25", rules=salary_rules,
        )
        assert result.outputs["new_ctc"] == 1440000
        assert result.outputs["hike_percent"] == 20
        assert result.outputs["inhand_increase_monthly"] > 0
        # Effective hike on take-home may differ from nominal due to PF structure
        assert result.outputs["effective_hike_percent"] > 0

    def test_hike_by_new_ctc(self, calc, salary_rules):
        result = calc.calculate(
            inputs={"current_ctc": 1000000, "new_ctc": 1300000, "financial_year": "2024-25"},
            financial_year="2024-25", rules=salary_rules,
        )
        assert result.outputs["hike_percent"] == 30.0
        assert result.outputs["ctc_increase"] == 300000

    def test_breakdown_shows_before_after(self, calc, salary_rules):
        result = calc.calculate(
            inputs={"current_ctc": 1500000, "hike_percent": 15, "financial_year": "2024-25"},
            financial_year="2024-25", rules=salary_rules,
        )
        assert len(result.breakdown) > 0
        assert "before" in result.breakdown[0]
        assert "after" in result.breakdown[0]
        assert "change" in result.breakdown[0]

    def test_validation_needs_hike_info(self, calc):
        errors = calc.validate_inputs({"current_ctc": 1000000, "financial_year": "2024-25"})
        assert "Either new_ctc or hike_percent is required" in errors
