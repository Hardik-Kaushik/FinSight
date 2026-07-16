"use client";

import { useState } from "react";
import { calculate, CalculationResponse } from "@/lib/api";

export default function InHandSalaryPage() {
  const [basicMonthly, setBasicMonthly] = useState("");
  const [hraMonthly, setHraMonthly] = useState("");
  const [specialAllowance, setSpecialAllowance] = useState("");
  const [otherAllowances, setOtherAllowances] = useState("");
  const [pfOnFullBasic, setPfOnFullBasic] = useState(false);
  const [rentPaid, setRentPaid] = useState("");
  const [isMetro, setIsMetro] = useState(true);
  const [state, setState] = useState("karnataka");
  const [monthlyTds, setMonthlyTds] = useState("");
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
        basic_monthly: Number(basicMonthly),
        hra_monthly: Number(hraMonthly),
        special_allowance_monthly: Number(specialAllowance) || 0,
        other_allowances_monthly: Number(otherAllowances) || 0,
        financial_year: "2026-27",
        pf_on_full_basic: pfOnFullBasic,
        is_metro: isMetro,
        state,
      };
      if (rentPaid) inputs.rent_paid_monthly = Number(rentPaid);
      if (monthlyTds) inputs.monthly_tds = Number(monthlyTds);

      const response = await calculate("inhand_salary", inputs, "2026-27");
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
        <h1 className="text-3xl font-bold">In-Hand Salary Calculator</h1>
        <p className="mt-2 text-gray-600">
          Enter your salary components to see your actual monthly take-home after all deductions.
        </p>
      </div>

      <form onSubmit={handleCalculate} className="card space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="basicMonthly" className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Basic (₹) *
            </label>
            <input
              id="basicMonthly"
              type="number"
              className="input-field"
              placeholder="e.g. 40000"
              value={basicMonthly}
              onChange={(e) => setBasicMonthly(e.target.value)}
              required
              min="0"
            />
          </div>
          <div>
            <label htmlFor="hraMonthly" className="block text-sm font-medium text-gray-700 mb-1">
              Monthly HRA (₹) *
            </label>
            <input
              id="hraMonthly"
              type="number"
              className="input-field"
              placeholder="e.g. 20000"
              value={hraMonthly}
              onChange={(e) => setHraMonthly(e.target.value)}
              required
              min="0"
            />
          </div>
          <div>
            <label htmlFor="specialAllowance" className="block text-sm font-medium text-gray-700 mb-1">
              Special Allowance (₹)
            </label>
            <input
              id="specialAllowance"
              type="number"
              className="input-field"
              placeholder="e.g. 15000"
              value={specialAllowance}
              onChange={(e) => setSpecialAllowance(e.target.value)}
              min="0"
            />
          </div>
          <div>
            <label htmlFor="otherAllowances" className="block text-sm font-medium text-gray-700 mb-1">
              Other Allowances (₹)
            </label>
            <input
              id="otherAllowances"
              type="number"
              className="input-field"
              placeholder="e.g. 5000"
              value={otherAllowances}
              onChange={(e) => setOtherAllowances(e.target.value)}
              min="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="rentPaid" className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Rent Paid (₹) — for HRA exemption
            </label>
            <input
              id="rentPaid"
              type="number"
              className="input-field"
              placeholder="e.g. 15000"
              value={rentPaid}
              onChange={(e) => setRentPaid(e.target.value)}
              min="0"
            />
          </div>
          <div>
            <label htmlFor="monthlyTds" className="block text-sm font-medium text-gray-700 mb-1">
              Monthly TDS (₹) — if known
            </label>
            <input
              id="monthlyTds"
              type="number"
              className="input-field"
              placeholder="e.g. 8000"
              value={monthlyTds}
              onChange={(e) => setMonthlyTds(e.target.value)}
              min="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select id="state" className="input-field" value={state} onChange={(e) => setState(e.target.value)}>
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
              <input type="checkbox" checked={isMetro} onChange={(e) => setIsMetro(e.target.checked)} className="rounded" />
              <span className="text-sm text-gray-700">Metro City</span>
            </label>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={pfOnFullBasic} onChange={(e) => setPfOnFullBasic(e.target.checked)} className="rounded" />
              <span className="text-sm text-gray-700">PF on full Basic</span>
            </label>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Calculating..." : "Calculate In-Hand Salary"}
        </button>
        {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
      </form>

      {result?.success && result.data && (
        <div className="space-y-6">
          <div className="card bg-green-50 border-green-200">
            <h2 className="text-lg font-semibold text-green-800">Monthly In-Hand</h2>
            <p className="text-3xl font-bold text-green-700 mt-2">
              ₹{result.data.outputs.net_inhand_monthly?.toLocaleString("en-IN")}
            </p>
            <p className="text-sm text-green-600 mt-1">
              Annual: ₹{result.data.outputs.net_inhand_annual?.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Salary breakdown">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Component</th>
                    <th className="pb-2 font-medium text-right">Amount (₹)</th>
                    <th className="pb-2 font-medium text-center">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.breakdown.map((row: Record<string, unknown>, i: number) => (
                    <tr key={i} className={`border-b last:border-0 ${row.type === "deduction" ? "text-red-700 bg-red-50" : ""}`}>
                      <td className="py-2">{String(row.component)}</td>
                      <td className="py-2 text-right">
                        {row.type === "deduction" ? "−" : ""}₹{Number(row.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          row.type === "earning" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {String(row.type)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {result.data.outputs.hra_exemption_monthly !== undefined && (
            <div className="card bg-blue-50 border-blue-200">
              <h2 className="text-lg font-semibold text-blue-800">HRA Exemption</h2>
              <p className="text-sm text-blue-700 mt-1">
                Monthly Exemption: ₹{result.data.outputs.hra_exemption_monthly?.toLocaleString("en-IN")} |
                Taxable HRA: ₹{result.data.outputs.taxable_hra_monthly?.toLocaleString("en-IN")}
              </p>
            </div>
          )}

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
