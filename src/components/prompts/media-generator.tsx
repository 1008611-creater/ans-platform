"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Loader2, Wand2, Upload, ChevronDown, AlertCircle, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { WebSocketCallbacks, GenerationStatusKey, AspectRatio } from "@/lib/plugins/media-generators/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "1:1 (Square)" },
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "9:16", label: "9:16 (Portrait)" },
  { value: "4:3", label: "4:3 (Standard)" },
  { value: "3:4", label: "3:4 (Portrait)" },
  { value: "3:2", label: "3:2 (Photo)" },
  { value: "2:3", label: "2:3 (Portrait)" },
];
import { getProviderWebSocketHandler } from "@/lib/plugins/media-generators";

interface MediaGeneratorModel {
  id: string;
  name: string;
  type: "image" | "video" | "audio";
  provider: string;
  providerName: string;
  providerLogo?: string;
  providerLogoDark?: string;
}

interface SavedMediaRequest { hash: string; key: string; legacy?: boolean; }
const legacyStorageKey = "ans-media-request-v1";
function savedMediaRequest(value: string | null, hash?: string): SavedMediaRequest | null {
  try {
    const item = JSON.parse(value || "null");
    if (item && typeof item.hash === "string" && /^[a-f0-9]{64}$/.test(item.hash) && (!hash || item.hash === hash) && typeof item.key === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(item.key)) return { hash: item.hash, key: item.key };
  } catch { /* A malformed record is not a valid request identity. */ }
  return null;
}

interface MediaGeneratorProps {
  prompt: string;
  mediaType: "IMAGE" | "VIDEO" | "AUDIO";
  onMediaGenerated: (url: string) => void;
  onUploadClick: () => void;
  inputImageUrl?: string;
}

type GenerationStatus = 
  | "idle"
  | "confirming"
  | "starting"
  | "queued"
  | "processing"
  | "completed"
  | "error";

// Replace prompt variables with default values or placeholder text
function fillPromptVariables(prompt: string): string {
  // Match ${variable} or ${variable:default}
  return prompt.replace(/\$\{([^}:]+)(?::([^}]*))?\}/g, (match, varName, defaultValue) => {
    // Use default value if provided, otherwise use placeholder
    return defaultValue || `(example ${varName})`;
  });
}


