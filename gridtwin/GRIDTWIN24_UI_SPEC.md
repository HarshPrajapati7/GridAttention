# GRIDTWIN-24 — Product UI & Implementation Specification

**Document type:** Frontend implementation brief  
**Product:** GRIDTWIN-24  
**Primary workflow:** Day-ahead electricity-demand analysis  
**UI system:** Astryx (`@astryxdesign/core`)  
**Charts:** Apache ECharts with a React wrapper  
**Target stack:** React 19+, Next.js App Router, TypeScript, FastAPI backend  
**Status:** Implementation specification; UI must use real training-run artefacts, not invented demo metrics.

---

## 0. Product intent

Build a serious energy-operations interface for analysing a 24-hour electricity-demand forecast. It should feel like a focused tool used by an energy analyst or grid-operations engineer—not a generic AI dashboard, marketing landing page, crypto terminal, or template assembled from random cards.

The UI is a presentation and interaction layer over the GRIDTWIN-24 forecasting pipeline. The source of truth is the selected training run and its exported files. The interface must never invent forecasts, accuracy scores, savings, model names, dates, or data-quality counts.

### Product sentence

**GRIDTWIN-24 turns hourly grid-demand history into an auditable day-ahead forecast, model-quality report, and clearly scoped energy scenarios.**

### Core user questions

1. What is the expected demand for each of the next 24 hours?
2. When is the forecast peak, and what is its predicted magnitude?
3. How wide is the uncertainty range, and how reliable was that range on historical holdout data?
4. Which model was selected, and how did it compare with seasonal baselines and other candidates?
5. Where does the model make its largest errors—especially by forecast horizon and daily peak?
6. Are there anomalies, missing periods, or late-appearing variables that limit trust in the data?
7. What happens under a clearly defined, illustrative flexibility / PV / battery scenario?

### Explicit non-goals

- Do not present a grid-level demand forecast as an individual household forecast.
- Do not claim that a simulated battery or shifted load changed the real national grid.
- Do not claim actual bill savings unless tariff, asset, and metering inputs support the calculation.
- Do not expose future target values or hidden evaluation dates before the forecast origin.
- Do not label WAPE or interval coverage as generic “accuracy”.
- Do not claim that Gemma makes the forecast. The forecasting model produces the numbers; Gemma only calls approved tools and explains returned results.
- Do not add a live map, 3D globe, animated power lines, weather widget, stock photo, decorative chatbot, fake system telemetry, or placeholder KPI merely to fill space.

---

## 1. Dataset and model artefact contract

### 1.1 Dataset fields known from the public repository README

The P2 dataset currently documents these columns:

- `timestamp`
- `generation_mw`
- `demand_mw` — target
- `load_shedding`
- `gas`
- `liquid_fuel`
- `coal`
- `hydro`
- `solar`
- `wind`
- `india_bheramara_hvdc`
- `india_tripura`
- `india_adani`
- `nepal`

The README describes 79,283 hourly rows spanning 2015-04-19 00:00 through 2024-06-16 23:00 and warns about missing hours, typo-like spikes (including a 121,000 MW value), and import columns that begin partway through the record. Treat these as repository documentation, not as a substitute for the run's own audit.

Repository: <https://github.com/CodewithJha/hack-day-lucknow-datasets/tree/main/p2-grid-demand-forecast>

### 1.2 Current Colab output artefacts

The research notebook writes to `/content/gridtwin24_outputs/` and currently exports:

| File | UI use | Expected important fields |
|---|---|---|
| `sample_forecast_one_origin.csv` | Next-day forecast table and forecast chart | `timestamp`, `demand_mw`, `p10`, `p90` — exactly 24 rows |
| `run_metadata.json` | Run summary, selected model weights, CV and holdout metrics, data-range metadata | `forecast_date`, `forecast_origin`, `selected_models`, `cv_metrics`, `holdout_metrics`, `holdout_interval_coverage_80`, `holdout_mean_interval_width_mw`, `rows_raw`, `full_hour_slots`, `missing_hour_slots`, `first_timestamp`, `last_timestamp` |
| `rolling_cv_leaderboard.csv` | Cross-validation leaderboard | `model`, `mean_MAE`, `mean_RMSE`, `mean_WAPE_pct`, `mean_sMAPE_pct`, `total_scored` (confirm actual exported index/header when loading) |
| `oof_leaderboard.csv` | Pooled out-of-fold model comparison | `model` and forecast metrics, including MAE/RMSE/WAPE/sMAPE |
| `rolling_cv_predictions.csv` | Validation diagnostic charts | `origin_ts`, `target_ts`, `horizon`, `y`, `model`, `y_pred` |
| `final_holdout_predictions.csv` | Untouched chronological holdout analysis | `origin_ts`, `target_ts`, `horizon`, `y`, `y_pred`, `p10`, `p90` |
| `horizon_error_report.csv` | Error by forecast horizon (1–24) | `horizon`, MAE/RMSE/WAPE/sMAPE fields |
| `daily_peak_energy_report.csv` | Daily peak and daily energy error analysis | `actual_daily_energy`, `pred_daily_energy`, `actual_peak`, `pred_peak`, `energy_abs_error`, `peak_abs_error` |
| `data_anomaly_audit.csv` | Inspect flagged anomaly candidates | timestamp/index and available anomaly/audit fields |

**Do not assume any file has rows.** Validate the schema and row count at import time. The CSV leaderboard may contain an exported index column; normalise it in the adapter and preserve the original source file unchanged.

