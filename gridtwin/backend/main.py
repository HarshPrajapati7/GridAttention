from __future__ import annotations

import csv
import io
import json
import os
import zipfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = ROOT / "GRIDTWIN24_FINAL_OUTPUTS.zip"
RUN_ID = "gridtwin-final-2024-06-17"

app = FastAPI(
    title="Grid Twin API",
    description="Day-ahead electricity-demand forecasts, validation metrics, and PDF text extraction.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        *[origin.strip() for origin in os.getenv("FRONTEND_ORIGINS", "").split(",") if origin.strip()],
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def read_zip_text(name: str) -> str:
    if not OUTPUTS.exists():
        raise HTTPException(status_code=503, detail="Training output archive is not available")
    try:
        with zipfile.ZipFile(OUTPUTS) as archive:
            return archive.read(name).decode("utf-8-sig")
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Artefact not found: {name}") from error


def read_json(name: str) -> dict[str, Any]:
    return json.loads(read_zip_text(name))


def read_csv(name: str) -> list[dict[str, Any]]:
    return list(csv.DictReader(io.StringIO(read_zip_text(name))))


def number(value: Any) -> float:
    return float(value) if value not in (None, "") else 0.0


def summary() -> dict[str, Any]:
    metadata = read_json("run_metadata.json")
    holdout = metadata.get("holdout_quality_metrics", {})
    rows = read_csv("sample_forecast_one_origin.csv")
    leaderboard = read_csv("rolling_cv_leaderboard.csv")
    forecast = [
        {"timestamp": row["timestamp"], "demand_mw": number(row["demand_mw"]), "p10": number(row["p10"]), "p90": number(row["p90"])}
        for row in rows
    ]
    models = [
        {
            "name": row.get("model", "unknown"),
            "wape": round(number(row.get("clean_WAPE_pct") or row.get("mean_WAPE_pct")), 2),
            "mae": round(number(row.get("clean_MAE") or row.get("mean_MAE")), 2),
            "rmse": round(number(row.get("clean_RMSE") or row.get("mean_RMSE")), 2),
            "selected": row.get("model") in {"cat_demand", "lgbm_demand", "cat_context", "patchtst"},
        }
        for row in leaderboard
    ]
    return {
        "id": RUN_ID,
        "forecastDate": metadata.get("forecast_date"),
        "forecastOrigin": metadata.get("forecast_origin"),
        "selectedModel": metadata.get("selected_model"),
        "sourceDataEnd": metadata.get("original_dataset_last_timestamp"),
        "rows": metadata.get("rows"),
        "missingHourSlots": metadata.get("missing_hour_slots"),
        "anomalyCandidates": metadata.get("gross_target_candidate_count"),
        "maskedAnomalies": metadata.get("masked_target_count"),
        "holdout": {
            "n": holdout.get("n", 0),
            "mae": round(number(holdout.get("MAE")), 2),
            "rmse": round(number(holdout.get("RMSE")), 2),
            "wape": round(number(holdout.get("WAPE_pct")), 2),
            "smape": round(number(holdout.get("sMAPE_pct")), 2),
            "intervalCoverage": round(number(metadata.get("holdout_interval_coverage_p10_p90")) * 100, 2),
            "intervalWidth": round(number(metadata.get("holdout_interval_mean_width_mw")), 2),
        },
        "models": models,
        "forecast": forecast,
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "gridtwin-api"}


@app.get("/swagger.json", include_in_schema=False)
def swagger_json() -> dict[str, Any]:
    return app.openapi()


@app.get("/api/runs")
def runs() -> dict[str, list[dict[str, Any]]]:
    data = summary()
    return {"runs": [{key: data[key] for key in ("id", "forecastDate", "selectedModel", "sourceDataEnd")}]}


@app.get("/api/runs/{run_id}/summary")
def run_summary(run_id: str) -> dict[str, Any]:
    if run_id != RUN_ID:
        raise HTTPException(status_code=404, detail="Run not found")
    data = summary()
    data.pop("forecast", None)
    return data


@app.get("/api/runs/{run_id}/forecast")
def run_forecast(run_id: str) -> dict[str, Any]:
    if run_id != RUN_ID:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"runId": RUN_ID, "forecast": summary()["forecast"]}


@app.post("/api/documents/extract")
async def extract_pdf(file: UploadFile = File(...)) -> dict[str, Any]:
    if file.content_type != "application/pdf" and not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF files are supported")
    payload = await file.read()
    if len(payload) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF must be smaller than 25 MB")
    try:
        reader = PdfReader(io.BytesIO(payload))
        text = "\n\n".join((page.extract_text() or "") for page in reader.pages).strip()
    except Exception as error:
        raise HTTPException(status_code=422, detail="Could not extract readable text from this PDF") from error
    return {"filename": file.filename, "pages": len(reader.pages), "text": text[:12000]}