export function MediaGenerator({
  prompt,
  mediaType,
  onMediaGenerated,
  onUploadClick,
  inputImageUrl,
}: MediaGeneratorProps) {
  const t = useTranslations("prompts");
  const { data: session } = useSession();
  const actorId = session?.user?.id ?? null;
  const actorRef = useRef(actorId);
  actorRef.current = actorId;
  const operationRef = useRef(0);
  const [models, setModels] = useState<MediaGeneratorModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<MediaGeneratorModel | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [statusKey, setStatusKey] = useState<GenerationStatusKey | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  // Get translated status message
  const statusMessage = statusKey ? t(`mediaGeneration.${statusKey}`) : "";
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayResolveRef = useRef<(() => void) | null>(null);
  const [knownFailed, setKnownFailed] = useState(false);
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const terminalRef = useRef(false);
  const requestRef = useRef<SavedMediaRequest | null>(null);
  const [savedRequests, setSavedRequests] = useState<SavedMediaRequest[]>([]);
  const storageKey = `ans-media-request-v2:${actorId}:${mediaType}`;
  const loadSavedRequests = useCallback(() => {
    if (!actorId) { setSavedRequests([]); return; }
    const saved: SavedMediaRequest[] = [];
    try {
      for (let index = 0; index < sessionStorage.length; index++) {
        const name = sessionStorage.key(index);
        const prefix = name?.startsWith(`${storageKey}:`) ? storageKey : name?.startsWith(`${legacyStorageKey}:`) ? legacyStorageKey : null;
        if (!name || !prefix) continue;
        const item = savedMediaRequest(sessionStorage.getItem(name), name.slice(prefix.length + 1));
        if (item && !saved.some(request => request.key === item.key)) saved.push({ ...item, legacy: prefix === legacyStorageKey });
      }
    } catch { /* unavailable or corrupt storage cannot start a new request */ }
    setSavedRequests(saved);
  }, [actorId, storageKey]);
  useEffect(() => { loadSavedRequests(); }, [loadSavedRequests]);

  const stopTracking = useCallback(() => {
    activeRef.current = false;
    operationRef.current++;
    busyRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    delayResolveRef.current?.();
    delayResolveRef.current = null;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onopen = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    stopTracking();
    requestRef.current = null;
    setSelectedModel(null); setStatus("idle"); setKnownFailed(false);
    setError(null); setProgress(null); setStatusKey(null);
  }, [actorId, mediaType, stopTracking]);

  // Fetch available models for the current member only.
  useEffect(() => {
    let cancelled = false;
    setModels([]); setIsLoading(true);
    async function fetchModels() {
      try {
        if (!actorId) return;
        const response = await fetch("/api/media-generate", { headers: { "x-ans-actor": actorId } });
        if (response.ok) {
          const data = await response.json();
          const relevantModels = mediaType === "IMAGE" 
            ? data.imageModels 
            : mediaType === "VIDEO" 
              ? data.videoModels 
              : data.audioModels;
          if (!cancelled) setModels(relevantModels || []);
        }
      } catch {
        // Do not expose network diagnostics or obsolete account responses.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void fetchModels();
    return () => { cancelled = true; };
  }, [mediaType, actorId]);

  useEffect(() => () => { stopTracking(); }, [stopTracking]);

  const handleGenerate = async (recovery?: SavedMediaRequest) => {
    if (!actorId || (!recovery && !selectedModel) || busyRef.current) return;
    stopTracking();
    busyRef.current = true;
    const operation = operationRef.current;
    const isCurrent = () => activeRef.current && operationRef.current === operation && actorRef.current === actorId;
    activeRef.current = true;
    terminalRef.current = false;
    setKnownFailed(false);
    setStatus("starting");
    setError(null);
    setProgress(null);
    setStatusKey("connecting");
    const input = selectedModel ? {
      prompt: fillPromptVariables(prompt), model: selectedModel.id,
      provider: selectedModel.provider, type: selectedModel.type,
      inputImageUrl, resolution: "1K", aspectRatio,
    } : null;
    let message = t("generationConnectionFailed");
    try {
      // Recovery always reads an existing reservation. It remains available
      // without models and cannot accidentally submit an unconfigured new job.
      let currentRequest = recovery;
      if (!currentRequest) {
        if (!input) return;
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(input)));
        if (!isCurrent()) return;
        const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
        let saved = requestRef.current?.hash === hash ? requestRef.current : null;
        try {
          saved = savedMediaRequest(sessionStorage.getItem(`${storageKey}:${hash}`), hash) || saved;
          if (!saved) {
            const legacy = savedMediaRequest(sessionStorage.getItem(`${legacyStorageKey}:${hash}`), hash);
            if (legacy) saved = { ...legacy, legacy: true };
          }
        } catch { /* memory fallback */ }
        currentRequest = saved || { hash, key: crypto.randomUUID() };
        if (!currentRequest.legacy) {
          try { sessionStorage.setItem(`${storageKey}:${hash}`, JSON.stringify(currentRequest)); } catch { /* memory fallback */ }
        }
        loadSavedRequests();
      }
      requestRef.current = currentRequest;
      if (!isCurrent()) return;
      let response: Response;
      let data;
      if (currentRequest.legacy) {
        // Version one had no owner. Only a server read under this account can
        // establish ownership; never replay an unverified legacy key as a POST.
        response = await fetch(`/api/media-generate?key=${encodeURIComponent(currentRequest.key)}`, { headers: { "x-ans-actor": actorId } });
        data = await response.json();
        if (!isCurrent()) return;
        const owned = response.ok || (response.status === 409 && data.error === "MEDIA_SUBMISSION_NOT_ACCEPTED");
        if (owned) {
          if (data.type !== mediaType.toLowerCase()) throw new Error("MEDIA_TYPE_CHANGED");
          const previous = currentRequest;
          currentRequest = { hash: previous.hash, key: previous.key };
          requestRef.current = currentRequest;
          try {
            sessionStorage.setItem(`${storageKey}:${previous.hash}`, JSON.stringify(currentRequest));
            const stored = savedMediaRequest(sessionStorage.getItem(`${legacyStorageKey}:${previous.hash}`), previous.hash);
            if (stored?.key === previous.key) sessionStorage.removeItem(`${legacyStorageKey}:${previous.hash}`);
          } catch { /* Keep the legacy record if storage migration is unavailable. */ }
          loadSavedRequests();
        } else if (!recovery && response.status === 404 && data.error === "TASK_NOT_FOUND") {
          // Another member's legacy record is retained for that member. The
          // current member already explicitly confirmed a new request.
          currentRequest = { hash: currentRequest.hash, key: crypto.randomUUID() };
          requestRef.current = currentRequest;
          try { sessionStorage.setItem(`${storageKey}:${currentRequest.hash}`, JSON.stringify(currentRequest)); } catch { /* memory fallback */ }
          loadSavedRequests();
          response = await fetch("/api/media-generate", { method: "POST", headers: { "Content-Type": "application/json", "x-ans-actor": actorId }, body: JSON.stringify({ ...input, idempotencyKey: currentRequest.key }) });
          data = await response.json();
        }
      } else {
        response = recovery
          ? await fetch(`/api/media-generate?key=${encodeURIComponent(currentRequest.key)}`, { headers: { "x-ans-actor": actorId } })
          : await fetch("/api/media-generate", { method: "POST", headers: { "Content-Type": "application/json", "x-ans-actor": actorId }, body: JSON.stringify({ ...input, idempotencyKey: currentRequest.key }) });
        data = await response.json();
      }
      const { hash, key } = currentRequest;
      // 202 is an existing reservation, not a new provider task. Read it until
      // submission is known; never resubmit with a fresh key on a lost response.
      while (response.status === 202) {
        if (!isCurrent()) return;
        if (data.requiresReview) {
          message = t("generationReviewRequired");
          throw new Error("REVIEW_REQUIRED");
        }
        setStatusKey("accepted");
        await new Promise<void>(resolve => { delayResolveRef.current = resolve; timerRef.current = setTimeout(() => { delayResolveRef.current = null; resolve(); }, 2000); });
        if (!isCurrent()) return;
        response = await fetch(`/api/media-generate?key=${encodeURIComponent(key)}`, { headers: { "x-ans-actor": actorId } });
        data = await response.json();
      }
      if (!isCurrent()) return;
      if (!response.ok) {
        setKnownFailed(data.error === "MEDIA_SUBMISSION_NOT_ACCEPTED");
        message = data.error === "MEDIA_NO_CREDITS" ? t("generationNoCredits")
          : data.error === "MEDIA_SUBMISSION_NOT_ACCEPTED" ? t("generationNotAccepted")
          : t("generationConnectionFailed");
        throw new Error("SUBMISSION_FAILED");
      }
      const { socketAccessToken, webSocketUrl, provider, taskSig } = data;
      if (typeof socketAccessToken !== "string" || typeof taskSig !== "string" || typeof provider !== "string" || typeof webSocketUrl !== "string") {
        throw new Error("INVALID_TASK");
      }
      const handleComplete = (urls: string[]) => {
        if (!isCurrent() || terminalRef.current) return;
        const validUrls = urls.filter(url => { try { return ["http:", "https:"].includes(new URL(url).protocol); } catch { return false; } });
        if (!validUrls.length) { setStatus("error"); setError(t("generationConnectionFailed")); stopTracking(); return; }
        terminalRef.current = true;
        setStatus("completed");
        setProgress(100);
        setStatusKey("complete");
        if (validUrls.length) { onMediaGenerated(validUrls[0]); toast.success(t("mediaGenerated")); }
        requestRef.current = null;
        try {
          const stored = JSON.parse(sessionStorage.getItem(`${storageKey}:${hash}`) || "null");
          if (stored?.key === key) sessionStorage.removeItem(`${storageKey}:${hash}`);
        } catch { /* storage may be unavailable */ }
        loadSavedRequests();
        stopTracking();
      };
      setStatus("queued");
      setStatusKey("queued");
      if (!webSocketUrl) {
        const pollStatus = async () => {
          if (!isCurrent()) return;
          try {
            const result = await fetch(`/api/media-generate/status?provider=${encodeURIComponent(provider)}&token=${encodeURIComponent(socketAccessToken)}&sig=${encodeURIComponent(taskSig)}`);
            if (!result.ok) throw new Error("STATUS_FAILED");
            const update = await result.json();
            if (!isCurrent()) return;
            setProgress(typeof update.progress === "number" && Number.isFinite(update.progress) && update.progress >= 0 && update.progress <= 100 ? update.progress : null);
            if (update.statusKey) setStatusKey(update.statusKey);
            if (update.status === "completed") { handleComplete(update.outputUrls || []); return; }
            if (update.status === "failed") {
              terminalRef.current = true;
              setKnownFailed(true);
              setStatus("error"); setError(t("generationProviderFailed")); stopTracking(); return;
            }
            setStatus(update.status === "in_queue" ? "queued" : "processing");
            timerRef.current = setTimeout(() => { void pollStatus(); }, 2000);
          } catch {
            if (!isCurrent()) return;
            setStatus("error"); setError(t("generationConnectionFailed")); stopTracking();
          }
        };
        void pollStatus();
      } else {
        const handler = getProviderWebSocketHandler(provider);
        const ws = new WebSocket(webSocketUrl);
        wsRef.current = ws;
        const callbacks: WebSocketCallbacks = {
          setProgress, setStatus, setStatusMessage: setStatusKey,
          setError: code => {
            if (!isCurrent()) return;
            terminalRef.current = true;
            setKnownFailed(code === "MEDIA_PROVIDER_FAILED");
            setStatus("error"); setError(t(code === "MEDIA_PROVIDER_FAILED" ? "generationProviderFailed" : "generationConnectionFailed"));
          },
          onComplete: handleComplete,
          onCleanup: () => {
            if (!terminalRef.current) { setStatus("error"); setError(t("generationConnectionFailed")); }
            stopTracking();
          },
        };
        ws.onopen = () => {
          if (!isCurrent()) return;
          const init = handler.getInitMessage(socketAccessToken);
          if (init) ws.send(init);
          setStatusKey("connected");
        };
        ws.onmessage = event => { if (isCurrent()) handler.handleMessage(event, callbacks); };
        ws.onerror = () => { if (!isCurrent()) return; setStatus("error"); setError(t("generationConnectionFailed")); stopTracking(); };
        ws.onclose = () => {
          if (isCurrent() && !terminalRef.current) { setStatus("error"); setError(t("generationConnectionFailed")); stopTracking(); }
        };
      }
    } catch {
      if (isCurrent()) { setStatus("error"); setError(message); stopTracking(); }
    } finally { if (operationRef.current === operation) busyRef.current = false; }
  };

  const handleConfirmGenerate = () => {
    setStatus("confirming");
  };

  const handleCancelGeneration = () => {
    setStatus("idle");
    setSelectedModel(null);
    setError(null);
    setProgress(null);
    setStatusKey(null);
    stopTracking();
  };

  const isGenerating = status === "starting" || status === "queued" || status === "processing";

  const recoveryControls = savedRequests.length > 0 && !isGenerating && status === "idle" && (
    <div className="flex flex-wrap gap-2">
      {savedRequests.map(request => <Button key={request.key} type="button" variant="outline" size="sm" onClick={() => { void handleGenerate(request); }} aria-label={t("resumeGeneration")}>
        {t("resumeGeneration")}{savedRequests.length > 1 ? ` · ${request.key.slice(0, 8)}` : ""}
      </Button>)}
    </div>
  );

  // Group models by provider
  const modelsByProvider = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, MediaGeneratorModel[]>);

  const providerDisplayName = selectedModel?.providerName || selectedModel?.provider || "";

  return (
    <>
      {recoveryControls}
      <div className="flex flex-wrap items-center gap-2">
        {!isLoading && models.length === 0 ? <Button type="button" variant="outline" size="sm" onClick={onUploadClick}><Upload className="h-4 w-4 mr-2" />{t("uploadMedia")}</Button> : <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" disabled={isGenerating || isLoading || !actorId}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  {t("generateMedia")}
                  <ChevronDown className="h-3 w-3 ml-2" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>{t("chooseGenerator")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
              <div key={provider}>
                <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>{providerModels[0]?.providerName || provider}</span>
                  {providerModels[0]?.providerLogo && (
                    providerModels[0]?.providerLogoDark ? (
                      <>
                        <Image
                          src={providerModels[0].providerLogo}
                          alt={providerModels[0].providerName}
                          width={36}
                          height={12}
                          className="h-3 w-auto dark:hidden"
                        />
                        <Image
                          src={providerModels[0].providerLogoDark}
                          alt={providerModels[0].providerName}
                          width={36}
                          height={12}
                          className="h-3 w-auto hidden dark:block"
                        />
                      </>
                    ) : (
                      <Image
                        src={providerModels[0].providerLogo}
                        alt={providerModels[0].providerName}
                        width={36}
                        height={12}
                        className="h-3 w-auto dark:invert"
                      />
                    )
                  )}
                </DropdownMenuLabel>
                {providerModels.map((model) => (
                  <DropdownMenuItem
                    key={`${provider}-${model.id}`}
                    onClick={() => {
                      setSelectedModel(model);
                      handleConfirmGenerate();
                    }}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    {model.name}
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onUploadClick}>
              <Upload className="h-4 w-4 mr-2" />
              {t("uploadInstead")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>}

        {isGenerating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={status === "confirming"} onOpenChange={(open) => !open && handleCancelGeneration()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmGeneration")}</DialogTitle>
            <DialogDescription>
              {t("confirmGenerationDescription", { 
                provider: providerDisplayName,
                model: selectedModel?.name || ""
              })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            <div className="text-sm">
              <span className="font-medium">{t("promptPreview")}:</span>
              <p className="mt-1 p-2 rounded bg-muted text-muted-foreground text-xs line-clamp-3">
                {prompt || t("noPromptProvided")}
              </p>
            </div>
            
            {inputImageUrl && (
              <div className="text-sm">
                <span className="font-medium">{t("inputImage")}:</span>
                <img 
                  src={inputImageUrl} 
                  alt="Input" 
                  className="mt-1 max-h-20 rounded border"
                />
              </div>
            )}

            {/* Aspect Ratio selector for image and video generation (not for audio) */}
            {selectedModel && selectedModel.type !== "audio" && (
              <div className="text-sm">
                <span className="font-medium">{t("aspectRatio")}:</span>
                <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as AspectRatio)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((ar) => (
                      <SelectItem key={ar.value} value={ar.value}>
                        {ar.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancelGeneration}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={() => { void handleGenerate(); }} disabled={!prompt}>
              <Wand2 className="h-4 w-4 mr-2" />
              {t("startGeneration")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Dialog */}
      <Dialog open={isGenerating} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("generatingMedia", { provider: providerDisplayName })}
            </DialogTitle>
            <DialogDescription>
              {t("generationCanResume")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {progress !== null && <Progress value={progress} className="h-2" />}
            <p className="text-sm text-center text-muted-foreground">
              {statusMessage}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result/Error Dialog */}
      <Dialog open={status === "completed" || status === "error"} onOpenChange={handleCancelGeneration}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {status === "completed" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  {t("generationComplete")}
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  {t("generationFailed")}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {status === "error" && error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          
          {status === "completed" && (
            <p className="text-sm text-muted-foreground">
              {t("mediaAddedToPrompt")}
            </p>
          )}

          <DialogFooter>
            <Button type="button" onClick={handleCancelGeneration}>
              {t("close")}
            </Button>
            {status === "error" && requestRef.current && (
              <Button type="button" variant="outline" onClick={() => {
                if (knownFailed && selectedModel && requestRef.current) {
                  try { sessionStorage.removeItem(`${storageKey}:${requestRef.current.hash}`); } catch { /* memory fallback */ }
                  requestRef.current = null;
                  loadSavedRequests();
                  setStatus("confirming");
                  setKnownFailed(false);
                  return;
                }
                if (requestRef.current) void handleGenerate(requestRef.current);
              }}>
                {t(knownFailed && selectedModel ? "newGeneration" : "resumeGeneration")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