### 1.3 Recommended additional exports from the notebook

If the UI needs an exhaustive audit, add these explicit exports to the training notebook rather than trying to infer them from a small anomaly CSV:

- `data_quality_summary.json`: duplicate timestamp count, conflicting duplicate count, missing-hour count, longest gap, negative target count, zero/non-positive target count, extreme-spike candidate count, numeric coercion count, first/last timestamp, row count before/after cleaning.
- `feature_availability.csv`: each predictor, first valid timestamp, last valid timestamp, missing percentage, and whether it is allowed for origin-time forecasting.
- `model_manifest.json`: model name, exact hyperparameters, features, training cut-off, package versions, seed, run id, and model artifact paths where persisted.
- `cleaned_history_hourly.parquet` (optional): cleaned historical series for plotting; preserve missing targets as missing and include quality flags. Do not interpolate target labels merely to make a chart continuous.
- `feature_importance.csv` or `explanations.json` (optional): only if the selected model has valid, reproducibly computed explanations.

The UI must gracefully report “Not included in this run” for an optional file. It must not display fabricated zeroes.

### 1.4 Forecast-date and hidden-date rules

- The forecast date is chosen from `run_metadata.json` or the explicit run selection, not from the browser's current date.
- A forecast origin is the final available observation before the forecast date (the notebook defines it as forecast day minus one hour).
- Never use observed values after the selected forecast origin as input to the forecast.
- In an operational forecast view, actual values for future target timestamps do not exist yet. Show forecast and interval only.
- In historical validation mode, actual values are available and can be shown alongside predictions.
- Never mix operational future forecasts and historical holdout rows in one chart without clear labels.

---

## 2. Astryx design-system audit and implementation rules

### 2.1 What Astryx is

Astryx is an open-source React design system from Meta. Its published overview describes 180+ accessible, themeable components, templates, dark mode and a CLI; the technical overview describes precompiled CSS, typed React components, React 19+ and StyleX. It is currently in beta. Use the component library as the structural foundation rather than imitating its visual style with ad hoc divs.

Official sources:

- Home: <https://astryx.atmeta.com/>
- Component catalogue: <https://astryx.atmeta.com/components>
- Core package README: <https://github.com/meta/astryx/blob/main/packages/core/README.md>
- Layout guidance: <https://astryx.atmeta.com/docs/layout>
- Styling setup: <https://astryx.atmeta.com/docs/styling-overview>
- Theme guidance: <https://astryx.atmeta.com/docs/theme>

### 2.2 Important library finding: charts

The current public Astryx component catalogue includes layout, navigation, cards, actions, forms, overlays, status, tables and lists. It does **not** list a native chart/data-visualisation component. Do not invent imports such as `AstryxChart`, `LineChart` or `AreaChart` from `@astryxdesign/core`.

Use Astryx for the complete application frame and every surrounding UI element. Use **Apache ECharts** for actual data visualisations, wrapped in React. This is a deliberate, narrow exception because charts are a specialist visual layer, and ECharts supports line/area/bar/heatmap visualisations, interactive tooltips, zoom and export. Use `echarts-for-react` with tree-shaking where practical, or the documented React ECharts wrapper already approved by the project.

References:

- Astryx component catalogue: <https://astryx.atmeta.com/components>
- Apache ECharts: <https://echarts.apache.org/en/option.html>
- ECharts area chart: <https://apache.github.io/echarts-handbook/en/how-to/chart-types/line/area-line/>
- React wrapper: <https://github.com/hustcc/echarts-for-react>

### 2.3 Installation and version discipline

Use React 19 or later. Start with:

```bash
npm install @astryxdesign/core @astryxdesign/theme-neutral @stylexjs/stylex
npm install echarts echarts-for-react
npm install lucide-react
npm install -D @astryxdesign/cli
npx astryx init
```

The `npx astryx init` command is valid after the scoped CLI is installed as a dev dependency. For a one-shot call without installing it, use `npx @astryxdesign/cli <command>`.

Use the plain-CSS path unless the existing project already uses Tailwind v4. Add to the global stylesheet:

```css
@import "@astryxdesign/core/reset.css";
@import "@astryxdesign/core/astryx.css";
@import "@astryxdesign/theme-neutral/theme.css";
```

Do not add a StyleX compiler merely to consume Astryx's precompiled components. Add a compiler only if the implementation deliberately swizzles Astryx source or writes custom StyleX. Do not introduce Tailwind just for this screen.

### 2.4 Required CLI discovery before coding

Astryx is evolving in beta. Before implementation, the coding agent must inspect the installed package instead of guessing component props:

```bash
npx @astryxdesign/cli component --list
npx @astryxdesign/cli component AppShell
npx @astryxdesign/cli component SideNav
npx @astryxdesign/cli component Card
npx @astryxdesign/cli component Button
npx @astryxdesign/cli component Table
npx @astryxdesign/cli component TabList
npx @astryxdesign/cli component Selector
npx @astryxdesign/cli component DateRangeInput
npx @astryxdesign/cli component Banner
npx @astryxdesign/cli component Drawer
npx @astryxdesign/cli component Tooltip
npx @astryxdesign/cli template --list
npx astryx template dashboard --help
npx @astryxdesign/cli doctor
```

Use only components that appear in the installed version's component index. If a name or prop differs, follow the local CLI documentation. Do not copy an old example from a different Astryx version.

### 2.5 Astryx components to use

