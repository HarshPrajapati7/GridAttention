# ⚡ GridTwin / GridAttention — Live Evaluator & Verification API

> **Official Live Production URL:**  
> 🔗 **[`https://gridattention-2.onrender.com`](https://gridattention-2.onrender.com)**  
> 📖 **Interactive Swagger UI / API Testing:** **[`https://gridattention-2.onrender.com/docs`](https://gridattention-2.onrender.com/docs)**  
> 🩺 **Service Health:** **[`https://gridattention-2.onrender.com/health`](https://gridattention-2.onrender.com/health)**

---

## 🚀 Overview for Mentors & Evaluators

This API service serves our research-grade Day-Ahead Electricity Demand Forecasting models, trained artefacts, holdout metrics, model comparison leaderboards, and interactive sample verification.

- **No Authentication / Zero Friction**: Mentors and evaluators can directly query endpoints using any browser, Postman, `curl`, or Python without API keys or headers.
- **Interactive OpenAPI / Swagger**: Try out all endpoints interactively in the browser at [`https://gridattention-2.onrender.com/docs`](https://gridattention-2.onrender.com/docs).
- **Public CORS Enabled**: Works seamlessly across browsers and frontend clients.

---

## 📌 Primary Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | **`/health`** | Verifies backend uptime and service status | **None** |
| `GET` | **`/api/public/review`** | Full evaluation payload: model leaderboard, holdout errors (WAPE/MAE/RMSE), and 24h demand predictions | **None** |
| `POST` | **`/api/public/review`** | Send a custom forecast batch to validate intervals ($P_{10} \le \hat{y} \le P_{90}$), compute daily MWh, and assess peak demand | **None** |
| `GET` | **`/api/runs`** | Lists available model training runs | **None** |
| `GET` | **`/api/runs/{run_id}/summary`** | Detailed metrics, missing hour count, and benchmark comparisons | **None** |
| `GET` | **`/api/runs/{run_id}/forecast`** | 24-hour hour-by-hour demand forecast and uncertainty bounds | **None** |
| `POST` | **`/api/documents/extract`** | Upload a grid/tariff PDF report to extract text | **None** |

---

## 🧪 How Mentors Can Test the Model

### 1. In the Browser (Fastest)
Open the interactive Swagger UI directly:
👉 **[https://gridattention-2.onrender.com/docs](https://gridattention-2.onrender.com/docs)**
- Click on `GET /api/public/review` → Click **"Try it out"** → Click **"Execute"**.
- Click on `POST /api/public/review` to input custom test data and verify interval ordering.

---

### 2. Using `curl` (Terminal / Command Line)

#### A. Review Model Benchmark & Predictions
```bash
curl -X GET "https://gridattention-2.onrender.com/api/public/review"
```

#### B. Validate a Custom Forecast Dataset
Mentors can post custom predictions to evaluate peak load and uncertainty validity:
```bash
curl -X POST "https://gridattention-2.onrender.com/api/public/review" \
  -H "Content-Type: application/json" \
  -d '{
    "sample": [
      {"timestamp": "2024-06-17 00:00:00", "demand_mw": 12863.46, "p10": 12521.03, "p90": 13190.55},
      {"timestamp": "2024-06-17 01:00:00", "demand_mw": 12364.82, "p10": 12022.40, "p90": 12691.92}
    ]
  }'
```

---

### 3. Using Python

```python
import requests

BASE_URL = "https://gridattention-2.onrender.com"

# 1. Check health
health = requests.get(f"{BASE_URL}/health").json()
print("Health:", health)

# 2. Inspect model leaderboard and 24h forecast
review = requests.get(f"{BASE_URL}/api/public/review").json()
selected_model = review["run"]["selectedModel"]
print(f"Selected Model: {selected_model}")

# Leaderboard of all candidate architectures
print("\nModel Comparison Leaderboard:")
for model in review["run"]["models"]:
    print(f"- {model['name']}: WAPE = {model['wape']}%, MAE = {model['mae']} MW, RMSE = {model['rmse']} MW")

# 3. Test validation endpoint with custom inputs
test_payload = {
    "sample": [
        {"timestamp": "2024-06-17 12:00:00", "demand_mw": 11505.90, "p10": 10839.75, "p90": 12030.43},
        {"timestamp": "2024-06-17 13:00:00", "demand_mw": 11759.02, "p10": 11092.87, "p90": 12283.55}
    ]
}
validation = requests.post(f"{BASE_URL}/api/public/review", json=test_payload).json()
print("\nValidation Result:", validation["checks"])
```

---

## 📊 Summary of Model Performance (Holdout Evaluation)

| Metric | Result | Description |
|---|---|---|
| **Best Model** | **Chronos-2 / CatBoost / PatchTST** | Multi-architecture comparison |
| **Clean WAPE** | **4.43%** | Mean absolute percentage error on clean demand |
| **Clean MAE** | **439.88 MW** | Mean absolute error |
| **Quantiles** | **P10 – P90** | Probabilistic forecast intervals |
| **Temporal Granularity** | Hourly | 24-hour day-ahead horizon |
