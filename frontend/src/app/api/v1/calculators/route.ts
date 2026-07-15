import { NextResponse } from "next/server";
import { calculatorRegistry } from "@/lib/engine/registry";

export async function GET() {
  const calculators = Object.values(calculatorRegistry).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    version: c.version,
    supported_financial_years: c.supportedFinancialYears,
  }));
  return NextResponse.json({ calculators });
}
