"use client";

import { useEffect, useState } from "react";
import { BarChart3, CalendarDays, ChevronDown, CircleAlert, Database, Download, FileText, Gauge, LayoutDashboard, LineChart, Menu, Settings2, SlidersHorizontal, Table2, X } from "lucide-react";
import GradientASCII from "@/components/GradientASCII";
import { attachedRun, runNarrative, type ForecastRow } from "@/data/runData";
import { extractPdf, getForecast, getRunSummary } from "@/lib/api";

type View = "Overview" | "Forecast" | "Model quality" | "Data quality" | "Scenario lab";

const navItems: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Forecast", icon: LineChart },
  { label: "Model quality", icon: Gauge },
  { label: "Data quality", icon: Database },
  { label: "Scenario lab", icon: SlidersHorizontal },
];

function EmptyChart() {
  return (
    <div className="chart-empty">
      <div className="empty-inner">
        <BarChart3 className="empty-icon" strokeWidth={1.4} />
        <strong>Forecast artefact not loaded</strong>
        <p>Connect a training run to render the 24-hour demand forecast and its calibrated interval.</p>
      </div>
    </div>
  );
}

function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="card kpi"><div className="kpi-label">{label}</div><div className={`kpi-value ${value.startsWith("Not") ? "na" : ""}`}>{value}</div><div className="kpi-detail">{detail}</div></article>;
}

const formatMw = (value: number) => `${Math.round(value).toLocaleString()} MW`;
const formatPct = (value: number) => `${value.toFixed(2)}%`;

export default function Home() {
  const [view, setView] = useState<View>("Overview");
  const [drawer, setDrawer] = useState(false);
  const [started, setStarted] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState("");
  const [pdfStatus, setPdfStatus] = useState("");
  const [activeRun, setActiveRun] = useState(attachedRun);
  const [apiStatus, setApiStatus] = useState("Bundled run");

  useEffect(() => {
    if (!started) return;
    Promise.all([getRunSummary(attachedRun.id), getForecast(attachedRun.id)]).then(([summary, forecast]) => {
      setActiveRun({ ...attachedRun, ...summary, forecast: forecast.forecast });
      setApiStatus("FastAPI connected");
    }).catch(() => setApiStatus("Offline fallback"));
  }, [started]);

  if (!started) return <Landing uploadedPdf={uploadedPdf} pdfText={pdfText} pdfStatus={pdfStatus} onUpload={async (file) => { setUploadedPdf(file); setPdfText(""); setPdfStatus("Reading PDF text..."); try { const result = await extractPdf(file); setPdfText(result.text); setPdfStatus(`Read ${result.pages} page${result.pages === 1 ? "" : "s"} via FastAPI`); } catch { try { const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs"); pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"; const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise; const pages: string[] = []; for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) { const page = await document.getPage(pageNumber); const content = await page.getTextContent(); pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" ")); } setPdfText(pages.join("\n\n").trim().slice(0, 12000)); setPdfStatus(`Read ${document.numPages} page${document.numPages === 1 ? "" : "s"} locally`); } catch { setPdfStatus("Could not extract readable text from this PDF."); } } }} onStart={() => setStarted(true)} />;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">GRID TWIN</div><div className="brand-note">Day-ahead energy intelligence</div></div>
        <div className="nav-label">Workspace</div>
        <nav className="nav" aria-label="Primary navigation">
          {navItems.map(({ label, icon: Icon }) => <button key={label} className={view === label ? "active" : ""} onClick={() => setView(label)}><Icon className="nav-icon" strokeWidth={1.8} />{label}</button>)}
        </nav>
        <div className="side-bottom"><div className="nav-label">Run context</div><div className="run-mini"><div className="eyebrow">Selected run</div><p>Awaiting artefacts</p></div></div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">Grid Twin <span>/</span> {view}</div>
          <div className="top-controls">
            <select className="select" aria-label="Training run"><option>Run selection unavailable</option></select>
            <select className="select" aria-label="Forecast date"><option>Forecast date unavailable</option></select>
            <div className={`status ${uploadedPdf ? "status-ready" : ""}`}><span className="dot" /> {uploadedPdf ? "PDF ready to review" : apiStatus}</div>
          </div>
        </header>

        <div className="content">
          {view === "Overview" ? <Overview run={activeRun} onOpenDrawer={() => setDrawer(true)} /> : <SecondaryView view={view} />}
        </div>
      </main>
      {drawer && <div className="drawer-backdrop" onClick={() => setDrawer(false)}><aside className="drawer" onClick={(event) => event.stopPropagation()}><div className="panel-head"><div><div className="eyebrow">Run details</div><h2 className="panel-title">{activeRun.id}</h2></div><button className="icon-btn" aria-label="Close run details" onClick={() => setDrawer(false)}><X size={18} /></button></div><div className="notice"><CircleAlert size={16} />Data is served by FastAPI when the backend is available; the bundled archive remains the fallback.</div><div className="detail-list drawer-list"><Detail label="Uploaded PDF" value={uploadedPdf?.name ?? "Not included"} /><Detail label="Forecast origin" value={activeRun.forecastOrigin} /><Detail label="Selected model" value={activeRun.selectedModel} /><Detail label="Source data end" value={activeRun.sourceDataEnd} /></div><button className="btn primary drawer-action"><Download size={15} /> Import run artefacts</button></aside></div>}
    </div>
  );
}

