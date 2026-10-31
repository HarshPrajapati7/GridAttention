# ⚡ GridTwin / GridAttention — Live Evaluator & Verification API

> ### 🌐 Quick Access Links
> - 📖 **Swagger UI / Interactive API Documentation:** **[`https://gridattention-2.onrender.com/docs`](https://gridattention-2.onrender.com/docs)**
> - 🔗 **Primary Live API Base URL:** **[`https://gridattention-2.onrender.com`](https://gridattention-2.onrender.com)**
> - 📄 **Swagger / OpenAPI Schema (JSON):** **[`https://gridattention-2.onrender.com/swagger.json`](https://gridattention-2.onrender.com/swagger.json)** (or **[`/openapi.json`](https://gridattention-2.onrender.com/openapi.json)**)
> - 🩺 **Service Health Endpoint:** **[`https://gridattention-2.onrender.com/health`](https://gridattention-2.onrender.com/health)**
> - 📚 **ReDoc Alternative Documentation:** **[`https://gridattention-2.onrender.com/redoc`](https://gridattention-2.onrender.com/redoc)**

---

## 🚀 Overview for Mentors, Evaluators & Automated Scrapers

This repository hosts **GridTwin / GridAttention**, a research-grade Day-Ahead Electricity Demand Forecasting intelligence platform. It provides trained model artefacts, holdout metrics across candidate architectures, hourly demand predictions with uncertainty quantiles ($P_{10} - P_{90}$), and a live FastAPI verification microservice.

- **Zero Authentication Required**: Open endpoints for seamless evaluation by mentors, bots, automated scripts, and frontends without tokens or API keys.
- **Machine-Readable**: All responses follow strict JSON schemas with CORS enabled (`*`).
- **Interactive OpenAPI Documentation**: Built-in Swagger UI at [`/docs`](https://gridattention-2.onrender.com/docs) and ReDoc at [`/redoc`](https://gridattention-2.onrender.com/redoc).

---

## 📌 Primary Live Endpoints (Quick Reference)

| Method | Endpoint | Description | Auth |
|---|---|---|:---:|
| `GET` | **[`/health`](https://gridattention-2.onrender.com/health)** | Uptime & service status check | None |
| `GET` | **[`/api/public/review`](https://gridattention-2.onrender.com/api/public/review)** | Full review payload: holdout metrics, model leaderboard & 24h forecast | None |
| `POST` | **[`/api/public/review`](https://gridattention-2.onrender.com/api/public/review)** | Custom batch verification (interval ordering, peak load & energy sum) | None |
| `GET` | **[`/api/runs`](https://gridattention-2.onrender.com/api/runs)** | Lists available model training runs | None |
| `GET` | **[`/api/runs/{run_id}/summary`](https://gridattention-2.onrender.com/api/runs/gridtwin-final-chronos2-2024-06-17/summary)** | Metrics, missing timestamps & candidate benchmarks | None |
| `GET` | **[`/api/runs/{run_id}/forecast`](https://gridattention-2.onrender.com/api/runs/gridtwin-final-chronos2-2024-06-17/forecast)** | 24-hour hour-by-hour demand forecast and uncertainty bounds | None |
| `POST` | **[`/api/documents/extract`](https://gridattention-2.onrender.com/api/documents/extract)** | Upload a grid/tariff PDF report to extract text | None |
| `GET` | **[`/openapi.json`](https://gridattention-2.onrender.com/openapi.json)** | Complete OpenAPI 3.1 specification for scrapers/bots | None |

---

## 🧠 Model Architecture & Methodology

GridTwin implements an ensemble evaluation pipeline for day-ahead probabilistic load forecasting:

```
[Raw Grid Data (~79k rows)] 
        │
        ▼
[Preprocessing & Anomaly Detection]
  ├── Gross outlier detection & masking (5 candidates masked)
  ├── Imputation for 1,045 missing hourly slots
  └── Calendar & cyclical feature engineering
        │
        ▼
[Candidate Architectures Benchmark]
  ├── Foundation Models: Chronos-2 (Amazon)
  ├── Gradient Boosting: CatBoost (cat_demand, cat_context) & LightGBM (lgbm_demand, lgbm_context)
  ├── Deep Learning: PatchTST (Patch Time Series Transformer) & DLinear
  └── Baseline Heuristics: Seasonal Day, Seasonal Week, Seasonal Blend
        │
        ▼
[Rolling Cross-Validation & Holdout Verification]
  ├── Multi-origin rolling CV (n=671 evaluation windows)
  └── Best Performer: Chronos-2 (WAPE: 4.43%, MAE: 439.88 MW, RMSE: 3,185.12 MW)
        │
        ▼
[Probabilistic Forecast Output]
  └── 24-hour Horizon with P10, P50 (demand_mw), and P90 uncertainty intervals
```

### Leaderboard Results

| Rank | Model Architecture | WAPE (%) | MAE (MW) | RMSE (MW) | Selected |
|:---:|---|:---:|:---:|:---:|:---:|
| 🥇 | **Chronos-2** | **4.43%** | **439.88** | 3,185.12 | ✅ Selected |
| 🥈 | **CatBoost (Demand)** | 5.52% | 547.90 | 3,219.14 | Benchmark |
| 🥉 | **LightGBM (Demand)** | 5.62% | 558.73 | 3,222.50 | Benchmark |
| 4 | **PatchTST** | 5.67% | 563.10 | 3,226.87 | Benchmark |
| 5 | **CatBoost (Context)** | 5.78% | 574.45 | 3,223.38 | Benchmark |
| 6 | **DLinear** | 5.79% | 574.69 | 3,249.50 | Benchmark |
| 7 | **Seasonal Day** | 6.63% | 658.40 | 3,280.79 | Baseline |

---

## 📁 Repository Directory Structure

```text
GridAttention/
├── render.yaml                          # Root deployment specification for Render web service
├── Readme.md                            # Main project documentation & evaluator guide
├── GridAttentionNet_v1.ipynb            # Initial neural network modeling notebook
├── GRIDTWIN24_FINAL_Research_Grade_Forecasting_v2.ipynb  # Final research-grade pipeline (v2)
├── GRIDTWIN24_FINAL_Research_Grade_v3.ipynb              # Final research-grade pipeline (v3)
│
├── backend/                             # Python FastAPI Production Microservice
│   ├── main.py                          # FastAPI application routing & verification logic
│   ├── requirements.txt                 # Backend dependencies (fastapi, uvicorn, pypdf)
│   ├── render.yaml                      # Service definition for backend deployment
│   ├── gridtwin final model.zip         # Packaged model outputs, metadata & forecasts
│   └── README.md                        # Backend-specific documentation
│
└── gridtwin/                            # Modern Next.js Day-Ahead Energy UI
    ├── package.json                     # Frontend dependencies (React 19, Next 16, ECharts)
    ├── tsconfig.json                    # TypeScript configuration
    ├── next.config.ts                   # Next.js configuration
    ├── render.yaml                      # Frontend deployment spec
    ├── vercel.json                      # Vercel deployment spec
    ├── GRIDTWIN24_UI_SPEC.md            # Detailed UI specification & design system
    ├── DESIGN-apple.md                  # Design system documentation
    ├── public/                          # Static assets & PDF workers
    └── src/
        ├── app/                         # App router (layout.tsx, page.tsx, globals.css)
        ├── components/                  # ASCII gradients & interactive chart cards
        ├── data/                        # Local fallback run data
        └── lib/                         # API client for backend communication
```

---

## 🛠️ Dependencies & Requirements

### Backend (`backend/requirements.txt`)
```text
fastapi>=0.115,<1
uvicorn[standard]>=0.30,<1
python-multipart>=0.0.9,<1
pypdf>=5,<7
```

### Frontend (`gridtwin/package.json`)
- **Framework**: Next.js 16 (App Router) + React 19
- **Visualization**: Apache ECharts (`echarts`, `echarts-for-react`)
- **Icons**: Lucide React (`lucide-react`)
- **PDF Processing**: `pdfjs-dist`

---

## 🧪 Testing the Live API (For Bots, Evaluators & Scrapers)

### 1. In-Browser Interactive Testing
Visit **[`https://gridattention-2.onrender.com/docs`](https://gridattention-2.onrender.com/docs)**:
- Open `GET /api/public/review` → Click **"Try it out"** → Click **"Execute"**.
- Open `POST /api/public/review` to validate custom prediction samples.

### 2. Using `curl`

```bash
# Verify health
curl -s "https://gridattention-2.onrender.com/health"

# Get full benchmark metrics and 24-hour predictions
curl -s "https://gridattention-2.onrender.com/api/public/review"

# Validate custom data points
curl -s -X POST "https://gridattention-2.onrender.com/api/public/review" \
  -H "Content-Type: application/json" \
  -d '{
    "sample": [
      {"timestamp": "2024-06-17 00:00:00", "demand_mw": 12863.46, "p10": 12521.03, "p90": 13190.55},
      {"timestamp": "2024-06-17 01:00:00", "demand_mw": 12364.82, "p10": 12022.40, "p90": 12691.92}
    ]
  }'
```

### 3. Using Python (`requests`)

```python
import requests

BASE_URL = "https://gridattention-2.onrender.com"

# 1. Fetch live evaluation metrics
res = requests.get(f"{BASE_URL}/api/public/review").json()
print("Selected Model:", res["run"]["selectedModel"])
print("Holdout WAPE:", res["run"]["holdout"]["wape"], "%")

# 2. Print 24-hour forecast
for row in res["run"]["forecast"][:5]:
    print(f"[{row['timestamp']}] Expected: {row['demand_mw']:.1f} MW (P10: {row['p10']:.1f}, P90: {row['p90']:.1f})")

# 3. Test verification endpoint
sample = [
    {"timestamp": "2024-06-17 12:00:00", "demand_mw": 11505.9, "p10": 10839.75, "p90": 12030.43}
]
validation = requests.post(f"{BASE_URL}/api/public/review", json={"sample": sample}).json()
print("Intervals Valid:", validation["checks"]["intervalsOrdered"])
```
