/**
 * API client for FinSight backend.
 * Includes retry logic for Render free tier cold starts (30-50s spin-up).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchWithRetry(url: string, options?: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (err) {
      if (i === retries) throw err;
      // Wait 2s before retry (server is spinning up)
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Request failed after retries");
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
  const res = await fetchWithRetry(
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
  const res = await fetchWithRetry(`${API_BASE}/api/v1/calculators/`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
