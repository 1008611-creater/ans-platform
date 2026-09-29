import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateProjectForm } from "@/components/projects/create-project-form";

describe("CreateProjectForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, data: { project: { id: "project-1" } } }),
    }) as Response));
  });

  it.each(["career", "contest", "portfolio"] as const)("keeps the %s goal selected and submits it", async (goal) => {
    const user = userEvent.setup();
    const { container } = render(<CreateProjectForm initialGoal={goal} />);

    expect(container.querySelector('button[aria-pressed="true"]')).not.toBeNull();
    await user.type(screen.getByRole("textbox"), "A project");
    await user.click(screen.getAllByRole("button").at(-1)!);

    await waitFor(() => {
      const submitCall = vi.mocked(fetch).mock.calls.find(([url, init]) => url === "/api/projects" && init?.method === "POST");
      expect(submitCall).toBeDefined();
      expect(JSON.parse(String(submitCall?.[1]?.body))).toMatchObject({ title: "A project", goal });
    });
  });
});
