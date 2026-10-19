"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Copy, Eye, EyeOff, RefreshCw, Trash2, Key, Loader2 } from "lucide-react";
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
import { toast } from "sonner";
import { AccountContentBoundary } from "@/components/auth/account-content-boundary";

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
const HIDDEN_KEY_MASK = `${"ans_"}${"•".repeat(24)}`;

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
  const generateKey = async () => {
    const data = await mutate("POST");
    if (!data || !alive.current) return;
    setApiKey(data.apiKey); setHasKey(true); setShowKey(true);
    toast.success(t("keyGenerated"));
  };
  const regenerateKey = async () => {
    const data = await mutate("POST");
    if (!data || !alive.current) return;
    setApiKey(data.apiKey); setHasKey(true); setShowKey(true);
    toast.success(t("keyRegenerated"));
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
  const copyToClipboard = async () => {
    if (!apiKey) return;
    try { await navigator.clipboard.writeText(apiKey); if (alive.current) toast.success(tCommon("copied")); }
    catch { if (alive.current) toast.error(tCommon("error")); }
  };

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 10)}${"•".repeat(32)}${apiKey.slice(-8)}`
    : HIDDEN_KEY_MASK;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Key className="h-4 w-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg border p-3">
          <Label>{t("codexTitle")}</Label>
          <p className="text-sm text-muted-foreground">{t("codexDescription")}</p>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{`model = "gpt-6.1-sol"
model_provider = "ans"
model_context_window = 100000
model_auto_compact_token_limit = 80000

[model_providers.ans]
name = "ANS"
base_url = "${origin}/api/codex/v1"
wire_api = "responses"
env_key = "ANS_API_KEY"
requires_openai_auth = false
supports_websockets = false
request_max_retries = 0
stream_max_retries = 0`}</pre>
          <p className="text-xs text-muted-foreground">{t("codexLimits")}</p>
        </div>
        {hasKey ? (
          <>
            <div className="space-y-2">
              <Label>{t("yourApiKey")}</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono overflow-hidden text-ellipsis">
                  {apiKey ? (showKey ? apiKey : maskedKey) : HIDDEN_KEY_MASK}
                </code>
                {apiKey && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowKey(!showKey)}
                    aria-label={t(showKey ? "hideKey" : "showKey")}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  aria-label={t("copyKey")}
                  disabled={!apiKey}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {!apiKey && (
                <p className="text-xs text-muted-foreground">
                  {t("keyHiddenHint")}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{t("keyWarning")}</p>
              <p className="text-xs text-muted-foreground">{t("spendWarning")}</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="public-default">{t("publicByDefault")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("publicByDefaultDescription")}
                </p>
              </div>
              <Switch
                id="public-default"
                checked={publicByDefault}
                onCheckedChange={updatePublicDefault}
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={isLoading}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t("regenerate")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("regenerateTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("regenerateDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={regenerateKey}>
                      {t("regenerate")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

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
                    <AlertDialogDescription>
                      {t("revokeDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={revokeKey}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      {t("revoke")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t("noApiKey")}
            </p>            <Button onClick={generateKey} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              {t("generate")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
