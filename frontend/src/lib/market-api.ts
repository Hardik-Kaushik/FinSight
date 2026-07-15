/**
 * Market Dashboard API client.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

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
    const res = await fetch(`${API_BASE}/api/backend/api/v1/market/dashboard`);
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
    const res = await fetch(`${API_BASE}/api/backend/api/v1/market/stock/${symbol}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data.stock;
  } catch {
    return null;
  }
}
