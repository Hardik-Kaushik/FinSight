"use client";

import { useState } from "react";
import { calculate, CalculationResponse } from "@/lib/api";

export default function IncrementCalculatorPage() {
  const [currentCtc, setCurrentCtc] = useState("");
  const [hikeMode, setHikeMode] = useState<"percent" | "new_ctc">("percent");
  const [hikePercent, setHikePercent] = useState("");
  const [newCtc, setNewCtc] = useState("");
  const [pfOnFullBasic, setPfOnFullBasic] = useState(false);
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
        current_ctc: Number(currentCtc),
        financial_year: "2026-27",
        pf_on_full_basic: pfOnFullBasic,
      };

      if (hikeMode === "percent") {
        inputs.hike_percent = Number(hikePercent);
      } else {
        inputs.new_ctc = Number(newCtc);
      }

      const response = await calculate("increment_calculator", inputs, "2026-27");
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
        <h1 className="text-3xl font-bold">Increment Calculator</h1>
        <p className="mt-2 text-gray-600">
          See how much of your salary hike actually reaches your bank account.
        </p>
      </div>

      <form onSubmit={handleCalculate} className="card space-y-6">
        <div>
          <label htmlFor="currentCtc" className="block text-sm font-medium text-gray-700 mb-1">
            Current Annual CTC (₹)
          </label>
          <input
            id="currentCtc"
            type="number"
            className="input-field"
            placeholder="e.g. 1200000"
            value={currentCtc}
            onChange={(e) => setCurrentCtc(e.target.value)}
            required
            min="1"
          />
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-2">
            Hike Input Method
          </legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="hikeMode"
                checked={hikeMode === "percent"}
                onChange={() => setHikeMode("percent")}
              />
              <span className="text-sm">Hike Percentage</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="hikeMode"
                checked={hikeMode === "new_ctc"}
                onChange={() => setHikeMode("new_ctc")}
              />
              <span className="text-sm">New CTC Amount</span>
            </label>
          </div>
        </fieldset>

        {hikeMode === "percent" ? (
          <div>
            <label htmlFor="hikePercent" className="block text-sm font-medium text-gray-700 mb-1">
              Hike Percentage (%)
            </label>
            <input
              id="hikePercent"
              type="number"
              className="input-field"
              placeholder="e.g. 25"
              value={hikePercent}
              onChange={(e) => setHikePercent(e.target.value)}
              required
              min="0"
              step="0.5"
            />
          </div>
        ) : (
          <div>
            <label htmlFor="newCtc" className="block text-sm font-medium text-gray-700 mb-1">
              New Annual CTC (₹)
            </label>
            <input
              id="newCtc"
              type="number"
              className="input-field"
              placeholder="e.g. 1500000"
              value={newCtc}
              onChange={(e) => setNewCtc(e.target.value)}
              required
              min="0"
            />
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={pfOnFullBasic}
            onChange={(e) => setPfOnFullBasic(e.target.checked)}
            className="rounded text-primary-600"
          />
          <span className="text-sm text-gray-700">PF on full Basic</span>
        </label>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Calculating..." : "Calculate Increment Impact"}
        </button>

        {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
      </form>

      {result?.success && result.data && (
        <div className="space-y-6">
          {/* Hero Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card bg-blue-50 border-blue-200 text-center">
              <p className="text-sm text-blue-600">CTC Hike</p>
              <p className="text-2xl font-bold text-blue-800">
                {result.data.outputs.hike_percent}%
              </p>
              <p className="text-xs text-blue-500">
                +₹{result.data.outputs.ctc_increase?.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="card bg-green-50 border-green-200 text-center">
              <p className="text-sm text-green-600">In-Hand Increase</p>
              <p className="text-2xl font-bold text-green-800">
                +₹{result.data.outputs.inhand_increase_monthly?.toLocaleString("en-IN")}/mo
              </p>
              <p className="text-xs text-green-500">
                +₹{result.data.outputs.inhand_increase_annual?.toLocaleString("en-IN")}/year
              </p>
            </div>
            <div className="card bg-purple-50 border-purple-200 text-center">
              <p className="text-sm text-purple-600">Effective Hike</p>
              <p className="text-2xl font-bold text-purple-800">
                {result.data.outputs.effective_hike_percent}%
              </p>
              <p className="text-xs text-purple-500">on take-home salary</p>
            </div>
          </div>

          {/* Before vs After Table */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Before vs After</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Before and after comparison">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Metric</th>
                    <th className="pb-2 font-medium text-right">Before</th>
                    <th className="pb-2 font-medium text-right">After</th>
                    <th className="pb-2 font-medium text-right">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.breakdown.map((row: Record<string, unknown>, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 font-medium">{String(row.metric)}</td>
                      <td className="py-2 text-right">₹{Number(row.before).toLocaleString("en-IN")}</td>
                      <td className="py-2 text-right">₹{Number(row.after).toLocaleString("en-IN")}</td>
                      <td className={`py-2 text-right font-semibold ${Number(row.change) >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {Number(row.change) >= 0 ? "+" : ""}₹{Number(row.change).toLocaleString("en-IN")}
                      </td>
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
