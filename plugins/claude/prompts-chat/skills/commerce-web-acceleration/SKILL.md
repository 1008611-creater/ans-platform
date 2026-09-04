---
name: commerce-web-acceleration
description: name: commerce-web-acceleration
---

---
name: commerce-web-acceleration
description: Measure, diagnose, and improve commerce website delivery for product images, private media, preview video, playback, seeking, and downloads. Use when a storefront or content-creation workspace feels slow, media fails after a storage/server migration, CDN/cache changes are proposed, image/video traffic costs rise, or real multi-network performance must be verified without weakening authorization.
---

# Commerce Web Acceleration

Use this Skill to improve the real buyer-facing media path, not to optimize a benchmark in isolation. The completion artifact is a normal user page where images are visible and the delivered video starts, seeks, and downloads successfully.

## Route

1. Read project authority, the production owner, current deployment state, and the real user entrypoint.
2. Define the outcome contract: media classes, expected audience/network, privacy model, budget, acceptance page, and rollback artifact.
3. Measure the exact user path before changing it. Run `scripts/collect-http-evidence.ps1` against the page, media endpoint, and a Range request. Record only the redacted result fields described in `references/metrics-schema.md`.
4. Classify the earliest failure boundary:
   - DNS/edge routing or TLS;
   - origin/storage byte read;
   - authorization or signed URL expiry;
   - CDN cache eligibility/key/TTL;
   - image/video payload and browser playback behavior;
   - cost caused by egress, repeated reads, or uncontrolled probes.
5. Change the narrowest boundary, then repeat the same measurement and perform real browser acceptance.
6. For a public China-facing delivery change, run ITDOG HTTP tests against the same public URL before and after deployment. Record the participating-node count; all-node, Telecom, Unicom, and Mobile average total time; slowest node; failure count; and observed response routing/IP class. Keep the completed ITDOG result page available as evidence. Do not claim a durable carrier improvement from one run alone: report it as one comparable sample and promote an IP/routing experiment only after repeated results improve without authorization or cache regressions.

Do not claim delivery from a build, `200` health endpoint, provider receipt, cache rule, or dashboard toggle alone.

## China CDN Default Gate

For a China-facing commercial site, Tencent CDN is the default public delivery path unless the user explicitly selects another provider. Before declaring the setup complete:

1. Confirm the Tencent CDN domain is active and its configured service region is China Mainland.
2. Confirm the public hostname resolves to the provider CNAME, not the previous tunnel or global edge hostname.
3. Request a versioned static script or image from the ordinary public hostname and require the provider edge/server and cache headers, expected content type, and nonzero bytes.
4. Verify fresh signed-in `/templates` and `/workspace` pages, including a real image and playable video, after DNS propagation.
5. Keep authenticated APIs and session- or token-authorized private media dynamic; CDN acceleration must not weaken authorization or turn private responses into public cache entries.

If the provider is active but the CNAME is not yet delegated, report acceleration as pending and do not claim completion. A provider dashboard status without public DNS and real-page evidence is insufficient.

## China Public Measurement

Use ITDOG HTTP testing when China-mainland public delivery is in scope. Test the ordinary public entry URL, including its release/version parameter when one is used, and keep the selected node categories consistent between the before and after runs. A delivery report must distinguish actual cache/Routing evidence from ITDOG timing evidence. If ITDOG cannot complete a run, say that explicitly and report only the measurements that completed; do not substitute a local curl result for multi-carrier evidence.

## Real-Page Route And Release Gate

For media delivery changes, verify the route emitted by the ordinary signed-in page; do not validate only a URL assembled by a diagnostic script.

