"""Calculator API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

from app.core.config import get_settings
from calculation_engine import CalculatorRegistry
from calculation_engine.rules import RulesEngine

# Ensure calculators are registered
import calculation_engine.calculators  # noqa: F401

router = APIRouter()
settings = get_settings()
rules_engine = RulesEngine(settings.rules_config_path)


class CalculateRequest(BaseModel):
    """Generic calculation request."""
    inputs: dict[str, Any]
    financial_year: str


class CalculateResponse(BaseModel):
    """Generic calculation response."""
    success: bool
    data: dict[str, Any] | None = None
    errors: list[str] | None = None


@router.get("/")
async def list_calculators():
    """List all available calculators."""
    return {"calculators": CalculatorRegistry.list_all()}


@router.get("/{calculator_id}")
async def get_calculator_info(calculator_id: str):
    """Get detailed info about a specific calculator."""
    calculator = CalculatorRegistry.get(calculator_id)
    if not calculator:
        raise HTTPException(status_code=404, detail="Calculator not found")
    return {
        "id": calculator.calculator_id,
        "name": calculator.name,
        "description": calculator.description,
        "version": calculator.version,
        "supported_financial_years": calculator.supported_financial_years,
        "input_schema": calculator.get_input_schema(),
        "output_schema": calculator.get_output_schema(),
    }


@router.post("/{calculator_id}/calculate", response_model=CalculateResponse)
async def calculate(calculator_id: str, request: CalculateRequest):
    """Execute a calculation."""
    calculator = CalculatorRegistry.get(calculator_id)
    if not calculator:
        raise HTTPException(status_code=404, detail="Calculator not found")

    # Validate inputs
    errors = calculator.validate_inputs(request.inputs)
    if errors:
        return CalculateResponse(success=False, errors=errors)

    # Validate financial year
    if request.financial_year not in calculator.supported_financial_years:
        return CalculateResponse(
            success=False,
            errors=[f"Unsupported financial year. Available: {calculator.supported_financial_years}"],
        )

    try:
        result = calculator.calculate(
            inputs=request.inputs,
            financial_year=request.financial_year,
            rules_engine=rules_engine,
        )
        return CalculateResponse(success=True, data=result.to_dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")