function Landing({ uploadedPdf, pdfText, pdfStatus, onUpload, onStart }: { uploadedPdf: File | null; pdfText: string; pdfStatus: string; onUpload: (file: File) => void | Promise<void>; onStart: () => void }) {
  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (file.type !== "application/pdf") {
      window.alert("Please choose a PDF file.");
      event.target.value = "";
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      window.alert("PDF files must be smaller than 25 MB.");
      event.target.value = "";
      return;
    }
    void onUpload(file);
  };

  return <main className="landing">
    <GradientASCII
      colors={["#1e3fd8", "#f6f8ff", "#a5d8ff", "#38bdf8"]}
      shape="horizon"
      characters=" =+xX0S8#@"
      cellSize={18}
      density={0.8}
      glyphOpacity={0.85}
      glow={0.2}
      depthOfField={0}
      flicker={0.2}
      softness={0.5}
      scale={1}
      flow={0.5}
      speed={1}
      gradientOpacity={0.9}
      grain={0.08}
      variation={0}
      mouseInteraction
      scrambleRadius={0.1}
      clickEffect="wave"
      intro
      lightMode={false}
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
    />
    <div className="ascii-fallback" aria-hidden="true">SSSSSS 888888 ###### @@@@@@ ###### 888888 SSSSSS
  SSSS 8888#### @@@@@@@@@@@@@@@@ ####8888 SSSS
 SSS 888### @@@@################@@@@ ###888 SSS
SS 88## @@@########################@@@ ##88 SS
 88##@@@##########  0000  ##########@@@##88
88#@@@########  00000000000000  #######@@@#88
8#@@@###### 00000000000000000000 ######@@@#8
##@@@### 00000000000000000000000000 ###@@@##
###@@ 00000000000000000000000000000000 @@###
##@@ 0000000000000000000000000000000000 @@##
###@@ 00000000000000000000000000000000 @@###
##@@@### 00000000000000000000000000 ###@@@##
8#@@@###### 00000000000000000000 ######@@@#8
88#@@@########  00000000000000  #######@@@#88
 88##@@@##########  0000  ##########@@@##88
  SS 88## @@@########################@@@ ##88 SS</div>
    <div className="landing-wash" />
    <nav className="landing-nav"><div className="landing-brand">GRID TWIN</div><div className="landing-nav-note">Day-ahead energy intelligence</div></nav>
    <section className="landing-content"><p className="landing-kicker">Day-ahead electricity intelligence</p><h1>Know the next<br />24 hours.</h1><p className="landing-copy">Grid Twin turns hourly demand history into a clear, auditable forecast for the people who operate the grid.</p><div className="landing-actions"><label className="upload-button"><FileText size={17} /> {uploadedPdf ? "Replace PDF" : "Upload PDF"}<input type="file" accept="application/pdf,.pdf" onChange={handleUpload} /></label><button className="start-button" onClick={onStart}>Get started <span aria-hidden="true">&#8594;</span></button></div>{uploadedPdf && <p className="upload-confirmation"><span className="upload-dot" /> {uploadedPdf.name} · {pdfStatus}</p>}{pdfText && <article className="pdf-text-panel"><div className="pdf-text-heading"><FileText size={15} /> Extracted PDF text</div><pre>{pdfText}</pre></article>}</section>
    <div className="landing-footer"><span>GRID TWIN</span><span>Forecasting workspace</span></div>
  </main>;
}

