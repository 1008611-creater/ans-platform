"use client";

import { createContext, useContext } from "react";
import type { RunModelKey, RunModelMultipliers } from "@/lib/run-models";

type RunModelPricing = { multipliers: RunModelMultipliers; paused: readonly RunModelKey[] };
const RunModelPricingContext = createContext<RunModelPricing>({ multipliers: {}, paused: [] });

/** Carries the server-read billing multipliers and paused models to client model pickers. */
export function RunModelPricingProvider({ multipliers, paused = [], children }: { multipliers: RunModelMultipliers; paused?: readonly RunModelKey[]; children: React.ReactNode }) {
  return <RunModelPricingContext.Provider value={{ multipliers, paused }}>{children}</RunModelPricingContext.Provider>;
}

export function useRunModelMultipliers(): RunModelMultipliers {
  return useContext(RunModelPricingContext).multipliers;
}

/** Models that must not be offered for new calls right now. */
export function usePausedRunModels(): readonly RunModelKey[] {
  return useContext(RunModelPricingContext).paused;
}
