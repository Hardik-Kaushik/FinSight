import { CalculatorPlugin } from "../registry";
import { getPfContribution, getProfessionalTax } from "../salary-rules";

export const inhandSalaryCalculator: CalculatorPlugin = {
  id: "inhand_salary", name: "In-Hand Salary Calculator",
  description: "Calculate actual monthly in-hand salary from components after PF, PT, TDS.",
  version: "1.0.0", supportedFinancialYears: ["2026-27", "2025-26", "2024-25"],

  validate(inputs) {
    const errors: string[] = [];
    if (!inputs.basic_monthly && inputs.basic_monthly !== 0) errors.push("basic_monthly is required");
    if (!inputs.hra_monthly && inputs.hra_monthly !== 0) errors.push("hra_monthly is required");
    if (!inputs.financial_year) errors.push("financial_year is required");
    return errors;
  },

  calculate(inputs) {
    const basic = inputs.basic_monthly as number;
    const hra = inputs.hra_monthly as number;
    const special = (inputs.special_allowance_monthly as number) || 0;
    const other = (inputs.other_allowances_monthly as number) || 0;
    const pfOnFull = (inputs.pf_on_full_basic as boolean) || false;
    const state = (inputs.state as string) || "karnataka";
    const tds = (inputs.monthly_tds as number) || 0;
    const grossMonthly = basic + hra + special + other;

    const pf = getPfContribution(basic, pfOnFull);
    const pt = getProfessionalTax(state);
    const totalDeductions = pf.employeePfMonthly + pt.monthly + tds;
    const netInhand = grossMonthly - totalDeductions;

    const breakdown = [
      { component: "Basic Salary", amount: basic, type: "earning" },
      { component: "HRA", amount: hra, type: "earning" },
      { component: "Special Allowance", amount: special, type: "earning" },
      { component: "Other Allowances", amount: other, type: "earning" },
      { component: "Employee PF (12%)", amount: pf.employeePfMonthly, type: "deduction" },
      { component: "Professional Tax", amount: pt.monthly, type: "deduction" },
      { component: "TDS", amount: tds, type: "deduction" },
    ];

    return {
      calculator_id: "inhand_salary", calculator_version: "1.0.0",
      financial_year: inputs.financial_year, inputs,
      outputs: {
        gross_monthly: grossMonthly, gross_annual: grossMonthly * 12,
        employee_pf_monthly: pf.employeePfMonthly, professional_tax_monthly: pt.monthly,
        tds_monthly: tds, total_deductions_monthly: totalDeductions,
        total_deductions_annual: totalDeductions * 12,
        net_inhand_monthly: netInhand, net_inhand_annual: netInhand * 12,
      },
      breakdown, assumptions: [`PF on ${pfOnFull ? "full basic" : "₹15,000 cap"}`, `PT: ${state}`],
      formula_references: ["EPF & MP Act, 1952"], metadata: { state },
    };
  },
};
