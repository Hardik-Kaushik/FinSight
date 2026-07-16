import { CalculatorPlugin } from "../registry";
import { getPfContribution, getProfessionalTax } from "../salary-rules";

export const ctcCalculator: CalculatorPlugin = {
  id: "ctc_calculator",
  name: "CTC Calculator",
  description: "Break down your CTC into gross salary, deductions, and in-hand salary.",
  version: "1.0.0",
  supportedFinancialYears: ["2026-27", "2025-26", "2024-25"],

  validate(inputs) {
    const errors: string[] = [];
    if (!inputs.annual_ctc && inputs.annual_ctc !== 0) errors.push("annual_ctc is required");
    else if ((inputs.annual_ctc as number) < 0) errors.push("annual_ctc must be non-negative");
    if (!inputs.financial_year) errors.push("financial_year is required");
    return errors;
  },

  calculate(inputs) {
    const ctc = inputs.annual_ctc as number;
    const basicPct = ((inputs.basic_percent as number) || 40) / 100;
    const hraPct = ((inputs.hra_percent_of_basic as number) || 50) / 100;
    const pfOnFull = (inputs.pf_on_full_basic as boolean) || false;
    const state = (inputs.state as string) || "karnataka";

    const basicAnnual = Math.round(ctc * basicPct);
    const basicMonthly = Math.round(basicAnnual / 12);
    const pf = getPfContribution(basicMonthly, pfOnFull);
    const employerPfAnnual = pf.employerPfAnnual;
    const gratuityAnnual = Math.round(basicAnnual * 0.0481);
    const insurance = (inputs.insurance_annual as number) || 0;

    const grossAnnual = ctc - employerPfAnnual - gratuityAnnual - insurance;
    const hraAnnual = Math.round(basicAnnual * hraPct);
    const specialAnnual = Math.max(0, grossAnnual - basicAnnual - hraAnnual);
    const grossMonthly = Math.round(grossAnnual / 12);

    const pt = getProfessionalTax(state);
    const totalDeductions = pf.employeePfAnnual + pt.annual;
    const netAnnual = grossAnnual - totalDeductions;
    const netMonthly = Math.round(netAnnual / 12);

    const breakdown = [
      { component: "Basic Salary", monthly: basicMonthly, annual: basicAnnual, type: "earning" },
      { component: "HRA", monthly: Math.round(hraAnnual / 12), annual: hraAnnual, type: "earning" },
      { component: "Special Allowance", monthly: Math.round(specialAnnual / 12), annual: specialAnnual, type: "earning" },
      { component: "Employer PF", monthly: pf.employerPfMonthly, annual: employerPfAnnual, type: "employer_contribution" },
      { component: "Gratuity", monthly: Math.round(gratuityAnnual / 12), annual: gratuityAnnual, type: "employer_contribution" },
      { component: "Employee PF", monthly: pf.employeePfMonthly, annual: pf.employeePfAnnual, type: "deduction" },
      { component: "Professional Tax", monthly: pt.monthly, annual: pt.annual, type: "deduction" },
    ];

    return {
      calculator_id: "ctc_calculator", calculator_version: "1.0.0",
      financial_year: inputs.financial_year, inputs,
      outputs: {
        annual_ctc: ctc, basic_annual: basicAnnual, basic_monthly: basicMonthly,
        hra_annual: hraAnnual, hra_monthly: Math.round(hraAnnual / 12),
        special_allowance_annual: specialAnnual, special_allowance_monthly: Math.round(specialAnnual / 12),
        employer_pf_annual: employerPfAnnual, gratuity_annual: gratuityAnnual, insurance_annual: insurance,
        gross_salary_annual: grossAnnual, gross_salary_monthly: grossMonthly,
        employee_pf_annual: pf.employeePfAnnual, employee_pf_monthly: pf.employeePfMonthly,
        professional_tax_annual: pt.annual, professional_tax_monthly: pt.monthly,
        total_deductions_annual: totalDeductions,
        net_take_home_annual: netAnnual, net_take_home_monthly: netMonthly,
      },
      breakdown,
      assumptions: [`Basic is ${(basicPct * 100).toFixed(0)}% of CTC`, `PF on ${pfOnFull ? "full basic" : "₹15,000 cap"}`, `Professional tax: ${state}`],
      formula_references: ["EPF & MP Act, 1952", "Payment of Gratuity Act, 1972"],
      metadata: { state, pf_on_full_basic: pfOnFull },
    };
  },
};