| UI responsibility | Astryx component/pattern |
|---|---|
| App frame | `AppShell` |
| Primary navigation | `SideNav` |
| Page composition | `Layout`, `LayoutContent`, `Section`, `Stack` (verify exact exports via CLI) |
| Page tabs | `TabList` |
| KPI and chart containers | `Card` or `Section`; don't wrap every individual text item in a Card |
| Primary/secondary actions | `Button`, `IconButton`, `ButtonGroup` |
| Status labels | `Badge`, `StatusDot`, `Banner` |
| Tables | `Table`, `Pagination` |
| Filters | `Selector`, `DateInput`, `DateRangeInput`, `Switch`, `CheckboxInput`, `Slider`, `Field` |
| Details / row inspector | `Drawer` |
| Confirm destructive/reset actions | `AlertDialog` or `Dialog` (verify installed component) |
| Help and small explanations | `Tooltip`, `Popover` |
| Feedback | `Toast`, `Banner`, `Skeleton`, `Spinner`, `EmptyState` |
| Icons | Astryx `Icon` if its installed registry has the requested icon; otherwise use `lucide-react` consistently |

Use the Astryx layout guidance: define the shell and width budgets first, then place the content. Suggested desktop budgets: SideNav 248 px; top bar 60–64 px; main content max width 1,520 px; right-side detail drawer 380 px. Charts and tables should fill the content area. Avoid a narrow central column on a wide monitor.

### 2.6 Theme and visual identity

Use Astryx Neutral as the foundation, with a restrained GRIDTWIN identity:

- Main surfaces: warm/neutral off-white and white.
- Main text: near-black charcoal.
- Accent: restrained deep teal or blue-green for primary actions and selected states.
- Forecast: blue/teal.
- Actual: dark charcoal / neutral.
- Prediction interval: translucent cool blue/teal band.
- Warnings/anomalies: amber.
- Errors: red, reserved for genuine failures or invalid data.
- Success/healthy state: green, used only when evidence supports it.

If a custom theme is needed, extend the Neutral theme rather than replacing every token. Define semantic tokens and let Astryx handle component states. Chart series colours should map to the same semantic palette.

Typography should be compact and editorial: a clear page title, modest section headings, readable labels and tabular numerals for MW/MWh/percentages. Do not use oversized hero text inside the operational application.

Avoid:

- neon gradients, glowing outlines and glassmorphism;
- gradients behind every KPI;
- arbitrary rounded pill shapes everywhere;
- emoji in navigation or data labels;
- excessive animation or moving background graphics;
- huge empty whitespace used to mimic a landing page;
- generic AI sparkle icons on every panel;
- random connected/disconnected indicators without a real status source.

Default to light mode for analytical readability. Offer dark mode only if fully supported by Astryx theme mode and tested chart colours; do not build a separate hand-coded dark theme that diverges from Astryx tokens.

---

## 3. Application information architecture

Use a persistent left navigation with six destinations. Do not add a destination unless it has a real screen and working data.

1. **Overview** — day-ahead forecast summary and operational snapshot.
2. **Forecast** — detailed 24-hour demand forecast and hourly table.
3. **Model quality** — validation leaderboard, holdout performance and horizon errors.
4. **Data quality** — dataset health, suspicious values, missing hours and predictor availability.
5. **Energy mix** — generation/fuel/import context; visible only when valid historical series are available.
6. **Scenario lab** — clearly labelled, assumption-driven flexibility / PV / battery simulations.

A small utility section at the bottom may include **Runs & artefacts** and **Settings** if those pages are implemented. Do not add “AI Lab”, “Insights”, “Reports”, “Notifications”, “Live Grid”, or “Integrations” unless there is actual functionality behind them.

### Global shell

- Left: GRIDTWIN-24 wordmark (text, not a large logo illustration), a small “Day-ahead energy intelligence” descriptor, grouped navigation.
- Top bar: current page title/breadcrumb, run selector, forecast date selector, dataset freshness badge, theme toggle if implemented, user/menu only if authentication exists.
- Main content: one clear page heading, concise contextual subtext only when it adds information, controls aligned to the right of the heading.
- Do not place a second giant hero or marketing statement inside the application.

Global context state:

```ts
type AppContext = {
  selectedRunId: string | null;
  selectedForecastDate: string | null; // YYYY-MM-DD
  viewMode: "operational_forecast" | "historical_validation";
  themeMode: "light" | "dark" | "system";
};
```

Changing `selectedRunId` must reload every view consistently. Do not let the overview show metrics from one run while the forecast page shows another.

---

## 4. Screen-by-screen design and behaviour

## 4.1 Overview

Purpose: provide the operator with the key facts in one view, without requiring them to inspect every page.

### Header row

- Title: `Overview`
- Context label: selected run and forecast date (for example, `Forecast for 2024-06-17`, only when that date is actually in the selected run metadata).
- Actions: `Download forecast CSV` (only when the 24-row submission exists), `View run details` (opens drawer).
- Data status: `Data through [last_timestamp]`, sourced from metadata. Never substitute the machine's current time.

### KPI strip (4 items maximum)

1. **Forecast peak** — max of the 24 `demand_mw` values; show MW and the timestamp. Use `p10`/`p90` at the peak hour as a secondary line if available.
2. **Forecast daily energy** — sum of hourly MW values multiplied by one hour, displayed as MWh. State this is an integral/sum over the 24 one-hour intervals.
3. **Holdout WAPE** — from `holdout_metrics.WAPE_pct`; label explicitly `Historical holdout WAPE`, not “accuracy”.
4. **80% interval coverage** — from `holdout_interval_coverage_80`, formatted as a percentage, with an info tooltip explaining empirical coverage on the historical holdout. Do not call it calibrated unless coverage is measured and appropriate.

