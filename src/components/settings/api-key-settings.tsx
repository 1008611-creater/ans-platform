"use client";

import { useState } from "react";
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

interface ApiKeySettingsProps {
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

export function ApiKeySettings({
  initialApiKey = null,
  hasExistingKey,
  initialPublicByDefault,
}: ApiKeySettingsProps) {
  const t = useTranslations("apiKey");
  const tCommon = useTranslations("common");
  const [apiKey, setApiKey] = useState<string | null>(initialApiKey);
  const [hasKey, setHasKey] = useState(hasExistingKey);
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [publicByDefault, setPublicByDefault] = useState(initialPublicByDefault);

  const generateKey = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/api-key", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to generate API key");
      const data = await response.json();
      setApiKey(data.apiKey);
      setHasKey(true);
      setShowKey(true);
      toast.success(t("keyGenerated"));
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateKey = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/api-key", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to regenerate API key");
      const data = await response.json();
      setApiKey(data.apiKey);
      setHasKey(true);
      setShowKey(true);
      toast.success(t("keyRegenerated"));
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setIsLoading(false);
    }
  };

  const revokeKey = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/api-key", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to revoke API key");
      setApiKey(null);
      setHasKey(false);
      setShowKey(false);
      toast.success(t("keyRevoked"));
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setIsLoading(false);
    }
  };

  const updatePublicDefault = async (value: boolean) => {
    try {
      const response = await fetch("/api/user/api-key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mcpPromptsPublicByDefault: value }),
      });
      if (!response.ok) throw new Error("Failed to update setting");
      setPublicByDefault(value);
      toast.success(t("settingUpdated"));
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast.success(tCommon("copied"));
    }
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
