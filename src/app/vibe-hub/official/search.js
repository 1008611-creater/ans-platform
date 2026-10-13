// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
import * as eg from "./catalog-source.js";
import ansAiEntries from "../../../data/vibehub/ans-ai-search.json";
// ANS-authored terms share the retained ranking, aliases and category matching.
const catalogEntries = [...eg.sg, ...ansAiEntries];
let ef = new Set(["a", "an", "and", "or", "the", "versus", "vs", "for", "to", "of", "in", "on", "with", "is", "are", "be", "和", "或", "还是", "以及", "一个", "一种", "这个", "那个", "什么", "怎么", "如何", "可以", "需要", "帮我", "一下", "就是", "那种"]);
let ev = Object.freeze({
  "back-top": ["返回顶部", "回到顶部", "回顶部", "一键回顶", "back to top"],
  skeleton: ["骨架屏", "灰色占位", "内容占位", "loading skeleton", "占位骨架"],
  spinner: ["加载中", "转圈", "转圈圈", "loading", "加载圈圈", "请稍候"],
  "style-dark-tech": ["暗色模式", "深色模式", "dark mode", "夜间模式", "黑色主题", "暗黑模式"],
  commit: ["git 提交", "git commit", "提交代码", "保存版本", "提交改动", "commit 代码"],
  git: ["版本管理", "版本控制工具", "代码版本"],
  branch: ["git 分支", "开分支", "切分支", "新建分支"],
  merge: ["合并分支", "git merge", "分支合并", "合入主分支"],
  "pull-request": ["拉取请求", "合并请求", "提 pr", "开 pr", "code review", "代码评审"],
  push: ["推送代码", "git push", "推到远程"],
  pull: ["拉取代码", "git pull", "拉最新"],
  clone: ["克隆仓库", "git clone", "拉仓库"],
  deployment: ["上线", "发布上线", "部署上线", "发布网站", "怎么上线", "部署到线上", "给别人访问"],
  modal: ["登录弹窗", "确认弹窗", "中间弹框", "对话框", "弹层", "popup"],
  drawer: ["侧滑面板", "底部抽屉", "bottom sheet", "从侧面滑出"],
  "sidebar-layout": ["侧边栏", "左侧菜单", "后台布局", "侧栏布局"],
  toast: ["轻提示", "底部提示", "短暂提示", "snackbar"],
  notification: ["系统通知", "消息通知", "通知中心"],
  tooltip: ["鼠标提示", "悬停说明", "小气泡提示"],
  hover: ["鼠标悬停", "鼠标放上去", "悬浮变色", "hover 效果"],
  focus: ["键盘焦点", "聚焦状态", "tab 焦点"],
  switch: ["开关按钮", "一拨就开", "立即开关", "toggle"],
  checkbox: ["多选框", "勾选框", "打勾"],
  radio: ["单选项", "只能选一个"],
  select: ["下拉框", "下拉选择", "选择框"],
  dropdown: ["下拉菜单", "更多操作菜单", "操作下拉"],
  form: ["提交表单", "填写表单", "表单提交"],
  "data-validation": ["表单校验", "输入校验", "校验规则", "验证表单"],
  button: ["点一下", "操作按钮", "提交按钮"],
  breadcrumb: ["面包屑导航", "路径导航", "层级路径"],
  pagination: ["分页器", "翻页", "页码"],
  tabs: ["标签页", "选项卡", "tab 切换"],
  empty: ["空状态", "没有数据", "暂无内容"],
  alert: ["警告条", "错误提示条", "页面提示"],
  progress: ["进度条", "完成进度", "加载进度"],
  carousel: ["轮播图", "幻灯片", "banner 轮播"],
  upload: ["上传文件", "传图", "文件上传"],
  "date-picker": ["选日期", "日期选择", "日历选择"],
  "time-picker": ["选时间", "时间选择"],
  "auto-complete": ["自动补全", "输入建议", "搜索建议"],
  authentication: ["登录注册", "用户登录", "身份验证", "鉴权登录"],
  authorization: ["权限控制", "角色权限", "能不能访问"],
  database: ["存数据", "数据库", "持久化存储"],
  api: ["接口", "调用接口", "后端接口", "API 接口"],
  https: ["安全连接", "ssl", "https 证书", "加密访问"],
  "env-var": ["环境变量", "env", "密钥配置", ".env"],
  domain: ["域名", "绑域名", "自定义域名"],
  dns: ["域名解析", "解析域名", "A 记录"],
  cdn: ["内容分发", "静态加速", "cdn 加速"],
  npm: ["装依赖", "安装包", "package.json"],
  terminal: ["命令行", "终端", "黑窗口"],
  markdown: ["md", "md 文档", "readme"],
  react: ["react 框架", "reactjs"],
  nextjs: ["next", "next.js", "nextjs 框架"],
  "tailwind-css": ["tailwind", "原子化 css"],
  "vibe-coding": ["氛围编程", "vibe coding", "用自然语言写代码"],
  "ai-agent": ["ai 代理", "智能体", "agent"],
  "ai-basics": ["大模型", "llm", "人工智能基础"],
  token: ["token 计费", "字数 token"],
  mcp: ["model context protocol", "mcp 协议"],
  skill: ["skill", "agent skill", "技能包"],
  route: ["路由", "接口路由", "后端路由"],
  sql: ["sql 查询", "写 sql"],
  serverless: ["无服务器", "云函数", "serverless 函数"],
  "server-log": ["服务端日志", "看日志", "排查日志"],
  mvp: ["最小可行产品", "先做 mvp"],
  prd: ["产品需求", "需求文档", "写 prd"],
  "user-flow": ["用户流程", "操作路径", "流程图"],
  flex: ["弹性布局", "flex 布局", "flexbox"],
  grid: ["网格布局", "css grid"],
  margin: ["外边距", "外间距"],
  padding: ["内边距", "内间距"],
  sticky: ["吸顶", "粘性定位", "滚动吸顶"],
  position: ["定位", "绝对定位", "相对定位"],
  "z-index": ["层级", "叠在上面", "遮挡层级"],
  transition: ["过渡动画", "缓动过渡"],
  animation: ["动画效果", "关键帧动画"],
  "border-radius": ["圆角", "圆角边框"],
  shadow: ["阴影", "投影", "卡片阴影"],
  opacity: ["透明度", "半透明"],
  "text-truncate": ["文字省略", "超出省略", "ellipsis"],
  "backdrop-blur": ["毛玻璃", "背景模糊", "frosted glass"],
  hero: ["首屏", "头图区", "主视觉"],
  cta: ["行动号召", "立即开始按钮", "转化按钮"],
  faq: ["常见问题", "问答区"],
  pricing: ["价格表", "定价方案"],
  "social-proof": ["社会认同", "客户评价墙", "信任背书"],
  navbar: ["顶部导航", "导航栏"],
  header: ["页头", "网站头部"],
  footer: ["页脚", "网站底部"],
  "skip-link": ["无障碍", "a11y", "可访问性", "跳到正文", "键盘导航"],
  disabled: ["禁用状态", "灰掉不能点"],
  active: ["按下状态", "激活状态"],
  drag: ["拖拽", "拖放", "drag and drop"],
  cursor: ["鼠标样式", "手型光标"],
  selection: ["文字选中", "选中高亮"],
  badge: ["角标", "红点", "未读数"],
  tag: ["标签", "分类标签"],
  card: ["卡片", "信息卡片"],
  table: ["表格", "数据表"],
  list: ["列表", "条目列表"],
  image: ["图片", "插图组件"],
  icon: ["图标", "icon"],
  video: ["视频播放", "嵌入视频"],
  popover: ["气泡卡片", "点击浮层"],
  popconfirm: ["二次确认", "确认气泡"],
  result: ["结果页", "成功失败页"],
  steps: ["步骤条", "分步流程"],
  anchor: ["锚点导航", "页内目录"],
  menu: ["功能菜单", "侧栏菜单"],
  collapse: ["折叠面板", "展开收起"],
  segmented: ["分段控件", "分段切换"],
  rate: ["星级评分", "打分星星"],
  slider: ["滑杆", "拖动滑块"],
  textarea: ["多行输入", "大段文字输入"],
  "input-number": ["数字输入", "数量加减"],
  "color-picker": ["选颜色", "颜色选择器"],
  cascader: ["级联选择", "省市区选择"],
  "tree-select": ["树形选择"],
  tree: ["树形结构", "树控件"],
  timeline: ["时间线", "历程时间轴"],
  descriptions: ["描述列表", "详情字段"],
  statistic: ["统计数字", "数据指标"],
  avatar: ["头像", "用户头像"],
  file: ["文件项", "附件条目"],
  quote: ["引用块", "原话引用"],
  label: ["字段标签", "表单标签"],
  link: ["超链接", "文字链接"],
  typography: ["字体排版", "文字层级"],
  divider: ["分割线", "分隔线"],
  space: ["留白", "间距系统"],
  input: ["输入框", "文本框", "单行输入"],
  frontend: ["前端", "前端开发"],
  backend: ["后端", "后端开发"],
  "tech-stack": ["技术栈", "技术选型"],
  javascript: ["js", "java script"],
  typescript: ["ts", "类型脚本"],
  python: ["py"],
  vue: ["vuejs", "vue.js"],
  "shadcn-ui": ["shadcn", "组件库 shadcn"],
  "backend-framework": ["后端框架", "服务端框架"],
  http: ["http 请求", "请求响应"],
  json: ["json 数据", "json 格式"],
  url: ["网址", "链接地址"],
  diff: ["代码差异", "改动对比", "git diff"],
  stash: ["暂存改动", "git stash"],
  worktree: ["工作树", "git worktree"],
  gitignore: ["忽略文件", ".gitignore"],
  "context-window": ["上下文窗口", "上下文长度"],
  "system-prompt": ["系统提示词", "system prompt"],
  "tool-calling": ["工具调用", "function calling"],
  "streaming-response": ["流式输出", "边生成边显示"],
  "rate-limit": ["限流", "请求频率限制"],
  "token-cost": ["token 费用", "调用成本"],
  multimodal: ["多模态", "看图说话"],
  "conversation-history": ["对话历史", "聊天记录上下文"],
  "structured-output": ["结构化输出", "json 输出"],
  "stateless-request": ["无状态请求", "每次重新带上下文"],
  "react-pattern": ["react 模式", "推理行动观察"],
  "agent-loop": ["agent 循环", "代理循环"],
  "response-speed": ["响应速度", "生成速度"],
  "context-engineering": ["上下文工程", "上下文编排"],
  "sub-agent": ["子代理", "subagent"]
});
let ey = Object.freeze([{
  phrase: "返回顶部",
  ids: ["back-top"]
}, {
  phrase: "回到顶部",
  ids: ["back-top"]
}, {
  phrase: "回顶部",
  ids: ["back-top"]
}, {
  phrase: "暗色模式",
  ids: ["style-dark-tech"]
}, {
  phrase: "深色模式",
  ids: ["style-dark-tech"]
}, {
  phrase: "dark mode",
  ids: ["style-dark-tech"]
}, {
  phrase: "夜间模式",
  ids: ["style-dark-tech"]
}, {
  phrase: "git 提交",
  ids: ["commit", "git"]
}, {
  phrase: "提交代码",
  ids: ["commit"]
}, {
  phrase: "保存版本",
  ids: ["commit"]
}, {
  phrase: "登录弹窗",
  ids: ["modal", "authentication"]
}, {
  phrase: "确认删除",
  ids: ["modal", "popconfirm"]
}, {
  phrase: "骨架屏",
  ids: ["skeleton"]
}, {
  phrase: "加载中",
  ids: ["spinner", "skeleton"]
}, {
  phrase: "转圈",
  ids: ["spinner"]
}, {
  phrase: "上线",
  ids: ["deployment"]
}, {
  phrase: "发布网站",
  ids: ["deployment"]
}, {
  phrase: "给别人访问",
  ids: ["deployment", "domain"]
}, {
  phrase: "鼠标放上去",
  ids: ["hover"]
}, {
  phrase: "悬浮变色",
  ids: ["hover"]
}, {
  phrase: "一拨就开",
  ids: ["switch"]
}, {
  phrase: "点一下立即生效",
  ids: ["switch"]
}, {
  phrase: "选完统一保存",
  ids: ["checkbox", "form"]
}, {
  phrase: "下拉菜单",
  ids: ["dropdown", "select"]
}, {
  phrase: "侧边栏",
  ids: ["sidebar-layout", "menu"]
}, {
  phrase: "底部抽屉",
  ids: ["drawer"]
}, {
  phrase: "bottom sheet",
  ids: ["drawer"]
}, {
  phrase: "表单校验",
  ids: ["data-validation", "form"]
}, {
  phrase: "环境变量",
  ids: ["env-var"]
}, {
  phrase: "拉取请求",
  ids: ["pull-request"]
}, {
  phrase: "合并请求",
  ids: ["pull-request"]
}, {
  phrase: "合并分支",
  ids: ["merge"]
}, {
  phrase: "面包屑",
  ids: ["breadcrumb"]
}, {
  phrase: "无障碍",
  ids: ["skip-link"]
}, {
  phrase: "a11y",
  ids: ["skip-link"]
}, {
  phrase: "可访问性",
  ids: ["skip-link"]
}, {
  phrase: "登录注册",
  ids: ["authentication"]
}, {
  phrase: "权限",
  ids: ["authorization", "authentication"]
}, {
  phrase: "接口",
  ids: ["api", "http", "route"]
}, {
  phrase: "数据库",
  ids: ["database", "sql"]
}, {
  phrase: "域名",
  ids: ["domain", "dns"]
}, {
  phrase: "部署",
  ids: ["deployment"]
}, {
  phrase: "轮播",
  ids: ["carousel"]
}, {
  phrase: "空状态",
  ids: ["empty"]
}, {
  phrase: "进度条",
  ids: ["progress"]
}, {
  phrase: "角标",
  ids: ["badge"]
}, {
  phrase: "红点",
  ids: ["badge"]
}, {
  phrase: "吸顶",
  ids: ["sticky"]
}, {
  phrase: "毛玻璃",
  ids: ["backdrop-blur", "style-glass"]
}, {
  phrase: "氛围编程",
  ids: ["vibe-coding"]
}, {
  phrase: "vibe coding",
  ids: ["vibe-coding"]
}, {
  phrase: "智能体",
  ids: ["ai-agent"]
}, {
  phrase: "大模型",
  ids: ["ai-basics", "token"]
}, {
  phrase: "流式输出",
  ids: ["streaming-response"]
}, {
  phrase: "工具调用",
  ids: ["tool-calling"]
}, {
  phrase: "系统提示词",
  ids: ["system-prompt"]
}, {
  phrase: "上下文窗口",
  ids: ["context-window"]
}, {
  phrase: "技术栈",
  ids: ["tech-stack"]
}, {
  phrase: "最小可行",
  ids: ["mvp"]
}, {
  phrase: "需求文档",
  ids: ["prd"]
}, {
  phrase: "用户流程",
  ids: ["user-flow"]
}]);
function eb(e) {
  return [...new Set(e.filter(e => !!e))];
}
function ex(e) {
  return String(e || "").normalize("NFKC").toLocaleLowerCase().replace(RegExp("[^\\p{Letter}\\p{Number}]+", "gu"), " ").trim();
}
function ew(e) {
  return String(e || "").replace(/\{c:([\w-]+)\}/g, "$1").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function ej(e, t) {
  return !!e && !!t && e.includes(t);
}
function ek(e) {
  var t;
  let i = ev[e.id] || [],
    r = eb([...(e.aliases || []), ...i]),
    n = ew(e.quote || ""),
    a = ew(e.cn || e.name || ""),
    s = ew(e.name || ""),
    l = {
      id: ex(e.id),
      title: ex(a),
      name: ex(s),
      aliases: ex(r.join(" ")),
      quote: ex(n),
      category: ex(e.cat || ""),
      tagline: ex(ew(e.tagline)),
      description: ex(ew(e.desc)),
      learning: ex(ew((null == (t = e.learning) ? void 0 : t.outcome) || "")),
      distinctions: ex((e.distinctions || []).map(e => ew(e.text || e.label || "")).join(" "))
    },
    o = [["id", l.id, 120], ["title", l.title, 115], ["secondaryTitle", l.name, 105], ["aliases", l.aliases, 100], ["quote", l.quote, 88], ["category", l.category, 42], ["tagline", l.tagline, 58], ["description", l.description, 22], ["learning", l.learning, 30], ["distinctions", l.distinctions, 26]],
    c = ex([l.id, l.title, l.name, l.aliases, l.quote, l.category, l.tagline, l.description, l.learning, l.distinctions].join(" "));
  return {
    id: e.id,
    entry: e,
    fields: l,
    weighted: o,
    blob: c,
    aliases: r,
    quote: n
  };
}
let eN = null;
let eC = null;
function eS(e) {
  let t = e || catalogEntries;
  return eN && eC === t ? eN : (eC = t, eN = t.map(ek));
}
function eE() {
  let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
  return function () {
    let {
        query: e = "",
        entries: t,
        category: i,
        limit: r = 1 / 0,
        minScore: n = 1
      } = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
      a = t || catalogEntries,
      s = i ? a.filter(e => e.cat === i) : a,
      l = eS(a).filter(e => !i || e.entry.cat === i),
      o = String(e || "").trim();
    if (!o) {
      let e = s.map(e => ({
        entry: e,
        score: 0,
        matchedFields: []
      }));
      return Number.isFinite(r) ? e.slice(0, r) : e;
    }
    let c = function (e) {
        let t = new Map();
        for (let i of ey) {
          let r = ex(i.phrase);
          if (r && (e === r || e.includes(r) || r.includes(e))) {
            let n = e === r ? 220 : ej(e, r) ? 160 : 90;
            for (let e of i.ids) t.set(e, Math.max(t.get(e) || 0, n));
          }
        }
        return t;
      }(ex(o)),
      d = l.map((e, t) => {
        let {
          score: i,
          matchedFields: r
        } = function (e, t) {
          let i = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : new Map(),
            r = ex(t);
          if (!r) return {
            score: 0,
            matchedFields: []
          };
          let n = function (e) {
              let t = ex(e);
              if (!t) return [];
              let i = t.split(/\s+/).filter(e => e.length > 1 && !ef.has(e));
              return eb([t, ...i]);
            }(t),
            a = 0,
            s = [];
          for (let [t, i, l] of e.weighted) {
            let e = function (e, t, i, r) {
              if (!e || !r) return 0;
              if (e === t) return 2.4 * r;
              if (e.startsWith(t) && t.length >= 2) return 1.6 * r;
              if (ej(e, t)) return r;
              if (i.length > 1) {
                let n = i.filter(e => e !== t && e.length >= 2);
                if (n.length) {
                  let t = n.filter(t => ej(e, t));
                  if (t.length) {
                    let e = t.length / n.length;
                    return Math.round(r * e * (1 === e ? .85 : .35));
                  }
                }
              }
              let n = function (e, t) {
                let i = function (e) {
                  let t = [];
                  for (let i of String(e || "").match(RegExp("[\\p{Script=Han}]+", "gu")) || []) {
                    if (1 === i.length) {
                      t.push(i);
                      continue;
                    }
                    for (let e = 0; e < i.length - 1; e += 1) t.push(i.slice(e, e + 2));
                  }
                  return t;
                }(e);
                if (i.length < 3) return 0;
                let r = i.filter(e => t.includes(e)).length,
                  n = r / i.length;
                return r < 3 || n < .45 ? 0 : n;
              }(t, e);
              return n > 0 ? Math.round(r * n * .72) : 0;
            }(i, r, n, l);
            e > 0 && (a += e, s.push(t));
          }
          let l = n.filter(e => e !== r && e.length >= 2);
          if (l.length > 1) {
            let t = l.filter(t => e.blob.includes(t));
            t.length === l.length ? a += 48 : t.length && (a += Math.round(18 * (t.length / l.length)));
          }
          let o = i.get(e.id) || 0;
          return o && (a += o, s.includes("intent") || s.push("intent")), {
            score: a,
            matchedFields: s
          };
        }(e, o, c);
        return {
          entry: e.entry,
          score: i,
          matchedFields: r,
          order: t
        };
      }).filter(e => e.score >= n).sort((e, t) => t.score - e.score || e.order - t.order);
    return Number.isFinite(r) ? d.slice(0, r) : d;
  }(e);
}
export { eE as searchTerms };
