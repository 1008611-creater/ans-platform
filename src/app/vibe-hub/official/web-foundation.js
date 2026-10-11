// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import * as n from "react/jsx-runtime";
import * as t from "react";
import * as i from "./visual-language.js";
import * as l from "./visual-shell.js";
function r() {
  return "en" === (0, t.useContext)(i.gq) ? "en" : "zh";
}
function c(e, s, a) {
  return "en" === e ? a : s;
}
let d = [{
  n: 4,
  text: "function handleSave(request) {"
}, {
  n: 5,
  text: "  const items = loadRows(request.file);"
}, {
  n: 6,
  text: "  return items.map((row) => row.total);"
}, {
  n: 7,
  text: "}"
}, {
  n: 22,
  text: "function loadRows(file) {"
}, {
  n: 23,
  text: "  const items = readFile(file);"
}, {
  n: 24,
  text: "  return items.map((row) => row);"
}, {
  n: 25,
  text: "}"
}];
let o = [{
  name: "package.json",
  kind: "file"
}, {
  name: "src/",
  kind: "folder"
}, {
  name: "node_modules/",
  kind: "dep"
}];
let h = [{
  key: "patch",
  change: 1,
  label_zh: "修订号 +1",
  label_en: "Patch +1",
  compat_zh: "兼容修复",
  compat_en: "Compatible fix",
  tone: "ok",
  meaning_zh: "稳定 API 下，修订号承诺兼容修复；仍需查看发布说明并按项目流程验收。",
  meaning_en: "For a stable API, a patch promises a compatible fix. Check release notes and verify per the project process."
}, {
  key: "minor",
  change: 10,
  label_zh: "次版本 +1",
  label_en: "Minor +1",
  compat_zh: "兼容新增",
  compat_en: "Compatible addition",
  tone: "mid",
  meaning_zh: "稳定 API 下，次版本承诺兼容新增；检查新功能是否影响当前项目。",
  meaning_en: "For a stable API, a minor release promises compatible additions; check whether new features affect your project."
}, {
  key: "major",
  change: 100,
  label_zh: "主版本 +1",
  label_en: "Major +1",
  compat_zh: "不兼容变化",
  compat_en: "Incompatible change",
  tone: "high",
  meaning_zh: "稳定 API 下，主版本信号表示不兼容变化；先看迁移说明，再按项目场景验收。",
  meaning_en: "For a stable API, a major release signals incompatible changes. Read migration notes and verify your project flows."
}];
let m = [{
  input: "48120",
  pass: !0,
  why: "整串都是数字",
  why_en: "the whole string is digits"
}, {
  input: "+86 138",
  pass: !1,
  why: "含空格和加号",
  why_en: "it contains a space and a plus sign"
}, {
  input: "abc",
  pass: !1,
  why: "不是数字",
  why_en: "it is not digits"
}, {
  input: "",
  pass: !1,
  why: "空值：+ 要求至少一个数字",
  why_en: "+ requires at least one digit"
}];
let x = [{
  tag: "h1",
  text: "小狸的摄影主页",
  text_en: "Lily's photography page",
  role: "页面主要内容标题",
  role_en: "A main content heading"
}, {
  tag: "h2",
  text: "作品集",
  text_en: "Portfolio",
  role: "H1 下的一级小节标题",
  role_en: "A first-level section under the H1"
}, {
  tag: "h3",
  text: "城市风景",
  text_en: "City scenes",
  role: "H2 下的子节标题",
  role_en: "A subsection under the H2"
}, {
  tag: "h1",
  text: "关于小狸",
  text_en: "About Lily",
  role: "另一组主要内容的标题；HTML 允许多个 H1",
  role_en: "Another main content heading; HTML allows multiple H1s"
}];
let j = {
  wireframe: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "线框：灰色骨架", "Wireframe: gray skeleton"), c(e, "成品：上完样式", "Finished: styled")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "先用灰块排好位置，再上颜色和字体", "Arrange positions in gray blocks first, then apply colors and fonts"),
      className: "wf-stage wf-wire-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-wire-page step-".concat(s),
        children: [(0, n.jsxs)("div", {
          className: "wf-wire-head",
          children: [(0, n.jsx)("i", {}), (0, n.jsx)("span", {
            children: 0 === s ? c(e, "页头（占位）", "Header (placeholder)") : "作品页工具"
          }), 0 === s ? (0, n.jsx)("b", {}) : (0, n.jsx)("b", {
            children: c(e, "功能 示例 FAQ", "Features Examples FAQ")
          })]
        }), (0, n.jsx)("div", {
          className: 0 === s ? "wf-wire-hero" : "wf-wire-hero is-styled",
          children: 0 === s ? (0, n.jsxs)(n.Fragment, {
            children: [(0, n.jsx)("span", {
              children: c(e, "一句主标题（占位）", "One headline (placeholder)")
            }), (0, n.jsx)("span", {
              children: c(e, "一段说明（占位）", "One paragraph (placeholder)")
            }), (0, n.jsx)("b", {
              children: c(e, "主要按钮（占位）", "Main button (placeholder)")
            })]
          }) : (0, n.jsxs)(n.Fragment, {
            children: [(0, n.jsx)("b", {
              children: c(e, "把散落的项目素材，整理成作品页", "Turn scattered assets into a portfolio page")
            }), (0, n.jsx)("span", {
              children: c(e, "整理背景、过程和结果", "Organize background, process, and results")
            }), (0, n.jsx)("em", {
              children: c(e, "查看完整示例", "View full example")
            })]
          })
        }), (0, n.jsx)("div", {
          className: "wf-wire-cards",
          children: [0, 1, 2].map(a => 0 === s ? (0, n.jsx)("i", {}, a) : (0, n.jsxs)("div", {
            children: [(0, n.jsx)("b", {
              children: [c(e, "整理背景", "Organize"), c(e, "梳理过程", "Structure"), c(e, "呈现结果", "Present")][a]
            }), (0, n.jsx)("span", {
              children: c(e, "说明一行", "one line")
            })]
          }, a))
        })]
      }), (0, n.jsxs)("div", {
        className: "wf-crud-result",
        children: [(0, n.jsx)("strong", {
          children: 0 === s ? c(e, "线框阶段只确认位置，改起来只动方框", "The wireframe stage confirms positions; changes only move boxes") : c(e, "位置确认后再上颜色和字体", "Colors and fonts come after positions are confirmed")
        }), (0, n.jsx)("small", {
          children: c(e, "先骨架后皮肤，返工成本最低。", "Skeleton first, skin second—rework costs least.")
        })]
      })]
    });
  },
  contrast: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "对比度不足", "Insufficient"), c(e, "达到 4.5:1", "Meets 4.5:1"), c(e, "深色模式翻车", "Dark-mode fail")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "文字和背景的明暗差别，够不够看得清", "Is the brightness gap between text and background enough to read?"),
      className: "wf-stage wf-contrast-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsx)("div", {
        className: "wf-contrast-demo step-".concat(s),
        children: (0, n.jsxs)("div", {
          className: "wf-contrast-panel",
          children: [(0, n.jsx)("small", {
            children: 2 === s ? c(e, "深色背景", "Dark background") : c(e, "浅色背景", "Light background")
          }), (0, n.jsx)("div", {
            className: "wf-contrast-sample is-".concat(0 === s ? "low" : 1 === s ? "ok" : "low-dark"),
            children: (0, n.jsx)("b", {
              children: c(e, "整理项目背景、过程和结果，生成可以分享的页面。", "Organize project background, process, and results into a shareable page.")
            })
          }), (0, n.jsx)("span", {
            className: 0 === s || 2 === s ? "is-bad" : "is-ok",
            children: 0 === s ? c(e, "灰底配浅灰字：眯眼就消失", "Gray on light gray: vanishes when you squint") : 1 === s ? c(e, "深字同底：轻松读完整段", "Dark text, same bg: reads easily") : c(e, "黑底配原来的灰：低于门槛", "Black bg with the old gray: below the line")
          })]
        })
      }), (0, n.jsxs)("div", {
        className: "wf-crud-result",
        children: [(0, n.jsx)("strong", {
          children: c(e, "正文 4.5:1、辅助文字 3:1，用比值说话", "Body 4.5:1, secondary 3:1—speak in ratios")
        }), (0, n.jsx)("small", {
          children: c(e, "深色模式要单独查，别沿用浅色那档文字色。", "Re-check dark mode; don't reuse the light-mode text shade.")
        })]
      })]
    });
  },
  "visual-hierarchy": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "全部一样大", "All the same size"), c(e, "分了三层", "Three layers")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "眯眼看这两个首屏，视线落点在哪", "Squint at these two heroes—where does your eye land"),
      className: "wf-stage wf-hierarchy-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsx)("div", {
        className: "wf-hierarchy-demo step-".concat(s),
        children: 0 === s ? (0, n.jsxs)("div", {
          className: "wf-hierarchy-flat",
          children: [(0, n.jsx)("b", {
            children: c(e, "把项目素材整理成作品页", "Turn assets into a portfolio")
          }), (0, n.jsx)("b", {
            children: c(e, "整理背景、过程和结果", "Organize background, process, results")
          }), (0, n.jsx)("b", {
            children: c(e, "查看完整示例", "View full example")
          }), (0, n.jsx)("b", {
            children: c(e, "了解更多", "Learn more")
          })]
        }) : (0, n.jsxs)("div", {
          className: "wf-hierarchy-layered",
          children: [(0, n.jsx)("b", {
            className: "l1",
            children: c(e, "把散落的项目素材，整理成作品页", "Turn scattered assets into a portfolio page")
          }), (0, n.jsx)("span", {
            className: "l2",
            children: c(e, "整理背景、过程和结果，生成可以分享的页面", "Organize background, process, and results into a shareable page")
          }), (0, n.jsxs)("div", {
            className: "l3",
            children: [(0, n.jsx)("em", {
              children: c(e, "查看完整示例", "View full example")
            }), (0, n.jsx)("i", {
              children: c(e, "了解更多", "Learn more")
            })]
          })]
        })
      }), (0, n.jsxs)("div", {
        className: "wf-crud-result",
        children: [(0, n.jsx)("strong", {
          children: 0 === s ? c(e, "四行一样重，眼睛不知道从哪开始", "Four equal weights—nowhere to start") : c(e, "大小、深浅、底色各管一层，顺序自己浮现", "Size, shade, and fill each own a layer—the order emerges")
        }), (0, n.jsx)("small", {
          children: c(e, "诊断口诀：眯眼看页面，第一落点对不对。", "The test: squint—does the eye land where you want?")
        })]
      })]
    });
  },
  moodboard: function () {
    let e = r();
    return (0, n.jsxs)(l.xc, {
      label: c(e, "开工前的一张板：喜欢的、不喜欢的、主色", "One board before starting: likes, dislikes, and the main color"),
      className: "wf-stage wf-mood-stage",
      children: [(0, n.jsxs)("div", {
        className: "wf-mood-grid",
        children: [(0, n.jsxs)("div", {
          className: "wf-mood-tile is-ok",
          children: [(0, n.jsx)("i", {
            children: c(e, "参考 1", "Ref 1")
          }), (0, n.jsx)("span", {
            children: c(e, "安静 \xb7 大留白", "quiet \xb7 airy")
          }), (0, n.jsx)("b", {
            children: "✓"
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-mood-tile is-ok",
          children: [(0, n.jsx)("i", {
            children: c(e, "参考 2", "Ref 2")
          }), (0, n.jsx)("span", {
            children: c(e, "纸质感 \xb7 米白", "papery \xb7 off-white")
          }), (0, n.jsx)("b", {
            children: "✓"
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-mood-tile is-ok",
          children: [(0, n.jsx)("i", {
            children: c(e, "参考 3", "Ref 3")
          }), (0, n.jsx)("span", {
            children: c(e, "细线 \xb7 少即是多", "thin lines \xb7 less is more")
          }), (0, n.jsx)("b", {
            children: "✓"
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-mood-tile is-bad",
          children: [(0, n.jsx)("i", {
            children: c(e, "反例", "Avoid")
          }), (0, n.jsx)("span", {
            children: c(e, "渐变 \xb7 大圆角", "gradients \xb7 big radius")
          }), (0, n.jsx)("b", {
            children: "✗"
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-mood-color",
          children: [(0, n.jsx)("small", {
            children: c(e, "主色", "Main color")
          }), (0, n.jsx)("i", {}), (0, n.jsx)("span", {
            children: "#1e40d8"
          })]
        })]
      }), (0, n.jsxs)("div", {
        className: "wf-crud-result",
        children: [(0, n.jsx)("strong", {
          children: c(e, "图比形容词准：喜欢的定方向，标叉的划边界", "Pictures beat adjectives: likes set direction, the ✗ draws the boundary")
        }), (0, n.jsx)("small", {
          children: c(e, "发给 AI 时说「学氛围，别照搬布局」。", "Tell the AI: 'capture the mood, don't copy the layout.'")
        })]
      })]
    });
  },
  accessibility: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "图片：配文字说明", "Images: alt text"), c(e, "键盘：Tab 能到达", "Keyboard: Tab reaches"), c(e, "对比度：足够", "Contrast: sufficient")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "不用鼠标、看不清字的人，也能用你的页面吗", "Can people without a mouse or with faint vision still use your page?"),
      className: "wf-stage wf-a11y-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-a11y-demo step-".concat(s),
        children: [0 === s ? (0, n.jsxs)(n.Fragment, {
          children: [(0, n.jsxs)("div", {
            className: "wf-a11y-img",
            children: [(0, n.jsxs)("i", {
              className: "wf-a11y-imgph",
              "aria-hidden": "true",
              children: [(0, n.jsx)("span", {}), (0, n.jsx)("span", {}), (0, n.jsx)("span", {})]
            }), (0, n.jsx)("span", {
              children: c(e, "作品页示例截图", "Portfolio example screenshot")
            })]
          }), (0, n.jsxs)("div", {
            className: "wf-a11y-alt",
            children: [(0, n.jsx)("small", {
              children: "alt"
            }), (0, n.jsx)("code", {
              children: c(e, "「作品页示例：项目背景、过程和结果」", "'Portfolio example: project background, process, results'")
            })]
          })]
        }) : null, 1 === s ? (0, n.jsxs)("div", {
          className: "wf-a11y-tab",
          children: [[c(e, "功能", "Features"), c(e, "完整示例", "Examples"), c(e, "FAQ", "FAQ")].map((e, s) => (0, n.jsxs)("span", {
            className: 1 === s ? "is-focused" : void 0,
            children: [e, 1 === s ? (0, n.jsx)("i", {
              children: "Tab ↹"
            }) : null]
          }, e)), (0, n.jsx)("small", {
            children: c(e, "拔掉鼠标走一遍：每个按钮都能到、焦点看得见", "Unplug the mouse: every button reachable, focus visible")
          })]
        }) : null, 2 === s ? (0, n.jsxs)("div", {
          className: "wf-a11y-contrast",
          children: [(0, n.jsx)("div", {
            className: "wf-a11y-contrast-row is-bad",
            children: (0, n.jsx)("span", {
              children: c(e, "浅灰底浅灰字 2.1:1 ✗", "light gray on light gray 2.1:1 ✗")
            })
          }), (0, n.jsx)("div", {
            className: "wf-a11y-contrast-row is-ok",
            children: (0, n.jsx)("span", {
              children: c(e, "深字同底 7.8:1 ✓", "dark text same bg 7.8:1 ✓")
            })
          }), (0, n.jsx)("small", {
            children: c(e, "阳光下眯眼的人也靠这条活着", "People squinting in sunlight rely on this too")
          })]
        }) : null]
      }), (0, n.jsxs)("div", {
        className: "wf-crud-result",
        children: [(0, n.jsx)("strong", {
          children: c(e, "无障碍做好，普通用户也受益", "Good accessibility benefits everyone")
        }), (0, n.jsx)("small", {
          children: c(e, "a11y = a + 11 个字母 + y，AI 回复里常见。", "a11y = a + 11 letters + y, common in AI replies.")
        })]
      })]
    });
  },
  sort: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "默认：按日期", "Default: by date"), c(e, "金额降序", "Amount ↓"), c(e, "金额升序", "Amount ↑")],
      d = [{
        client: "星辰咖啡",
        amount: 12e3,
        date: "03-12"
      }, {
        client: "拾光书店",
        amount: 8500,
        date: "03-15"
      }, {
        client: "山野民宿",
        amount: 15e3,
        date: "03-08"
      }],
      o = 0 === s ? [...d].sort((e, s) => s.date.localeCompare(e.date)) : 1 === s ? [...d].sort((e, s) => s.amount - e.amount) : [...d].sort((e, s) => e.amount - s.amount);
    return (0, n.jsxs)(l.xc, {
      label: c(e, "点一下「金额」列头——记录一条不少，只是换了位置", "Tap the amount header—every record stays, only the order changes"),
      className: "wf-stage wf-sort-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-sort-table step-".concat(s),
        children: [(0, n.jsxs)("div", {
          className: "wf-sort-head",
          children: [(0, n.jsx)("span", {
            children: c(e, "客户", "Client")
          }), (0, n.jsxs)("span", {
            className: s > 0 ? "is-active" : void 0,
            children: [c(e, "金额", "Amount"), (0, n.jsx)("i", {
              children: 1 === s ? "↓" : 2 === s ? "↑" : ""
            })]
          }), (0, n.jsxs)("span", {
            className: 0 === s ? "is-active" : void 0,
            children: [c(e, "日期", "Date"), (0, n.jsx)("i", {
              children: 0 === s ? "↓" : ""
            })]
          })]
        }), o.map(e => (0, n.jsxs)("div", {
          children: [(0, n.jsx)("span", {
            children: e.client
          }), (0, n.jsxs)("span", {
            children: ["\xa5 ", e.amount.toLocaleString()]
          }), (0, n.jsx)("span", {
            children: e.date
          })]
        }, e.client))]
      }), (0, n.jsxs)("div", {
        className: "wf-crud-result",
        children: [(0, n.jsx)("strong", {
          children: 0 === s ? c(e, "排序只换先后，三条记录都在", "Sorting only reorders—all three records stay") : c(e, "金额大的排到前面，数量还是三条", "Largest amounts move up—still three records")
        }), (0, n.jsx)("small", {
          children: c(e, "筛选是把不要的藏起来、列表变短；排序一条也不少。", "Filtering hides records and shortens the list; sorting loses none.")
        })]
      })]
    });
  },
  "import-export": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "工具里的列表", "List in the tool"), c(e, "导出成文件", "Export to a file"), c(e, "别的软件打开", "Opened elsewhere")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "导出：数据变成文件；导入反过来", "Export: data becomes a file; import reverses it"),
      className: "wf-stage wf-io-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-io-flow step-".concat(s),
        children: [(0, n.jsxs)("div", {
          className: 0 === s ? "on" : "",
          children: [(0, n.jsx)("small", {
            children: c(e, "报价列表 \xb7 200 条", "Quote list \xb7 200")
          }), (0, n.jsxs)("div", {
            className: "wf-io-table",
            children: [(0, n.jsx)("b", {
              children: c(e, "客户 \xb7 金额 \xb7 日期 \xb7 状态", "Client \xb7 Amount \xb7 Date \xb7 Status")
            }), (0, n.jsx)("i", {
              children: "\xb7\xb7\xb7"
            }), (0, n.jsx)("i", {
              children: "\xb7\xb7\xb7"
            }), (0, n.jsx)("i", {
              children: "\xb7\xb7\xb7"
            })]
          })]
        }), (0, n.jsx)("span", {
          children: "→"
        }), (0, n.jsxs)("div", {
          className: 1 === s ? "on" : "",
          children: [(0, n.jsx)("small", {
            children: c(e, "导出", "Export")
          }), (0, n.jsxs)("div", {
            className: "wf-io-file",
            children: [(0, n.jsx)("b", {
              children: "报价.csv"
            }), (0, n.jsx)("span", {
              children: c(e, "UTF-8 \xb7 Excel 可开", "UTF-8 \xb7 opens in Excel")
            })]
          })]
        }), (0, n.jsx)("span", {
          children: "→"
        }), (0, n.jsxs)("div", {
          className: 2 === s ? "on" : "",
          children: [(0, n.jsx)("small", {
            children: c(e, "Excel 打开", "In Excel")
          }), (0, n.jsxs)("div", {
            className: "wf-io-table is-excel",
            children: [(0, n.jsx)("b", {
              children: "A"
            }), (0, n.jsx)("b", {
              children: "B"
            }), (0, n.jsx)("b", {
              children: "C"
            }), (0, n.jsx)("b", {
              children: "D"
            })]
          })]
        })]
      }), (0, n.jsxs)("div", {
        className: "wf-crud-result",
        children: [(0, n.jsx)("strong", {
          children: c(e, "拿到的是数据文件本身，不是链接", "You get the data file itself, not a link")
        }), (0, n.jsx)("small", {
          children: c(e, "导入是反方向：把文件一行行变回记录。", "Import runs the other way: each file row becomes a record.")
        })]
      })]
    });
  },
  placeholder: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "空着时", "Empty"), c(e, "开始输入", "Typing"), c(e, "只做占位没做标签", "Placeholder-only")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "输入框空着、正在打字、只做占位——三种情况", "Empty, typing, and placeholder-only—three cases"),
      className: "wf-stage wf-ph-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-ph-demo step-".concat(s),
        children: [(0, n.jsxs)("div", {
          className: "wf-ph-form",
          children: [(0, n.jsx)("small", {
            children: c(e, "有标签 + 有占位（正确做法）", "Label + placeholder (correct)")
          }), (0, n.jsxs)("div", {
            className: "wf-ph-field",
            children: [(0, n.jsx)("label", {
              children: c(e, "邮箱", "Email")
            }), (0, n.jsx)("div", {
              className: "wf-ph-box",
              children: 0 === s ? (0, n.jsx)("i", {
                children: "you@example.com"
              }) : (0, n.jsx)("b", {
                children: "linxia@example.com"
              })
            })]
          }), (0, n.jsx)("span", {
            children: 0 === s ? c(e, "灰色示例在示范格式", "Gray example shows the format") : c(e, "占位消失，标签还在说这是邮箱", "Placeholder gone, label still says Email")
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-ph-form is-bad",
          children: [(0, n.jsx)("small", {
            children: c(e, "只有占位、没有标签", "Placeholder only, no label")
          }), (0, n.jsx)("div", {
            className: "wf-ph-box",
            children: s < 2 ? (0, n.jsx)("i", {
              children: "you@example.com"
            }) : (0, n.jsx)("b", {
              children: "linxia@example.com"
            })
          }), (0, n.jsx)("span", {
            children: s < 2 ? c(e, "看起来还行……", "Looks fine…") : c(e, "输入之后：这是什么框来着？", "After typing: what was this box again?")
          })]
        })]
      }), (0, n.jsxs)("div", {
        className: "wf-crud-result",
        children: [(0, n.jsx)("strong", {
          children: c(e, "标签一直在，占位只负责开场", "The label stays; the placeholder only opens")
        }), (0, n.jsx)("small", {
          children: c(e, "占位文字不能代替标签，也不能承载「必填」规则。", 'Placeholder text cannot replace the label or carry "required" rules.')
        })]
      })]
    });
  },
  undo: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "输入了一条报价", "A quote is entered"), c(e, "误删", "Deleted by mistake"), c(e, "Ctrl+Z 撤销", "Ctrl+Z undo")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "撤销恢复的是动手之前的样子，不是重做一遍", "Undo restores the before-state, not a redo"),
      className: "wf-stage wf-undo-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-undo-demo step-".concat(s),
        children: [(0, n.jsxs)("div", {
          className: "wf-undo-table",
          children: [(0, n.jsxs)("div", {
            className: "wf-crud-head",
            children: [(0, n.jsx)("span", {
              children: c(e, "客户", "Client")
            }), (0, n.jsx)("span", {
              children: c(e, "金额", "Amount")
            })]
          }), (0, n.jsxs)("div", {
            children: [(0, n.jsx)("span", {
              children: c(e, "星辰咖啡", "Star Coffee")
            }), (0, n.jsx)("span", {
              children: "\xa5 12,000"
            })]
          }), 1 !== s ? (0, n.jsxs)("div", {
            className: 2 === s ? "is-restored" : void 0,
            children: [(0, n.jsx)("span", {
              children: c(e, "山野民宿", "Hillside Inn")
            }), (0, n.jsx)("span", {
              children: "\xa5 15,000"
            })]
          }) : (0, n.jsxs)("div", {
            className: "is-gone",
            children: [(0, n.jsx)("span", {
              children: (0, n.jsx)("del", {
                children: c(e, "山野民宿", "Hillside Inn")
              })
            }), (0, n.jsxs)("span", {
              children: [(0, n.jsx)("del", {
                children: "\xa5 15,000"
              }), (0, n.jsx)("b", {
                children: c(e, "已删除", "deleted")
              })]
            })]
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-undo-keys",
          children: [(0, n.jsx)("kbd", {
            className: 2 === s ? "is-active" : void 0,
            children: "Ctrl + Z"
          }), (0, n.jsx)("small", {
            children: 2 === s ? c(e, "撤销生效：记录原样回来，连日期都没变", "Undo works: the row returns exactly, date included") : c(e, "撤销只退最近几步，刷新后就没了", "Undo covers recent steps only; refresh clears history")
          })]
        })]
      })]
    });
  },
  "api-key": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "放对：环境变量", "Right: env var"), c(e, "放错：写进代码", "Wrong: in code"), c(e, "泄露：吊销重发", "Leaked: revoke")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "API Key 放在环境变量里还是写在代码里", "API key in an environment variable or hardcoded in source"),
      className: "wf-stage wf-key-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-key-demo step-".concat(s),
        children: [0 === s ? (0, n.jsxs)(n.Fragment, {
          children: [(0, n.jsxs)("div", {
            className: "wf-key-row is-ok",
            children: [(0, n.jsx)("small", {
              children: c(e, "部署平台的环境变量", "Env var on the deploy platform")
            }), (0, n.jsx)("code", {
              children: "AI_API_KEY = sk-••••3f2k"
            })]
          }), (0, n.jsxs)("div", {
            className: "wf-key-row is-ok",
            children: [(0, n.jsx)("small", {
              children: c(e, "代码里只引用名字", "Code references the name only")
            }), (0, n.jsx)("code", {
              children: "process.env.AI_API_KEY"
            })]
          })]
        }) : null, 1 === s ? (0, n.jsxs)(n.Fragment, {
          children: [(0, n.jsxs)("div", {
            className: "wf-key-row is-bad",
            children: [(0, n.jsx)("small", {
              children: c(e, "硬编码在源码里", "Hardcoded in source")
            }), (0, n.jsx)("code", {
              children: "const KEY = 'sk-live-3f2k'"
            })]
          }), (0, n.jsxs)("div", {
            className: "wf-key-row is-bad",
            children: [(0, n.jsx)("small", {
              children: c(e, "跟着代码进了仓库", "Committed to the repo")
            }), (0, n.jsx)("code", {
              children: "git log \xb7 config.js ✗"
            })]
          })]
        }) : null, 2 === s ? (0, n.jsxs)(n.Fragment, {
          children: [(0, n.jsxs)("div", {
            className: "wf-key-row is-bad",
            children: [(0, n.jsx)("small", {
              children: c(e, "Key 出现在聊天记录里", "Key spotted in a chat")
            }), (0, n.jsx)("code", {
              children: "sk-live-•••• ✗"
            })]
          }), (0, n.jsxs)("div", {
            className: "wf-key-row is-ok",
            children: [(0, n.jsx)("small", {
              children: c(e, "后台吊销旧 Key，创建新的", "Revoke the old key, create a new one")
            }), (0, n.jsx)("code", {
              children: c(e, "吊销 → 重新生成 → 换到环境变量", "Revoke → regenerate → move to env var")
            })]
          })]
        }) : null]
      }), (0, n.jsxs)("div", {
        className: "wf-crud-result",
        children: [(0, n.jsx)("strong", {
          children: c(e, "Key 是程序的门禁卡，不是给人记的密码", "The key is a badge for programs, not a password to memorize")
        }), (0, n.jsx)("small", {
          children: c(e, "创建时通常只完整显示一次；泄露第一反应是吊销。", "It usually displays fully once at creation; on leak, revoke first.")
        })]
      })]
    });
  },
  prompt: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "系统提示词", "System prompt"), c(e, "你的提示词", "Your prompt"), c(e, "AI 的产出", "The output")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "一次请求里的两层：开发者预设的和你写的", "Two layers in one request: the preset and yours"),
      className: "wf-stage wf-prompt-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-prompt-demo step-".concat(s),
        children: [(0, n.jsxs)("div", {
          className: "wf-prompt-layer is-system ".concat(0 === s ? "on" : ""),
          children: [(0, n.jsx)("small", {
            children: c(e, "系统提示词 \xb7 开发者预设，你看不见", "System prompt \xb7 preset, invisible to you")
          }), (0, n.jsx)("code", {
            children: c(e, "你是前端实现助手，只改用户指定的文件……", "You are a frontend assistant; touch only the files the user names…")
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-prompt-layer is-user ".concat(1 === s ? "on" : ""),
          children: [(0, n.jsx)("small", {
            children: c(e, "你的提示词 \xb7 每一轮你写的", "Your prompt \xb7 what you write each turn")
          }), (0, n.jsx)("b", {
            children: c(e, "做一个报价列表：客户名、金额、日期、状态，先存浏览器本地，按时间倒序。", "Build a quote list: client, amount, date, status; store locally; newest first.")
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-prompt-layer is-output ".concat(2 === s ? "on" : ""),
          children: [(0, n.jsx)("small", {
            children: c(e, "产出 \xb7 顺着你的提示词长出来", "Output \xb7 grows from your prompt")
          }), (0, n.jsx)("span", {
            children: c(e, "报价列表：能增删改查，四个字段，倒序 ✓", "Quote list: full CRUD, four fields, newest first ✓")
          })]
        })]
      }), (0, n.jsxs)("div", {
        className: "wf-crud-result",
        children: [(0, n.jsx)("strong", {
          children: c(e, "结果偏了，先改你写的这一层", "Off-target result? Fix the layer you write")
        }), (0, n.jsx)("small", {
          children: c(e, "补上对象、要求、怎样算完成——比换工具快得多。", "Add the object, requirements, and done-criteria—far faster than switching tools.")
        })]
      })]
    });
  },
  crud: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "创建 Create", "Create"), c(e, "读取 Read", "Read"), c(e, "更新 Update", "Update"), c(e, "删除 Delete", "Delete")],
      d = [{
        client: "星辰咖啡",
        amount: "\xa5 12,000",
        status: "已成交"
      }, {
        client: "拾光书店",
        amount: "\xa5 8,500",
        status: "跟进中"
      }, ...(0 === s ? [{
        client: "山野民宿",
        amount: "\xa5 15,000",
        status: "跟进中",
        isNew: !0
      }] : []), ...(s >= 3 ? [{
        client: "拾光书店",
        amount: "\xa5 8,500",
        status: "跟进中",
        isGone: !0
      }] : [])];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "同一张报价列表，四种操作各自动了哪里", "One quote list—what each operation touches"),
      className: "wf-stage wf-crud-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-crud-table step-".concat(s),
        children: [(0, n.jsxs)("div", {
          className: "wf-crud-head",
          children: [(0, n.jsx)("span", {
            children: c(e, "客户", "Client")
          }), (0, n.jsx)("span", {
            children: c(e, "金额", "Amount")
          }), (0, n.jsx)("span", {
            children: c(e, "状态", "Status")
          })]
        }), d.map(a => (0, n.jsxs)("div", {
          className: a.isNew ? "is-new" : a.isGone ? "is-gone" : void 0,
          children: [(0, n.jsx)("span", {
            children: a.client
          }), (0, n.jsx)("span", {
            children: a.isGone ? (0, n.jsxs)(n.Fragment, {
              children: [(0, n.jsx)("del", {
                children: "\xa5 8,500"
              }), (0, n.jsx)("b", {
                children: c(e, "已删除", "deleted")
              })]
            }) : "星辰咖啡" === a.client && 2 === s ? (0, n.jsxs)(n.Fragment, {
              children: [(0, n.jsx)("del", {
                children: "\xa5 12,000"
              }), (0, n.jsx)("b", {
                className: "is-updated",
                children: "\xa5 13,200"
              })]
            }) : a.amount
          }), (0, n.jsx)("span", {
            children: a.status
          })]
        }, a.client)), 1 === s ? (0, n.jsx)("div", {
          className: "wf-crud-reading",
          children: c(e, "正在读取全部记录", "reading all records")
        }) : null]
      }), (0, n.jsxs)("div", {
        className: "wf-crud-result",
        children: [(0, n.jsx)("strong", {
          children: 0 === s ? c(e, "创建：列表多出一条新记录", "Create: one new record appears") : 1 === s ? c(e, "读取：把记录摆出来看", "Read: show the records") : 2 === s ? c(e, "更新：改已有记录里的信息", "Update: change info in an existing record") : c(e, "删除：移除一整条记录", "Delete: remove a whole record")
        }), (0, n.jsx)("small", {
          children: c(e, "导出报表、统计图表是这四种之外的扩展功能。", "Exports and charts are extra features beyond these four.")
        })]
      })]
    });
  },
  field: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "客户名", "Client name"), c(e, "金额", "Amount"), c(e, "日期", "Date"), c(e, "状态", "Status")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "表单里填的每一项，都变成记录里的一个字段", "Each form item becomes one field in the record"),
      className: "wf-stage wf-field-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-field-map step-".concat(s),
        children: [(0, n.jsxs)("div", {
          className: "wf-field-form",
          children: [(0, n.jsx)("small", {
            children: c(e, "新建报价表单", "New quote form")
          }), [{
            label: c(e, "客户名", "Client name"),
            value: "星辰咖啡"
          }, {
            label: c(e, "金额", "Amount"),
            value: "\xa5 12,000"
          }, {
            label: c(e, "日期", "Date"),
            value: "2026-03-12"
          }, {
            label: c(e, "状态", "Status"),
            value: c(e, "跟进中", "Following up")
          }].map((e, a) => (0, n.jsxs)("label", {
            className: s === a ? "is-active" : void 0,
            children: [(0, n.jsx)("small", {
              children: e.label
            }), (0, n.jsx)("b", {
              children: e.value
            })]
          }, e.label))]
        }), (0, n.jsx)("span", {
          "aria-hidden": "true",
          children: "→"
        }), (0, n.jsxs)("div", {
          className: "wf-field-record",
          children: [(0, n.jsx)("small", {
            children: c(e, "保存后的记录", "The saved record")
          }), [[c(e, "客户名", "client_name"), "星辰咖啡"], [c(e, "金额", "amount"), "\xa5 12,000"], [c(e, "日期", "date"), "2026-03-12"], [c(e, "状态", "status"), c(e, "跟进中", "following_up")]].map((e, a) => {
            let [t, i] = e;
            return (0, n.jsxs)("div", {
              className: s === a ? "is-active" : void 0,
              children: [(0, n.jsx)("small", {
                children: t
              }), (0, n.jsx)("b", {
                children: i
              })]
            }, t);
          })]
        })]
      }), (0, n.jsxs)("div", {
        className: "wf-crud-result",
        children: [(0, n.jsx)("strong", {
          children: c(e, "字段是信息本身；输入框只是填写它的控件", "The field is the information; the input is just the control")
        }), (0, n.jsx)("small", {
          children: c(e, "清单里有四个字段，表单就只有四项要填。", "Four fields on the list means the form asks for exactly four things.")
        })]
      })]
    });
  },
  "data-type": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "金额存成文字", "Amount as text"), c(e, "金额存成数字", "Amount as number"), c(e, "日期存成文字 vs 日期类型", "Date as text vs date")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "金额字段是数字还是文字，差别在哪", "What changes when the amount field is a number versus text"),
      className: "wf-stage wf-dtype-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-dtype-demo step-".concat(s),
        children: [(0, n.jsxs)("div", {
          className: "wf-dtype-field",
          children: [(0, n.jsx)("small", {
            children: c(e, "金额字段", "Amount field")
          }), 0 === s ? (0, n.jsxs)(n.Fragment, {
            children: [(0, n.jsx)("code", {
              children: "\xa51,2o0 元"
            }), (0, n.jsx)("em", {
              className: "is-bad",
              children: c(e, "求和失败：混进了字母 o", "Sum fails: the letter o slipped in")
            })]
          }) : (0, n.jsxs)(n.Fragment, {
            children: [(0, n.jsx)("b", {
              children: "1200"
            }), (0, n.jsx)("em", {
              className: "is-ok",
              children: c(e, "数字键盘输入，三条记录合计 \xa5 33,500", "Numeric input; three records total \xa533,500")
            })]
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-dtype-field",
          children: [(0, n.jsx)("small", {
            children: c(e, "日期字段", "Date field")
          }), 2 === s ? (0, n.jsxs)(n.Fragment, {
            children: [(0, n.jsx)("b", {
              children: "2026-03-12"
            }), (0, n.jsx)("em", {
              className: "is-ok",
              children: c(e, "日期选择器输入，按时间排序正确", "Date picker input; chronological sorting works")
            })]
          }) : (0, n.jsxs)(n.Fragment, {
            children: [(0, n.jsx)("code", {
              children: "3月12号 下午"
            }), (0, n.jsx)("em", {
              className: "is-bad",
              children: c(e, "文字没法排序，格式各写各的", "Text cannot sort and formats drift")
            })]
          })]
        })]
      }), (0, n.jsxs)("div", {
        className: "wf-crud-result",
        children: [(0, n.jsx)("strong", {
          children: c(e, "判断标准：以后要不要对它做计算或排序", "The test: will you compute or sort on it later")
        }), (0, n.jsx)("small", {
          children: c(e, "手机号像数字但不需要求和，用文字类型反而省事。", "A phone number looks numeric but is never summed—text serves better.")
        })]
      })]
    });
  },
  favicon: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "浏览器标签", "Browser tab"), c(e, "书签", "Bookmark"), c(e, "历史记录", "History")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "Favicon 在浏览器界面中的位置", "Where a favicon appears in browser UI"),
      className: "wf-stage wf-favicon-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-favicon-evidence",
        children: [(0, n.jsxs)("div", {
          className: "wf-site-source",
          children: [(0, n.jsx)("span", {
            className: "wf-brand-mark",
            children: "V"
          }), (0, n.jsxs)("div", {
            children: [(0, n.jsx)("small", {
              children: c(e, "网站提供的资源", "Resource supplied by the site")
            }), (0, n.jsx)("code", {
              children: '<link rel="icon" href="/favicon.svg">'
            })]
          })]
        }), (0, n.jsx)("span", {
          className: "wf-flow-arrow",
          "aria-hidden": "true",
          children: "→"
        }), (0, n.jsxs)("div", {
          className: "wf-browser-chrome context-".concat(s),
          children: [0 === s && (0, n.jsxs)("div", {
            className: "wf-tab-strip",
            children: [(0, n.jsxs)("span", {
              className: "active",
              children: [(0, n.jsx)("i", {
                children: "V"
              }), c(e, "退款流程 \xb7 VibeHub", "Refund guide \xb7 VibeHub")]
            }), (0, n.jsxs)("span", {
              children: [(0, n.jsx)("i", {
                children: "◇"
              }), c(e, "项目面板", "Project board")]
            })]
          }), 1 === s && (0, n.jsxs)("div", {
            className: "wf-browser-list",
            children: [(0, n.jsx)("strong", {
              children: c(e, "书签", "Bookmarks")
            }), (0, n.jsxs)("span", {
              children: [(0, n.jsx)("i", {
                children: "V"
              }), (0, n.jsx)("b", {
                children: "VibeHub"
              }), (0, n.jsx)("small", {
                children: "vibehub.dev"
              })]
            })]
          }), 2 === s && (0, n.jsxs)("div", {
            className: "wf-browser-list",
            children: [(0, n.jsx)("strong", {
              children: c(e, "最近访问", "Recent history")
            }), (0, n.jsxs)("span", {
              children: [(0, n.jsx)("i", {
                children: "V"
              }), (0, n.jsx)("b", {
                children: c(e, "退款流程", "Refund guide")
              }), (0, n.jsx)("small", {
                children: "vibehub.dev/help/refunds"
              })]
            })]
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "同一枚站点图标帮助识别浏览器里的页面；它没有出现在页面正文里。", "The same site icon identifies pages in browser UI; it is not part of the page body.")
      })]
    });
  },
  "title-tag": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "写入 title", "Set the title"), c(e, "浏览器使用", "Browser uses it"), c(e, "搜索可能参考", "Search may use it")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "页面标题从 HTML 到浏览器和搜索结果", "The page title from HTML to browser and search result"),
      className: "wf-stage wf-title-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-title-evidence",
        children: [(0, n.jsxs)(l.KE, {
          filename: "product.html",
          children: [(0, n.jsx)(l.SH, {
            n: "1",
            children: "<head>"
          }), (0, n.jsxs)(l.SH, {
            n: "2",
            active: 0 === s,
            children: ["<title>", c(e, "降噪耳机 \xb7 松果商店", "Noise-cancelling headphones \xb7 Pine Store"), "</title>"]
          }), (0, n.jsx)(l.SH, {
            n: "3",
            children: "</head>"
          }), (0, n.jsxs)(l.SH, {
            n: "4",
            children: ["<h1>", c(e, "降噪耳机", "Noise-cancelling headphones"), "</h1>"]
          })]
        }), (0, n.jsx)("span", {
          className: "wf-flow-arrow",
          "aria-hidden": "true",
          children: "→"
        }), (0, n.jsxs)("div", {
          className: "wf-title-results",
          children: [(0, n.jsxs)("div", {
            className: 1 === s ? "on" : "",
            children: [(0, n.jsx)("small", {
              children: c(e, "浏览器标签", "Browser tab")
            }), (0, n.jsx)("strong", {
              children: c(e, "降噪耳机 \xb7 松果商店", "Noise-cancelling headphones \xb7 Pine Store")
            })]
          }), (0, n.jsxs)("div", {
            className: 2 === s ? "on" : "",
            children: [(0, n.jsx)("small", {
              children: c(e, "搜索标题候选", "Search title candidate")
            }), (0, n.jsx)("a", {
              children: c(e, "降噪耳机 \xb7 松果商店", "Noise-cancelling headphones \xb7 Pine Store")
            }), (0, n.jsx)("code", {
              children: "pine.example/products/headphones"
            })]
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "正文 H1 和文档 title 可以相关，但它们是两个需要分别验收的对象。", "The H1 and document title can be related, but they are separate objects to verify.")
      })]
    });
  },
  "page-metadata": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "浏览器", "Browser"), c(e, "搜索", "Search"), c(e, "分享平台", "Sharing"), c(e, "安装系统", "Install")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "页面元数据分别被谁读取", "Who reads each piece of page metadata"),
      className: "wf-stage wf-metadata-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-metadata-map",
        children: [(0, n.jsx)(l.KE, {
          filename: "<head>",
          children: ["&lt;title&gt;Refund guide&lt;/title&gt;", '&lt;meta name="description" content="…"&gt;', '&lt;meta property="og:image" content="…"&gt;', '&lt;link rel="manifest" href="/manifest.json"&gt;'].map((e, a) => (0, n.jsx)(l.SH, {
            n: a + 1,
            active: s === a,
            children: e
          }, e))
        }), (0, n.jsx)("span", {
          className: "wf-flow-arrow",
          "aria-hidden": "true",
          children: "→"
        }), (0, n.jsxs)("div", {
          className: "wf-metadata-consumer consumer-".concat(s),
          children: [(0, n.jsx)("small", {
            children: i[s]
          }), 0 === s && (0, n.jsx)("strong", {
            children: c(e, "标签：Refund guide", "Tab: Refund guide")
          }), 1 === s && (0, n.jsxs)(n.Fragment, {
            children: [(0, n.jsx)("a", {
              children: c(e, "退款流程怎么走", "How refunds work")
            }), (0, n.jsx)("p", {
              children: c(e, "条件、提交和进度说明", "Conditions, submission, and status")
            })]
          }), 2 === s && (0, n.jsxs)(n.Fragment, {
            children: [(0, n.jsx)("div", {
              className: "wf-share-image",
              children: "V"
            }), (0, n.jsx)("strong", {
              children: c(e, "退款流程怎么走", "How refunds work")
            })]
          }), 3 === s && (0, n.jsxs)(n.Fragment, {
            children: [(0, n.jsx)("span", {
              className: "wf-app-tile",
              children: "V"
            }), (0, n.jsx)("strong", {
              children: c(e, "安装 VibeHub", "Install VibeHub")
            })]
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "“元数据已完成”不是一个验收结果；要按消费方检查对应字段。", "“Metadata is done” is not a test result; verify the fields used by each consumer.")
      })]
    });
  },
  "open-graph": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "只有普通标题", "Only a page title"), c(e, "补齐 Open Graph", "Add Open Graph")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "Open Graph 信息生成链接分享卡", "Open Graph metadata producing a link preview"),
      className: "wf-stage wf-og-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-og-evidence",
        children: [(0, n.jsxs)(l.KE, {
          filename: "article.html",
          children: [(0, n.jsxs)(l.SH, {
            n: "1",
            children: ["<title>", c(e, "怎样做项目验收", "How to verify a project"), "</title>"]
          }), (0, n.jsx)(l.SH, {
            n: "2",
            active: 1 === s,
            children: s ? '&lt;meta property="og:title" content="'.concat(c(e, "怎样做项目验收", "How to verify a project"), '"&gt;') : "&lt;!-- no og:title --&gt;"
          }), (0, n.jsx)(l.SH, {
            n: "3",
            active: 1 === s,
            children: s ? '&lt;meta property="og:image" content="https://…/cover.png"&gt;' : "&lt;!-- no og:image --&gt;"
          }), (0, n.jsx)(l.SH, {
            n: "4",
            active: 1 === s,
            children: s ? '&lt;meta property="og:url" content="https://…/verify"&gt;' : "&lt;!-- no og:url --&gt;"
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-share-card ".concat(s ? "complete" : "missing"),
          children: [(0, n.jsx)("div", {
            className: "wf-share-card-image",
            children: s ? "VERIFY" : c(e, "无预览图", "No preview image")
          }), (0, n.jsx)("small", {
            children: "vibehub.dev"
          }), (0, n.jsx)("strong", {
            children: s ? c(e, "怎样做项目验收", "How to verify a project") : "vibehub.dev/verify"
          }), (0, n.jsx)("p", {
            children: s ? c(e, "从可观察结果确认改动是否完成。", "Confirm changes through observable results.") : c(e, "平台只能显示裸链接", "The platform can only show a bare link")
          })]
        })]
      })]
    });
  },
  "app-icon": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "主屏幕", "Home screen"), c(e, "系统搜索", "System search"), c(e, "系统设置", "Settings")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "同一应用图标进入不同系统位置", "One app icon across system locations"),
      className: "wf-stage wf-app-icon-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-app-icon-map",
        children: [(0, n.jsxs)("div", {
          className: "wf-icon-master",
          children: [(0, n.jsx)("span", {
            children: "V"
          }), (0, n.jsx)("small", {
            children: c(e, "方形源图", "Square source")
          })]
        }), (0, n.jsx)("span", {
          className: "wf-flow-arrow",
          "aria-hidden": "true",
          children: "→"
        }), (0, n.jsxs)("div", {
          className: "wf-system-surface place-".concat(s),
          children: [0 === s && (0, n.jsxs)(n.Fragment, {
            children: [(0, n.jsxs)("div", {
              className: "wf-home-grid",
              children: [(0, n.jsx)("i", {}), (0, n.jsx)("span", {
                children: "V"
              }), (0, n.jsx)("i", {}), (0, n.jsx)("i", {})]
            }), (0, n.jsx)("strong", {
              children: "VibeHub"
            })]
          }), 1 === s && (0, n.jsxs)(n.Fragment, {
            children: [(0, n.jsxs)("div", {
              className: "wf-system-search",
              children: ["⌕ ", (0, n.jsx)("b", {
                children: "VibeHub"
              }), (0, n.jsx)("span", {
                children: "V"
              })]
            }), (0, n.jsx)("small", {
              children: c(e, "应用", "Application")
            })]
          }), 2 === s && (0, n.jsxs)(n.Fragment, {
            children: [(0, n.jsxs)("div", {
              className: "wf-setting-row",
              children: [(0, n.jsx)("span", {
                children: "V"
              }), (0, n.jsx)("b", {
                children: "VibeHub"
              }), (0, n.jsx)("i", {
                children: "›"
              })]
            }), (0, n.jsx)("small", {
              children: c(e, "通知与权限", "Notifications and permissions")
            })]
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "系统会缩放或套用形状；识别中心必须在小尺寸下仍然清楚。", "The system scales or masks the asset, so its identifying center must remain clear at small sizes.")
      })]
    });
  },
  "web-app-manifest": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "页面关联", "Page links it"), c(e, "读取清单", "Read manifest"), c(e, "安装后启动", "Launch installed app")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "Web App Manifest 从文件到安装结果", "Web App Manifest from file to installed result"),
      className: "wf-stage wf-manifest-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-manifest-evidence",
        children: [(0, n.jsx)(l.KE, {
          filename: 0 === s ? "index.html" : "manifest.webmanifest",
          children: 0 === s ? (0, n.jsx)(l.SH, {
            n: "1",
            active: !0,
            children: '<link rel="manifest" href="/manifest.webmanifest">'
          }) : (0, n.jsxs)(n.Fragment, {
            children: [(0, n.jsx)(l.SH, {
              n: "1",
              active: 1 === s,
              children: '{ "name": "VibeHub",'
            }), (0, n.jsx)(l.SH, {
              n: "2",
              children: '  "icons": [{ "src": "/app.png" }],'
            }), (0, n.jsx)(l.SH, {
              n: "3",
              active: 2 === s,
              children: '  "start_url": "/learn",'
            }), (0, n.jsx)(l.SH, {
              n: "4",
              active: 2 === s,
              children: '  "display": "standalone" }'
            })]
          })
        }), (0, n.jsx)("span", {
          className: "wf-flow-arrow",
          "aria-hidden": "true",
          children: "→"
        }), (0, n.jsxs)("div", {
          className: "wf-install-result step-".concat(s),
          children: [(0, n.jsx)("span", {
            className: "wf-app-tile",
            children: "V"
          }), (0, n.jsx)("strong", {
            children: s < 2 ? c(e, "安装 VibeHub", "Install VibeHub") : c(e, "学习路径", "Learning path")
          }), (0, n.jsx)("small", {
            children: s < 2 ? c(e, "浏览器安装入口", "Browser install entry") : "/learn \xb7 standalone"
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "清单描述安装和启动；它本身不保证离线可用。", "The manifest describes installation and launch; it does not guarantee offline use.")
      })]
    });
  },
  logo: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "桌面页头", "Desktop header"), c(e, "手机页头", "Mobile header"), c(e, "深色背景", "Dark background")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "同一 Logo 母体适配真实使用场景", "One logo system adapted to real contexts"),
      className: "wf-stage wf-logo-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-logo-evidence",
        children: [(0, n.jsxs)("div", {
          className: "wf-logo-master",
          children: [(0, n.jsx)("span", {
            children: "V"
          }), (0, n.jsx)("b", {
            children: "VibeHub"
          }), (0, n.jsx)("small", {
            children: c(e, "品牌母体", "Brand master")
          })]
        }), (0, n.jsx)("span", {
          className: "wf-flow-arrow",
          "aria-hidden": "true",
          children: "→"
        }), (0, n.jsxs)("div", {
          className: "wf-logo-context context-".concat(s),
          children: [(0, n.jsxs)("header", {
            children: [(0, n.jsx)("span", {
              children: "V"
            }), 1 !== s && (0, n.jsx)("b", {
              children: "VibeHub"
            }), (0, n.jsx)("nav", {
              children: c(e, "学习　搜索　关于", "Learn　Search　About")
            }), (0, n.jsx)("i", {
              children: "☰"
            })]
          }), (0, n.jsxs)("main", {
            children: [(0, n.jsx)("strong", {
              children: c(e, "网页开发术语图鉴", "A field guide to web terms")
            }), (0, n.jsx)("p", {
              children: c(e, "核心形状一致，版本按背景和宽度变化。", "The core mark stays recognizable while the lockup adapts to width and background.")
            })]
          })]
        })]
      })]
    });
  },
  "not-found-page": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "资源确实不存在", "Resource is missing"), c(e, "内容已有新地址", "Content moved")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "错误地址的 404 与重定向判断", "Choosing 404 or redirect for an invalid address"),
      className: "wf-stage wf-not-found-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-not-found-evidence",
        children: [(0, n.jsxs)("div", {
          className: "wf-address-request",
          children: [(0, n.jsx)("small", {
            children: c(e, "地址栏", "Address bar")
          }), (0, n.jsx)("code", {
            children: "example.com/old-guide"
          })]
        }), (0, n.jsx)("span", {
          className: "wf-flow-arrow",
          "aria-hidden": "true",
          children: "→"
        }), (0, n.jsxs)("div", {
          className: "wf-http-result ".concat(s ? "redirected" : "missing"),
          children: [(0, n.jsx)("code", {
            children: s ? "301 Location: /guide" : "404 Not Found"
          }), (0, n.jsx)("strong", {
            children: s ? c(e, "打开新的指南地址", "Open the new guide URL") : c(e, "找不到这个页面", "Page not found")
          }), (0, n.jsx)("span", {
            children: s ? "200 /guide" : c(e, "返回文章列表　搜索文章", "Back to articles　Search")
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "没有对应资源才返回真正的 404；已有明确替代页时应把旧地址带过去。", "Return a real 404 only when no corresponding resource exists; otherwise send the old URL to its replacement.")
      })]
    });
  },
  cache: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "首次请求", "First request"), c(e, "缓存命中", "Cache hit"), c(e, "重新验证", "Revalidate")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "同一个资源请求经过缓存层", "One resource request through cache layers"),
      className: "wf-stage wf-cache-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-cache-route step-".concat(s),
        children: [(0, n.jsxs)("div", {
          children: [(0, n.jsx)("small", {
            children: c(e, "浏览器", "Browser")
          }), (0, n.jsx)("code", {
            children: "GET /app.css"
          })]
        }), (0, n.jsx)("span", {
          children: "→"
        }), (0, n.jsxs)("div", {
          className: 1 === s ? "on" : "",
          children: [(0, n.jsx)("small", {
            children: c(e, "缓存副本", "Cached copy")
          }), (0, n.jsx)("strong", {
            children: 0 === s ? c(e, "没有副本", "No copy") : 1 === s ? c(e, "直接返回旧/新副本", "Return stored copy") : "ETag: v2"
          })]
        }), (0, n.jsx)("span", {
          className: 1 === s ? "muted" : "",
          children: "→"
        }), (0, n.jsxs)("div", {
          className: 1 !== s ? "on" : "",
          children: [(0, n.jsx)("small", {
            children: c(e, "源站", "Origin")
          }), (0, n.jsx)("code", {
            children: 2 === s ? "304 Not Modified" : 1 === s ? c(e, "未请求", "Not requested") : "200 app.css"
          })]
        })]
      }), (0, n.jsxs)("div", {
        className: "wf-network-proof",
        children: [(0, n.jsx)("b", {
          children: c(e, "Network 证据", "Network evidence")
        }), (0, n.jsx)("code", {
          children: 0 === s ? "200 \xb7 transferred 18 kB" : 1 === s ? "200 \xb7 memory cache" : "304 \xb7 transferred 0.4 kB"
        })]
      })]
    });
  },
  "xml-sitemap": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "读取文件", "Read file"), c(e, "发现地址", "Discover URLs"), c(e, "请求页面", "Request pages")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "XML Sitemap 帮助爬虫发现页面", "An XML Sitemap helping a crawler discover pages"),
      className: "wf-stage wf-sitemap-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-sitemap-evidence",
        children: [(0, n.jsxs)(l.KE, {
          filename: "sitemap.xml",
          children: [(0, n.jsx)(l.SH, {
            n: "1",
            active: 0 === s,
            children: "<url>https://example.com/guides</url>"
          }), (0, n.jsx)(l.SH, {
            n: "2",
            active: 1 === s,
            children: "<url>https://example.com/guides/cache</url>"
          }), (0, n.jsx)(l.SH, {
            n: "3",
            error: 2 === s,
            children: "<url>https://example.com/deleted</url>"
          })]
        }), (0, n.jsx)("span", {
          className: "wf-flow-arrow",
          "aria-hidden": "true",
          children: "→"
        }), (0, n.jsxs)("div", {
          className: "wf-crawler-proof",
          children: [(0, n.jsx)("span", {
            className: "wf-crawler",
            children: "⌕"
          }), (0, n.jsx)("strong", {
            children: 0 === s ? c(e, "读取 URL 清单", "Read the URL list") : 1 === s ? c(e, "加入待抓取队列", "Add URLs to crawl queue") : c(e, "逐个请求并看结果", "Request each URL and inspect result")
          }), (0, n.jsx)("code", {
            children: s < 2 ? "discovered: 3" : "200　200　404"
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "文件能帮助发现 URL，但不能把 404 变成可用页面，也不保证收录。", "The file can expose URLs, but it cannot turn a 404 into a page or guarantee indexing.")
      })]
    });
  },
  "robots-txt": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = ["/products", "/cart", "/admin"],
      d = 0 === s;
    return (0, n.jsxs)(l.xc, {
      label: c(e, "robots.txt 只控制爬虫抓取", "robots.txt controlling crawling only"),
      className: "wf-stage wf-robots-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-robots-evidence",
        children: [(0, n.jsxs)(l.KE, {
          filename: "robots.txt",
          children: [(0, n.jsx)(l.SH, {
            n: "1",
            children: "User-agent: *"
          }), (0, n.jsx)(l.SH, {
            n: "2",
            active: 1 === s,
            children: "Disallow: /cart"
          }), (0, n.jsx)(l.SH, {
            n: "3",
            active: 2 === s,
            children: "Disallow: /admin"
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-robots-results",
          children: [(0, n.jsxs)("div", {
            className: d ? "ok" : "blocked",
            children: [(0, n.jsx)("small", {
              children: c(e, "搜索爬虫", "Crawler")
            }), (0, n.jsx)("strong", {
              children: d ? c(e, "允许抓取", "Allowed to crawl") : c(e, "不抓取", "Do not crawl")
            }), (0, n.jsx)("code", {
              children: i[s]
            })]
          }), (0, n.jsxs)("div", {
            className: "browser",
            children: [(0, n.jsx)("small", {
              children: c(e, "普通浏览器", "User browser")
            }), (0, n.jsx)("strong", {
              children: c(e, "仍然可以请求", "Can still request it")
            }), (0, n.jsx)("code", {
              children: 2 === s ? "401 Sign in required" : "200 OK"
            })]
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "Disallow 不是权限控制；私密页面仍要由认证和授权保护。", "Disallow is not access control; private pages still need authentication and authorization.")
      })]
    });
  },
  "canonical-url": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = ["/product/headphones", "/product/headphones?ref=ad", "/product/headphones?color=black"];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "多个近似 URL 指向一个规范网址", "Several similar URLs pointing to one canonical URL"),
      className: "wf-stage wf-canonical-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-canonical-evidence",
        children: [(0, n.jsxs)("div", {
          className: "wf-current-url",
          children: [(0, n.jsx)("small", {
            children: c(e, "当前地址栏不会跳转", "Current address does not redirect")
          }), (0, n.jsxs)("code", {
            children: ["example.com", i[s]]
          })]
        }), (0, n.jsx)("span", {
          className: "wf-flow-arrow",
          "aria-hidden": "true",
          children: "→"
        }), (0, n.jsx)(l.KE, {
          filename: "<head>",
          children: (0, n.jsx)(l.SH, {
            n: "1",
            active: !0,
            children: '<link rel="canonical" href="https://example.com/product/headphones">'
          })
        }), (0, n.jsx)("span", {
          className: "wf-flow-arrow",
          "aria-hidden": "true",
          children: "→"
        }), (0, n.jsxs)("div", {
          className: "wf-canonical-result",
          children: [(0, n.jsx)("small", {
            children: c(e, "代表版本", "Representative URL")
          }), (0, n.jsx)("strong", {
            children: "/product/headphones"
          }), (0, n.jsx)("span", {
            children: c(e, "搜索规范化提示", "Canonicalization signal")
          })]
        })]
      })]
    });
  },
  "web-hosting": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "只有本地项目", "Local project only"), c(e, "执行一次部署", "Run a deployment"), c(e, "托管持续响应", "Hosting keeps serving")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "部署动作与托管环境的时间边界", "The time boundary between deployment and hosting"),
      className: "wf-stage wf-hosting-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-hosting-timeline step-".concat(s),
        children: [(0, n.jsxs)("div", {
          children: [(0, n.jsx)("small", {
            children: c(e, "本地项目", "Local project")
          }), (0, n.jsx)("strong", {
            children: "site/"
          }), (0, n.jsx)("code", {
            children: "localhost:3000"
          })]
        }), (0, n.jsx)("span", {
          children: "→"
        }), (0, n.jsxs)("div", {
          className: 1 === s ? "on" : "",
          children: [(0, n.jsx)("small", {
            children: c(e, "Deployment \xb7 一次动作", "Deployment \xb7 one action")
          }), (0, n.jsx)("strong", {
            children: 0 === s ? c(e, "尚未发布", "Not published") : "build-42 ✓"
          })]
        }), (0, n.jsx)("span", {
          children: "→"
        }), (0, n.jsxs)("div", {
          className: 2 === s ? "on" : "",
          children: [(0, n.jsx)("small", {
            children: c(e, "Hosting \xb7 持续环境", "Hosting \xb7 ongoing environment")
          }), (0, n.jsx)("strong", {
            children: 2 === s ? "GET / → 200" : c(e, "等待版本", "Waiting for a version")
          }), (0, n.jsx)("code", {
            children: "example.com"
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "部署把一个版本送进去；托管环境在之后继续接收用户请求。", "Deployment sends a version there; the hosting environment keeps serving user requests afterward.")
      })]
    });
  },
  "http-status-code": function () {
    let e = r(),
      s = [{
        url: "example.com/old-page",
        method: "GET",
        path: "/old-page",
        code: 404,
        tone: "miss",
        meaning: c(e, "服务器没有这个资源", "The server has no such resource"),
        meaning_en: "The server has no such resource",
        side: c(e, "前端或部署", "Frontend or deployment"),
        side_en: "Frontend or deployment",
        action: c(e, "先检查地址是否写错，以及这个页面是否真的部署上去了", "First check whether the address is wrong and whether the page was actually deployed"),
        action_en: "First check whether the address is wrong and whether the page was actually deployed"
      }, {
        url: "example.com/save",
        method: "POST",
        path: "/save",
        code: 500,
        tone: "err",
        meaning: c(e, "服务器处理请求时自己出错", "The server failed while handling it"),
        meaning_en: "The server failed while handling it",
        side: c(e, "服务器", "Server"),
        side_en: "Server",
        action: c(e, "去服务端日志查这次请求，前端提示文字不能替代状态码", "Check server logs for this request; the page message cannot replace the status code"),
        action_en: "Check server logs for this request; the page message cannot replace the status code"
      }, {
        url: "example.com/dashboard",
        method: "GET",
        path: "/dashboard",
        code: 401,
        tone: "auth",
        meaning: c(e, "身份没有被接受", "The identity was not accepted"),
        meaning_en: "The identity was not accepted",
        side: c(e, "身份或密钥", "Identity or key"),
        side_en: "Identity or key",
        action: c(e, "检查是否已登录、密钥是否失效，而不是先改页面代码", "Check the sign-in state and whether the key expired, before touching page code"),
        action_en: "Check the sign-in state and whether the key expired, before touching page code"
      }, {
        url: "example.com/home",
        method: "GET",
        path: "/home",
        code: 200,
        tone: "ok",
        meaning: c(e, "这次请求成功了", "This request succeeded"),
        meaning_en: "This request succeeded",
        side: c(e, "请求本身", "The request itself"),
        side_en: "The request itself",
        action: c(e, "200 只说明请求被正常处理，业务结果仍要按页面实际变化验收", "200 only means the request was handled; business results still need on-page verification"),
        action_en: "200 only means the request was handled; business results still need on-page verification"
      }],
      [a, i] = (0, t.useState)(1),
      d = s[a];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "四种常见状态码指出该检查哪一侧", "Four common status codes point to which side to check"),
      className: "wf-stage wf-http-status-stage",
      children: [(0, n.jsx)(l.tk, {
        items: s.map(e => "".concat(e.code)),
        value: a,
        onChange: i,
        label: c(e, "切换状态码场景", "Switch status-code scenario")
      }), (0, n.jsxs)("div", {
        className: "wf-http-status-window",
        children: [(0, n.jsxs)("div", {
          className: "wf-http-status-browser",
          children: [(0, n.jsxs)("div", {
            className: "wf-http-status-url",
            children: [(0, n.jsx)("i", {}), (0, n.jsx)("span", {
              children: d.url
            })]
          }), (0, n.jsx)("div", {
            className: "wf-http-status-rows",
            children: s.map((e, s) => (0, n.jsxs)("div", {
              className: "wf-http-status-row tone-".concat(e.tone).concat(s === a ? " on" : ""),
              children: [(0, n.jsx)("span", {
                className: "wf-http-status-method",
                children: e.method
              }), (0, n.jsx)("code", {
                children: e.path
              }), (0, n.jsx)("b", {
                children: e.code
              }), (0, n.jsx)("small", {
                children: e.meaning
              })]
            }, e.code))
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-http-status-verdict tone-".concat(d.tone),
          children: [(0, n.jsxs)("div", {
            className: "wf-http-status-verdict-head",
            children: [(0, n.jsxs)("strong", {
              children: [d.code, " \xb7 ", d.meaning]
            }), (0, n.jsx)("span", {
              children: d.side
            })]
          }), (0, n.jsx)("p", {
            children: d.action
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "用上方按钮切换状态码场景；首位数字先分大类（2xx 成功、3xx 重定向、4xx 客户端问题、5xx 服务端错误），具体数字再缩小原因范围。", "Use the buttons above to switch status-code scenarios. The first digit groups the outcome (2xx success, 3xx redirect, 4xx client error, 5xx server error); the exact number narrows the cause.")
      })]
    });
  },
  "ip-address": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [{
        url: "localhost:3000",
        label: c(e, "本机回环地址", "Loopback address"),
        reach: c(e, "指向发起请求的设备自己", "Points to the device making the request"),
        tone: "local",
        relationshipTitle: c(e, "电脑上的开发服务", "Dev service on the computer"),
        service: c(e, "服务电脑 \xb7 192.168.1.20:3000", "Service computer \xb7 192.168.1.20:3000"),
        paths: [{
          id: "computer",
          from: c(e, "电脑浏览器", "Computer browser"),
          to: c(e, "localhost:3000 → 电脑自己的回环接口", "localhost:3000 → the computer's own loopback interface"),
          result: c(e, "可打开：本例开发服务运行在这台电脑", "Can open: this example service runs on this computer"),
          status: "is-success"
        }, {
          id: "phone",
          from: c(e, "手机浏览器", "Phone browser"),
          to: c(e, "localhost:3000 → 手机自己的回环接口", "localhost:3000 → the phone's own loopback interface"),
          result: c(e, "失败：本例手机没有运行这个开发服务", "Fails: this example phone is not running the dev service"),
          status: "is-error"
        }],
        note: c(e, "localhost 总是指向发起请求的设备。本例开发服务运行在电脑并监听本机端口；手机没有运行该服务，因此手机的 localhost 连不到电脑。", "localhost always points to the device making the request. In this example the dev service runs on the computer and listens on its local port; the phone is not running it, so the phone's localhost cannot reach the computer.")
      }, {
        url: "192.168.1.20:3000",
        label: c(e, "局域网地址", "LAN address"),
        reach: c(e, "同一网络中的手机可尝试访问电脑", "A phone on the same network can try the computer"),
        tone: "lan",
        relationshipTitle: c(e, "同一局域网内的访问路径", "Access path within the same LAN"),
        service: c(e, "服务电脑 \xb7 192.168.1.20:3000", "Service computer \xb7 192.168.1.20:3000"),
        paths: [{
          id: "lan-phone",
          from: c(e, "同一局域网的手机", "Phone on the same LAN"),
          to: c(e, "电脑 192.168.1.20:3000 上的开发服务", "dev service on computer 192.168.1.20:3000"),
          result: c(e, "需确认：服务监听局域网接口，路由可达且防火墙允许", "Check that the service listens on a LAN interface, routing works, and the firewall allows access"),
          status: ""
        }],
        note: c(e, "本例电脑与手机在同一网络；地址本身不保证连通，还要满足服务监听、路由和防火墙条件。", "The computer and phone are on the same network in this example. The address alone does not guarantee access; service listening, routing, and firewall rules also matter.")
      }, {
        url: "203.0.113.7",
        label: c(e, "文档示例地址", "Documentation example address"),
        reach: c(e, "保留示例，不表示有真实主机", "Reserved example; no real host implied"),
        tone: "public",
        relationshipTitle: c(e, "公网地址示例", "Public-address example"),
        service: "203.0.113.7",
        paths: [{
          id: "documentation-only",
          from: c(e, "访问方", "Requester"),
          to: c(e, "文档保留地址 203.0.113.7", "documentation-only address 203.0.113.7"),
          result: c(e, "仅作示例：没有真实主机，本例未测试可达性", "Example only: no real host is modeled; reachability was not tested"),
          status: ""
        }],
        note: c(e, "203.0.113.7 是 RFC 5737 保留的文档示例地址；真实公网服务还需配置路由、监听和访问规则。", "203.0.113.7 is reserved for documentation by RFC 5737. A real public service also needs routing, a listening service, and access rules.")
      }],
      d = i[s];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "查看访问方如何到达目标设备", "See how a requester reaches a target device"),
      className: "wf-stage wf-ip-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i.map(e => e.url),
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-ip-window",
        children: [(0, n.jsxs)("div", {
          className: "wf-ip-browser",
          children: [(0, n.jsxs)("div", {
            className: "wf-ip-url",
            children: [(0, n.jsx)("i", {}), (0, n.jsx)("span", {
              children: d.url
            })]
          }), (0, n.jsxs)("div", {
            className: "wf-ip-scope tone-".concat(d.tone),
            children: [(0, n.jsx)("strong", {
              children: d.label
            }), (0, n.jsx)("span", {
              children: d.reach
            })]
          })]
        }), (0, n.jsx)("div", {
          className: "wf-ip-verdict",
          children: (0, n.jsxs)("div", {
            className: "record-content",
            children: [(0, n.jsxs)("div", {
              className: "record-header",
              children: [(0, n.jsx)("strong", {
                children: d.relationshipTitle
              }), (0, n.jsx)("span", {
                children: d.service
              })]
            }), d.paths.map(e => (0, n.jsxs)("div", {
              children: [(0, n.jsxs)("div", {
                className: "record-row",
                children: [(0, n.jsxs)("span", {
                  children: [e.from, " →"]
                }), (0, n.jsx)("strong", {
                  children: e.to
                })]
              }), (0, n.jsx)("div", {
                className: "record-status ".concat(e.status),
                children: e.result
              })]
            }, e.id)), (0, n.jsx)("p", {
              children: d.note
            })]
          })
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "开发服务运行在电脑，局域网地址为 192.168.1.20:3000；更换访问方时，localhost 指向各自发起请求的设备。", "The dev service runs on the computer at 192.168.1.20:3000 on the LAN; localhost points to whichever device makes the request.")
      })]
    });
  },
  websocket: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0);
    return (0, n.jsxs)(l.xc, {
      label: c(e, "普通请求和 WebSocket 的连接方式对比", "Ordinary requests versus WebSocket connections"),
      className: "wf-stage wf-ws-stage",
      children: [(0, n.jsx)(l.tk, {
        items: [c(e, "普通请求", "Ordinary request"), c(e, "WebSocket", "WebSocket")],
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-ws-window mode-".concat(s),
        children: [(0, n.jsx)("div", {
          className: "wf-ws-side wf-ws-client",
          children: (0, n.jsx)("b", {
            children: c(e, "你的页面", "Your page")
          })
        }), (0, n.jsx)("div", {
          className: "wf-ws-link",
          children: 0 === s ? (0, n.jsxs)(n.Fragment, {
            children: [(0, n.jsxs)("span", {
              className: "wf-ws-exchange",
              children: [(0, n.jsx)("i", {
                children: c(e, "问", "Ask")
              }), (0, n.jsx)("code", {
                children: c(e, "有新消息吗？", "Any new messages?")
              }), (0, n.jsx)("i", {
                children: c(e, "答", "Reply")
              }), (0, n.jsx)("code", {
                children: c(e, "没有", "No")
              })]
            }), (0, n.jsxs)("span", {
              className: "wf-ws-exchange",
              children: [(0, n.jsx)("i", {
                children: c(e, "问", "Ask")
              }), (0, n.jsx)("code", {
                children: c(e, "有新消息吗？", "Any new messages?")
              }), (0, n.jsx)("i", {
                children: c(e, "答", "Reply")
              }), (0, n.jsx)("code", {
                children: c(e, "有 1 条", "1 new message")
              })]
            }), (0, n.jsx)("span", {
              className: "wf-ws-note",
              children: c(e, "每次都要重新问；间隔内到达的消息要等下一轮", "Ask again each time; messages arriving within the interval wait for the next round")
            })]
          }) : (0, n.jsxs)(n.Fragment, {
            children: [(0, n.jsxs)("span", {
              className: "wf-ws-open",
              children: [(0, n.jsx)("i", {}), c(e, "连接保持打开", "Connection stays open")]
            }), (0, n.jsx)("span", {
              className: "wf-ws-push",
              children: (0, n.jsx)("code", {
                children: c(e, "服务器推：新消息", "Server pushes: new message")
              })
            }), (0, n.jsx)("span", {
              className: "wf-ws-push back",
              children: (0, n.jsx)("code", {
                children: c(e, "客户端发：我发了条消息", "Client sends: I posted a message")
              })
            }), (0, n.jsx)("span", {
              className: "wf-ws-note",
              children: c(e, "服务端可主动发消息；连接可用时双方都能发送", "The server can send messages proactively; both sides can send while connected")
            })]
          })
        }), (0, n.jsx)("div", {
          className: "wf-ws-side wf-ws-server",
          children: (0, n.jsx)("b", {
            children: c(e, "服务器", "Server")
          })
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: 0 === s ? c(e, "轮询间隔内到达的消息有延迟；间隔越短越费请求。", "Messages arriving within the polling interval are delayed; shorter intervals cost more requests.") : c(e, "断线不会自动恢复：需要自动重连，普通页面读取不必上长连接。", "Dropped connections do not recover automatically: auto-reconnect is needed, and ordinary page reads do not need it.")
      })]
    });
  },
  regex: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0);
    return (0, n.jsxs)(l.xc, {
      label: c(e, "一段正则：点几个输入，看通过还是拒绝", "One regex: click inputs and see pass or reject"),
      className: "wf-stage wf-regex-stage",
      children: [(0, n.jsxs)("div", {
        className: "wf-regex-pattern",
        children: [(0, n.jsx)("small", {
          children: c(e, "校验规则", "Validation rule")
        }), (0, n.jsx)("code", {
          children: "/^\\d+$/"
        })]
      }), (0, n.jsx)("div", {
        className: "wf-regex-cases",
        children: m.map((t, i) => (0, n.jsxs)("button", {
          type: "button",
          className: "wf-regex-case".concat(t.pass ? " pass" : " reject").concat(i === s ? " on" : ""),
          "aria-pressed": i === s,
          onClick: () => a(i),
          children: [(0, n.jsx)("code", {
            children: "" === t.input ? c(e, "（空）", "(empty)") : t.input
          }), (0, n.jsx)("span", {
            children: t.pass ? c(e, "通过", "Pass") : c(e, "拒绝", "Reject")
          })]
        }, t.input))
      }), (0, n.jsxs)("p", {
        className: "wf-regex-verdict",
        children: [c(e, "选中：", "Selected: "), (0, n.jsx)("code", {
          children: "" === m[s].input ? c(e, "（空）", "(empty)") : m[s].input
        }), c(e, " → ", " → "), m[s].pass ? c(e, "通过，因为", "passes because") : c(e, "拒绝，因为", "is rejected because"), "en" === e ? m[s].why_en : m[s].why]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "本例检查数字文本，不验证手机号；验收要覆盖带空格、字母和空值等应拒绝的输入。", "This checks numeric text, not phone validity; acceptance should cover rejects such as spaces, letters, and empty input.")
      })]
    });
  },
  keyframe: function () {
    let e = r(),
      [s, a] = (0, t.useState)(1);
    return (0, n.jsxs)(l.xc, {
      label: c(e, "关键帧指定了哪些状态点", "Which state points the keyframes specify"),
      className: "wf-stage wf-kf-stage",
      children: [(0, n.jsx)(l.tk, {
        items: [c(e, "过渡：只有两态", "Transition: two states"), c(e, "关键帧：多状态循环", "Keyframes: multi-state loop")],
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-kf-window",
        children: [(0, n.jsxs)("div", {
          className: "wf-kf-stage-box".concat(1 === s ? " looping" : ""),
          children: [(0, n.jsx)("i", {
            className: "wf-kf-shape",
            "aria-hidden": "true"
          }), (0, n.jsx)("small", {
            children: 1 === s ? c(e, "循环播放中", "Looping") : c(e, "状态切换时播放一次", "Plays once on state change")
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-kf-code",
          children: [(0, n.jsx)("div", {
            className: "wf-kf-code-head",
            children: (0, n.jsx)("b", {
              children: "animation.css"
            })
          }), (0, n.jsx)("pre", {
            children: 1 === s ? "@keyframes spin {\n  0%   { rotate: 0deg }\n  50%  { rotate: 180deg }\n  100% { rotate: 360deg }\n}\n.spin { animation: spin 2s; animation-iteration-count: infinite }" : ".box {\n  transition: rotate .3s ease\n}\n.box:hover {\n  rotate: 90deg\n}"
          })]
        })]
      }), (0, n.jsx)("div", {
        className: "wf-kf-states",
        children: 1 === s ? (0, n.jsxs)(n.Fragment, {
          children: [(0, n.jsx)("span", {
            className: "on",
            children: c(e, "0% \xb7 0 度", "0% \xb7 0 deg")
          }), (0, n.jsx)("i", {
            "aria-hidden": "true",
            children: c(e, "中间值", "in between")
          }), (0, n.jsx)("span", {
            children: c(e, "50% \xb7 180 度", "50% \xb7 180 deg")
          }), (0, n.jsx)("i", {
            "aria-hidden": "true",
            children: c(e, "中间值", "in between")
          }), (0, n.jsx)("span", {
            className: "on",
            children: c(e, "100% \xb7 360 度", "100% \xb7 360 deg")
          })]
        }) : (0, n.jsxs)(n.Fragment, {
          children: [(0, n.jsx)("span", {
            className: "on",
            children: c(e, "初始 \xb7 0 度", "Start \xb7 0 deg")
          }), (0, n.jsx)("i", {
            "aria-hidden": "true",
            children: c(e, "过渡", "transition")
          }), (0, n.jsx)("span", {
            className: "on",
            children: c(e, "悬停 \xb7 90 度", "Hover \xb7 90 deg")
          })]
        })
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: 1 === s ? c(e, "你指定关键帧；浏览器只会为可插值属性计算中间值，其他属性可能直接切换。", "You specify the keyframes; the browser interpolates eligible properties, while other properties may switch discretely.") : c(e, "过渡只有起始和结束两态，由悬停等切换触发，播放一次即停。", "A transition has only start and end states, triggered by changes like hover, and stops after one play.")
      })]
    });
  },
  "prefers-reduced-motion": function () {
    let e = r(),
      [s, a] = (0, t.useState)(!1);
    return (0, n.jsxs)(l.xc, {
      label: c(e, "模拟系统偏好，看页面动画怎样响应", "Simulate the system preference and see the page respond"),
      className: "wf-stage wf-rm-stage",
      children: [(0, n.jsx)(l.tk, {
        items: [c(e, "预览：动效偏好未开启", "Preview: reduced motion off"), c(e, "预览：减少动效已开启", "Preview: reduced motion on")],
        value: +!!s,
        onChange: e => a(1 === e)
      }), (0, n.jsxs)("div", {
        className: "wf-rm-window",
        children: [(0, n.jsxs)("div", {
          className: "wf-rm-page",
          children: [(0, n.jsxs)("div", {
            className: "wf-rm-page-head",
            children: [(0, n.jsx)("i", {}), (0, n.jsx)("span", {
              children: "example.com"
            })]
          }), (0, n.jsxs)("div", {
            className: "wf-rm-page-body",
            children: [(0, n.jsx)("div", {
              className: "wf-rm-banner".concat(s ? "" : " animated"),
              children: (0, n.jsx)("span", {
                children: c(e, "横幅背景渐变", "Banner background gradient")
              })
            }), (0, n.jsxs)("div", {
              className: "wf-rm-cards",
              children: [(0, n.jsx)("span", {
                className: "wf-rm-card",
                children: c(e, "卡片一", "Card one")
              }), (0, n.jsx)("span", {
                className: "wf-rm-card",
                children: c(e, "卡片二", "Card two")
              }), (0, n.jsx)("span", {
                className: "wf-rm-card",
                children: c(e, "卡片三", "Card three")
              })]
            }), (0, n.jsxs)("div", {
              className: "wf-rm-loading",
              children: [(0, n.jsx)("i", {
                className: "wf-rm-spinner".concat(s ? " still" : ""),
                "aria-hidden": "true"
              }), (0, n.jsx)("small", {
                children: s ? c(e, "加载状态仍清楚（静态提示）", "Loading status stays clear (static cue)") : c(e, "加载指示 + 装饰动画都在动", "Loading indicator and decorative motion both running")
              })]
            })]
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-rm-verdict".concat(s ? " reduced" : ""),
          children: [(0, n.jsx)("div", {
            className: "wf-rm-verdict-head",
            children: (0, n.jsx)("strong", {
              children: s ? c(e, "减少动效：已开启", "Reduce motion: on") : c(e, "减少动效：未开启", "Reduce motion: off")
            })
          }), (0, n.jsxs)("ul", {
            children: [(0, n.jsx)("li", {
              children: s ? c(e, "背景渐变装饰：静止", "Decorative gradient: static") : c(e, "背景渐变装饰：缓慢移动", "Decorative gradient: shifting slowly")
            }), (0, n.jsx)("li", {
              children: c(e, "页面布局：保留", "Page layout: kept")
            }), (0, n.jsx)("li", {
              children: s ? c(e, "加载状态：静态提示清楚", "Loading status: clear static cue") : c(e, "加载状态：旋转指示", "Loading status: spinning cue")
            })]
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "这里用控件模拟系统偏好；开启后背景渐变和旋转指示停止，页面仍保留可读的加载状态。", "These controls simulate the system preference; with it on, the background gradient and spinner stop while the loading state remains readable.")
      })]
    });
  },
  "semantic-html": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = x[s];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "页面的标题层级：点一段看它是什么标签", "A page's heading levels: click a section to see its tag"),
      className: "wf-stage wf-sem-stage",
      children: [(0, n.jsxs)("div", {
        className: "wf-sem-window",
        children: [(0, n.jsxs)("div", {
          className: "wf-sem-page",
          children: [(0, n.jsxs)("div", {
            className: "wf-sem-page-head",
            children: [(0, n.jsx)("i", {}), (0, n.jsx)("span", {
              children: "example.com"
            })]
          }), (0, n.jsxs)("div", {
            className: "wf-sem-page-body",
            children: [x.map((t, i) => (0, n.jsxs)("button", {
              type: "button",
              className: "wf-sem-block level-".concat(t.tag).concat(i === s ? " on" : ""),
              "aria-pressed": i === s,
              onClick: () => a(i),
              children: [(0, n.jsx)("span", {
                className: "wf-sem-tag",
                children: t.tag.toUpperCase()
              }), (0, n.jsx)("strong", {
                children: c(e, t.text, t.text_en)
              })]
            }, "".concat(t.tag, "-").concat(t.text))), (0, n.jsxs)("div", {
              className: "wf-sem-para",
              children: [(0, n.jsx)("i", {
                className: "mk-line",
                style: {
                  width: "90%"
                }
              }), (0, n.jsx)("i", {
                className: "mk-line",
                style: {
                  width: "70%"
                }
              })]
            })]
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-sem-verdict level-".concat(i.tag),
          children: [(0, n.jsxs)("div", {
            className: "wf-sem-verdict-head",
            children: [(0, n.jsx)("span", {
              className: "wf-sem-tag",
              children: i.tag.toUpperCase()
            }), (0, n.jsx)("strong", {
              children: c(e, i.text, i.text_en)
            })]
          }), (0, n.jsx)("p", {
            children: "en" === e ? i.role_en : i.role
          }), (0, n.jsxs)("ul", {
            children: [(0, n.jsx)("li", {
              children: c(e, "大纲按标签读，不按字号读", "The outline is read by tags, not by font size")
            }), (0, n.jsx)("li", {
              children: c(e, "标题级别表达内容从属；不必要的跳级会让大纲更难读", "Heading levels show nesting; unnecessary skips can make the outline harder to follow")
            })]
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "字号最大不等于层级最高：标题标签表达结构，视觉大小只是样式。", "Biggest font size does not mean highest level: heading tags express structure, visual size is only styling.")
      })]
    });
  },
  "stack-trace": function () {
    let e = r(),
      s = [{
        label: "at loadRows (save.js:24:21)",
        label_en: "at loadRows (save.js:24:21)",
        own: !0,
        codeLine: 24,
        note: c(e, "这是你自己的文件：items 是 undefined，第 24 行对它调用了 .map。先在这里找原因。", "This is your own file: items is undefined and line 24 calls .map on it. Start here."),
        note_en: "This is your own file: items is undefined and line 24 calls .map on it. Start here."
      }, {
        label: "at handleSave (save.js:5:20)",
        label_en: "at handleSave (save.js:5:20)",
        own: !0,
        codeLine: 5,
        note: c(e, "这是抛错帧的调用者：第 5 行把 request.file 交给 loadRows。继续检查这个输入是否存在，不要只凭栈推断它一定是 undefined。", "This is the caller of the throwing frame: line 5 passes request.file to loadRows. Check whether that input exists; the trace alone does not prove it is undefined."),
        note_en: "This is the caller of the throwing frame: line 5 passes request.file to loadRows. Check whether that input exists; the trace alone does not prove it is undefined."
      }, {
        label: "at processTicksAndRejections (node:internal/…)",
        label_en: "at processTicksAndRejections (node:internal/…)",
        own: !1,
        codeLine: 0,
        note: c(e, "Node 自己的内部调用，不是你的文件。整段报错可以一起发给 AI，但排查的起点是自己文件里的帧。", "Node's own internals, not your file. You can send the whole trace to AI, but the investigation starts at your own file's frame."),
        note_en: "Node's own internals, not your file. You can send the whole trace to AI, but the investigation starts at your own file's frame."
      }],
      [a, i] = (0, t.useState)(0),
      o = s[a];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "点击调用栈的每一帧，看它对应哪一行代码", "Click each stack frame to see which code line it points to"),
      className: "wf-stage wf-stack-stage",
      children: [(0, n.jsxs)("div", {
        className: "wf-stack-window",
        children: [(0, n.jsxs)("div", {
          className: "wf-stack-terminal",
          children: [(0, n.jsxs)("div", {
            className: "wf-stack-terminal-head",
            children: [(0, n.jsx)("i", {}), (0, n.jsx)("i", {}), (0, n.jsx)("i", {}), (0, n.jsx)("b", {
              children: "Terminal"
            })]
          }), (0, n.jsxs)("pre", {
            children: [c(e, "$ node save.js", "$ node save.js"), "\n", c(e, "save.js:24\n  return items.map((row) => row);\n                 ^", "save.js:24\n  return items.map((row) => row);\n                 ^"), "\n", c(e, "TypeError: Cannot read properties of undefined (reading 'map')", "TypeError: Cannot read properties of undefined (reading 'map')")]
          }), (0, n.jsx)("div", {
            className: "wf-stack-frames",
            role: "group",
            "aria-label": c(e, "调用栈", "Call stack"),
            children: s.map((s, t) => (0, n.jsxs)("button", {
              type: "button",
              className: "wf-stack-frame".concat(t === a ? " on" : "").concat(s.own ? "" : " external"),
              "aria-pressed": t === a,
              onClick: () => i(t),
              children: [(0, n.jsx)("span", {
                className: "wf-stack-frame-kind",
                children: s.own ? c(e, "你的文件", "Your file") : c(e, "运行环境", "Runtime")
              }), (0, n.jsx)("code", {
                children: s.label
              })]
            }, s.label))
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-stack-editor",
          children: [(0, n.jsxs)("div", {
            className: "wf-stack-editor-head",
            children: [(0, n.jsx)("b", {
              children: "save.js"
            }), (0, n.jsx)("span", {
              children: o.own ? c(e, "第 ".concat(o.codeLine, " 行"), "Line ".concat(o.codeLine)) : c(e, "不属于你的文件", "Not your file")
            })]
          }), (0, n.jsx)("div", {
            className: "wf-stack-code",
            children: d.map(e => (0, n.jsxs)("div", {
              className: "wf-stack-code-line".concat(o.own && e.n === o.codeLine ? " on" : ""),
              children: [(0, n.jsx)("i", {
                children: e.n
              }), (0, n.jsx)("code", {
                children: e.text
              })]
            }, e.n))
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stack-verdict",
        children: o.note
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "堆栈通常先列离抛错点最近的函数，再列调用者；先从顶部附近找自己文件的帧。帧给出位置线索，不单独证明根因。", "A stack trace usually lists the frame nearest the throw first, followed by its callers. Start near the top and find a frame in your own file; frames locate clues but do not prove the root cause.")
      })]
    });
  },
  "node-js": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = "en" === e ? 'const fs = require("fs");\nconst files = fs.readdirSync("./data");\nconsole.log(`Read ${files.length} files`);' : 'const fs = require("fs");\nconst files = fs.readdirSync("./data");\nconsole.log(`读取 ${files.length} 个文件`);',
      d = [c(e, "浏览器打开 .js 文件", "Open the .js file in a browser"), c(e, "终端里 node 运行", "Run with node in a terminal"), c(e, "检查本机版本", "Check the local version")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "同一个 .js 文件在浏览器和 Node.js 里的不同结果", "The same .js file behaving differently in a browser and Node.js"),
      className: "wf-stage wf-node-stage",
      children: [(0, n.jsx)(l.tk, {
        items: d,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-node-window",
        children: [(0, n.jsxs)("div", {
          className: "wf-node-file",
          children: [(0, n.jsx)("div", {
            className: "wf-node-file-head",
            children: (0, n.jsx)("b", {
              children: "script.js"
            })
          }), (0, n.jsx)("pre", {
            children: i
          })]
        }), (0, n.jsx)("span", {
          className: "wf-node-arrow",
          "aria-hidden": "true",
          children: "→"
        }), 0 === s ? (0, n.jsxs)("div", {
          className: "wf-node-browser",
          children: [(0, n.jsxs)("div", {
            className: "wf-node-url",
            children: [(0, n.jsx)("i", {}), (0, n.jsx)("span", {
              children: "file:///Users/you/project/script.js"
            })]
          }), (0, n.jsx)("pre", {
            children: i
          }), (0, n.jsx)("small", {
            children: c(e, "浏览器只把文件当作文本显示，不会执行它", "The browser just shows the file as text; it does not run it")
          })]
        }) : (0, n.jsxs)("div", {
          className: "wf-node-terminal",
          children: [(0, n.jsxs)("div", {
            className: "wf-node-terminal-head",
            children: [(0, n.jsx)("i", {}), (0, n.jsx)("i", {}), (0, n.jsx)("i", {}), (0, n.jsx)("b", {
              children: "Terminal"
            })]
          }), (0, n.jsx)("pre", {
            children: 1 === s ? c(e, "$ node script.js\n读取 3 个文件", "$ node script.js\nRead 3 files") : c(e, "$ node -v\nv20.11.0\n项目要求：requires Node 18+ ✓", "$ node -v\nv20.11.0\nProject requires Node 18+ ✓")
          }), (0, n.jsx)("small", {
            children: 1 === s ? c(e, "假设 ./data 目录有 3 个文件；脚本读取目录并输出数量", "Assume ./data contains 3 files; the script reads the directory and prints the count") : c(e, "版本满足项目要求；过低时先升级 Node.js", "The version meets the requirement; upgrade Node.js when it is too low")
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "JavaScript 有两个常见运行地点：浏览器里的页面，和终端里的 Node.js。npm 运行在 Node.js 上，许多项目构建命令也会用它；是否需要要看工具链。", "JavaScript commonly runs in browser pages or in Node.js in a terminal. npm runs on Node.js, and many project build commands use it; requirements depend on the toolchain.")
      })]
    });
  },
  dependency: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "刚克隆完", "Just cloned"), c(e, "安装依赖", "Install dependencies"), c(e, "启动项目", "Start the project")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "依赖在安装这一步才进入项目", "Dependencies enter the project at the install step"),
      className: "wf-stage wf-dep-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-dep-window",
        children: [(0, n.jsxs)("div", {
          className: "wf-dep-tree step-".concat(s),
          children: [(0, n.jsxs)("div", {
            className: "wf-dep-tree-head",
            children: [(0, n.jsx)("b", {
              children: "my-first-page/"
            }), (0, n.jsx)("span", {
              children: 0 === s ? c(e, "还没有 node_modules", "No node_modules yet") : 1 === s ? c(e, "正在下载依赖", "Downloading dependencies") : c(e, "依赖已就绪", "Dependencies ready")
            })]
          }), (0, n.jsx)("div", {
            className: "wf-dep-tree-body",
            children: o.map(a => (0, n.jsxs)("div", {
              className: "wf-dep-tree-row ".concat(a.kind).concat("dep" === a.kind && s >= 1 ? " on" : ""),
              children: [(0, n.jsx)("i", {
                "aria-hidden": "true"
              }), (0, n.jsx)("code", {
                children: a.name
              }), "dep" === a.kind ? (0, n.jsx)("small", {
                children: s >= 1 ? c(e, "清单中声明的依赖已安装", "Declared dependencies installed") : c(e, "不存在", "Does not exist")
              }) : "file" === a.kind ? (0, n.jsx)("small", {
                children: c(e, "记录需要哪些依赖", "Records which packages are needed")
              }) : null]
            }, a.name))
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-dep-terminal",
          children: [(0, n.jsxs)("div", {
            className: "wf-dep-terminal-head",
            children: [(0, n.jsx)("i", {}), (0, n.jsx)("i", {}), (0, n.jsx)("i", {}), (0, n.jsx)("b", {
              children: "Terminal"
            })]
          }), (0, n.jsx)("pre", {
            children: 0 === s ? c(e, "$ npm start\nError: Cannot find module 'react'\n依赖还没安装", "$ npm start\nError: Cannot find module 'react'\nDependencies are not installed yet") : 1 === s ? c(e, "$ npm install\n✓ 安装命令完成（示例输出）", "$ npm install\n✓ Install command completed (example output)") : c(e, "$ npm start\n> my-first-page dev\nready on http://localhost:3000", "$ npm start\n> my-first-page dev\nready on http://localhost:3000")
          }), (0, n.jsx)("small", {
            children: 0 === s ? c(e, "清单在，依赖本体不在：先安装再启动", "The list is there but not the packages: install before starting") : 1 === s ? c(e, "安装把清单里的包下载进 node_modules", "Install downloads the listed packages into node_modules") : c(e, "依赖就绪后，启动命令才能找到这些模块", "With dependencies ready, the start command can find the modules")
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "模块找不到时先分清：没装依赖、版本不匹配、还是代码引用写错——三步的报错信息各不相同。", "For a missing module, separate three causes: never installed, version mismatch, or a wrong import path—each reports differently.")
      })]
    });
  },
  "semantic-versioning": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = h[s],
      d = "1.2.3",
      o = "patch" === i.key ? "1.2.4" : "minor" === i.key ? "1.3.0" : "2.0.0";
    return (0, n.jsxs)(l.xc, {
      label: c(e, "假设项目遵守 SemVer，各段变化表达不同兼容承诺", "Assuming the project follows SemVer, each segment signals a compatibility promise"),
      className: "wf-stage wf-semver-stage",
      children: [(0, n.jsx)(l.hV, {
        items: h.map(s => c(e, s.label_zh, s.label_en)),
        index: s,
        onSelect: a,
        label: c(e, "选择要变化的一段", "Choose a segment to change")
      }), (0, n.jsxs)("div", {
        className: "wf-semver-window",
        children: [(0, n.jsxs)("div", {
          className: "wf-semver-manifest",
          children: [(0, n.jsx)("div", {
            className: "wf-semver-manifest-head",
            children: (0, n.jsx)("b", {
              children: c(e, "版本示例", "Version example")
            })
          }), (0, n.jsx)("pre", {
            children: '{\n  "dependencies": {\n    "sample-lib": "'.concat(d, '"\n  }\n}')
          }), (0, n.jsx)("small", {
            children: c(e, "示例版本号只说明 SemVer 承诺；范围符号由包管理器规则另行解释。", "These example versions illustrate SemVer promises; range symbols are interpreted separately by the package manager.")
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-semver-change",
          children: [(0, n.jsxs)("div", {
            className: "wf-semver-nums",
            children: [(0, n.jsx)("span", {
              className: "before",
              children: d
            }), (0, n.jsx)("i", {
              "aria-hidden": "true",
              children: "→"
            }), (0, n.jsx)("span", {
              className: "after tone-".concat(i.tone),
              children: o
            })]
          }), (0, n.jsxs)("div", {
            className: "wf-semver-risk tone-".concat(i.tone),
            children: [(0, n.jsx)("strong", {
              children: c(e, i.compat_zh, i.compat_en)
            }), (0, n.jsx)("p", {
              children: c(e, i.meaning_zh, i.meaning_en)
            })]
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "这些是遵守 SemVer 的稳定公开 API 承诺；实际升级还要查具体项目的发布说明与验收结果。", "These are SemVer promises for stable public APIs; check the project's release notes and acceptance results before upgrading.")
      })]
    });
  },
  timeout: function () {
    let e = r(),
      s = [3, 10, 30],
      [a, i] = (0, t.useState)(0),
      d = s[a],
      o = d < 12,
      h = Math.min(100, d / 30 * 100);
    return (0, n.jsxs)(l.xc, {
      label: c(e, "等待上限决定页面是否等到响应", "The wait limit decides whether the page gets a response"),
      className: "wf-stage wf-timeout-stage",
      children: [(0, n.jsx)(l.tk, {
        items: s.map(s => c(e, "上限 ".concat(s, " 秒"), "Limit ".concat(s, "s"))),
        value: a,
        onChange: i,
        label: c(e, "切换等待上限", "Switch the wait limit")
      }), (0, n.jsxs)("div", {
        className: "wf-timeout-window",
        children: [(0, n.jsxs)("div", {
          className: "wf-timeout-page",
          children: [(0, n.jsx)("strong", {
            children: c(e, "保存备注", "Save note")
          }), (0, n.jsx)("div", {
            className: "wf-timeout-note",
            children: c(e, "周会时间改到周四下午。", "Move the weekly meeting to Thursday afternoon.")
          }), (0, n.jsx)("button", {
            type: "button",
            "aria-disabled": "true",
            tabIndex: -1,
            children: o ? c(e, "页面等待超时；保存结果待核对", "Page timed out; verify the save result") : c(e, "保存成功", "Saved")
          }), (0, n.jsx)("small", {
            children: o ? c(e, "请求已发出；服务器可能仍在处理", "The request was sent; the server may still be processing") : c(e, "12 秒收到响应，页面已读到保存结果", "Response arrived at 12s; the page received the save result")
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-timeout-timeline",
          children: [(0, n.jsxs)("div", {
            className: "wf-timeout-timeline-head",
            children: [(0, n.jsx)("span", {
              children: c(e, "这次请求的时间线", "Timeline for this request")
            }), (0, n.jsx)("span", {
              children: c(e, "响应在 12 秒到达", "The response arrives at 12s")
            })]
          }), (0, n.jsxs)("div", {
            className: "wf-timeout-track",
            children: [(0, n.jsx)("i", {
              className: "fill",
              style: {
                width: "".concat(o ? h : 40, "%")
              }
            }), (0, n.jsx)("span", {
              className: "limit".concat(o ? " on" : "").concat(0 === a ? " at-start" : "").concat(a === s.length - 1 ? " at-end" : ""),
              style: {
                left: "".concat(h, "%")
              },
              children: c(e, "上限 ".concat(d, "s"), "Limit ".concat(d, "s"))
            }), (0, n.jsx)("span", {
              className: "response",
              style: {
                left: "".concat(40, "%")
              },
              children: c(e, "响应 12s", "Response 12s")
            })]
          }), (0, n.jsx)("p", {
            className: "wf-timeout-verdict".concat(o ? " fail" : " ok"),
            children: o ? c(e, "本例请求已抵达服务端；页面先报告超时，服务端仍可能继续处理并稍后写入。", "In this example the request reached the service; the page reports a timeout first, while the service may continue and write later.") : c(e, "上限晚于响应：页面等到结果，保存成功。上限足够时不会出现超时。", "The limit comes after the response: the page waits for the result and the save succeeds. A sufficient limit avoids timeouts.")
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "这个时间线假设请求已抵达服务端；其他超时也可能发生在连接或发送阶段。先确认超时发生在哪一步，再定上限。", "This timeline assumes the request reached the service; other timeouts may happen during connection or sending. Identify the timed-out stage before choosing a limit.")
      })]
    });
  },
  css: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "基础规则", "Base rule"), c(e, "发生覆盖", "Overridden"), c(e, "修正规则", "Fix the rule")],
      d = 1 === s ? "gray" : "brand";
    return (0, n.jsxs)(l.xc, {
      label: c(e, "CSS 规则决定按钮的最终外观", "CSS rules deciding a button's final appearance"),
      className: "wf-stage wf-css-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-css-evidence",
        children: [(0, n.jsxs)(l.KE, {
          filename: "button.css",
          children: [(0, n.jsxs)(l.SH, {
            n: "1",
            active: 0 === s,
            error: 1 === s,
            children: [".primary ", "{ background: #4338ca; }"]
          }), (0, n.jsxs)(l.SH, {
            n: "2",
            active: 1 === s,
            children: [".toolbar button ", "{ background: #767676; }"]
          }), (0, n.jsxs)(l.SH, {
            n: "3",
            active: 2 === s,
            children: [".toolbar .primary ", "{ background: #4338ca; }"]
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-computed-style",
          children: [(0, n.jsx)("small", {
            children: "Computed"
          }), (0, n.jsxs)("code", {
            children: ["background: ", "brand" === d ? "#4338ca" : "#767676"]
          }), (0, n.jsx)("span", {
            children: 1 === s ? c(e, "第 1 条被覆盖", "Rule 1 is overridden") : c(e, "最终值来自主按钮规则", "Final value comes from the primary rule")
          })]
        }), (0, n.jsx)(l.Tb, {
          children: (0, n.jsxs)("div", {
            className: "wf-button-preview",
            children: [(0, n.jsx)("button", {
              className: d,
              type: "button",
              "aria-disabled": "true",
              tabIndex: -1,
              children: c(e, "保存修改", "Save changes")
            }), (0, n.jsx)("small", {
              children: c(e, "点击行为没有改变", "Click behavior is unchanged")
            })]
          })
        })]
      })]
    });
  },
  dom: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "初始文档", "Initial document"), c(e, "脚本插入节点", "Script inserts a node")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "HTML 被解析并在运行时更新为 DOM 树", "HTML parsed and updated as a runtime DOM tree"),
      className: "wf-stage wf-dom-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-dom-evidence",
        children: [(0, n.jsxs)(l.KE, {
          filename: "index.html",
          children: [(0, n.jsx)(l.SH, {
            n: "1",
            children: '<ul id="tasks">'
          }), (0, n.jsxs)(l.SH, {
            n: "2",
            children: ["　<li>", c(e, "写周报", "Write weekly report"), "</li>"]
          }), (0, n.jsx)(l.SH, {
            n: "3",
            children: "</ul>"
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-dom-tree",
          children: [(0, n.jsx)("small", {
            children: c(e, "运行时 DOM", "Runtime DOM")
          }), (0, n.jsx)("span", {
            children: "ul#tasks"
          }), (0, n.jsxs)("i", {
            children: ["└─ li “", c(e, "写周报", "Write weekly report"), "”"]
          }), 1 === s && (0, n.jsxs)("i", {
            className: "new",
            children: ["└─ li “", c(e, "整理发票", "Sort receipts"), "”"]
          })]
        }), (0, n.jsx)(l.Tb, {
          children: (0, n.jsxs)("div", {
            className: "wf-task-preview",
            children: [(0, n.jsx)("strong", {
              children: c(e, "任务", "Tasks")
            }), (0, n.jsxs)("span", {
              children: ["• ", c(e, "写周报", "Write weekly report")]
            }), 1 === s && (0, n.jsxs)("span", {
              className: "new",
              children: ["• ", c(e, "整理发票", "Sort receipts")]
            })]
          })
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "DOM 里新增节点会改变当前页面，但刷新后是否保留取决于有没有真正保存数据。", "Adding a DOM node changes the current page, but surviving refresh depends on real persistence.")
      })]
    });
  },
  "browser-devtools": function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = ["Elements", "Console", "Network", "Storage"];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "根据问题选择浏览器开发者工具面板", "Choosing a browser developer-tools panel by evidence type"),
      className: "wf-stage wf-devtools-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-devtools-window",
        children: [(0, n.jsxs)("div", {
          className: "wf-devtools-page",
          children: [(0, n.jsx)("strong", {
            children: c(e, "保存个人资料", "Save profile")
          }), (0, n.jsx)("input", {
            value: c(e, "小林", "Alex"),
            "aria-label": c(e, "姓名", "Name"),
            readOnly: !0
          }), (0, n.jsx)("button", {
            type: "button",
            "aria-disabled": "true",
            tabIndex: -1,
            children: c(e, "保存", "Save")
          }), (0, n.jsx)("small", {
            children: 2 === s ? c(e, "页面提示：保存失败", "Page message: Save failed") : c(e, "当前页面", "Current page")
          })]
        }), (0, n.jsxs)("div", {
          className: "wf-devtools-panel panel-".concat(s),
          children: [(0, n.jsx)("div", {
            children: i.map((e, a) => (0, n.jsx)("span", {
              className: a === s ? "on" : "",
              children: e
            }, e))
          }), 0 === s && (0, n.jsx)("pre", {
            children: '<button class="primary">'.concat(c(e, "保存", "Save"), "</button>\n.primary { background: #4338ca; }")
          }), 1 === s && (0, n.jsx)("pre", {
            children: "TypeError: profile is undefined\n    at saveProfile (profile.js:24)"
          }), 2 === s && (0, n.jsx)("pre", {
            children: 'POST /api/profile　400\nResponse: { "error": "name is required" }'
          }), 3 === s && (0, n.jsx)("pre", {
            children: "Cookies\n  session　••••••　HttpOnly\nLocal Storage\n  theme　dark"
          })]
        })]
      }), (0, n.jsx)("p", {
        className: "wf-stage-note",
        children: c(e, "工具只提供证据：结构和样式看 Elements，脚本错误看 Console，请求结果看 Network，浏览器数据看 Storage。", "The tools expose evidence: Elements for structure and styles, Console for script errors, Network for requests, and Storage for browser data.")
      })]
    });
  },
  cookie: function () {
    let e = r(),
      [s, a] = (0, t.useState)(0),
      i = [c(e, "服务器设置", "Server sets it"), c(e, "浏览器保存", "Browser stores it"), c(e, "后续请求携带", "Next request sends it")];
    return (0, n.jsxs)(l.xc, {
      label: c(e, "Cookie 在响应、浏览器和后续请求之间往返", "A cookie moving from response to browser to the next request"),
      className: "wf-stage wf-cookie-stage",
      children: [(0, n.jsx)(l.tk, {
        items: i,
        value: s,
        onChange: a
      }), (0, n.jsxs)("div", {
        className: "wf-cookie-flow step-".concat(s),
        children: [(0, n.jsxs)("div", {
          className: 0 === s ? "on" : "",
          children: [(0, n.jsx)("small", {
            children: c(e, "登录响应", "Login response")
          }), (0, n.jsxs)("code", {
            children: ["Set-Cookie: session=•••;", (0, n.jsx)("br", {}), "HttpOnly; Secure"]
          })]
        }), (0, n.jsx)("span", {
          children: "→"
        }), (0, n.jsxs)("div", {
          className: 1 === s ? "on" : "",
          children: [(0, n.jsx)("small", {
            children: c(e, "浏览器 Cookie 记录", "Browser cookie record")
          }), (0, n.jsx)("strong", {
            children: "example.com"
          }), (0, n.jsx)("code", {
            children: "session　HttpOnly ✓"
          })]
        }), (0, n.jsx)("span", {
          children: "→"
        }), (0, n.jsxs)("div", {
          className: 2 === s ? "on" : "",
          children: [(0, n.jsx)("small", {
            children: c(e, "下一次请求", "Next request")
          }), (0, n.jsxs)("code", {
            children: ["GET /profile", (0, n.jsx)("br", {}), "Cookie: session=•••"]
          })]
        })]
      }), (0, n.jsxs)("div", {
        className: "wf-cookie-result",
        children: [(0, n.jsx)("strong", {
          children: 2 === s ? c(e, "服务器识别会话并返回当前用户", "The server recognizes the session and returns the current user") : c(e, "Cookie 还没有完成一轮往返", "The cookie has not completed a round trip yet")
        }), (0, n.jsx)("small", {
          children: c(e, "Cookie 不是数据库，也不替代后端权限判断。", "A cookie is not a database and does not replace server-side authorization.")
        })]
      })]
    });
  }
};
function p(e) {
  let {
      kind: s
    } = e,
    a = j[s];
  return a ? (0, n.jsx)(a, {}) : null;
}
export {};
export default p;
