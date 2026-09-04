# Acceleration Evidence Schema

Store one compact record per measured run in the project evidence store. Do not store credentials, cookies, signed query strings, raw customer IPs, provider secrets, payment data, or user payloads.

```json
{
  "capturedAt": "ISO-8601",
  "entrypoint": "origin-and-path-only",
  "mediaPath": "origin-and-path-only",
  "networkLabel": "carrier-or-probe-label",
  "edgeColo": "optional IATA code",
  "status": 200,
  "rangeStatus": 206,
  "dnsMs": 0,
  "connectMs": 0,
  "tlsMs": 0,
  "ttfbMs": 0,
  "totalMs": 0,
  "bytes": 0,
  "contentType": "video/mp4",
  "contentLength": 0,
  "originalBytes": 0,
  "playbackBytes": 0,
  "originalBitrateKbps": 0,
  "playbackBitrateKbps": 0,
  "playbackVariantReadyWithinSeconds": 0,
  "acceptRanges": true,
  "cacheStatus": "HIT|MISS|BYPASS|DYNAMIC|unknown",
  "ageSeconds": 0,
  "variant": "original|display-webp|playback-mp4",
  "authorizationCheck": "valid|unsigned-rejected|altered-rejected|expired-rejected",
  "browserEvidence": {
    "imageNaturalWidth": 0,
    "videoReadyState": 0,
    "playbackAdvanced": false,
    "seekSucceeded": false,
    "downloadSucceeded": false
  }
}
```

## Minimum Comparisons

- Compare cold and immediate second request for the same authorized immutable object.
- Compare original image/video bytes to the displayed/playback variant.
- Confirm inline playback selects the playback variant and an ordinary download still selects the authority original.
- Compare the same page path before and after a change from the same probe when possible.
- Run telecom, unicom, and mobile probes only when their labels are trustworthy; one local result is not three-network proof.

## Completion Levels

- `structural`: code/config/header contract exists.
- `integrated`: authorized media byte read, cache/range behavior, and origin failover are proven.
- `real_delivery`: an ordinary user page visibly renders the image and plays, seeks, and downloads the intended result.
