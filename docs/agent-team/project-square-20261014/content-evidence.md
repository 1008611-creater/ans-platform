# 项目广场内容核查记录

核查日期：2026-10-14。以下为官方公开仓库、README、许可与入门文档的实际阅读记录。核查不代表本机已安装、已完成作品产出，或已购买云服务；不声明实时可用率、第三方审核通过、维护质量或具体付费价格。

新增 12 个项目，各有中英文成果、门槛、成本边界、三步操作和两条限制；补充 4 个已有项目的指南，共 16 份。没有复制第三方图片，没有虚构封面、销量或用户成果，没有绑定不存在的 ANS 工作流。

| 项目 | 官方来源 | 核查范围与注意点 |
| --- | --- | --- |
| markmap | https://github.com/markmap/markmap；https://markmap.js.org/docs/packages--markmap-cli | README 与 CLI 文档，Markdown 转导图、HTML 导出、MIT。在线编辑器 URL 有官方引用，但本次抓取正文为空，不填写其 experienceUrl。 |
| slidev | https://github.com/slidevjs/slidev；https://sli.dev/guide/ | 官方入门、导出文档与原始 LICENSE；仓库页面两次超时，替代读取官方文档与该仓库 LICENSE，不宣称仓库页面完整审阅。静态导出限制及 Node.js 要求。 |
| penpot | https://github.com/penpot/penpot；https://help.penpot.app/user-guide/prototyping-testing/prototyping/ | README 与原型文档；画板连接、流程分享、MPL-2.0，企业方案另计。 |
| stirling-pdf | https://github.com/Stirling-Tools/Stirling-PDF；https://docs.stirlingpdf.com | README 与原始 LICENSE；PDF 工具、桌面/自部署；核心 MIT，指定目录许可单列，不概括为全仓 MIT。 |
| formbricks | https://github.com/formbricks/formbricks；https://formbricks.com/docs | README 的链接问卷、云端/自部署及许可章节；AGPL 核心与企业目录分离，不承诺云端免费额度。 |
| actual-budget | https://github.com/actualbudget/actual；https://actualbudget.org/docs/ | README、官方文档入口与原始 LICENSE.txt；本地应用、同步、分类预算；不复用 README 的约数价格，不承诺银行连接地区。 |
| linkwarden | https://github.com/linkwarden/linkwarden；https://docs.linkwarden.app/ | README 的归档、集合、注释、权限、AGPL；自部署文档正文为空，仅用 README 确认安装入口，不编造部署步骤。 |
| immich | https://github.com/immich-app/immich；https://docs.immich.app/install/docker-compose/ | README、AGPL LICENSE 与 Docker Compose 文档；存储目录、匹配发布文件、独立原图及数据库备份。 |
| uptime-kuma | https://github.com/louislam/uptime-kuma；https://github.com/louislam/uptime-kuma/wiki | README 的 HTTPS 监测、通知、状态页、临时演示、Docker/受支持安装方式与 MIT。 |
| docusaurus | https://github.com/facebook/docusaurus；https://docusaurus.io/docs/installation | README、安装文档与代码 LICENSE；classic 模板、文档目录、MIT 代码与 CC-BY-4.0 文档分开。 |
| open-webui | https://github.com/open-webui/open-webui；https://docs.openwebui.com/ | README 与原始自定义 LICENSE；模型连接、持久化数据与品牌保留条件；不叫做通用 MIT，不附送模型额度。 |
| mermaid-live | https://github.com/mermaid-js/mermaid-live-editor；https://github.com/mermaid-js/mermaid-live-editor#features | README 的实时流程图、SVG、分享链接和外部渲染配置；MIT。 |
| reactive-resume | https://github.com/reactive-resume/reactive-resume；https://docs.rxresu.me/getting-started | 仓库重定向到 reactive-resume/reactive-resume，官方当前入门文档；编辑、PDF、分享、可选自配 AI。未采用失败的分享导出深链接。 |
| comfyui | https://docs.comfy.org/get_started/first_generation | README 的安装和官方首张图教程；模型硬件、节点与模型单独许可，不执行图像请求。 |
| astro-starlight | https://starlight.astro.build/getting-started/ | 官方仓库与当前入门文档；模板、Markdown/MDX、构建后搜索和发布边界。 |
| excalidraw | https://github.com/excalidraw/excalidraw#excalidrawcom | README 的官方编辑器、PNG/SVG、可编辑文件、协作和浏览器本地保存边界。 |

## 候选取舍

Cal.com 原 GitHub URL 已重定向到 cal.diy，BookStack GitHub README 表示迁到 Codeberg，本轮不把迁移中的入口当成新鲜 GitHub 示例加入目录。优先不同成果和可学习路径，避免同一项目重复卡。

新增项目只登记官方来源与具体许可入口；托管、模型、付费企业能力与自部署分开描述。experienceUrl 仅用于官方明确给出的在线编辑器，不把文档冒充体验。其页面真实交互及 ANS 呈现需由整合者做浏览器核对。

## 后续更新入口

用已有官方目录后台编辑、预览固定版本、审核发布与撤回；不把候选仓库直接当作成熟工作流。新增候选先检查成果与使用门槛，再补用途与步骤。

只读来源复核命令：

```text
npx tsx scripts/check-catalog-sources.ts --output <本地审核报告路径>
```

脚本读取公开 GitHub 元数据，标记仓库迁移、归档、禁用、自定义许可和请求失败；GitHub 限流时停止并报告未核查数。不执行仓库代码、不保存凭据、不自动上架。SOURCE_READ 只表示来源元数据成功读取，不能替代安装、交互体验或授权核对。来源变动后同时修订目录与准确 URL 绑定的指南。

## 集成核对补充

2026-10-14 根代理通过真实浏览器打开 Markmap 官方 REPL，确认 Markdown 编辑区、导图预览和 HTML / SVG 导出入口可见，因此新增 experienceUrl。未输入或上传个人资料、未执行付费操作。