1. Read the active page's final `img.currentSrc` and `video.currentSrc` after selecting the same item a user selects.
2. Confirm the hostname and pathname match the deployed server contract. Treat CDN-worker paths and direct-origin paths as separate contracts unless both are explicitly implemented.
3. Verify the built image/container, not only the build context or source directory: required static files must exist and have nonzero bytes inside the candidate image.
4. After deployment, request each required static URL and require `200`, expected content type, and nonzero bytes.
5. In the ordinary page, require nonzero image `naturalWidth`/`naturalHeight`; for video require `error === null`, usable `readyState`, finite duration, and advancing `currentTime`.
6. When TLS is owned by a separate Caddy or reverse-proxy container, verify the **running proxy configuration**, not only its host-side source file. Confirm the active upstreams are the intended candidate and that each upstream is reachable from the proxy over a private Docker network. Do not assume a host-loopback binding is reachable from another container. After any proxy reload, restart, or network attachment, repeat the public health check, private-media CORS preflight, and unsigned-read rejection before accepting the release.
7. For background refreshes that can overwrite media state, capture the owning project or resource ID and the current mutation/version before starting the request. Apply the response only while both still match, prevent overlapping refreshes, and reschedule after transient failure. Treat soft deletion as one shared consumer contract: filter `deletedAt`, `archivedAt`, and deleted/deleting/archived/purged status values in project hydration, libraries, pickers, previews, and retry flows, then verify the removed item stays absent after a real-page refresh. Observed trigger: a late refresh overwrote a user replacement and a soft-deleted media record remained visible. Protected action: applying refresh payloads or exposing media to a user-facing consumer. Owner: the page state coordinator and shared media normalizer. Remove this guard only when asynchronous refresh or soft deletion is retired, or an equivalent server-enforced version contract and consumer-wide active-media contract replaces it.
8. For peer-route partial shell updates, synchronize every user-visible overlay outside the replaced main region, including dialogs, preview modals, and their backdrops. Verify the real page after a history navigation can both open and dismiss the overlay; a state update without a mounted overlay is a release failure. Keep the overlay synchronization scoped to the rendered shell rather than forcing a document reload.
9. For initial workspace entry, make the first render atomic: hold the loading shell while the requested project, bound media, task state, and assistant conversation are assembled, then commit the complete view once. Background refreshes and event recovery must patch stable state without replaying the loading shell or replacing the whole workspace. Verify a fresh signed-in refresh has one loading phase followed by one settled project view, with no placeholder-media flash or repeated full-page remount.

For cross-origin media, do not treat a direct-origin probe as sufficient. If the browser-facing proxy strips CORS or Range headers, prefer the deployed same-origin media route or repair the proxy before changing frontend video layout.

Add deterministic image-build checks for required brand and first-viewport assets after one observed incomplete-build incident. Keep the previous image deployable until this real-page gate passes. See [release-route-consistency-case.md](references/release-route-consistency-case.md) for the verified failure pattern and measured data.

## Delivery Design

### Images

- Preserve the authority original. Deliver a content-addressed display variant such as WebP or AVIF at the rendered dimensions.
- Use versioned paths, correct content type, `Content-Length`, `ETag`, and immutable cache policy for non-sensitive bytes.
- Preload only the visible product/first-frame asset. Lazy-load secondary gallery media.
- Compare transfer bytes and visual quality with the original before promoting a variant.

### Video

- Split playback from download. Keep the provider original immutable for audit and download; make the inline player prefer a separately versioned playback derivative.
- Generate the playback derivative once per completed source under an idempotent media/version key. Use H.264/yuv420p plus AAC, a measured low-bitrate/CRF profile suitable for the rendered resolution, and `faststart`; retain the original dimensions unless a product decision explicitly permits downscaling.
- Make derivative failure non-fatal: inline playback must fall back to the prior playable variant, while the download endpoint always serves the authority original.
- Keep `Content-Length` and `Accept-Ranges` so cached byte ranges can return `206`. Send a poster and `preload=metadata`; do not preload every video in a workspace.
- Start with MP4. Add HLS only when measured start/seek behavior remains inadequate after cache and payload fixes.

### Private Media and CDN

