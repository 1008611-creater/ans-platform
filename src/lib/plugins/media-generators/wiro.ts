import { MediaSubmissionNotSentError } from "./types";
/**
 * Wiro.ai Media Generator Plugin
 * 
 * Generates images and videos using Wiro.ai API.
 * 
 * Required env vars:
 * - WIRO_API_KEY
 * - WIRO_VIDEO_MODELS (comma-separated, e.g., "google/veo3.1-fast")
 * - WIRO_IMAGE_MODELS (comma-separated, e.g., "google/nano-banana-pro,google/nano-banana")
 * - WIRO_AUDIO_MODELS (comma-separated, e.g., "elevenlabs/sound-effects")
 */

import type {
  MediaGeneratorPlugin,
  MediaGeneratorModel,
  GenerationRequest,
  GenerationTask,
  WebSocketHandler,
  WebSocketCallbacks,
  GenerationStatusKey,
} from "./types";

const WIRO_API_BASE = "https://api.wiro.ai/v1";
const WIRO_SOCKET_URL = "wss://socket.wiro.ai/v1";

function parseModels(envVar: string | undefined, type: "image" | "video" | "audio"): MediaGeneratorModel[] {
  if (!envVar) return [];
  return envVar
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean)
    .map((id) => ({
      id,
      name: id,
      type,
    }));
}

// Map Wiro message types to static translation keys
const wiroStatusMap: Record<string, GenerationStatusKey> = {
  task_queue: "queued",
  task_accept: "accepted",
  task_preprocess_start: "preprocessStart",
  task_preprocess_end: "preprocessEnd",
  task_assign: "gpuAssigned",
  task_start: "started",
  task_output: "generating",
  task_error: "error",
  task_output_full: "processingOutput",
  task_error_full: "errorProcessing",
  task_end: "ending",
  task_postprocess_start: "postprocessStart",
  task_postprocess_end: "complete",
};

const wiroWebSocketHandler: WebSocketHandler = {
  getInitMessage: (socketAccessToken: string) => {
    return JSON.stringify({
      type: "task_info",
      tasktoken: socketAccessToken,
    });
  },

  handleMessage: (event: MessageEvent, callbacks: WebSocketCallbacks) => {
    const { setProgress, setStatus, setStatusMessage, setError, onComplete, onCleanup } = callbacks;
    const fail = (code: string) => { setProgress(null); setStatus("error"); setError(code); onCleanup(); };
    try {
      const msg = JSON.parse(event.data);
      if (!msg || typeof msg !== "object" || typeof msg.type !== "string") { fail("MEDIA_STATUS_INVALID"); return; }
      const statusKey = wiroStatusMap[msg.type];
      if (!statusKey) return;
      setStatusMessage(statusKey);
      // Stage events contain no measured percentage. Repeated output chunks are
      // not evidence of additional progress, so keep the percentage unknown.
      setProgress(null);
      if (msg.type === "task_error" || msg.type === "task_error_full") { fail("MEDIA_PROVIDER_FAILED"); return; }
      if (msg.type === "task_start") setStatus("processing");
      if (msg.type === "task_postprocess_end") {
        const urls = Array.isArray(msg.message) ? msg.message.flatMap((item: unknown) => {
          if (!item || typeof item !== "object" || !("url" in item) || typeof item.url !== "string") return [];
          try { const url = new URL(item.url); return ["https:", "http:"].includes(url.protocol) ? [item.url] : []; } catch { return []; }
        }) : [];
        if (!urls.length) { fail("MEDIA_STATUS_INVALID"); return; }
        setProgress(100); setStatus("completed"); onComplete(urls); onCleanup();
      }
    } catch {
      // A JSON parser exception can quote private upstream text. Never log it.
      fail("MEDIA_STATUS_INVALID");
    }
  },
};

export const wiroGeneratorPlugin: MediaGeneratorPlugin = {
  id: "wiro",
  name: "Wiro.ai",
  logo: "/sponsors/wiro.png",
  logoDark: "/sponsors/wiro.png",

  isConfigured: () => {
    return !!(
      process.env.WIRO_API_KEY &&
      (process.env.WIRO_VIDEO_MODELS || process.env.WIRO_IMAGE_MODELS || process.env.WIRO_AUDIO_MODELS)
    );
  },

  isEnabled: () => {
    return wiroGeneratorPlugin.isConfigured();
  },

  getModels: () => {
    const imageModels = parseModels(process.env.WIRO_IMAGE_MODELS, "image");
    const videoModels = parseModels(process.env.WIRO_VIDEO_MODELS, "video");
    const audioModels = parseModels(process.env.WIRO_AUDIO_MODELS, "audio");
    return [...imageModels, ...videoModels, ...audioModels];
  },

  async startGeneration(request: GenerationRequest): Promise<GenerationTask> {
    if (!this.isConfigured()) {
      throw new MediaSubmissionNotSentError();
    }

    const apiKey = process.env.WIRO_API_KEY!;
    const url = `${WIRO_API_BASE}/Run/${request.model}`;

    const formData = new FormData();
    formData.append("prompt", request.prompt);
    
    if (request.type === "video") {
      // Video-specific parameters
      formData.append("resolution", "720p");
      formData.append("generateAudio", "false");
      formData.append("enhancePrompt", "true");
      formData.append("personGeneration", "allow_adult");
      formData.append("durationSeconds", "4");
      if (request.aspectRatio) {
        formData.append("aspectRatio", request.aspectRatio);
      }
    } else if (request.type === "audio") {
      // Audio-specific parameters
      formData.append("durationSeconds", "30");
    } else {
      // Image-specific parameters
      formData.append("resolution", request.resolution || "1K");
      if (request.aspectRatio) {
        formData.append("aspectRatio", request.aspectRatio);
      }
    }

    if (request.inputImageUrl) {
      // Pass the URL to Wiro instead of fetching server-side to avoid SSRF.
      // Wiro's API natively supports inputImageUrl for fileinput parameters.
      formData.append("inputImageUrl", request.inputImageUrl);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
      },
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Wiro.ai API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.result) {
      throw new Error(
        `Wiro.ai generation failed: ${result.errors?.join(", ") || "Unknown error"}`
      );
    }

    return {
      taskId: result.taskid,
      socketAccessToken: result.socketaccesstoken,
    };
  },

  getWebSocketUrl: () => {
    return WIRO_SOCKET_URL;
  },

  webSocketHandler: wiroWebSocketHandler,
};
