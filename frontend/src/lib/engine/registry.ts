import { incomeTaxCalculator } from "./calculators/income-tax";
import { ctcCalculator } from "./calculators/ctc";
import { inhandSalaryCalculator } from "./calculators/inhand-salary";
import { salaryBreakupCalculator } from "./calculators/salary-breakup";
import { offerComparisonCalculator } from "./calculators/offer-comparison";
import { incrementCalculator } from "./calculators/increment";
import { sipCalculator } from "./calculators/sip";

export interface CalculatorPlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  supportedFinancialYears: string[];
  validate: (inputs: Record<string, unknown>) => string[];
  calculate: (inputs: Record<string, unknown>, financialYear: string) => unknown;
}

export const calculatorRegistry: Record<string, CalculatorPlugin> = {
  income_tax_india: incomeTaxCalculator,
  ctc_calculator: ctcCalculator,
  inhand_salary: inhandSalaryCalculator,
  salary_breakup: salaryBreakupCalculator,
  offer_comparison: offerComparisonCalculator,
  increment_calculator: incrementCalculator,
  sip_calculator: sipCalculator,
};
