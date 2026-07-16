import { CalculatorPlugin } from "../registry";

export const sipCalculator: CalculatorPlugin = {
  id: "sip_calculator", name: "SIP Returns Calculator",
  description: "Project wealth growth with SIP investments, step-up, and LTCG estimation.",
  version: "1.0.0", supportedFinancialYears: ["2026-27", "2025-26", "2024-25"],

  validate(inputs) {
    const errors: string[] = [];
    if (!inputs.monthly_sip) errors.push("monthly_sip is required");
    else if ((inputs.monthly_sip as number) < 100) errors.push("monthly_sip must be at least ₹100");
    if (!inputs.duration_years) errors.push("duration_years is required");
    if (!inputs.financial_year) errors.push("financial_year is required");
    return errors;
  },

  calculate(inputs) {
    const monthlySip = inputs.monthly_sip as number;
    const years = inputs.duration_years as number;
    const returnPct = (inputs.expected_return_percent as number) || 12;
    const stepUp = (inputs.step_up_percent as number) || 0;
    const lumpSum = (inputs.lump_sum as number) || 0;

    const calc = (sip: number, dur: number, ret: number, step: number, lump: number) => {
      const monthlyRate = ret / 100 / 12;
      let totalInvested = lump, portfolio = lump, currentSip = sip;
      const yearly: { year: number; sip_monthly: number; total_invested: number; portfolio_value: number; returns: number }[] = [];
      for (let y = 1; y <= dur; y++) {
        for (let m = 0; m < 12; m++) { portfolio = (portfolio + currentSip) * (1 + monthlyRate); totalInvested += currentSip; }
        yearly.push({ year: y, sip_monthly: Math.round(currentSip), total_invested: Math.round(totalInvested), portfolio_value: Math.round(portfolio), returns: Math.round(portfolio - totalInvested) });
        if (step > 0) currentSip *= (1 + step / 100);
      }
      return { totalInvested: Math.round(totalInvested), totalValue: Math.round(portfolio), totalReturns: Math.round(portfolio - totalInvested), yearly };
    };

    const main = calc(monthlySip, years, returnPct, stepUp, lumpSum);
    const conservative = calc(monthlySip, years, Math.max(6, returnPct - 3), stepUp, lumpSum);
    const aggressive = calc(monthlySip, years, returnPct + 3, stepUp, lumpSum);

    // LTCG
    const ltcgThreshold = 125000;
    const taxableGains = Math.max(0, main.totalReturns - ltcgThreshold);
    const ltcgTax = Math.round(taxableGains * 0.125);
    const inflationAdjusted = Math.round(main.totalValue / Math.pow(1.06, years));

    return {
      calculator_id: "sip_calculator", calculator_version: "1.0.0",
      financial_year: inputs.financial_year, inputs,
      outputs: {
        monthly_sip: monthlySip, duration_years: years, expected_return_percent: returnPct, step_up_percent: stepUp, lump_sum: lumpSum,
        total_invested: main.totalInvested, total_value: main.totalValue, total_returns: main.totalReturns,
        absolute_return_percent: Math.round(main.totalReturns / main.totalInvested * 10000) / 100,
        wealth_multiplier: Math.round(main.totalValue / main.totalInvested * 100) / 100,
        inflation_adjusted_value: inflationAdjusted,
        conservative_value: conservative.totalValue, aggressive_value: aggressive.totalValue,
        ltcg_tax_estimate: ltcgTax, post_tax_value: main.totalValue - ltcgTax, post_tax_returns: main.totalReturns - ltcgTax,
      },
      breakdown: main.yearly,
      assumptions: [`Return: ${returnPct}%`, stepUp > 0 ? `Step-up: ${stepUp}%/year` : "Flat SIP", "LTCG: 12.5% above ₹1.25L"],
      formula_references: ["SIP FV formula", "Finance Act 2024 - Section 112A"],
      metadata: { scenarios: { conservative: conservative.totalValue, moderate: main.totalValue, aggressive: aggressive.totalValue } },
    };
  },
};
