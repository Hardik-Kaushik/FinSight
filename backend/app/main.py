"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api.calculators import router as calculators_router
from app.api.health import router as health_router
from app.api.stocks import router as stocks_router
from app.api.market import router as market_router

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Smart Personal Finance Platform for India",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health_router, tags=["Health"])
app.include_router(calculators_router, prefix="/api/v1/calculators", tags=["Calculators"])
app.include_router(stocks_router, prefix="/api/v1/stocks", tags=["Stocks"])
app.include_router(market_router, prefix="/api/v1/market", tags=["Market Dashboard"])
