/**
 * Salary rules - PF, Professional Tax, HRA, Gratuity.
 */

export const salaryRules = {
  provident_fund: {
    employee_contribution_percent: 12,
    employer_contribution_percent: 12,
    employer_eps_percent: 8.33,
    pf_wage_ceiling: 15000,
  },
  professional_tax: {
    max_annual: 2500,
    states: {
      haryana: { monthly: 0 },
      delhi: { monthly: 0 },
      uttar_pradesh: { monthly: 0 },
      rajasthan: { monthly: 0 },
      punjab: { monthly: 0 },
      karnataka: { monthly: 200 },
      maharashtra: { monthly: 200 },
      telangana: { monthly: 200 },
      andhra_pradesh: { monthly: 200 },
      tamil_nadu: { monthly: 200 },
      west_bengal: { monthly: 200 },
      gujarat: { monthly: 200 },
      madhya_pradesh: { monthly: 208 },
      kerala: { monthly: 208 },
      odisha: { monthly: 200 },
      assam: { monthly: 208 },
      jharkhand: { monthly: 208 },
      default: { monthly: 200 },
    } as Record<string, { monthly: number }>,
  },
  hra: {
    metro_percent: 50,
    non_metro_percent: 40,
  },
};

export function getProfessionalTax(state: string): { monthly: number; annual: number } {
  const st = salaryRules.professional_tax.states[state.toLowerCase()] ||
    salaryRules.professional_tax.states.default;
  const annual = Math.min(st.monthly * 12, salaryRules.professional_tax.max_annual);
  return { monthly: st.monthly, annual };
}

export function getPfContribution(basicMonthly: number, pfOnFullBasic: boolean) {
  const rules = salaryRules.provident_fund;
  const pfWage = pfOnFullBasic ? basicMonthly : Math.min(basicMonthly, rules.pf_wage_ceiling);
  const employeePf = Math.round(pfWage * rules.employee_contribution_percent / 100);
  const employerPf = Math.round(pfWage * rules.employer_contribution_percent / 100);
  return {
    pfWage: Math.round(pfWage),
    employeePfMonthly: employeePf,
    employerPfMonthly: employerPf,
    employeePfAnnual: employeePf * 12,
    employerPfAnnual: employerPf * 12,
  };
}
