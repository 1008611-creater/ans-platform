// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createCipheriv, generateKeyPairSync, sign, verify } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AlipayMarketProvider, alipayCanonical, alipaySignedResponse } from "@/server/marketplace/providers/alipay";
import { WechatMarketProvider } from "@/server/marketplace/providers/wechat";
import { availableCashProviders, cashListingPolicy } from "@/server/marketplace/providers/config";
import { fenToYuan, yuanToFen } from "@/server/marketplace/providers/common";
const directory = mkdtempSync(join(tmpdir(), "ans-payment-crypto-"));
const merchant = generateKeyPairSync("rsa", { modulusLength: 2048 });
const provider = generateKeyPairSync("rsa", { modulusLength: 2048 });
const merchantFile = join(directory, "merchant.pem"); const providerFile = join(directory, "provider.pem");
writeFileSync(merchantFile, merchant.privateKey.export({ format: "pem", type: "pkcs8" }));
writeFileSync(providerFile, provider.publicKey.export({ format: "pem", type: "spki" }));
const orderId = "cmrealorder";
const payment = { appid: "wx1234567890123456", mchid: "1234567890", out_trade_no: orderId, transaction_id: "4200000123456", trade_state: "SUCCESS", amount: { total: 12345, currency: "CNY" } };
function signedWechat(body: string, timestamp = String(Math.floor(Date.now() / 1000))) {
 const nonce = "trusted-response-nonce"; return new Headers({ "Wechatpay-Serial": "PUB_KEY_ID_fixture", "Wechatpay-Timestamp": timestamp, "Wechatpay-Nonce": nonce, "Wechatpay-Signature": sign("RSA-SHA256", Buffer.from(`${timestamp}\n${nonce}\n${body}\n`), provider.privateKey).toString("base64") });
}
function wechatNotification(data: unknown, eventType = "TRANSACTION.SUCCESS") {
 const nonce = "abcdefghijkl"; const aad = "transaction"; const cipher = createCipheriv("aes-256-gcm", Buffer.from("1".repeat(32)), Buffer.from(nonce)); cipher.setAAD(Buffer.from(aad));
 const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final(), cipher.getAuthTag()]).toString("base64");
 const body = JSON.stringify({ id: "notification-1", event_type: eventType, resource_type: "encrypt-resource", resource: { algorithm: "AEAD_AES_256_GCM", ciphertext, nonce, associated_data: aad } }); return { body, headers: signedWechat(body) };
}
function alipayNotification(updates: Record<string, string> = {}) {
 const params = { app_id: "2026000000000001", seller_id: "2088000000000001", out_trade_no: orderId, trade_no: "2026000123456", trade_status: "TRADE_SUCCESS", total_amount: "123.45", notify_id: "notification-1", sign_type: "RSA2", ...updates };
 const signature = sign("RSA-SHA256", Buffer.from(alipayCanonical(params, true)), provider.privateKey).toString("base64");
 return { body: new URLSearchParams({ ...params, sign: signature }).toString(), headers: new Headers({ "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" }) };
}
function alipayResponse(method: string, value: unknown) {
 const payload = JSON.stringify(value); const signature = sign("RSA-SHA256", Buffer.from(payload), provider.privateKey).toString("base64"); return new Response(`{"${method.replaceAll(".", "_")}_response":${payload},"sign":${JSON.stringify(signature)}}`);
}
beforeEach(() => {
 vi.unstubAllEnvs(); vi.unstubAllGlobals();
 const env = { ANS_MARKET_CASH_ENABLED: "true", ANS_MARKET_CASH_ORIGIN: "https://ans.example", ANS_WECHAT_MCH_ID: payment.mchid, ANS_WECHAT_APP_ID: payment.appid, ANS_WECHAT_CERT_SERIAL: "12345678ABCDEF", ANS_WECHAT_PUBLIC_KEY_ID: "PUB_KEY_ID_fixture", ANS_WECHAT_PRIVATE_KEY_FILE: merchantFile, ANS_WECHAT_PUBLIC_KEY_FILE: providerFile, ANS_WECHAT_API_V3_KEY: "1".repeat(32), ANS_ALIPAY_APP_ID: "2026000000000001", ANS_ALIPAY_SELLER_ID: "2088000000000001", ANS_ALIPAY_PRIVATE_KEY_FILE: merchantFile, ANS_ALIPAY_PUBLIC_KEY_FILE: providerFile, ANS_MARKET_CASH_OFFICIAL_SELLER_IDS: "official", ANS_MARKET_CASH_OFFERS: JSON.stringify({ approved: { version: 3, priceMinor: 19900 } }), ANS_MARKET_CASH_COMMISSION_BPS: "500" };
 for (const [key,value] of Object.entries(env)) vi.stubEnv(key,value);
});
afterAll(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); rmSync(directory, { recursive: true }); });
describe("cash configuration and precise currency", () => {
 it("keeps both providers closed without an explicit enable flag", () => { vi.stubEnv("ANS_MARKET_CASH_ENABLED", "false"); expect(availableCashProviders()).toEqual([]); });
 it("does not infer cash prices from points listings or allow creator collections", () => {
  expect(cashListingPolicy("approved",3,"official")).toEqual({ priceMinor: 19900, commissionBps: 500 });
  expect(() => cashListingPolicy("approved",4,"official")).toThrow("CASH_PRICE_NOT_APPROVED"); expect(() => cashListingPolicy("approved",3,"creator")).toThrow("SELLER_CASH_NOT_ENABLED");
 });
 it("fails closed when a mounted verification key is missing", () => { vi.stubEnv("ANS_WECHAT_PUBLIC_KEY_FILE", join(directory,"absent")); expect(availableCashProviders()).toEqual(["alipay"]); });
 it("keeps cents exact and rejects scientific notation and fractional fen", () => {
  expect(fenToYuan(12345)).toBe("123.45"); expect(yuanToFen("0.01")).toBe(1); expect(yuanToFen("123.4")).toBe(12340);
  for (const value of ["1e2", "-1", "1.001", "01.00", "0.00", 12.3]) expect(() => yuanToFen(value)).toThrow();
 });
 it("rejects insecure origins", () => { vi.stubEnv("ANS_MARKET_CASH_ORIGIN", "http://ans.example"); expect(availableCashProviders()).toEqual([]); });
});
describe("WeChat authenticated protocol", () => {
 it("decrypts only correctly signed payment notifications", async () => { const n = wechatNotification(payment); expect(await new WechatMarketProvider().verifyWebhook(n.body,n.headers)).toMatchObject({ orderId, amountMinor:12345, provider:"wechat" }); });
 it("rejects a mutated body, untrusted key ID and stale signatures", async () => {
  const n = wechatNotification(payment); const adapter = new WechatMarketProvider();
  await expect(adapter.verifyWebhook(n.body+" ",n.headers)).rejects.toThrow("INVALID_PROVIDER_SIGNATURE");
  const wrong = new Headers(n.headers);wrong.set("Wechatpay-Serial","PUB_KEY_ID_attacker"); await expect(adapter.verifyWebhook(n.body,wrong)).rejects.toThrow();
  await expect(adapter.verifyWebhook(n.body,signedWechat(n.body,String(Math.floor(Date.now()/1000)-301)))).rejects.toThrow();
 });
 it("rejects wrong app or merchant even with a genuine provider signature", async () => {
  for (const update of [{appId:"wrong"},{mchid:"9999999999"}]) { const data = "appId" in update ? { ...payment, appid:update.appId } : { ...payment,...update }; const n=wechatNotification(data); await expect(new WechatMarketProvider().verifyWebhook(n.body,n.headers)).rejects.toThrow("PROVIDER_MERCHANT_MISMATCH"); }
 });
 it("rejects an authenticated ciphertext encrypted with the wrong API key", async () => { const n=wechatNotification(payment);vi.stubEnv("ANS_WECHAT_API_V3_KEY","2".repeat(32));await expect(new WechatMarketProvider().verifyWebhook(n.body,n.headers)).rejects.toThrow("INVALID_PROVIDER_EVENT"); });
 it("binds refund notifications to merchant request and full original amount", async () => {
  const data={mchid:payment.mchid,out_trade_no:orderId,transaction_id:payment.transaction_id,refund_id:"5000001",out_refund_no:"cmrefund",refund_status:"SUCCESS",amount:{total:12345,refund:12345}};
  const n=wechatNotification(data,"REFUND.SUCCESS");expect(await new WechatMarketProvider().verifyWebhook(n.body,n.headers)).toMatchObject({refundRequestId:"cmrefund",refundId:"5000001",type:"refund_succeeded"});
  const partial=wechatNotification({...data,amount:{total:12345,refund:100}},"REFUND.SUCCESS");await expect(new WechatMarketProvider().verifyWebhook(partial.body,partial.headers)).rejects.toThrow("INVALID_PROVIDER_AMOUNT");
 });
 it("constructs a verifiable merchant request and validates its Native response", async () => {
  const fetcher=vi.fn(async (_url: unknown,init: RequestInit) => {
   const auth=new Headers(init.headers).get("Authorization")!;const values=Object.fromEntries([...auth.matchAll(/(\w+)="([^"]+)"/g)].map(match=>[match[1],match[2]]));
   expect(verify("RSA-SHA256",Buffer.from(`POST\n/v3/pay/transactions/native\n${values.timestamp}\n${values.nonce_str}\n${init.body}\n`),merchant.publicKey,Buffer.from(values.signature,"base64"))).toBe(true);
   expect(JSON.parse(String(init.body))).toMatchObject({out_trade_no:orderId,amount:{total:12345,currency:"CNY"}});
   const body=JSON.stringify({code_url:"weixin://wxpay/bizpayurl?pr=trusted"});return new Response(body,{headers:signedWechat(body)});
  });vi.stubGlobal("fetch",fetcher);expect(await new WechatMarketProvider().createCheckout({orderId,amountMinor:12345,currency:"CNY",title:"Official service"})).toMatchObject({mode:"qr",url:"weixin://wxpay/bizpayurl?pr=trusted"});expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it("rejects a successful HTTP response without provider signature", async () => {vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify(payment))));await expect(new WechatMarketProvider().queryPayment(orderId)).rejects.toThrow("INVALID_PROVIDER_SIGNATURE");});
 it("treats a pending refund as pending", async () => {
  const result={out_trade_no:orderId,transaction_id:payment.transaction_id,refund_id:"5000001",out_refund_no:"cmrefund",status:"PROCESSING",amount:{total:12345,refund:12345,currency:"CNY"}}; const text=JSON.stringify(result);vi.stubGlobal("fetch",vi.fn(async()=>new Response(text,{headers:signedWechat(text)})));
  expect(await new WechatMarketProvider().queryRefund({orderId,paymentId:payment.transaction_id,refundRequestId:"cmrefund",amountMinor:12345,currency:"CNY"})).toBeNull();
 });
});
describe("Alipay authenticated protocol", () => {
 it("accepts valid RSA2 callbacks with merchant and amount binding", async () => {const n=alipayNotification();expect(await new AlipayMarketProvider().verifyWebhook(n.body,n.headers)).toMatchObject({orderId,amountMinor:12345,provider:"alipay"});});
 it("rejects duplicate form parameters and forged signatures", async () => {const n=alipayNotification();const a=new AlipayMarketProvider();await expect(a.verifyWebhook(n.body+"&total_amount=1.00",n.headers)).rejects.toThrow();await expect(a.verifyWebhook(n.body.replace("123.45","1.00"),n.headers)).rejects.toThrow("INVALID_PROVIDER_SIGNATURE");});
 it("rejects genuine notifications for another seller or app", async () => {for(const update of [{seller_id:"2088000000000002"},{app_id:"2026000000000002"}] as Record<string,string>[]){const n=alipayNotification(update);await expect(new AlipayMarketProvider().verifyWebhook(n.body,n.headers)).rejects.toThrow("PROVIDER_MERCHANT_MISMATCH");}});
 it("does not take a refund callback as payment or refund completion", async()=>{const n=alipayNotification({refund_fee:"123.45"});expect(await new AlipayMarketProvider().verifyWebhook(n.body,n.headers)).toBeNull();});
 it("creates a signed gateway URL but never trusts the browser return as payment",async()=>{const checkout=await new AlipayMarketProvider().createCheckout({orderId,amountMinor:12345,currency:"CNY",title:"Official service"});const params=Object.fromEntries(new URL(checkout.url).searchParams);expect(JSON.parse(params.biz_content)).toMatchObject({out_trade_no:orderId,total_amount:"123.45",seller_id:"2088000000000001"});expect(verify("RSA-SHA256",Buffer.from(alipayCanonical(params)),merchant.publicKey,Buffer.from(params.sign,"base64"))).toBe(true);});
 it("verifies exact signed JSON including whitespace and nested escaped strings",()=>{const raw='{"alipay_trade_query_response": {"code":"10000","detail":{"a":"brace } and \\\" quote","b":[1,{}]}},"sign":"YWJj"}';expect(alipaySignedResponse(raw,"alipay_trade_query_response").payload).toBe(' {"code":"10000","detail":{"a":"brace } and \\\" quote","b":[1,{}]}}'.trim());});
 it("rejects duplicate top-level signed envelopes",()=>{expect(()=>alipaySignedResponse('{"x_response":{"a":1},"x_response":{"a":2},"sign":"YWJj"}',"x_response")).toThrow();});
 it("rejects a signed query response for a different order",async()=>{vi.stubGlobal("fetch",vi.fn(async()=>alipayResponse("alipay.trade.query",{code:"10000",out_trade_no:"different",trade_no:"2026000123456",total_amount:"123.45",trade_status:"TRADE_SUCCESS"})));await expect(new AlipayMarketProvider().queryPayment(orderId)).rejects.toThrow("INVALID_PROVIDER_EVENT");});
 it("does not treat query HTTP10000 alone as a successful refund",async()=>{vi.stubGlobal("fetch",vi.fn(async()=>alipayResponse("alipay.trade.fastpay.refund.query",{code:"10000"})));expect(await new AlipayMarketProvider().queryRefund({orderId,paymentId:"2026000123456",refundRequestId:"cmrefund",amountMinor:12345,currency:"CNY"})).toBeNull();});
 it("requires explicit refund success and exact request, trade, amount",async()=>{const input={orderId,paymentId:"2026000123456",refundRequestId:"cmrefund",amountMinor:12345,currency:"CNY"};const data={code:"10000",out_trade_no:orderId,trade_no:input.paymentId,out_request_no:input.refundRequestId,total_amount:"123.45",refund_amount:"123.45",refund_status:"REFUND_SUCCESS"};vi.stubGlobal("fetch",vi.fn(async()=>alipayResponse("alipay.trade.fastpay.refund.query",data)));expect(await new AlipayMarketProvider().queryRefund(input)).toMatchObject({type:"refund_succeeded",refundRequestId:"cmrefund"});vi.stubGlobal("fetch",vi.fn(async()=>alipayResponse("alipay.trade.fastpay.refund.query",{...data,out_request_no:"someone-else"})));await expect(new AlipayMarketProvider().queryRefund(input)).rejects.toThrow("INVALID_PROVIDER_EVENT");});
});
describe("authenticated payment-state recovery",()=>{
 it("WeChat distinguishes a signed ORDER_NOT_EXIST from NOTPAY",async()=>{
  const absent=JSON.stringify({code:"ORDER_NOT_EXIST",message:"not found"});vi.stubGlobal("fetch",vi.fn(async()=>new Response(absent,{status:404,headers:signedWechat(absent)})));
  expect(await new WechatMarketProvider().inspectPayment(orderId)).toEqual({status:"NOT_FOUND"});
  const notpay=JSON.stringify({...payment,trade_state:"NOTPAY",transaction_id:undefined});vi.stubGlobal("fetch",vi.fn(async()=>new Response(notpay,{headers:signedWechat(notpay)})));
  expect(await new WechatMarketProvider().inspectPayment(orderId)).toEqual({status:"UNPAID",amountMinor:12345,currency:"CNY"});
 });
 it("WeChat treats only official HTTPS exact 404 as absence, never generic errors or bad signatures",async()=>{
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({code:"ORDER_NOT_EXIST"}),{status:404})));expect(await new WechatMarketProvider().inspectPayment(orderId)).toEqual({status:"NOT_FOUND"});
  const absence=JSON.stringify({code:"ORDER_NOT_EXIST"});const headers=signedWechat(absence);headers.set("Wechatpay-Signature","Zm9yZ2Vk");vi.stubGlobal("fetch",vi.fn(async()=>new Response(absence,{status:404,headers})));await expect(new WechatMarketProvider().inspectPayment(orderId)).rejects.toThrow("INVALID_PROVIDER_SIGNATURE");
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({code:"ORDER_NOT_EXIST"}),{status:403})));await expect(new WechatMarketProvider().inspectPayment(orderId)).rejects.toThrow("PAYMENT_PROVIDER_UNAVAILABLE");
  const generic=JSON.stringify({code:"SYSTEM_ERROR"});vi.stubGlobal("fetch",vi.fn(async()=>new Response(generic,{status:500,headers:signedWechat(generic)})));await expect(new WechatMarketProvider().inspectPayment(orderId)).rejects.toThrow("PAYMENT_PROVIDER_UNAVAILABLE");
 });
 it("WeChat validates merchant and amount on unpaid queries and keeps caller deadline",async()=>{
  const deadline=new Date(Math.floor((Date.now()+10*60_000)/1000)*1000).toISOString();
  vi.stubGlobal("fetch",vi.fn(async(_url:unknown,init:RequestInit)=>{expect(JSON.parse(String(init.body)).time_expire).toBe(deadline);const body=JSON.stringify({code_url:"weixin://wxpay/bizpayurl?pr=recovered"});return new Response(body,{headers:signedWechat(body)});}));
  expect((await new WechatMarketProvider().createCheckout({orderId,amountMinor:12345,currency:"CNY",title:"Real service",paymentExpiresAt:deadline})).expiresAt).toBe(deadline);
 });
 it("Alipay recognizes only its signed exact absence error, not WAIT_BUYER_PAY",async()=>{
  vi.stubGlobal("fetch",vi.fn(async()=>alipayResponse("alipay.trade.query",{code:"40004",sub_code:"ACQ.TRADE_NOT_EXIST"})));expect(await new AlipayMarketProvider().inspectPayment(orderId)).toEqual({status:"NOT_FOUND"});
  vi.stubGlobal("fetch",vi.fn(async()=>alipayResponse("alipay.trade.query",{code:"10000",out_trade_no:orderId,total_amount:"123.45",trade_status:"WAIT_BUYER_PAY"})));expect(await new AlipayMarketProvider().inspectPayment(orderId)).toEqual({status:"UNPAID",amountMinor:12345,currency:"CNY"});
  vi.stubGlobal("fetch",vi.fn(async()=>alipayResponse("alipay.trade.query",{code:"40004",sub_code:"ACQ.SYSTEM_ERROR"})));await expect(new AlipayMarketProvider().inspectPayment(orderId)).rejects.toThrow("PAYMENT_PROVIDER_UNAVAILABLE");
 });
 it("Alipay retry page retains absolute deadline rather than resetting a relative timeout",async()=>{
  const deadline=new Date(Math.floor((Date.now()+10*60_000)/1000)*1000).toISOString();const checkout=await new AlipayMarketProvider().createCheckout({orderId,amountMinor:12345,currency:"CNY",title:"Real service",paymentExpiresAt:deadline});
  const biz=JSON.parse(new URL(checkout.url).searchParams.get("biz_content")!);expect(biz.time_expire).toBe(new Date(Date.parse(deadline)+8*3600_000).toISOString().slice(0,19).replace("T"," "));expect(biz).not.toHaveProperty("timeout_express");expect(checkout.expiresAt).toBe(deadline);
 });
 it("close commands use the existing merchant order ID and do not invent a successful closed state",async()=>{
  const fetcher=vi.fn(async(url:unknown)=>{expect(String(url)).toContain("/close");return new Response(null,{status:204});});vi.stubGlobal("fetch",fetcher);await new WechatMarketProvider().closePayment(orderId);expect(fetcher.mock.calls[0][0]).toBe(`https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${orderId}/close`);
  vi.stubGlobal("fetch",vi.fn(async()=>alipayResponse("alipay.trade.close",{code:"10000",out_trade_no:"different"})));await expect(new AlipayMarketProvider().closePayment(orderId)).rejects.toThrow("INVALID_PROVIDER_EVENT");
 });
});

describe("current Native code_url format",()=>{
 it("accepts the official /bizpayurl/up response path",async()=>{
  const text=JSON.stringify({code_url:"weixin://wxpay/bizpayurl/up?pr=trusted&groupid=00"});vi.stubGlobal("fetch",vi.fn(async()=>new Response(text,{headers:signedWechat(text)})));
  expect(await new WechatMarketProvider().createCheckout({orderId,amountMinor:12345,currency:"CNY",title:"Real service"})).toMatchObject({url:"weixin://wxpay/bizpayurl/up?pr=trusted&groupid=00"});
 });
});
