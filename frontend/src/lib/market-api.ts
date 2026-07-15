/**
 * Market Dashboard API client.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 50000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Request failed after retries");
}

export interface StockEntry {
  symbol: string;
  name: string;
  sector: string;
  current_price: number;
  previous_close: number;
  day_change: number;
  day_change_percent: number;
  day_high: number;
  day_low: number;
  fifty_two_week_high: number;
  fifty_two_week_low: number;
  error?: boolean;
}

export interface MarketDashboard {
  market_summary: {
    total_stocks: number;
    gainers: number;
    losers: number;
    unchanged: number;
  };
  top_gainers: StockEntry[];
  top_losers: StockEntry[];
  sector_summary: {
    sector: string;
    stock_count: number;
    avg_change_percent: number;
    stocks: StockEntry[];
  }[];
  all_stocks: StockEntry[];
}

export async function fetchMarketDashboard(): Promise<MarketDashboard | null> {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/market/dashboard`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface StockDetail extends StockEntry {
  range_position_percent: number;
  from_52w_high_percent: number;
  from_52w_low_percent: number;
}

export async function fetchStockDetail(symbol: string): Promise<StockDetail | null> {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/market/stock/${symbol}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data.stock;
  } catch {
    return null;
  }
}
