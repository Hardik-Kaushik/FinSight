"use client";

import { useState } from "react";
import { calculate, CalculationResponse } from "@/lib/api";

export default function IncomeTaxCalculatorPage() {
  const [grossIncome, setGrossIncome] = useState("");
  const [regime, setRegime] = useState<"new" | "old">("new");
  const [deductions80c, setDeductions80c] = useState("");
  const [deductions80d, setDeductions80d] = useState("");
  const [hraExemption, setHraExemption] = useState("");
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const inputs: Record<string, unknown> = {
        gross_income: Number(grossIncome),
        financial_year: "2024-25",
        regime,
      };

      if (regime === "old") {
        if (deductions80c) inputs.deductions_80c = Number(deductions80c);
        if (deductions80d) inputs.deductions_80d = Number(deductions80d);
        if (hraExemption) inputs.hra_exemption = Number(hraExemption);
      }

      const response = await calculate("income_tax_india", inputs, "2024-25");
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Income Tax Calculator</h1>
        <p className="mt-2 text-gray-600">
          FY 2024-25 | Compare Old vs New Tax Regime
        </p>
      </div>

      <form onSubmit={handleCalculate} className="card space-y-6">
        {/* Gross Income */}
        <div>
          <label htmlFor="grossIncome" className="block text-sm font-medium text-gray-700 mb-1">
            Annual Gross Income (₹)
          </label>
          <input
            id="grossIncome"
            type="number"
            className="input-field"
            placeholder="e.g. 1200000"
            value={grossIncome}
            onChange={(e) => setGrossIncome(e.target.value)}
            required
            min="0"
            aria-required="true"
          />
        </div>

        {/* Regime Selection */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-2">
            Tax Regime
          </legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="regime"
                value="new"
                checked={regime === "new"}
                onChange={() => setRegime("new")}
                className="text-primary-600"
              />
              <span className="text-sm">New Regime (Default)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="regime"
                value="old"
                checked={regime === "old"}
                onChange={() => setRegime("old")}
                className="text-primary-600"
              />
              <span className="text-sm">Old Regime</span>
            </label>
          </div>
        </fieldset>

        {/* Old Regime Deductions */}
        {regime === "old" && (
          <div className="space-y-4 border-l-4 border-primary-200 pl-4">
            <p className="text-sm font-medium text-primary-700">
              Old Regime Deductions
            </p>
            <div>
              <label htmlFor="deductions80c" className="block text-sm text-gray-700 mb-1">
                Section 80C (max ₹1,50,000)
              </label>
              <input
                id="deductions80c"
                type="number"
                className="input-field"
                placeholder="e.g. 150000"
                value={deductions80c}
                onChange={(e) => setDeductions80c(e.target.value)}
                min="0"
                max="150000"
              />
            </div>
            <div>
              <label htmlFor="deductions80d" className="block text-sm text-gray-700 mb-1">
                Section 80D - Health Insurance (max ₹25,000)
              </label>
              <input
                id="deductions80d"
                type="number"
                className="input-field"
                placeholder="e.g. 25000"
                value={deductions80d}
                onChange={(e) => setDeductions80d(e.target.value)}
                min="0"
                max="25000"
              />
            </div>
            <div>
              <label htmlFor="hraExemption" className="block text-sm text-gray-700 mb-1">
                HRA Exemption
              </label>
              <input
                id="hraExemption"
                type="number"
                className="input-field"
                placeholder="e.g. 120000"
                value={hraExemption}
                onChange={(e) => setHraExemption(e.target.value)}
                min="0"
              />
            </div>
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Calculating..." : "Calculate Tax"}
        </button>

        {error && (
          <p className="text-red-600 text-sm" role="alert">{error}</p>
        )}
      </form>

      {/* Results */}
      {result?.success && result.data && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="card bg-primary-50 border-primary-200">
            <h2 className="text-lg font-semibold text-primary-800">Tax Summary</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Taxable Income" value={result.data.outputs.taxable_income} />
              <Stat label="Total Tax" value={result.data.outputs.total_tax} highlight />
              <Stat label="Monthly Tax" value={result.data.outputs.monthly_tax} />
              <Stat
                label="Effective Rate"
                value={`${result.data.outputs.effective_tax_rate_percent}%`}
                isPercent
              />
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Slab Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Tax slab breakdown">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Slab</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium text-right">Rate</th>
                    <th className="pb-2 font-medium text-right">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.breakdown.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2">{row.slab}</td>
                      <td className="py-2 text-right">₹{row.amount_in_slab.toLocaleString("en-IN")}</td>
                      <td className="py-2 text-right">{row.rate_percent}%</td>
                      <td className="py-2 text-right font-medium">₹{row.tax.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Output */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Detailed Computation</h2>
            <dl className="space-y-2 text-sm">
              <OutputRow label="Gross Income" value={result.data.outputs.gross_income} />
              <OutputRow label="Total Deductions" value={result.data.outputs.total_deductions} />
              <OutputRow label="Taxable Income" value={result.data.outputs.taxable_income} />
              <OutputRow label="Tax on Slabs" value={result.data.outputs.tax_on_slabs} />
              <OutputRow label="Section 87A Rebate" value={result.data.outputs.rebate_87a} />
              <OutputRow label="Tax After Rebate" value={result.data.outputs.tax_after_rebate} />
              <OutputRow label="Surcharge" value={result.data.outputs.surcharge} />
              <OutputRow label="Health & Education Cess (4%)" value={result.data.outputs.cess} />
              <OutputRow label="Total Tax Payable" value={result.data.outputs.total_tax} bold />
            </dl>
          </div>

          {/* Assumptions */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Assumptions</h2>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {result.data.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {result && !result.success && result.errors && (
        <div className="card border-red-200 bg-red-50">
          <h2 className="text-lg font-semibold text-red-800">Validation Errors</h2>
          <ul className="mt-2 list-disc list-inside text-sm text-red-600">
            {result.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
  isPercent = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  isPercent?: boolean;
}) {
  const formatted = isPercent
    ? value
    : `₹${Number(value).toLocaleString("en-IN")}`;

  return (
    <div>
      <dt className="text-xs text-gray-600">{label}</dt>
      <dd className={`text-lg font-bold ${highlight ? "text-primary-700" : ""}`}>
        {formatted}
      </dd>
    </div>
  );
}

function OutputRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between py-1 ${bold ? "border-t font-semibold pt-2" : ""}`}>
      <dt>{label}</dt>
      <dd>₹{value.toLocaleString("en-IN")}</dd>
    </div>
  );
}
