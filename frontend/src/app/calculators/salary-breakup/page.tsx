"use client";

import { useState } from "react";
import { calculate, CalculationResponse } from "@/lib/api";

export default function SalaryBreakupPage() {
  const [amount, setAmount] = useState("");
  const [amountType, setAmountType] = useState<"ctc" | "gross">("ctc");
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
        amount: Number(amount),
        amount_type: amountType,
        financial_year: "2026-27",
        basic_percent: Number(basicPercent),
        hra_percent_of_basic: Number(hraPercent),
        pf_on_full_basic: pfOnFullBasic,
        state,
      };

      const response = await calculate("salary_breakup", inputs, "2026-27");
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
        <h1 className="text-3xl font-bold">Salary Breakup Calculator</h1>
        <p className="mt-2 text-gray-600">
          Generate a detailed salary structure from your CTC or gross salary.
        </p>
      </div>

      <form onSubmit={handleCalculate} className="card space-y-6">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Annual Amount (₹)
          </label>
          <input
            id="amount"
            type="number"
            className="input-field"
            placeholder="e.g. 1800000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="0"
          />
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-2">Amount Type</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="amountType" checked={amountType === "ctc"} onChange={() => setAmountType("ctc")} />
              <span className="text-sm">CTC (includes employer costs)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="amountType" checked={amountType === "gross"} onChange={() => setAmountType("gross")} />
              <span className="text-sm">Gross Salary</span>
            </label>
          </div>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="basicPct" className="block text-sm font-medium text-gray-700 mb-1">Basic %</label>
            <select id="basicPct" className="input-field" value={basicPercent} onChange={(e) => setBasicPercent(e.target.value)}>
              <option value="30">30%</option>
              <option value="35">35%</option>
              <option value="40">40% (Standard)</option>
              <option value="45">45%</option>
              <option value="50">50%</option>
            </select>
          </div>
          <div>
            <label htmlFor="hraPct" className="block text-sm font-medium text-gray-700 mb-1">HRA % of Basic</label>
            <select id="hraPct" className="input-field" value={hraPercent} onChange={(e) => setHraPercent(e.target.value)}>
              <option value="40">40% (Non-Metro)</option>
              <option value="50">50% (Metro)</option>
            </select>
          </div>
          <div>
            <label htmlFor="stateSel" className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <select id="stateSel" className="input-field" value={state} onChange={(e) => setState(e.target.value)}>
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
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={pfOnFullBasic} onChange={(e) => setPfOnFullBasic(e.target.checked)} className="rounded" />
          <span className="text-sm text-gray-700">PF on full Basic (not capped at ₹15,000)</span>
        </label>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Calculating..." : "Generate Salary Breakup"}
        </button>
        {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
      </form>

      {result?.success && result.data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-xs text-gray-500">CTC</p>
              <p className="text-lg font-bold">₹{result.data.outputs.ctc_annual?.toLocaleString("en-IN")}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500">Gross</p>
              <p className="text-lg font-bold">₹{result.data.outputs.gross_annual?.toLocaleString("en-IN")}</p>
            </div>
            <div className="card text-center bg-green-50 border-green-200">
              <p className="text-xs text-green-600">Take-Home/Month</p>
              <p className="text-lg font-bold text-green-700">₹{result.data.outputs.net_take_home_monthly?.toLocaleString("en-IN")}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500">Take-Home/Year</p>
              <p className="text-lg font-bold">₹{result.data.outputs.net_take_home_annual?.toLocaleString("en-IN")}</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Component-Wise Breakup</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Salary components">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Component</th>
                    <th className="pb-2 font-medium text-right">Monthly (₹)</th>
                    <th className="pb-2 font-medium text-right">Annual (₹)</th>
                    <th className="pb-2 font-medium text-center">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.breakdown.map((row: Record<string, unknown>, i: number) => (
                    <tr key={i} className={`border-b last:border-0 ${
                      row.category === "Deduction" ? "text-red-700 bg-red-50" :
                      row.category === "Subtotal" || row.category === "Total" || row.category === "Net" ? "font-semibold bg-gray-50" :
                      row.category === "Employer Cost" ? "text-blue-700 bg-blue-50" : ""
                    }`}>
                      <td className="py-2">{String(row.component)}</td>
                      <td className="py-2 text-right">₹{Number(row.monthly).toLocaleString("en-IN")}</td>
                      <td className="py-2 text-right">₹{Number(row.annual).toLocaleString("en-IN")}</td>
                      <td className="py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          row.category === "Fixed Pay" ? "bg-green-100 text-green-700" :
                          row.category === "Deduction" ? "bg-red-100 text-red-700" :
                          row.category === "Employer Cost" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>{String(row.category)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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
