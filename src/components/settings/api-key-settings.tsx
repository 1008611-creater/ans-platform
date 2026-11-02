"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Eye, EyeOff, RefreshCw, Trash2, Key, Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import { copyText } from "@/lib/clipboard";

interface ApiKeySettingsProps {
  actorId: string;
  /**
   * A real plaintext key held in memory (only right after generating one).
   * Keys are stored hashed server-side, so on initial load this is always
   * null and `hasExistingKey` carries the "a key is configured" fact instead.
   */
  initialApiKey?: string | null;
  hasExistingKey: boolean;
  initialPublicByDefault: boolean;
}

/** Masked placeholder shown when a key exists but its plaintext isn't in memory. */
const HIDDEN_KEY_MASK = `${"pchat_"}${"•".repeat(24)}`;

/** Copy button whose check mark fades back to the copy icon after 2.5s. */
function CopyButton({ text, label, onCopied }: { text: string | null; label: string; onCopied?: (ok: boolean) => void }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(false), 2500);
    return () => clearTimeout(timer);
  }, [done]);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0"
      aria-label={label}
      disabled={!text}
      onClick={async () => {
        if (!text) return;
        const ok = await copyText(text);
        setDone(ok);
        onCopied?.(ok);
      }}
    >
      {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

export function ApiKeySettings(props: ApiKeySettingsProps) {
  return <AccountContentBoundary actorId={props.actorId}><ApiKeySettingsSession key={props.actorId} {...props} /></AccountContentBoundary>;
}

function ApiKeySettingsSession({
  actorId,
  initialApiKey = null,
  hasExistingKey,
  initialPublicByDefault,
}: ApiKeySettingsProps) {
  const [origin, setOrigin] = useState("https://ans.cauai.fun");
  useEffect(() => setOrigin(window.location.origin), []);
  const t = useTranslations("apiKey");
  const tCommon = useTranslations("common");
  const [apiKey, setApiKey] = useState<string | null>(initialApiKey);
  const [hasKey, setHasKey] = useState(hasExistingKey);
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [publicByDefault, setPublicByDefault] = useState(initialPublicByDefault);

  const alive = useRef(false);
  const flight = useRef(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; active.current?.abort(); };
  }, []);

  async function mutate(method: "POST" | "DELETE" | "PATCH", body?: { mcpPromptsPublicByDefault: boolean }) {
    if (!alive.current || flight.current) return null;
    flight.current = true; setIsLoading(true);
    const controller = new AbortController(); active.current = controller;
    try {
      const response = await fetch("/api/user/api-key", {
        method, cache: "no-store", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "x-ans-actor": actorId },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]),
      });
      if (!response.ok) throw new Error("KEY_UPDATE_FAILED");
      const data = await response.json();
      return alive.current ? data : null;
    } catch {
      if (alive.current) toast.error(tCommon("error"));
      return null;
    } finally {
      active.current = null; flight.current = false;
      if (alive.current) setIsLoading(false);
    }
  }
  /** Generate (or replace) the key, show it, and try to put it on the clipboard right away. */
  const issueKey = async (successMessage: string) => {
    const data = await mutate("POST");
    if (!data || !alive.current) return;
    setApiKey(data.apiKey); setHasKey(true); setShowKey(true);
    const copied = await copyText(data.apiKey);
    if (alive.current) toast.success(copied ? t("keyIssuedCopied") : successMessage);
  };
  const revokeKey = async () => {
    if (!await mutate("DELETE") || !alive.current) return;
    setApiKey(null); setHasKey(false); setShowKey(false);
    toast.success(t("keyRevoked"));
  };
  const updatePublicDefault = async (value: boolean) => {
    if (!await mutate("PATCH", { mcpPromptsPublicByDefault: value }) || !alive.current) return;
    setPublicByDefault(value); toast.success(t("settingUpdated"));
  };
  const reportCopy = (ok: boolean) => {
    if (!alive.current) return;
    if (ok) toast.success(tCommon("copied")); else toast.error(t("copyFailed"));
  };

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 10)}${"•".repeat(32)}${apiKey.slice(-8)}`
    : HIDDEN_KEY_MASK;
  const openAiBase = `${origin}/api/v1`;
  const codexBase = `${origin}/api/codex/v1`;
  const codexConfig = `model = "gpt-6.1-sol"
