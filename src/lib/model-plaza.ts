/** Public model directory. No upstream keys, user balance or private groups. */
export type ModelPlazaPrice = {
  input: number;
  output: number;
  cacheRead: number | null;
  cacheWrite?: number | null;
  cacheWrite5m: number | null;
  cacheWrite1h: number | null;
  source: "apic" | "official";
  sourceUrl: string;
};
export type ModelPlazaModel = {
  id: string;
  name: string;
  vendor: string;
  endpoints: string[];
  pricingType: "tokens";
  /** Directory publication is not proof of successful inference. */
  status: "listed" | "not-listed" | "prepared";
  usdPerMillion: ModelPlazaPrice | null;
  /** Retail multiplier from ANS_MODEL_BILLING_POLICY; null when the model is not priced. */
  consumptionMultiplier: number | null;
  /** null until the server has a complete, verified retail policy. */
  pointsPerMillion: Omit<ModelPlazaPrice, "source" | "sourceUrl"> | null;
};
export type ModelPlazaCatalog = {
  sourceUrl: string;
  observedAt: string | null;
  pricingVersion: string | null;
  referenceDate?: string;
  state: "current" | "unavailable";
  models: ModelPlazaModel[];
  billing: {
    pointsPerCny: 10;
    usdCny: number | null;
    fxSource: string | null;
    fxAsOf: string | null;
  };
};
