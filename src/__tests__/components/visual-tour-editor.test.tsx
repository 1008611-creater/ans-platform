import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Blob as NodeBlob } from "node:buffer";
import messages from "../../../messages/visual-website/zh.json";
import { DEFAULT_APPEARANCE, type VisualWebsite, type VisualWebsiteState } from "@/contracts/visual-website";
import { RESUME_WEBSITE_EXAMPLE } from "@/domain/projects/resume-website";
import { createVisualTour } from "@/lib/projects/visual-tour";
import { VisualWebsiteStudio } from "@/components/projects/visual-website-studio";
import { presetForSticker } from "@/contracts/visual-stickers";
import { VisualTourEditor } from "@/components/projects/visual-tour-editor";
vi.mock("next-intl", async original => await original<typeof import("next-intl")>());
const m=vi.hoisted(()=>({request:vi.fn(),actor:"owner",export:vi.fn(),execution:vi.fn()}));
vi.mock("@/components/marketplace/account-boundary",()=>({useMarketActorId:()=>m.actor,useMarketRequest:()=>m.request}));
vi.mock("@/lib/projects/visual-website-assets",()=>({exportVisualWebsite:m.export}));
vi.mock("@/components/marketplace/workflow-run",()=>({MarketWorkflowRun:(props: {profileInput: typeof RESUME_WEBSITE_EXAMPLE; onUseCopy: (copy: {summary: string; projects: {description: string}[]}) => void})=>{m.execution(props);return <button onClick={()=>props.onUseCopy({summary:"Reviewed personal story",projects:props.profileInput.projects.map(()=>({description:"Reviewed contribution"}))})}>Apply reviewed copy</button>;}}));
vi.mock("@/components/projects/visual-model-generation",()=>({VisualModelGeneration:()=>null}));
vi.mock("@/components/projects/visual-website-publication",()=>({VisualWebsitePublication:()=>null}));
const projectId="442be0b3-ddea-4bf7-a340-94490b67fb35";
function document():VisualWebsite {const tour=createVisualTour(RESUME_WEBSITE_EXAMPLE);tour.hero.camera={position:[1,2,3],target:[0,0,0]};tour.stickers=[{id:"label",text:"ANS",color:"#cafa2a",size:.1,rotation:0,visible:true,position:[0,0,1],normal:[0,0,1]}];return {format:"ans-visual-website",version:1,profile:RESUME_WEBSITE_EXAMPLE,appearance:{...DEFAULT_APPEARANCE,tour}};}
function mount(doc=document(),versions?:VisualWebsiteState["versions"]){return render(<NextIntlClientProvider locale="zh" messages={{visualWebsite:messages}}><VisualTourEditor initial={{projectId,currentVersion:4,versions:versions??[{version:4,createdAt:"2026-10-13",document:doc}]}}/></NextIntlClientProvider>);}
function stage(index:number){fireEvent.click(screen.getByRole("button",{name:`${index} ${["模型","贴纸","动画"][index-1]}`}));}
function message(type:string,extra:Record<string,unknown>={}){const frame=screen.getByTitle(messages.preview) as HTMLIFrameElement;fireEvent(window,new MessageEvent("message",{source:frame.contentWindow,data:{channel:"ans-visual-scene",type,...extra}}));return frame;}
function delivery(){fireEvent.click(screen.getByRole("button",{name:messages.tour.deliver}));fireEvent.click(screen.getByLabelText(messages.review));}
async function save(){delivery();fireEvent.click(screen.getByRole("button",{name:messages.save}));await waitFor(()=>expect(m.request).toHaveBeenCalled());return m.request.mock.calls[0][2];}
beforeEach(()=>{vi.clearAllMocks();m.actor="owner";m.request.mockResolvedValue({projectId,version:5});m.export.mockResolvedValue("<html>Export</html>");Object.defineProperty(HTMLElement.prototype,"scrollIntoView",{value:vi.fn(),configurable:true});Object.defineProperty(HTMLElement.prototype,"scrollTo",{value:vi.fn(),configurable:true});vi.stubGlobal("Blob",NodeBlob);URL.createObjectURL=vi.fn(()=>"blob:download");URL.revokeObjectURL=vi.fn();vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(()=>{});});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
describe("immersive tour editor",()=>{
 it("searches both image collections and saves image placement, duplication and visibility alongside legacy text",async()=>{
  mount();stage(2);
  fireEvent.change(screen.getByLabelText(messages.tour.stickerSearch),{target:{value:"programmer"}});
  fireEvent.click(screen.getByRole("button",{name:messages.tour.stickerStyles.retro}));
  fireEvent.click(screen.getByRole("button",{name:`${messages.tour.stickerLabels["career-programmer"]} · ${messages.tour.stickerStyles.retro}`}));
  message("surface",{position:[.1,.2,.3],normal:[0,0,1]});
  const layer=screen.getByRole("button",{name:`${messages.tour.stickerLabels["career-programmer"]} ${messages.tour.layer.replace("{index}","2")}`}).closest("div")!;
  fireEvent.click(within(layer).getByRole("button",{name:messages.tour.duplicate}));
  fireEvent.click(within(layer).getByRole("button",{name:messages.tour.hideLayer}));
  const payload=await save(),stickers=payload.document.appearance.tour.stickers;
  expect(stickers).toHaveLength(3);expect(stickers[0].preset).toBeUndefined();
  expect(stickers[1]).toMatchObject({visible:false,position:[.1,.2,.3]});
  expect(stickers[2]).toMatchObject({visible:true});
  expect(stickers[2].id).not.toBe(stickers[1].id);
  expect(stickers.every((sticker:Record<string,unknown>)=>!("preset" in sticker))).toBe(true);
  expect(presetForSticker(stickers[1].id)?.id).toBe("retro-career-programmer");
  expect(presetForSticker(stickers[2].id)?.id).toBe("retro-career-programmer");
 });

 it("reselecting the current model keeps camera captures and stickers",async()=>{const doc=document();mount(doc);fireEvent.click(screen.getByRole("button",{name:/参考演示人物 GLB/}));expect(m.request).not.toHaveBeenCalled();const payload=await save();expect(payload.document.appearance.tour.hero.camera).toEqual(doc.appearance.tour!.hero.camera);expect(payload.document.appearance.tour.stickers).toEqual(doc.appearance.tour!.stickers);});
 it("aligns input limits with persisted fields",()=>{mount();stage(3);for(const [key,limit]of [["byline",80],["issue",40],["location",100],["email",254],["heroBody",3000]]as const)expect(screen.getByLabelText(messages.tour[key])).toHaveAttribute("maxlength",String(limit));});
 it("supports keyboard-accessible stop reordering and saves the order",async()=>{const doc=document();mount(doc);stage(3);fireEvent.click(screen.getByRole("button",{name:`1 ${doc.appearance.tour!.nodes[0].title}`}));fireEvent.click(screen.getByRole("button",{name:messages.tour.moveStopLater}));const payload=await save();expect(payload.document.appearance.tour.nodes[1].id).toBe(doc.appearance.tour!.nodes[0].id);});
 it("deletion can be undone without leaving the editor",()=>{mount();stage(2);fireEvent.click(screen.getByRole("button",{name:messages.tour.deleteLayer}));expect(screen.queryByRole("button",{name:"ANS 图层 1"})).toBeNull();fireEvent.click(screen.getByRole("button",{name:messages.tour.undoReplacement}));stage(2);expect(screen.getByRole("button",{name:"ANS 图层 1"})).toBeVisible();});
 it("expires a destructive snapshot when later edits would otherwise be overwritten",()=>{mount();stage(2);fireEvent.click(screen.getByRole("button",{name:messages.tour.deleteLayer}));stage(3);fireEvent.change(screen.getByLabelText(messages.tour.heroTitle),{target:{value:"Keep this later edit"}});expect(screen.queryByRole("button",{name:messages.tour.undoReplacement})).toBeNull();expect(screen.getByLabelText(messages.tour.heroTitle)).toHaveValue("Keep this later edit");});
 it("restoring a version with different nodes resets the selection and preserves the current revision",async()=>{const doc=document(),older=document();older.appearance.tour!.nodes[0].id="older-id";older.appearance.tour!.hero.title="Earlier hero";mount(doc,[{version:4,createdAt:"2026-10-13",document:doc},{version:2,createdAt:"2026-10-12",document:older}]);stage(3);fireEvent.click(screen.getByRole("button",{name:`1 ${doc.appearance.tour!.nodes[0].title}`}));delivery();fireEvent.change(screen.getByLabelText(messages.versions),{target:{value:"2"}});fireEvent.click(screen.getByRole("button",{name:messages.restore}));fireEvent.click(within(screen.getByRole("dialog")).getByRole("button",{name:messages.tour.close}));expect(screen.getByLabelText(messages.tour.heroTitle)).toHaveValue("Earlier hero");const payload=await save();expect(payload.expectedVersion).toBe(4);expect(payload.document.profile.headline).toBe("Earlier hero");});
 it("rejects incomplete stops before a server write",()=>{const doc=document();doc.appearance.tour!.nodes[0].body="";mount(doc);delivery();fireEvent.click(screen.getByRole("button",{name:messages.save}));expect(m.request).not.toHaveBeenCalled();expect(screen.getByLabelText(messages.tour.body)).toHaveAttribute("aria-invalid","true");expect(screen.getByLabelText(messages.tour.body)).toHaveFocus();});
 it("keeps drafts downloadable when an email or link is still incomplete",async()=>{mount();stage(3);fireEvent.change(screen.getByLabelText(messages.tour.email),{target:{value:"draft@"}});fireEvent.change(screen.getByLabelText(messages.tour.url),{target:{value:"https://"}});delivery();fireEvent.click(screen.getByRole("button",{name:messages.downloadDraft}));await waitFor(()=>expect(URL.createObjectURL).toHaveBeenCalled());const blob=vi.mocked(URL.createObjectURL).mock.calls[0][0] as unknown as NodeBlob;const draft=JSON.parse(await blob.text());expect(draft.profile.email).toBe("draft@");expect(draft.profile.contactUrl).toBe("https://");expect(m.request).not.toHaveBeenCalled();});
 it("ignores an old camera acknowledgement after the user edits",()=>{mount();stage(3);const frame=message("ready"),post=vi.spyOn(frame.contentWindow!,"postMessage");fireEvent.click(screen.getByRole("button",{name:messages.tour.camera}));fireEvent.click(screen.getByRole("button",{name:messages.tour.capture}));const request=post.mock.calls.find(call=>call[0].type==="capture")![0];fireEvent.click(screen.getByRole("button",{name:messages.tour.content}));fireEvent.change(screen.getByLabelText(messages.tour.heroTitle),{target:{value:"Latest change"}});message("camera",{requestId:request.requestId,camera:{position:[9,8,7],target:[0,0,0]}});expect(screen.getByLabelText(messages.tour.heroTitle)).toHaveValue("Latest change");expect(screen.queryByText(messages.tour.captured)).toBeNull();});
 it("captures only the response belonging to the active request",()=>{mount();stage(3);const frame=message("ready"),post=vi.spyOn(frame.contentWindow!,"postMessage");fireEvent.click(screen.getByRole("button",{name:messages.tour.camera}));fireEvent.click(screen.getByRole("button",{name:messages.tour.capture}));const request=post.mock.calls.find(call=>call[0].type==="capture")![0];message("camera",{requestId:request.requestId+1,camera:{position:[9,8,7],target:[0,0,0]}});expect(screen.getByRole("spinbutton",{name:"相机 X"})).toHaveValue(1);message("camera",{requestId:request.requestId,camera:{position:[9,8,7],target:[0,0,0]}});expect(screen.getByRole("spinbutton",{name:"相机 X"})).toHaveValue(9);});
 it("keeps a loaded canvas usable when capturing the already displayed camera",async()=>{mount();stage(3);const camera=document().appearance.tour!.hero.camera!;const frame=message("ready"),post=vi.spyOn(frame.contentWindow!,"postMessage");fireEvent.click(screen.getByRole("button",{name:messages.tour.camera}));fireEvent.click(screen.getByRole("button",{name:messages.tour.capture}));const request=post.mock.calls.find(call=>call[0].type==="capture")![0];message("camera",{requestId:request.requestId,camera});await new Promise(resolve=>setTimeout(resolve,220));expect(screen.getByRole("button",{name:messages.tour.capture})).toBeEnabled();});
 it("offers a canvas reload after a scene failure without removing content",()=>{mount();message("failed");fireEvent.click(screen.getByRole("button",{name:messages.tour.retryScene}));message("ready");expect(screen.queryByRole("button",{name:messages.tour.retryScene})).toBeNull();stage(3);expect(screen.getByLabelText(messages.tour.heroTitle)).toHaveValue(document().appearance.tour!.hero.title);});
 it("does not send an oversized account save and retains local export",()=>{const doc=document(),tour=doc.appearance.tour!;tour.nodes=Array.from({length:10},(_,i)=>({...tour.nodes[0],id:`n${i}`,body:"中".repeat(2000)}));tour.sections=Array.from({length:4},(_,i)=>({id:`s${i}`,title:"Work",body:"中".repeat(2000),url:""}));mount(doc);delivery();fireEvent.click(screen.getByRole("button",{name:messages.save}));expect(m.request).not.toHaveBeenCalled();expect(screen.getByText(messages.tour.saveSizeLimit)).toBeVisible();});
});

