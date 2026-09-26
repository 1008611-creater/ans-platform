export type AigcConnectorId = "solara" | "plane" | "toonflow";

export interface AigcConnector {
  id: AigcConnectorId;
  url: string;
  host: string;
  kind: "planning" | "production" | "backup";
  framePolicy: "external-only";
}

/**
 * External workspaces are deliberately configured as links instead of iframes.
 * Solara redirects to its own sign-in page and Plane sends X-Frame-Options: DENY.
 * Keeping the URLs in environment variables lets each deployment point at its
 * own instance without putting credentials in ANS.
 */
export const AIGC_CONNECTORS: readonly AigcConnector[] = [
  {
    id: "solara",
    url: process.env.ANS_SOLARA_URL || "https://plan.cauai.fun",
    host: "plan.cauai.fun",
    kind: "planning",
    framePolicy: "external-only",
  },
  {
    id: "plane",
    url: process.env.ANS_PLANE_URL || "https://plane.cauai.fun",
    host: "plane.cauai.fun",
    kind: "backup",
    framePolicy: "external-only",
  },
  {
    id: "toonflow",
    url: process.env.ANS_TOONFLOW_URL || "https://toonflow.cauai.fun",
    host: "toonflow.cauai.fun",
    kind: "production",
    framePolicy: "external-only",
  },
];

export const AIGC_PHASES = ["discover", "plan", "produce", "submit"] as const;

export const AIGC_DELIVERABLES = [
  "brief",
  "plan",
  "storyboard",
  "source",
  "iterations",
  "final",
  "evidence",
  "package",
] as const;
