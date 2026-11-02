import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const m = vi.hoisted(() => ({ session: { user: { id: "member-a" } } as { user: { id: string } } | null, fetch: vi.fn(), success: vi.fn(), error: vi.fn(), refresh: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: m.session, status: m.session ? "authenticated" : "unauthenticated" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("sonner", () => ({ toast: { success: m.success, error: m.error } }));
import { ApiKeySettings } from "@/components/settings/api-key-settings";
const props = { actorId: "member-a", hasExistingKey: false, initialPublicByDefault: false };
beforeEach(() => { vi.resetAllMocks(); m.session = { user: { id: "member-a" } }; vi.stubGlobal("fetch", m.fetch); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("API key account safety", () => {
  it("binds mutations to the rendered account and never renders the stored hash", async () => {
    m.fetch.mockResolvedValue(Response.json({ apiKey: "isolated-fixture-key" }));
    render(<ApiKeySettings {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "generate" }));
    await screen.findByText("isolated-fixture-key");
    expect(m.fetch).toHaveBeenCalledWith("/api/user/api-key", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "x-ans-actor": "member-a" }) }));
    expect(screen.getByRole("button", { name: "hideKey" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "copyKey" })).toBeTruthy();
  });
  it("unmounts private key state on account change and ignores a late generation", async () => {
    let resolve!: (value: Response) => void;
    m.fetch.mockReturnValue(new Promise<Response>(r => { resolve = r; }));
    const view = render(<ApiKeySettings {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "generate" }));
    await waitFor(() => expect(m.fetch).toHaveBeenCalledTimes(1));
    const signal = m.fetch.mock.calls[0][1].signal as AbortSignal;
    m.session = { user: { id: "member-b" } };
    view.rerender(<ApiKeySettings {...props} />);
    expect(screen.getByRole("alert").textContent).toBe("changed");
    expect(signal.aborted).toBe(true);
    await act(async () => { resolve(Response.json({ apiKey: "late-private-fixture" })); });
    expect(screen.queryByText("late-private-fixture")).toBeNull();
    expect(m.success).not.toHaveBeenCalled();
    m.session = { user: { id: "member-a" } };
    view.rerender(<ApiKeySettings {...props} />);
    expect(screen.getByRole("button", { name: "generate" })).toBeTruthy();
    expect(screen.queryByText("late-private-fixture")).toBeNull();
  });
  it("only reports copying after the clipboard succeeds", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard unavailable"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<ApiKeySettings {...props} initialApiKey="isolated-fixture-key" hasExistingKey />);
    fireEvent.click(screen.getByRole("button", { name: "copyKey" }));
    await waitFor(() => expect(m.error).toHaveBeenCalledWith("copyFailed"));
    expect(m.success).not.toHaveBeenCalled();
    writeText.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole("button", { name: "copyKey" }));
    await waitFor(() => expect(m.success).toHaveBeenCalledWith("copied"));
  });
  it("falls back to execCommand when the Clipboard API is refused", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
    render(<ApiKeySettings {...props} initialApiKey="isolated-fixture-key" hasExistingKey />);
    fireEvent.click(screen.getByRole("button", { name: "copyKey" }));
    await waitFor(() => expect(m.success).toHaveBeenCalledWith("copied"));
    expect(execCommand).toHaveBeenCalledWith("copy");
  });
  it("offers a new key instead of a dead copy button when the stored key cannot be shown", () => {
    render(<ApiKeySettings {...props} hasExistingKey />);
    expect(screen.queryByRole("button", { name: "copyKey" })).toBeNull();
    expect(screen.getByRole("button", { name: "regenerateAndCopy" })).toBeTruthy();
    expect(screen.getByText("keyHiddenHint")).toBeTruthy();
  });
});
