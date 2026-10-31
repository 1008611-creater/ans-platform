// ANS (AI Never Stops) Mobile App Service Worker
// Pass-through network handler to enable standalone PWA installation without caching private account state.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  // 页面导航交给浏览器自己发：从 worker 里 fetch 会丢掉 WebView/页面的 UA 覆盖，
  // 服务端就认不出安卓壳（ANSMobileApp/），首屏会闪出网页页脚。
  if (event.request.mode === "navigate") return;
  event.respondWith(fetch(event.request));
});
