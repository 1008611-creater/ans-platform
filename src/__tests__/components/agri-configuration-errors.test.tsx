import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgriOnsite } from "@/components/competitions/agri-onsite";
import { AgriDemoChecks } from "@/components/competitions/agri-demo-checks";
import { AgriRecordArchives } from "@/components/competitions/agri-record-archives";
import { syncAgriOnsiteActor } from "@/components/competitions/agri-onsite-recovery";
import { syncAgriDemoActor } from "@/components/competitions/agri-demo-recovery";
import { syncAgriArchiveActor } from "@/components/competitions/agri-record-archive-recovery";
import zh from "../../../messages/product/zh.json";
import en from "../../../messages/product/en.json";

const state = vi.hoisted(() => ({ locale: "zh" as "zh" | "en" }));
const navigation = { register: () => () => {}, run: (action: () => void) => action() };
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated", data: { user: { id: "actor-configuration" } } }) }));
vi.mock("@/components/providers/workspace-navigation", () => ({
  useWorkspaceNavigation: () => navigation,
  WorkspaceLink: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("next-intl", () => ({
  useLocale: () => state.locale,
  useTranslations: (namespace: string) => {
    const root = state.locale === "zh" ? zh : en;
    const lookup = (key: string) => [...namespace.split(".").slice(1), ...key.split(".")].reduce<unknown>(
      (value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, root,
    );
    const t = (key: string, values?: Record<string, string | number>) => {
      let text = String(lookup(key) ?? key);
      for (const [name, value] of Object.entries(values ?? {})) text = text.replaceAll("{" + name + "}", String(value));
      return text;
    };
    t.has = (key: string) => typeof lookup(key) === "string";
    return t;
  },
}));

const resetActors = (actor: string | null) => {
  syncAgriOnsiteActor(actor);
  syncAgriDemoActor(actor);
  syncAgriArchiveActor(actor);
};
beforeEach(() => { resetActors(null); resetActors("actor-configuration"); });
afterEach(() => { cleanup(); resetActors(null); vi.unstubAllGlobals(); });
const namespaces = ["agriOnsite", "agriDemo", "agriArchives"] as const;
const codes = ["AGRI_EDITION_NOT_CONFIGURED", "AGRI_WORKSPACE_NOT_CONFIGURED"] as const;

describe.each(["zh", "en"] as const)("%s missing competition configuration", locale => {
  it.each(namespaces.flatMap(namespace => codes.map(code => ({ namespace, code }))))(
    "$namespace shows $code without a temporary failure or writable form",
    async ({ namespace, code }) => {
      state.locale = locale;
      const copy = (locale === "zh" ? zh : en)[namespace];
      const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: false, error: { code } }), { status: 503 }));
      vi.stubGlobal("fetch", fetcher);
      if (namespace === "agriOnsite") render(<AgriOnsite initialScope="onsite" />);
      else if (namespace === "agriDemo") {
        render(<AgriDemoChecks actorId="actor-configuration" submissionId="submission-configuration" scope="staff" invalidate={vi.fn()} />);
        expect(fetcher).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: (locale === "zh" ? zh : en).agriDemo.open }));
      } else {
        render(<AgriRecordArchives actorId="actor-configuration" submissionId="submission-configuration" invalidate={vi.fn()} />);
        expect(fetcher).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: (locale === "zh" ? zh : en).agriArchives.open }));
      }
      expect(await screen.findByRole("alert")).toHaveTextContent(copy.errors[code]);
      expect(screen.queryByText(copy.errors.INTERNAL_ERROR)).toBeNull();
      expect(fetcher).toHaveBeenCalledOnce();
      const product = locale === "zh" ? zh : en;
      for (const name of [product.agriOnsite.create, product.agriOnsite.save, product.agriDemo.record, product.agriArchives.save]) {
        expect(screen.queryByRole("button", { name })).toBeNull();
      }
    },
  );
});