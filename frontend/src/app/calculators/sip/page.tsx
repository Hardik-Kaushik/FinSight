"use client";

import { useState } from "react";
import { calculate, CalculationResponse } from "@/lib/api";

export default function SIPCalculatorPage() {
  const [monthlySip, setMonthlySip] = useState("");
  const [durationYears, setDurationYears] = useState("10");
  const [expectedReturn, setExpectedReturn] = useState("12");
  const [stepUp, setStepUp] = useState("0");
  const [lumpSum, setLumpSum] = useState("");
  const [fundCategory, setFundCategory] = useState("custom");
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
        monthly_sip: Number(monthlySip),
        duration_years: Number(durationYears),
        expected_return_percent: Number(expectedReturn),
        step_up_percent: Number(stepUp),
        lump_sum: Number(lumpSum) || 0,
        fund_category: fundCategory,
        financial_year: "2024-25",
      };

      const response = await calculate("sip_calculator", inputs, "2024-25");
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
        <h1 className="text-3xl font-bold">SIP Returns Calculator</h1>
        <p className="mt-2 text-gray-600">
          Project your wealth growth with SIP. Supports step-up SIP, lump sum, and LTCG tax estimation.
        </p>
      </div>

      <form onSubmit={handleCalculate} className="card space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="monthlySip" className="block text-sm font-medium text-gray-700 mb-1">
              Monthly SIP Amount (₹) *
            </label>
            <input
              id="monthlySip"
              type="number"
              className="input-field"
              placeholder="e.g. 10000"
              value={monthlySip}
              onChange={(e) => setMonthlySip(e.target.value)}
              required
              min="100"
            />
          </div>
          <div>
            <label htmlFor="durationYears" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (Years) *
            </label>
            <input
              id="durationYears"
              type="number"
              className="input-field"
              placeholder="e.g. 10"
              value={durationYears}
              onChange={(e) => setDurationYears(e.target.value)}
              required
              min="1"
              max="40"
            />
          </div>
          <div>
            <label htmlFor="expectedReturn" className="block text-sm font-medium text-gray-700 mb-1">
              Expected Annual Return (%)
            </label>
            <input
              id="expectedReturn"
              type="number"
              className="input-field"
              placeholder="e.g. 12"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(e.target.value)}
              min="1"
              max="30"
              step="0.5"
            />
          </div>
          <div>
            <label htmlFor="stepUp" className="block text-sm font-medium text-gray-700 mb-1">
              Annual Step-Up (%)
            </label>
            <input
              id="stepUp"
              type="number"
              className="input-field"
              placeholder="0 for flat SIP, 10 for 10% increase/year"
              value={stepUp}
              onChange={(e) => setStepUp(e.target.value)}
              min="0"
              max="50"
            />
          </div>
          <div>
            <label htmlFor="lumpSum" className="block text-sm font-medium text-gray-700 mb-1">
              Lump Sum at Start (₹)
            </label>
            <input
              id="lumpSum"
              type="number"
              className="input-field"
              placeholder="e.g. 100000 (optional)"
              value={lumpSum}
              onChange={(e) => setLumpSum(e.target.value)}
              min="0"
            />
          </div>
          <div>
            <label htmlFor="fundCategory" className="block text-sm font-medium text-gray-700 mb-1">
              Fund Category
            </label>
            <select
              id="fundCategory"
              className="input-field"
              value={fundCategory}
              onChange={(e) => setFundCategory(e.target.value)}
            >
              <option value="custom">Custom Return %</option>
              <option value="large_cap">Large Cap (10-14%)</option>
              <option value="mid_cap">Mid Cap (12-18%)</option>
              <option value="small_cap">Small Cap (14-22%)</option>
              <option value="index_fund_nifty50">Nifty 50 Index (10-14%)</option>
              <option value="debt_fund">Debt Fund (6-8%)</option>
              <option value="hybrid_fund">Hybrid Fund (8-12%)</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Calculating..." : "Calculate SIP Returns"}
        </button>
        {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
      </form>

      {result?.success && result.data && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-xs text-gray-500">Total Invested</p>
              <p className="text-lg font-bold">₹{result.data.outputs.total_invested?.toLocaleString("en-IN")}</p>
            </div>
            <div className="card text-center bg-green-50 border-green-200">
              <p className="text-xs text-green-600">Portfolio Value</p>
              <p className="text-lg font-bold text-green-700">₹{result.data.outputs.total_value?.toLocaleString("en-IN")}</p>
            </div>
            <div className="card text-center bg-blue-50 border-blue-200">
              <p className="text-xs text-blue-600">Total Returns</p>
              <p className="text-lg font-bold text-blue-700">₹{result.data.outputs.total_returns?.toLocaleString("en-IN")}</p>
            </div>
            <div className="card text-center bg-purple-50 border-purple-200">
              <p className="text-xs text-purple-600">Wealth Multiplier</p>
              <p className="text-lg font-bold text-purple-700">{result.data.outputs.wealth_multiplier}x</p>
            </div>
          </div>

          {/* Scenarios */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Scenario Analysis</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-yellow-50">
                <p className="text-xs text-yellow-700">Conservative</p>
                <p className="text-lg font-bold text-yellow-800">₹{result.data.outputs.conservative_value?.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <p className="text-xs text-green-700">Moderate (Selected)</p>
                <p className="text-lg font-bold text-green-800">₹{result.data.outputs.total_value?.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <p className="text-xs text-blue-700">Aggressive</p>
                <p className="text-lg font-bold text-blue-800">₹{result.data.outputs.aggressive_value?.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </div>

          {/* Tax & Inflation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-semibold mb-2">LTCG Tax Estimate</h3>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Tax on gains</dt>
                  <dd className="font-medium">₹{result.data.outputs.ltcg_tax_estimate?.toLocaleString("en-IN")}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Post-tax value</dt>
                  <dd className="font-medium text-green-700">₹{result.data.outputs.post_tax_value?.toLocaleString("en-IN")}</dd>
                </div>
              </dl>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-2">Inflation Adjusted</h3>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Real value (today&apos;s ₹)</dt>
                  <dd className="font-medium">₹{result.data.outputs.inflation_adjusted_value?.toLocaleString("en-IN")}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Absolute return</dt>
                  <dd className="font-medium">{result.data.outputs.absolute_return_percent}%</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Year-by-Year Breakdown */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Year-by-Year Growth</h2>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm" aria-label="SIP year by year breakdown">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Year</th>
                    <th className="pb-2 font-medium text-right">SIP/Month</th>
                    <th className="pb-2 font-medium text-right">Invested (Cumulative)</th>
                    <th className="pb-2 font-medium text-right">Portfolio Value</th>
                    <th className="pb-2 font-medium text-right">Returns</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.breakdown.map((row: Record<string, unknown>, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5">{String(row.year)}</td>
                      <td className="py-1.5 text-right">₹{Number(row.sip_monthly).toLocaleString("en-IN")}</td>
                      <td className="py-1.5 text-right">₹{Number(row.total_invested).toLocaleString("en-IN")}</td>
                      <td className="py-1.5 text-right font-medium">₹{Number(row.portfolio_value).toLocaleString("en-IN")}</td>
                      <td className="py-1.5 text-right text-green-700">₹{Number(row.returns).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assumptions */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Assumptions</h2>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {result.data.assumptions.map((a: string, i: number) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        </div>
      )}

      {result && !result.success && result.errors && (
        <div className="card border-red-200 bg-red-50">
          <h2 className="text-lg font-semibold text-red-800">Errors</h2>
          <ul className="mt-2 list-disc list-inside text-sm text-red-600">
            {result.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
