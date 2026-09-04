# 麻衣画布 V3.4.8 公开版

## Candidate

- Version: `麻衣画布 V3.4.8公开版`
- User-provided release date: `2026-07-30`
- Baidu share: `https://pan.baidu.com/s/1vDFigz-y3-r9svobKWYu1g`
- Quark share: `https://pan.quark.cn/s/9261e4e0bd23`
- Extraction code: supplied by the user for the current trial only; do not persist it in skill files or production configuration.

## Confirmed public source

- Author support page: `https://afdian.com/a/ZhengXinLan`
- Author GitHub: `https://github.com/zhengxinlan1995-code`
- Public source repository: `https://github.com/zhengxinlan1995-code/Tapnow-Studio--`
- Repository license: `GPL-3.0`
- Repository shape: single-file browser application, React 18 via CDN, local project/state export, and provider or local-proxy calls.

## Trial Questions

Record evidence for these questions after obtaining the public package:

1. Does V3.4.8 match the public source repository or contain a different build?
2. Does it run by opening one HTML file, or require a local server/proxy?
3. Which nodes support text, image, video, first frame, last frame, references, prompts, preview, progress, retry, and history?
4. What exact JSON or local state is used for canvas save/load?
5. Which network requests leave the browser, and can they be replaced by Niannian task APIs?
6. Does the package contain additional third-party or provider-specific license notices?
7. Can the UI be isolated as a project-scoped canvas without copying account, key, or local proxy behavior?

## Local Package Evidence (2026-08-02)

- User-provided local path: `E:\画布\桥豆麻衣酱_V.3.4.8.exe`
- File size: `35,264,000` bytes.
- SHA-256: `0910E7C839DA59431A3D07A8FCD4C5A2F2E773647F559825BD445C830225A78A`.
- Windows file metadata reports `FileVersion/ProductVersion 3.4.8` and description/product `桥豆麻衣酱`.
- Authenticode status: `NotSigned`.
- PE header is a Windows x64 executable (`PE32+`, machine `0x8664`).
- Static strings identify Tauri 2.9.5, WebView2, a local proxy server, and canvas bridge actions such as `create_node`, `update_node`, `connect_nodes`, `run_generation`, `create_image_series`, and `select_node`.
- Static strings also expose provider-specific paths or adapters for 即梦, OSS, 七牛, Cloudinary, and a browser-to-local-proxy HTTP boundary.
- The binary has not been executed, installed, or connected to `ai.cauai.fun`. No license notice was verified inside the binary; the public Tapnow source remains separately verified as GPL-3.0.

## Trial Result

- Download/preview: the Quark share required a blocked login; Baidu share accepted the user-supplied extraction code but offered only Baidu client high-speed download for this 33.6 MB executable. The user subsequently supplied the executable locally.
- Safe verification completed: file identity, size, hash, version metadata, signature status, PE type, and static runtime/provider strings.
- Runtime verification intentionally remains pending because the package is an unsigned, unknown desktop binary. Treat it as an external-blocked launch candidate until the user independently runs it in an isolated Windows environment or supplies source/build provenance that can be reviewed.
- Current engineering decision: use the package as behavioral evidence only; do not copy it into the Niannian production tree, do not import its provider/session logic, and do not distribute it as part of a closed Niannian bundle without a license decision.

## Decision Rule

- Use the build as an isolated interaction prototype if its behavior is useful.
- Do not copy the downloaded package into production merely because it launches.
- Do not distribute a modified GPL frontend as a closed Niannian bundle without a license decision.
- Prefer extracting the canvas state model, node interaction patterns, and media preview behavior into a Niannian-owned module.
