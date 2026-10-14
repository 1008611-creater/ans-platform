import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import fourView from "../../../messages/four-view/zh.json";
import { FourViewPreparation } from "@/components/projects/four-view-preparation";
vi.mock("next-intl",async original=>await original<typeof import("next-intl")>());
const mocked=vi.hoisted(()=>({request:vi.fn(),actor:"test-owner"}));
vi.mock("@/components/marketplace/account-boundary",()=>({useMarketActorId:()=>mocked.actor,useMarketRequest:()=>mocked.request}));
const file=()=>new File(["reference"],"original.png",{type:"image/png"});
const complete={id:"12345678-1234-4234-8234-123456789abc",status:"SUCCEEDED",aspectRatio:"1:1",costPoints:5,refunded:false,errorCode:null,createdAt:"2026-10-14T00:00:00Z"};
function mount(image:File|null,onApply=vi.fn()){return render(<NextIntlClientProvider locale="zh" messages={{fourView}}><FourViewPreparation file={image} onApply={onApply}/></NextIntlClientProvider>);}
beforeEach(()=>{vi.clearAllMocks();mocked.request.mockResolvedValue([]);URL.createObjectURL=vi.fn(()=>"blob:fixture");URL.revokeObjectURL=vi.fn();vi.stubGlobal("fetch",vi.fn(async()=>Response.json({ok:true,data:{available:true,costPoints:5}})));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe("four-view preparation decisions",()=>{
 it("requires an original and separate 5-point approval; ratio change invalidates consent",async()=>{
  mount(file());const generate=await screen.findByRole("button",{name:fourView.generate});expect(generate).toBeDisabled();fireEvent.click(screen.getByLabelText(fourView.acknowledge.replace("{points}","5")));expect(generate).toBeEnabled();fireEvent.change(screen.getByLabelText(fourView.ratio),{target:{value:"16:9"}});expect(generate).toBeDisabled();expect(screen.getByLabelText(fourView.acknowledge.replace("{points}","5"))).not.toBeChecked();
 });
 it("a lost response retries the identical key without a second reservation",async()=>{
  const submitted:FormData[]=[];vi.stubGlobal("fetch",vi.fn(async(_url:string,init?:RequestInit)=>{if(init?.method==="POST"){submitted.push(init.body as FormData);throw new Error("lost response");}return Response.json({ok:true,data:{available:true,costPoints:5}});}));
  mount(file());const generate=await screen.findByRole("button",{name:fourView.generate});fireEvent.click(screen.getByLabelText(fourView.acknowledge.replace("{points}","5")));
  for(let i=0;i<2;i++){fireEvent.click(generate);await waitFor(()=>expect(generate).toBeEnabled());}
  expect(submitted).toHaveLength(2);const manifest=(i:number)=>JSON.parse(submitted[i].get("manifest") as string);expect(manifest(0).idempotencyKey).toBe(manifest(1).idempotencyKey);expect(manifest(0).acceptedPoints).toBe(5);expect(submitted[0].get("image")).not.toBeNull();
 });
 it("shows privately loaded views and maps them into front, left, back, right after review",async()=>{
  mocked.request.mockResolvedValue([complete]);const fetcher=vi.fn(async(url:string,init?:RequestInit)=>{if(url.includes("/views/")){expect(init?.headers).toMatchObject({"x-ans-actor":"test-owner"});return new Response(new Blob([url],{type:"image/png"}),{headers:{"content-type":"image/png"}});}return Response.json({ok:true,data:{available:true,costPoints:5}});});vi.stubGlobal("fetch",fetcher);const apply=vi.fn();mount(file(),apply);
  fireEvent.click(await screen.findByRole("button",{name:fourView.preview}));const use=await screen.findByRole("button",{name:fourView.apply});expect(use).toBeDisabled();expect(apply).not.toHaveBeenCalled();fireEvent.click(screen.getByLabelText(fourView.confirmViews));fireEvent.click(use);expect(apply.mock.calls[0][0].map((f:File)=>f.name)).toEqual(["front.png","left.png","back.png","right.png"]);expect(fetcher.mock.calls.filter(([,init])=>init?.method==="POST")).toHaveLength(0);
 });
 it("aborts private image reads when the account component is removed",async()=>{
  mocked.request.mockResolvedValue([complete]);const signals:AbortSignal[]=[];vi.stubGlobal("fetch",vi.fn(async(url:string,init?:RequestInit)=>{if(url.includes("/views/")){signals.push(init!.signal!);return new Promise<Response>(()=>{});}return Response.json({ok:true,data:{available:true,costPoints:5}});}));const ui=mount(file());fireEvent.click(await screen.findByRole("button",{name:fourView.preview}));await waitFor(()=>expect(signals).toHaveLength(4));ui.unmount();expect(signals.every(signal=>signal.aborted)).toBe(true);
 });
 it("does not resubmit a result with wrong dimensions",async()=>{
  mocked.request.mockResolvedValue([{...complete,status:"NEEDS_REVIEW",errorCode:"GRID_DIMENSIONS_INVALID"}]);mount(file());await screen.findByText(fourView.dimensionMismatch);expect(screen.queryByRole("button",{name:fourView.apply})).toBeNull();expect(mocked.request.mock.calls.filter(([,method])=>method==="POST")).toHaveLength(0);
 });
});
