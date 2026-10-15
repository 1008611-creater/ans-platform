"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { computeDeliveryReadSchema, type ComputeDeliveryView } from "@/contracts/compute-delivery";
import { Button } from "@/components/ui/button";

type Props = { userId: string; taskId: string; unit: "image" | "second"; resultUrl?: string | null };
type State = { kind: "idle" | "loading" } | { kind: "loaded"; delivery: ComputeDeliveryView | null }
  | { kind: "error"; reason: "failed" | "accountChanged" | "sessionExpired" };
const responseSchema = z.object({ ok: z.literal(true), data: computeDeliveryReadSchema, requestId: z.string().uuid() }).strict();

/** Owner and task changes discard the previous private result before rendering. */
export function ComputeDeliveryStatus(props: Props) {
  const { data: session, status } = useSession();
  const t = useTranslations("product.computeDelivery");
  if (status !== "authenticated" || session?.user?.id !== props.userId) return <p className="mt-4 text-xs leading-6 text-muted-foreground" role="status">
    {t(status === "loading" ? "checkingAccount" : status === "unauthenticated" ? "sessionExpired" : "accountChanged")}
  </p>;
  return <OwnerDeliveryStatus key={JSON.stringify([props.userId, props.taskId, props.unit])} {...props} />;
}

function OwnerDeliveryStatus({ userId, taskId, unit, resultUrl }: Props) {
  const t = useTranslations("product.computeDelivery"), locale = useLocale(), regionId = useId();
  const [state, setState] = useState<State>({ kind: "idle" });
  const flight = useRef<{ controller: AbortController; timer: ReturnType<typeof setTimeout> } | null>(null);
  useEffect(() => () => {
    if (flight.current) { clearTimeout(flight.current.timer); flight.current.controller.abort(); flight.current = null; }
  }, []);
  async function read() {
    if (flight.current) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (flight.current?.controller === controller) { controller.abort(); flight.current = null; setState({ kind: "error", reason: "failed" }); }
    }, 20_000);
    flight.current = { controller, timer }; setState({ kind: "loading" });
    try {
      const response = await fetch("/api/workspace/compute/" + encodeURIComponent(taskId) + "/delivery", {
        method: "GET", cache: "no-store", credentials: "same-origin", signal: controller.signal,
        headers: { "x-ans-compute-actor": userId, "Accept": "application/json" },
      });
      if (controller.signal.aborted || flight.current?.controller !== controller) return;
      if (!response.ok) {
        setState({ kind: "error", reason: response.status === 401 ? "sessionExpired" : response.status === 409 ? "accountChanged" : "failed" }); return;
      }
      const result = responseSchema.parse(await response.json());
      if (controller.signal.aborted || flight.current?.controller !== controller) return;
      const delivery = result.data.delivery;
      if (result.data.computeTaskId !== taskId || (delivery && delivery.computeTaskId !== taskId)
        || (delivery?.artifact && (unit === "image") !== delivery.artifact.mimeType.startsWith("image/"))) throw new Error("INVALID_RECEIPT_BINDING");
      setState({ kind: "loaded", delivery });
    } catch {
      if (!controller.signal.aborted && flight.current?.controller === controller) setState({ kind: "error", reason: "failed" });
    } finally {
      clearTimeout(timer);
      if (flight.current?.controller === controller) flight.current = null;
    }
  }
  const loaded = state.kind === "loaded";
  const delivery = loaded ? state.delivery : null;
  const artifact = delivery?.artifact;
  return <div className="mt-4 min-w-0 border-t pt-4">
    <Button type="button" size="sm" variant="outline" onClick={() => void read()} disabled={state.kind === "loading"}
      aria-controls={regionId} aria-expanded={state.kind !== "idle"} className="h-auto min-h-9 whitespace-normal py-2 text-start">
      {t(state.kind === "loading" ? "loading" : state.kind === "error" ? "retry" : loaded ? "refresh" : "view")}
    </Button>
    <div id={regionId} aria-busy={state.kind === "loading"} className="mt-2 min-w-0 text-xs leading-6">
      <p role="status" aria-live="polite" aria-atomic="true" className="text-muted-foreground">
        {state.kind === "loading" ? t("loading") : loaded ? t(delivery ? delivery.state === "AVAILABLE" && resultUrl ? "availableToOpen" : "states." + delivery.state : "noRecord") : null}
      </p>
      {state.kind === "error" && <p role="alert" className="text-destructive">{t(state.reason)}</p>}
      {loaded && delivery?.state === "AVAILABLE" && artifact && resultUrl && <Button asChild variant="outline" size="sm" className="mt-3">
        <a href={resultUrl} target="_blank" rel="noopener noreferrer">{t("openResult")}</a>
      </Button>}
      {loaded && artifact && <dl className="mt-3 grid min-w-0 gap-3 rounded-[var(--radius)] bg-muted/40 p-3 sm:grid-cols-2">
        <div className="min-w-0 sm:col-span-2"><dt className="text-muted-foreground">{t("fileName")}</dt><dd className="mt-1 break-all [overflow-wrap:anywhere]"><bdi>{artifact.relativePath}</bdi></dd></div>
        <div className="min-w-0"><dt className="text-muted-foreground">{t("fileType")}</dt><dd className="mt-1 break-all">{artifact.mimeType}</dd></div>
        <div className="min-w-0"><dt className="text-muted-foreground">{t("fileSize")}</dt><dd className="mt-1 tabular-nums">{t("bytes", { value: new Intl.NumberFormat(locale).format(artifact.sizeBytes) })}</dd></div>
      </dl>}
    </div>
  </div>;
}
