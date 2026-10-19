/* 备考题本 · 离线缓存
   首次打开后，会把整套题本（含全部题库）缓存到本机。
   之后即使断网，也能照常打开任意一套卷子。

   要点：题库 JSON 上百个，一次性并发请求会被浏览器/网络掐断，
   因此改为「串行分批 + 失败重试」，并把进度回报给页面。 */
/* v8：复练统计修复（错题结论本地化）需要让老用户的缓存外壳整体淘汰，
   否则升级后第一次打开仍然会拿到 v7 缓存里的旧 app.js，看到的还是恒 0 的旧口径。 */
/* v10：申论字数要求改为按题干解析（上限 / 下限 / 区间 / 左右），
   否则老用户会继续看到把「不少于1000字」错标成「≤1000字」的旧外壳。 */
/* v11：新增背记卡模块（knowledge.json + 底部「背记」页），外壳必须整体升级，
   否则老用户拿到的是缓存里的旧 app.js，看不到新入口。 */
/* v12：进度页「背记卡」统计块与「复练状态」的「已掌握」标签撞名，改成「已背熟」。
   只改文案也要升版本，否则老用户第一次打开仍是缓存里的旧外壳，看到的还是撞名标签。 */
/* v13：新增「模考档案 + 诊断报告」（交卷自动落档、分模块正确率、错因结论、同套卷复测对比）。
    外壳不升版本的话，老用户升级后第一次打开仍是缓存里的旧 app.js，看不到诊断入口。 */
/* v14：新增「训练计划 + 周复盘」（26 周五阶段自动排期、本周目标完成度、里程碑检查点、
    周复盘四块自动算 + 三个问题手写）。不升版本，老用户看不到新入口，也拿不到新的埋点逻辑。 */
/* v15：新增「申论批改工作台」（参考答案逐点比对、命中率、漏点归因、C 卷四查、大作文五步自评），
    并把第 14 周里程碑接上真实批改数据。不升版本，老用户看不到批改入口，也拿不到新的里程碑口径。 */
/* v18：每日训练升级为「到期复练优先 + 限时模块专项」。不升版本，老用户第一次打开仍是缓存里的
   旧外壳，首页还是十题训练，看不到专项入口和限时。
   v19：专项纯领域规则抽为 drill-domain.js，必须先缓存该依赖再启动 app.js。
   v20：专项归档统计规则抽入 drill-domain.js；离线用户须同时更新领域规则和应用适配层。 */
