import type { attachedRun } from "@/data/runData";

type RunSummary = Omit<typeof attachedRun, "forecast">;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { Accept: "application/json", ...init?.headers } });
  if (!response.ok) throw new Error(`Grid Twin API returned ${response.status}`);
  return response.json() as Promise<T>;
}

export function getRunSummary(runId: string) {
  return request<RunSummary>(`/api/runs/${runId}/summary`);
}

export function getForecast(runId: string) {
  return request<{ runId: string; forecast: typeof attachedRun.forecast }>(`/api/runs/${runId}/forecast`);
}

export async function extractPdf(file: File) {
  const body = new FormData();
  body.append("file", file);
  return request<{ filename: string; pages: number; text: string }>("/api/documents/extract", { method: "POST", body, headers: {} });
}
