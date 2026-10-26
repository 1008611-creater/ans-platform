"use client";

import { createContext, useContext } from "react";
import type { RunModelMultipliers } from "@/lib/run-models";

const RunModelPricingContext = createContext<RunModelMultipliers>({});

/** Carries the server-read billing policy multipliers to client model pickers. */
export function RunModelPricingProvider({ multipliers, children }: { multipliers: RunModelMultipliers; children: React.ReactNode }) {
  return <RunModelPricingContext.Provider value={multipliers}>{children}</RunModelPricingContext.Provider>;
}

export function useRunModelMultipliers(): RunModelMultipliers {
  return useContext(RunModelPricingContext);
}
