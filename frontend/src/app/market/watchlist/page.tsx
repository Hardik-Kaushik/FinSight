"use client";

import { useState, useEffect } from "react";
import { fetchMarketDashboard, MarketDashboard, StockEntry } from "@/lib/market-api";
import Link from "next/link";

function getWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("watchlist") || "[]");
  } catch { return []; }
}

function saveWatchlist(list: string[]) {
  localStorage.setItem("watchlist", JSON.stringify(list));
}

export default function WatchlistPage() {
  const [data, setData] = useState<MarketDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    setWatchlist(getWatchlist());
    fetchMarketDashboard().then((d) => { setData(d); setLoading(false); });
  }, []);

  const removeFromWatchlist = (symbol: string) => {
    const updated = watchlist.filter((s) => s !== symbol);
    setWatchlist(updated);
    saveWatchlist(updated);
  };

  const watchlistStocks: StockEntry[] = data
    ? data.all_stocks.filter((s) => watchlist.includes(s.symbol) && s.current_price > 0)
    : [];

  const totalValue = watchlistStocks.reduce((sum, s) => sum + s.current_price, 0);
  const avgChange = watchlistStocks.length > 0
    ? watchlistStocks.reduce((sum, s) => sum + s.day_change_percent, 0) / watchlistStocks.length
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">⭐ My Watchlist</h1>
          <p className="text-sm text-gray-500 mt-1">
            Stocks you&apos;re tracking. Add from the{" "}
            <Link href="/market" className="text-primary-600 hover:underline">Market Dashboard</Link>.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-8 animate-pulse text-gray-400">Loading prices...</div>
      ) : watchlistStocks.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-xl text-gray-400 mb-4">No stocks in your watchlist</p>
          <p className="text-sm text-gray-500 mb-6">
            Go to the Market Dashboard and click ☆ next to any stock to add it here.
          </p>
          <Link href="/market" className="btn-primary">Open Market Dashboard</Link>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-xs text-gray-500">Tracking</p>
              <p className="text-2xl font-bold">{watchlistStocks.length} stocks</p>
            </div>
            <div className={`card text-center ${avgChange >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <p className="text-xs text-gray-500">Avg. Day Change</p>
              <p className={`text-2xl font-bold ${avgChange >= 0 ? "text-green-700" : "text-red-700"}`}>
                {avgChange >= 0 ? "+" : ""}{avgChange.toFixed(2)}%
              </p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500">Gainers / Losers</p>
              <p className="text-2xl font-bold">
                <span className="text-green-700">{watchlistStocks.filter((s) => s.day_change >= 0).length}</span>
                {" / "}
                <span className="text-red-700">{watchlistStocks.filter((s) => s.day_change < 0).length}</span>
              </p>
            </div>
          </div>

          {/* Stock Cards */}
          <div className="space-y-3">
            {watchlistStocks
              .sort((a, b) => b.day_change_percent - a.day_change_percent)
              .map((stock) => (
                <div key={stock.symbol} className="card flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-bold text-lg">{stock.symbol}</p>
                        <p className="text-xs text-gray-500">{stock.name} • {stock.sector}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="font-bold text-lg">₹{stock.current_price.toLocaleString("en-IN")}</p>
                      <p className={`text-sm font-medium ${stock.day_change >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {stock.day_change >= 0 ? "▲" : "▼"} {stock.day_change >= 0 ? "+" : ""}{stock.day_change.toFixed(2)} ({stock.day_change_percent.toFixed(2)}%)
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromWatchlist(stock.symbol)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      aria-label="Remove from watchlist"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
