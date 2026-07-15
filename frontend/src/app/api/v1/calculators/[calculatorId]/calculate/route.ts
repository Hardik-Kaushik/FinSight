import { NextRequest, NextResponse } from "next/server";
import { calculatorRegistry } from "@/lib/engine/registry";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ calculatorId: string }> }
) {
  const { calculatorId } = await params;
  const calculator = calculatorRegistry[calculatorId];

  if (!calculator) {
    return NextResponse.json(
      { success: false, errors: ["Calculator not found"] },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { inputs, financial_year } = body;

  // Validate
  const errors = calculator.validate(inputs);
  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors });
  }

  try {
    const result = calculator.calculate(inputs, financial_year);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json(
      { success: false, errors: [(err as Error).message] },
      { status: 500 }
    );
  }
}
