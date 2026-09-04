# RunningHub Fruit Commerce Workflow Node Map

## Sources

- RunningHub workflow page: https://www.runninghub.cn/workflow/2056752570487623681?source=workspace
- RunningHub workflow page: https://www.runninghub.cn/workflow/2057025848015937537
- RunningHub custom workflow docs: https://www.runninghub.ai/runninghub-api-doc-en/api-425761093
- RunningHub upload docs: https://www.runninghub.ai/runninghub-api-doc-en/api-425761099
- RunningHub output query docs: https://www.runninghub.ai/runninghub-api-doc-en/api-425761034

## LTX2.3 Ecommerce Digital Human

Workflow ID: `2057025848015937537`

Local API JSON:

- `C:\Users\lsb\Downloads\LTX2.3高清超自然电商数字人_api (1).json`
- fallback: `C:\Users\lsb\Downloads\LTX2.3高清超自然电商数字人_api.json`

Key overrides:

| Node | Field | Purpose |
| --- | --- | --- |
| 14 | image | first image / identity scene |
| 39 | audio | speech audio |
| 169 | text | global identity, scene, product prompt |
| 170 | text | local action prompt segments separated by `|` |
| 186 | text | segment lengths, comma-separated |
| 60 | text | negative prompt |
| 91 | noise_seed | generation seed |
| 167 | value | width, default 1280 |
| 168 | value | height, default 720 |
| 185 | value | prompt relay epsilon |

Observed note: direct `workflowId` submission may return `WORKFLOW_NOT_SAVED_OR_NOT_RUNNING`. When that happens, submit with the exported local API JSON via `--workflow-json`; this succeeded on 2026-05-21.

## Wan2.2 Animate Motion Transfer V8

Workflow ID: `2056752570487623681`

Local API JSON:

- `C:\Users\lsb\Downloads\Wan2.2 Animate动作迁移V8（自动尺寸）_api (1).json`
- fallback: `C:\Users\lsb\Downloads\Wan2.2 Animate动作迁移V8（自动尺寸）_api.json`

Key overrides:

| Node | Field | Purpose |
| --- | --- | --- |
| 299 | image | reference person/host image |
| 275 | video | motion reference video |
| 278 | positive_prompt | positive text prompt |
| 278 | negative_prompt | negative prompt |
| 262 | text | primary aspect ratio, default 9:16 |
| 269 | text | alternate aspect ratio, default 16:9 |
| 264 | value | forced frame rate, default 25 |
| 300 | value | frame load cap, default 960 |
| 316 | value | width, default 720 |
| 317 | value | height, default 1280 |
| 367 | seed | sampler seed |
| 367 | steps | sampler steps |

Observed note: on the default/non-Plus instance, this workflow can fail with `torch.OutOfMemoryError` at `WanVideoSampler` even after reducing to 60 frames and short side 320. Prefer Plus/high-VRAM mode, a 3-5s pre-trimmed action clip, or a workflow revision with Clean VRAM before the sampler.

## API Flow

1. Upload local image/audio/video via `/task/openapi/upload`.
2. Use returned `data.fileName` as the node `fieldValue`.
3. Submit `/task/openapi/create` with `apiKey`, `workflowId`, and `nodeInfoList`.
4. Poll `/task/openapi/outputs`.
5. Download `fileUrl` values when present.
