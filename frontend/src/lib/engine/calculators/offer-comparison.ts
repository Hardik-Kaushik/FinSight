import { CalculatorPlugin } from "../registry";
import { getPfContribution, getProfessionalTax } from "../salary-rules";

export const offerComparisonCalculator: CalculatorPlugin = {
  id: "offer_comparison", name: "Offer Comparison Calculator",
  description: "Compare job offers on actual in-hand salary.",
  version: "1.0.0", supportedFinancialYears: ["2024-25"],

  validate(inputs) {
    const errors: string[] = [];
    if (!inputs.offers || !Array.isArray(inputs.offers)) errors.push("offers array is required");
    else if ((inputs.offers as unknown[]).length < 2) errors.push("At least 2 offers required");
    if (!inputs.financial_year) errors.push("financial_year is required");
    return errors;
  },

  calculate(inputs) {
    const offers = inputs.offers as Record<string, unknown>[];
    const state = (inputs.state as string) || "karnataka";

    const results = offers.map((o) => {
      const ctc = o.annual_ctc as number;
      const basicPct = ((o.basic_percent as number) || 40) / 100;
      const pfOnFull = (o.pf_on_full_basic as boolean) || false;
      const variable = (o.variable_pay_annual as number) || 0;

      const basicAnnual = Math.round(ctc * basicPct);
      const basicMonthly = Math.round(basicAnnual / 12);
      const pf = getPfContribution(basicMonthly, pfOnFull);
      const gratuity = Math.round(basicAnnual * 0.0481);
      const grossAnnual = ctc - pf.employerPfAnnual - gratuity;
      const pt = getProfessionalTax(state);
      const takeHome = grossAnnual - pf.employeePfAnnual - pt.annual;

      return {
        name: (o.name as string) || "Offer", annual_ctc: ctc, gross_annual: grossAnnual,
        basic_annual: basicAnnual, employee_pf_annual: pf.employeePfAnnual,
        fixed_take_home_annual: takeHome, fixed_take_home_monthly: Math.round(takeHome / 12),
        variable_pay_annual: variable,
        total_compensation_annual: takeHome + variable,
        pf_on_full_basic: pfOnFull, difference_from_best: 0, difference_from_best_monthly: 0,
      };
    });

    results.sort((a, b) => b.fixed_take_home_annual - a.fixed_take_home_annual);
    const best = results[0].fixed_take_home_annual;
    results.forEach((r) => {
      r.difference_from_best = r.fixed_take_home_annual - best;
      r.difference_from_best_monthly = Math.round((r.fixed_take_home_annual - best) / 12);
    });

    return {
      calculator_id: "offer_comparison", calculator_version: "1.0.0",
      financial_year: inputs.financial_year, inputs,
      outputs: { comparison: results, best_fixed_take_home: results[0].name, best_total_compensation: results.reduce((a, b) => a.total_compensation_annual > b.total_compensation_annual ? a : b).name, offer_count: results.length },
      breakdown: results, assumptions: ["Variable pay not guaranteed", `PT: ${state}`],
      formula_references: ["EPF & MP Act, 1952"], metadata: { state },
    };
  },
};