If a metric is missing, render `Not available for this run`, not `0`, `100%`, or a fabricated placeholder.

### Main chart: next 24 hours

Use ECharts line + area band:

- X-axis: timestamp formatted in local dataset time, `HH:mm` with date in tooltip.
- Main series: `demand_mw` forecast.
- Interval band: `p10` to `p90`, rendered as a subtle translucent area. Do not render two prominent competing lines unless the user toggles `Show interval bounds`.
- If actual values are available for the selected historical evaluation window, show actual as a distinct line and label the view `Historical validation`.
- In operational forecast mode, never invent an actual line.
- Mark the predicted peak with a subtle marker and tooltip.
- Tooltip includes timestamp, forecast MW, p10, p90 and actual only when actually available.
- Add a small chart footer: `24 hourly forecast · MW · interval from historical residual calibration` only if the interval method is present in the run.
- Provide one `Download chart` action with PNG export if chart instance supports it.

### Right rail / supporting panel

`Peak window` with the predicted peak hour, value, interval and adjacent two-hour context. It is a summary of the forecast—not a “risk score”.

`Run health` with:
- run ID or timestamp from the run manifest;
- selected model(s) and blend weights;
- forecast origin;
- source data end timestamp.

### Lower section

Two-column layout:

- Left: compact model leaderboard (top 3 by CV WAPE, with MAE and RMSE columns); link to full Model Quality page.
- Right: a 24-row hourly table preview (first/next rows depending viewport) with `Hour`, `Forecast MW`, `P10`, `P90`; link to Forecast page.

Do not show a fuel-mix chart on Overview unless the data has passed the source-column validity checks. Prefer one lead chart over multiple miniature charts.

## 4.2 Forecast

Purpose: inspect the full 24-hour forecast precisely.

Controls:
- Forecast date selector (limited to dates the current run can support).
- Model selector only if forecasts for several models were actually exported for that origin; otherwise show the selected ensemble/model from metadata.
- Toggle `Show prediction interval`.
- Toggle `Show historical context` only if a cleaned history series is available.
- `Download CSV` exports the exact table shown.

Visuals:
- Large 24-hour line chart with interval band.
- Optional hourly heat strip beneath chart with 24 cells coloured by relative predicted load; tooltip always gives exact MW.
- A compact table with all 24 rows, sortable by time/value and accessible without chart hover.
- Table columns: timestamp, horizon (1–24), forecast MW, p10 MW, p90 MW, actual MW only for a completed historical evaluation date.

Interactions:
- Clicking an hourly row highlights the corresponding chart point.
- Clicking a chart point selects/highlights the row.
- Table sorting must preserve the timestamp in the exported data; don't reorder the forecast submission CSV itself.
- `Copy forecast JSON` only if implemented and should copy the visible forecast records, not a fake success message.

## 4.3 Model quality

Purpose: show whether the model generalises and where it fails.

### Summary metrics

- Historical holdout MAE (MW)
- Historical holdout RMSE (MW)
- Historical holdout WAPE (%)
- Historical 80% interval coverage (%)
- Mean interval width (MW)

Definitions must be accessible through tooltips:

- MAE: average absolute error in MW.
- RMSE: square root of mean squared error in MW; penalises larger errors more heavily.
- WAPE: sum of absolute errors divided by sum of absolute actual demand, expressed as a percentage. Do not call it `accuracy`.
- sMAPE: symmetric percentage error, with its implementation documented.
- Interval coverage: fraction of actual holdout observations that fell inside the stated interval.
- Interval width: average p90−p10 span in MW. Coverage and width must be interpreted together.

### Model leaderboard

Use Astryx Table, not custom hand-built table markup.

Columns:
- rank by mean rolling-CV WAPE;
- model;
- mean WAPE (%);
- mean MAE (MW);
- mean RMSE (MW);
- total scored observations;
- selected (only the ensemble constituents/selected model identified in run metadata).

Do not create a synthetic rank or use star ratings. Add a small explanatory note: rolling-CV metrics are selection metrics; final holdout metrics are reported separately.

### Charts

1. **Error by forecast horizon:** line chart with horizon 1–24 and MAE (MW); optional second series for WAPE only if axes are handled clearly. Default to MAE alone.
2. **Daily peak error:** actual vs predicted peak by holdout origin date, or absolute peak error. Choose one clear view.
3. **Daily energy error:** actual vs predicted daily energy by origin date, or absolute energy error.
4. **Residual distribution:** histogram or box plot only when the source holdout predictions are loaded.

Interactions:
- Selecting a model in the leaderboard filters/updates its fold metrics if fold-level rows exist.
- Clicking a horizon point displays error statistics for that horizon.
- Provide CSV export of leaderboard and holdout predictions.

Do not present training-set score as the primary score. Do not hide poor horizons by averaging all 24 together.

## 4.4 Data quality

Purpose: let a reviewer understand what was cleaned and what remains uncertain.

### Dataset overview

Show from `run_metadata.json` and/or `data_quality_summary.json` only:
- raw rows;
- expected full hourly slots;
- missing hourly slots;
- start/end timestamps;
- anomaly candidate count;
- duplicate timestamps and conflicting duplicates if exported;
- numeric coercions if exported.

### Data quality charts/tables

