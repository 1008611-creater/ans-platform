await (async function () {
  const { test } = await import('node:test'); const assert = (await import('node:assert/strict')).default;
  const http = await import('node:http'); const { generateKeyPairSync, sign } = await import('node:crypto');
  const { configuration, createGateway } = await import('./server.mjs');
  const { seal, open, key, now, tenantId, challenge } = await import('./auth.mjs');
  const cookieKey = key(Buffer.alloc(32, 3).toString('base64url'));
  const config = configuration({ EASEL_FRONTEND_DIR: '/immutable-frontend', EASEL_PUBLIC_ORIGIN: 'https://easel.example.test', EASEL_OIDC_ISSUER: 'https://ans.example.test', EASEL_OIDC_CLIENT_ID: 'easel', EASEL_OIDC_CLIENT_SECRET: 'test-client-secret', EASEL_COOKIE_KEY: cookieKey.toString('base64url'), EASEL_TENANT_KEY: Buffer.alloc(32, 4).toString('base64url') });
  async function listen(server) { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return 'http://127.0.0.1:' + server.address().port; }
  async function close(server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  function session(subject = 'user-a', exp = now() + 120) { return config.sessionCookie + '=' + seal({ sub: subject, accessToken: 'access-' + subject, exp }, cookieKey, 'session'); }
  async function fixture(t, remote = async (_url, options) => ({ sub: options.headers.Authorization.slice('Bearer access-'.length) })) {
    const requests = []; const tenants = [];
    const upstream = http.createServer((request, response) => { requests.push({ url: request.url, headers: request.headers }); response.setHeader('Set-Cookie', 'worker=forbidden'); response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ ok: true })); });
    const target = await listen(upstream);
    const gateway = createGateway(config, { remote, containers: { resolve: async tenant => { tenants.push(tenant); return target; }, lease: () => () => {}, stopIdle: async () => {} } });
    const base = await listen(gateway); t.after(async () => { await close(gateway); await close(upstream); }); return { base, requests, tenants };
  }
  test('anonymous and forged users cannot reach profiles, assets or mutable settings', async t => {
    const f = await fixture(t);
    for (const path of ['/', '/api/personas', '/api/env', '/assets/app.js', '/api/accounts']) assert.equal((await fetch(f.base + path, { headers: { 'x-ans-user-id': 'user-a', cookie: '__Host-ans_easel_session=forged' } })).status, 401);
    assert.equal(f.requests.length, 0); assert.equal(f.tenants.length, 0);
  });
  test('expired and revoked sessions do not allocate a worker', async t => {
    const f = await fixture(t, async () => ({ sub: 'different-user' }));
    for (const cookies of [session('user-a', now() - 1), session('user-a')]) assert.equal((await fetch(f.base + '/api/accounts', { headers: { cookie: cookies } })).status, 401);
    assert.equal(f.tenants.length, 0);
  });
  test('proxy selects only verified identity and strips gateway credentials', async t => {
    const f = await fixture(t); const result = await fetch(f.base + '/api/accounts?userId=user-b', { headers: { cookie: session('user-a'), 'x-ans-easel-workspace': 'user-a', Authorization: 'Bearer test-secret', 'x-ans-user-id': 'user-b' } });
    assert.equal(result.status, 200); assert.deepEqual(f.tenants, [tenantId('user-a', config.tenantKey)]);
    assert.equal(f.requests[0].headers.cookie, undefined); assert.equal(f.requests[0].headers.authorization, undefined); assert.equal(f.requests[0].headers['x-ans-user-id'], undefined);
    assert.equal(result.headers.get('set-cookie'), null); assert.equal(result.headers.get('cache-control'), 'no-store, private');
    assert(result.headers.get('content-security-policy').includes("sandbox allow-scripts allow-downloads"));
    assert(result.headers.get('content-security-policy').includes("frame-ancestors 'self' https://ans.example.test"));
  });
  test('cross-origin writes are denied before starting a worker', async t => {
    const f = await fixture(t);
    for (const origin of ['https://evil.test', 'https://ans.example.test', undefined]) assert.equal((await fetch(f.base + '/api/env', { method: 'POST', body: '{}', headers: { cookie: session(), ...(origin ? { origin } : {}) } })).status, 403);
    assert.equal(f.tenants.length, 0);
    assert.equal((await fetch(f.base + '/api/env', { method: 'POST', body: '{}', headers: { cookie: session(), 'x-ans-easel-workspace': 'user-a', origin: config.publicOrigin, 'Content-Type': 'application/json' } })).status, 200);
  });
  test('two signed users choose different workers regardless of client headers', async t => {
    const f = await fixture(t); await fetch(f.base + '/api/personas', { headers: { cookie: session('user-a'), 'x-ans-easel-workspace': 'user-a' } });
    await fetch(f.base + '/api/personas', { headers: { cookie: session('user-b'), 'x-ans-easel-workspace': 'user-b', 'x-ans-user-id': 'user-a' } }); assert.notEqual(f.tenants[0], f.tenants[1]);
  });
  test('OIDC binds PKCE, callback, one-use state and verified nonce', async t => {
    const pair = generateKeyPairSync('rsa', { modulusLength: 2048 }); let transaction; const calls = [];
    const f = await fixture(t, async (url, options) => {
      calls.push({ url, options }); if (url.endsWith('/jwks')) return { keys: [{ ...pair.publicKey.export({ format: 'jwk' }), kid: 'test', alg: 'RS256' }] };
      const data = { iss: config.issuer, aud: config.clientId, nonce: transaction.nonce, sub: 'user-a', iat: now(), exp: now() + 300 };
      const signed = [{ alg: 'RS256', kid: 'test' }, data].map(v => Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
      return { id_token: signed + '.' + sign('RSA-SHA256', Buffer.from(signed), pair.privateKey).toString('base64url'), access_token: 'access-user-a', expires_in: 300 };
    });
    const start = await fetch(f.base + '/ans/oidc/start?silent=1&expected=user-a&return_to=https://evil.test', { redirect: 'manual' });
    const authorization = new URL(start.headers.get('location')); const txCookie = start.headers.get('set-cookie').split(';')[0];
    transaction = open(txCookie.split('=')[1], config.cookieKey, 'transaction');
    assert.equal(authorization.origin, config.issuer); assert.equal(authorization.searchParams.get('prompt'), 'none');
    assert.equal(authorization.searchParams.get('redirect_uri'), config.publicOrigin + '/ans/oidc/callback');
    assert.equal(authorization.searchParams.get('code_challenge'), challenge(transaction.verifier));
    const callback = f.base + '/ans/oidc/callback?state=' + transaction.state + '&code=one-use-code';
    const result = await fetch(callback, { redirect: 'manual', headers: { cookie: txCookie } });
    assert.equal(result.status, 302); assert.equal(result.headers.get('location'), '/ans/embed?expected=user-a');
    assert(result.headers.getSetCookie().some(value => value.startsWith(config.sessionCookie + '=') && value.includes('HttpOnly') && value.includes('Secure')));
    assert.equal(new URLSearchParams(calls[0].options.body).get('code_verifier'), transaction.verifier);
    assert.equal((await fetch(callback, { redirect: 'manual', headers: { cookie: txCookie } })).status, 401); assert.equal(f.tenants.length, 0);
  });
  test('old workspace cannot read or write using a newly switched session', async t => {
    const f = await fixture(t);
    for (const method of ['GET','POST']) assert.equal((await fetch(f.base + '/api/accounts', {method, headers:{cookie:session('user-b'),'x-ans-easel-workspace':'user-a',origin:config.publicOrigin}})).status,401);
    assert.equal(f.tenants.length,0);
  });
  test('embedded renewal script compiles and permits its ANS identity redirect', async t => {
    const f = await fixture(t); const response = await fetch(f.base + '/ans/embed?expected=user-a', {headers:{cookie:session('user-a')}});
    const html=await response.text(); const {Script}=await import('node:vm'); new Script(html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
    assert(html.includes('ans:easel:renewed')); assert(response.headers.get('content-security-policy').includes("frame-src 'self' " + config.issuer));
  });
  test('unbound callbacks never exchange a code', async t => { let calls = 0; const f = await fixture(t, async () => { calls++; return {}; }); assert.equal((await fetch(f.base + '/ans/oidc/callback?state=forged&code=stolen')).status, 401); assert.equal(calls, 0); });
  test('browser media selects only its owner and carries a sandbox policy',async t=>{
    const f=await fixture(t);
    for(const cookie of [session('user-b'),'']) assert.equal((await fetch(f.base+'/ans/media/user-a/project/video.mp4',{headers:{cookie}})).status,401);
    assert.equal(f.tenants.length,0);
    const result=await fetch(f.base+'/ans/media/user-a/project/video.mp4',{headers:{cookie:session('user-a')}});
    assert.equal(result.status,200);assert.equal(f.requests[0].url,'/api/media/project/video.mp4');assert(result.headers.get('content-security-policy').includes('sandbox allow-scripts allow-downloads'));
  });
  test('runtime failure reports a code that the ANS frame can display',async t=>{
    const f=await fixture(t);const html=await(await fetch(f.base+'/ans/embed?expected=user-a',{headers:{cookie:session('user-a')}})).text();
    const messages=[];const {runInNewContext}=await import('node:vm');const parent={postMessage:data=>messages.push(data)};
    runInNewContext(html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1],{window:{parent,addEventListener:()=>{}},fetch:async()=>({ok:false}),setTimeout,clearTimeout,location:{}});
    await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(JSON.parse(JSON.stringify(messages)),[{type:'ans:easel:error',code:'runtime_unavailable'}]);
  });
  test('the immutable frontend is served locally and never selected from a worker',async t=>{
    const {mkdtemp,writeFile,mkdir,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
    const dir=await mkdtemp(join(tmpdir(),'ans-easel-front-'));await mkdir(join(dir,'assets'));await writeFile(join(dir,'index.html'),'<html><head></head><body>fixed-frontend</body></html>');await writeFile(join(dir,'assets','app.js'),'immutable asset');
    let workers=0;const gateway=createGateway({...config,frontendDirectory:dir},{remote:async()=>({sub:'user-a'}),containers:{resolve:async()=>{workers++;throw Error();},stopIdle:async()=>{}}});const base=await listen(gateway);
    t.after(async()=>{await close(gateway);await rm(dir,{recursive:true,force:true});});
    const result=await fetch(base+'/?ans_owner=user-a',{headers:{cookie:session('user-a')}});const html=await result.text();assert.equal(result.status,200);assert(html.includes('fixed-frontend'));assert(html.includes('X-ANS-Easel-Workspace'));
    assert.equal((await fetch(base+'/assets/app.js',{headers:{cookie:session('user-a')}})).status,200);assert.equal(workers,0);
    assert.equal((await fetch(base+'/onepage',{headers:{cookie:session('user-a')}})).status,404);
    assert.equal((await fetch(base+'/?ans_owner=user-b',{headers:{cookie:session('user-a')}})).status,401);
  });
})();
