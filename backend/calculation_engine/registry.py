"""Calculator registry - plugin discovery and management."""

from typing import Type
from calculation_engine.base import BaseCalculator


class CalculatorRegistry:
    """Registry for calculator plugins. Supports dynamic registration."""

    _calculators: dict[str, BaseCalculator] = {}

    @classmethod
    def register(cls, calculator_class: Type[BaseCalculator]) -> Type[BaseCalculator]:
        """Register a calculator class. Can be used as a decorator."""
        instance = calculator_class()
        cls._calculators[instance.calculator_id] = instance
        return calculator_class

    @classmethod
    def get(cls, calculator_id: str) -> BaseCalculator | None:
        """Retrieve a registered calculator by ID."""
        return cls._calculators.get(calculator_id)

    @classmethod
    def list_all(cls) -> list[dict[str, str]]:
        """List all registered calculators with metadata."""
        return [
            {
                "id": calc.calculator_id,
                "name": calc.name,
                "description": calc.description,
                "version": calc.version,
                "supported_financial_years": calc.supported_financial_years,
            }
            for calc in cls._calculators.values()
        ]

    @classmethod
    def clear(cls):
        """Clear all registered calculators (useful for testing)."""
        cls._calculators = {}
