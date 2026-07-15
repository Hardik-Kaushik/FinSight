"""
Market Dashboard API - Live stock prices for all major Indian stocks.

Provides pre-built watchlists: Nifty 50, sectoral indices, popular stocks.
"""

from fastapi import APIRouter
from app.services.stock_service import get_stock_quote, fetch_all_quotes_batch, NSE_SYMBOL_MAP

router = APIRouter()

# Pre-defined watchlists
NIFTY_50_STOCKS = [
    {"symbol": "RELIANCE", "name": "Reliance Industries", "sector": "Energy"},
    {"symbol": "TCS", "name": "Tata Consultancy Services", "sector": "IT"},
    {"symbol": "HDFCBANK", "name": "HDFC Bank", "sector": "Banking"},
    {"symbol": "INFY", "name": "Infosys", "sector": "IT"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank", "sector": "Banking"},
    {"symbol": "HINDUNILVR", "name": "Hindustan Unilever", "sector": "FMCG"},
    {"symbol": "ITC", "name": "ITC Limited", "sector": "FMCG"},
    {"symbol": "SBIN", "name": "State Bank of India", "sector": "Banking"},
    {"symbol": "BHARTIARTL", "name": "Bharti Airtel", "sector": "Telecom"},
    {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank", "sector": "Banking"},
    {"symbol": "LT", "name": "Larsen & Toubro", "sector": "Infra"},
    {"symbol": "AXISBANK", "name": "Axis Bank", "sector": "Banking"},
    {"symbol": "WIPRO", "name": "Wipro", "sector": "IT"},
    {"symbol": "BAJFINANCE", "name": "Bajaj Finance", "sector": "Finance"},
    {"symbol": "HCLTECH", "name": "HCL Technologies", "sector": "IT"},
    {"symbol": "MARUTI", "name": "Maruti Suzuki", "sector": "Auto"},
    {"symbol": "TATAMOTORS", "name": "Tata Motors", "sector": "Auto"},
    {"symbol": "SUNPHARMA", "name": "Sun Pharma", "sector": "Pharma"},
    {"symbol": "TITAN", "name": "Titan Company", "sector": "Consumer"},
    {"symbol": "ASIANPAINT", "name": "Asian Paints", "sector": "Consumer"},
    {"symbol": "TATASTEEL", "name": "Tata Steel", "sector": "Metals"},
    {"symbol": "ONGC", "name": "ONGC", "sector": "Energy"},
    {"symbol": "NTPC", "name": "NTPC", "sector": "Power"},
    {"symbol": "POWERGRID", "name": "Power Grid Corp", "sector": "Power"},
    {"symbol": "ADANIENT", "name": "Adani Enterprises", "sector": "Conglomerate"},
    {"symbol": "ADANIPORTS", "name": "Adani Ports", "sector": "Infra"},
    {"symbol": "TECHM", "name": "Tech Mahindra", "sector": "IT"},
    {"symbol": "ULTRACEMCO", "name": "UltraTech Cement", "sector": "Cement"},
    {"symbol": "JSWSTEEL", "name": "JSW Steel", "sector": "Metals"},
    {"symbol": "COALINDIA", "name": "Coal India", "sector": "Mining"},
]

SECTOR_LEADERS = {
    "IT": ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM"],
    "Banking": ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK"],
    "Energy": ["RELIANCE", "ONGC", "NTPC", "POWERGRID", "COALINDIA"],
    "Auto": ["MARUTI", "TATAMOTORS"],
    "Pharma": ["SUNPHARMA"],
    "FMCG": ["HINDUNILVR", "ITC"],
    "Metals": ["TATASTEEL", "JSWSTEEL"],
}


@router.get("/dashboard")
async def market_dashboard():
    """
    Full market dashboard with live prices for all Nifty 50 stocks.
    Uses single batch API call + caching for <2s response time.
    """
    # Single batch call (or from cache if fresh)
    all_quotes = await fetch_all_quotes_batch()

    stocks_data = []
    sector_performance: dict[str, list] = {}
    total_gainers = 0
    total_losers = 0
    total_unchanged = 0

    for stock_info in NIFTY_50_STOCKS:
        symbol = stock_info["symbol"]
        quote = all_quotes.get(symbol)

        if quote:
            entry = {
                **stock_info,
                "current_price": quote["current_price"],
                "previous_close": quote["previous_close"],
                "day_change": quote["day_change"],
                "day_change_percent": quote["day_change_percent"],
                "day_high": quote["day_high"],
                "day_low": quote["day_low"],
                "fifty_two_week_high": quote["fifty_two_week_high"],
                "fifty_two_week_low": quote["fifty_two_week_low"],
            }
            if quote["day_change"] > 0:
                total_gainers += 1
            elif quote["day_change"] < 0:
                total_losers += 1
            else:
                total_unchanged += 1

            sector = stock_info["sector"]
            if sector not in sector_performance:
                sector_performance[sector] = []
            sector_performance[sector].append(entry)
        else:
            entry = {**stock_info, "current_price": 0, "day_change": 0, "day_change_percent": 0, "error": True}

        stocks_data.append(entry)

    # Sort by day change percent for top gainers/losers
    valid_stocks = [s for s in stocks_data if s.get("current_price", 0) > 0]
    top_gainers = sorted(valid_stocks, key=lambda x: x.get("day_change_percent", 0), reverse=True)[:5]
    top_losers = sorted(valid_stocks, key=lambda x: x.get("day_change_percent", 0))[:5]

    # Sector summary
    sector_summary = []
    for sector, stocks in sector_performance.items():
        avg_change = sum(s["day_change_percent"] for s in stocks) / len(stocks) if stocks else 0
        sector_summary.append({
            "sector": sector,
            "stock_count": len(stocks),
            "avg_change_percent": round(avg_change, 2),
            "stocks": stocks,
        })
    sector_summary.sort(key=lambda x: x["avg_change_percent"], reverse=True)

    return {
        "market_summary": {
            "total_stocks": len(valid_stocks),
            "gainers": total_gainers,
            "losers": total_losers,
            "unchanged": total_unchanged,
        },
        "top_gainers": top_gainers,
        "top_losers": top_losers,
        "sector_summary": sector_summary,
        "all_stocks": stocks_data,
    }


@router.get("/sector/{sector_name}")
async def get_sector_stocks(sector_name: str):
    """Get live prices for all stocks in a sector."""
    sector_key = sector_name.strip().title()
    sector_stocks = [s for s in NIFTY_50_STOCKS if s["sector"].lower() == sector_name.lower()]
    if not sector_stocks:
        return {"error": f"Sector '{sector_name}' not found", "available_sectors": list(SECTOR_LEADERS.keys())}

    all_quotes = await fetch_all_quotes_batch()
    results = []
    for s in sector_stocks:
        quote = all_quotes.get(s["symbol"])
        if quote:
            results.append({**s, **quote})
        else:
            results.append({**s, "error": "Quote unavailable"})

    results.sort(key=lambda x: x.get("day_change_percent", 0), reverse=True)
    return {"sector": sector_key, "stocks": results}


@router.get("/watchlist")
async def get_watchlist_options():
    """Get available watchlists and sectors."""
    return {
        "watchlists": [
            {"id": "nifty50", "name": "Nifty 50", "stock_count": len(NIFTY_50_STOCKS)},
        ],
        "sectors": [
            {"name": sector, "stocks": symbols}
            for sector, symbols in SECTOR_LEADERS.items()
        ],
        "all_symbols": list(NSE_SYMBOL_MAP.keys()),
    }


@router.get("/stock/{symbol}")
async def get_stock_detail(symbol: str):
    """Get detailed stock info for a single stock."""
    quote = await get_stock_quote(symbol)
    if not quote:
        return {"error": f"Unable to fetch data for {symbol}"}

    # Find stock info from our list
    stock_info = next(
        (s for s in NIFTY_50_STOCKS if s["symbol"] == symbol.upper()),
        {"symbol": symbol.upper(), "name": symbol.upper(), "sector": "Unknown"},
    )

    # 52-week range position
    high = quote.get("fifty_two_week_high", 0)
    low = quote.get("fifty_two_week_low", 0)
    current = quote["current_price"]
    range_position = 0
    if high > low:
        range_position = round((current - low) / (high - low) * 100, 1)

    return {
        "stock": {
            **stock_info,
            **quote,
            "range_position_percent": range_position,
            "from_52w_high_percent": round((current - high) / high * 100, 2) if high > 0 else 0,
            "from_52w_low_percent": round((current - low) / low * 100, 2) if low > 0 else 0,
        }
    }
