# Observed AStorie Capabilities

- Required entry surface: an authenticated project canvas at `https://astorie.ai/zh-CN/projects/<project-id>`. The dashboard video hub can show an account-tier unlock state and is not the Smini execution route.
- In the project canvas, use `Add Node` and search `Seedance 2.0 Mini` to create the generation node. The node exposes prompt input, image upload, duration, ratio, resolution, Generate, history, and download controls.
- Verified provider options for `Seedance 2.0 Mini`: `4s` through `15s`, inclusive; default observed resolution was `720P`; default ratio was `16:9`.
- The NianNian Smini route exposes only `Seedance 2.0 Mini`; other AStorie models are outside this route.
- Observed UI prices: Mini at `720P/5s` displayed `65` credits; Mini at `720P/4s` displayed `52` credits in the completed request `req_3ceea08dc1ab4b849855`. These observations are not a price table. Read the live price on every generation.
- In the completed 4-second run, completion changed the node indicator from `0 / 1` to `1 / 1`; the rendered player exposed `0.mp4` and played for `4.096s`. The node-level download action remained disabled, so the page-rendered video asset was the successful download source.
- Initial integration supports no reference or exactly one image reference. Do not claim audio, video reference, or multi-reference support without a successful provider readback and delivery.
- A normal authenticated paid account workflow is required. Never use temporary-account registration, trial farming, credit unlocking, task-answering, or account-limit evasion.
