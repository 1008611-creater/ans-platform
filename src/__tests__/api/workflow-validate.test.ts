import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/workflows/validate/route";

const request = (body: unknown) =>
  new Request("http://localhost/api/workflows/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/workflows/validate", () => {
  it("returns an execution order for a valid workflow", async () => {
    const response = await POST(
      request({
        version: 1,
        nodes: [
          { id: "input", type: "prompt", label: "Input", config: {} },
          { id: "output", type: "output", label: "Output", config: {} },
        ],
        edges: [{ id: "input-output", from: "input", to: "output" }],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.order).toEqual(["input", "output"]);
    expect(body.requestId).toEqual(expect.any(String));
  });

  it("returns a structured validation error for cycles", async () => {
    const response = await POST(
      request({
        version: 1,
        nodes: [
          { id: "a", type: "prompt", label: "A", config: {} },
          { id: "b", type: "prompt", label: "B", config: {} },
        ],
        edges: [
          { id: "ab", from: "a", to: "b" },
          { id: "ba", from: "b", to: "a" },
        ],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("WORKFLOW_INVALID");
    expect(body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "cycle" })]),
    );
  });
});

