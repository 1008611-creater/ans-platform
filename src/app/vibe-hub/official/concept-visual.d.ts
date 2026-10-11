import type { ReactElement } from "react";
import type { VisualModule } from "./types";
export function ConceptVisual(props: {kind: string; locale: "en" | "zh"; example?: Record<string, unknown>}): ReactElement | null;
export function SkillGuide(props: {module: VisualModule; locale: "en" | "zh"}): ReactElement | null;
