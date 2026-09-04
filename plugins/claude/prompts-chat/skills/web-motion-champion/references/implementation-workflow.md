# 从候选到生产代码

## 候选记录

为每个候选记录：

```json
{
  "page_goal": "",
  "source": "motionsites|react-bits|uiverse|animejs|aceternity-ui",
  "official_url": "",
  "effect_name": "",
  "access": "free|pro|login",
  "license": "",
  "source_kind": "prompt|component|css-element|engine|block",
  "stack": [],
  "dependencies": [],
  "purpose": "",
  "mobile_fallback": "",
  "reduced_motion_fallback": "",
  "cleanup_owner": "",
  "expected_files": [],
  "risks": []
}
```

## 获取源码

1. 打开具体官方详情页，确认预览就是用户选择的效果。
2. 记录免费、Pro 或登录访问状态；需要购买/登录时停在授权边界。
3. 回读许可；保存必要的版权声明，不复制站点 Logo、文案、照片和品牌资产。
4. 优先使用官方安装命令或官方页面展示的源文件；记录包版本或仓库提交日期。
5. 不从视频截图、搬运文章、匿名 Gist、泄露仓库或搜索摘要复制生产代码。

## 集成方式

1. 从当前项目权威基线建立隔离候选，不改线上包。
2. 先检查现有 `package.json`、动画库、平滑滚动库、全局 CSS 和客户端边界。
3. 只添加一个效果需要的源文件与依赖；能用现有库实现时不增加第二个引擎。
4. 把示例组件重命名为业务语义名，替换演示数据、文案、图片、颜色和硬编码尺寸。
5. 将外部 CSS 约束在组件作用域或项目 Token 下；检查 `z-index`、pointer events、overflow 和固定定位。
6. 为触摸、键盘、低动态、低性能设备和媒体失败准备静态或简化路径。
7. 在卸载或路由变化时清理时间线、Observer、监听器、RAF、定时器、Canvas/WebGL、视频和纹理。
8. 在项目的来源应用记录中写明具体文件、依赖和修改，不把“参考过”写成“已使用”。

## 技术冲突

- 一个根滚动上下文只能有一个 smooth-scroll Owner。
- 一个效果只由一个主要动画引擎驱动；CSS transition 不算独立引擎。
- Framer Motion/Motion、GSAP、Anime.js 不因“都很好”而叠加。
- React Server Components 中不要直接运行浏览器动画 API；将最小必要部分放入客户端组件。
- 禁止全局 `querySelectorAll` 控制不属于当前组件的元素。
- 禁止把动态背景置于可点击内容之上；装饰层默认 `pointer-events: none`。

## 用户参与节点

用户负责：

- 从 1–3 个高影响视觉候选中选择；
- 决定动效强度与品牌感受；
- 授权登录、购买或使用 Pro 资源；
- 在代理完成真实浏览器预验收后确认主观视觉满意度。

代理负责：

- 搜索、去重、源码与许可核对；
- 技术选型、依赖、适配、清理和性能判断；
- 代码集成、自动化检查和真实浏览器预验收；
- 不把技术问题反问给用户决定。

## 最小浏览器验收

- 首次进入、刷新、返回和重复进入页面；
- 桌面指针与 390px 触摸视口；
- 键盘 Tab、Enter、Space 和焦点可见；
- `prefers-reduced-motion: reduce`；
- 慢速网络或媒体失败；
- 主要 CTA、导航、表单和滚动仍可用；
- 无横向溢出、遮挡、闪烁、布局跳动和 hydration 错误；
- 动画结束后 DOM、焦点和可访问名称正确；
- 路由退出后无重复监听、RAF、Observer、Canvas/WebGL 或音视频继续运行；
- 对比变更前后的首屏、脚本体积、长任务、布局偏移和帧率证据。
