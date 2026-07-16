"use client";

import { useState } from "react";
import { calculate, CalculationResponse } from "@/lib/api";

interface Offer {
  name: string;
  annual_ctc: string;
  basic_percent: string;
  pf_on_full_basic: boolean;
  variable_pay_annual: string;
}

const emptyOffer = (): Offer => ({
  name: "",
  annual_ctc: "",
  basic_percent: "40",
  pf_on_full_basic: false,
  variable_pay_annual: "",
});

export default function OfferComparisonPage() {
  const [offers, setOffers] = useState<Offer[]>([emptyOffer(), emptyOffer()]);
  const [state, setState] = useState("karnataka");
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateOffer = (idx: number, field: keyof Offer, value: string | boolean) => {
    const updated = [...offers];
    updated[idx] = { ...updated[idx], [field]: value };
    setOffers(updated);
  };

  const addOffer = () => {
    if (offers.length < 5) setOffers([...offers, emptyOffer()]);
  };

  const removeOffer = (idx: number) => {
    if (offers.length > 2) setOffers(offers.filter((_, i) => i !== idx));
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formattedOffers = offers.map((o) => ({
        name: o.name || `Offer ${offers.indexOf(o) + 1}`,
        annual_ctc: Number(o.annual_ctc),
        basic_percent: Number(o.basic_percent),
        pf_on_full_basic: o.pf_on_full_basic,
        variable_pay_annual: Number(o.variable_pay_annual) || 0,
      }));

      const inputs: Record<string, unknown> = {
        offers: formattedOffers,
        financial_year: "2026-27",
        state,
      };

      const response = await calculate("offer_comparison", inputs, "2026-27");
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Offer Comparison Calculator</h1>
        <p className="mt-2 text-gray-600">
          Compare job offers on actual in-hand salary. Different CTC structures can mean very different take-homes.
        </p>
      </div>

      <form onSubmit={handleCalculate} className="space-y-6">
        {offers.map((offer, idx) => (
          <div key={idx} className="card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-primary-700">Offer {idx + 1}</h3>
              {offers.length > 2 && (
                <button type="button" onClick={() => removeOffer(idx)} className="text-sm text-red-600 hover:underline">
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Company Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Google"
                  value={offer.name}
                  onChange={(e) => updateOffer(idx, "name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Annual CTC (₹) *</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g. 2500000"
                  value={offer.annual_ctc}
                  onChange={(e) => updateOffer(idx, "annual_ctc", e.target.value)}
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Basic %</label>
                <select className="input-field" value={offer.basic_percent} onChange={(e) => updateOffer(idx, "basic_percent", e.target.value)}>
                  <option value="30">30%</option>
                  <option value="35">35%</option>
                  <option value="40">40%</option>
                  <option value="45">45%</option>
                  <option value="50">50%</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Variable/Bonus (₹/yr)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g. 200000"
                  value={offer.variable_pay_annual}
                  onChange={(e) => updateOffer(idx, "variable_pay_annual", e.target.value)}
                  min="0"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={offer.pf_on_full_basic}
                onChange={(e) => updateOffer(idx, "pf_on_full_basic", e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">PF on full Basic</span>
            </label>
          </div>
        ))}

        <div className="flex items-center gap-4">
          {offers.length < 5 && (
            <button type="button" onClick={addOffer} className="text-sm text-primary-600 hover:underline">
              + Add another offer
            </button>
          )}
          <div className="ml-auto">
            <label className="text-sm text-gray-600 mr-2">State:</label>
            <select className="input-field inline w-auto" value={state} onChange={(e) => setState(e.target.value)}>
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

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Comparing..." : "Compare Offers"}
        </button>
        {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
      </form>

      {result?.success && result.data && (
        <div className="space-y-6">
          {/* Winner Banner */}
          <div className="card bg-green-50 border-green-200 text-center">
            <p className="text-sm text-green-600">Best Fixed Take-Home</p>
            <p className="text-2xl font-bold text-green-800">{result.data.outputs.best_fixed_take_home}</p>
            {result.data.outputs.best_total_compensation !== result.data.outputs.best_fixed_take_home && (
              <p className="text-sm text-blue-600 mt-1">
                Best Total Compensation (incl. variable): {result.data.outputs.best_total_compensation}
              </p>
            )}
          </div>

          {/* Comparison Table */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Side-by-Side Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Offer comparison">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Metric</th>
                    {(result.data.outputs.comparison as Record<string, unknown>[]).map((c, i) => (
                      <th key={i} className="pb-2 font-medium text-right">{String(c.name)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: "annual_ctc", label: "CTC" },
                    { key: "gross_annual", label: "Gross Salary" },
                    { key: "employee_pf_annual", label: "Employee PF/yr" },
                    { key: "fixed_take_home_monthly", label: "In-Hand/Month" },
                    { key: "fixed_take_home_annual", label: "In-Hand/Year" },
                    { key: "variable_pay_annual", label: "Variable Pay" },
                    { key: "total_compensation_annual", label: "Total Compensation" },
                    { key: "difference_from_best_monthly", label: "Diff from Best/Month" },
                  ].map((metric) => (
                    <tr key={metric.key} className="border-b last:border-0">
                      <td className="py-2 font-medium">{metric.label}</td>
                      {(result.data!.outputs.comparison as Record<string, unknown>[]).map((c, i) => {
                        const val = Number(c[metric.key]);
                        const isNeg = val < 0;
                        const isBest = metric.key === "fixed_take_home_monthly" && i === 0;
                        return (
                          <td key={i} className={`py-2 text-right ${isBest ? "text-green-700 font-bold" : ""} ${isNeg ? "text-red-600" : ""}`}>
                            {isNeg ? "−" : ""}₹{Math.abs(val).toLocaleString("en-IN")}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Key Takeaways</h2>
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