model_provider = "ans"
model_context_window = 100000
model_auto_compact_token_limit = 80000

[model_providers.ans]
name = "ANS"
base_url = "${codexBase}"
wire_api = "responses"
env_key = "ANS_API_KEY"
requires_openai_auth = false
supports_websockets = false
request_max_retries = 0
stream_max_retries = 0`;

  const regenerateDialog = (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={apiKey ? "outline" : "default"} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {t(apiKey ? "regenerate" : "regenerateAndCopy")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("regenerateTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("regenerateDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => issueKey(t("keyRegenerated"))}>{t("regenerate")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <Card id="api-key" className="scroll-mt-20">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            {t("title")}
          </CardTitle>
          <CardDescription className="text-pretty">{t("description")}</CardDescription>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4 mr-1.5" />
              {t("more")}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{t("moreTitle")}</SheetTitle>
              <SheetDescription>{t("moreDescription")}</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-6">
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t("codexTitle")}</Label>
                  <CopyButton text={codexConfig} label={t("copyConfig")} onCopied={reportCopy} />
                </div>
                <p className="text-sm text-muted-foreground text-pretty">{t("codexDescription")}</p>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{codexConfig}</pre>
                <p className="text-xs text-muted-foreground text-pretty">{t("codexLimits")}</p>
              </section>

              {hasKey && (
                <section className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="public-default">{t("publicByDefault")}</Label>
                    <p className="text-xs text-muted-foreground">{t("publicByDefaultDescription")}</p>
                  </div>
                  <Switch
                    id="public-default"
                    checked={publicByDefault}
                    onCheckedChange={updatePublicDefault}
                    disabled={isLoading}
                  />
                </section>
              )}

              {hasKey && (
                <section className="space-y-2">
                  <Label>{t("revokeSection")}</Label>
                  <p className="text-xs text-muted-foreground">{t("revokeDescription")}</p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={isLoading} className="text-white">
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("revoke")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("revokeTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("revokeDescription")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={revokeKey} className="bg-destructive text-white hover:bg-destructive/90">
                          {t("revoke")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </section>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasKey ? (
          <div className="space-y-2">
            <Label>{t("yourApiKey")}</Label>
            <div className="flex items-center gap-1 rounded-md bg-muted px-3 py-1">
              <code className="flex-1 min-w-0 truncate text-sm font-mono select-all">
                {apiKey ? (showKey ? apiKey : maskedKey) : HIDDEN_KEY_MASK}
              </code>
              {apiKey && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={t(showKey ? "hideKey" : "showKey")}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              )}
              {apiKey && <CopyButton text={apiKey} label={t("copyKey")} onCopied={reportCopy} />}
            </div>
            <p className="text-xs text-muted-foreground text-pretty">
              {apiKey ? t("keyShownOnce") : t("keyHiddenHint")}
            </p>
            {!apiKey && <div>{regenerateDialog}</div>}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("noApiKey")}</p>
            <Button onClick={() => issueKey(t("keyGenerated"))} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
              {t("generate")}
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label>{t("baseUrl")}</Label>
          {[{ label: t("baseUrlOpenAi"), value: openAiBase }, { label: t("baseUrlCodex"), value: codexBase }].map(row => (
            <div key={row.value} className="flex items-center gap-2 rounded-md bg-muted px-3 py-1">
              <span className="shrink-0 text-xs text-muted-foreground">{row.label}</span>
              <code className="flex-1 min-w-0 truncate text-sm font-mono select-all">{row.value}</code>
              <CopyButton text={row.value} label={t("copyBaseUrl")} onCopied={reportCopy} />
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-pretty">{t("spendWarning")}</p>
        {hasKey && apiKey && <div className="flex">{regenerateDialog}</div>}
      </CardContent>
    </Card>
  );
}
