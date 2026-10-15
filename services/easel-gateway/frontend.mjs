export function workspaceBootstrap(owner) {
  const loaded = () => {
    if (window.parent === window) return;
    const root = document.getElementById("root");
    if (!root) return;
    let reported = false;
    const ready = () => {
      if (reported || !root.childElementCount) return;
      reported = true; observer.disconnect();
      window.parent.postMessage({type:"ans:easel:workspace-ready",userId:owner}, location.origin);
    };
    const observer = new MutationObserver(ready);
    observer.observe(root, {childList:true}); ready();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loaded, {once:true}); else loaded();
  const prefix = "ans_easel:" + encodeURIComponent(owner) + ":";
  for (const name of ["localStorage", "sessionStorage"]) {
    try {
      const storage = window[name];
      const keys = () => Array.from({length:storage.length}, (_item,index) => storage.key(index)).filter(key => key?.startsWith(prefix));
      const scoped = {
        getItem: key => storage.getItem(prefix + key), setItem: (key,value) => storage.setItem(prefix + key,value),
        removeItem: key => storage.removeItem(prefix + key), clear: () => keys().forEach(key => storage.removeItem(key)),
        key: index => keys()[index]?.slice(prefix.length) ?? null, get length() { return keys().length; },
      };
      Object.defineProperty(window, name, {value:scoped,configurable:false});
    } catch { /* Browser storage can be unavailable under third-party restrictions. */ }
  }
  if (window.BroadcastChannel) {
    const Channel = window.BroadcastChannel;
    window.BroadcastChannel = class extends Channel { constructor(name) { super(prefix + name); } };
  }
  const fetch = window.fetch.bind(window);
  window.fetch = function(input,options) {
    const target = new URL(typeof input === "string" || input instanceof URL ? input : input.url, location.href);
    if (target.origin === location.origin && target.pathname.startsWith("/api/")) {
      const headers = new Headers(options?.headers ?? (input instanceof Request ? input.headers : undefined));
      headers.set("X-ANS-Easel-Workspace",owner); return fetch(input,{...options,headers});
    }
    return fetch(input,options);
  };
}
export function bootstrapScript(subject) {
  return "<script>(" + workspaceBootstrap.toString() + ")(" + JSON.stringify(subject).replace(/</g,"\\u003c") + ");</script>";
}
