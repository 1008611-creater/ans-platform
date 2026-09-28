import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStudio, type ProjectView } from "@/components/projects/project-studio";

const project: ProjectView = {
  id: "project-1",
  title: "Campus exchange",
  goal: "career",
  facts: [
    { key: "problem", label: "Problem", hint: "", value: "Textbooks are hard to exchange", evidenceUrl: "", confirmation: "unconfirmed" },
    { key: "contribution", label: "Contribution", hint: "", value: "I organized the requirements", evidenceUrl: "", confirmation: "unconfirmed" },
    { key: "method", label: "Method", hint: "", value: "A web application", evidenceUrl: "", confirmation: "unconfirmed" },
    { key: "result", label: "Result", hint: "", value: "No measured result yet", evidenceUrl: "", confirmation: "unconfirmed" },
    { key: "evidence", label: "Evidence", hint: "", value: "Local acceptance run", evidenceUrl: "", confirmation: "unconfirmed" },
  ],
  artifacts: [],
};

const requests: Array<{ url: string; body: Record<string, unknown> }> = [];

beforeEach(() => {
  requests.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    });
    return {
      ok: true,
      json: async () => ({ ok: true, data: {} }),
    } as Response;
  }));
});

describe("ProjectStudio", () => {
  it("keeps confirmed facts confirmed when generation saves them again", async () => {
    const user = userEvent.setup();
    render(<ProjectStudio project={project} />);

    await user.click(screen.getByRole("button", { name: new RegExp("\\u786e\\u8ba4\\u4e8b\\u5b9e") }));
    await screen.findByText(new RegExp("\\u4e8b\\u5b9e\\u5df2\\u786e\\u8ba4"));
    await user.click(screen.getByRole("button", { name: new RegExp("\\u7b80\\u5386\\u9879\\u76ee\\u6761\\u76ee") }));

    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[0].url).toBe("/api/projects/project-1/facts");
    expect(requests[1].url).toBe("/api/projects/project-1/facts");
    expect(requests[2].url).toBe("/api/projects/project-1/runs");

    for (const request of requests.slice(0, 2)) {
      expect(request.body.facts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: "problem", confirmation: "confirmed" }),
          expect.objectContaining({ key: "contribution", confirmation: "confirmed" }),
          expect.objectContaining({ key: "method", confirmation: "confirmed" }),
          expect.objectContaining({ key: "result", confirmation: "confirmed" }),
          expect.objectContaining({ key: "evidence", confirmation: "confirmed" }),
        ]),
      );
    }
  });

  it("marks an edited confirmed fact unconfirmed before the next save", async () => {
    const user = userEvent.setup();
    const confirmedProject = {
      ...project,
      facts: project.facts.map((fact) => ({ ...fact, confirmation: "confirmed" as const })),
    };
    render(<ProjectStudio project={confirmedProject} />);

    const problemField = screen.getAllByRole("textbox")[0];
    await user.clear(problemField);
    await user.type(problemField, "A revised problem statement");
    await user.click(screen.getByRole("button", { name: new RegExp("\\u4fdd\\u5b58\\u4e8b\\u5b9e") }));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].body.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "problem", confirmation: "unconfirmed" }),
      ]),
    );
  });
});