- Never make a session- or token-authorized media endpoint publicly cacheable as a shortcut.
- Authenticate every media request before cache lookup. Normalize the cache key only after verification to immutable object version and delivery variant.
- Exclude user tokens, cookies, signed query values, and raw user identifiers from persisted evidence and cache keys.
- Validate a valid request warms cache, while unsigned, altered, and expired requests still receive `401` or `403` after warming.
- For a signed private-video CDN path, keep the browser entry authenticated, redirect only an existing immutable playback derivative to a short-lived edge signature, and configure the edge to verify that signature before ignoring its query parameter in the cache key. Accept the release only after a real `206` range read, a second cache hit with a fresh valid signature, and unsigned, altered, and expired requests are all rejected.
- Prefer a dedicated media hostname. Keep page/API responses dynamic; cache immutable media bytes.

## Cloudflare Guidance

- Standard global Cloudflare, R2, Argo, and Tiered Cache do not create China Mainland carrier POPs. Do not present them as ICP/CDN equivalence.
- Enable Smart Tiered Cache only after cache security and cacheability are proven. Argo improves edge-to-origin routing, not the user's last mile to a Cloudflare edge.
- Use an R2 custom domain for production. Do not use `r2.dev` as a production CNAME.
- Do not use Cache Reserve for an R2 custom-domain video path or a path requiring origin Range support.
- Treat fixed "preferred IP" or dual-domain SaaS routing as a media-only experiment. Promote only after repeated telecom/unicom/mobile evidence is better than normal Anycast and authentication/cache regression checks pass.

## Evidence and Recovery

Read `references/metrics-schema.md` before recording a run. Keep durable data in the project evidence store, not in this global Skill.

For a production change, retain the prior image/container/configuration and source media until all of the following are true:

- actual object byte read succeeds;
- image has nonzero natural dimensions in the user page;
- video has usable ready state, advances, seeks, and downloads;
- playback derivative byte size and effective bitrate are compared with the authority original, while download is verified to return the original;
- media host, cache result, and range behavior are read back;
- no duplicate provider job, financial charge, or media record was created.

## Common Failure Corrections

| Observed fact | Narrow correction |
| --- | --- |
| Storage `HEAD` succeeds but `GET Range` fails | Make readiness perform a bounded byte read; repair storage/account access before touching frontend cache. |
| CDN response is `DYNAMIC` | Check `Cache-Control`, cookies, authorization, path extension, and cache rules. Do not force-cache private sessions. |
| Repeated video reads create high egress | Add immutable object versions, edge cache, correct Range headers, and stop full-object health probes. |
| CDN cache serves private media without fresh auth | Restore authorization-before-cache; invalidate affected public cache and use short signed edge verification. |
| Image preview is several megabytes | Generate an authority-preserving display derivative and verify visual quality in the actual layout. |
| Video starts late despite cache | Confirm `faststart`, content length, range `206`, poster, payload size, and real device/network evidence. |
| Playback consumes the provider original | Generate an idempotent low-bitrate `faststart` playback derivative; keep the provider original only for download/audit. |
| Cache warm bypasses private-media rules | Restore authorization before cache lookup; cache only an immutable validated object/version key and reject unsigned, altered, and expired requests. |
| Diagnostic playback succeeds but the ordinary page stays blank | Read `video.currentSrc` from the signed-in page and compare its host/path with the deployed route. Fix the shared URL generator; do not change the diagnostic to hide the mismatch. |
| Ordinary task-page video is blank while the element exists | Inspect the actual signed-in page's `video.currentSrc`; ensure the shared URL generator points to a deployed same-origin or explicitly CORS-enabled media route. Verify a real task response with `206`, `video/mp4`, `Content-Range`, `Accept-Ranges`, nonzero video dimensions, and advancing playback. |
| Logo or background is broken after a successful image build | Inspect required files inside the candidate image, then verify their production URLs and browser natural dimensions. Add a build-time nonzero-file check for the observed required assets. |
