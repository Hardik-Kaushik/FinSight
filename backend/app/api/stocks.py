"""Stock market API endpoints - live quotes and portfolio tracking."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

from app.services.stock_service import (
    get_stock_quote,
    get_multiple_quotes,
    get_supported_symbols,
)

router = APIRouter()


class QuoteRequest(BaseModel):
    symbols: list[str]


@router.get("/symbols")
async def list_symbols():
    """List all supported stock symbols."""
    return {"symbols": get_supported_symbols()}


@router.get("/quote/{symbol}")
async def get_quote(symbol: str):
    """Get live stock quote for a single symbol."""
    quote = await get_stock_quote(symbol)
    if not quote:
        raise HTTPException(
            status_code=404,
            detail=f"Unable to fetch quote for {symbol}. Try NSE symbols like RELIANCE, TCS, INFY.",
        )
    return {"quote": quote}


@router.post("/quotes")
async def get_quotes(request: QuoteRequest):
    """Get live stock quotes for multiple symbols."""
    if len(request.symbols) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 symbols per request")
    quotes = await get_multiple_quotes(request.symbols)
    return {"quotes": quotes}
