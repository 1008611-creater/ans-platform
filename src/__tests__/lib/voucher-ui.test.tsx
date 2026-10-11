import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { act,cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
import { CreditsCenter } from "@/components/workspace/credits-center";
import zhProduct from "../../../messages/product/zh.json";
import enProduct from "../../../messages/product/en.json";
import { VoucherPanel } from "@/components/admin/voucher-panel";
const mocks=vi.hoisted(()=>({fetch:vi.fn(),refresh:vi.fn(),t:(key:string)=>key,session:{data:{user:{id:"actor"}},status:"authenticated"}}));
vi.mock("next-auth/react",()=>({useSession:()=>mocks.session}));
vi.mock("next-intl",()=>({useTranslations:()=>mocks.t}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:mocks.refresh})}));
const billing={rechargeYuanPerPoint:0.1,usdQuotaPerPoint:1,gptConsumptionMultiplier:0.16,deepseekConsumptionMultiplier:1,rechargeEnabled:false};
beforeEach(()=>{vi.clearAllMocks();mocks.session={data:{user:{id:"actor"}},status:"authenticated"};vi.stubGlobal("fetch",mocks.fetch);});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe("voucher user interface",()=>{
it("ships translations in the runtime product bundles",()=>{expect(zhProduct.vouchers.title).toBe("卡密兑换");expect(enProduct.vouchers.title).toBe("Redeem a voucher");expect(Object.keys(zhProduct.vouchers).sort()).toEqual(Object.keys(enProduct.vouchers).sort());expect(JSON.stringify(zhProduct.vouchers)).not.toMatch(/\?\?/);});
it("redeems into current account then clears the code and refreshes",async()=>{mocks.fetch.mockResolvedValue({ok:true,json:async()=>({points:10,balance:10,duplicate:false})});render(<CreditsCenter actorId="actor" billing={billing} availablePoints={0}/>);fireEvent.change(screen.getByLabelText("code"),{target:{value:"ANS-TEST"}});fireEvent.click(screen.getByRole("button",{name:"redeem"}));await screen.findByRole("status");expect(mocks.refresh).toHaveBeenCalledOnce();expect(screen.getByLabelText("code")).toHaveValue("");expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual({code:"ANS-TEST"});expect(mocks.fetch.mock.calls[0][0]).toBe("/api/quota/redeem");});
it("keeps the code visible on a transient failure for a safe retry",async()=>{mocks.fetch.mockResolvedValue({ok:false,json:async()=>({error:"REDEMPTION_FAILED"})});render(<CreditsCenter actorId="actor" billing={billing} availablePoints={0}/>);fireEvent.change(screen.getByLabelText("code"),{target:{value:"ANS-TEST"}});fireEvent.click(screen.getByRole("button",{name:"redeem"}));await screen.findByRole("alert");expect(screen.getByLabelText("code")).toHaveValue("ANS-TEST");expect(mocks.refresh).not.toHaveBeenCalled();});
it("renders generated codes and prevents replacing an unsaved batch",async()=>{mocks.fetch.mockImplementation(async(_url:string,opts?:RequestInit)=>({ok:true,json:async()=>opts?.method==="POST"?{codes:["ANS-CODE1","ANS-CODE2"]}:[]}));render(<VoucherPanel actorId="actor"/>);fireEvent.change(screen.getByLabelText("batchName"),{target:{value:"test batch"}});fireEvent.click(screen.getByRole("button",{name:"generate"}));await waitFor(()=>expect(screen.getByLabelText("code")).toHaveValue("ANS-CODE1\nANS-CODE2"));expect(screen.getByRole("button",{name:"generate"})).toBeDisabled();expect(screen.getByRole("button",{name:"download"})).toBeEnabled();fireEvent.click(screen.getByLabelText("saved"));expect(screen.queryByLabelText("code")).toBeNull();expect(screen.getByRole("button",{name:"generate"})).toBeEnabled();});

it("unmounts the old account code and balance on a session change",()=>{
 const ui=render(<CreditsCenter actorId="actor" billing={billing} availablePoints={123}/>);
 fireEvent.change(screen.getByLabelText("code"),{target:{value:"ANS-PRIVATE"}});
 mocks.session={data:{user:{id:"other"}},status:"authenticated"};
 ui.rerender(<CreditsCenter actorId="actor" billing={billing} availablePoints={123}/>);
 expect(screen.queryByLabelText("code")).toBeNull();expect(screen.queryByText("123")).toBeNull();
 expect(mocks.fetch).not.toHaveBeenCalled();
 mocks.session={data:{user:{id:"actor"}},status:"authenticated"};
 ui.rerender(<CreditsCenter actorId="actor" billing={billing} availablePoints={123}/>);
 expect(screen.getByLabelText("code")).toHaveValue("");
});
it("does not restore an administrator's codes from a late response after switching accounts",async()=>{
 let resolve!: (value:unknown)=>void;
 const pending=new Promise(resolvePending=>{resolve=resolvePending;});
 mocks.fetch.mockImplementation(async(_url:string,options?:RequestInit)=>options?.method==="POST"?pending:{ok:true,json:async()=>[]});
 const ui=render(<VoucherPanel actorId="actor"/>);
 fireEvent.change(screen.getByLabelText("batchName"),{target:{value:"Private batch"}});
 fireEvent.click(screen.getByRole("button",{name:"generate"}));
 await waitFor(()=>expect(mocks.fetch.mock.calls.some(call=>call[1]?.method==="POST")).toBe(true));
 mocks.session={data:{user:{id:"other"}},status:"authenticated"};
 ui.rerender(<VoucherPanel actorId="actor"/>);
 await act(async()=>{resolve({ok:true,json:async()=>({codes:["ANS-SECRET"]})});await pending;});
 expect(screen.queryByLabelText("code")).toBeNull();expect(screen.queryByText("ANS-SECRET")).toBeNull();
 mocks.session={data:{user:{id:"actor"}},status:"authenticated"};
 ui.rerender(<VoucherPanel actorId="actor"/>);
 expect(screen.queryByLabelText("code")).toBeNull();
});
});
