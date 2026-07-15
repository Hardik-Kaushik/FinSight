"""
Calculation Engine - Independent, framework-free financial calculation package.

This package has ZERO framework dependencies. It can be used standalone,
imported by FastAPI, or consumed by any other Python application.
"""

from calculation_engine.base import BaseCalculator, CalculationResult
from calculation_engine.registry import CalculatorRegistry

__all__ = ["BaseCalculator", "CalculationResult", "CalculatorRegistry"]
