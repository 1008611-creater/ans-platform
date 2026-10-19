'use strict';
var CACHE='exam-analysis-v60';
var ASSETS=['./learning-history.js','./score-evidence.js','./src/exam-context-editor.js','./report-layout.js','./report-charts.js','./src/report-dashboard.js','./vendor/echarts/echarts.min.js','./report.css','./report-visuals.js','./focus.css','./src/knowledge-map.js','./vendor/mind-elixir/MindElixirLite.iife.js','./vendor/mind-elixir/MindElixirLite.css','/welcome/onboarding.css','/welcome/onboarding.js','/welcome/onboarding/step-1.svg','/welcome/onboarding/step-2.svg','/welcome/onboarding/step-3.svg','/welcome/ans-logo-light.svg','/welcome/ans-logo-dark.svg','/welcome/echo-design.css','/welcome/echo-motion.js','/welcome/ans-shell.js','/welcome/ans-shell.css','./records.html','./wrongbook.css','./src/wrongbook-app.js','./','./index.html','./favicon.svg','./analysis.css','./src/analysis-domain.js','./src/record-analyzer.js','./src/local-store.js','./src/controller.js','./src/view-state.js','./src/app.js','./src/bunny-motion.js','./src/bunny-companion.js','./src/account.mjs','./src/bunny-3d.js','./src/rabbit-scene.mjs','./vendor/three/spirit-vendor.js','./assets/bunny/rabbit-3d-v2.glb','./assets/bunny/rabbit-texture-0.png','./assets/bunny/rabbit-texture-1.jpg','./assets/bunny/rabbit-texture-2.png','./assets/bunny/approved.svg','./assets/bunny/rabbit.riv','./vendor/rive/rive.js','./vendor/rive/rive.wasm'];
var SHELL=['./learning-history.js','./score-evidence.js','./src/exam-context-editor.js','./report-layout.js','./report-charts.js','./src/report-dashboard.js','./report.css','./report-visuals.js','./focus.css','./src/knowledge-map.js','/welcome/onboarding.css','/welcome/onboarding.js','/welcome/onboarding/step-1.svg','/welcome/onboarding/step-2.svg','/welcome/onboarding/step-3.svg','/welcome/ans-logo-light.svg','/welcome/ans-logo-dark.svg','/welcome/echo-design.css','/welcome/echo-motion.js','/welcome/ans-shell.js','/welcome/ans-shell.css','./','./index.html','./favicon.svg','./analysis.css','./wrongbook.css','./src/wrongbook-app.js','./assets/bunny/approved.svg'];
self.addEventListener('install',function(event){event.waitUntil(caches.open(CACHE).then(function(cache){return cache.addAll(SHELL);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(event){event.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(key){return key.indexOf('exam-analysis-')===0&&key!==CACHE;}).map(function(key){return caches.delete(key);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(event){
  var url=new URL(event.request.url),root=new URL('./',self.location.href);
  if(event.request.method!=='GET'||url.origin!==root.origin)return;
  var allowed=ASSETS.some(function(asset){return new URL(asset,root).pathname===url.pathname;});
  if(!allowed)return;
  url.hash='';url.search='';
  var cacheKey=event.request.mode==='navigate'?new URL('./index.html',root).href:url.href;
  event.respondWith(fetch(event.request).then(function(response){
    if(response.ok&&!response.redirected){
      var copy=response.clone();
      event.waitUntil(caches.open(CACHE).then(function(cache){return cache.put(cacheKey,copy);}).catch(function(){}));
    }
    return response;
  }).catch(function(){
    return caches.open(CACHE).then(function(cache){return cache.match(cacheKey);}).then(function(saved){
      return saved||new Response('当前页面还没有离线缓存，请连接网络后重试。',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});
    });
  }));
});

