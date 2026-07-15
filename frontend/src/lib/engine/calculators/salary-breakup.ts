import { CalculatorPlugin } from "../registry";
import { getPfContribution, getProfessionalTax } from "../salary-rules";

export const salaryBreakupCalculator: CalculatorPlugin = {
  id: "salary_breakup", name: "Salary Breakup Calculator",
  description: "Generate a detailed salary structure from CTC or gross salary.",
  version: "1.0.0", supportedFinancialYears: ["2024-25"],

  validate(inputs) {
    const errors: string[] = [];
    if (!inputs.amount && inputs.amount !== 0) errors.push("amount is required");
    if (!inputs.amount_type) errors.push("amount_type is required");
    if (!inputs.financial_year) errors.push("financial_year is required");
    return errors;
  },

  calculate(inputs) {
    const amount = inputs.amount as number;
    const type = inputs.amount_type as string;
    const basicPct = ((inputs.basic_percent as number) || 40) / 100;
    const hraPct = ((inputs.hra_percent_of_basic as number) || 50) / 100;
    const pfOnFull = (inputs.pf_on_full_basic as boolean) || false;
    const state = (inputs.state as string) || "karnataka";

    let ctc: number, grossAnnual: number, basicAnnual: number;
    if (type === "ctc") {
      ctc = amount;
      basicAnnual = Math.round(ctc * basicPct);
      const basicM = Math.round(basicAnnual / 12);
      const pf = getPfContribution(basicM, pfOnFull);
      const gratuity = Math.round(basicAnnual * 0.0481);
      grossAnnual = ctc - pf.employerPfAnnual - gratuity;
    } else {
      grossAnnual = amount;
      basicAnnual = Math.round(grossAnnual * basicPct);
      const basicM = Math.round(basicAnnual / 12);
      const pf = getPfContribution(basicM, pfOnFull);
      const gratuity = Math.round(basicAnnual * 0.0481);
      ctc = grossAnnual + pf.employerPfAnnual + gratuity;
    }

    const basicMonthly = Math.round(basicAnnual / 12);
    const pf = getPfContribution(basicMonthly, pfOnFull);
    const gratuity = Math.round(basicAnnual * 0.0481);
    const hraAnnual = Math.round(basicAnnual * hraPct);
    const lta = basicMonthly;
    const special = Math.max(0, grossAnnual - basicAnnual - hraAnnual - lta);
    const pt = getProfessionalTax(state);
    const netAnnual = grossAnnual - pf.employeePfAnnual - pt.annual;

    const breakdown = [
      { component: "Basic Salary", monthly: basicMonthly, annual: basicAnnual, category: "Fixed Pay" },
      { component: "HRA", monthly: Math.round(hraAnnual / 12), annual: hraAnnual, category: "Fixed Pay" },
      { component: "Special Allowance", monthly: Math.round(special / 12), annual: special, category: "Fixed Pay" },
      { component: "LTA", monthly: Math.round(lta / 12), annual: lta, category: "Fixed Pay" },
      { component: "Gross Salary", monthly: Math.round(grossAnnual / 12), annual: grossAnnual, category: "Subtotal" },
      { component: "Employer PF", monthly: pf.employerPfMonthly, annual: pf.employerPfAnnual, category: "Employer Cost" },
      { component: "Gratuity", monthly: Math.round(gratuity / 12), annual: gratuity, category: "Employer Cost" },
      { component: "CTC", monthly: Math.round(ctc / 12), annual: ctc, category: "Total" },
      { component: "Employee PF", monthly: pf.employeePfMonthly, annual: pf.employeePfAnnual, category: "Deduction" },
      { component: "Professional Tax", monthly: pt.monthly, annual: pt.annual, category: "Deduction" },
      { component: "Net Take-Home", monthly: Math.round(netAnnual / 12), annual: netAnnual, category: "Net" },
    ];

    return {
      calculator_id: "salary_breakup", calculator_version: "1.0.0",
      financial_year: inputs.financial_year, inputs,
      outputs: { ctc_annual: ctc, gross_annual: grossAnnual, basic_annual: basicAnnual, hra_annual: hraAnnual, special_allowance_annual: special, lta_annual: lta, employer_pf_annual: pf.employerPfAnnual, gratuity_annual: gratuity, employee_pf_annual: pf.employeePfAnnual, professional_tax_annual: pt.annual, net_take_home_annual: netAnnual, net_take_home_monthly: Math.round(netAnnual / 12) },
      breakdown, assumptions: [`Basic: ${(basicPct * 100).toFixed(0)}%`, `PF on ${pfOnFull ? "full basic" : "₹15K cap"}`],
      formula_references: ["EPF & MP Act, 1952", "Payment of Gratuity Act, 1972"], metadata: {},
    };
  },
};
