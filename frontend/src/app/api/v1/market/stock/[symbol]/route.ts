import { NextRequest, NextResponse } from "next/server";

const YAHOO_URL = "https://query1.finance.yahoo.com/v7/finance/quote";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const yahooSymbol = `${symbol.toUpperCase()}.NS`;

  try {
    const res = await fetch(
      `${YAHOO_URL}?symbols=${yahooSymbol}&fields=regularMarketPrice,previousClose,regularMarketDayHigh,regularMarketDayLow,fiftyTwoWeekHigh,fiftyTwoWeekLow,shortName,regularMarketChange,regularMarketChangePercent`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 60 } }
    );

    if (!res.ok) return NextResponse.json({ error: "Quote unavailable" }, { status: 502 });
    const data = await res.json();
    const q = data?.quoteResponse?.result?.[0];
    if (!q) return NextResponse.json({ error: `No data for ${symbol}` }, { status: 404 });

    const current = q.regularMarketPrice || 0;
    const high52 = q.fiftyTwoWeekHigh || 0;
    const low52 = q.fiftyTwoWeekLow || 0;
    const rangePos = high52 > low52 ? Math.round((current - low52) / (high52 - low52) * 1000) / 10 : 0;

    return NextResponse.json({
      stock: {
        symbol: symbol.toUpperCase(),
        name: q.shortName || symbol,
        current_price: Math.round(current * 100) / 100,
        previous_close: Math.round((q.previousClose || 0) * 100) / 100,
        day_change: Math.round((q.regularMarketChange || 0) * 100) / 100,
        day_change_percent: Math.round((q.regularMarketChangePercent || 0) * 100) / 100,
        day_high: q.regularMarketDayHigh || 0,
        day_low: q.regularMarketDayLow || 0,
        fifty_two_week_high: high52,
        fifty_two_week_low: low52,
        range_position_percent: rangePos,
        from_52w_high_percent: high52 > 0 ? Math.round((current - high52) / high52 * 10000) / 100 : 0,
        from_52w_low_percent: low52 > 0 ? Math.round((current - low52) / low52 * 10000) / 100 : 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
