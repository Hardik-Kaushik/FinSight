/**
 * API client for FinSight backend.
 * Calls Next.js API routes (same domain, no CORS, no cold starts).
 */

const API_BASE = "";

async function fetchApi(url: string, options?: RequestInit): Promise<Response> {
  return fetch(url, options);
}

export interface CalculationResponse {
  success: boolean;
  data?: {
    calculator_id: string;
    calculator_version: string;
    financial_year: string;
    inputs: Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outputs: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    breakdown: Array<Record<string, any>>;
    assumptions: string[];
    formula_references: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: Record<string, any>;
  };
  errors?: string[];
}

export async function calculate(
  calculatorId: string,
  inputs: Record<string, unknown>,
  financialYear: string
): Promise<CalculationResponse> {
  const res = await fetchApi(
    `${API_BASE}/api/v1/calculators/${calculatorId}/calculate`,
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
  const res = await fetchApi(`${API_BASE}/api/v1/calculators`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
