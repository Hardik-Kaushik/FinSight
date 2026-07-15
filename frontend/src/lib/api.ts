/**
 * API client for ProjectFinanceHub AI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export interface CalculationResponse {
  success: boolean;
  data?: {
    calculator_id: string;
    calculator_version: string;
    financial_year: string;
    inputs: Record<string, unknown>;
    outputs: Record<string, number>;
    breakdown: Array<{
      slab: string;
      amount_in_slab: number;
      rate_percent: number;
      tax: number;
    }>;
    assumptions: string[];
    formula_references: string[];
    metadata: Record<string, unknown>;
  };
  errors?: string[];
}

export async function calculate(
  calculatorId: string,
  inputs: Record<string, unknown>,
  financialYear: string
): Promise<CalculationResponse> {
  const res = await fetch(
    `${API_BASE}/api/backend/api/v1/calculators/${calculatorId}/calculate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs, financial_year: financialYear }),
    }
  );

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export async function listCalculators() {
  const res = await fetch(`${API_BASE}/api/backend/api/v1/calculators/`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