- Missing-hour timeline (if a detailed missing-hour series is exported).
- Predictor availability matrix showing each feature's first and last valid timestamps and missing fraction.
- Anomaly review table showing timestamp, column, observed value, flag/reason, and action taken if available.
- Feature availability timeline to make late-starting import variables obvious.

### Critical rules

- A 121,000 MW typo must appear as a flagged candidate, not silently become a real peak.
- Do not delete every large value automatically. Make the audit reason inspectable and retain original values in the source record.
- Do not use future generation, fuel, import or load-shedding values as day-ahead predictors unless they are explicitly available at the forecast origin. The current modelling notebook uses past-only values; the UI should surface this methodology from the run manifest.
- Missing target values must remain missing in diagnostic plots. Never draw an apparently continuous line across an unobserved target interval.
- If no `data_quality_summary.json` exists, show the fields actually available from `run_metadata.json` and a neutral notice that the detailed audit was not exported. Do not make up duplicate counts or exact anomaly counts.

## 4.5 Energy mix

This page is conditional. Only show it when a valid cleaned historical series with source columns is available.

Possible elements:
- Stacked area chart for generation sources: coal, gas, liquid fuel, hydro, solar, wind.
- Import time-series chart: Bangladesh HVDC, Tripura, Adani, Nepal, only after verifying the column semantics and availability windows.
- Demand vs total generation comparison, only if units, coverage and accounting conventions are coherent.
- Load-shedding series if its data type and semantics have been verified.

Do not use source contributions from incomplete periods to create a misleading 100% stacked chart. Do not assume that `generation_mw` equals demand plus every listed import without confirming the dataset's accounting. Add source completeness and time-window notes.

If no cleaned source-series artefact is available, hide the nav item or show a genuine empty state explaining that this run exported forecasting artefacts only. Do not display a blank chart frame.

## 4.6 Scenario lab

Purpose: explore clearly specified what-if assumptions without confusing a simulation with a real grid intervention.

### Critical scope separation

The organisers' dataset is a grid-level demand series. A grid-level forecast alone does not provide a building's controllable load profile, local PV output, battery status, tariff or operational constraints.

Therefore, the first scenario module must be labelled:

**Illustrative asset / portfolio simulation — not a measured grid intervention.**

Only allow meaningful scenario calculations when the user provides or selects an explicit asset/load profile and assumptions. If those inputs are absent, show an actionable empty state asking for the required profile rather than presenting fictitious savings.

### Scenario inputs

- load profile CSV (timestamp, load_kw; optional tariff or critical-load label);
- PV profile CSV or manually supplied PV availability;
- battery energy capacity (kWh);
- maximum charge power (kW);
- maximum discharge power (kW);
- initial SOC (%);
- minimum and maximum SOC (%);
- charge/discharge efficiency;
- import/export limit if relevant;
- tariff schedule, only if cost comparison is requested;
- flexible load amount and permitted shift window, only where the load is genuinely shiftable.

### Scenario outputs

- grid import profile (kW);
- PV self-consumption and curtailment (kWh);
- battery SOC profile (%);
- charge/discharge power (kW);
- peak import before vs after (kW);
- imported energy before vs after (kWh);
- estimated cost before vs after (currency), only with a tariff input;
- constraint violations (must be zero for a feasible result);
- optimisation status and assumptions.

### Charts

- Power balance: load, PV, battery charge/discharge, grid import.
- Battery state of charge over time.
- Before/after grid import comparison.

### Controls

- `Run scenario` executes the backend optimiser.
- `Reset assumptions` restores the documented defaults.
- `Save scenario` persists the configuration and results if a backend store exists.
- `Export scenario report` creates a downloadable summary if implemented.

No control should be shown unless wired to a real calculation or state update. No scenario should claim actual energy savings from a national grid-level forecast alone.

## 4.7 Runs & artefacts

This page manages notebook runs.

- List run ID, created time, dataset hash, forecast date, selected model(s), holdout WAPE and status.
- Allow import of a `.zip` containing the notebook output directory.
- Validate required filenames and schemas before registering a run.
- Reject path traversal, oversized files and malformed archives.
- Preserve original imported artefacts; parse into an internal store for serving.
- Selecting a run changes all application pages to that run.
- Show an explicit schema error if a CSV is missing required fields.

The current notebook does not persist a reusable fitted estimator in the listed exports. Do not present a “retrain model” or “live inference endpoint” button unless a serving model and complete preprocessing pipeline are actually persisted and callable. The UI can work initially from forecast and validation artefacts alone.

---

## 5. AI assistant — contextual, tool-backed, not decorative

Gemma 4 is an optional operator interface. It must not dominate the screen or appear as a permanent floating chat bubble.

### Entry point

A single top-bar action: `Ask about this run`. It opens an Astryx Drawer (or a compact contextual panel) containing:
- a short prompt input;
- a small set of contextual suggested questions derived from the page, not generic fake starter prompts;
- the conversation for the current run;
- tool-call activity with actual function names and result status;
- source references to the forecast rows, metrics or scenario assumptions used.

### Allowed tool functions

```ts
get_run_summary(runId)
get_day_ahead_forecast(runId, forecastDate)
get_peak_hours(runId, forecastDate)
compare_validation_models(runId)
get_holdout_metrics(runId)
get_horizon_errors(runId)
get_data_quality_summary(runId)
get_feature_availability(runId)
run_asset_scenario(scenarioInput)
```

Only expose functions that are actually implemented by the backend. Validate every argument using a schema. The assistant cannot access arbitrary filesystem paths, arbitrary SQL, raw Python execution, API secrets or hardware write controls.

