# Release And Media-Route Consistency Case

Use this case when a benchmark succeeds but the real workspace still shows broken images or blank video.

## Reusable Failure Pattern

Two independent boundaries failed in the same release:

1. A container build started while a staged static-resource transfer was still incomplete. The source staging directory eventually contained 17 files, but the first production image contained only five root assets. A partial repair image contained 12 files and still omitted the active background video.
2. The benchmark constructed the direct-origin path `/api/internal/media-edge/:id`, while the ordinary page reused the CDN-worker path `/local/:id.mp4` on the direct-origin hostname. The benchmark passed; the user path returned `404`.

The first repair must therefore inspect both the final image filesystem and the ordinary page's emitted URL. Source files, staging counts, build success, health `200`, and a diagnostic URL are insufficient completion evidence.

## Correct Repair Order

1. Reproduce from the ordinary signed-in page and read `img.currentSrc`, `video.currentSrc`, image natural dimensions, video `readyState`, `networkState`, `error`, duration, and current time.
2. Probe those exact origin-and-path combinations without persisting signatures or cookies.
3. Compare the emitted path with the selected delivery contract:
   - direct signed origin: `/api/internal/media-edge/:id`;
   - CDN Worker route: `/local/:id.mp4`.
4. Fix the shared URL generator so production UI and diagnostics consume the same route contract.
5. Wait for static transfer completion, verify no transfer process remains, then inspect the candidate image itself for the complete required file set.
6. Add build-time `test -s` checks for the brand mark and first-viewport background that were actually missing.
7. Deploy under a new immutable image tag while retaining the prior image.
8. Verify production HTTP responses, then reload the ordinary page and select a completed history item.
9. Complete only when the logo has nonzero natural dimensions and both background and selected output advance without a media error.

## Verified Production Evidence

Captured on 2026-07-30 and 2026-07-31 for `sd2.cauai.fun`; no credentials, signed queries, user IPs, or task identifiers are retained here.

### Failure And Recovery

| Evidence | Broken release | Final repaired release |
| --- | ---: | ---: |
| Expected public files | 17 | 17 |
| Files in production image | 5 initially; 12 in partial repair | 17 |
| Brand SVG HTTP | `404` | `200`, `587` bytes, `image/svg+xml` |
| Brand image dimensions | `0 x 0` | `150 x 150` |
| Active background MP4 HTTP | `404` | `200`, `2,311,662` bytes |
| Background browser state | `readyState=0`, duration unavailable | `readyState=4`, duration `18s`, current time advancing |
| Selected output path | direct hostname with unsupported `/local/` path | direct hostname with `/api/internal/media-edge/` |
| Selected output playback | blank, `readyState=0` | `readyState=4`, `error=null`, played to `4.096s` |

### Payload And Playback Improvement

The online derivative remained separate from the provider original used for download.

| Metric | Before | After |
| --- | ---: | ---: |
| Playback bytes | `479,503` | `348,159` |
| Effective bitrate | about `0.94 Mbps` | about `0.68 Mbps` |
| Byte reduction | - | `27.4%` |
| Domestic Chrome cold can-play | variable, including multi-second stalls | repeated `325-422 ms` |
| Domestic Chrome warm can-play | variable | repeated `244-306 ms` |
| Completed playback | inconsistent during route failure | `4.096s`, no media error |

### Same-Object Network Comparison

Five HTTP `206` reads of the same `348,159`-byte derivative:

| Route and probe | Median TTFB | Median total | Fastest | Slowest | Median throughput |
| --- | ---: | ---: | ---: | ---: | ---: |
| Direct origin, China client | `213 ms` | `338 ms` | `283 ms` | `406 ms` | `8.23 Mbps` |
| Cloudflare, China client | `186 ms` | `279 ms` | `267 ms` | `812 ms` | `9.99 Mbps` |
| Direct origin, Seoul server | `45 ms` | `48 ms` | `46 ms` | `54 ms` | `58.23 Mbps` |
| Cloudflare, Seoul server | `125 ms` | `129 ms` | `59 ms` | `160 ms` | `21.66 Mbps` |

The China probe reported `loc=CN`, edge `HKG`; the Seoul probe reported `loc=KR`, edge `ICN`. This is one China client versus one overseas probe, not telecom/unicom/mobile proof. Do not generalize it into a mainland three-carrier result.

### Current Iteration Baseline (2026-07-31)

Repeat the same-object test before changing the media route again. The current production playback derivative was requested five times through each route and returned `206`, `video/mp4`, and the same `348,159` bytes on every sample.

| Route and probe | Median TTFB | Median total | Fastest | Slowest | Median throughput |
| --- | ---: | ---: | ---: | ---: | ---: |
| Direct origin, current Windows client | `218 ms` | `343 ms` | `283 ms` | `573 ms` | `8.13 Mbps` |
| Cloudflare, current Windows client | `188 ms` | `283 ms` | `274 ms` | `808 ms` | `9.84 Mbps` |
| Direct origin, Seoul server | `48 ms` | `51 ms` | `48 ms` | `57 ms` | `55.04 Mbps` |
| Cloudflare, Seoul server | `58 ms` | `63 ms` | `54 ms` | `150 ms` | `44.21 Mbps` |

Real browser playback through the direct production route also completed twice: cold `canplay=1,876 ms`, warm `canplay=2,050 ms`, duration `4.096 s`, `readyState=4`, `error=null`, and no `waiting` or `stalled` events. The network download is therefore healthy and smooth playback is verified, but browser first-frame startup remains the next measured optimization boundary. Do not treat this two-run browser result as a nationwide or three-carrier benchmark; repeat on the same browser/device/network after any startup change.

## Machine Gate

After this observed incident, enforce all applicable checks:

```text
candidate image contains required files with nonzero bytes
-> production static URLs return 200 and expected content types
-> ordinary page currentSrc matches the deployed host/path contract
-> image natural dimensions are nonzero
-> selected video has error=null and usable readyState
-> currentTime advances or reaches the finite duration
```

Stop and retain the prior image when any check fails. Do not promote a route from benchmark-only evidence.
