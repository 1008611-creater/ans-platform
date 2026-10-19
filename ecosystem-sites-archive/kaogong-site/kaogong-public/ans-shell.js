/** Shared ANS chrome; UI messages never grant access. OIDC remains server verified. */
(function () {
  'use strict';
  if (window.ANSPlatformShell) return;
  var issuer = 'https://ans.cauai.fun', host = document.createElement('div');
  host.className = 'ans-platform-host';
  var fallback = document.createElement('nav'); fallback.className = 'ans-platform-fallback'; fallback.setAttribute('aria-label', 'ANS 平台导航');
  var brand = document.createElement('a'); brand.href = issuer + '/explore'; brand.textContent = 'ANS';
  var label = document.createElement('span'); label.textContent = '正在连接平台账号…';
  var retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '重新连接'; retry.hidden = true;
  fallback.appendChild(brand); fallback.appendChild(label); fallback.appendChild(retry); host.appendChild(fallback);
  var header = document.createElement('iframe'); header.title = 'ANS 平台导航与账号'; header.className = 'ans-platform-frame'; header.src = issuer + '/embed/platform-header?parent=' + encodeURIComponent(location.origin); header.setAttribute('referrerpolicy', 'no-referrer'); host.appendChild(header);
  document.body.insertBefore(host, document.body.firstChild); document.body.classList.add('ans-platform-shell');
  var entry = location.pathname.indexOf('/trainer') === 0 || location.pathname === '/' ? 'trainer' : '', refreshing = false, job = null, timeout = 0, interval = 0, subject = null, platformSubject = null, signedIn = false, generation = 0, check = null;
  var renewal = null, renewed = null;
  var readyResolve; var ready = new Promise(function (resolve) { readyResolve = resolve; });
  function notify(user) {
    var changed = subject !== (user && user.id || null); subject = user && user.id || null;
    window.dispatchEvent(new CustomEvent('wrongbook:account', {detail: {user: user}}));
    window.dispatchEvent(new CustomEvent(user ? 'ans:session-ready' : 'ans:session-lost', {detail: {user: user, changed: changed}}));
    readyResolve(user);
  }
  function settleRenewal(user) { if (renewed) { var done = renewed; renewed = null; renewal = null; done(user); } }
  function pending(value) { document.body.classList.toggle('ans-identity-pending', value); }
  function session() { return fetch('/api/auth/session', {credentials:'same-origin', cache:'no-store'}).then(function (res) { if (!res.ok) throw Error('账号检查失败'); return res.json(); }); }
  function finish(ok) {
    window.clearTimeout(timeout); if (job) { job.remove(); job = null; } refreshing = false;
    if (!signedIn) ok = false;
    if (!ok) { pending(false); notify(null); settleRenewal(null); label.textContent = '使用 ANS 账号继续'; return; }
    session().then(function (info) {
      if (!signedIn || !info.user || platformSubject && info.user.id !== platformSubject) { pending(false); notify(null); settleRenewal(null); return; }
      pending(false); label.textContent = info.user.name; notify(info.user); settleRenewal(info.user);
    }).catch(function () { pending(false); label.textContent = '账号连接暂不可用'; notify(null); settleRenewal(null); });
  }
  function renew() {
    if (renewal) return renewal;
    if (!signedIn) return Promise.resolve(null);
    renewal = new Promise(function(resolve) { renewed = resolve; });
    refreshing = true; if (!subject || subject !== platformSubject) pending(true);
    job = document.createElement('iframe'); job.hidden = true; job.title = '衔接 ANS 登录状态'; job.src = '/api/auth/login?silent=1' + (entry ? '&entry=' + entry : ''); document.body.appendChild(job);
    timeout = window.setTimeout(function () { finish(false); }, 20000);
    return renewal;
  }
  function inspect() {
    if (check) return check;
    var version = generation;
    check = session().then(function (info) {
      if (version !== generation) return;
      if (signedIn && (!info.user || info.user.id !== platformSubject)) { if (info.user) notify(null); renew(); }
      else if (info.user) { pending(false); label.textContent = info.user.name; notify(info.user); }
      else if (!signedIn) { pending(false); readyResolve(null); }
    }).catch(function () { readyResolve(null); label.textContent = '账号连接暂不可用'; }).finally(function () { check = null; });
    return check;
  }
  function login() { location.assign('/api/auth/login' + (entry ? '?entry=' + entry : '')); }
  function receive(event) {
    var data = event.data || {};
    if (job && event.source === job.contentWindow && event.origin === location.origin && data.type === 'ans:auth-complete') { finish(data.ok === true); return; }
    if (event.source !== header.contentWindow || event.origin !== issuer) return;
    if (data.type === 'ans:platform-height' && typeof data.height === 'number' && Number.isFinite(data.height)) {
      header.style.height = Math.max(49, Math.min(data.height, window.innerHeight)) + 'px';
    }
    if (data.type === 'ans:platform-navigate' && typeof data.url === 'string') {
      var url; try { url = new URL(data.url); } catch (error) { return; }
      if (url.origin !== issuer) return;
      if (url.pathname === '/login') login(); else location.assign(url.href);
    }
    if (data.type === 'ans:platform-session' && typeof data.authenticated === 'boolean') {
      host.classList.add('ans-platform-connected'); retry.hidden = true;
      generation++; signedIn = data.authenticated; platformSubject = signedIn && typeof data.subject === 'string' ? data.subject : null;
      if (!signedIn) {
        window.clearTimeout(timeout); if (job) { job.remove(); job = null; } refreshing = false;
        pending(true); notify(null); settleRenewal(null);
        // ANS logout does not leave an independently authenticated private page behind.
        fetch('/api/auth/logout', {method:'POST', credentials:'same-origin', headers:{'x-ans-session':'logout-v1'}}).finally(function () { pending(false); });
      } else { inspect().then(function () { if (signedIn && !subject && !refreshing) renew(); }); }
      window.clearInterval(interval);
      if (signedIn) interval = window.setInterval(renew, 180000);
    }
  }
  window.addEventListener('message', receive);
  function platformRefresh() { header.contentWindow.postMessage({type:'ans:platform-refresh'}, issuer); if (signedIn) inspect(); }
  window.addEventListener('focus', platformRefresh);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) platformRefresh(); });
  retry.addEventListener('click', function () { host.classList.remove('ans-platform-connected'); label.textContent = '正在重新连接平台账号…'; header.src = issuer + '/embed/platform-header?parent=' + encodeURIComponent(location.origin); inspect(); });
  window.setTimeout(function () { if (!host.classList.contains('ans-platform-connected')) { label.textContent = '平台导航暂未连接'; retry.hidden = false; } }, 12000);
  window.ANSPlatformShell = {login:login, refresh:inspect, renew:renew, ready:ready};
  inspect();
}());
