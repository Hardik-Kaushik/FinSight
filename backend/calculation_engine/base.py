"""Base calculator interface defining the plugin contract."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class CalculationResult:
    """Standardized output from any calculator."""

    calculator_id: str
    calculator_version: str
    financial_year: str
    inputs: dict[str, Any]
    outputs: dict[str, Any]
    breakdown: list[dict[str, Any]]
    assumptions: list[str]
    formula_references: list[str]
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dictionary for API responses and AI consumption."""
        return {
            "calculator_id": self.calculator_id,
            "calculator_version": self.calculator_version,
            "financial_year": self.financial_year,
            "inputs": self.inputs,
            "outputs": self.outputs,
            "breakdown": self.breakdown,
            "assumptions": self.assumptions,
            "formula_references": self.formula_references,
            "metadata": self.metadata,
        }


class BaseCalculator(ABC):
    """Abstract base class for all calculator plugins."""

    @property
    @abstractmethod
    def calculator_id(self) -> str:
        """Unique identifier for this calculator."""
        ...

    @property
    @abstractmethod
    def version(self) -> str:
        """Version of this calculator implementation."""
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable name."""
        ...

    @property
    @abstractmethod
    def description(self) -> str:
        """Description of what this calculator does."""
        ...

    @property
    @abstractmethod
    def supported_financial_years(self) -> list[str]:
        """List of financial years this calculator supports."""
        ...

    @abstractmethod
    def get_input_schema(self) -> dict[str, Any]:
        """Return JSON Schema for valid inputs."""
        ...

    @abstractmethod
    def get_output_schema(self) -> dict[str, Any]:
        """Return JSON Schema for outputs."""
        ...

    @abstractmethod
    def validate_inputs(self, inputs: dict[str, Any]) -> list[str]:
        """Validate inputs. Return list of error messages (empty = valid)."""
        ...

    @abstractmethod
    def calculate(self, inputs: dict[str, Any], financial_year: str) -> CalculationResult:
        """Execute the calculation pipeline. Must be deterministic."""
        ...

    def get_explanation_metadata(self) -> dict[str, Any]:
        """Metadata for AI to generate explanations."""
        return {
            "calculator_id": self.calculator_id,
            "name": self.name,
            "description": self.description,
            "version": self.version,
        }
