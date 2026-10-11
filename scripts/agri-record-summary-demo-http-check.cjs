const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const origin = 'http://127.0.0.1:3162';
const dir = '.workbuddy/evidence/agri-summary';
const reproduce = process.argv.includes('--reproduce-previous-build');
const fixturePath = '.workbuddy/evidence/agri-demo/http-fixture.json';
class Client {
  constructor(actorId) { this.actorId = actorId; this.cookies = new Map(); }
  async fetch(path, init = {}) {
    const headers = new Headers(init.headers);
    headers.set('cookie', [...this.cookies].map(([k,v])=>k+'='+v).join('; '));
    const response = await fetch(origin + path, { ...init, headers, redirect:'manual', signal:AbortSignal.timeout(15000) });
    for (const cookie of response.headers.getSetCookie()) { const value=cookie.split(';',1)[0], at=value.indexOf('='); if(at>0)this.cookies.set(value.slice(0,at),value.slice(at+1)); }
    return response;
  }
  async login(email, password) {
    assert.ok(email.endsWith('@example.invalid'));
    const csrf=await (await this.fetch('/api/auth/csrf')).json();
    const response=await this.fetch('/api/auth/callback/credentials',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',origin,'X-Auth-Return-Redirect':'1'},body:new URLSearchParams({csrfToken:csrf.csrfToken,email,password,callbackUrl:origin+'/competitions/agrihackathon/works'})});
    assert.equal(response.status,200);
    const result=await response.json(); assert.ok(!new URL(result.url).searchParams.has('error'));
    assert.equal((await (await this.fetch('/api/auth/session')).json()).user?.id,this.actorId);
  }
  request(id, query='') { return this.fetch('/api/competitions/agrihackathon/records/'+encodeURIComponent(id)+'/summary'+query,{headers:this.actorId?{'x-ans-submission-actor':this.actorId}:{}}); }
}
(async()=>{
 const fixture=JSON.parse(await fs.readFile(fixturePath,'utf8'));assert.equal(fixture.localFixtureOnly,true);
 const source=await fs.readFile('scripts/agri-demo-http-check.ts','utf8');const password=source.match(/fixturePassword\s*=\s*"([^"]+)"/)?.[1];assert.ok(password);
 const report={observedAt:new Date().toISOString(),origin,fixture:'existing isolated r3 accounts only, no account/grant changes',productionWrites:false,accountMutations:false,mode:reproduce?'previous-build-reproduction':'fixed-build-regression',checks:[]};
 async function check(name, action){await action();report.checks.push({name,passed:true});}
 try {
 const full=new Client(fixture.full.id),reader=new Client(fixture.reader.id),member=new Client(fixture.member.id),anonymous=new Client(null);
 await check('actual Credentials and CSRF authenticate three existing synthetic accounts',async()=>{for(const [client,account] of [[full,fixture.full],[reader,fixture.reader],[member,fixture.member]])await client.login(account.email,password);});
 await check('anonymous summary requires login',async()=>assert.equal((await anonymous.request(fixture.submissionId)).status,401));
 await check('metadata default has exact provenance and no private body',async()=>{const r=await reader.request(fixture.submissionId);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const value=await r.json();assert.equal(value.data.source,'ANS_AGRI_LIVE_RECORD_SUMMARY');assert.equal(value.data.submission.id,fixture.submissionId);assert.equal(value.data.content,undefined);assert.ok(!JSON.stringify(value).includes('PRIVATE_HTTP_INTERNAL_NOTE'));});
 await check('explicit full ranges require their own independent scopes',async()=>{assert.equal((await reader.request(fixture.submissionId,'?includePrivate=true')).status,403);const r=await full.request(fixture.submissionId,'?includePrivate=true&includeInternal=true');assert.equal(r.status,200);assert.ok(JSON.stringify(await r.json()).includes('PRIVATE_HTTP_INTERNAL_NOTE'));});
 await check('own team cannot read staff summary',async()=>assert.equal((await member.request(fixture.submissionId)).status,403));
 await check('EXPORT is absent on existing full account and refuses clean attachment request',async()=>assert.equal((await full.request(fixture.submissionId,'?mode=exportJSON')).status,403));
 if(reproduce)await check('previous build reproduces ambiguous-mode attachment without EXPORT',async()=>{const r=await full.request(fixture.submissionId,'?mode=exportJSON&mode=view');assert.equal(r.status,200);assert.ok(r.headers.get('content-disposition')?.startsWith('attachment'));assert.equal((await r.json()).source,'ANS_AGRI_LIVE_RECORD_SUMMARY');});
 else await check('repeated keys are rejected before view, export, selection or audit',async()=>{for(const query of ['?mode=exportJSON&mode=view','?mode=view&mode=exportJSON','?mode=view&mode=view','?includePrivate=true&includePrivate=false','?includeInternal=false&includeInternal=true']){const r=await full.request(fixture.submissionId,query);assert.equal(r.status,400);assert.equal(r.headers.get('content-disposition'),null);assert.equal((await r.json()).error.code,'INVALID_INPUT');}});
 report.passed=true;
 }catch{report.passed=false;report.failure='HTTP assertion failed; no private response data retained';process.exitCode=1;}
 const output=dir+(reproduce?'/actual-http-previous-reproduction.json':'/actual-http-fixed-regression.json');await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,evidence:output}));
})().catch(()=>{console.error('Summary HTTP check failed, credentials suppressed');process.exitCode=1;});
