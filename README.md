# ProjectFinanceHub AI

AI-Powered Personal Finance Platform for India.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                       │
│         (SSR, Mobile-first, WCAG compliant)             │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────┐
│                   FastAPI Backend                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ API Layer│  │ AI Orchestrator│  │ Rules Engine     │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬─────────┘  │
│       │               │                    │             │
│  ┌────▼───────────────▼────────────────────▼─────────┐  │
│  │           Calculation Engine (Pure Python)          │  │
│  │         No framework dependencies                  │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │                              │
    ┌────▼────┐                   ┌─────▼─────┐
    │PostgreSQL│                   │   Redis    │
    └─────────┘                   └───────────┘
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Infrastructure
```bash
docker-compose up -d  # PostgreSQL + Redis
```

## Project Structure

```
├── backend/
│   ├── app/                    # FastAPI application
│   │   ├── api/                # API route handlers
│   │   ├── core/               # App config, dependencies
│   │   ├── models/             # SQLAlchemy models
│   │   └── services/           # Business logic services
│   ├── calculation_engine/     # Independent calculation package
│   │   ├── calculators/        # Calculator plugins
│   │   ├── rules/              # Rules engine
│   │   └── schemas/            # Input/Output schemas
│   ├── ai_orchestrator/        # AI layer
│   ├── rules_config/           # Versioned JSON rule files
│   └── tests/                  # Comprehensive test suite
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js app router
│   │   ├── components/         # Reusable UI components
│   │   ├── lib/                # API client, utilities
│   │   └── calculators/        # Calculator UI modules
│   └── public/
├── docker-compose.yml
└── README.md
```

## Design Principles

1. **Deterministic Calculations** — Every formula is testable and reproducible
2. **Externalized Rules** — Tax slabs, PF rates, etc. live in versioned JSON configs
3. **AI as Explainer** — AI never invents numbers; it explains calculation outputs
4. **Plugin Architecture** — New calculators are self-contained modules
5. **API-First** — Same logic powers web, mobile, and integrations
6. **Multi-FY Support** — Rules are versioned by financial year
