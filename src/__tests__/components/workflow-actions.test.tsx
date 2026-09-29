import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { WorkflowActions } from "@/components/workflows/workflow-actions";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function jsonResponse(status: number, data: unknown) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

describe("workflow submit reconciliation", () => {
  it("checks the saved status after a network error and avoids a duplicate submission", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true, data: { workflow: { status: "PENDING" } } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkflowActions slug="weekly" mode="submit" />);

    fireEvent.click(screen.getByRole("button", { name: "\u63d0\u4ea4\u5ba1\u6838" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("PENDING"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/workflows/weekly?scope=mine");
    expect(screen.getByRole("button", { name: "\u63d0\u4ea4\u5ba1\u6838" })).toBeDisabled();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/submit"))).toHaveLength(1);
  });

  it("allows retry only after the status endpoint confirms the submission did not persist", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true, data: { workflow: { status: "DRAFT" } } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkflowActions slug="weekly" mode="submit" />);

    fireEvent.click(screen.getByRole("button", { name: "\u63d0\u4ea4\u5ba1\u6838" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("DRAFT"));
    expect(screen.getByRole("button", { name: "\u63d0\u4ea4\u5ba1\u6838" })).toBeEnabled();
  });

  it("blocks resubmission when status cannot be confirmed and offers a status lookup", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true, data: { workflow: { status: "PENDING" } } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkflowActions slug="weekly" mode="submit" />);

    fireEvent.click(screen.getByRole("button", { name: "\u63d0\u4ea4\u5ba1\u6838" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "\u91cd\u65b0\u67e5\u8be2\u72b6\u6001" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "\u63d0\u4ea4\u5ba1\u6838" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "\u91cd\u65b0\u67e5\u8be2\u72b6\u6001" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("PENDING"));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reconciles a server error because the request may have committed before the error", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(500, { ok: false }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true, data: { workflow: { status: "PENDING" } } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkflowActions slug="weekly" mode="submit" />);

    fireEvent.click(screen.getByRole("button", { name: "\u63d0\u4ea4\u5ba1\u6838" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("PENDING"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
