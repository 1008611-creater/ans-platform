# 可复用开源项目评估

## 推荐组合

### 1. Microsoft Playwright Python

仓库：`https://github.com/microsoft/playwright-python`

用途：作为核心浏览器控制层，支持 Chromium、Firefox、WebKit，具备自动等待、截图、持久化会话、文件上传、网络/控制台观测等能力。

选择理由：官方维护、Python 适配、适合 Windows 本地脚本；比坐标点击更适合 MXAI 这类网页应用。

不直接复制整套仓库：只安装依赖并使用 API，站点适配器由本 Skill 自己维护。

### 2. PortalFlow Playwright Browser Automation Bot

仓库：`https://github.com/Osama3576/portalflow-playwright-browser-automation-bot`

可借鉴：CSV/任务行读取、逐条提交、成功/失败报告、失败截图、Excel/JSON 汇总和本地演示站测试。

不直接作为生产底座：它是示范型项目，字段和页面流程需要改成提示词/参数/参考图任务。

### 3. rpa_tracker

仓库：`https://github.com/AngBan2x/rpa_tracker`

可借鉴：CSV/XLSX 输入、严格验证、去重、状态更新、日志、Windows 定时循环、测试用例和 `.env` 配置习惯。

不直接复制：需要先检查依赖、协议和代码质量；定时循环不能直接用于付费提交。

### 4. Ui.Vision RPA

仓库：`https://github.com/admariner/Kantu`

可借鉴：浏览器扩展录制、CSV 驱动宏、截图/OCR、可视化回放和人工确认。

限制：核心为 AGPL/商业双许可，不能未经许可嵌入或改造为闭源产品；站点是动态 SPA 时，Playwright 更适合作为第一选择。Ui.Vision 可作为低代码备用方案或人工录制参考。

## 本项目推荐技术路线

```text
Python
+ Playwright
+ JSONL/CSV任务文件
+ 本地状态机
+ 截图/回执/日志
+ Windows任务计划程序或明确的定时触发器
+ 人工确认门
```

不建议第一版直接使用视觉点击或坐标自动化。只有在页面控件无法通过可见文本、角色、标签或 DOM 稳定定位时，才评估 OCR/图像定位；仍需保留人工确认门。

## 开源项目使用规则

- 先检查仓库 LICENSE、最近维护情况和依赖版本；
- 只吸收通用架构和实现方法，不复制未知版权代码；
- 不把第三方仓库的示例凭据、Cookie 或测试账号带入项目；
- 第三方项目仅作为实现参考，不代表 MXAI 页面兼容性已经验证；
- 任何真实提交必须在 MXAI 当前页面做一次只读侦察后再写适配器。
