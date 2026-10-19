# 刘曙宾作品集

个人作品集网站。四件案例：古建交互展卷、AI 视频商业化、果智营工作台、品牌包装量产。

线上地址：[resume.lsb0713.online](https://resume.lsb0713.online)

## 结构

首页是双视图：立体螺旋画廊与巨型文字索引，同一批作品两种看法。案例详情、简历、关于、联系各自独立成页。简历页可直接导出 A4 PDF。

## 技术栈

Vite 8 + React 19 + TypeScript 6，路由用 react-router-dom 7，动效统一由 motion 13 承担（全站只引入这一个动画引擎）。字体走 @fontsource 自托管，均为 SIL Open Font License，可商用：Inter Tight（无衬线）、Instrument Serif Italic（拉丁文单点强调）、JetBrains Mono（标签与序号）。

样式是手写 CSS 加设计令牌，不依赖任何原子化框架。颜色、字号、间距、缓动、层级全部定义在 `src/styles/tokens.css`，组件里不出现裸色值。

## 目录

```
src/
  content/     站点文案与简历数据，全部来自真实项目，页面只消费不改写
  styles/      tokens.css 设计令牌 / base.css 重置与无障碍底线 / app.css 版式
  components/  固定外壳、入场门、螺旋画廊、文字索引、自绘光标等
  pages/       首页 / 案例详情 / 简历 / 关于 / 联系 / 404
  site/        站点状态（是否入场、当前视图、声音开关、动效偏好）
  hooks/       文档标题、动效偏好
public/work/   案例截图，来自项目作者本人的真实项目
docs/          设计 DNA 提取记录与素材整理
```

## 本地开发

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 类型检查加生产构建
npm run lint     # oxlint
npm run preview  # 预览构建产物
```

## 无障碍与降级

全站可用键盘操作，焦点环始终可见。`prefers-reduced-motion: reduce` 时停掉全部装饰性运动，内容保持完整可读可操作。入场门默认静音，声音必须由用户主动选择，不做自动播放。

## 设计与来源边界

版式骨架参考过 `pacomepertant.com` 的宏结构，只取结构思路，色值、字体、图形与素材全部自定，未复用其任何像素、字体文件或代码。完整记录见 `docs/design-dna.md`。

站内所有项目数据均为真实结果，没有为了展示效果填充的示例数据。
