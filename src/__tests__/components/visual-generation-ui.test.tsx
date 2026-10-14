import { cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import generation from "../../../messages/visual-generation/zh.json";
import publication from "../../../messages/visual-publication/zh.json";
import { VisualModelGeneration } from "@/components/projects/visual-model-generation";
import { VisualWebsitePublication } from "@/components/projects/visual-website-publication";
vi.mock("next-intl",async original=>await original<typeof import("next-intl")>());
const mocked=vi.hoisted(()=>({request:vi.fn(),actor:"test-owner"}));
vi.mock("@/components/marketplace/account-boundary",()=>({useMarketActorId:()=>mocked.actor,useMarketRequest:()=>mocked.request}));
const asset={id:"12345678-1234-4234-8234-123456789abc",sha256:"a".repeat(64),size:100};
const completed={id:"job",status:"SUCCEEDED",stage:"persist",progress:100,costPoints:2,refunded:false,cancelRequested:false,errorCode:null,createdAt:"2026-10-13T00:00:00Z",asset};
function mountGeneration(onApply=vi.fn()){return render(<NextIntlClientProvider locale="zh" messages={{visualGeneration:generation}}><VisualModelGeneration onApply={onApply}/></NextIntlClientProvider>);}
beforeEach(()=>{vi.clearAllMocks();mocked.actor="test-owner";URL.createObjectURL=vi.fn(()=>"blob:fixture");URL.revokeObjectURL=vi.fn();mocked.request.mockResolvedValue([]);});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe("generation and publication controls",()=>{
 it("requires file and explicit upload/cost acknowledgement before submission",async()=>{
  const fetcher=vi.fn<(url:unknown,init?:RequestInit)=>Promise<Response>>(async()=>Response.json({ok:true,data:{available:true,costPoints:2}}));vi.stubGlobal("fetch",fetcher);mountGeneration();await waitFor(()=>expect(screen.getByText("本次需要 2 ANS 算力积分")).toBeVisible());
  expect(screen.getByRole("button",{name:generation.generate})).toBeDisabled();fireEvent.change(screen.getByLabelText(generation.image),{target:{files:[new File(["fixture"],"image.png",{type:"image/png"})]}});
  expect(screen.getByRole("button",{name:generation.generate})).toBeDisabled();fireEvent.click(screen.getByLabelText(generation.acknowledge));expect(screen.getByRole("button",{name:generation.generate})).toBeEnabled();
  fireEvent.change(screen.getByLabelText(generation.faces),{target:{value:"6000"}});expect(screen.getByLabelText(generation.acknowledge)).not.toBeChecked();expect(fetcher.mock.calls.filter(call=>call.length>1&&(call[1] as RequestInit)?.method==="POST")).toHaveLength(0);
 });
 it("reuses the submission key after a lost acknowledgement",async()=>{
  const submitted:FormData[]=[];vi.stubGlobal("fetch",vi.fn(async(_url:string,init?:RequestInit)=>{if(init?.method==="POST"){submitted.push(init.body as FormData);throw new Error("lost response");}return Response.json({ok:true,data:{available:true,costPoints:2}});}));mountGeneration();await waitFor(()=>expect(screen.getByText("本次需要 2 ANS 算力积分")).toBeVisible());
  fireEvent.change(screen.getByLabelText(generation.image),{target:{files:[new File(["fixture"],"image.png",{type:"image/png"})]}});fireEvent.click(screen.getByLabelText(generation.acknowledge));
  for(let i=0;i<2;i++){fireEvent.click(screen.getByRole("button",{name:generation.generate}));await waitFor(()=>expect(screen.getByRole("button",{name:generation.generate})).toBeEnabled());}
  expect(submitted).toHaveLength(2);expect(JSON.parse(submitted[0].get("manifest") as string).idempotencyKey).toBe(JSON.parse(submitted[1].get("manifest") as string).idempotencyKey);
 });
 it("restores completed jobs and applies only the owned model reference",async()=>{
  vi.stubGlobal("fetch",vi.fn(async()=>Response.json({ok:true,data:{available:false,costPoints:null}})));mocked.request.mockResolvedValue([completed]);const apply=vi.fn();mountGeneration(apply);await screen.findByRole("button",{name:generation.apply});fireEvent.click(screen.getByRole("button",{name:generation.apply}));expect(apply).toHaveBeenCalledWith(asset);
 });
 it("keeps generation disabled while the service is not configured",async()=>{
  vi.stubGlobal("fetch",vi.fn(async()=>Response.json({ok:true,data:{available:false,costPoints:null}})));mountGeneration();await screen.findByText(generation.unavailable);expect(screen.getByRole("button",{name:generation.generate})).toBeDisabled();
 });
 it("publishes only the selected saved version after explicit confirmation",async()=>{
  vi.stubGlobal("fetch",vi.fn(async()=>Response.json({ok:true,data:{available:true}})));mocked.request.mockImplementation(async(url:string,method:string)=>method==="POST"?{id:"release",slug:"my-site",version:3,url:"https://portfolio.example.invalid/sites/my-site"}:url.endsWith("/domains")?{available:false,domains:[]}:null);
  render(<NextIntlClientProvider locale="zh" messages={{visualPublication:publication}}><VisualWebsitePublication projectId="12345678-1234-4234-8234-123456789abc" versions={[3,2]}/></NextIntlClientProvider>);
  await screen.findByLabelText(publication.slug);fireEvent.change(screen.getByLabelText(publication.slug),{target:{value:"my-site"}});expect(screen.getByRole("button",{name:publication.publish})).toBeDisabled();fireEvent.click(screen.getByLabelText(publication.acknowledge));fireEvent.click(screen.getByRole("button",{name:publication.publish}));
  await waitFor(()=>expect(mocked.request).toHaveBeenCalledWith("/api/visual-websites/publication","POST",{projectId:"12345678-1234-4234-8234-123456789abc",version:3,slug:"my-site",acknowledged:true}));
 });
});
