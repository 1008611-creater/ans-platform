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

  it("shows review controls for an admin reviewing their own workflow", () => {
    render(<WorkflowActions slug="weekly" mode="review" canPublish version={2} reviewRequestId="00000000-0000-4000-8000-000000000001" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "验收通过" } });

    expect(screen.getByRole("button", { name: "复核通过并发布" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "驳回" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "重新 AI 初审" })).toBeEnabled();
    expect(screen.queryByText("这是你创建的工作流，不能自审，请其他管理员处理。")).not.toBeInTheDocument();
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


describe("workflow review snapshot and published update recovery", () => {
  it("posts the displayed version and review request with the moderation decision", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true })); vi.stubGlobal("fetch", fetchMock);
    render(<WorkflowActions slug="weekly" mode="review" canPublish version={2} reviewRequestId="00000000-0000-4000-8000-000000000001" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "verified" } });
    fireEvent.click(screen.getByRole("button", { name: "复核通过并发布" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ action: "publish", note: "verified", expectedVersion: 2, expectedReviewRequestId: "00000000-0000-4000-8000-000000000001" });
  });
  it("does not confuse the old published version with a lost new submission", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("network failed")).mockResolvedValueOnce(jsonResponse(200, { ok: true, data: { workflow: { status: "PUBLISHED", publishedVersion: 1, reviewScore: null } } }));
    vi.stubGlobal("fetch", fetchMock); render(<WorkflowActions slug="weekly" mode="submit" version={2} />);
    fireEvent.click(screen.getByRole("button", { name: "提交审核" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("尚未提交"));
    expect(screen.getByRole("button", { name: "提交审核" })).toBeEnabled();
  });
  it("confirms the matching new review while the old version stays published", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("network failed")).mockResolvedValueOnce(jsonResponse(200, { ok: true, data: { workflow: { status: "PUBLISHED", publishedVersion: 1, reviewScore: { reviewVersion: 2, reviewPending: true } } } }));
    vi.stubGlobal("fetch", fetchMock); render(<WorkflowActions slug="weekly" mode="submit" version={2} />);
    fireEvent.click(screen.getByRole("button", { name: "提交审核" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("已确认提交成功"));
    expect(screen.getByRole("button", { name: "提交审核" })).toBeDisabled();
  });
});
