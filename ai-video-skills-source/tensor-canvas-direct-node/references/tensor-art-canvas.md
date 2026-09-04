# Tensor.art Canvas Direct Node Notes

## Successful path

1. Connect to the user's existing logged-in Chrome over CDP.
2. Locate the active `canvas.tensor.art` page.
3. Use UI only to create missing Video nodes.
4. Find the business canvas store, not only React Flow.
5. Patch target node configs in the business store and mark `dirty: true`.
6. Mirror nodes into React Flow only to refresh the UI.
7. Wait and verify save persistence through `dirty === false`, network update, and UI panel values.

## Fast account-switch path

1. Open Tensor first; use mailbox only after Tensor requests login.
2. If the normal Chrome CDP port is unavailable or Tensor times out, use a dedicated Chrome debugging port with the local Clash Verge proxy.
3. Keep only one Tensor work tab and one mailbox tab while switching accounts.
4. Import only the target mailbox row, request the Tensor login mail, then click the mailbox UI login action in the mail iframe.
5. Let the user handle Cloudflare or真人验证 manually.
6. Confirm the intended Tensor account by visible Energy/account state before touching canvas nodes.
7. Never copy secrets, login links, cookies, or verification codes into chat, logs, manifests, or skill files.

## Confirmed parameters

Happy Horse 1.1:

```json
{
  "model": "1010711179892370659",
  "videoCapability": "OMNI_REF2VIDEO",
  "aspectRatio": "9:16",
  "imageSize": "1080P",
  "videoDuration": 15
}
```

Seedance 2.0 Mini:

```json
{
  "model": "1014073603487977875",
  "videoCapability": "OMNI_REF2VIDEO",
  "aspectRatio": "9:16",
  "imageSize": "720p",
  "videoDuration": 10
}
```

## Lessons learned

- In-app browser can be useful for viewing but is not the fastest execution channel for this site.
- New Playwright browser profiles may fail login or verification; existing Chrome is better.
- With stubborn network failures, real Chrome plus the local proxy is faster than retrying the in-app browser.
- Tensor's visible canvas is backed by multiple stores. React Flow is not enough.
- Exact enum casing matters. `1080P` and `720p` are not interchangeable in the saved config.
- The user values speed: prefer one durable direct-write operation plus verification over repeated simulated hand clicks.
