"""
Stock Market Service - Fetches live Indian stock prices.

Optimizations:
1. Single batch API call for all symbols (Yahoo Finance quote endpoint)
2. In-memory cache with 60s TTL - repeated loads are instant
3. Concurrent fallback if batch fails

Yahoo Finance endpoints:
- Batch quotes: https://query1.finance.yahoo.com/v7/finance/quote?symbols=X,Y,Z
- Single chart: https://query1.finance.yahoo.com/v8/finance/chart/{symbol}
"""

import httpx
import time
import asyncio
from typing import Any


# --- Configuration ---

YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote"
YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
CACHE_TTL_SECONDS = 60  # Cache quotes for 60 seconds

# Common NSE stocks mapping (user-friendly name -> Yahoo symbol)
NSE_SYMBOL_MAP = {
    "RELIANCE": "RELIANCE.NS",
    "TCS": "TCS.NS",
    "INFY": "INFY.NS",
    "HDFCBANK": "HDFCBANK.NS",
    "ICICIBANK": "ICICIBANK.NS",
    "HINDUNILVR": "HINDUNILVR.NS",
    "ITC": "ITC.NS",
    "SBIN": "SBIN.NS",
    "BHARTIARTL": "BHARTIARTL.NS",
    "KOTAKBANK": "KOTAKBANK.NS",
    "LT": "LT.NS",
    "AXISBANK": "AXISBANK.NS",
    "WIPRO": "WIPRO.NS",
    "BAJFINANCE": "BAJFINANCE.NS",
    "HCLTECH": "HCLTECH.NS",
    "MARUTI": "MARUTI.NS",
    "TATAMOTORS": "TATAMOTORS.NS",
    "SUNPHARMA": "SUNPHARMA.NS",
    "TITAN": "TITAN.NS",
    "ASIANPAINT": "ASIANPAINT.NS",
    "TATASTEEL": "TATASTEEL.NS",
    "ONGC": "ONGC.NS",
    "NTPC": "NTPC.NS",
    "POWERGRID": "POWERGRID.NS",
    "ADANIENT": "ADANIENT.NS",
    "ADANIPORTS": "ADANIPORTS.NS",
    "TECHM": "TECHM.NS",
    "ULTRACEMCO": "ULTRACEMCO.NS",
    "JSWSTEEL": "JSWSTEEL.NS",
    "COALINDIA": "COALINDIA.NS",
}

# --- In-Memory Cache ---

_quote_cache: dict[str, dict[str, Any]] = {}
_cache_timestamp: float = 0


def _is_cache_valid() -> bool:
    """Check if cache is still fresh."""
    return (time.time() - _cache_timestamp) < CACHE_TTL_SECONDS


def _get_cached_quote(symbol: str) -> dict[str, Any] | None:
    """Get a single quote from cache."""
    if _is_cache_valid():
        return _quote_cache.get(symbol.upper())
    return None


def _set_cache(quotes: dict[str, dict[str, Any]]):
    """Set the entire cache."""
    global _quote_cache, _cache_timestamp
    _quote_cache = quotes
    _cache_timestamp = time.time()


# --- Batch Fetch (Single HTTP Call) ---

async def fetch_all_quotes_batch() -> dict[str, dict[str, Any]]:
    """
    Fetch ALL stock quotes in a single HTTP request using Yahoo Finance batch API.
    This replaces 30 individual calls with 1 call.
    """
    # Check cache first
    if _is_cache_valid() and _quote_cache:
        return _quote_cache

    yahoo_symbols = list(NSE_SYMBOL_MAP.values())
    symbols_str = ",".join(yahoo_symbols)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                YAHOO_QUOTE_URL,
                params={
                    "symbols": symbols_str,
                    "fields": "regularMarketPrice,previousClose,regularMarketDayHigh,regularMarketDayLow,fiftyTwoWeekHigh,fiftyTwoWeekLow,shortName,regularMarketChange,regularMarketChangePercent,marketState",
                },
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
            )

            if response.status_code == 200:
                data = response.json()
                results = data.get("quoteResponse", {}).get("result", [])
                quotes = {}
                for item in results:
                    quote = _parse_batch_quote(item)
                    if quote:
                        quotes[quote["symbol"]] = quote

                if quotes:
                    _set_cache(quotes)
                    return quotes

    except Exception:
        pass

    # Fallback: concurrent individual requests
    return await _fetch_all_concurrent()