### Answer format

- State the result plainly.
- Include units and dates.
- Cite the relevant run ID and data window in the UI.
- Distinguish forecast values, historical holdout metrics and scenario outputs.
- When data is absent, say it is absent.
- When confidence is weak, say so.
- Never let Gemma invent a forecast, metric, source timestamp or estimated saving.

If Gemma configuration is absent, hide the entry point or show a single clear configuration notice in Settings. Do not show a dead chat composer.

---

## 6. Component and chart interaction rules

### Every control must work

Before shipping, audit every visible button, menu, selector, tab, toggle, chart legend, row, and download action.

Examples of valid actions:
- run selector changes the active run;
- forecast date selector loads a valid forecast;
- tabs switch real page sections or routes;
- chart legend toggles a series;
- table sort changes displayed row order;
- row click opens a real detail drawer;
- download action creates a real file;
- scenario button sends real validated inputs to the optimiser;
- theme toggle changes the Astryx Theme mode;
- assistant action invokes the configured backend tool route.

Do not add a button with `onClick={() => {}}`, an unimplemented “Refresh”, an inert “Export”, fake notification bell, fake user avatar menu, dead command palette, or decorative search field.

### Chart interaction

- Use ECharts with `ResizeObserver`/the React wrapper's resize support.
- Dispose chart instances on unmount.
- Use `aria` descriptions and a data table for all key values.
- Avoid dual axes unless unavoidable and labelled.
- Use axis units: MW, MWh, kW, kWh, %.
- Avoid truncating dates so the user can identify which day is shown.
- Tooltips show exact numeric values; do not round underlying data.
- Add zoom only to longer historical charts, not the fixed 24-point chart unless it improves inspection.
- Do not animate data on every render.
- Ensure chart palette works in light and dark mode.

### Data formatting

- MW/MWh: locale-aware thousands separators, sensible decimals (normally 0–1 depending on source resolution).
- Percent: one decimal place.
- Timestamps: explicit local dataset timezone label; source dataset timestamps are documented as timezone-naïve, so do not append `UTC` or `IST` unless the dataset timezone has been confirmed.
- Missing: em dash plus accessible explanation; never silently replace with zero.
- Negative values: preserve only where physically/semantically valid; otherwise flag as data quality issue.

---

## 7. API contract between frontend and backend

The frontend must not parse arbitrary notebook CSVs throughout every component. Build one backend adapter that validates the notebook artefacts and exposes stable typed endpoints.

Suggested FastAPI routes:

```text
GET  /api/health
GET  /api/runs
POST /api/runs/import
GET  /api/runs/{run_id}
GET  /api/runs/{run_id}/forecast?date=YYYY-MM-DD
GET  /api/runs/{run_id}/validation/leaderboard
GET  /api/runs/{run_id}/validation/holdout
GET  /api/runs/{run_id}/validation/horizon-errors
GET  /api/runs/{run_id}/validation/daily-errors
GET  /api/runs/{run_id}/quality
GET  /api/runs/{run_id}/quality/anomalies
GET  /api/runs/{run_id}/energy-mix?start=&end=
POST /api/runs/{run_id}/scenarios/dispatch
POST /api/runs/{run_id}/assistant/query
```

### Forecast response example

```json
{
  "run_id": "run-2026-10-31-001",
  "forecast_date": "2024-06-17",
  "forecast_origin": "2024-06-16T23:00:00",
  "timezone_label": "Source timestamps are timezone-naive",
  "model": {
    "selected_models": {
      "lgbm_tuned": 0.7,
      "catboost": 0.3
    }
  },
  "rows": [
    {
      "timestamp": "2024-06-17T00:00:00",
      "horizon": 1,
      "demand_mw": 0,
      "p10": 0,
      "p90": 0
    }
  ]
}
```

The example values above are schema placeholders only. Never render them as live data.

### Run summary response

```ts
type RunSummary = {
  run_id: string;
  dataset_sha: string | null;
  first_timestamp: string | null;
  last_timestamp: string | null;
  forecast_date: string;
  forecast_origin: string;
  rows_raw: number | null;
  full_hour_slots: number | null;
  missing_hour_slots: number | null;
  selected_models: Record<string, number>;
  cv_metrics: MetricSet | null;
  holdout_metrics: MetricSet | null;
  holdout_interval_coverage_80: number | null;
  holdout_mean_interval_width_mw: number | null;
};

type MetricSet = {
  MAE: number;
  RMSE: number;
  WAPE_pct: number;
  sMAPE_pct?: number;
  n?: number;
};
```

### Import validation

On `POST /api/runs/import`:

1. Enforce file size limit.
2. Check ZIP member paths to prevent path traversal.
3. Require `run_metadata.json` and `sample_forecast_one_origin.csv`.
4. Validate exactly 24 forecast rows, unique hourly timestamps, numeric MW values, and `p10 <= demand_mw <= p90`.
5. Validate optional CSV schemas when present.
6. Reject NaN/inf values in forecast rows.
7. Verify that forecast timestamps belong to the declared forecast date and are hourly contiguous.
8. Record import time separately from model forecast origin.
9. Store original artefacts immutably with a content hash.
10. Return actionable error messages rather than silently skipping a malformed file.

---

## 8. Frontend project structure

Recommended Next.js App Router layout:

