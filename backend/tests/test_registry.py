"""Tests for the Calculator Registry."""

import pytest
from calculation_engine.registry import CalculatorRegistry


class TestCalculatorRegistry:
    def test_income_tax_registered(self):
        """Income tax calculator should be auto-registered on import."""
        import calculation_engine.calculators  # noqa: F401
        calc = CalculatorRegistry.get("income_tax_india")
        assert calc is not None
        assert calc.calculator_id == "income_tax_india"

    def test_list_all_calculators(self):
        import calculation_engine.calculators  # noqa: F401
        all_calcs = CalculatorRegistry.list_all()
        assert len(all_calcs) >= 1
        ids = [c["id"] for c in all_calcs]
        assert "income_tax_india" in ids

    def test_get_nonexistent_calculator(self):
        result = CalculatorRegistry.get("nonexistent_calculator")
        assert result is None
