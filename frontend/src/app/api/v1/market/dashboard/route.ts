import { NextResponse } from "next/server";

const STOCKS = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy" },
  { symbol: "TCS", name: "TCS", sector: "IT" },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking" },
  { symbol: "INFY", name: "Infosys", sector: "IT" },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banking" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG" },
  { symbol: "ITC", name: "ITC", sector: "FMCG" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banking" },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Infra" },
  { symbol: "WIPRO", name: "Wipro", sector: "IT" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Finance" },
  { symbol: "HCLTECH", name: "HCL Technologies", sector: "IT" },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto" },
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", sector: "Pharma" },
  { symbol: "TITAN", name: "Titan Company", sector: "Consumer" },
  { symbol: "TATASTEEL", name: "Tata Steel", sector: "Metals" },
  { symbol: "NTPC", name: "NTPC", sector: "Power" },
  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Conglomerate" },
  { symbol: "TECHM", name: "Tech Mahindra", sector: "IT" },
  { symbol: "COALINDIA", name: "Coal India", sector: "Mining" },
  { symbol: "ONGC", name: "ONGC", sector: "Energy" },
  { symbol: "POWERGRID", name: "Power Grid", sector: "Power" },
];

const YAHOO_URL = "https://query1.finance.yahoo.com/v7/finance/quote";

export async function GET() {
  const symbols = STOCKS.map((s) => `${s.symbol}.NS`).join(",");

  try {
    const res = await fetch(
      `${YAHOO_URL}?symbols=${symbols}&fields=regularMarketPrice,previousClose,regularMarketDayHigh,regularMarketDayLow,fiftyTwoWeekHigh,fiftyTwoWeekLow,shortName,regularMarketChange,regularMarketChangePercent`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 60 } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Yahoo Finance unavailable" }, { status: 502 });
    }

    const data = await res.json();
    const quotes = data?.quoteResponse?.result || [];

    const stocksData = STOCKS.map((stock) => {
      const q = quotes.find((x: Record<string, unknown>) => (x.symbol as string)?.startsWith(stock.symbol));
      if (!q) return { ...stock, current_price: 0, day_change: 0, day_change_percent: 0, error: true };
      return {
        ...stock,
        current_price: Math.round((q.regularMarketPrice || 0) * 100) / 100,
        previous_close: Math.round((q.previousClose || 0) * 100) / 100,
        day_change: Math.round((q.regularMarketChange || 0) * 100) / 100,
        day_change_percent: Math.round((q.regularMarketChangePercent || 0) * 100) / 100,
        day_high: q.regularMarketDayHigh || 0,
        day_low: q.regularMarketDayLow || 0,
        fifty_two_week_high: q.fiftyTwoWeekHigh || 0,
        fifty_two_week_low: q.fiftyTwoWeekLow || 0,
      };
    });

    const valid = stocksData.filter((s) => s.current_price > 0);
    const gainers = valid.filter((s) => s.day_change > 0).length;
    const losers = valid.filter((s) => s.day_change < 0).length;

    const sectorMap: Record<string, typeof valid> = {};
    valid.forEach((s) => { (sectorMap[s.sector] ||= []).push(s); });
    const sector_summary = Object.entries(sectorMap).map(([sector, stocks]) => ({
      sector, stock_count: stocks.length,
      avg_change_percent: Math.round(stocks.reduce((a, b) => a + b.day_change_percent, 0) / stocks.length * 100) / 100,
      stocks,
    })).sort((a, b) => b.avg_change_percent - a.avg_change_percent);

    return NextResponse.json({
      market_summary: { total_stocks: valid.length, gainers, losers, unchanged: valid.length - gainers - losers },
      top_gainers: [...valid].sort((a, b) => b.day_change_percent - a.day_change_percent).slice(0, 5),
      top_losers: [...valid].sort((a, b) => a.day_change_percent - b.day_change_percent).slice(0, 5),
      sector_summary,
      all_stocks: stocksData,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 });
  }
}
