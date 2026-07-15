"""
AI Orchestrator - Receives ONLY validated calculation outputs.

The AI NEVER invents numbers. It explains, compares, and educates
based on deterministic calculation results from the engine.
"""

from typing import Any


class AIOrchestrator:
    """
    Orchestrates AI interactions with calculation results.

    Responsibilities:
    - Explain calculation results in plain language
    - Compare financial scenarios (e.g., old vs new regime)
    - Highlight optimization opportunities
    - Generate downloadable reports
    - Suggest relevant calculators

    Restrictions:
    - MUST NOT perform calculations
    - MUST NOT override calculation engine outputs
    - MUST NOT invent numerical results
    """

    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self._api_key = api_key
        self._model = model

    def build_explanation_prompt(
        self, calculation_result: dict[str, Any]
    ) -> str:
        """Build a prompt for AI to explain calculation results."""
        return f"""You are a financial advisor AI for Indian personal finance.
You MUST ONLY use the numbers provided below. Do NOT calculate or invent any figures.

Calculation Result:
{self._format_result(calculation_result)}

Provide:
1. A plain-language explanation of the tax computation
2. Key observations about the effective tax rate
3. One or two actionable suggestions for tax optimization
4. Any assumptions the user should be aware of

Keep the tone helpful and educational. Use INR formatting."""

    def build_comparison_prompt(
        self, result_a: dict[str, Any], result_b: dict[str, Any]
    ) -> str:
        """Build a prompt for comparing two scenarios."""
        return f"""You are a financial advisor AI for Indian personal finance.
Compare the following two tax computation scenarios. Use ONLY the numbers provided.

Scenario A ({result_a.get('metadata', {}).get('regime_name', 'Option A')}):
{self._format_result(result_a)}

Scenario B ({result_b.get('metadata', {}).get('regime_name', 'Option B')}):
{self._format_result(result_b)}

Provide:
1. Which option saves more tax and by how much
2. Key differences between the two
3. When each option is typically better
4. A clear recommendation based on the numbers"""

    def _format_result(self, result: dict[str, Any]) -> str:
        """Format calculation result for AI consumption."""
        outputs = result.get("outputs", {})
        lines = []
        for key, value in outputs.items():
            formatted_key = key.replace("_", " ").title()
            if isinstance(value, (int, float)) and "rate" not in key:
                lines.append(f"  {formatted_key}: ₹{value:,.0f}")
            else:
                lines.append(f"  {formatted_key}: {value}")
        return "\n".join(lines)

    def suggest_calculators(
        self, current_calculator: str, user_inputs: dict[str, Any]
    ) -> list[str]:
        """Suggest related calculators based on context."""
        suggestions_map = {
            "income_tax_india": [
                "hra_calculator",
                "pf_calculator",
                "investment_planner",
                "salary_breakup",
            ],
        }
        return suggestions_map.get(current_calculator, [])