var VERSION = 'kaogong-v21';
var SHELL = [
  './',
  './index.html',
  './styles.css',
  './drill-domain.js',
  './app.js',
  './knowledge.json',
  './manifest.webmanifest',
  './data/catalog.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];
var DATA_URLS = null;

/* 题库清单从 catalog.json 动态生成：以后扩容题库不用改本文件。
   图形题原图清单（data/images/manifest.json）里引用的图片也一并缓存，
   否则离线打开带图的题会缺图。清单缺失时跳过，不影响其余功能。 */
function loadDataFiles(){
  if (DATA_URLS) return Promise.resolve(DATA_URLS);
  return fetch(new Request('./data/catalog.json', {cache:'no-cache', credentials:'same-origin'}))
    .then(function(r){ return r.json(); })
    .then(function(cat){
      var urls = [];
      (cat.groups || []).forEach(function(g){
        (g.papers || []).forEach(function(pp){
          if (pp && pp.file) urls.push('./' + String(pp.file).replace(/^\.?\//, ''));
        });
      });
      return fetch(new Request('./data/images/manifest.json', {cache:'no-cache', credentials:'same-origin'}))
        .then(function(r){ return r.ok ? r.json() : null; })
        .catch(function(){ return null; })
        .then(function(man){
          if (man && man.papers){
            var seen = {};
            Object.keys(man.papers).forEach(function(pid){
              var secs = (man.papers[pid] || {}).sections || {};
              Object.keys(secs).forEach(function(sn){
                ['q','m'].forEach(function(kind){
                  var bucket = secs[sn][kind] || {};
                  Object.keys(bucket).forEach(function(no){
                    (bucket[no] || []).forEach(function(rel){
                      if (seen[rel]) return;
                      seen[rel] = 1;
                      urls.push('./data/' + String(rel).replace(/^\.?\//, ''));
                    });
                  });
                });
              });
            });
          }
          urls = urls.filter(function(u, idx){ return urls.indexOf(u) === idx; });
          DATA_URLS = urls;
          return urls;
        });
    })
    .catch(function(){ return []; });
}

var BATCH = 6;      // 每批并发数
var RETRY = 3;      // 单个文件最多重试次数

function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

function notify(msg){
  return self.clients.matchAll({includeUncontrolled:true}).then(function(cs){
    cs.forEach(function(c){ try { c.postMessage(msg); } catch(e){} });
  }).catch(function(){});
}

function fetchInto(cache, url){
  return fetch(new Request(url, {cache:'reload', credentials:'same-origin'})).then(function(res){
    if (!res || !res.ok) throw new Error('HTTP ' + (res && res.status));
    // 被重定向过说明当前未登录，拿到的是登录页，不能当成题库外壳写进缓存
    if (res.redirected) throw new Error('redirected');
    return cache.put(url, res.clone()).then(function(){ return true; });
  });
}

/* 已经缓存过的直接跳过，避免每次启动都重下整套题库 */
function ensureCached(cache, url){
  return cache.match(url).then(function(hit){
    if (hit) return 'skip';
    return fetchInto(cache, url).then(function(){ return 'ok'; });
  });
}

function precache(cache, urls, label){
  var done = 0, failed = [];
  var i = 0;
  function nextBatch(){
    if (i >= urls.length) {
      return notify({type:'precache-progress', label:label, done:done, total:urls.length, failed:failed});
    }
    var slice = urls.slice(i, i + BATCH);
    i += BATCH;
    return Promise.all(slice.map(function(u){
      var attempt = function(n){
        return ensureCached(cache, u).catch(function(err){
          if (n >= RETRY) { failed.push(u); return 'fail'; }
          return sleep(300 * n).then(function(){ return attempt(n + 1); });
        });
      };
      return attempt(1).then(function(r){ if (r) done++; });
    })).then(function(){
      return notify({type:'precache-progress', label:label, done:done, total:urls.length, failed:failed});
    }).then(nextBatch);
  }
  return nextBatch();
}

/* 升级身份/产品边界时保留此前合法取得的离线题库，不能因未登录而清空。 */
function carryPaperCache(target){
  return caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== VERSION && k.indexOf('kaogong-') === 0; }).map(function(k){
      return caches.open(k).then(function(old){
        return old.keys().then(function(requests){
          return Promise.all(requests.map(function(req){
            var url;try{url=new URL(req.url);}catch(e){return null;}
            if (url.origin !== location.origin || !(/^\/(data|icons)\//.test(url.pathname) || /^\/(index\.html|app\.js|styles\.css|drill-domain\.js|knowledge\.json|manifest\.webmanifest)?$/.test(url.pathname))) return null;
            return target.match(req).then(function(hit){if(hit)return null;return old.match(req).then(function(res){return res ? target.put(req,res) : null;});});
          }));
        });
      });
    }));
  });
}

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(VERSION).then(function(c){
      // 只预缓存外壳，让 Service Worker 尽快激活
      return carryPaperCache(c).then(function(){return Promise.all(SHELL.map(function(u){
        return fetchInto(c, u).catch(function(){ return false; });
      }));});
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ return k === VERSION || k.indexOf('kaogong-') !== 0 ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
     .then(function(){
       // 激活后立刻在后台补齐题库，不阻塞页面
       return caches.open(VERSION).then(function(c){
         return loadDataFiles().then(function(urls){ return precache(c, urls, 'auto'); });
       });
     })
     .catch(function(){})
  );
});

/* 页面可主动要求「补齐离线题库」 */
self.addEventListener('message', function(e){
  var d = e.data || {};
  if (d.type !== 'precache-all') return;
  e.waitUntil(
    caches.open(VERSION).then(function(c){
      return Promise.all(SHELL.map(function(u){ return fetchInto(c, u).catch(function(){ return false; }); }))
        .then(function(){ return loadDataFiles().then(function(urls){ return precache(c, urls, 'manual'); }); });
    })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch(err){ return; }
  if (url.origin !== location.origin) return;
  // 同域独立产品与内部认证路径由各自服务处理。
  if (/^\/(analysis|trainer)(\/|$)/.test(url.pathname) || url.pathname.indexOf('/_ans_') === 0) return;

  // 鉴权接口不参与缓存：登录状态必须每次都问服务器
  if (url.pathname.indexOf('/api/') === 0) return;
  // 登录页本身不进缓存，避免未登录时被离线外壳顶掉
  if (url.pathname.indexOf('/login.') >= 0) return;

  // 导航请求：优先网络，断网回落到外壳
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function(res){
        // 被重定向（通常是登录过期被送去登录页）时，交给浏览器真正跳转，
        // 这样地址栏会显示登录页，登录后也能准确回到原来那一页。
        if (res && res.redirected){
          try { return Response.redirect(res.url, 302); } catch (e) { return res; }
        }
        return res;
      }).catch(function(){
        return caches.match('./index.html').then(function(hit){
          return hit || caches.match('./');
        });
      })
    );
    return;
  }

  // 静态资源与题库：先给缓存（保证离线可用），后台静默更新
  e.respondWith(
    caches.match(req).then(function(hit){
      var net = fetch(req).then(function(res){
        // 被重定向过（例如未登录被送到登录页）不写入缓存，避免污染题库缓存
        if (res && res.ok && !res.redirected){
          var copy = res.clone();
          caches.open(VERSION).then(function(c){ c.put(req, copy); }).catch(function(){});
        }
        return res;
      }).catch(function(){
        if (hit) return hit;
        return new Response('', {status: 504, statusText: 'offline'});
      });
      return hit || net;
    })
  );
});