def _parse_batch_quote(item: dict[str, Any]) -> dict[str, Any] | None:
    """Parse a single item from batch quote response."""
    yahoo_symbol = item.get("symbol", "")
    # Reverse lookup: RELIANCE.NS -> RELIANCE
    symbol = None
    for k, v in NSE_SYMBOL_MAP.items():
        if v == yahoo_symbol:
            symbol = k
            break
    if not symbol:
        symbol = yahoo_symbol.replace(".NS", "").replace(".BO", "")

    current_price = item.get("regularMarketPrice", 0)
    if not current_price:
        return None

    previous_close = item.get("previousClose", 0) or item.get("regularMarketPreviousClose", 0)
    day_change = item.get("regularMarketChange", 0)
    day_change_pct = item.get("regularMarketChangePercent", 0)

    # If change not provided, calculate it
    if not day_change and previous_close:
        day_change = current_price - previous_close
        day_change_pct = (day_change / previous_close * 100) if previous_close else 0

    return {
        "symbol": symbol,
        "yahoo_symbol": yahoo_symbol,
        "name": item.get("shortName", symbol),
        "exchange": "NSE",
        "currency": "INR",
        "current_price": round(current_price, 2),
        "previous_close": round(previous_close, 2),
        "day_change": round(day_change, 2),
        "day_change_percent": round(day_change_pct, 2),
        "day_high": item.get("regularMarketDayHigh", 0),
        "day_low": item.get("regularMarketDayLow", 0),
        "fifty_two_week_high": item.get("fiftyTwoWeekHigh", 0),
        "fifty_two_week_low": item.get("fiftyTwoWeekLow", 0),
        "market_state": item.get("marketState", "UNKNOWN"),
    }

# --- Concurrent Fallback (if batch API fails) ---

async def _fetch_single_chart(client: httpx.AsyncClient, symbol: str) -> dict[str, Any] | None:
    """Fetch a single stock using the chart endpoint."""
    yahoo_symbol = NSE_SYMBOL_MAP.get(symbol.upper(), f"{symbol.upper()}.NS")
    try:
        response = await client.get(
            YAHOO_CHART_URL.format(symbol=yahoo_symbol),
            headers={"User-Agent": "Mozilla/5.0"},
            params={"interval": "1d", "range": "5d"},
        )
        if response.status_code != 200:
            return None

        data = response.json()
        chart = data.get("chart", {}).get("result", [])
        if not chart:
            return None

        meta = chart[0].get("meta", {})
        current_price = meta.get("regularMarketPrice", 0)
        previous_close = meta.get("previousClose", 0) or meta.get("chartPreviousClose", 0)
        day_change = current_price - previous_close if previous_close else 0
        day_change_pct = (day_change / previous_close * 100) if previous_close else 0

        return {
            "symbol": symbol.upper(),
            "yahoo_symbol": yahoo_symbol,
            "name": meta.get("shortName", symbol.upper()),
            "exchange": meta.get("exchangeName", "NSE"),
            "currency": meta.get("currency", "INR"),
            "current_price": round(current_price, 2),
            "previous_close": round(previous_close, 2),
            "day_change": round(day_change, 2),
            "day_change_percent": round(day_change_pct, 2),
            "day_high": meta.get("regularMarketDayHigh", 0),
            "day_low": meta.get("regularMarketDayLow", 0),
            "fifty_two_week_high": meta.get("fiftyTwoWeekHigh", 0),
            "fifty_two_week_low": meta.get("fiftyTwoWeekLow", 0),
            "market_state": meta.get("marketState", "UNKNOWN"),
        }
    except Exception:
        return None


async def _fetch_all_concurrent() -> dict[str, dict[str, Any]]:
    """Fallback: fetch all stocks concurrently (parallel, not sequential)."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        tasks = [_fetch_single_chart(client, symbol) for symbol in NSE_SYMBOL_MAP.keys()]
        results = await asyncio.gather(*tasks)

    quotes = {}
    for quote in results:
        if quote:
            quotes[quote["symbol"]] = quote

    if quotes:
        _set_cache(quotes)
    return quotes


# --- Public API ---

async def get_stock_quote(symbol: str) -> dict[str, Any] | None:
    """Get a single stock quote (from cache or fresh fetch)."""
    cached = _get_cached_quote(symbol)
    if cached:
        return cached

    # If cache is stale, refresh all quotes
    all_quotes = await fetch_all_quotes_batch()
    return all_quotes.get(symbol.upper())


async def get_multiple_quotes(symbols: list[str]) -> list[dict[str, Any]]:
    """Get quotes for multiple stocks."""
    all_quotes = await fetch_all_quotes_batch()
    results = []
    for symbol in symbols:
        quote = all_quotes.get(symbol.upper())
        if quote:
            results.append(quote)
        else:
            results.append({"symbol": symbol.upper(), "error": "Unable to fetch quote"})
    return results


def get_supported_symbols() -> list[dict[str, str]]:
    """Return list of supported stock symbols."""
    return [
        {"symbol": k, "yahoo_symbol": v, "exchange": "NSE"}
        for k, v in sorted(NSE_SYMBOL_MAP.items())
    ]
