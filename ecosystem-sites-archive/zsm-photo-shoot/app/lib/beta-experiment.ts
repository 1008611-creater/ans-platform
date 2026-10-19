export type BetaSatisfaction = 1 | 2 | 3 | 4 | 5;
export type BetaChoice = "yes" | "no" | "revise";

export type BetaFeedback = {
  satisfaction?: BetaSatisfaction;
  publishIntent?: BetaChoice;
  recommendIntent?: "yes" | "no";
  note?: string;
};

export type BetaExportRecord = {
  orderId: string;
  createdAt: string;
  completedAt?: string;
  templateId: string;
  templateVersion: string;
  mode: "quick" | "expert";
  provider: "mock" | "openlux";
  status: "processing" | "ready" | "failed";
  durationMs?: number;
  hasOutput: boolean;
  failureCode?: string;
  feedback?: BetaFeedback;
};

export type BetaExportDocument = {
  schemaVersion: "beta-experiment-1.0";
  disclaimer: string;
  exportedAt: string;
  records: BetaExportRecord[];
};

export function createBetaExportDocument(records: BetaExportRecord[], exportedAt = new Date().toISOString()): BetaExportDocument {
  return {
    schemaVersion: "beta-experiment-1.0",
    disclaimer: "当前浏览器会话的匿名实验数据，不是生产订单数据；不包含原始照片、图片 URL、Base64、完整提示词或用户身份信息。",
    exportedAt,
    records: records.map((record) => ({ ...record, feedback: record.feedback ? { ...record.feedback } : undefined })),
  };
}

export function downloadBetaExport(payload: BetaExportDocument): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `zsm-beta-experiment-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
