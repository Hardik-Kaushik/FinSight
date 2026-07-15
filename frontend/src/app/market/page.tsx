"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchMarketDashboard, fetchStockDetail, MarketDashboard, StockEntry, StockDetail } from "@/lib/market-api";

function getWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("watchlist") || "[]");
  } catch { return []; }
}

function saveWatchlist(list: string[]) {
  localStorage.setItem("watchlist", JSON.stringify(list));
}

export default function MarketDashboardPage() {
  const [data, setData] = useState<MarketDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"change" | "price" | "name">("change");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [selectedStock, setSelectedStock] = useState<StockDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => { setWatchlist(getWatchlist()); }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const dashboard = await fetchMarketDashboard();
      if (dashboard) {
        setData(dashboard);
        setLastUpdated(new Date().toLocaleTimeString("en-IN"));
      } else {
        setError("Failed to load market data.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openStockDetail = async (symbol: string) => {
    setLoadingDetail(true);
    setSelectedStock(null);
    const detail = await fetchStockDetail(symbol);
    setSelectedStock(detail);
    setLoadingDetail(false);
  };

  const toggleWatchlist = (symbol: string) => {
    const updated = watchlist.includes(symbol)
      ? watchlist.filter((s) => s !== symbol)
      : [...watchlist, symbol];
    setWatchlist(updated);
    saveWatchlist(updated);
  };

  const getFilteredStocks = (): StockEntry[] => {
    if (!data) return [];
    let stocks = data.all_stocks.filter((s) => s.current_price > 0);

    if (filter === "watchlist") {
      stocks = stocks.filter((s) => watchlist.includes(s.symbol));
    } else if (filter !== "all") {
      stocks = stocks.filter((s) => s.sector.toLowerCase() === filter.toLowerCase());
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      stocks = stocks.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }

    if (sortBy === "change") stocks.sort((a, b) => b.day_change_percent - a.day_change_percent);
    else if (sortBy === "price") stocks.sort((a, b) => b.current_price - a.current_price);
    else stocks.sort((a, b) => a.name.localeCompare(b.name));

    return stocks;
  };

  if (loading && !data) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center">
        <div className="animate-pulse">
          <h1 className="text-3xl font-bold text-gray-400">Loading Market Data...</h1>
          <p className="mt-4 text-gray-500">Fetching live prices from NSE for 30 stocks</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="card border-red-200 bg-red-50 text-center">
          <h2 className="text-xl font-bold text-red-800">Unable to Load Market Data</h2>
          <p className="mt-2 text-red-600">{error}</p>
          <button onClick={loadData} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Market Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500">Live NSE Prices • Click any stock for details</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[10px] sm:text-xs text-gray-400 hidden sm:inline">Updated: {lastUpdated}</span>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "⟳..." : "⟳ Refresh"}
          </button>
        </div>
      </div>

      {/* Market Summary */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div className="card text-center p-3 sm:p-6">
            <p className="text-[10px] sm:text-xs text-gray-500">Total Stocks</p>
            <p className="text-xl sm:text-2xl font-bold">{data.market_summary.total_stocks}</p>
          </div>
          <div className="card text-center p-3 sm:p-6 bg-green-50 border-green-200">
            <p className="text-[10px] sm:text-xs text-green-600">Gainers</p>
            <p className="text-xl sm:text-2xl font-bold text-green-700">{data.market_summary.gainers}</p>
          </div>
          <div className="card text-center p-3 sm:p-6 bg-red-50 border-red-200">
            <p className="text-[10px] sm:text-xs text-red-600">Losers</p>
            <p className="text-xl sm:text-2xl font-bold text-red-700">{data.market_summary.losers}</p>
          </div>
          <div className="card text-center p-3 sm:p-6 bg-yellow-50 border-yellow-200 cursor-pointer active:scale-[0.98]" onClick={() => setFilter(filter === "watchlist" ? "all" : "watchlist")}>
            <p className="text-[10px] sm:text-xs text-yellow-700">⭐ Watchlist</p>
            <p className="text-xl sm:text-2xl font-bold text-yellow-700">{watchlist.length}</p>
          </div>
        </div>
      )}

      {/* Top Gainers & Losers */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card">
            <h2 className="font-semibold text-green-700 mb-3">🔥 Top Gainers</h2>
            <div className="space-y-2">
              {data.top_gainers.map((s) => (
                <div key={s.symbol} onClick={() => openStockDetail(s.symbol)} className="flex items-center justify-between py-1 border-b last:border-0 cursor-pointer hover:bg-green-50 px-2 rounded transition-colors">
                  <div>
                    <p className="font-medium text-sm">{s.symbol}</p>
                    <p className="text-xs text-gray-500">{s.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">₹{s.current_price.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-green-600 font-medium">+{s.day_change_percent.toFixed(2)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2 className="font-semibold text-red-700 mb-3">📉 Top Losers</h2>
            <div className="space-y-2">
              {data.top_losers.map((s) => (
                <div key={s.symbol} onClick={() => openStockDetail(s.symbol)} className="flex items-center justify-between py-1 border-b last:border-0 cursor-pointer hover:bg-red-50 px-2 rounded transition-colors">
                  <div>
                    <p className="font-medium text-sm">{s.symbol}</p>
                    <p className="text-xs text-gray-500">{s.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">₹{s.current_price.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-red-600 font-medium">{s.day_change_percent.toFixed(2)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sector Heatmap */}
      {data && (
        <div className="card p-3 sm:p-6">
          <h2 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Sector Performance</h2>
          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-1 px-1">
            <button
              onClick={() => setFilter("all")}
              className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${filter === "all" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("watchlist")}
              className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${filter === "watchlist" ? "bg-yellow-500 text-white" : "bg-yellow-50 text-yellow-800 hover:bg-yellow-100"}`}
            >
              ⭐ ({watchlist.length})
            </button>
            {data.sector_summary.map((s) => (
              <button
                key={s.sector}
                onClick={() => setFilter(filter === s.sector.toLowerCase() ? "all" : s.sector.toLowerCase())}
                className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filter === s.sector.toLowerCase()
                    ? "bg-primary-600 text-white"
                    : s.avg_change_percent > 0
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : s.avg_change_percent < 0
                    ? "bg-red-100 text-red-800 hover:bg-red-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {s.sector} ({s.avg_change_percent > 0 ? "+" : ""}{s.avg_change_percent}%)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
        <input
          type="text"
          className="input-field flex-1 min-w-[140px] max-w-xs"
          placeholder="Search stocks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search stocks"
        />
        <select
          className="input-field w-auto text-xs sm:text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "change" | "price" | "name")}
          aria-label="Sort stocks"
        >
          <option value="change">Sort: Change</option>
          <option value="price">Sort: Price</option>
          <option value="name">Sort: Name</option>
        </select>
        <span className="text-xs sm:text-sm text-gray-500 ml-auto">
          {getFilteredStocks().length}
        </span>
      </div>

      {/* Stock List - Cards on mobile, table on desktop */}
      <div className="card p-0 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm" aria-label="Stock market prices">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="py-3 px-4 text-left font-medium">Stock</th>
                <th className="py-3 px-4 text-right font-medium">Price (₹)</th>
                <th className="py-3 px-4 text-right font-medium">Change</th>
                <th className="py-3 px-4 text-right font-medium hidden md:table-cell">Day Range</th>
                <th className="py-3 px-4 text-right font-medium hidden lg:table-cell">52W Range</th>
                <th className="py-3 px-4 text-center font-medium">Sector</th>
                <th className="py-3 px-2 text-center font-medium w-10">⭐</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredStocks().map((stock) => (
                <tr
                  key={stock.symbol}
                  className="border-b last:border-0 hover:bg-blue-50 transition-colors cursor-pointer"
                  onClick={() => openStockDetail(stock.symbol)}
                >
                  <td className="py-3 px-4">
                    <p className="font-semibold">{stock.symbol}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[140px]">{stock.name}</p>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    ₹{stock.current_price.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-flex items-center gap-1 font-medium ${stock.day_change >= 0 ? "text-green-700" : "text-red-700"}`}>
                      <span className="text-xs">{stock.day_change >= 0 ? "▲" : "▼"}</span>
                      {stock.day_change_percent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-gray-500 hidden md:table-cell">
                    {stock.day_low?.toLocaleString("en-IN")} — {stock.day_high?.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-gray-500 hidden lg:table-cell">
                    {stock.fifty_two_week_low?.toLocaleString("en-IN")} — {stock.fifty_two_week_high?.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-700">{stock.sector}</span>
                  </td>
                  <td className="py-3 px-2 text-center" onClick={(e) => { e.stopPropagation(); toggleWatchlist(stock.symbol); }}>
                    <button className="text-lg" aria-label={watchlist.includes(stock.symbol) ? "Remove from watchlist" : "Add to watchlist"}>
                      {watchlist.includes(stock.symbol) ? "⭐" : "☆"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden divide-y">
          {getFilteredStocks().map((stock) => (
            <div
              key={stock.symbol}
              className="flex items-center justify-between px-3 py-3 active:bg-blue-50 transition-colors cursor-pointer"
              onClick={() => openStockDetail(stock.symbol)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  className="text-lg shrink-0"
                  onClick={(e) => { e.stopPropagation(); toggleWatchlist(stock.symbol); }}
                  aria-label="Toggle watchlist"
                >
                  {watchlist.includes(stock.symbol) ? "⭐" : "☆"}
                </button>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{stock.symbol}</p>
                  <p className="text-[11px] text-gray-500 truncate">{stock.name}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="font-semibold text-sm">₹{stock.current_price.toLocaleString("en-IN")}</p>
                <p className={`text-xs font-medium ${stock.day_change >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {stock.day_change >= 0 ? "▲" : "▼"} {stock.day_change_percent.toFixed(2)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filter === "watchlist" && watchlist.length === 0 && (
        <div className="card text-center py-8 text-gray-500">
          Your watchlist is empty. Click the ☆ next to any stock to add it.
        </div>
      )}

      {/* Stock Detail Modal */}
      {(selectedStock || loadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={() => setSelectedStock(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
            {loadingDetail ? (
              <div className="text-center py-8">
                <p className="text-gray-500 animate-pulse">Loading stock data...</p>
              </div>
            ) : selectedStock && (
              <>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedStock.symbol}</h2>
                    <p className="text-sm text-gray-500">{selectedStock.name}</p>
                    <span className="inline-block mt-1 rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-700">{selectedStock.sector}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleWatchlist(selectedStock.symbol)}
                      className="text-2xl"
                      aria-label="Toggle watchlist"
                    >
                      {watchlist.includes(selectedStock.symbol) ? "⭐" : "☆"}
                    </button>
                    <button onClick={() => setSelectedStock(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <p className="text-3xl font-bold">₹{selectedStock.current_price.toLocaleString("en-IN")}</p>
                  <p className={`text-sm font-medium mt-1 ${selectedStock.day_change >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {selectedStock.day_change >= 0 ? "▲" : "▼"} ₹{Math.abs(selectedStock.day_change).toFixed(2)} ({selectedStock.day_change >= 0 ? "+" : ""}{selectedStock.day_change_percent.toFixed(2)}%)
                  </p>
                </div>

                {/* Day Range */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Today&apos;s Range</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">₹{selectedStock.day_low?.toLocaleString("en-IN")}</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full relative">
                      <div
                        className="absolute top-0 h-2 w-2 bg-primary-600 rounded-full -translate-x-1/2"
                        style={{
                          left: selectedStock.day_high && selectedStock.day_low && selectedStock.day_high > selectedStock.day_low
                            ? `${((selectedStock.current_price - selectedStock.day_low) / (selectedStock.day_high - selectedStock.day_low)) * 100}%`
                            : "50%",
                        }}
                      />
                    </div>
                    <span className="text-xs">₹{selectedStock.day_high?.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* 52-Week Range */}
                <div className="mb-6">
                  <p className="text-xs text-gray-500 mb-1">52-Week Range</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">₹{selectedStock.fifty_two_week_low?.toLocaleString("en-IN")}</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full relative">
                      <div
                        className={`absolute top-0 h-2 w-2 rounded-full -translate-x-1/2 ${selectedStock.range_position_percent > 70 ? "bg-green-500" : selectedStock.range_position_percent < 30 ? "bg-red-500" : "bg-yellow-500"}`}
                        style={{ left: `${Math.min(100, Math.max(0, selectedStock.range_position_percent))}%` }}
                      />
                    </div>
                    <span className="text-xs">₹{selectedStock.fifty_two_week_high?.toLocaleString("en-IN")}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedStock.from_52w_high_percent}% from 52W High • +{selectedStock.from_52w_low_percent}% from 52W Low
                  </p>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Previous Close</p>
                    <p className="font-semibold">₹{selectedStock.previous_close?.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Day High</p>
                    <p className="font-semibold">₹{selectedStock.day_high?.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Day Low</p>
                    <p className="font-semibold">₹{selectedStock.day_low?.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">52W Position</p>
                    <p className="font-semibold">{selectedStock.range_position_percent}%</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
