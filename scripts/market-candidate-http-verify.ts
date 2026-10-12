import assert from "node:assert/strict";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {randomBytes,createHash} from "node:crypto";
import bcrypt from "bcryptjs";
const database=new URL(process.env.DATABASE_URL||"http://invalid");
assert(["localhost","127.0.0.1"].includes(database.hostname)&&/^\/ans_test/.test(database.pathname));
process.env.ANS_UNIFIED_POINTS_ENABLED="1";process.env.NEXT_PUBLIC_APP_URL="https://ans.cauai.fun";
const base="http://127.0.0.1:3018", prefix="preview-"+Date.now().toString(36), password="IsolatedMarketOnly123!";
const checks:string[]=[];
async function main(){
 const {db}=await import("../src/lib/db");
 const listingApi=await import("../src/server/marketplace/listings");const integration=await import("../src/server/marketplace/integration");
 try{
 const users=await Promise.all(["seller","buyer","other","admin"].map(async role=>db.user.create({data:{username:prefix+"-"+role,email:prefix+"-"+role+"@example.invalid",password:await bcrypt.hash(password,10),name:"[ISOLATED] "+role,locale:"zh",emailVerified:new Date(),role:role==="admin"?"ADMIN":"USER",quotaPoints:role==="buyer"?100:0}})));
 const [seller,buyer,other,admin]=users;await db.quotaLedger.create({data:{userId:buyer.id,amount:100,balanceAfter:100,reason:"GRANT",refType:"isolated_seed",refId:prefix}});
 async function login(email:string){
  const cookies=new Map<string,string>();
  const collect=(r:Response)=>{for(const c of r.headers.getSetCookie()){const first=c.split(";",1)[0];const i=first.indexOf("=");cookies.set(first.slice(0,i),first.slice(i+1));}};
  const csrf=await fetch(base+"/api/auth/csrf");collect(csrf);const {csrfToken}=await csrf.json();
  const res=await fetch(base+"/api/auth/callback/credentials",{method:"POST",redirect:"manual",headers:{"content-type":"application/x-www-form-urlencoded","x-auth-return-redirect":"1",cookie:[...cookies].map(([k,v])=>k+"="+v).join("; ")},body:new URLSearchParams({email,password,csrfToken,callbackUrl:base+"/market"})});collect(res);
  const cookie=[...cookies].map(([k,v])=>k+"="+v).join("; ");const session=await fetch(base+"/api/auth/session",{headers:{cookie}});assert.ok((await session.json()).user?.id,"Credential login failed");return cookie;
 }
 const sellerCookie=await login(seller.email!),buyerCookie=await login(buyer.email!),otherCookie=await login(other.email!);checks.push("real credentials sessions on isolated candidate");
 const sh={cookie:sellerCookie,origin:base,"x-ans-actor":seller.id},bh={cookie:buyerCookie,origin:base,"x-ans-actor":buyer.id};
 async function post(path:string,body:unknown,headers:Record<string,string>,expected=200){const r=await fetch(base+path,{method:"POST",headers:{"content-type":"application/json",...headers},body:JSON.stringify(body)});assert.equal(r.status,expected,path);return await r.json();}
 const bytes=await readFile("public/vibe-hub/vh-logo-v4-tight.png");
 const form=()=>{const f=new FormData();f.set("file",new File([bytes],"cover.png",{type:"image/png"}));return f;};
 const upload=await fetch(base+"/api/market/media",{method:"POST",headers:sh,body:form()});assert.equal(upload.status,201);const uploaded=await upload.json();assert.equal(uploaded.ok,true);const path=new URL(uploaded.data.url).pathname;
 const owner=await fetch(base+path,{headers:{cookie:sellerCookie}});assert.equal(owner.status,200);assert.equal(owner.headers.get("x-content-type-options"),"nosniff");assert.deepEqual(Buffer.from(await owner.arrayBuffer()),bytes);assert.equal((await fetch(base+path)).status,404);assert.equal((await fetch(base+path,{headers:{cookie:otherCookie}})).status,404);checks.push("HTTP upload exact bytes, owner access and private 404");
 assert.equal((await fetch(base+"/api/market/media",{method:"POST",headers:{...sh,"x-ans-actor":other.id},body:form()})).status,409);
 assert.equal((await fetch(base+"/api/market/media",{method:"POST",headers:{...sh,origin:"https://evil.invalid"},body:form()})).status,403);
 assert.equal((await fetch(base+"/api/market/media",{method:"POST",body:form()})).status,401);
 assert.equal((await fetch(base+"/api/market/media",{method:"POST",headers:{...sh,"content-type":"application/json"},body:"{}"})).status,415);
 const invalid=new FormData();invalid.set("file",new File(["<svg/>"],"bad.png",{type:"image/png"}));assert.equal((await fetch(base+"/api/market/media",{method:"POST",headers:sh,body:invalid})).status,400);
 const large=new FormData();large.set("file",new File([new Uint8Array(4*1024*1024+65537)],"large.png",{type:"image/png"}));assert.equal((await fetch(base+"/api/market/media",{method:"POST",headers:sh,body:large})).status,413);checks.push("media HTTP actor, cross-origin, anonymous, type and body limits");
 const offer={slug:prefix,title:"[ISOLATED] Project market acceptance",summary:"Isolated preview verifies project cards, tiers and points only.",description:"This item exists only in a disposable verification database. It is not a real product or production listing.",category:"web",subcategory:"documentation",fulfillment:"resource",priceMinor:1000,currency:"CNY",deliveryDays:1,revisionLimit:1,computeIncluded:false,deliverables:["Source project","Integration guide"],licenseTerms:"Isolated technical fixture only; no actual commercial license.",githubUrl:"https://github.com/1008611-creater/ans-points-sdk",usageUrl:"https://example.invalid/project",coverUrl:uploaded.data.url,pricingTiers:[{id:"basic",title:"Basic project",description:"Source project",priceMinor:1000,deliverables:["Source project"]},{id:"plus",title:"Project with setup",description:"Source and integration",priceMinor:2500,deliverables:["Source project","Integration guide"]}]};
 const denied=await post("/api/market/listings",{...offer,slug:prefix+"-other"},{cookie:otherCookie,origin:base,"x-ans-actor":other.id},403);assert.equal(denied.error.code,"MEDIA_PERMISSION_REQUIRED");
 const created=await post("/api/market/listings",offer,sh,201);const listing=created.data.listing;await listingApi.submitMarketListing(listing.id,seller.id,1);await listingApi.reviewMarketListing(listing.id,admin.id,1,true,"Isolated candidate review");assert.equal((await fetch(base+path)).status,200);checks.push("HTTP cover ownership rejects unrelated seller and publishes only approved owner cover");
 const starPath="/api/market/listings/"+listing.id+"/star";
 const stars=await Promise.all([true,true].map(starred=>fetch(base+starPath,{method:"PUT",headers:{...bh,"content-type":"application/json"},body:JSON.stringify({starred})})));assert.ok(stars.every(r=>r.status===200));assert.equal(await db.marketListingStar.count({where:{listingId:listing.id,userId:buyer.id}}),1);checks.push("HTTP authenticated concurrent Star has one relation");
 await post("/api/market/orders",{listingId:listing.id,expectedVersion:1,tierId:"plus",paymentMethod:"POINTS",idempotencyKey:prefix+"-bad",requirements:"Isolated candidate",amount:0},bh,400);
 const integrationSetup=await integration.configureMarketIntegration(listing.id,seller.id,{action:"rotate",returnOrigins:["https://example.invalid"]});assert.ok("key"in integrationSetup);if(!("key"in integrationSetup))throw Error("setup");
 const merchantHeaders={authorization:"Bearer "+integrationSetup.key};
 await post("/api/integrations/market/v1/checkouts",{reference:prefix+"-origin",tierId:"basic",returnUrl:"https://example.invalid/return"},{...merchantHeaders,origin:base},403);
 const tooLarge=await fetch(base+"/api/integrations/market/v1/checkouts",{method:"POST",headers:{...merchantHeaders,"content-type":"application/json"},body:JSON.stringify({reference:"x".repeat(11000)})});assert.equal(tooLarge.status,413);
 const command={reference:prefix+"-checkout",tierId:"plus",returnUrl:"https://example.invalid/return"};const [first,repeat]=await Promise.all([post("/api/integrations/market/v1/checkouts",command,merchantHeaders,201),post("/api/integrations/market/v1/checkouts",command,merchantHeaders,201)]);assert.equal(first.data.id,repeat.data.id);checks.push("merchant HTTP rejects browser Origin/body excess and retains concurrent checkout identity");
 const checkout=first.data;const [paid,paidAgain]=await Promise.all([post("/api/market/checkouts/"+checkout.id+"/confirm",{},bh),post("/api/market/checkouts/"+checkout.id+"/confirm",{},bh)]);assert.equal(paid.data.status,"paid");assert.equal(paidAgain.data.orderId,paid.data.orderId);assert.equal((await db.user.findUniqueOrThrow({where:{id:buyer.id}})).quotaPoints,75);assert.equal(await db.quotaLedger.count({where:{userId:buyer.id,refId:paid.data.orderId,amount:{lt:0}}}),1);checks.push("real HTTP confirm debits authoritative points exactly once");
 const receipt=await fetch(base+"/api/integrations/market/v1/checkouts/"+checkout.id,{headers:merchantHeaders});assert.equal(receipt.status,200);assert.equal((await receipt.json()).data.entitlementActive,true);
 const pending=await post("/api/integrations/market/v1/checkouts",{...command,reference:prefix+"-pending"},merchantHeaders,201);
 const evidence={isolated:true,productionWrites:0,providersCalled:0,checks,sourceImage:"candidate",listingId:listing.id,slug:prefix,checkoutId:checkout.id,pendingCheckoutId:pending.data.id,orderId:paid.data.orderId,sellerEmail:seller.email,buyerEmail:buyer.email,otherEmail:other.email};
 await mkdir(".workbuddy/evidence/market-candidate",{recursive:true});await writeFile(".workbuddy/evidence/market-candidate/http.json",JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
 }finally{await db.$disconnect();}
}
main().catch(error=>{console.error("CANDIDATE_HTTP_FAILED",error instanceof assert.AssertionError?{message:error.message,actual:error.actual,expected:error.expected}:error instanceof Error?error.name:"unknown");process.exitCode=1;});
