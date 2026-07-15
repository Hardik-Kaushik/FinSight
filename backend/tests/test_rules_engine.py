"""Tests for the Rules Engine."""

import pytest
from pathlib import Path
from calculation_engine.rules import RulesEngine

RULES_PATH = Path(__file__).parent.parent / "rules_config"


@pytest.fixture
def engine():
    return RulesEngine(RULES_PATH)


class TestRulesEngine:
    def test_load_income_tax_rules(self, engine):
        rules = engine.load_rules("income_tax", "2024-25")
        assert "regimes" in rules
        assert "new" in rules["regimes"]
        assert "old" in rules["regimes"]

    def test_new_regime_slabs_present(self, engine):
        rules = engine.load_rules("income_tax", "2024-25")
        slabs = rules["regimes"]["new"]["slabs"]
        assert len(slabs) == 6
        assert slabs[0]["rate"] == 0
        assert slabs[-1]["rate"] == 30

    def test_caching(self, engine):
        """Second load should come from cache."""
        rules1 = engine.load_rules("income_tax", "2024-25")
        rules2 = engine.load_rules("income_tax", "2024-25")
        assert rules1 is rules2  # Same object from cache

    def test_cache_clear(self, engine):
        rules1 = engine.load_rules("income_tax", "2024-25")
        engine.clear_cache()
        rules2 = engine.load_rules("income_tax", "2024-25")
        assert rules1 is not rules2  # Fresh load

    def test_missing_rules_file(self, engine):
        with pytest.raises(FileNotFoundError):
            engine.load_rules("income_tax", "1999-00")

    def test_get_available_years(self, engine):
        years = engine.get_available_years("income_tax")
        assert "2024-25" in years
