# 工具

本目录自带的程序不需要读源码，命令里的 `<skill>` 换成本 Skill 的安装目录。这里只写什么时候用和最常用的几条命令；全部选项、动作写法和输出文件见各自的 `--help`，写错时报错会给出照抄就能用的写法。

宿主有自己的浏览器工具时，查看页面、走查流程照常用。要交证据时优先用这里的截图工具：它开一个独立的临时浏览器，不碰用户自己浏览器里的数据。本机缺 Node 22，或者没有 Chrome、Chromium、Edge 时，退回宿主工具，交出同样的证据。任务或项目已经指定了截图工具时，照用它。

## 截图和录屏

### 什么时候截，截多少

截图分两种用途，不要混在一起：

- **看一眼**：改完一批，想看效果。只截当前这一屏，一条命令。把一批改动攒在一起改完再截，不是每改一处截一次；页面没有变，就不重复截。
- **取证**：用 `--evidence` 一次取齐状态图、并排图、遮字图、2 倍图和录屏。只在两个时候做：送评审之前，交付之前。方向首屏那一轮每个方向只截一张，不取证。

每一轮评审只重新取这一轮改动影响到的证据。没有动过的状态和动效，沿用上一轮的文件，交接时注明哪些是沿用的；拿不准有没有被影响到，例如改了共享样式，就重取那一项。

### 常用命令

```text
node <skill>/scripts/shoot.mjs <页面地址或 HTML 文件> [选项]
```

| 要什么 | 加上 |
| --- | --- |
| 看一眼桌面效果 | `--size desktop`；不写时是手机 390x844 |
| 操作几步再截 | `--steps "click .open; wait 300"` |
| 送评审或交付前取证 | `--evidence --states idle,done --steps "send: click .send"` |
| 落地页录一段从头滚到底 | `--record --steps "scroll 600; scroll 600; scroll 600"`，按页面长度多写几步 |
| 截图还原：和参考图比对 | `--compare 参考.png --size <参考的逻辑尺寸>` |
| 给用户指出问题：在元素上画框、标编号 | `--mark "1=.page-head .btn; 2=.toggle-row" --full` |
| 看清一段过渡 | 录屏时加 `--frames 8`，另出逐帧标时间的序列图 |
| 把几张图拼成一张对比图，不需要页面 | `--stitch a.png --label 修改前 --stitch b.png --label 修改后` |

状态靠地址参数进入，所以页面要能用 `?state=<名字>` 直接打开每个状态。其余选项、选择器和动作的写法、输出文件和 `report.json` 的结构：运行 `node <skill>/scripts/shoot.mjs --help`。拿不准写法时先加 `--dry-run` 检查，不会启动浏览器。超时会自动放宽时限重跑一次，仍失败时照报错里的命令重跑。

### 检索和下载真实素材

在项目工作目录运行，后续命令也在同一目录，搜索结果的编号才接得上：

```text
node <skill>/scripts/curate-media.mjs search "<关键词>" --kind texture --limit 6 --sheet --dir candidates
node <skill>/scripts/curate-media.mjs search "<一组词> | <另一组词>" --sheet --dir candidates
node <skill>/scripts/curate-media.mjs preview V1,T2 --sheet --dir candidates
node <skill>/scripts/curate-media.mjs fetch C1,T2 --dir assets --sheet
node <skill>/scripts/curate-media.mjs fetch V3 --dir <不上线的参考图目录>
node <skill>/scripts/curate-media.mjs fetch T2 --maps all --resolution 1k --dir assets
```

`--kind` 支持 `all|texture|design|photo|blueprint|map|plate|science|video`。信源包括材质库、欧美与日本的博物馆和图书馆馆藏、NASA，各类别对应哪些信源见 `--help`。`all` 交错取各信源；用 `|` 可一次搜几组词。关键词多用英文，东亚题材可直接用中日文，简体搜不到时换繁体或日文写法。

结果存入 `.curate-cache.json`，编号跨次搜索保留。每项 `use` 说明用途：`page` 可放进页面（CC BY/BY-SA 要署名），`check` 先看来源页，`reference` 不能放进页面；`--use page` 只留第一种。

`search --sheet` 和 `preview` 出带编号、用途和原图尺寸的联系表 PNG，直接读这张图挑选，不要只看标题；同时给每项算 `look`（四边色、是否浅色纸底、哪些区域干净可压字等），并出 HTML 联系表。`fetch --sheet` 出本地联系表并检查真实宽高、完整解码；视频自动截首帧 poster。

贴图默认下载 1k Diffuse，`--maps all` 拉取 Diffuse、Roughness、OpenGL Normal JPG 并校验大小与 MD5；使用与许可见 [配图](media.md#真实贴图与科学工程素材)。下载及 poster 自动写入同目录 `SOURCES.md`，兼容 `fetch "<URL>" --out assets/<文件名> --note "来源说明"`。全部选项见 `node <skill>/scripts/curate-media.mjs --help`。

### 看结果

交给评审前先自己看一眼：默认状态是不是已经加载完，遮字版有没有把图形也一起盖掉。证据有错先重截，再交给评审。汇总里提示录屏和截图不一致时，静止的终态以截图为准，再单独重录那一段核对过渡。画面是空的 WebGL 截图不能当证据。

每张截图还会查一组能从页面样式里直接判断的问题，命令输出里以“默认做法提示”列出：

- **要改的可读性问题**：文字对比度不达标、正文小于 13px、多行正文行高过紧、首屏里停在透明状态的内容。
- **改掉或写出理由**：有色底上的灰字、正文行太长，以及模型默认做法：标题上方的眉标和编号标签、彩色单侧边线、渐变文字、卡片里套卡片、表情符号当图标、中文界面里的英文大写标签、标题离上文比离下文还近。保留的项，在交付说明里写出它怎样服务方向。

检查会误报，例如真实的步骤编号、确实需要的标签；误报在交付说明里写一句。它只认得写法，判断不了好不好看：提示清零之后，仍要自己看截图。检查报出接口 401、404 这类和画面无关的错误时，在交付说明里记一行，不为了让检查通过去改登录、接口这类业务代码。

## 写可操作的小样

方向探索阶段的首屏不做交互，用不到这一节；选定方向后做完整页面时再用。存量项目照用项目自己的技术栈。

一个组件或一个页面只写一个文件，用地址参数切换状态，不要每个状态复制一份。颜色、字号、间距、圆角先定成十来个 CSS 变量，后面一律引用变量，不引入需要构建的工具。表单、切换、展开这类状态用 Alpine.js 写在 HTML 属性上：把 `<skill>/assets/vendor/alpine.min.js` 复制到任务目录的 `vendor/` 再引用，状态集中在一个 `x-data` 里，初始状态读地址参数。手势跟手、物理模拟、Canvas 和 WebGL 绘制放进单独的 JS 模块，每帧更新的数据不放进 Alpine 的状态。