```text
frontend/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx
│   │   ├── overview/page.tsx
│   │   ├── forecast/page.tsx
│   │   ├── model-quality/page.tsx
│   │   ├── data-quality/page.tsx
│   │   ├── energy-mix/page.tsx
│   │   ├── scenario-lab/page.tsx
│   │   ├── runs/page.tsx
│   │   └── settings/page.tsx
│   ├── globals.css
│   └── page.tsx
├── components/
│   ├── shell/
│   │   ├── gridtwin-shell.tsx
│   │   ├── app-sidebar.tsx
│   │   └── app-topbar.tsx
│   ├── overview/
│   │   ├── forecast-kpis.tsx
│   │   ├── day-ahead-chart.tsx
│   │   ├── peak-window-panel.tsx
│   │   └── selected-models-table.tsx
│   ├── forecast/
│   │   ├── forecast-chart.tsx
│   │   ├── hourly-forecast-table.tsx
│   │   └── forecast-toolbar.tsx
│   ├── model-quality/
│   │   ├── model-leaderboard.tsx
│   │   ├── horizon-error-chart.tsx
│   │   ├── daily-error-chart.tsx
│   │   └── metric-explainer.tsx
│   ├── data-quality/
│   │   ├── quality-summary.tsx
│   │   ├── anomaly-table.tsx
│   │   └── feature-availability-chart.tsx
│   ├── energy-mix/
│   │   ├── generation-area-chart.tsx
│   │   └── imports-chart.tsx
│   ├── scenario-lab/
│   │   ├── scenario-form.tsx
│   │   ├── dispatch-chart.tsx
│   │   └── battery-soc-chart.tsx
│   ├── assistant/
│   │   ├── assistant-drawer.tsx
│   │   └── tool-call-trace.tsx
│   ├── charts/
│   │   ├── echarts-base.tsx
│   │   └── chart-theme.ts
│   └── shared/
│       ├── metric-card.tsx
│       ├── page-header.tsx
│       ├── data-state.tsx
│       └── csv-download.tsx
├── lib/
│   ├── api-client.ts
│   ├── schemas.ts
│   ├── format.ts
│   ├── chart-options.ts
│   └── run-context.ts
├── types/
│   ├── api.ts
│   └── forecast.ts
└── tests/
    ├── api-contract.test.ts
    ├── forecast-chart.test.ts
    └── import-validation.test.ts

backend/
├── app/
│   ├── main.py
│   ├── routes/
│   ├── services/
│   │   ├── artifact_loader.py
│   │   ├── run_registry.py
│   │   ├── forecast_service.py
│   │   ├── validation_service.py
│   │   ├── data_quality_service.py
│   │   ├── scenario_service.py
│   │   └── gemma_service.py
│   ├── schemas/
│   └── tests/
└── artifacts/
    └── README.md
```

This is a recommended structure. Do not create empty components or routes just to match the tree. Implement a route only when it has real data or a clearly designed empty state.

---

## 9. Loading, empty, error, stale and partial-data states

Every data-backed page needs explicit states.

### Loading

- Use Astryx `Skeleton` for the exact shape of the KPI/chart/table that is loading.
- Keep layout dimensions stable to prevent content jumping.
- Do not show fabricated “loading” metrics.

### No run imported

Use Astryx `EmptyState` with one primary action: `Import a training run`. Explain briefly that the user should upload the Colab output ZIP. Do not show blank KPI cards.

### Missing optional file

Show only the related module's empty state, e.g. “Detailed feature availability was not exported in this run.” Keep other valid pages available.

### Invalid artefact

Use Astryx `Banner` with the specific file and schema issue. Do not silently repair a malformed forecast CSV.

### API error

Show a retry action only if a retry is supported. Retain the last successfully loaded run with a visible stale-data label only when the cached run is known and immutable.

### Partial data

Label charts with missing coverage and visible gaps. Never connect across missing periods as if values were observed.

### Forecast not yet evaluated

For a future forecast date, show the forecast and interval only. The actual line and forecast error must be absent until observations exist.

---

## 10. Responsive behaviour

### Desktop (>= 1280 px)

- Full 248 px SideNav.
- Overview can use 12-column layout: forecast chart 8 columns, peak/run panel 4 columns.
- KPI strip: 4 columns.
- Tables fill width.

### Tablet (768–1279 px)

- Collapsible SideNav or Astryx mobile navigation behaviour.
- KPI cards 2 per row.
- Chart full width; peak panel below.
- Tables horizontally scroll or switch to compact row details; do not squeeze numeric columns until values become unreadable.

### Mobile (< 768 px)

- Side navigation becomes the Astryx-supported mobile navigation pattern.
- KPI cards 2 per row (1 per row on very narrow screens).
- Chart controls move to a compact control row; chart remains readable.
- Use a stacked table/list representation for the hourly forecast if the full table cannot fit.
- Drawers become a mobile-appropriate sheet if Astryx provides it.
- No hover-only information; tooltips must have touch/keyboard alternatives.

---

## 11. Accessibility and quality bar

- Meet WCAG 2.2 AA where practical.
- Use semantic landmarks and one H1 per page.
- All actions keyboard reachable and have visible focus.
- Colour is never the only way to distinguish forecast, actual and interval.
- Provide a data table alternative for each major chart.
- Use accessible labels for icon-only buttons.
- Ensure drawers/dialogs manage focus correctly; support Escape where Astryx documents it.
- Respect `prefers-reduced-motion`.
- Use sufficient chart contrast in both theme modes.
- Do not put essential model-quality explanations only in a tooltip; add concise visible labels.

---

## 12. Visual direction — precise art direction

### Desired feeling

