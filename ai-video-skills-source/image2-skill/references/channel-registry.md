# Image2 Channel Registry

| Channel | Contract status | Endpoint | Credential | Capability | Rule |
|---|---|---|---|---|---|
| `yunwu` | Text-to-image and reference-image edit verified | `https://yunwu.ai/v1/images/generations`; `https://yunwu.ai/v1/images/edits` | Agent Vault `yunwu-image` service scoped to `yunwu.ai/v1/*` | `gpt-image-2-c` JSON text-to-image and multipart reference-image edit | Use the model proven by this account's protected receipt, then dry run, one authorized request, readable-file, exact-dimension, identity, and visual QA. Never auto-retry. |

The edit route is documented at `https://yunwu.apifox.cn/api-446294920`: it accepts 1 to 16 `image` files in multipart form and supports `3840x2160`. The shared account's real protected output verified that `gpt-image-2-c` is the usable edit model; a document model name remains a candidate until the account route succeeds. A new real file proves the route and dimensions, not a particular candidate's visual quality or unverified edit/batch capabilities.
