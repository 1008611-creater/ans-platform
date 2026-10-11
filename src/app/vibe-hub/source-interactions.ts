import type { FlowLesson } from "./source-data";
/** Enhance the official, sanitized examples while preserving their visual markup. */
export function enhanceSource(root: HTMLElement, messages: { done: string; invalid: string; fileError: string; copied: string; copyError: string }, flowLesson?: FlowLesson | null) {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const cleanups: (() => void)[] = [];
  const status = (parent: Element, text: string) => {
    let node = parent.querySelector<HTMLElement>(":scope > .vh-example-status");
    if (!node) { node = document.createElement("p"); node.className = "vh-example-status"; node.setAttribute("role", "status"); parent.append(node); }
    node.textContent = text;
  };
  const interactive = (selector: string, role = "button") => root.querySelectorAll<HTMLElement>(selector).forEach(node => {
    node.setAttribute("role", role); node.tabIndex = 0;
  });
  interactive(".tip-wrap .icon-btn,.popover-trigger,.popconfirm-demo > .btn,.popconfirm-actions .btn,.ac-item,.dp-cell:not(.dim),.dp-head > span,.tp-item,.catalog-swatches i,.ul-drop,.skill-browser-term-trigger");
  interactive(".rate-row:first-child .rate-demo i", "radio");
  root.querySelectorAll<HTMLElement>(".tip-wrap").forEach((wrap, index) => {
    const bubble = wrap.querySelector<HTMLElement>(".tip-bubble"); const trigger = wrap.querySelector<HTMLElement>(".icon-btn");
    if (bubble && trigger) { bubble.id = `vh-tip-${index}`; bubble.setAttribute("role", "tooltip"); trigger.setAttribute("aria-describedby", bubble.id); trigger.setAttribute("aria-label", bubble.textContent || ""); }
  });
  root.querySelectorAll<HTMLElement>(".demo-tabs").forEach((tabs, index) => {
    tabs.setAttribute("role", "tablist");
    const panel = tabs.parentElement?.querySelector<HTMLElement>(".tabs-panel");
    if (panel) { panel.id = `vh-tabs-panel-${index}`; panel.setAttribute("role", "tabpanel"); }
    tabs.querySelectorAll<HTMLElement>(".tab").forEach((tab, tabIndex) => { tab.id = `vh-tab-${index}-${tabIndex}`; tab.setAttribute("role", "tab"); tab.setAttribute("aria-controls", panel?.id || ""); tab.setAttribute("aria-selected", String(tab.classList.contains("active"))); tab.tabIndex = tab.classList.contains("active") ? 0 : -1; });
    if (panel) panel.setAttribute("aria-labelledby", tabs.querySelector(".tab.active")?.id || "");
  });
  root.querySelectorAll<HTMLElement>(".bar-fill[data-fill]").forEach(node => { node.style.width = `${Math.max(0, Math.min(100, Number(node.dataset.fill) || 0))}%`; });
  root.querySelectorAll<HTMLInputElement>(".num-input").forEach(node => { node.type = "number"; node.min = "0"; node.step = node.value.includes(".") ? "0.1" : "1"; node.setAttribute("aria-label", node.parentElement?.textContent?.trim() || "Quantity"); });
  root.querySelectorAll<HTMLLabelElement>(".form-demo .form-label").forEach((label, index) => { const input = label.parentElement?.querySelector<HTMLInputElement>("input"); if (input) { input.id = `vh-form-${index}`; label.htmlFor = input.id; } });
  root.querySelectorAll<HTMLElement>(".rate-demo").forEach(node => { node.setAttribute("role", "radiogroup"); });
  const chooseDate = (target: Element) => {
    const wrap = target.closest(".dp-wrap"); if (!wrap) return;
    const heading = wrap.querySelector(".dp-head b")?.textContent || "July 2026";
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const match = heading.match(/(\d{4})/); const year = Number(match?.[1] || 2026);
    let month = monthNames.findIndex(name => heading.includes(name));
    if (month < 0) month = Number(heading.match(/(\d{1,2})\s*月/)?.[1] || 7) - 1;
    const box = wrap.querySelector(".dp-box"); if (!box) return;
    const icon = box.querySelector("i")?.cloneNode(true); box.replaceChildren(document.createTextNode(`${year}-${String(month + 1).padStart(2, "0")}-${String(Number(target.textContent)).padStart(2, "0")}`)); if (icon) box.append(icon);
    wrap.querySelectorAll(".dp-cell").forEach(cell => cell.classList.toggle("on", cell === target));
  };
  const changeMonth = (target: Element) => {
    const wrap = target.closest(".dp-wrap"); const title = wrap?.querySelector(".dp-head b"); const grid = wrap?.querySelectorAll(".dp-grid")[1]; if (!wrap || !title || !grid) return;
    const current = wrap.querySelector(".dp-box")?.textContent?.match(/(\d{4})-(\d{2})/);
    const date = new Date(Number(current?.[1] || 2026), Number(current?.[2] || 7) - 1, 1);
    const delta = target === target.parentElement?.firstElementChild ? -1 : 1; date.setMonth(date.getMonth() + delta);
    const english = root.closest("[lang]")?.getAttribute("lang") === "en";
    title.textContent = english ? date.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
    grid.replaceChildren(); const offset = (date.getDay() + 6) % 7; const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    for (let index = 0; index < offset + days; index++) { const cell = document.createElement("span"); cell.className = index < offset ? "dp-cell dim" : "dp-cell"; cell.textContent = index < offset ? "" : String(index - offset + 1); if (index >= offset) { cell.setAttribute("role", "button"); cell.tabIndex = 0; } grid.append(cell); }
    const first = grid.querySelector(".dp-cell:not(.dim)"); if (first) chooseDate(first);
  };
  let flowIndex = 0;
  const updateFlow = (index: number) => {
    if (!flowLesson?.steps.length) return;
    flowIndex = Math.max(0, Math.min(flowLesson.steps.length - 1, index));
    const step = flowLesson.steps[flowIndex];
    const journey = root.querySelector(".flow-journey"); if (!journey) return;
    const scene = journey.querySelector<HTMLElement>(".fj-scene"); if (scene) scene.dataset.step = step.id;
    const counter = journey.querySelector(".fj-now-index"); if (counter) counter.textContent = `${flowIndex + 1} / ${flowLesson.steps.length}`;
    const title = journey.querySelector(".fj-now-head strong"); if (title) title.textContent = step.label;
    const detail = journey.querySelector(".fj-now-detail"); if (detail) detail.textContent = `${step.owner} ? ${step.detail}`;
    const focus = journey.querySelector<HTMLElement>(".fj-now-head em"); if (focus) focus.hidden = !step.focused;
    journey.querySelectorAll<HTMLButtonElement>(".fj-nav").forEach((button, position) => { button.disabled = position === 0 ? flowIndex === 0 : flowIndex === flowLesson.steps.length - 1; });
    const zones: Record<string, string> = { input: "frontend", request: "api", validate: "backend", write: "database", response: "api", display: "frontend" };
    journey.querySelectorAll<HTMLElement>(".fj-zone").forEach(zone => { const selected = zone.classList.contains(`fj-${zones[step.id]}`); zone.classList.toggle("is-active", selected); zone.classList.toggle("is-focus", selected && step.focused); });
  };
  updateFlow(0);
  const click = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null; if (!target) return;
    const sceneButton = target.closest<HTMLButtonElement>(".scene-controls button");
    if (sceneButton) {
      const controls = sceneButton.parentElement; const buttons = [...(controls?.querySelectorAll("button") || [])]; const index = buttons.indexOf(sceneButton);
      buttons.forEach(button => { button.classList.toggle("on", button === sceneButton); button.setAttribute("aria-pressed", String(button === sceneButton)); });
      const scene = sceneButton.closest(".interactive-demo,.concept-stage");
      scene?.querySelectorAll<HTMLElement>('[class*="state-"]').forEach(node => { node.className = node.className.replace(/\bstate-\d+\b/g, `state-${index}`); });
      if (scene) status(scene, sceneButton.textContent?.trim() || ""); return;
    }
    const counterButton = target.closest(".react-workbench .shop-preview button,.vue-workbench .shop-preview button");
    if (counterButton) { const count = counterButton.querySelector("strong"); if (count) count.textContent = String((Number(count.textContent) || 0) + 1); return; }
    const flowNavigation = target.closest(".fj-nav");
    if (flowNavigation) { const controls = [...(flowNavigation.parentElement?.querySelectorAll(".fj-nav") || [])]; updateFlow(flowIndex + (controls.indexOf(flowNavigation) === 0 ? -1 : 1)); return; }
    const flowAnswer = target.closest(".flow-practice-option");
    if (flowAnswer && flowLesson?.practice) { const section = flowAnswer.closest(".flow-practice"); const buttons = [...(section?.querySelectorAll(".flow-practice-option") || [])]; const answer = flowLesson.practice.options[buttons.indexOf(flowAnswer)]; buttons.forEach(button => button.setAttribute("aria-checked", String(button === flowAnswer))); if (answer && section) status(section, answer.feedback); return; }
    const trigger = target.closest<HTMLElement>("[data-custom-select-trigger]");
    if (trigger) { const wrap = trigger.closest("[data-custom-select]"); const open = wrap?.classList.toggle("open"); trigger.setAttribute("aria-expanded", String(open)); return; }
    const option = target.closest<HTMLElement>("[data-custom-select-option]");
    if (option) { const wrap = option.closest("[data-custom-select]"); wrap?.querySelectorAll<HTMLElement>("[data-custom-select-option]").forEach(item => { item.classList.toggle("on", item === option); item.setAttribute("aria-selected", String(item === option)); }); const label = wrap?.querySelector("[data-custom-select-value]"); if (label) label.textContent = option.dataset.value || ""; wrap?.classList.remove("open"); const button = wrap?.querySelector<HTMLElement>("[data-custom-select-trigger]"); button?.setAttribute("aria-expanded", "false"); button?.focus(); return; }
    const tab = target.closest<HTMLElement>(".demo-tabs .tab");
    if (tab) { const wrap = tab.closest(".demo-tabs-wrap"); wrap?.querySelectorAll<HTMLElement>(".tab").forEach(item => { item.classList.toggle("active", item === tab); item.setAttribute("aria-selected", String(item === tab)); item.tabIndex = item === tab ? 0 : -1; }); const panel = wrap?.querySelector(".tabs-panel"); if (panel) { panel.textContent = tab.dataset.panel || tab.textContent; panel.setAttribute("aria-labelledby", tab.id); } return; }
    const number = target.closest<HTMLElement>(".num-btn");
    if (number) { const input = number.parentElement?.querySelector<HTMLInputElement>(".num-input"); if (input) { if (number === number.parentElement?.firstElementChild) input.stepDown(); else input.stepUp(); input.dispatchEvent(new Event("input", { bubbles: true })); } return; }
    const item = target.closest<HTMLElement>(".ac-item");
    if (item) { const wrap = item.closest(".ac-wrap"); const input = wrap?.querySelector<HTMLInputElement>("input"); if (input) input.value = item.textContent?.trim() || ""; wrap?.querySelectorAll(".ac-item").forEach(node => node.classList.toggle("on", node === item)); return; }
    const rating = target.closest<HTMLElement>(".rate-row:first-child .rate-demo i");
    if (rating) { const stars = [...(rating.parentElement?.children || [])]; const index = stars.indexOf(rating); stars.forEach((star, position) => { star.classList.remove("half"); star.classList.toggle("on", position <= index); star.setAttribute("aria-checked", String(star === rating)); }); const label = rating.closest(".rate-row")?.querySelector(".rate-text"); if (label) label.textContent = `${index + 1} / 5`; return; }
    const cell = target.closest(".dp-cell:not(.dim)"); if (cell) { chooseDate(cell); return; }
    const month = target.closest(".dp-head > span"); if (month) { changeMonth(month); return; }
    const time = target.closest(".tp-item");
    if (time) { time.parentElement?.querySelectorAll(".tp-item").forEach(item => item.classList.toggle("on", item === time)); const wrap = time.closest(".tp-wrap"); const parts = [...(wrap?.querySelectorAll(".tp-item.on") || [])].map(item => item.textContent); const box = wrap?.querySelector(".tp-box"); if (box) { const icon = box.querySelector("i")?.cloneNode(true); box.textContent = parts.join(":"); if (icon) box.append(icon); } return; }
    const swatch = target.closest<HTMLElement>(".catalog-swatches i");
    if (swatch) { const color = swatch.style.backgroundColor; const panel = swatch.closest(".catalog-color-panel"); const hue = panel?.querySelector<HTMLElement>(".catalog-hue"); if (hue) hue.style.background = color; const label = panel?.querySelector(".catalog-color-value"); if (label) label.textContent = color; return; }
    const popover = target.closest(".popover-trigger"); if (popover) { popover.closest(".popover-demo")?.classList.toggle("vh-popover-closed"); return; }
    const confirm = target.closest(".popconfirm-demo > .btn"); if (confirm) { confirm.closest(".popconfirm-demo")?.classList.toggle("vh-popconfirm-closed"); return; }
    const decision = target.closest(".popconfirm-actions .btn"); if (decision) { decision.closest(".popconfirm-demo")?.classList.add("vh-popconfirm-closed"); return; }
    if (target.closest(".back-top-btn")) { window.scrollTo({ top: 0, behavior: "auto" }); return; }
    const copy = target.closest<HTMLButtonElement>("button[class*=copy]");
    if (copy) {
      const section = copy.closest(".skill-rewrite-after,.lesson-agent-prompt,section"); const code = section?.querySelector("code,pre,textarea");
      const text = code ? [...code.childNodes].map(node => node.textContent).join("\n").trim() : section?.querySelector("p")?.textContent;
      if (text) { void (async () => { try { await navigator.clipboard.writeText(text); copy.classList.add("is-copied"); status(section || root, messages.copied); const timer = setTimeout(() => { copy.classList.remove("is-copied"); timers.delete(timer); }, 2000); timers.add(timer); } catch { status(section || root, messages.copyError); } })(); } return;
    }
    const skillTerm = target.closest(".skill-browser-term-trigger"); if (skillTerm) { const existing = root.querySelector("#skill-tooltip-preview"); if (existing) { existing.remove(); skillTerm.setAttribute("aria-expanded", "false"); } else { const panel = document.createElement("div"); panel.id = "skill-tooltip-preview"; panel.className = "vh-example-status"; const link = document.createElement("a"); const lang = root.closest("[lang]")?.getAttribute("lang") || "zh"; link.href = `/vibe-hub/tooltip?lang=${lang}`; link.textContent = "Tooltip ↗"; panel.append(link); skillTerm.parentElement?.append(panel); skillTerm.setAttribute("aria-expanded", "true"); } return; }
    const formAction = target.closest(".form-actions button,.button-panel-submit,.disabled-live:not(:disabled)");
    if (formAction) {
      const form = formAction.closest(".form-demo,.button-panel,.disabled-play"); if (!form) return;
      const inputs = [...form.querySelectorAll<HTMLInputElement>("input")];
      const cancel = formAction.classList.contains("btn-outline");
      if (cancel) { inputs.forEach(input => { input.value = input.defaultValue; }); status(form, ""); return; }
      const valid = inputs.every(input => input.value.trim()) && (!form.classList.contains("form-demo") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputs[1]?.value || ""));
      form.querySelector(".form-item.err")?.classList.toggle("err", !valid); status(form, valid ? messages.done : messages.invalid);
    }
  };
  const input = (event: Event) => {
    const node = event.target; if (!(node instanceof HTMLInputElement)) return;
    if (node.matches(".disabled-demo-input")) { const button = node.parentElement?.querySelector<HTMLButtonElement>("button.disabled-live"); if (button) { button.disabled = !node.value.trim(); button.classList.toggle("off", button.disabled); } }
    if (node.matches(".ac-wrap input")) node.closest(".ac-wrap")?.querySelectorAll<HTMLElement>(".ac-item").forEach(item => { item.hidden = !(item.textContent || "").toLowerCase().includes(node.value.toLowerCase()); });
  };
  const keydown = (event: KeyboardEvent) => {
    const node = event.target instanceof HTMLElement ? event.target : null; if (!node) return;
    if (node.matches(".flow-journey") && ["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); updateFlow(flowIndex + (event.key === "ArrowLeft" ? -1 : 1)); }
    if (node.matches('[role="button"],[role="radio"]') && node.tagName !== "BUTTON" && ["Enter", " "].includes(event.key)) { event.preventDefault(); node.click(); }
    const group = node.closest(".demo-tabs,[data-custom-select],.rate-demo");
    if (group && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) { const items = [...group.querySelectorAll<HTMLElement>(".tab,[data-custom-select-option],i[role=radio]")]; if (!items.length) return; event.preventDefault(); const index = items.indexOf(node); const delta = ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1; const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + delta + items.length) % items.length; items[next].focus(); if (node.matches(".tab,i[role=radio]")) items[next].click(); }
    if (event.key === "Escape") root.querySelectorAll("[data-custom-select].open").forEach(wrap => { wrap.classList.remove("open"); wrap.querySelector("[data-custom-select-trigger]")?.setAttribute("aria-expanded", "false"); });
  };
  root.querySelectorAll<HTMLElement>(".ul-drop").forEach(drop => {
    const picker = document.createElement("input"); picker.type = "file"; picker.accept = "image/jpeg,image/png"; picker.hidden = true; drop.append(picker);
    const receive = (file?: File) => { if (!file) return; const wrap = drop.closest(".ul-wrap"); if (!wrap) return; if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > 10 * 1024 * 1024) { status(wrap, messages.fileError); return; } const name = wrap.querySelector(".ul-meta b"); if (name) name.textContent = file.name; const percent = wrap.querySelector(".ul-pct"); if (percent) percent.textContent = "100%"; const bar = wrap.querySelector<HTMLElement>(".bar-fill"); if (bar) bar.style.width = "100%"; status(wrap, messages.done); };
    const choose = (event: MouseEvent) => { if (event.target !== picker) picker.click(); };
    const change = () => receive(picker.files?.[0]); const drag = (event: DragEvent) => event.preventDefault(); const dropped = (event: DragEvent) => { event.preventDefault(); receive(event.dataTransfer?.files[0]); };
    drop.addEventListener("click", choose); picker.addEventListener("change", change); drop.addEventListener("dragover", drag); drop.addEventListener("drop", dropped);
    cleanups.push(() => { drop.removeEventListener("click", choose); picker.removeEventListener("change", change); drop.removeEventListener("dragover", drag); drop.removeEventListener("drop", dropped); picker.remove(); });
  });
  root.addEventListener("click", click); root.addEventListener("input", input); root.addEventListener("keydown", keydown);
  return () => { root.removeEventListener("click", click); root.removeEventListener("input", input); root.removeEventListener("keydown", keydown); timers.forEach(clearTimeout); cleanups.forEach(cleanup => cleanup()); };
}