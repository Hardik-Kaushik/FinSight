"use client";

import { useState } from "react";
import { calculate, CalculationResponse } from "@/lib/api";

export default function CTCCalculatorPage() {
  const [annualCtc, setAnnualCtc] = useState("");
  const [basicPercent, setBasicPercent] = useState("40");
  const [hraPercent, setHraPercent] = useState("50");
  const [pfOnFullBasic, setPfOnFullBasic] = useState(false);
  const [state, setState] = useState("karnataka");
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
        annual_ctc: Number(annualCtc),
        financial_year: "2024-25",
        basic_percent: Number(basicPercent),
        hra_percent_of_basic: Number(hraPercent),
        pf_on_full_basic: pfOnFullBasic,
        state,
      };

      const response = await calculate("ctc_calculator", inputs, "2024-25");
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
        <h1 className="text-3xl font-bold">CTC Calculator</h1>
        <p className="mt-2 text-gray-600">
          Break down your CTC into gross salary, deductions, and monthly
          in-hand. Customize for your company&apos;s salary structure.
        </p>
      </div>

      <form onSubmit={handleCalculate} className="card space-y-6">
        <div>
          <label htmlFor="annualCtc" className="block text-sm font-medium text-gray-700 mb-1">
            Annual CTC (₹)
          </label>
          <input
            id="annualCtc"
            type="number"
            className="input-field"
            placeholder="e.g. 1500000"
            value={annualCtc}
            onChange={(e) => setAnnualCtc(e.target.value)}
            required
            min="0"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="basicPercent" className="block text-sm font-medium text-gray-700 mb-1">
              Basic % of CTC
            </label>
            <select
              id="basicPercent"
              className="input-field"
              value={basicPercent}
              onChange={(e) => setBasicPercent(e.target.value)}
            >
              <option value="30">30% (Low)</option>
              <option value="35">35%</option>
              <option value="40">40% (Standard)</option>
              <option value="45">45%</option>
              <option value="50">50% (High)</option>
            </select>
          </div>

          <div>
            <label htmlFor="hraPercent" className="block text-sm font-medium text-gray-700 mb-1">
              HRA % of Basic
            </label>
            <select
              id="hraPercent"
              className="input-field"
              value={hraPercent}
              onChange={(e) => setHraPercent(e.target.value)}
            >
              <option value="40">40% (Non-Metro)</option>
              <option value="50">50% (Metro)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
              State (for Professional Tax)
            </label>
            <select
              id="state"
              className="input-field"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="haryana">Haryana (Gurugram)</option>
              <option value="karnataka">Karnataka (Bangalore)</option>
              <option value="maharashtra">Maharashtra (Mumbai/Pune)</option>
              <option value="delhi">Delhi</option>
              <option value="telangana">Telangana (Hyderabad)</option>
              <option value="tamil_nadu">Tamil Nadu (Chennai)</option>
              <option value="uttar_pradesh">Uttar Pradesh (Noida)</option>
              <option value="west_bengal">West Bengal (Kolkata)</option>
              <option value="gujarat">Gujarat (Ahmedabad)</option>
              <option value="rajasthan">Rajasthan (Jaipur)</option>
              <option value="andhra_pradesh">Andhra Pradesh</option>
              <option value="madhya_pradesh">Madhya Pradesh (Indore)</option>
              <option value="kerala">Kerala (Kochi)</option>
              <option value="punjab">Punjab (Chandigarh)</option>
              <option value="odisha">Odisha</option>
              <option value="assam">Assam (Guwahati)</option>
              <option value="jharkhand">Jharkhand (Jamshedpur)</option>
              <option value="default">Other State</option>
            </select>
          </div>

          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pfOnFullBasic}
                onChange={(e) => setPfOnFullBasic(e.target.checked)}
                className="rounded text-primary-600"
              />
              <span className="text-sm text-gray-700">
                PF on full Basic (not capped at ₹15,000)
              </span>
            </label>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Calculating..." : "Calculate CTC Breakup"}
        </button>

        {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
      </form>

      {result?.success && result.data && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="card bg-green-50 border-green-200">
            <h2 className="text-lg font-semibold text-green-800">Monthly In-Hand Salary</h2>
            <p className="text-3xl font-bold text-green-700 mt-2">
              ₹{result.data.outputs.net_take_home_monthly?.toLocaleString("en-IN")}
            </p>
            <p className="text-sm text-green-600 mt-1">
              Annual: ₹{result.data.outputs.net_take_home_annual?.toLocaleString("en-IN")} (before income tax)
            </p>
          </div>

          {/* Component Breakdown */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Salary Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="CTC breakdown">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Component</th>
                    <th className="pb-2 font-medium text-right">Monthly</th>
                    <th className="pb-2 font-medium text-right">Annual</th>
                    <th className="pb-2 font-medium text-center">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.breakdown.map((row: Record<string, unknown>, i: number) => (
                    <tr
                      key={i}
                      className={`border-b last:border-0 ${
                        row.type === "deduction" ? "text-red-700 bg-red-50" :
                        row.type === "employer_contribution" ? "text-blue-700 bg-blue-50" : ""
                      }`}
                    >
                      <td className="py-2">{String(row.component)}</td>
                      <td className="py-2 text-right">
                        {row.type === "deduction" ? "−" : ""}₹{Number(row.monthly).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 text-right">
                        {row.type === "deduction" ? "−" : ""}₹{Number(row.annual).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          row.type === "earning" ? "bg-green-100 text-green-700" :
                          row.type === "deduction" ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {row.type === "employer_contribution" ? "Employer" : String(row.type)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Figures */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">CTC</dt>
                <dd className="font-semibold">₹{result.data.outputs.annual_ctc?.toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Gross Salary</dt>
                <dd className="font-semibold">₹{result.data.outputs.gross_salary_annual?.toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Employee PF/year</dt>
                <dd className="font-semibold">₹{result.data.outputs.employee_pf_annual?.toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Employer PF/year</dt>
                <dd className="font-semibold">₹{result.data.outputs.employer_pf_annual?.toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Gratuity/year</dt>
                <dd className="font-semibold">₹{result.data.outputs.gratuity_annual?.toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Prof. Tax/year</dt>
                <dd className="font-semibold">₹{result.data.outputs.professional_tax_annual?.toLocaleString("en-IN")}</dd>
              </div>
            </dl>
          </div>

          {/* Assumptions */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Assumptions</h2>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {result.data.assumptions.map((a: string, i: number) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {result && !result.success && result.errors && (
        <div className="card border-red-200 bg-red-50">
          <h2 className="text-lg font-semibold text-red-800">Errors</h2>
          <ul className="mt-2 list-disc list-inside text-sm text-red-600">
            {result.errors.map((err: string, i: number) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
