import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/visual-website/zh.json";
import { DEFAULT_APPEARANCE } from "@/contracts/visual-website";
import { RESUME_WEBSITE_EXAMPLE } from "@/domain/projects/resume-website";
import { VisualWebsiteStudio } from "@/components/projects/visual-website-studio";
vi.mock("next-intl", async original => await original<typeof import("next-intl")>());
const m=vi.hoisted(()=>({request:vi.fn(),actor:"owner"}));
vi.mock("@/components/marketplace/account-boundary",()=>({useMarketActorId:()=>m.actor,useMarketRequest:()=>m.request}));
vi.mock("@/components/marketplace/workflow-run",()=>({MarketWorkflowRun:()=>null}));
function mount(initial?: Parameters<typeof VisualWebsiteStudio>[0]["initial"]) {return render(<NextIntlClientProvider locale="zh" messages={{visualWebsite:messages}}><VisualWebsiteStudio initial={initial}/></NextIntlClientProvider>);}
function step(name:string) { fireEvent.click(screen.getByRole("button",{name:new RegExp(name)})); }
const doc={format:"ans-visual-website" as const,version:1 as const,profile:RESUME_WEBSITE_EXAMPLE,appearance:DEFAULT_APPEARANCE};
beforeEach(()=>{vi.clearAllMocks();m.actor="owner";m.request.mockResolvedValue({projectId:"saved",version:1});});afterEach(cleanup);
describe("guided portfolio studio",()=>{
 it("starts with a labelled example, clears all fictional facts and never calls the server while editing",()=>{
  mount();expect(screen.getByText(messages.example)).toBeVisible();fireEvent.click(screen.getByRole("button",{name:messages.start}));step("写下故事");
  expect(screen.getByLabelText(messages.fields.fullName)).toHaveValue("");expect(screen.getByLabelText(messages.fields.name)).toHaveValue("");expect(screen.getByLabelText(messages.fields.education)).toHaveValue("");
  fireEvent.change(screen.getByLabelText(messages.fields.fullName),{target:{value:"Own name"}});expect(m.request).not.toHaveBeenCalled();
 });
 it("cannot edit example facts implicitly by switching to story mode",()=>{mount();step("写下故事");expect(screen.queryByLabelText(messages.fields.fullName)).toBeNull();expect(screen.getAllByRole("button",{name:messages.start})).toHaveLength(2);expect(m.request).not.toHaveBeenCalled();});
 it("retains current revision when loading an old saved version and explicitly saves the chosen content",async()=>{
  const old={...doc,profile:{...doc.profile,fullName:"Previous name"}};mount({projectId:"442be0b3-ddea-4bf7-a340-94490b67fb35",currentVersion:4,versions:[{version:4,createdAt:"2026-10-13",document:doc},{version:2,createdAt:"2026-10-12",document:old}]});step("完成与交付");fireEvent.change(screen.getByLabelText(messages.versions),{target:{value:"2"}});fireEvent.click(screen.getByRole("button",{name:messages.restore}));fireEvent.click(screen.getByLabelText(messages.review));fireEvent.click(screen.getByRole("button",{name:messages.save}));
  await waitFor(()=>expect(m.request).toHaveBeenCalledTimes(1));expect(m.request.mock.calls[0][2]).toMatchObject({expectedVersion:4,document:{profile:{fullName:"Previous name"}}});
 });
 it("keeps the entered content on a failed save and does not automatically retry",async()=>{
  m.request.mockRejectedValue(new Error("VERSION_CONFLICT"));mount({projectId:"442be0b3-ddea-4bf7-a340-94490b67fb35",currentVersion:1,versions:[{version:1,createdAt:"2026-10-13",document:doc}]});step("完成与交付");fireEvent.click(screen.getByLabelText(messages.review));fireEvent.click(screen.getByRole("button",{name:messages.save}));expect(await screen.findByRole("alert")).toHaveTextContent(messages.conflict);step("写下故事");expect(screen.getByLabelText(messages.fields.fullName)).toHaveValue(doc.profile.fullName);expect(m.request).toHaveBeenCalledTimes(1);
 });
 it("camera and color changes remain free and require review again before delivery",()=>{mount({projectId:"442be0b3-ddea-4bf7-a340-94490b67fb35",currentVersion:1,versions:[{version:1,createdAt:"2026-10-13",document:doc}]});step("完成与交付");fireEvent.click(screen.getByLabelText(messages.review));step("编排镜头");fireEvent.change(screen.getByRole("slider",{name:/环绕角度/}),{target:{value:"42"}});step("完成与交付");expect(screen.getByRole("button",{name:messages.download})).toBeDisabled();expect(m.request).not.toHaveBeenCalled();});
});
