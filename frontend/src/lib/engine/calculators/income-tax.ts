import { CalculatorPlugin } from "../registry";
import { incomeTaxRules } from "../rules";

export const incomeTaxCalculator: CalculatorPlugin = {
  id: "income_tax_india",
  name: "Income Tax Calculator (India)",
  description: "Calculate Indian income tax under both Old and New regimes with full slab breakdown, surcharge, and cess.",
  version: "1.0.0",
  supportedFinancialYears: ["2026-27", "2025-26", "2024-25"],

  validate(inputs) {
    const errors: string[] = [];
    if (!inputs.gross_income && inputs.gross_income !== 0) errors.push("gross_income is required");
    else if ((inputs.gross_income as number) < 0) errors.push("gross_income must be non-negative");
    if (!inputs.regime) errors.push("regime is required");
    else if (!["old", "new"].includes(inputs.regime as string)) errors.push("regime must be 'old' or 'new'");
    if (!inputs.financial_year) errors.push("financial_year is required");
    return errors;
  },

  calculate(inputs) {
    const regime = inputs.regime as "old" | "new";
    const rules = incomeTaxRules.regimes[regime];
    const grossIncome = inputs.gross_income as number;

    // Deductions
    const standardDeduction = rules.standard_deduction;
    let totalDeductions = standardDeduction;
    if (regime === "old") {
      const d80c = Math.min((inputs.deductions_80c as number) || 0, (rules as typeof incomeTaxRules.regimes.old).section_80c_limit);
      const d80d = Math.min((inputs.deductions_80d as number) || 0, (rules as typeof incomeTaxRules.regimes.old).section_80d_limit_self);
      const hra = (inputs.hra_exemption as number) || 0;
      const other = (inputs.other_deductions as number) || 0;
      totalDeductions = standardDeduction + d80c + d80d + hra + other;
    }

    const taxableIncome = Math.max(0, grossIncome - totalDeductions);

    // Slab calculation
    let taxOnSlabs = 0;
    const breakdown: { slab: string; amount_in_slab: number; rate_percent: number; tax: number }[] = [];
    for (const slab of rules.slabs) {
      const upper = slab.to ?? taxableIncome;
      if (taxableIncome <= slab.from) break;
      const amountInSlab = slab.from === 0
        ? Math.min(taxableIncome, upper)
        : Math.max(0, Math.min(taxableIncome, upper) - slab.from);
      const tax = Math.round(amountInSlab * slab.rate / 100);
      taxOnSlabs += tax;
      breakdown.push({
        slab: slab.to ? `₹${slab.from.toLocaleString("en-IN")} - ₹${upper.toLocaleString("en-IN")}` : `Above ₹${slab.from.toLocaleString("en-IN")}`,
        amount_in_slab: Math.round(amountInSlab),
        rate_percent: slab.rate,
        tax,
      });
    }

    // Rebate 87A
    const rebate = taxableIncome <= rules.rebate_87a_limit ? Math.min(taxOnSlabs, rules.rebate_87a_max) : 0;
    const taxAfterRebate = Math.max(0, taxOnSlabs - rebate);

    // Surcharge
    let surcharge = 0;
    for (const s of rules.surcharge_slabs) {
      const upper = s.to ?? Infinity;
      if (taxableIncome >= s.from && taxableIncome <= upper) {
        surcharge = Math.round(taxAfterRebate * s.rate / 100);
        break;
      }
    }

    // Cess
    const cess = Math.round((taxAfterRebate + surcharge) * rules.cess_rate / 100);
    const totalTax = Math.round(taxAfterRebate + surcharge + cess);
    const effectiveRate = grossIncome > 0 ? Math.round(totalTax / grossIncome * 10000) / 100 : 0;

    return {
      calculator_id: "income_tax_india",
      calculator_version: "1.0.0",
      financial_year: inputs.financial_year,
      inputs,
      outputs: {
        gross_income: Math.round(grossIncome),
        total_deductions: Math.round(totalDeductions),
        taxable_income: Math.round(taxableIncome),
        tax_on_slabs: Math.round(taxOnSlabs),
        rebate_87a: Math.round(rebate),
        tax_after_rebate: Math.round(taxAfterRebate),
        surcharge: Math.round(surcharge),
        cess: Math.round(cess),
        total_tax: totalTax,
        effective_tax_rate_percent: effectiveRate,
        monthly_tax: Math.round(totalTax / 12),
      },
      breakdown,
      assumptions: [
        "Income is from salary only",
        `Standard deduction of ₹${standardDeduction.toLocaleString("en-IN")} applied`,
        "Surcharge marginal relief not applied (simplified)",
      ],
      formula_references: ["Income Tax Act, 1961", `Finance Act 2024-25 - ${rules.name}`],
      metadata: { regime, regime_name: rules.name },
    };
  },
};