it("the immersive market studio forwards execution and applies copy without replacing the visual scene", async()=>{
 const doc=document(), execution={listingId:"real-listing",version:3,details:{recipe:"resume-website-v1" as const,variables:[],estimatedCost:2,version:1}};
 render(<NextIntlClientProvider locale="zh" messages={{visualWebsite:messages}}><VisualWebsiteStudio immersive execution={execution} initial={{projectId,currentVersion:4,versions:[{version:4,createdAt:"2026-10-13",document:doc}]}}/></NextIntlClientProvider>);
 stage(3);expect(m.execution).toHaveBeenLastCalledWith(expect.objectContaining(execution));expect(m.request).not.toHaveBeenCalled();
 delivery();expect(screen.getByLabelText(messages.review)).toBeChecked();
 fireEvent.click(within(screen.getByRole("dialog")).getByRole("button",{name:"Apply reviewed copy"}));
 expect(screen.getByLabelText(messages.review)).not.toBeChecked();
 fireEvent.click(screen.getByLabelText(messages.review));fireEvent.click(screen.getByRole("button",{name:messages.save}));
 await waitFor(()=>expect(m.request).toHaveBeenCalledTimes(1));
 const saved=m.request.mock.calls[0][2].document;
 expect(saved.profile.about).toBe("Reviewed personal story");expect(saved.profile.projects[0].description).toBe("Reviewed contribution");
 expect(saved.appearance.tour.hero.camera).toEqual(doc.appearance.tour!.hero.camera);expect(saved.appearance.tour.stickers).toEqual(doc.appearance.tour!.stickers);expect(saved.appearance.avatar).toBe(doc.appearance.avatar);
 fireEvent.click(within(screen.getByRole("dialog")).getByRole("button",{name:messages.tour.close}));
 fireEvent.click(screen.getByRole("button",{name:messages.tour.undoReplacement}));expect(screen.getByLabelText(messages.tour.heroBody)).toHaveValue(doc.appearance.tour!.hero.body);
});
