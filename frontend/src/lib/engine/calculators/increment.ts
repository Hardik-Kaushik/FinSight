import { CalculatorPlugin } from "../registry";
import { getPfContribution, getProfessionalTax } from "../salary-rules";

function computeInhand(ctc: number, inputs: Record<string, unknown>) {
  const basicPct = ((inputs.basic_percent as number) || 40) / 100;
  const pfOnFull = (inputs.pf_on_full_basic as boolean) || false;
  const state = (inputs.state as string) || "karnataka";
  const basicAnnual = Math.round(ctc * basicPct);
  const basicMonthly = Math.round(basicAnnual / 12);
  const pf = getPfContribution(basicMonthly, pfOnFull);
  const gratuity = Math.round(basicAnnual * 0.0481);
  const grossAnnual = ctc - pf.employerPfAnnual - gratuity;
  const pt = getProfessionalTax(state);
  const netAnnual = grossAnnual - pf.employeePfAnnual - pt.annual;
  return { ctc, grossAnnual, grossMonthly: Math.round(grossAnnual / 12), netAnnual, netMonthly: Math.round(netAnnual / 12), employeePfMonthly: pf.employeePfMonthly, employerPfAnnual: pf.employerPfAnnual, gratuityAnnual: gratuity };
}

export const incrementCalculator: CalculatorPlugin = {
  id: "increment_calculator", name: "Increment / Hike Calculator",
  description: "Calculate the real impact of a salary hike on your in-hand salary.",
  version: "1.0.0", supportedFinancialYears: ["2024-25"],

  validate(inputs) {
    const errors: string[] = [];
    if (!inputs.current_ctc) errors.push("current_ctc is required");
    if (!inputs.new_ctc && !inputs.hike_percent) errors.push("Either new_ctc or hike_percent is required");
    if (!inputs.financial_year) errors.push("financial_year is required");
    return errors;
  },

  calculate(inputs) {
    const currentCtc = inputs.current_ctc as number;
    let newCtc: number, hikePct: number;
    if (inputs.new_ctc) { newCtc = inputs.new_ctc as number; hikePct = Math.round((newCtc - currentCtc) / currentCtc * 10000) / 100; }
    else { hikePct = inputs.hike_percent as number; newCtc = Math.round(currentCtc * (1 + hikePct / 100)); }

    const before = computeInhand(currentCtc, inputs);
    const after = computeInhand(newCtc, inputs);
    const inhandIncrease = after.netMonthly - before.netMonthly;
    const effectiveHike = before.netAnnual > 0 ? Math.round((after.netAnnual - before.netAnnual) / before.netAnnual * 10000) / 100 : 0;

    const breakdown = [
      { metric: "CTC", before: currentCtc, after: newCtc, change: newCtc - currentCtc },
      { metric: "Gross (Monthly)", before: before.grossMonthly, after: after.grossMonthly, change: after.grossMonthly - before.grossMonthly },
      { metric: "Employee PF (Monthly)", before: before.employeePfMonthly, after: after.employeePfMonthly, change: after.employeePfMonthly - before.employeePfMonthly },
      { metric: "In-Hand (Monthly)", before: before.netMonthly, after: after.netMonthly, change: inhandIncrease },
      { metric: "In-Hand (Annual)", before: before.netAnnual, after: after.netAnnual, change: after.netAnnual - before.netAnnual },
    ];

    return {
      calculator_id: "increment_calculator", calculator_version: "1.0.0",
      financial_year: inputs.financial_year, inputs,
      outputs: { current_ctc: currentCtc, new_ctc: newCtc, hike_percent: hikePct, ctc_increase: newCtc - currentCtc, current_inhand_monthly: before.netMonthly, new_inhand_monthly: after.netMonthly, inhand_increase_monthly: inhandIncrease, inhand_increase_annual: after.netAnnual - before.netAnnual, effective_hike_percent: effectiveHike, pf_increase_monthly: after.employeePfMonthly - before.employeePfMonthly },
      breakdown, assumptions: [`Hike: ${hikePct}%`, `PF on ${(inputs.pf_on_full_basic as boolean) ? "full basic" : "₹15K cap"}`],
      formula_references: ["EPF & MP Act, 1952"], metadata: { hike_percent: hikePct, effective_hike_percent: effectiveHike },
    };
  },
};
