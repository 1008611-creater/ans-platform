---
name: xhs-original-image-publisher
description: name: xhs-original-image-publisher
---

---
name: xhs-original-image-publisher
description: Publish a verified original-image Xiaohongshu post through AitoEarn in Edge. Use when a user asks to prepare, check, or publish an existing Xiaohongshu image post from locally verified source images, especially when images must remain unchanged and an explicit final publishing confirmation is required.
---

# 小红书原图发布

使用已验证的 AitoEarn + Edge 流程，把一份真实原图小红书草稿发布到指定的在线账号。

## 固定边界

- 只使用草稿目录 `source/` 中的图片；原图模式下不得重绘、生成、加字、裁切或重复图片。
- 不读取、输出或写入 Cookie、密码、API Key、Token 或证书。
- 默认只检查和准备。上传、保存草稿、点击发布都是外部操作。
- 只有用户明确确认“发布”后，才上传并点击最终发布。

## 输入包

确认以下内容，缺失时先补齐草稿而不发布：

1. 草稿目录内的 `xhs-post.md`：标题、正文、标签和图片顺序。
2. `source/` 下按文案顺序列出的原图。
3. 明确目标账号名称和 AitoEarn 中显示的在线状态。

发布前运行：

```powershell
& "C:\Users\lsb\anaconda3\python.exe" "C:\Users\lsb\.codex\skills\xhs-original-image-publisher\scripts\validate_draft.py" "<draft-directory>"
```

合格条件：标题不超过 20 个字符，至少一张且至多 18 张原图，图片顺序文件存在且 SHA-256 不重复。该检查不替代文案事实判断。

## AitoEarn 发布路径

1. 使用用户明确指定的 Edge；检查 AitoEarn 中国版显示“浏览器插件 已就绪”。
2. 在“我的频道”确认目标小红书账号在线。离线、账号不匹配或不存在时停止，不把内容提交给其他账号。
3. 新建发布作品；移除任何误选频道，只保留目标小红书账号。
4. 用可见的“选择文件 -> 上传本地图片或视频”上传 `xhs-post.md` 的图片顺序；等待上传完成，并实际确认预览图片数量等于预期。
5. 填写标题和正文（正文含标签）；不额外填写无法核验的位置、价格、参数或声明。
6. 在点击“发布”前再次说明目标账号、图片数、标题和正文来源，向用户请求一次明确最终确认。
7. 用户确认后点击“发布”，等待发布进度结束；只有页面最终出现“发布成功”才标记成功。

## 失败处理

- 频道离线或账号不匹配：不提交，提示用户在对应平台创作中心保持登录，并在 AitoEarn 刷新频道状态。
- 上传未完成：不提交，等待至预览数正确且页面不再显示上传处理中。
- 浏览器无法读取本机文件：提示用户在 `edge://extensions` 的 ChatGPT 扩展详情中开启“允许访问文件 URL”。
- 页面只显示“发布中”：保持状态为“已受理”，继续等待最终回执；不能称为已发布。

## 发布后沉淀

在草稿目录写入 `publish-receipt.md`，只记录日期、平台、账号名、标题、图片数量及平台最终回执。把 `README.md` 的状态更新为已发布。不要记录凭据、临时 URL 或上传响应。
