import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { WorkspaceNavigationProvider, useWorkspaceNavigation } from "@/components/providers/workspace-navigation";
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
let navigation: ReturnType<typeof useWorkspaceNavigation>;
function Probe() {
  const value = useWorkspaceNavigation();
  useEffect(() => { navigation = value; }, [value]);
  return null;
}
function setup() { return render(<WorkspaceNavigationProvider><Probe /></WorkspaceNavigationProvider>); }
beforeEach(() => { router.push.mockReset(); router.replace.mockReset(); });
afterEach(cleanup);
describe("workspace navigation with simultaneous editors", () => {
  it("requires every editor in registration order and applies the action once", () => {
    setup(); const calls: string[] = []; let approveFirst!: () => void; let approveSecond!: () => void;
    navigation.register(approve => { calls.push("reviews"); approveFirst = approve; });
    navigation.register(approve => { calls.push("issues"); approveSecond = approve; });
    const action = vi.fn(); navigation.run(action);
    expect(calls).toEqual(["reviews"]); expect(action).not.toHaveBeenCalled();
    approveFirst(); expect(calls).toEqual(["reviews", "issues"]); expect(action).not.toHaveBeenCalled();
    approveSecond(); approveFirst(); approveSecond(); expect(action).toHaveBeenCalledTimes(1);
  });
  it("an unchanged editor cannot bypass another editor's unsaved input", () => {
    setup(); let approve!: () => void;
    navigation.register(next => { approve = next; }); navigation.register(next => next());
    const action = vi.fn(); navigation.run(action); expect(action).not.toHaveBeenCalled();
    approve(); expect(action).toHaveBeenCalledTimes(1);
  });
  it("cancels a pending chain when an editor unmounts or a new editor registers", () => {
    setup(); let late!: () => void;
    const remove = navigation.register(next => { late = next; }); const action = vi.fn(); navigation.run(action);
    remove(); late(); expect(action).not.toHaveBeenCalled();
    navigation.register(next => { late = next; }); navigation.run(action);
    navigation.register(next => next()); late(); expect(action).not.toHaveBeenCalled();
  });
  it("keeps the first destination during repeated clicks and releases it on cancel", () => {
    setup(); const answers: Array<() => void> = []; const cancels: Array<() => void> = [];
    navigation.register((next, cancel) => { answers.push(next); cancels.push(cancel); });
    const first = vi.fn(), ignored = vi.fn(), nextAttempt = vi.fn();
    navigation.run(first); navigation.run(ignored); expect(answers).toHaveLength(1);
    cancels[0](); answers[0](); expect(first).not.toHaveBeenCalled(); expect(ignored).not.toHaveBeenCalled();
    navigation.run(nextAttempt); answers[1](); expect(nextAttempt).toHaveBeenCalledTimes(1);
  });
  it("does not navigate after the provider itself unmounts", () => {
    const view = setup(); let late!: () => void;
    navigation.register(next => { late = next; }); const action = vi.fn(); navigation.run(action);
    view.unmount(); late(); expect(action).not.toHaveBeenCalled();
  });
  it("intercepts real route changes through all guards and preserves replace options", () => {
    setup(); let approve!: () => void; navigation.register(next => { approve = next; });
    const event = { preventDefault: vi.fn() };
    act(() => navigation.intercept(event, "/different-workspace", { replace: true, scroll: false }));
    expect(event.preventDefault).toHaveBeenCalledOnce(); expect(router.replace).not.toHaveBeenCalled();
    act(() => approve()); expect(router.replace).toHaveBeenCalledExactlyOnceWith("/different-workspace", { scroll: false, transitionTypes: undefined });
    expect(router.push).not.toHaveBeenCalled();
  });
  it("leaves same-page anchors and normal unguarded links to Next", () => {
    setup(); const event = { preventDefault: vi.fn() };
    navigation.intercept(event, "/another-path", {}); expect(event.preventDefault).not.toHaveBeenCalled();
    navigation.register(next => next()); navigation.intercept(event, window.location.pathname + window.location.search + "#section", {});
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
