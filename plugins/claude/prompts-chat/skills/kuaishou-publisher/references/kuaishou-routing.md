# Kuaishou Routing Notes

## Domains

Route these through `DIRECT` first when using Clash rule mode:

```yaml
- DOMAIN-SUFFIX,kuaishou.com,DIRECT
- DOMAIN-SUFFIX,gifshow.com,DIRECT
- DOMAIN-SUFFIX,yximgs.com,DIRECT
- DOMAIN-SUFFIX,ksapisrv.com,DIRECT
- DOMAIN-SUFFIX,kslive.com,DIRECT
- DOMAIN-SUFFIX,kwai.com,DIRECT
```

## Observed Behavior

- Overseas proxy nodes can cause `ERR_CONNECTION_CLOSED`.
- The in-app Browser may connect but receive `{"result":2}` from Kuaishou.
- A normal Edge/Chrome browser profile can work after routing Kuaishou domains through `DIRECT`.

## Publishing URL

- Creator platform: `https://cp.kuaishou.com/`
- Upload flow may redirect through `passport.kuaishou.com` and return to `/article/publish/video`.