An understated, high-quality operations product used by an engineer. Clean, precise, calm, compact and credible. Closer to a professional energy analytics instrument than a futuristic sci-fi dashboard.

### Layout rhythm

- 8 px spacing baseline.
- 16–20 px page gutters at compact sizes; 28–32 px at wide desktop.
- 20–24 px between major sections.
- KPI cards are compact and aligned; chart panel is the visual anchor.
- Use dividers and typography to group data; do not wrap every label in its own card.
- Keep chart title, time window, unit and export action in a consistent header row.

### Visual hierarchy

1. Main forecast and peak information.
2. Model reliability and holdout evidence.
3. Data quality / limitations.
4. Scenario exploration.

### Chart palette semantics

- Forecast line: primary blue-green.
- Actual line: charcoal or deep blue.
- Prediction band: transparent lighter shade of forecast line.
- Baseline: muted grey dashed line.
- Anomaly markers: amber; reserve red for invalid or severe data-quality warnings.
- Battery SOC: separate muted violet/blue accent only on Scenario Lab.

Do not use a rainbow palette. A model leaderboard should use neutral table styling; the selected model may have a subtle badge but no medal or trophy graphic.

---

## 13. Acceptance criteria — do not call the UI complete until these pass

### Data correctness

- [ ] The app loads one real run imported from the actual Colab output directory.
- [ ] Run metadata and every displayed KPI come from that selected run.
- [ ] Forecast chart shows exactly the 24 rows in `sample_forecast_one_origin.csv`.
- [ ] Forecast timestamps are unique, contiguous hourly values on one forecast date.
- [ ] P10 <= forecast <= P90 is validated on import.
- [ ] Actual values are only shown for completed historical evaluation data.
- [ ] Future data after forecast origin is never displayed as an input feature or actual in operational mode.
- [ ] WAPE is labelled as WAPE, not accuracy.
- [ ] Historical holdout metrics and operational forecast are not confused.
- [ ] Missing values render as gaps / unavailable, never zero by default.
- [ ] Source/fuel charts are hidden or explicitly marked unavailable if input series are incomplete.
- [ ] Grid forecast and asset-level scenario outputs have distinct labels and scopes.

### Interaction

- [ ] Run selector changes all page data.
- [ ] Forecast date selector selects a supported run/date.
- [ ] Chart toggles work.
- [ ] Table sorting works and CSV export matches the selected run.
- [ ] Chart-to-table selection is synchronised.
- [ ] Model leaderboard sorting works.
- [ ] Row detail drawer opens and closes correctly.
- [ ] Scenario controls change the request payload and results.
- [ ] Gemma drawer is absent when the API is not configured, and grounded when enabled.
- [ ] Every visible button has a real action; no no-op buttons remain.

### Design and responsive quality

- [ ] Astryx is used for shell, navigation, forms, cards, tables, badges, banners, drawers and feedback states.
- [ ] ECharts is limited to chart rendering; it does not replace Astryx application structure.
- [ ] No ad hoc fake Astryx component imports.
- [ ] No empty decorative sections or filler content.
- [ ] App works at desktop, tablet and mobile widths.
- [ ] Keyboard navigation, focus and chart data alternatives are tested.
- [ ] No console errors, hydration warnings or chart lifecycle leaks.

### Release checks

```bash
npx @astryxdesign/cli doctor
npm run lint
npm run typecheck
npm run test
npm run build
```

Also test with:
- a valid run;
- missing optional artefacts;
- malformed forecast CSV;
- duplicated timestamp;
- NaN / infinity in forecast values;
- invalid p10/p90 order;
- future forecast with no actual values;
- a run with flagged spikes and missing hours;
- a stale cached run while API is unavailable.

---

## 14. Build order

Implement in this order to avoid polishing an incorrect dashboard:

1. Install Astryx and initialise the project; inspect the installed component documentation with the CLI.
2. Build the `AppShell`, SideNav and top bar with the Neutral theme.
3. Build the backend artifact loader and import validation.
4. Build Overview from actual `run_metadata.json` and `sample_forecast_one_origin.csv`.
5. Build Forecast chart + 24-row table; verify the data against the CSV exactly.
6. Build Model Quality from CV leaderboard, holdout predictions and horizon report.
7. Build Data Quality using real audit artefacts; add notebook exports for missing quality fields.
8. Build Energy Mix only if a validated cleaned historical series is available.
9. Build Scenario Lab only when the asset-profile inputs and optimiser API are implemented.
10. Add the Gemma assistant last, once the deterministic tools have stable schemas.
11. Complete responsive, accessibility, negative-state and release tests.

Do not start with the assistant, 3D effects or scenario animations. The forecast and its validation evidence are the product's foundation.

---

## 15. Developer handoff instruction

Implement the product exactly as specified here. Use Astryx components as the default for all non-chart UI. Inspect the installed Astryx component docs through its CLI before using component props or subcomponents. Use Apache ECharts only for data visualisation because the current public Astryx catalogue does not list native charts.

Use the real output artefacts from the GRIDTWIN-24 Colab notebook. Build one adapter that validates them and exposes typed API responses. Do not hardcode example metrics or show synthetic values as real results. When a dataset field or exported artefact is unavailable, show an honest empty state and keep the rest of the application working.

The finished UI should be beautiful because its hierarchy, spacing, typography, chart design and data interactions are considered—not because it contains gradients, random cards, generic AI decorations or invented numbers. Every visible control must work. Every metric must be traceable to a run. Every chart must have an accessible table equivalent.
