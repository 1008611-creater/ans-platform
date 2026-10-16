import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { act,cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
import { CreditsCenter } from "@/components/workspace/credits-center";
import { getCreditProducts } from "@/lib/credits-catalog";
const mocks=vi.hoisted(()=>({fetch:vi.fn(),refresh:vi.fn()}));
vi.mock("next-intl",()=>({useLocale:()=>"zh-CN",useTranslations:()=>((key:string,args?:Record<string,string|number>)=>key+(args?JSON.stringify(args):""))}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:mocks.refresh})}));
vi.mock("@/components/auth/account-content-boundary",()=>({AccountContentBoundary:({children}:{children:React.ReactNode})=>children}));
const billing={rechargeYuanPerPoint:0.1,usdQuotaPerPoint:null,gptConsumptionMultiplier:0.16,deepseekConsumptionMultiplier:1,rechargeEnabled:false};
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal("fetch",mocks.fetch);});afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
describe("live voucher offers",()=>{
 it("shows one balance and reservation summary, keeps costs visible and reveals redemption help on demand",async()=>{
  render(<CreditsCenter actorId="current-user" billing={billing} availablePoints={123.456789} reservedPoints={0.125001} pendingCount={2}/>);
  expect(screen.getAllByText("balance")).toHaveLength(1);
  expect(screen.getAllByText("reserved")).toHaveLength(1);
  expect(screen.getByText("123.456789")).toBeVisible();
  expect(screen.getByText("0.125001")).toBeVisible();
  expect(screen.getByText('pending{"count":2}')).toBeVisible();
  expect(screen.getByText("hold")).toBeVisible();
  expect(screen.getByText('rules{"gpt":0.16,"deepseek":1}')).toBeVisible();
  expect(screen.getByText("checkoutFees")).toBeVisible();
  expect(screen.getByText("accountNote")).toBeVisible();
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"redemptionGuide"}));
  const help=await screen.findByRole("dialog",{name:"redemptionGuide"});
  expect(help).toHaveTextContent("buyStep");
  expect(help).toHaveTextContent("receiveStep");
  expect(help).toHaveTextContent("redeemStep");
  expect(mocks.fetch).not.toHaveBeenCalled();
 });

 it("shows six verified denominations and the full balance precision without changing purchase currency",()=>{const products=getCreditProducts({ANS_CREDIT_PRODUCT_100_URL:"https://wzyp.cn/item/gear3z",ANS_CREDIT_PRODUCT_500_URL:"https://wzyp.cn/item/tme6gj",ANS_CREDIT_PRODUCT_1000_URL:"https://wzyp.cn/item/fjg7om",ANS_CREDIT_PRODUCT_2000_URL:"https://wzyp.cn/item/vzgq9f",ANS_CREDIT_PRODUCT_5000_URL:"https://wzyp.cn/item/yz6ej2"});render(<CreditsCenter actorId="current-user" billing={billing} availablePoints={0.997336} products={products}/>);expect(screen.getByText("0.997336")).toBeVisible();expect(screen.getAllByRole("radio")).toHaveLength(6);expect(screen.getByRole("link",{name:"purchase"})).toHaveAttribute("href","https://wzyp.cn/item/gear3z");fireEvent.click(screen.getByRole("radio",{name:/10 pointsUnit/}));expect(screen.getByRole("link",{name:"purchase"})).toHaveAttribute("href","https://wzyp.cn/item/zkm211");products.forEach(p=>expect(p.points/p.faceValueYuan).toBe(10));expect(mocks.fetch).not.toHaveBeenCalled();});
 it("does not reuse the10-point SKU for a different denomination",()=>{const products=getCreditProducts({ANS_CREDIT_PRODUCT_100_URL:"https://wzyp.cn/item/zkm211"});expect(products.find(p=>p.points===100)?.purchaseUrl).toBeNull();expect(products.find(p=>p.points===10)?.purchaseUrl).toBe("https://wzyp.cn/item/zkm211");});
 it("keeps account binding and prevents a second in-flight redemption",async()=>{let resolve!: (v:unknown)=>void;mocks.fetch.mockReturnValue(new Promise(r=>{resolve=r;}));render(<CreditsCenter actorId="current-user" billing={billing} availablePoints={0}/>);fireEvent.change(screen.getByLabelText("code"),{target:{value:"ANS-PRIVATE"}});fireEvent.submit(screen.getByLabelText("code").closest("form")!);fireEvent.submit(screen.getByLabelText("code").closest("form")!);expect(mocks.fetch).toHaveBeenCalledOnce();expect(mocks.fetch.mock.calls[0][1].headers["x-ans-actor"]).toBe("current-user");resolve({ok:true,json:async()=>({points:10,duplicate:false})});await waitFor(()=>expect(mocks.refresh).toHaveBeenCalledOnce());expect(screen.getByLabelText("code")).toHaveValue("");});
 it("retains a code on transport failure so an idempotent retry can recover its receipt",async()=>{mocks.fetch.mockRejectedValue(new TypeError("network"));render(<CreditsCenter actorId="current-user" billing={billing} availablePoints={0}/>);fireEvent.change(screen.getByLabelText("code"),{target:{value:"ANS-PRIVATE"}});fireEvent.click(screen.getByRole("button",{name:"redeem"}));await screen.findByRole("alert");expect(screen.getByLabelText("code")).toHaveValue("ANS-PRIVATE");expect(mocks.refresh).not.toHaveBeenCalled();});
 it("shows one precise balance beside reservations and keeps task-history scopes explicit",()=>{
  render(<CreditsCenter actorId="current-user" billing={billing} availablePoints={0.997336} reservedPoints={0.016274} pendingCount={2}/>);
  expect(screen.getAllByText("0.997336")).toHaveLength(1);
  expect(screen.getByText(/0.016274/)).toBeVisible();
  expect(screen.getByText('pendingTitle{"count":2}')).toBeVisible();
  expect(screen.getByRole("navigation",{name:"entryPoints"})).toBeInTheDocument();
  expect(screen.getByRole("link",{name:/connectionTitle/})).toHaveAttribute("href","/settings");
  expect(screen.getByRole("link",{name:/projectsTitle/})).toHaveAttribute("href","/projects");
  expect(screen.getByRole("link",{name:/runsTitle/})).toHaveAttribute("href","/workflows/runs");
  expect(screen.getByRole("link",{name:/aigcTitle aigcBody/})).toHaveAttribute("href","/workspace/compute");
  expect(screen.getByText("DeepSeek V4.1 Flash")).toBeVisible();
  expect(screen.getByText('modelMultiplier{"multiplier":1}')).toBeVisible();
  expect(screen.getAllByText('modelMultiplier{"multiplier":0.16}')).toHaveLength(2);
  expect(screen.queryByText(/opus/i)).not.toBeInTheDocument();
 });
 it("restores an unconfirmed redemption after timeout and ignores its late success",async()=>{
  vi.useFakeTimers();
  let resolve!: (value:unknown)=>void;
  mocks.fetch.mockReturnValue(new Promise(r=>{resolve=r;}));
  render(<CreditsCenter actorId="current-user" billing={billing} availablePoints={0}/>);
  fireEvent.change(screen.getByLabelText("code"),{target:{value:"ANS-PRIVATE"}});
  fireEvent.click(screen.getByRole("button",{name:"redeem"}));
  const signal=mocks.fetch.mock.calls[0][1].signal as AbortSignal;
  await act(async()=>{vi.advanceTimersByTime(20_000);});
  expect(signal.aborted).toBe(true);
  expect(screen.getByRole("alert")).toHaveTextContent("unconfirmed");
  expect(screen.getByLabelText("code")).toHaveValue("ANS-PRIVATE");
  expect(screen.getByRole("button",{name:"redeem"})).toBeEnabled();
  await act(async()=>{resolve({ok:true,json:async()=>({points:10,duplicate:false})});});
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(screen.getByLabelText("code")).toHaveValue("ANS-PRIVATE");
 });
 it("cancels the pending request on unmount instead of applying its response",async()=>{
  let resolve!: (value:unknown)=>void;
  mocks.fetch.mockReturnValue(new Promise(r=>{resolve=r;}));
  const view=render(<CreditsCenter actorId="current-user" billing={billing} availablePoints={0}/>);
  fireEvent.change(screen.getByLabelText("code"),{target:{value:"ANS-PRIVATE"}});
  fireEvent.click(screen.getByRole("button",{name:"redeem"}));
  const signal=mocks.fetch.mock.calls[0][1].signal as AbortSignal;
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async()=>{resolve({ok:true,json:async()=>({points:10,duplicate:false})});});
  expect(mocks.refresh).not.toHaveBeenCalled();
 });

 it("shows recent API requests without treating unknown or provisional costs as zero",()=>{
  const createdAt="2026-10-16T01:00:00.000Z";
  const uncertain={id:"ans-public-request",modelId:"gpt-6.1-sol",state:"UNCERTAIN" as const,authorizedPoints:0.500001,settledPoints:0,createdAt,startedAt:createdAt,finishedAt:null};
  const {container}=render(<CreditsCenter actorId="current-user" billing={billing} availablePoints={1} apiHistory={[uncertain]}/>);
  const history=container.querySelector('[aria-labelledby="credits-api-history-heading"]')!;
  expect(history).toHaveTextContent("apiHistoryScope");
  expect(history).toHaveTextContent("ans-public-request");
  expect(history).toHaveTextContent("apiStates.UNCERTAIN");
  expect(history).toHaveTextContent('apiPoints{"points":"0.500001"}');
  expect(history).toHaveTextContent("apiUnconfirmed");
  expect(history).not.toHaveTextContent('apiPoints{"points":"0"}');
  expect(history).toHaveTextContent("apiUncertainBody");
  expect(history.querySelectorAll("button")).toHaveLength(0);
  expect(history.querySelector('time')?.getAttribute("datetime")).toBe(createdAt);
  expect(history.querySelector('time')?.textContent).toContain("09:00");
 });
 it("keeps unavailable API history distinct from an empty history",()=>{
  const {rerender}=render(<CreditsCenter actorId="current-user" billing={billing} availablePoints={1} apiHistory={null}/>);
  expect(screen.getByRole("alert")).toHaveTextContent("apiHistoryUnavailable");
  expect(screen.queryByText("apiHistoryEmpty")).not.toBeInTheDocument();
  rerender(<CreditsCenter actorId="current-user" billing={billing} availablePoints={1} apiHistory={[]}/>);
  expect(screen.getByText("apiHistoryEmpty")).toBeVisible();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
 });

});
