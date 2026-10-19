import { OPENLUX_MODELS, type OpenLuxModel } from "./openlux";

export type OpenLuxEvidenceLevel = "A" | "B" | "C" | "D";

export type OpenLuxCapability = {
  model: OpenLuxModel;
  evidence: OpenLuxEvidenceLevel;
  supportsTextToImage: boolean;
  supportsReferenceImage: boolean | "unknown";
  sizes: string[] | "unknown";
  qualities: string[] | "unknown";
  formats: string[] | "unknown";
  responseFormats: string[] | "unknown";
  enabled: false;
  reason: string;
};

/**
 * Model IDs are user-provided evidence. Provider capabilities remain unknown
 * until OpenLux's own contract confirms them, so this registry cannot enable
 * a guessed feature by accident.
 */
const createCapability = (model: OpenLuxModel): OpenLuxCapability => {
  const confirmedByOperation = model === "gpt-image-2.5-flare" || model === "gpt-image-2.5-sunburst";
  const confirmedForCurrentToken = model === "gpt-image-2.5-sunburst-c";
  return {
    model,
    evidence: confirmedByOperation ? "A" : "B",
    supportsTextToImage: true,
    supportsReferenceImage: confirmedByOperation ? "unknown" : "unknown",
    sizes: confirmedByOperation
      ? ["auto", "1024x1024", "1536x1024", "1024x1536", "2048x2048", "2048x1152", "3840x2160", "2160x3840"]
      : confirmedForCurrentToken ? ["1024x1024"] : "unknown",
    qualities: confirmedByOperation ? ["low", "medium", "high", "xhigh", "max", "auto"] : confirmedForCurrentToken ? ["low"] : "unknown",
    formats: confirmedByOperation ? ["png", "jpeg", "webp"] : confirmedForCurrentToken ? ["webp"] : "unknown",
    responseFormats: confirmedByOperation || confirmedForCurrentToken ? ["url", "b64_json"] : "unknown",
    enabled: false,
    reason: confirmedByOperation
      ? "Documented by the OpenLux image operation; real calls remain disabled until explicit authorization."
      : confirmedForCurrentToken
        ? "Visible to the configured API token through GET /v1/models; remaining capabilities require a controlled test."
        : "Model appears in user-provided/pricing evidence but is not confirmed for this token.",
  };
};

export const OPENLUX_CAPABILITIES: Record<OpenLuxModel, OpenLuxCapability> = OPENLUX_MODELS.reduce(
  (all, model) => {
    all[model] = createCapability(model);
    return all;
  },
  {} as Record<OpenLuxModel, OpenLuxCapability>,
);

export function getOpenLuxCapability(model: string): OpenLuxCapability | undefined {
  return OPENLUX_MODELS.includes(model as OpenLuxModel)
    ? OPENLUX_CAPABILITIES[model as OpenLuxModel]
    : undefined;
}

export function listOpenLuxCapabilities(): OpenLuxCapability[] {
  return OPENLUX_MODELS.map((model) => OPENLUX_CAPABILITIES[model]);
}
