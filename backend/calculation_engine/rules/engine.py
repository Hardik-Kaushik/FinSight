"""Rules Engine - loads versioned JSON financial rules from config files."""

import json
from pathlib import Path
from typing import Any


class RulesEngine:
    """
    Loads and serves financial rules from versioned JSON config files.

    Rules are organized by:
    - Category (e.g., income_tax, pf, gratuity)
    - Financial year (e.g., 2024-25)
    - State/region where applicable

    Directory structure:
        rules_config/
        ├── income_tax/
        │   ├── 2024-25.json
        │   └── 2023-24.json
        ├── professional_tax/
        │   ├── maharashtra/2024-25.json
        │   └── karnataka/2024-25.json
        └── provident_fund/
            └── 2024-25.json
    """

    def __init__(self, config_path: str | Path):
        self._config_path = Path(config_path)
        self._cache: dict[str, Any] = {}

    def load_rules(
        self, category: str, financial_year: str, state: str | None = None
    ) -> dict[str, Any]:
        """Load rules for a given category and financial year."""
        cache_key = f"{category}/{state or ''}/{financial_year}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        if state:
            file_path = self._config_path / category / state / f"{financial_year}.json"
        else:
            file_path = self._config_path / category / f"{financial_year}.json"

        if not file_path.exists():
            raise FileNotFoundError(
                f"Rules not found: {file_path}. "
                f"Ensure rules_config/{category}/{financial_year}.json exists."
            )

        with open(file_path, "r", encoding="utf-8") as f:
            rules = json.load(f)

        self._cache[cache_key] = rules
        return rules

    def get_available_years(self, category: str) -> list[str]:
        """List available financial years for a category."""
        category_path = self._config_path / category
        if not category_path.exists():
            return []
        return sorted(
            [f.stem for f in category_path.glob("*.json")],
            reverse=True,
        )

    def clear_cache(self):
        """Clear the rules cache (useful after config updates)."""
        self._cache = {}
