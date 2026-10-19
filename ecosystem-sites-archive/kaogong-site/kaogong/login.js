/* 私有登录页交互：提交口令、显示错误、登录后回到原页面。
   依赖同源接口 POST /api/login。不引入任何第三方库。 */
(function(){
  'use strict';

  var form = document.getElementById('form');
  var pw = document.getElementById('pw');
  var err = document.getElementById('err');
  var go = document.getElementById('go');
  var eye = document.getElementById('eye');
  var days = document.getElementById('days');

  /* 登录成功后要回到哪里：优先 ?next=，其次历史来源，最后首页 */
  function nextUrl(){
    var q = location.search.replace(/^\?/, '');
    var map = {};
    q.split('&').forEach(function(pair){
      if (!pair) return;
      var i = pair.indexOf('=');
      if (i < 0) return;
      try {
        map[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
      } catch (e) {}
    });
    var raw = map.next || '';
    /* 只允许站内相对路径，防止被拿去当跳转跳板 */
    if (raw.charAt(0) === '/' && raw.charAt(1) !== '/' && raw.indexOf('//') !== 0 && raw.indexOf('\\') < 0){
      return raw;
    }
    return './';
  }

  function showError(msg){
    err.textContent = msg;
    err.hidden = false;
  }

  function clearError(){
    err.textContent = '';
    err.hidden = true;
  }

  function busy(on){
    go.disabled = !!on;
    go.textContent = on ? '正在进入…' : '进入题本';
  }

  /* 显示 / 隐藏口令 */
  eye.addEventListener('click', function(){
    var showing = pw.type === 'text';
    pw.type = showing ? 'password' : 'text';
    eye.textContent = showing ? '显示' : '隐藏';
    eye.setAttribute('aria-label', showing ? '显示口令' : '隐藏口令');
    try { pw.focus({ preventScroll: true }); } catch (e) { pw.focus(); }
  });

  pw.addEventListener('input', clearError);

  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    var value = String(pw.value || '');
    if (!value){
      showError('请先输入访问口令。');
      try { pw.focus(); } catch (e) {}
      return;
    }
    clearError();
    busy(true);

    var body = 'user=owner&password=' + encodeURIComponent(value);

    fetch('/api/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: body
    }).then(function(res){
      return res.json().catch(function(){ return {}; }).then(function(data){
        return { status: res.status, data: data };
      });
    }).then(function(r){
      if (r.status === 200 && r.data && r.data.ok){
        if (days && r.data.days) days.textContent = r.data.days;
        go.textContent = '登录成功，正在打开…';
        location.replace(nextUrl());
        return;
      }
      busy(false);
      var msg = (r.data && r.data.error) || '登录失败，请稍后再试。';
      if (r.status === 401) msg = '口令不对，请再试一次。';
      if (r.status === 429) msg = (r.data && r.data.error) || '尝试次数太多，请稍后再试。';
      showError(msg);
      pw.select();
    }).catch(function(){
      busy(false);
      showError('网络连接失败，请检查网络后重试。');
    });
  });

  /* 页面打开即聚焦，减少一次点击 */
  if (window.matchMedia && window.matchMedia('(hover:hover)').matches){
    try { pw.focus({ preventScroll: true }); } catch (e) {}
  }

  /* 若已登录，直接放行，避免多绕一步 */
  fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' }).then(function(res){
    if (res.status === 204) location.replace(nextUrl());
  }).catch(function(){});
})();
