# ans.cauai.fun 三网加速（腾讯云 CDN）

`ans.cauai.fun` 已 CNAME 到腾讯云 CDN（`ans.cauai.fun.cdn.dnsv1.com`），电信、联通、移动都由国内节点就近接入。三网速度慢主要有两个原因，不在线路本身：

1. `public/` 下的图片、视频、音频、3D 模型此前返回 `cache-control: public, max-age=0`，CDN 每次都回源。代码已修复（`src/lib/public-asset-cache.ts`）：浏览器缓存 1 天，CDN 缓存 7 天，过期后先返回旧副本再后台更新。`_next/static/*` 本来就是一年 immutable，命中正常。
2. 页面 HTML 和 `/api/*` 带登录态，必须 `no-store`，每次都要回源。这部分的速度取决于 CDN 节点到源站的回源链路和源站查询耗时。

## 2026-10-30 实测基线（本机直连，未走代理；解析到江苏节点）

| 路由 | 首字节 | 缓存 |
| --- | --- | --- |
| `/` | 1.37 s | Miss（HTML no-store） |
| `/market` | 1.75 s | Miss |
| `/hubs` | 2.08 s | Miss |
| `/terms` | 2.04 s | Miss |
| `/explore` `/community` `/vibe-hub` 等 | 0.37–0.65 s | Miss |
| `/_next/static/*.js` | 0.45 s | Hit |
| `/favicon/favicon.ico`、封面 svg | 0.39–0.44 s | Miss（修复前） |

单次样本，不代表所有时段和运营商。

## 发布后在腾讯云 CDN 控制台确认

域名管理 → `ans.cauai.fun`：

1. **基本配置 → 加速区域**：中国境内（三网全覆盖）。若有海外用户再改为全球。
2. **缓存配置 → 节点缓存过期配置**：确认有一条「全部文件 → 遵循源站 Cache-Control」，并排在最后兜底；不要有把 `.html` 或全部文件强制缓存的规则，否则会把登录态页面缓存给其他人。
3. **缓存配置 → 缓存键**：开启「忽略参数」只针对图片/视频后缀；页面和 `/api/*` 保留参数。
4. **HTTPS 配置**：开启 HTTP/2、QUIC、OCSP 装订。
5. **高级配置 → 智能压缩**：开启 Brotli 与 Gzip（文本类后缀）。
6. **回源配置**：回源协议 HTTPS，回源超时保持 TCP 5 s / 加载 60 s（全栈 Hub 慢查询需要 60 s）。
7. 发布后在「刷新预热」里对首页封面、`/videos/*`、`/mascot/3d/*.glb` 做一次 URL 预热；之后同名替换 `public/` 文件，记得刷新对应 URL。

## HTML 回源仍慢时

- 先看源站：在服务器上 `curl -o /dev/null -w '%{time_starttransfer}' http://127.0.0.1:3000/hubs`。源站本身慢就继续优化查询，换线路没用。
- 源站快、经 CDN 慢：说明节点到源站链路差（源站在海外或单线机房时常见）。可选：把页面和 `/api/*` 接入腾讯云 EdgeOne 动态加速，或把源站迁到国内 BGP 多线机房。

## 验证

```bash
curl -sSI https://ans.cauai.fun/og.png | grep -iE 'cache-control|x-cache-lookup'
```

第一次 `Cache Miss`、第二次 `Cache Hit`，且 `cache-control` 为 `public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400`，即生效。
