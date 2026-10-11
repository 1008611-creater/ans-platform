import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RefundOperations, type MarketRefundOperation } from "@/components/marketplace/refund-operations";
import { DisputeOperations } from "@/components/marketplace/dispute-operations";
const m=vi.hoisted(()=>({request:vi.fn(),refresh:vi.fn()}));
vi.mock("@/components/marketplace/account-boundary",()=>({useMarketRequest:()=>m.request}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:m.refresh})}));
vi.mock("next-intl",()=>({useTranslations:()=>Object.assign((key:string)=>key,{has:()=>true})}));
const refund:MarketRefundOperation={id:"refund",orderId:"order",provider:"wechat",providerSupported:true,status:"PENDING_DISPATCH",amountMinor:9900,currency:"CNY",reason:"UNALLOCATED_PAYMENT",requestedAt:"2026-10-11T10:00:00Z",completedAt:null};
beforeEach(()=>vi.clearAllMocks());afterEach(cleanup);
describe("financial operations require explicit actions",()=>{
 it("performs no financial request when viewing the refund queue",()=>{render(<RefundOperations items={[refund]} nextCursor={null} view="pending"/>);expect(m.request).not.toHaveBeenCalled();expect(screen.getByText(/status.PENDING_DISPATCH/)).toBeInTheDocument();});
 it("keeps a submitted refund separate from confirmed return",async()=>{m.request.mockResolvedValue({completed:false});render(<RefundOperations items={[refund]} nextCursor={null} view="pending"/>);fireEvent.click(screen.getByRole("checkbox"));await act(async()=>fireEvent.submit(screen.getByRole("checkbox").closest("form")!));expect(m.request).toHaveBeenCalledWith("/api/admin/market/orders/order/refund","POST",{action:"dispatch",refundId:"refund"});expect(screen.getByRole("status")).toHaveTextContent("awaitingConfirmation");expect(screen.getByRole("status")).not.toHaveTextContent("completed");});
 it("only verified reconciliation shows completed refund",async()=>{m.request.mockResolvedValue({completed:true});render(<RefundOperations items={[refund]} nextCursor={null} view="pending"/>);await act(async()=>fireEvent.click(screen.getByRole("button",{name:"reconcile"})));expect(screen.getByRole("status")).toHaveTextContent("completed");});
 it("does not offer another dispatch for confirmed refunds",()=>{render(<RefundOperations items={[{...refund,status:"CONFIRMED",completedAt:"2026-10-11T11:00:00Z"}]} nextCursor={null} view="confirmed"/>);expect(screen.queryByRole("button",{name:"dispatch"})).not.toBeInTheDocument();});
 it("makes unapproved cash disputes discoverable and approval creates an obligation only",async()=>{m.request.mockResolvedValue({id:"refund"});render(<DisputeOperations items={[{id:"order",title:"Actual submitted order",amountMinor:9900,currency:"CNY",paymentMethod:"CASH",updatedAt:"2026-10-11T10:00:00Z",reason:"Submitted dispute"}]} nextCursor={null}/>);expect(m.request).not.toHaveBeenCalled();fireEvent.change(screen.getByRole("textbox",{name:"reviewReason"}),{target:{value:"Reviewed full refund"}});fireEvent.click(screen.getByRole("checkbox"));await act(async()=>fireEvent.submit(screen.getByRole("checkbox").closest("form")!));expect(m.request).toHaveBeenCalledWith("/api/admin/market/orders/order/refund","POST",{action:"approve",reason:"Reviewed full refund"});expect(m.refresh).toHaveBeenCalledTimes(1);});
});