function Overview({ run, onOpenDrawer }: { run: typeof attachedRun; onOpenDrawer: () => void }) {
  return <>
    <section className="page-head"><div><div className="eyebrow">Attached training run · {run.forecastDate}</div><h1>Overview</h1><p className="subhead">A live read from the exported Grid Twin forecast and validation artefacts.</p></div><div className="actions"><button className="btn"><Download size={15} /> Download forecast CSV</button><button className="btn primary" onClick={onOpenDrawer}><FileText size={15} /> View run details</button></div></section>
    <div className="notice" style={{ marginBottom: 18 }}><CircleAlert size={16} /> {runNarrative}</div>
    <section className="kpis"><Kpi label="Forecast peak" value={formatMw(Math.max(...run.forecast.map((row) => row.demand_mw)))} detail="21:00 · P10-P90 11,957-13,392 MW" /><Kpi label="Forecast daily energy" value={formatMw(run.forecast.reduce((sum, row) => sum + row.demand_mw, 0))} detail="Sum across 24 one-hour intervals" /><Kpi label="Historical holdout WAPE" value={formatPct(run.holdout.wape)} detail={`${run.holdout.n} untouched holdout observations`} /><Kpi label="P10-P90 coverage" value={formatPct(run.holdout.intervalCoverage)} detail={`Mean interval width ${formatMw(run.holdout.intervalWidth)}`} /></section>
    <section className="grid-main"><article className="card panel"><div className="panel-head"><div><h2 className="panel-title">Next 24 hours</h2><p className="panel-note">Operational forecast · MW · {run.forecastDate}</p></div><button className="btn"><Download size={14} /> Download chart</button></div><ForecastBars rows={run.forecast} /><div className="footer-note">24 hourly forecast · interval from exported P10-P90 calibration</div></article><div className="stack"><article className="card panel"><div className="panel-head"><div><h2 className="panel-title">Peak window</h2><p className="panel-note">Summary of the predicted peak</p></div></div><div className="detail-list"><Detail label="Peak hour" value="21:00" /><Detail label="Peak value" value={formatMw(12614.6)} /><Detail label="Interval" value="11,957-13,392 MW" /><Detail label="Context" value={`Forecast day ${run.forecastDate}`} /></div></article><article className="card panel"><div className="panel-head"><div><h2 className="panel-title">Run health</h2><p className="panel-note">Provenance for this view</p></div></div><div className="detail-list"><Detail label="Selected model" value="Ensemble" /><Detail label="Forecast origin" value={run.forecastOrigin} /><Detail label="Data through" value={run.sourceDataEnd} /></div></article></div></section>
    <section className="lower-grid"><article className="card panel"><div className="panel-head"><div><h2 className="panel-title">Model leaderboard</h2><p className="panel-note">Rolling-CV selection metrics</p></div><button className="btn">Open full view <ChevronDown size={14} /></button></div><div className="table-wrap"><table><thead><tr><th>Model</th><th>WAPE</th><th>MAE</th><th>RMSE</th></tr></thead><tbody>{run.models.slice(0, 5).map((model) => <tr key={model.name}><td>{model.name}{model.selected ? " · selected" : ""}</td><td>{formatPct(model.wape)}</td><td>{formatMw(model.mae)}</td><td>{formatMw(model.rmse)}</td></tr>)}</tbody></table></div></article><article className="card panel"><div className="panel-head"><div><h2 className="panel-title">Hourly forecast</h2><p className="panel-note">Exact rows from the attached submission file</p></div><button className="btn"><Table2 size={14} /> Forecast</button></div><div className="table-wrap"><table><thead><tr><th>Hour</th><th>Forecast MW</th><th>P10</th><th>P90</th></tr></thead><tbody>{run.forecast.slice(0, 8).map((row) => <tr key={row.timestamp}><td>{row.timestamp.slice(11, 16)}</td><td>{formatMw(row.demand_mw)}</td><td>{formatMw(row.p10)}</td><td>{formatMw(row.p90)}</td></tr>)}</tbody></table></div></article></section>
  </>;
}

function ForecastBars({ rows }: { rows: ForecastRow[] }) {
  const max = Math.max(...rows.map((row) => row.p90));
  return <div className="forecast-bars" aria-label="24-hour forecast bar chart">{rows.map((row) => <div className="forecast-bar-wrap" key={row.timestamp} title={`${row.timestamp}: ${formatMw(row.demand_mw)} (${formatMw(row.p10)}-${formatMw(row.p90)})`}><div className="forecast-bar" style={{ height: `${Math.max(10, (row.demand_mw / max) * 100)}%` }} /><span>{row.timestamp.slice(11, 13)}</span></div>)}</div>;
}

function SecondaryView({ view }: { view: View }) {
  const descriptions: Record<Exclude<View, "Overview">, string> = { Forecast: "Inspect the full 24-hour forecast, interval bounds, and exact exported rows.", "Model quality": "Compare rolling cross-validation selection metrics with untouched holdout performance.", "Data quality": "Review missing periods, anomalies, and predictor availability from the run audit.", "Scenario lab": "Explore explicit asset assumptions without confusing simulation results with measured grid intervention." };
  const description = descriptions[view as Exclude<View, "Overview">];
  return <><section className="page-head"><div><div className="eyebrow">Grid Twin workspace</div><h1>{view}</h1><p className="subhead">{description}</p></div><div className="actions"><button className="btn" disabled><Download size={15} /> Export</button><button className="btn primary"><CalendarDays size={15} /> Run context</button></div></section><div className="page-tabs"><button className="tab active">Summary</button><button className="tab">Artefacts</button><button className="tab">Definitions</button></div><article className="card panel"><div className="notice"><CircleAlert size={16} /> This screen is ready for validated training-run artefacts. It will never display invented metrics or placeholder forecast values.</div><div style={{ padding: "44px 12px", textAlign: "center" }}><Settings2 size={34} color="#7ca69e" strokeWidth={1.4} /><h2 className="panel-title" style={{ marginTop: 16 }}>No data available yet</h2><p className="panel-note">Import a completed run to populate {view.toLowerCase()}.</p></div></article></>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="detail-row"><span className="detail-label">{label}</span><strong className="detail-value">{value}</strong></div>; }
