export type ForecastRow = {
  timestamp: string;
  demand_mw: number;
  p10: number;
  p90: number;
};

export const attachedRun = {
  id: "gridtwin-final-2024-06-17",
  forecastDate: "2024-06-17",
  forecastOrigin: "2024-06-16 23:00:00",
  selectedModel: "ensemble",
  sourceDataEnd: "2024-06-16 23:00:00",
  rows: 79283,
  missingHourSlots: 1045,
  anomalyCandidates: 5,
  maskedAnomalies: 5,
  holdout: {
    n: 671,
    mae: 922.04,
    rmse: 1675.04,
    wape: 7.04,
    smape: 8.41,
    intervalCoverage: 55.89,
    intervalWidth: 1315.04,
  },
  models: [
    { name: "cat_demand", wape: 4.81, mae: 448.83, rmse: 729.63, selected: true },
    { name: "lgbm_demand", wape: 4.91, mae: 458.79, rmse: 736.69, selected: true },
    { name: "cat_context", wape: 5.08, mae: 474.18, rmse: 767.78, selected: true },
    { name: "patchtst", wape: 5.21, mae: 486.41, rmse: 799.65, selected: true },
    { name: "lgbm_context", wape: 5.21, mae: 486.64, rmse: 751.39, selected: false },
    { name: "dlinear", wape: 5.33, mae: 497.57, rmse: 778.72, selected: false },
    { name: "seasonal_day", wape: 6.70, mae: 625.86, rmse: 956.62, selected: false },
  ],
  forecast: [
    ["00:00", 12342.6, 11974.8, 12901.7], ["01:00", 12115.8, 11861.5, 12644.6], ["02:00", 11593.4, 11305.8, 12054.8], ["03:00", 11112.0, 10731.3, 11649.8],
    ["04:00", 10664.1, 10150.9, 11228.1], ["05:00", 10143.0, 9683.7, 10702.3], ["06:00", 9937.0, 9278.3, 10599.3], ["07:00", 10086.0, 9252.2, 10695.3],
    ["08:00", 9855.7, 8836.6, 10545.2], ["09:00", 10050.9, 9057.2, 10673.5], ["10:00", 10252.7, 9211.0, 10830.7], ["11:00", 10557.7, 9843.1, 11128.3],
    ["12:00", 11209.1, 10338.5, 11714.3], ["13:00", 11370.2, 10660.8, 12105.0], ["14:00", 11241.6, 10169.9, 11881.4], ["15:00", 11104.6, 10156.2, 11653.9],
    ["16:00", 10790.7, 9734.7, 11404.2], ["17:00", 10438.1, 9599.2, 10859.3], ["18:00", 11526.8, 10893.8, 12025.4], ["19:00", 12074.9, 11421.7, 12694.4],
    ["20:00", 12428.1, 11870.1, 13086.8], ["21:00", 12614.6, 11956.6, 13392.5], ["22:00", 12530.2, 11753.2, 13348.1], ["23:00", 12608.1, 11958.1, 13455.0],
  ].map(([hour, demand_mw, p10, p90]) => ({ timestamp: `2024-06-17 ${hour}:00`, demand_mw, p10, p90 } as ForecastRow)),
};

export const runNarrative = "The final run forecasts 2024-06-17 from a 2024-06-16 23:00 origin using an ensemble of cat_demand, lgbm_demand, cat_context, and patchtst. Historical holdout WAPE is 7.04%; the measured P10-P90 interval covers 55.89% of holdout observations, so the interval should be treated as informative but not fully reliable. The source contains 1,045 missing hourly slots and five anomaly candidates, all five masked for modelling.";
