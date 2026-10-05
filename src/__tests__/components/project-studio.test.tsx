import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStudio, type ProjectView } from "@/components/projects/project-studio";
import messages from "../../../messages/learning/zh.json";

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
  useTranslations: () => (key: keyof typeof messages, values?: Record<string, string | number>) => Object.entries(values ?? {}).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), messages[key]),
}));

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
    if (init?.method === "POST") {
      requests.push({
        url: String(input),
        body: JSON.parse(String(init.body ?? "{}")) as Record<string, unknown>,
      });
    }
    return {
      ok: true,
      json: async () => ({ ok: true, data: { id: "v3", version: 3 } }),
    } as Response;
  }));
});

describe("ProjectStudio", () => {
  const withArtifact: ProjectView = { ...project, artifacts: [{ id: "a1", title: "Resume", workflowId: "resume-bullets", currentVersion: 2, versions: [
    { id: "v2", version: 2, markdown: "Latest draft", createdAt: "2026-10-05T00:00:00Z" },
    { id: "v1", version: 1, markdown: "Older draft", createdAt: "2026-10-04T00:00:00Z" },
  ] }] };

  it("focuses progress on three drafts, states the cost and collapses extra tools", () => {
    const { container } = render(<ProjectStudio project={withArtifact} />);
    expect(screen.getByText(/核心草稿已生成 1\/3/)).toBeInTheDocument();
    expect(screen.getByText(/每次生成消耗 2 点/)).toBeInTheDocument();
    expect(container.querySelector("details")).not.toHaveAttribute("open");
    expect(container.textContent).not.toContain("????");
  });

  it("preserves evidence URLs in fact saves", async () => {
    render(<ProjectStudio project={{ ...project, facts: project.facts.map((fact) => ({ ...fact, evidenceUrl: "https://example.com/evidence" })) }} />);
    await userEvent.click(screen.getByRole("button", { name: messages.saveFacts }));
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].body.facts).toEqual(expect.arrayContaining([expect.objectContaining({ evidenceUrl: "https://example.com/evidence" })]));
  });

  it("edits a selected historical version without changing facts or generating", async () => {
    const user = userEvent.setup();
    render(<ProjectStudio project={withArtifact} />);
    await user.selectOptions(screen.getByRole("combobox"), "v1");
    expect(screen.getByText("Older draft")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: messages.edit }));
    const editor = screen.getByRole("textbox", { name: messages.editLabel });
    await user.clear(editor);
    await user.type(editor, "My checked draft");
    await user.click(screen.getByRole("button", { name: messages.saveEdit }));
    await screen.findByText(messages.editSaved);
    expect(screen.getByText("My checked draft")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("v3");
    expect(requests).toEqual([{ url: "/api/projects/project-1/artifacts", body: { baseVersionId: "v1", expectedVersion: 2, markdown: "My checked draft" } }]);
  });

  it("retains edits when saving fails", async () => {
    const user = userEvent.setup();
    render(<ProjectStudio project={withArtifact} />);
    await user.click(screen.getByRole("button", { name: messages.edit }));
    await user.type(screen.getByRole("textbox", { name: messages.editLabel }), " unsaved");
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: async () => ({ ok: false, error: { message: "Version conflict" } }) } as Response);
    await user.click(screen.getByRole("button", { name: messages.saveEdit }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Version conflict");
    expect(screen.getByRole("textbox", { name: messages.editLabel })).toHaveValue("Latest draft unsaved");
  });

  it("requires explicit version-specific consent before requesting publication", async () => {
    const user = userEvent.setup();
    render(<ProjectStudio project={withArtifact} />);
    await user.click(screen.getByText(new RegExp(messages.sharing.replace(/[()]/g, "\\$&")), { selector: "summary" }));
    expect(screen.getByRole("button", { name: messages.shareRequest })).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: messages.shareRequest }));
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].body).toEqual({ artifactVersionId: "v2", acknowledged: true });
  });

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


