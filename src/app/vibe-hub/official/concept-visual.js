// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import * as t from "react/jsx-runtime";
import * as a from "react";
import * as eh from "./visual-kinds.js";
import * as ex from "./visual-state.js";
import * as eu from "./visual-shell.js";
import * as ep from "./visual-language.js";
let i = {
  component: {
    label: ["组件复用与同步修改图解", "Component reuse and synchronized change"],
    tabs: [["发现重复", "Spot repetition"], ["抽成组件", "Create component"], ["改一处同步", "Update once"]]
  },
  state: {
    label: ["表单状态变化图解", "Form state changes"],
    tabs: [["默认", "Idle"], ["保存中", "Saving"], ["成功", "Success"], ["失败", "Error"]]
  },
  port: {
    label: ["端口把请求送到不同服务的图解", "Ports route requests to different services"],
    tabs: [["网页 :3000", "Web :3000"], ["API :8080", "API :8080"], ["数据库 :5432", "Database :5432"]]
  },
  "box-model": {
    label: ["盒模型实际尺寸图解", "Actual box-model sizing"],
    tabs: [["content-box", "content-box"], ["border-box", "border-box"]]
  },
  overflow: {
    label: ["同一张限高内容卡的纵向溢出处理图解", "Vertical overflow modes on the same fixed-height content card"],
    tabs: [["visible", "visible"], ["hidden", "hidden"], ["auto", "auto"]]
  },
  cors: {
    label: ["浏览器读取跨源响应的检查图解", "Browser cross-origin response check"],
    tabs: [["请求到达 API", "Request reaches API"], ["响应头缺失", "Header missing"], ["来源被允许", "Origin allowed"]]
  },
  "browser-storage": {
    label: ["浏览器草稿与跨设备数据范围图解", "Local draft and cross-device data scope"],
    tabs: [["存到本机", "Save locally"], ["换到手机", "Open on phone"], ["提交到服务器", "Submit to server"]]
  },
  seo: {
    label: ["页面从可发现到可能展示的图解", "From discoverable page to possible search result"],
    tabs: [["页面可发现", "Discoverable"], ["可能被收录", "May be indexed"], ["匹配时展示", "Shown when relevant"]]
  },
  redirect: {
    label: ["浏览器跟随重定向的图解", "Browser follows a redirect"],
    tabs: [["请求旧地址", "Request old URL"], ["收到 301", "Receive 301"], ["打开新地址", "Open new URL"]]
  },
  "ai-hallucination": {
    label: ["AI 说法核验工作台", "AI claim verification workspace"],
    tabs: [["看见说法", "Spot the claim"], ["核对来源", "Check sources"], ["改正攻略", "Fix the guide"]]
  },
  "chat-ui": {
    label: ["聊天界面的消息与请求状态图解", "Messages and request states in a chat UI"],
    tabs: [["准备发送", "Ready"], ["正在生成", "Generating"], ["回答完成", "Complete"], ["发送失败", "Failed"]]
  },
  "responsive-design": {
    label: ["同一页面在不同宽度下重排图解", "One page reflowing across widths"],
    tabs: [["桌面 1440", "Desktop 1440"], ["平板 768", "Tablet 768"], ["手机 390", "Phone 390"]]
  },
  search: {
    label: ["项目列表搜索图解", "Project list search"],
    tabs: [["全部项目", "All projects"], ["输入“退款”", "Type “refund”"], ["显示匹配", "Show matches"]]
  },
  filter: {
    label: ["任务表筛选图解", "Task table filtering"],
    tabs: [["全部任务", "All tasks"], ["只看待处理", "Pending only"], ["再加本周", "Add this week"]]
  },
  chart: {
    label: ["同一组订单数据从表格变成图表的图解", "The same order data as a table and chart"],
    tabs: [["原始数据", "Raw data"], ["编码成柱形", "Encode as bars"], ["读出差异", "Read differences"]]
  },
  "dark-mode": {
    label: ["同一设置页的主题状态图解", "Theme states on the same settings page"],
    tabs: [["跟随系统", "Follow system"], ["浅色", "Light"], ["深色", "Dark"]]
  },
  "design-token": {
    label: ["一个颜色令牌同步更新多个组件的图解", "One color token updating several components"],
    tabs: [["共同引用", "Shared source"], ["修改令牌", "Edit token"], ["组件同步", "Components update"]]
  }
};
function r(e, s) {
  var n;
  return "string" == typeof e ? e : null != (n = e[+("en" === s)]) ? n : "";
}
function l(e) {
  let {
      kind: s,
      data: n,
      locale: a,
      index: i,
      setIndex: l,
      children: c
    } = e,
    o = r(n.label, a);
  return (0, t.jsxs)("div", {
    className: "interactive-demo concept-stage foundation-stage visual-".concat(s),
    tabIndex: 0,
    "aria-label": "".concat(o).concat("en" === a ? ". Use left and right arrow keys to change state." : "，可用左右方向键切换状态。"),
    onKeyDown: e => {
      if ("ArrowLeft" === e.key || "ArrowRight" === e.key) {
        let s;
        e.preventDefault(), e.stopPropagation(), s = "ArrowLeft" === e.key ? -1 : 1, l(Math.max(0, Math.min(n.tabs.length - 1, i + s)));
      }
    },
    children: [(0, t.jsx)("div", {
      className: "scene-controls",
      role: "group",
      "aria-label": "en" === a ? "Change visual state" : "切换图解状态",
      children: n.tabs.map((e, s) => (0, t.jsx)("button", {
        type: "button",
        className: i === s ? "on" : "",
        "aria-pressed": i === s,
        onClick: () => l(s),
        children: r(e, a)
      }, r(e, a)))
    }), (0, t.jsx)("div", {
      className: "foundation-evidence",
      children: c
    })]
  });
}
function c(e) {
  let {
    locale: s,
    changed: n = !1
  } = e;
  return (0, t.jsxs)("article", {
    className: "product-card-instance",
    children: [(0, t.jsx)("div", {
      className: "product-photo",
      children: (0, t.jsx)("span", {
        children: "WAVE"
      })
    }), (0, t.jsx)("small", {
      children: "en" === s ? "Noise-cancelling headphones" : "降噪耳机"
    }), (0, t.jsx)("strong", {
      children: "\xa5 899"
    }), (0, t.jsx)("button", {
      type: "button",
      children: n ? "en" === s ? "Add to list" : "加入清单" : "en" === s ? "Save" : "收藏"
    })]
  });
}
function o(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = n > 0,
    i = 2 === n,
    r = i ? "en" === s ? "Add to list" : "加入清单" : "en" === s ? "Save" : "收藏";
  return (0, t.jsxs)("div", {
    className: "component-workbench state-".concat(n),
    children: [a && (0, t.jsxs)("div", {
      className: "component-source",
      "aria-label": "en" === s ? "Shared ProductCard component" : "共享 ProductCard 组件",
      children: [(0, t.jsx)("span", {
        children: "ProductCard"
      }), (0, t.jsx)("code", {
        children: 'action="'.concat(r, '"')
      })]
    }), (0, t.jsxs)("div", {
      className: "component-pages",
      children: [(0, t.jsxs)("section", {
        children: [(0, t.jsxs)("header", {
          children: [(0, t.jsx)("strong", {
            children: "en" === s ? "Home" : "首页"
          }), (0, t.jsx)("span", {
            children: a ? "<ProductCard />" : "en" === s ? "Copied markup" : "复制的结构"
          })]
        }), (0, t.jsx)(c, {
          locale: s,
          changed: i
        })]
      }), (0, t.jsxs)("section", {
        children: [(0, t.jsxs)("header", {
          children: [(0, t.jsx)("strong", {
            children: "en" === s ? "Search results" : "搜索结果"
          }), (0, t.jsx)("span", {
            children: a ? "<ProductCard />" : "en" === s ? "Copied markup" : "复制的结构"
          })]
        }), (0, t.jsx)(c, {
          locale: s,
          changed: i
        })]
      })]
    }), (0, t.jsx)("p", {
      className: "visual-outcome",
      children: 0 === n ? "en" === s ? "The same card is maintained twice." : "同一种卡片正在被维护两次。" : 1 === n ? "en" === s ? "Both pages now render the same component." : "两个页面现在都使用同一个组件。" : "en" === s ? "One component change reached both pages." : "组件改一次，两个页面一起更新。"
    })]
  });
}
function d(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = [{
      status: ["尚未提交", "Not submitted"],
      button: ["保存昵称", "Save nickname"],
      tone: "idle"
    }, {
      status: ["请求发送中…", "Request in progress…"],
      button: ["保存中…", "Saving…"],
      tone: "pending"
    }, {
      status: ["已保存到服务器", "Saved on the server"],
      button: ["已保存", "Saved"],
      tone: "success"
    }, {
      status: ["网络中断，内容仍保留", "Network failed; input kept"],
      button: ["重新保存", "Try again"],
      tone: "error"
    }][n];
  return (0, t.jsxs)("div", {
    className: "state-form-crop ".concat(a.tone),
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("strong", {
        children: "en" === s ? "Profile" : "个人资料"
      }), (0, t.jsx)("span", {
        children: r(a.status, s)
      })]
    }), (0, t.jsx)("label", {
      htmlFor: "state-nickname",
      children: "en" === s ? "Nickname" : "昵称"
    }), (0, t.jsxs)("div", {
      className: "state-form-row",
      children: [(0, t.jsx)("input", {
        id: "state-nickname",
        value: "en" === s ? "Lin" : "小林",
        readOnly: !0
      }), (0, t.jsx)("button", {
        type: "button",
        disabled: 1 === n,
        children: r(a.button, s)
      })]
    }), (0, t.jsxs)("div", {
      className: "state-request-line",
      children: [(0, t.jsx)("i", {
        "aria-hidden": "true"
      }), (0, t.jsx)("span", {
        children: 0 === n ? "en" === s ? "Saving starts after the click" : "点击后开始保存" : r(a.status, s)
      })]
    })]
  });
}
function h(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = [{
      port: "3000",
      name: ["网页开发服务", "Web dev server"],
      detail: ["返回页面", "Returns the page"]
    }, {
      port: "8080",
      name: ["本地 API", "Local API"],
      detail: ["处理 /api 请求", "Handles /api requests"]
    }, {
      port: "5432",
      name: ["PostgreSQL", "PostgreSQL"],
      detail: ["只接收应用连接", "Accepts app connections"]
    }],
    i = a[n];
  return (0, t.jsxs)("div", {
    className: "port-machine",
    children: [(0, t.jsxs)("div", {
      className: "port-address",
      children: [(0, t.jsx)("span", {
        "aria-hidden": "true",
        children: "● ● ●"
      }), (0, t.jsxs)("code", {
        children: ["localhost:", i.port, 1 === n ? "/api/projects" : ""]
      })]
    }), (0, t.jsxs)("div", {
      className: "port-host",
      children: [(0, t.jsxs)("aside", {
        children: [(0, t.jsx)("strong", {
          children: "en" === s ? "This computer" : "当前电脑"
        }), (0, t.jsx)("code", {
          children: "localhost"
        })]
      }), (0, t.jsx)("div", {
        className: "port-socket-rail",
        "aria-hidden": "true",
        children: (0, t.jsx)("i", {})
      }), (0, t.jsx)("div", {
        className: "port-processes",
        children: a.map((e, a) => (0, t.jsxs)("div", {
          className: a === n ? "active" : "",
          children: [(0, t.jsxs)("code", {
            children: [":", e.port]
          }), (0, t.jsx)("strong", {
            children: r(e.name, s)
          }), (0, t.jsx)("span", {
            children: r(e.detail, s)
          })]
        }, e.port))
      })]
    }), (0, t.jsx)("p", {
      className: "visual-outcome",
      children: "en" === s ? "Port ".concat(i.port, " selects ").concat(r(i.name, s), ".") : "端口 ".concat(i.port, " 把请求送到「").concat(r(i.name, s), "」。")
    })]
  });
}
function x(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = 1 === n;
  return (0, t.jsxs)("div", {
    className: "box-measure-workbench ".concat(a ? "border-box-mode" : "content-box-mode"),
    children: [(0, t.jsxs)("div", {
      className: "box-css-line",
      children: [(0, t.jsxs)("code", {
        children: ["box-sizing: ", a ? "border-box" : "content-box", ";"]
      }), (0, t.jsx)("code", {
        children: "width: 320px;"
      })]
    }), (0, t.jsxs)("div", {
      className: "box-ruler",
      children: [(0, t.jsx)("span", {
        children: "0"
      }), (0, t.jsx)("i", {}), (0, t.jsx)("strong", {
        children: a ? "320px" : "370px"
      })]
    }), (0, t.jsx)("div", {
      className: "box-measured-card",
      children: (0, t.jsx)("div", {
        className: "measure-margin",
        children: (0, t.jsx)("div", {
          className: "measure-border",
          children: (0, t.jsx)("div", {
            className: "measure-padding",
            children: (0, t.jsx)("div", {
              className: "measure-content",
              children: a ? "en" === s ? "Content 270" : "内容 270" : "en" === s ? "Content 320" : "内容 320"
            })
          })
        })
      })
    }), (0, t.jsx)("div", {
      className: "box-equation",
      children: a ? (0, t.jsxs)(t.Fragment, {
        children: [(0, t.jsx)("strong", {
          children: "320px"
        }), (0, t.jsx)("span", {
          children: "en" === s ? "already includes padding and border" : "已经包含 padding 和 border"
        })]
      }) : (0, t.jsxs)(t.Fragment, {
        children: [(0, t.jsx)("span", {
          children: "320 + 24\xd72 + 1\xd72"
        }), (0, t.jsx)("strong", {
          children: "= 370px"
        })]
      })
    })]
  });
}
function u(e) {
  var s;
  let {
      locale: n,
      index: i
    } = e,
    r = null != (s = ["visible", "hidden", "auto"][i]) ? s : "visible",
    l = (0, a.useRef)(null);
  return (0, a.useEffect)(() => {
    l.current && (l.current.scrollTop = "auto" === r ? l.current.scrollHeight : 0);
  }, [r]), (0, t.jsxs)("div", {
    className: "overflow-card-demo mode-".concat(r),
    children: [(0, t.jsxs)("div", {
      className: "overflow-card-window",
      children: [(0, t.jsxs)("header", {
        children: [(0, t.jsx)("strong", {
          children: "en" === n ? "Video result" : "视频生成结果"
        }), (0, t.jsxs)("code", {
          children: ["height: 250px \xb7 overflow-y: ", r]
        })]
      }), (0, t.jsx)("div", {
        className: "overflow-card-scroll-area",
        ref: l,
        children: (0, t.jsxs)("div", {
          className: "overflow-card-content",
          children: [(0, t.jsx)("small", {
            children: "en" === n ? "READY TO EXPORT" : "可以导出"
          }), (0, t.jsx)("h3", {
            children: "en" === n ? "Weekend travel video" : "周末旅行短片"
          }), (0, t.jsxs)("div", {
            children: [(0, t.jsx)("span", {
              children: "✓"
            }), (0, t.jsxs)("p", {
              children: [(0, t.jsx)("strong", {
                children: "en" === n ? "Captions generated" : "字幕已经生成"
              }), (0, t.jsx)("small", {
                children: "en" === n ? "32 lines matched to speech" : "32 句字幕已匹配语音"
              })]
            })]
          }), (0, t.jsxs)("div", {
            children: [(0, t.jsx)("span", {
              children: "✓"
            }), (0, t.jsxs)("p", {
              children: [(0, t.jsx)("strong", {
                children: "en" === n ? "Cover selected" : "封面已经选好"
              }), (0, t.jsx)("small", {
                children: "en" === n ? "Title remains readable" : "标题在封面上清楚可读"
              })]
            })]
          }), (0, t.jsxs)("div", {
            children: [(0, t.jsx)("span", {
              children: "✓"
            }), (0, t.jsxs)("p", {
              children: [(0, t.jsx)("strong", {
                children: "en" === n ? "Export quality" : "导出画质"
              }), (0, t.jsx)("small", {
                children: "1080p \xb7 MP4"
              })]
            })]
          }), (0, t.jsx)("button", {
            type: "button",
            children: "en" === n ? "Download video" : "下载完整视频"
          })]
        })
      }), (0, t.jsx)("span", {
        className: "overflow-card-boundary",
        children: "en" === n ? "Card bottom" : "卡片底边"
      })]
    }), (0, t.jsx)("p", {
      className: "visual-outcome",
      children: "visible" === r ? "en" === n ? "The download button spills past the card bottom." : "下载按钮越过了卡片底边。" : "hidden" === r ? "en" === n ? "The card clips the bottom content, so the action disappears." : "卡片裁掉了底部内容，操作按钮也消失了。" : "en" === n ? "The same bounded card can scroll to the full action." : "同一张限高卡片可以滚动到底部操作。"
    })]
  });
}
function p(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = 1 === n,
    i = 2 === n;
  return (0, t.jsxs)("div", {
    className: "cors-browser ".concat(a ? "blocked" : "").concat(i ? " allowed" : ""),
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("span", {
        "aria-hidden": "true",
        children: "● ● ●"
      }), (0, t.jsx)("code", {
        children: "http://localhost:3000"
      })]
    }), (0, t.jsxs)("div", {
      className: "cors-network-row",
      children: [(0, t.jsxs)("div", {
        children: [(0, t.jsx)("small", {
          children: "Origin"
        }), (0, t.jsx)("strong", {
          children: "localhost:3000"
        })]
      }), (0, t.jsx)("span", {
        "aria-hidden": "true",
        children: "→"
      }), (0, t.jsxs)("div", {
        children: [(0, t.jsx)("small", {
          children: "GET"
        }), (0, t.jsx)("strong", {
          children: "localhost:8080/api"
        })]
      }), (0, t.jsx)("b", {
        children: "en" === s ? "200 API reached" : "200 \xb7 API 已收到"
      })]
    }), (0, t.jsxs)("div", {
      className: "cors-response",
      children: [(0, t.jsxs)("section", {
        children: [(0, t.jsx)("strong", {
          children: "en" === s ? "Response headers" : "响应头"
        }), (0, t.jsx)("code", {
          children: "Content-Type: application/json"
        }), i ? (0, t.jsx)("code", {
          className: "cors-highlight",
          children: "Access-Control-Allow-Origin: http://localhost:3000"
        }) : (0, t.jsx)("code", {
          className: a ? "cors-missing" : "",
          children: a ? "Access-Control-Allow-Origin: —" : "Waiting for response headers…"
        })]
      }), (0, t.jsxs)("aside", {
        children: [(0, t.jsx)("small", {
          children: "en" === s ? "Browser script" : "浏览器脚本"
        }), (0, t.jsx)("strong", {
          children: i ? "en" === s ? "Response readable" : "可以读取响应" : a ? "en" === s ? "Blocked by CORS" : "被 CORS 拦截" : "en" === s ? "Waiting for check" : "等待浏览器检查"
        })]
      })]
    })]
  });
}
function m(e) {
  let {
    type: s,
    title: n,
    children: a,
    active: i = !1
  } = e;
  return (0, t.jsxs)("div", {
    className: "storage-device-frame ".concat(s).concat(i ? " active" : ""),
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("span", {
        children: "phone" === s ? "●" : "● ● ●"
      }), (0, t.jsx)("strong", {
        children: n
      })]
    }), (0, t.jsx)("div", {
      children: a
    })]
  });
}
function j(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = 2 === n;
  return (0, t.jsxs)("div", {
    className: "storage-scope-board state-".concat(n),
    children: [(0, t.jsxs)(m, {
      type: "laptop",
      title: "en" === s ? "Laptop A" : "电脑 A",
      active: 0 === n,
      children: [(0, t.jsx)("p", {
        children: "en" === s ? "Editing draft…" : "正在编辑草稿…"
      }), (0, t.jsxs)("code", {
        children: ["localStorage", (0, t.jsx)("br", {}), 'draft = "', "en" === s ? "weekend trip" : "周末行程", '"']
      })]
    }), (0, t.jsxs)("div", {
      className: "storage-server",
      children: [(0, t.jsx)("span", {
        children: a ? "↑" : "\xd7"
      }), (0, t.jsx)("strong", {
        children: "en" === s ? "Backend database" : "后端数据库"
      }), (0, t.jsx)("small", {
        children: a ? "en" === s ? "Submitted content saved" : "已保存提交内容" : "en" === s ? "No uploaded copy" : "没有上传副本"
      })]
    }), (0, t.jsxs)(m, {
      type: "phone",
      title: "en" === s ? "Phone B" : "手机 B",
      active: 1 === n || a,
      children: [(0, t.jsx)("p", {
        children: a ? "en" === s ? "Submitted content" : "已提交内容" : "en" === s ? "No draft here" : "这里没有草稿"
      }), (0, t.jsx)("code", {
        children: a ? "GET /api/projects/42" : "localStorage = empty"
      })]
    }), (0, t.jsx)("p", {
      className: "visual-outcome",
      children: 0 === n ? "en" === s ? "The draft exists inside Laptop A's browser." : "草稿只在电脑 A 的浏览器里。" : 1 === n ? "en" === s ? "Another device has different browser storage." : "换一台设备，浏览器存储也换了一份。" : "en" === s ? "The app uploaded submitted content; the phone reads it from the server." : "应用上传已提交内容后，手机才能从服务器读取。"
    })]
  });
}
function g(e) {
  let {
    locale: s,
    index: n
  } = e;
  return (0, t.jsxs)("div", {
    className: "seo-workbench state-".concat(n),
    children: [(0, t.jsxs)("article", {
      className: "seo-article",
      children: [(0, t.jsxs)("header", {
        children: [(0, t.jsx)("span", {
          children: "VibeHub Help"
        }), (0, t.jsx)("code", {
          children: "/help/refunds"
        })]
      }), (0, t.jsx)("h3", {
        children: "en" === s ? "How refunds work" : "退款流程怎么走"
      }), (0, t.jsx)("p", {
        children: "en" === s ? "Check eligibility, submit the request, and follow its status." : "先确认是否符合条件，再提交申请并查看处理进度。"
      }), (0, t.jsx)("a", {
        children: "en" === s ? "Linked from Help Center" : "帮助中心可以点进来"
      })]
    }), (0, t.jsxs)("div", {
      className: "seo-search-surface",
      children: [0 === n && (0, t.jsxs)(t.Fragment, {
        children: [(0, t.jsx)("strong", {
          children: "en" === s ? "Crawler can reach this URL" : "抓取程序可以到达这个 URL"
        }), (0, t.jsx)("code", {
          children: "200 \xb7 indexable page"
        }), (0, t.jsx)("span", {
          children: "en" === s ? "Discoverable ≠ indexed" : "可发现不等于已收录"
        })]
      }), 1 === n && (0, t.jsxs)(t.Fragment, {
        children: [(0, t.jsx)("strong", {
          children: "en" === s ? "Indexing: possible" : "收录状态：可能"
        }), (0, t.jsx)("div", {
          className: "seo-index-meter",
          children: (0, t.jsx)("i", {})
        }), (0, t.jsx)("span", {
          children: "en" === s ? "Search systems still decide whether to index it." : "是否进入索引，仍由搜索系统判断。"
        })]
      }), 2 === n && (0, t.jsxs)("div", {
        className: "seo-result",
        children: [(0, t.jsx)("small", {
          children: "en" === s ? "Search: refund status" : "搜索：退款进度"
        }), (0, t.jsx)("a", {
          children: "en" === s ? "How refunds work \xb7 VibeHub Help" : "退款流程怎么走 \xb7 VibeHub 帮助中心"
        }), (0, t.jsx)("code", {
          children: "vibehub.example/help/refunds"
        }), (0, t.jsx)("p", {
          children: "en" === s ? "Check eligibility, submit a refund request…" : "确认条件、提交退款申请并查看处理进度……"
        })]
      })]
    })]
  });
}
function v(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = 2 === n;
  return (0, t.jsxs)("div", {
    className: "redirect-browser state-".concat(n),
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("span", {
        "aria-hidden": "true",
        children: "● ● ●"
      }), (0, t.jsxs)("code", {
        children: ["example.com/", a ? "pricing" : "old-pricing"]
      })]
    }), (0, t.jsxs)("main", {
      children: [(0, t.jsx)("div", {
        className: "redirect-page",
        children: a ? (0, t.jsxs)(t.Fragment, {
          children: [(0, t.jsx)("small", {
            children: "en" === s ? "NEW PAGE" : "新页面"
          }), (0, t.jsx)("h3", {
            children: "en" === s ? "Plans and pricing" : "套餐与价格"
          })]
        }) : (0, t.jsxs)(t.Fragment, {
          children: [(0, t.jsx)("small", {
            children: "en" === s ? "REQUESTING" : "正在请求"
          }), (0, t.jsx)("h3", {
            children: "/old-pricing"
          })]
        })
      }), (0, t.jsxs)("div", {
        className: "redirect-network",
        children: [(0, t.jsxs)("div", {
          className: n >= 0 ? "active" : "",
          children: [(0, t.jsx)("span", {
            children: "GET"
          }), (0, t.jsx)("code", {
            children: "/old-pricing"
          }), (0, t.jsx)("strong", {
            children: 0 === n ? "pending" : "301"
          })]
        }), n >= 1 && (0, t.jsxs)("div", {
          className: "location-row",
          children: [(0, t.jsx)("span", {
            children: "Location"
          }), (0, t.jsx)("code", {
            children: "/pricing"
          }), (0, t.jsx)("strong", {
            children: "→"
          })]
        }), n >= 2 && (0, t.jsxs)("div", {
          className: "active success",
          children: [(0, t.jsx)("span", {
            children: "GET"
          }), (0, t.jsx)("code", {
            children: "/pricing"
          }), (0, t.jsx)("strong", {
            children: "200"
          })]
        })]
      })]
    })]
  });
}
function b(e) {
  let {
    locale: s,
    index: n
  } = e;
  return (0, t.jsxs)("div", {
    className: "verification-workbench state-".concat(n),
    children: [(0, t.jsxs)("div", {
      className: "claim-bar",
      children: [(0, t.jsx)("small", {
        children: "en" === s ? "Sample AI travel guide \xb7 unverified" : "示例 AI 旅行攻略 \xb7 尚未核验"
      }), (0, t.jsx)("p", {
        children: "en" === s ? "“The city museum is open until 10 PM on Mondays. Go at night to avoid crowds.”" : "“城市博物馆周一开放到 22:00，晚上去人少。”"
      }), (0, t.jsx)("span", {
        children: "en" === s ? "opening time needs checking" : "开放时间需要核实"
      })]
    }), 0 === n && (0, t.jsxs)("div", {
      className: "claim-focus",
      children: [(0, t.jsx)("span", {
        children: "en" === s ? "MON \xb7 8:00 PM" : "周一 \xb7 20:00"
      }), (0, t.jsx)("strong", {
        children: "en" === s ? "It is already in the itinerary, but no official hours were checked." : "行程已经排上了，但还没查官方开放时间。"
      })]
    }), 1 === n && (0, t.jsxs)("div", {
      className: "evidence-list",
      children: [(0, t.jsxs)("div", {
        children: [(0, t.jsx)("span", {
          children: "en" === s ? "Official website" : "官方网站"
        }), (0, t.jsx)("code", {
          children: "en" === s ? "Open Tue–Sun \xb7 9:00 AM–5:00 PM" : "周二至周日开放 \xb7 09:00–17:00"
        }), (0, t.jsx)("b", {
          children: "\xd7"
        })]
      }), (0, t.jsxs)("div", {
        children: [(0, t.jsx)("span", {
          children: "en" === s ? "Reservation page" : "预约页面"
        }), (0, t.jsx)("code", {
          children: "en" === s ? "Monday \xb7 unavailable" : "周一 \xb7 不可预约"
        }), (0, t.jsx)("b", {
          children: "\xd7"
        })]
      }), (0, t.jsxs)("div", {
        children: [(0, t.jsx)("span", {
          children: "en" === s ? "Daily sessions" : "当天场次"
        }), (0, t.jsx)("code", {
          children: "en" === s ? "Monday \xb7 no sessions" : "周一 \xb7 没有场次"
        }), (0, t.jsx)("b", {
          children: "\xd7"
        })]
      })]
    }), 2 === n && (0, t.jsxs)("div", {
      className: "verification-verdict",
      children: [(0, t.jsx)("span", {
        children: "en" === s ? "CHECKED ITINERARY" : "核验后的行程"
      }), (0, t.jsx)("del", {
        children: "en" === s ? "Mon \xb7 8:00 PM \xb7 Museum" : "周一 20:00 \xb7 博物馆"
      }), (0, t.jsx)("strong", {
        children: "en" === s ? "Closed on Monday. Remove the evening visit." : "周一闭馆，删掉晚间安排。"
      }), (0, t.jsx)("small", {
        children: "en" === s ? "Official website, reservations, and sessions agree" : "官网、预约页和当天场次一致"
      })]
    })]
  });
}
function f(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = 1 === n,
    i = 2 === n,
    r = 3 === n;
  return (0, t.jsxs)("div", {
    className: "chat-ui-window state-".concat(n),
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("span", {
        "aria-hidden": "true",
        children: "●"
      }), (0, t.jsx)("strong", {
        children: "en" === s ? "Project assistant" : "项目助手"
      }), (0, t.jsx)("small", {
        children: a ? "en" === s ? "Generating" : "正在生成" : "en" === s ? "Online" : "在线"
      })]
    }), (0, t.jsxs)("main", {
      children: [(0, t.jsx)("p", {
        className: "chat-user",
        children: "en" === s ? "Plan a two-day weekend trip, with no more than two places per day." : "帮我安排两天周末旅行，每天不要超过两个地方。"
      }), n > 0 && (0, t.jsx)("p", {
        className: "chat-assistant".concat(r ? " error" : ""),
        children: a ? "en" === s ? "Reading your saved places and building the itinerary…" : "正在读取你收藏的地点并安排行程…" : i ? "en" === s ? "Day 1: old town and night market. Day 2: beach and lighthouse." : "第一天逛古城和夜市，第二天去海边和灯塔。" : "en" === s ? "The network failed before the answer finished." : "网络中断，回答没有发送完成。"
      })]
    }), (0, t.jsxs)("div", {
      className: "chat-ui-composer",
      children: [(0, t.jsx)("span", {
        children: r ? "en" === s ? "Your message is still here" : "输入内容仍然保留" : "en" === s ? "Write a message…" : "输入消息…"
      }), (0, t.jsx)("button", {
        type: "button",
        children: r ? "en" === s ? "Retry" : "重试" : "↑"
      })]
    }), (0, t.jsx)("footer", {
      children: 0 === n ? "en" === s ? "Ready to send" : "可以发送" : a ? "en" === s ? "Stop generating" : "可以停止生成" : i ? "en" === s ? "Answer complete" : "回答完成" : "en" === s ? "Failed \xb7 retry available" : "发送失败 \xb7 可以重试"
    })]
  });
}
function k(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = [3, 2, 1][n];
  return (0, t.jsxs)("div", {
    className: "responsive-canvas columns-".concat(a),
    children: [(0, t.jsxs)("div", {
      className: "viewport-ruler",
      children: [(0, t.jsx)("i", {}), (0, t.jsxs)("strong", {
        children: [[1440, 768, 390][n], " px"]
      }), (0, t.jsx)("i", {})]
    }), (0, t.jsxs)("div", {
      className: "responsive-page",
      children: [(0, t.jsxs)("header", {
        children: [(0, t.jsx)("b", {
          children: "VibeHub"
        }), (0, t.jsx)("nav", {
          children: 2 === n ? "☰" : "en" === s ? "Learn  Search  About" : "学习　搜索　关于"
        })]
      }), (0, t.jsx)("div", {
        className: "responsive-content",
        children: [1, 2, 3].map(e => (0, t.jsxs)("article", {
          children: [(0, t.jsx)("i", {}), (0, t.jsx)("strong", {
            children: "en" === s ? "Course ".concat(e) : "课程 ".concat(e)
          }), (0, t.jsx)("span", {}), (0, t.jsx)("button", {
            type: "button",
            children: "en" === s ? "Open" : "查看"
          })]
        }, e))
      })]
    })]
  });
}
let N = [{
  title: ["退款政策", "Refund policy"],
  meta: ["帮助文档 \xb7 退款", "Help article \xb7 refund"],
  match: !0
}, {
  title: ["订单退款进度", "Order refund status"],
  meta: ["项目 \xb7 售后", "Project \xb7 support"],
  match: !0
}, {
  title: ["新用户引导", "New user onboarding"],
  meta: ["项目 \xb7 增长", "Project \xb7 growth"],
  match: !1
}, {
  title: ["发票下载", "Invoice download"],
  meta: ["帮助文档 \xb7 账单", "Help article \xb7 billing"],
  match: !1
}];
function y(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = n > 0,
    i = 2 === n ? N.filter(e => e.match) : N;
  return (0, t.jsxs)("div", {
    className: "search-workbench",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("strong", {
        children: "en" === s ? "Projects and help" : "项目与帮助"
      }), (0, t.jsx)("span", {
        children: 2 === n ? "2 ".concat("en" === s ? "matches" : "条匹配") : "4 ".concat("en" === s ? "items" : "条内容")
      })]
    }), (0, t.jsxs)("div", {
      className: "search-field",
      children: [(0, t.jsx)("span", {
        children: "⌕"
      }), (0, t.jsx)("strong", {
        children: a ? "en" === s ? "refund" : "退款" : "en" === s ? "Search by name or keyword" : "按名称或关键词搜索"
      }), a && (0, t.jsx)("button", {
        type: "button",
        children: "\xd7"
      })]
    }), (0, t.jsx)("div", {
      className: "search-results",
      children: i.map(e => (0, t.jsxs)("article", {
        className: a && e.match ? "match" : "",
        children: [(0, t.jsx)("i", {}), (0, t.jsxs)("div", {
          children: [(0, t.jsx)("strong", {
            children: r(e.title, s)
          }), (0, t.jsx)("span", {
            children: r(e.meta, s)
          })]
        }), a && e.match && (0, t.jsx)("mark", {
          children: "en" === s ? "refund" : "退款"
        })]
      }, e.title[0]))
    })]
  });
}
let w = [{
  task: ["修复登录错误", "Fix sign-in error"],
  status: ["待处理", "Pending"],
  owner: ["我", "Me"],
  due: ["本周", "This week"],
  pending: !0,
  thisWeek: !0
}, {
  task: ["更新帮助文档", "Update help article"],
  status: ["进行中", "In progress"],
  owner: ["小周", "Mia"],
  due: ["下周", "Next week"],
  pending: !1,
  thisWeek: !1
}, {
  task: ["检查手机布局", "Check mobile layout"],
  status: ["待处理", "Pending"],
  owner: ["我", "Me"],
  due: ["本周", "This week"],
  pending: !0,
  thisWeek: !0
}, {
  task: ["审核新封面", "Review new cover"],
  status: ["待处理", "Pending"],
  owner: ["我", "Me"],
  due: ["下周", "Next week"],
  pending: !0,
  thisWeek: !1
}, {
  task: ["整理旧截图", "Organize screenshots"],
  status: ["已完成", "Done"],
  owner: ["我", "Me"],
  due: ["昨天", "Yesterday"],
  pending: !1,
  thisWeek: !1
}];
function S(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = w.filter(e => 0 === n || e.pending && (1 === n || e.thisWeek));
  return (0, t.jsxs)("div", {
    className: "filter-table",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("strong", {
        children: "en" === s ? "Tasks" : "任务"
      }), (0, t.jsxs)("span", {
        children: [a.length, " ", "en" === s ? "shown" : "条显示中"]
      })]
    }), (0, t.jsxs)("div", {
      className: "filter-controls",
      children: [(0, t.jsx)("button", {
        type: "button",
        className: n >= 1 ? "on" : "",
        children: "en" === s ? "Status: pending" : "状态：待处理"
      }), (0, t.jsx)("button", {
        type: "button",
        className: n >= 2 ? "on" : "",
        children: "en" === s ? "Due: this week" : "期限：本周"
      })]
    }), (0, t.jsxs)("div", {
      className: "filter-head",
      children: [(0, t.jsx)("span", {
        children: "en" === s ? "Task" : "任务"
      }), (0, t.jsx)("span", {
        children: "en" === s ? "Status" : "状态"
      }), (0, t.jsx)("span", {
        children: "en" === s ? "Owner" : "负责人"
      }), (0, t.jsx)("span", {
        children: "en" === s ? "Due" : "期限"
      })]
    }), a.map(e => (0, t.jsxs)("div", {
      className: "filter-row",
      children: [(0, t.jsx)("strong", {
        children: r(e.task, s)
      }), (0, t.jsx)("span", {
        children: r(e.status, s)
      }), (0, t.jsx)("span", {
        children: r(e.owner, s)
      }), (0, t.jsx)("span", {
        children: r(e.due, s)
      })]
    }, e.task[0]))]
  });
}
let A = [["1月", "Jan", 42], ["2月", "Feb", 61], ["3月", "Mar", 54], ["4月", "Apr", 78], ["5月", "May", 69], ["6月", "Jun", 91]];
function T(e) {
  let {
    locale: s,
    index: n
  } = e;
  return (0, t.jsxs)("div", {
    className: "chart-workbench state-".concat(n),
    children: [0 === n ? (0, t.jsxs)("table", {
      children: [(0, t.jsx)("thead", {
        children: (0, t.jsxs)("tr", {
          children: [(0, t.jsx)("th", {
            children: "en" === s ? "Month" : "月份"
          }), (0, t.jsx)("th", {
            children: "en" === s ? "Orders" : "订单数"
          })]
        })
      }), (0, t.jsx)("tbody", {
        children: A.map(e => {
          let [n, a, i] = e;
          return (0, t.jsxs)("tr", {
            children: [(0, t.jsx)("td", {
              children: "en" === s ? a : n
            }), (0, t.jsx)("td", {
              children: i
            })]
          }, n);
        })
      })]
    }) : (0, t.jsxs)("div", {
      className: "orders-chart",
      children: [(0, t.jsx)("span", {
        className: "chart-axis",
        children: "100"
      }), A.map(e => {
        let [a, i, r] = e;
        return (0, t.jsxs)("div", {
          className: 2 === n && (42 === r || 91 === r) ? "annotated" : "",
          children: [(0, t.jsx)("i", {
            style: {
              "--height": "".concat(r, "%")
            }
          }), (0, t.jsx)("span", {
            children: "en" === s ? i : a
          }), 2 === n && (42 === r || 91 === r) && (0, t.jsx)("b", {
            children: 91 === r ? "en" === s ? "Highest 91" : "最高 91" : "en" === s ? "Lowest 42" : "最低 42"
          })]
        }, a);
      })]
    }), (0, t.jsx)("p", {
      className: "visual-outcome",
      children: 0 === n ? "en" === s ? "Six values are accurate, but their pattern takes effort to compare." : "六个数都准确，但还需要逐个比较才能看出高低。" : "en" === s ? "Same six values; bar length makes the difference visible." : "还是这六个数，柱子的长度让差异直接可见。"
    })]
  });
}
function C(e) {
  let {
    locale: s,
    index: n
  } = e;
  return (0, t.jsxs)("div", {
    className: "theme-settings ".concat(0 === n || 2 === n ? "dark" : "light"),
    children: [(0, t.jsxs)("aside", {
      children: [(0, t.jsx)("strong", {
        children: "en" === s ? "Travel preferences" : "旅行偏好"
      }), (0, t.jsx)("span", {
        children: 0 === n ? "en" === s ? "System \xb7 dark" : "跟随系统 \xb7 当前深色" : 1 === n ? "en" === s ? "Light" : "浅色" : "en" === s ? "Dark" : "深色"
      }), (0, t.jsx)("div", {
        children: ["跟随系统", "浅色", "深色"].map((e, a) => (0, t.jsx)("i", {
          className: a === n ? "on" : "",
          children: "en" === s ? ["System", "Light", "Dark"][a] : e
        }, e))
      })]
    }), (0, t.jsxs)("main", {
      children: [(0, t.jsxs)("header", {
        children: [(0, t.jsx)("b", {
          children: "en" === s ? "Weekend trip" : "周末旅行"
        }), (0, t.jsx)("button", {
          type: "button",
          children: "en" === s ? "Save" : "保存"
        })]
      }), (0, t.jsxs)("section", {
        children: [(0, t.jsx)("small", {
          children: "en" === s ? "ITINERARY" : "行程"
        }), (0, t.jsx)("h3", {
          children: "en" === s ? "Trip preferences" : "行程偏好"
        }), (0, t.jsxs)("label", {
          children: ["en" === s ? "Destination" : "目的地", (0, t.jsx)("input", {
            value: "en" === s ? "Hangzhou" : "杭州",
            readOnly: !0
          })]
        }), (0, t.jsx)("p", {
          children: "en" === s ? "Departure date is still missing" : "还没有填写出发日期"
        })]
      })]
    })]
  });
}
function P(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = n > 0 ? "#3156d3" : "#374151";
  return (0, t.jsxs)("div", {
    className: "token-workbench state-".concat(n),
    style: {
      "--token-color": 2 === n ? a : "#374151"
    },
    children: [(0, t.jsxs)("div", {
      className: "token-editor",
      children: [(0, t.jsxs)("header", {
        children: [(0, t.jsx)("span", {
          children: "tokens.css"
        }), (0, t.jsx)("small", {
          children: 1 === n ? "en" === s ? "edited" : "已修改" : "en" === s ? "shared source" : "共享来源"
        })]
      }), (0, t.jsxs)("code", {
        children: [(0, t.jsx)("i", {
          children: "12"
        }), " --color-action: ", (0, t.jsx)("mark", {
          children: a
        }), ";"]
      })]
    }), (0, t.jsxs)("div", {
      className: "token-link-line",
      "aria-hidden": "true",
      children: [(0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("i", {})]
    }), (0, t.jsxs)("div", {
      className: "token-component-row",
      children: [(0, t.jsx)("button", {
        type: "button",
        children: "en" === s ? "View itinerary" : "查看行程"
      }), (0, t.jsxs)("label", {
        children: ["en" === s ? "Destination" : "目的地", (0, t.jsx)("input", {
          value: "en" === s ? "Hangzhou" : "杭州",
          readOnly: !0
        })]
      }), (0, t.jsxs)("article", {
        children: [(0, t.jsx)("span", {
          children: "en" === s ? "Selected" : "已选中"
        }), (0, t.jsx)("strong", {
          children: "en" === s ? "Coastal route" : "海边路线"
        })]
      })]
    }), (0, t.jsx)("p", {
      className: "visual-outcome",
      children: 0 === n ? "en" === s ? "Three components read one named value." : "三个组件都引用同一个命名值。" : 1 === n ? "en" === s ? "Only the token source changes." : "现在只修改设计令牌的值。" : "en" === s ? "Button, focus, and selected state update together." : "按钮、焦点和选中状态一起更新。"
    })]
  });
}
function R(e) {
  let {
    kind: s,
    locale: n,
    index: a
  } = e;
  return "component" === s ? (0, t.jsx)(o, {
    locale: n,
    index: a
  }) : "state" === s ? (0, t.jsx)(d, {
    locale: n,
    index: a
  }) : "port" === s ? (0, t.jsx)(h, {
    locale: n,
    index: a
  }) : "box-model" === s ? (0, t.jsx)(x, {
    locale: n,
    index: a
  }) : "overflow" === s ? (0, t.jsx)(u, {
    locale: n,
    index: a
  }) : "cors" === s ? (0, t.jsx)(p, {
    locale: n,
    index: a
  }) : "browser-storage" === s ? (0, t.jsx)(j, {
    locale: n,
    index: a
  }) : "seo" === s ? (0, t.jsx)(g, {
    locale: n,
    index: a
  }) : "redirect" === s ? (0, t.jsx)(v, {
    locale: n,
    index: a
  }) : "ai-hallucination" === s ? (0, t.jsx)(b, {
    locale: n,
    index: a
  }) : "chat-ui" === s ? (0, t.jsx)(f, {
    locale: n,
    index: a
  }) : "responsive-design" === s ? (0, t.jsx)(k, {
    locale: n,
    index: a
  }) : "search" === s ? (0, t.jsx)(y, {
    locale: n,
    index: a
  }) : "filter" === s ? (0, t.jsx)(S, {
    locale: n,
    index: a
  }) : "chart" === s ? (0, t.jsx)(T, {
    locale: n,
    index: a
  }) : "dark-mode" === s ? (0, t.jsx)(C, {
    locale: n,
    index: a
  }) : "design-token" === s ? (0, t.jsx)(P, {
    locale: n,
    index: a
  }) : null;
}
let E = new Set(Object.keys(i));
function I(e) {
  let {
      kind: s,
      locale: n = "zh"
    } = e,
    r = i[s],
    [c, o] = (0, a.useState)(0);
  return r ? (0, t.jsx)(l, {
    kind: s,
    data: r,
    locale: n,
    index: c,
    setIndex: o,
    children: (0, t.jsx)(R, {
      kind: s,
      locale: n,
      index: c
    })
  }) : null;
}
let M = {
  "acceptance-criteria": {
    label: ["旅行计划验收现场", "Itinerary acceptance scene"],
    tabs: [["收到需求", "Requirement"], ["逐条核对", "Verify"], ["3 项通过", "3 passed"]]
  },
  "test-case": {
    label: ["错误密码测试现场", "Wrong-password test scene"],
    tabs: [["准备账号", "Set up"], ["执行操作", "Run"], ["对照结果", "Compare"]]
  },
  "unit-test": {
    label: ["价格函数测试工作区", "Price-function test workspace"],
    tabs: [["固定输入", "Inputs"], ["只跑函数", "Run unit"], ["断言通过", "Assertion passes"]]
  },
  "integration-test": {
    label: ["预订数据跨模块现场", "Booking data across modules"],
    tabs: [["提交表单", "Submit"], ["查看请求", "Inspect request"], ["核对记录", "Check record"]]
  },
  "contract-testing": {
    label: ["API 契约一致性校验现场", "API contract verification scene"],
    tabs: [["调用方约定", "Consumer contract"], ["提供方变更", "Provider change"], ["比对阻断", "Verification check"]]
  },
  "e2e-test": {
    label: ["浏览器里的完整预订旅程", "Full booking journey in a browser"],
    tabs: [["选择行程", "Choose"], ["填写付款", "Pay"], ["看到确认号", "Confirmation"]]
  },
  "smoke-test": {
    label: ["新版本关键入口探测", "Key probes for a new release"],
    tabs: [["版本就绪", "Ready"], ["探测失败", "Probe fails"], ["允许深测", "Continue"]]
  },
  "regression-test": {
    label: ["税率改动后的旧结账流程", "Existing checkout after a tax change"],
    tabs: [["旧版基线", "Baseline"], ["税率改动", "Change"], ["旧流程复查", "Rerun"]]
  },
  build: {
    label: ["源码生成发布工件", "Source becoming a release artifact"],
    tabs: [["查看源码", "Source"], ["运行构建", "Build"], ["产物出现", "Artifact"]]
  },
  ci: {
    label: ["PR 自动检查与合并门禁", "PR checks and merge gate"],
    tabs: [["打开 PR", "Open PR"], ["检查运行", "Checks run"], ["允许合并", "Merge allowed"]]
  },
  cd: {
    label: ["候选版本的两种发布方式", "Two release paths for a candidate"],
    tabs: [["候选版就绪", "Candidate ready"], ["等待批准", "Await approval"], ["自动到生产", "Auto production"]]
  },
  staging: {
    label: ["同一旅行站在三个环境中的边界", "One travel site across three environments"],
    tabs: [["本机数据", "Local"], ["预发布检查", "Staging"], ["真实生产", "Production"]]
  },
  "test-coverage": {
    label: ["结账流程哪些路径被走过", "Which checkout paths were exercised"],
    tabs: [["只走成功路", "Happy path"], ["发现缺口", "Gap found"], ["补上失败路", "Gap covered"]]
  },
  "test-double": {
    label: ["订单测试里的可控支付响应", "Controlled payment response in an order test"],
    tabs: [["真实支付", "Real payment"], ["换成替身", "Use double"], ["重复一致", "Repeatable"]]
  },
  "test-fixture": {
    label: ["测试账号从创建到清理", "Test account from setup to cleanup"],
    tabs: [["创建数据", "Set up"], ["用例使用", "Use"], ["清理还原", "Clean up"]]
  },
  "flaky-test": {
    label: ["同一提交的重复运行记录", "Repeated runs of the same commit"],
    tabs: [["建立基线", "Baseline"], ["红绿交替", "Alternates"], ["定位线索", "Trace clue"]]
  },
  lint: {
    label: ["编辑器里的 Lint 问题定位", "Lint issue in an editor"],
    tabs: [["扫描文件", "Scan"], ["定位第 13 行", "Locate line 13"], ["问题清零", "Zero problems"]]
  },
  monitoring: {
    label: ["发布后的错误率监控", "Error-rate monitoring after release"],
    tabs: [["线上健康", "Healthy"], ["越过阈值", "Threshold crossed"], ["关联版本", "Link release"]]
  },
  rollback: {
    label: ["生产流量切回已知可用版本", "Production traffic returning to a known-good release"],
    tabs: [["新版异常", "New release fails"], ["流量切回", "Switch traffic"], ["指标恢复", "Metrics recover"]]
  },
  "feature-flag": {
    label: ["同一版本按人群控制新功能", "One release routing audiences by flag"],
    tabs: [["代码已部署", "Deployed"], ["仅内部开放", "Internal only"], ["紧急关闭", "Turn off"]]
  },
  "canary-release": {
    label: ["结账服务的小流量发布现场", "Small-traffic checkout release"],
    tabs: [["稳定版承载", "Stable serves"], ["5% 验证", "5% canary"], ["异常停止", "Stop on error"]]
  },
  "blue-green-deployment": {
    label: ["旅游站在两套生产环境之间切流", "Travel site switching between two production environments"],
    tabs: [["蓝色服务", "Blue serves"], ["绿色验收", "Verify green"], ["切到绿色", "Switch green"]]
  }
};
let O = (e, s, n) => "en" !== e ? s : n;
let D = (e, s) => {
  var n;
  return null != (n = e[+("en" === s)]) ? n : "";
};
function q(e) {
  let {
      kind: s,
      locale: n,
      index: a,
      setIndex: i,
      children: r
    } = e,
    l = M[s];
  return (0, t.jsxs)("section", {
    className: "testing-visual interactive-demo td-stage td-kind-".concat(s, " td-state-").concat(a),
    tabIndex: 0,
    "aria-label": "".concat(D(l.label, n)).concat("en" !== n ? "，可用左右方向键切换状态。" : ". Use the left and right arrow keys to change state."),
    onKeyDown: e => {
      ("ArrowLeft" === e.key || "ArrowRight" === e.key) && (e.preventDefault(), e.stopPropagation(), i(Math.max(0, Math.min(2, a + ("ArrowLeft" === e.key ? -1 : 1)))));
    },
    children: [(0, t.jsx)("div", {
      className: "td-controls",
      role: "group",
      "aria-label": O(n, "切换图解状态", "Change visual state"),
      children: l.tabs.map((e, s) => (0, t.jsxs)("button", {
        type: "button",
        className: a === s ? "is-active" : "",
        "aria-pressed": a === s,
        onClick: () => i(s),
        children: [(0, t.jsx)("span", {
          children: s + 1
        }), D(e, n)]
      }, e[1]))
    }), (0, t.jsx)("div", {
      className: "td-evidence",
      children: r
    })]
  });
}
function B(e) {
  let {
    address: s,
    badge: n
  } = e;
  return (0, t.jsxs)("header", {
    className: "td-browser-bar",
    children: [(0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("code", {
      children: s
    }), n && (0, t.jsx)("b", {
      children: n
    })]
  });
}
function L(e) {
  let {
    children: s
  } = e;
  return (0, t.jsxs)("p", {
    className: "td-proof",
    children: [(0, t.jsx)("i", {
      "aria-hidden": "true",
      children: "↳"
    }), s]
  });
}
function H(e) {
  let {
    state: s = "idle",
    children: n
  } = e;
  return (0, t.jsxs)("span", {
    className: "td-tick is-".concat(s),
    children: [(0, t.jsx)("i", {
      children: "pass" === s ? "✓" : "fail" === s ? "\xd7" : "○"
    }), n]
  });
}
function F(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = 2 === n;
  return (0, t.jsxs)("div", {
    className: "td-app td-acceptance",
    children: [(0, t.jsx)(B, {
      address: "trip.local/hangzhou-weekend",
      badge: a ? O(s, "验收 3/3", "Accepted 3/3") : O(s, "草稿", "Draft")
    }), (0, t.jsxs)("div", {
      className: "td-acceptance-body",
      children: [(0, t.jsxs)("aside", {
        className: "td-criteria-list",
        children: [(0, t.jsx)("small", {
          children: O(s, "验收清单", "ACCEPTANCE CHECKLIST")
        }), (0, t.jsx)(H, {
          state: n > 0 ? "pass" : "idle",
          children: O(s, "保存后出现行程", "Trip appears after save")
        }), (0, t.jsx)(H, {
          state: a ? "pass" : "idle",
          children: O(s, "刷新后内容还在", "Trip remains after refresh")
        }), (0, t.jsx)(H, {
          state: a ? "pass" : "idle",
          children: O(s, "错误日期给出改法", "Invalid dates explain the fix")
        })]
      }), (0, t.jsxs)("main", {
        className: "td-itinerary",
        children: [(0, t.jsxs)("div", {
          className: "td-itinerary-title",
          children: [(0, t.jsx)("span", {
            children: O(s, "杭州 \xb7 周末双人行", "Hangzhou \xb7 Weekend for two")
          }), (0, t.jsx)("b", {
            children: "\xa51,240"
          })]
        }), (0, t.jsxs)("div", {
          className: "td-trip-line",
          children: [(0, t.jsx)("time", {
            children: "09:30"
          }), (0, t.jsx)("i", {}), (0, t.jsxs)("span", {
            children: [(0, t.jsx)("b", {
              children: O(s, "西湖断桥", "West Lake")
            }), (0, t.jsx)("small", {
              children: O(s, "步行 40 分钟", "40 min walk")
            })]
          })]
        }), (0, t.jsxs)("div", {
          className: "td-trip-line",
          children: [(0, t.jsx)("time", {
            children: "14:00"
          }), (0, t.jsx)("i", {}), (0, t.jsxs)("span", {
            children: [(0, t.jsx)("b", {
              children: O(s, "浙江美术馆", "Zhejiang Art Museum")
            }), (0, t.jsx)("small", {
              children: O(s, "雨天备选 \xb7 室内", "Rain plan \xb7 indoors")
            })]
          })]
        }), (0, t.jsxs)("div", {
          className: a ? "td-date-note is-valid" : "td-date-note",
          children: [(0, t.jsx)("b", {
            children: a ? "✓" : "!"
          }), a ? O(s, "刷新后仍显示这份行程", "This itinerary remains after refresh") : O(s, "结束日期不能早于开始日期", "End date cannot be before start date")]
        })]
      })]
    }), (0, t.jsx)(L, {
      children: a ? O(s, "不是“看起来不错”，而是 3 个页面结果都已实际出现。", "Not “looks good”: all three page results actually appeared.") : O(s, "左边每一条，都必须能在右边真实页面找到证据。", "Every item on the left must have evidence in the real page on the right.")
    })]
  });
}
function W(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = n > 0;
  return (0, t.jsxs)("div", {
    className: "td-app td-test-case",
    children: [(0, t.jsx)(B, {
      address: "accounts.local/sign-in",
      badge: "LOGIN-04"
    }), (0, t.jsxs)("div", {
      className: "td-login-scene",
      children: [(0, t.jsxs)("aside", {
        children: [(0, t.jsx)("small", {
          children: O(s, "固定起点", "FIXED START")
        }), (0, t.jsx)("b", {
          children: "member@trip.test"
        }), (0, t.jsx)("span", {
          children: O(s, "账号已注册 \xb7 未登录", "Registered \xb7 signed out")
        }), (0, t.jsxs)("dl", {
          children: [(0, t.jsxs)("div", {
            children: [(0, t.jsx)("dt", {
              children: O(s, "操作", "Action")
            }), (0, t.jsx)("dd", {
              children: O(s, "输入错误密码后登录", "Sign in with a wrong password")
            })]
          }), (0, t.jsxs)("div", {
            children: [(0, t.jsx)("dt", {
              children: O(s, "预期", "Expected")
            }), (0, t.jsx)("dd", {
              children: O(s, "留在本页并说明原因", "Stay here and explain why")
            })]
          })]
        })]
      }), (0, t.jsxs)("form", {
        children: [(0, t.jsx)("h3", {
          children: O(s, "登录旅行账户", "Sign in to your trip account")
        }), (0, t.jsxs)("label", {
          children: [O(s, "邮箱", "Email"), (0, t.jsx)("span", {
            children: "member@trip.test"
          })]
        }), (0, t.jsxs)("label", {
          children: [O(s, "密码", "Password"), (0, t.jsx)("span", {
            children: a ? "wrong-2026" : "••••••••••"
          })]
        }), (0, t.jsx)("button", {
          type: "button",
          children: O(s, "登录", "Sign in")
        }), a && (0, t.jsxs)("p", {
          className: "td-form-error",
          children: ["! ", O(s, "密码不正确，请重新输入", "Incorrect password. Try again.")]
        })]
      })]
    }), (0, t.jsx)(L, {
      children: 2 === n ? O(s, "实际结果与预期一致：没有进入账户页，错误说明紧邻密码框。", "Actual matches expected: no account page, and the explanation sits by the password field.") : O(s, "相同账号、相同输入、相同操作，别人才可以重复这次检查。", "The same account, input, and action make this check repeatable.")
    })]
  });
}
function U(e) {
  let {
    locale: s,
    index: n
  } = e;
  return (0, t.jsxs)("div", {
    className: "td-workbench td-unit",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("b", {
        children: "price.test.js"
      }), (0, t.jsx)("span", {
        children: O(s, "只测试价格计算", "price calculation only")
      })]
    }), (0, t.jsxs)("div", {
      className: "td-editor-layout",
      children: [(0, t.jsxs)("nav", {
        children: [(0, t.jsx)("span", {
          children: "src"
        }), (0, t.jsx)("b", {
          children: "price.js"
        }), (0, t.jsx)("span", {
          children: "tests"
        }), (0, t.jsx)("b", {
          className: "is-selected",
          children: "price.test.js"
        })]
      }), (0, t.jsx)("pre", {
        children: (0, t.jsxs)("code", {
          children: [(0, t.jsx)("em", {
            children: "1"
          }), " import ", "{", " calculateTotal ", "}", ' from "../price";', "\n", (0, t.jsx)("em", {
            children: "2"
          }), "\n", (0, t.jsx)("em", {
            children: "3"
          }), ' test("adds 8% tax", () => ', "{", "\n", (0, t.jsx)("em", {
            children: "4"
          }), " const result = calculateTotal(", (0, t.jsx)("mark", {
            children: "100, 0.08"
          }), ");", "\n", (0, t.jsx)("em", {
            children: "5"
          }), " expect(result).toBe(", (0, t.jsx)("mark", {
            children: "108"
          }), ");", "\n", (0, t.jsx)("em", {
            children: "6"
          }), " ", "}", ");"]
        })
      })]
    }), (0, t.jsxs)("div", {
      className: "td-terminal-panel",
      children: [(0, t.jsx)("span", {
        children: "$ npm test price.test.js"
      }), (0, t.jsx)("b", {
        children: 0 === n ? O(s, "等待运行", "waiting") : 1 === n ? O(s, "RUNS  price.test.js", "RUNS  price.test.js") : "✓ price.test.js  (1 passed)"
      }), (0, t.jsx)("small", {
        children: O(s, "支付、登录、数据库：未启动", "Payment, login, database: not started")
      })]
    }), (0, t.jsx)(L, {
      children: 2 === n ? O(s, "输入 100 和 0.08，只运行一个函数，输出 108 即通过。", "Inputs 100 and 0.08 run one function; output 108 passes.") : O(s, "外部服务没有进入这个工作区，所以失败更容易指向价格函数本身。", "External services never enter this workspace, so a failure points more directly to the price function.")
    })]
  });
}
function V(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = n > 0,
    i = 2 === n;
  return (0, t.jsxs)("div", {
    className: "td-workbench td-integration",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("b", {
        children: O(s, "旅行预订", "Trip booking")
      }), (0, t.jsx)("code", {
        children: "BK-2048"
      })]
    }), (0, t.jsxs)("div", {
      className: "td-integration-grid",
      children: [(0, t.jsxs)("section", {
        className: "td-booking-form",
        children: [(0, t.jsxs)("label", {
          children: [O(s, "姓名", "Name"), (0, t.jsx)("span", {
            children: O(s, "小林", "Lin")
          })]
        }), (0, t.jsxs)("label", {
          children: [O(s, "出发日期", "Departure"), (0, t.jsx)("span", {
            children: "2026-08-08"
          })]
        }), (0, t.jsx)("button", {
          children: a ? O(s, "已提交", "Submitted") : O(s, "确认预订", "Book trip")
        })]
      }), (0, t.jsxs)("section", {
        className: "td-network-pane",
        children: [(0, t.jsx)("small", {
          children: "NETWORK"
        }), (0, t.jsx)("b", {
          className: a ? "is-live" : "",
          children: "POST /bookings"
        }), (0, t.jsx)("pre", {
          children: a ? '{\n  "id": "BK-2048",\n  "date": "2026-08-08"\n}' : O(s, "等待页面请求…", "Waiting for page request…")
        })]
      }), (0, t.jsxs)("section", {
        className: "td-record-table",
        children: [(0, t.jsx)("small", {
          children: "bookings"
        }), (0, t.jsxs)("div", {
          className: "td-table-head",
          children: [(0, t.jsx)("span", {
            children: "id"
          }), (0, t.jsx)("span", {
            children: "date"
          }), (0, t.jsx)("span", {
            children: "status"
          })]
        }), i ? (0, t.jsxs)("div", {
          className: "td-table-row is-new",
          children: [(0, t.jsx)("b", {
            children: "BK-2048"
          }), (0, t.jsx)("span", {
            children: "2026-08-08"
          }), (0, t.jsx)("span", {
            children: "confirmed"
          })]
        }) : (0, t.jsx)("div", {
          className: "td-table-empty",
          children: O(s, "尚无新记录", "No new row yet")
        })]
      })]
    }), (0, t.jsx)(L, {
      children: i ? O(s, "表单请求与数据库新行使用同一个 BK-2048，模块交接成功。", "The request and new database row share BK-2048, proving the handoff worked.") : O(s, "这里同时看页面请求和存储结果，检查的是两个模块的连接处。", "Looking at both the page request and stored result checks the connection between modules.")
    })]
  });
}
function z(e) {
  let {
    locale: s,
    index: n
  } = e;
  return (0, t.jsxs)("div", {
    className: "td-app td-e2e",
    children: [(0, t.jsx)(B, {
      address: "trip.local/".concat(0 === n ? "hangzhou" : 1 === n ? "checkout" : "confirmation/BK-2048")
    }), (0, t.jsxs)("div", {
      className: "td-journey",
      children: [(0, t.jsxs)("ol", {
        children: [(0, t.jsx)("li", {
          className: n >= 0 ? "is-done" : "",
          children: O(s, "选行程", "Choose")
        }), (0, t.jsx)("li", {
          className: n >= 1 ? "is-done" : "",
          children: O(s, "付款", "Pay")
        }), (0, t.jsx)("li", {
          className: n >= 2 ? "is-done" : "",
          children: O(s, "确认", "Confirm")
        })]
      }), 0 === n && (0, t.jsxs)("main", {
        className: "td-trip-product",
        children: [(0, t.jsx)("span", {
          children: O(s, "周末精选", "WEEKEND PICK")
        }), (0, t.jsx)("h3", {
          children: O(s, "杭州两日慢游", "Two slow days in Hangzhou")
        }), (0, t.jsx)("p", {
          children: O(s, "西湖 \xb7 龙井村 \xb7 美术馆", "West Lake \xb7 Longjing \xb7 Art Museum")
        }), (0, t.jsx)("button", {
          children: O(s, "选择这趟行程", "Choose this trip")
        })]
      }), 1 === n && (0, t.jsxs)("main", {
        className: "td-checkout",
        children: [(0, t.jsxs)("div", {
          children: [(0, t.jsxs)("label", {
            children: [O(s, "持卡人", "Cardholder"), (0, t.jsx)("span", {
              children: "LIN XIAO"
            })]
          }), (0, t.jsxs)("label", {
            children: [O(s, "卡号", "Card number"), (0, t.jsx)("span", {
              children: "•••• 4242"
            })]
          })]
        }), (0, t.jsxs)("aside", {
          children: [(0, t.jsx)("small", {
            children: O(s, "应付", "TOTAL")
          }), (0, t.jsx)("b", {
            children: "\xa51,240"
          }), (0, t.jsx)("button", {
            children: O(s, "支付并预订", "Pay and book")
          })]
        })]
      }), 2 === n && (0, t.jsxs)("main", {
        className: "td-confirmation",
        children: [(0, t.jsx)("i", {
          children: "✓"
        }), (0, t.jsx)("span", {
          children: O(s, "预订成功", "Booking confirmed")
        }), (0, t.jsx)("h3", {
          children: "BK-2048"
        }), (0, t.jsx)("p", {
          children: O(s, "确认邮件已发送至 member@trip.test", "Confirmation sent to member@trip.test")
        })]
      })]
    }), (0, t.jsx)(L, {
      children: O(s, "同一个浏览器从用户入口一路操作到确认号，页面、接口和数据都在真实链路中。", "One browser operates from the user entry to a confirmation number across the real page, API, and data path.")
    })]
  });
}
function G(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = 0 === n ? ["idle", "idle", "idle"] : 1 === n ? ["pass", "fail", "idle"] : ["pass", "pass", "pass"];
  return (0, t.jsxs)("div", {
    className: "td-deploy-console td-smoke",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsxs)("div", {
        children: [(0, t.jsx)("small", {
          children: O(s, "候选版本", "RELEASE CANDIDATE")
        }), (0, t.jsx)("b", {
          children: "web v2.14.0"
        })]
      }), (0, t.jsx)("strong", {
        className: 1 === n ? "is-stop" : 2 === n ? "is-go" : "",
        children: 1 === n ? O(s, "停止深测", "STOP") : 2 === n ? O(s, "进入深测", "CONTINUE") : O(s, "待探测", "PENDING")
      })]
    }), (0, t.jsxs)("div", {
      className: "td-live-preview",
      children: [(0, t.jsx)(B, {
        address: "rc-214.staging.trip.local"
      }), (0, t.jsxs)("main", {
        children: [(0, t.jsx)("b", {
          children: "TRIP"
        }), (0, t.jsx)("span", {
          children: O(s, "搜索目的地", "Search destinations")
        }), (0, t.jsx)("button", {
          children: O(s, "登录", "Sign in")
        })]
      })]
    }), (0, t.jsxs)("div", {
      className: "td-probe-log",
      children: [(0, t.jsx)(H, {
        state: a[0],
        children: O(s, "GET / 返回 200", "GET / returns 200")
      }), (0, t.jsx)(H, {
        state: a[1],
        children: O(s, "账号可以登录", "Account signs in")
      }), (0, t.jsx)(H, {
        state: a[2],
        children: O(s, "GET /api/trips 返回 200", "GET /api/trips returns 200")
      })]
    }), (0, t.jsx)(L, {
      children: 1 === n ? O(s, "登录这个关键入口失败，后面昂贵而完整的测试先不跑。", "A key login probe failed, so deeper expensive tests stop here.") : O(s, "冒烟只快速确认新版本值得继续测试，不证明所有细节正确。", "Smoke checks only decide whether the build deserves deeper testing; they do not prove every detail.")
    })]
  });
}
function K(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = 2 === n;
  return (0, t.jsxs)("div", {
    className: "td-app td-regression",
    children: [(0, t.jsx)(B, {
      address: "shop.local/checkout/order-778",
      badge: 0 === n ? O(s, "基线", "Baseline") : O(s, "税率改动后", "After tax change")
    }), (0, t.jsxs)("div", {
      className: "td-receipt",
      children: [(0, t.jsxs)("main", {
        children: [(0, t.jsx)("h3", {
          children: O(s, "订单结算", "Order checkout")
        }), (0, t.jsxs)("div", {
          children: [(0, t.jsx)("span", {
            children: O(s, "旅行背包", "Travel backpack")
          }), (0, t.jsx)("b", {
            children: "\xa5100"
          })]
        }), (0, t.jsxs)("div", {
          children: [(0, t.jsx)("span", {
            children: O(s, "优惠券 SUMMER8", "Coupon SUMMER8")
          }), (0, t.jsx)("b", {
            className: a ? "is-pass" : "",
            children: "−\xa58"
          })]
        }), (0, t.jsxs)("div", {
          children: [(0, t.jsx)("span", {
            children: O(s, "税费", "Tax")
          }), (0, t.jsx)("b", {
            className: n > 0 ? "is-change" : "",
            children: 0 === n ? "\xa58" : "\xa510"
          })]
        }), (0, t.jsxs)("footer", {
          children: [(0, t.jsx)("span", {
            children: O(s, "实付", "Total")
          }), (0, t.jsx)("strong", {
            children: 0 === n ? "\xa5100" : "\xa5102"
          })]
        }), (0, t.jsx)("button", {
          children: O(s, "支付成功", "Payment succeeded")
        })]
      }), (0, t.jsxs)("aside", {
        children: [(0, t.jsx)("small", {
          children: O(s, "旧流程复查", "EXISTING FLOW RERUN")
        }), (0, t.jsx)(H, {
          state: a ? "pass" : "idle",
          children: O(s, "优惠券仍生效", "Coupon still applies")
        }), (0, t.jsx)(H, {
          state: a ? "pass" : "idle",
          children: O(s, "支付仍成功", "Payment still succeeds")
        }), (0, t.jsx)(H, {
          state: a ? "pass" : "idle",
          children: O(s, "只有税费按需求变化", "Only tax changed as intended")
        })]
      })]
    }), (0, t.jsx)(L, {
      children: a ? O(s, "新税率生效，同时优惠券和支付这两条旧能力没有被改坏。", "The new tax works while the existing coupon and payment behavior still works.") : O(s, "先留住改动前基线，才知道后来哪些变化是预期、哪些是退步。", "Keep the pre-change baseline so later differences can be separated into intended changes and regressions.")
    })]
  });
}
function _(e) {
  let {
    locale: s,
    index: n
  } = e;
  return (0, t.jsxs)("div", {
    className: "td-workbench td-build",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("b", {
        children: "vibe-trip"
      }), (0, t.jsx)("span", {
        children: "main@8fd21a"
      })]
    }), (0, t.jsxs)("div", {
      className: "td-build-layout",
      children: [(0, t.jsxs)("nav", {
        children: [(0, t.jsx)("b", {
          children: "src/"
        }), (0, t.jsx)("span", {
          children: "app.jsx"
        }), (0, t.jsx)("span", {
          children: "styles.css"
        }), (0, t.jsx)("b", {
          children: "public/"
        }), (0, t.jsx)("span", {
          children: "logo.svg"
        }), (0, t.jsx)("span", {
          children: "package.json"
        })]
      }), (0, t.jsxs)("main", {
        children: [(0, t.jsx)("pre", {
          children: (0, t.jsxs)("code", {
            children: ["$ npm run build", "\n", 0 === n ? O(s, "等待命令…", "waiting…") : 1 === n ? "vite v7.0 building for production…\ntransforming 146 modules…" : "✓ 146 modules transformed\n✓ built in 1.24s"]
          })
        }), (0, t.jsxs)("div", {
          className: 2 === n ? "td-artifact-tree is-ready" : "td-artifact-tree",
          children: [(0, t.jsx)("b", {
            children: "dist/"
          }), (0, t.jsx)("span", {
            children: "index.html"
          }), (0, t.jsx)("span", {
            children: "assets/app-D7K2.js"
          }), (0, t.jsx)("span", {
            children: "assets/app-P9L4.css"
          }), 2 === n && (0, t.jsx)("em", {
            children: "v2.14.0"
          })]
        })]
      })]
    }), (0, t.jsx)(L, {
      children: 2 === n ? O(s, "源码没有直接上线；构建生成了一组可识别、可发布的 dist 文件。", "Source did not go straight online; the build produced identifiable, releasable dist files.") : O(s, "构建过程读取源码、依赖和配置，目标是生成运行产物。", "The build reads source, dependencies, and config to produce runnable output.")
    })]
  });
}
function $(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = 2 === n,
    i = 0 === n ? "idle" : "pass";
  return (0, t.jsxs)("div", {
    className: "td-repo-page td-ci",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("span", {
        children: O(s, "Pull request", "Pull request")
      }), (0, t.jsxs)("b", {
        children: ["#184 ", O(s, "修正结账金额", "Fix checkout total")]
      }), (0, t.jsx)("em", {
        className: a ? "is-open" : "",
        children: a ? O(s, "可以合并", "Ready to merge") : O(s, "检查中", "Checks pending")
      })]
    }), (0, t.jsxs)("div", {
      className: "td-pr-body",
      children: [(0, t.jsxs)("main", {
        children: [(0, t.jsx)("small", {
          children: "lin wants to merge 2 commits into main"
        }), (0, t.jsx)("h3", {
          children: O(s, "合并前自动检查", "Checks before merge")
        }), (0, t.jsxs)(H, {
          state: i,
          children: ["Lint ", (0, t.jsx)("code", {
            children: n > 0 ? "18s" : "—"
          })]
        }), (0, t.jsxs)(H, {
          state: i,
          children: [O(s, "单元测试", "Unit tests"), " ", (0, t.jsx)("code", {
            children: n > 0 ? "42s" : "—"
          })]
        }), (0, t.jsxs)(H, {
          state: i,
          children: [O(s, "生产构建", "Production build"), " ", (0, t.jsx)("code", {
            children: n > 0 ? "1m 04s" : "—"
          })]
        })]
      }), (0, t.jsxs)("aside", {
        children: [(0, t.jsx)("button", {
          className: a ? "is-enabled" : "",
          children: O(s, "合并 Pull Request", "Merge pull request")
        }), (0, t.jsx)("span", {
          children: a ? O(s, "3 项必需检查已通过", "3 required checks passed") : O(s, "必需检查未完成，按钮不可用", "Required checks are incomplete")
        })]
      })]
    }), (0, t.jsx)(L, {
      children: a ? O(s, "同一次提交触发 3 项检查，结果直接决定共享主线能不能接收它。", "The same commit triggers three checks whose results directly control entry into the shared mainline.") : O(s, "CI 的业务位置就在合并之前：自动检查先回写，合并按钮再决定是否开放。", "CI sits immediately before merge: checks report back before the merge action can open.")
    })]
  });
}
function Y(e) {
  let {
    locale: s,
    index: n
  } = e;
  return (0, t.jsxs)("div", {
    className: "td-deploy-console td-cd",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsxs)("div", {
        children: [(0, t.jsx)("small", {
          children: O(s, "发布流水线", "RELEASE PIPELINE")
        }), (0, t.jsx)("b", {
          children: "v2.14.0 \xb7 commit 8fd21a"
        })]
      }), (0, t.jsx)("strong", {
        children: O(s, "验证通过", "Validated")
      })]
    }), (0, t.jsxs)("div", {
      className: "td-job-list",
      children: [(0, t.jsxs)("div", {
        children: [(0, t.jsx)("i", {
          children: "✓"
        }), (0, t.jsxs)("span", {
          children: [(0, t.jsx)("b", {
            children: "Build & test"
          }), (0, t.jsx)("small", {
            children: "1m 46s"
          })]
        })]
      }), (0, t.jsxs)("div", {
        className: 1 === n ? "is-current" : "",
        children: [(0, t.jsx)("i", {
          children: n > 0 ? "✓" : "2"
        }), (0, t.jsxs)("span", {
          children: [(0, t.jsx)("b", {
            children: O(s, "部署到预发布", "Deploy to staging")
          }), (0, t.jsx)("small", {
            children: "staging.trip.local"
          })]
        })]
      }), (0, t.jsxs)("div", {
        className: 1 === n ? "is-waiting" : 2 === n ? "is-current" : "",
        children: [(0, t.jsx)("i", {
          children: 2 === n ? "✓" : "3"
        }), (0, t.jsxs)("span", {
          children: [(0, t.jsx)("b", {
            children: O(s, "部署到生产", "Deploy to production")
          }), (0, t.jsx)("small", {
            children: 1 === n ? O(s, "等待负责人批准", "Waiting for owner approval") : 2 === n ? O(s, "门禁通过后自动完成", "Completed automatically after gates") : O(s, "尚未开始", "Not started")
          })]
        }), 1 === n && (0, t.jsx)("button", {
          children: O(s, "批准发布", "Approve")
        })]
      })]
    }), (0, t.jsxs)("div", {
      className: "td-cd-key",
      children: [(0, t.jsx)("b", {
        children: 1 === n ? O(s, "持续交付", "Continuous delivery") : 2 === n ? O(s, "持续部署", "Continuous deployment") : "CD"
      }), (0, t.jsx)("span", {
        children: 1 === n ? O(s, "版本随时可发，但生产仍有人工闸门。", "The version is releasable, but production still has a human gate.") : 2 === n ? O(s, "所有门禁通过后，版本自动进入生产。", "After every gate passes, the release enters production automatically.") : O(s, "先确认谁批准、发往哪个环境。", "First identify who approves and which environment receives it.")
      })]
    })]
  });
}
function Z(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = [{
      address: "localhost:3000/trips",
      tag: O(s, "本地", "LOCAL"),
      user: "lin-dev",
      data: O(s, "随手创建的草稿数据", "Disposable draft data")
    }, {
      address: "staging.trip.local/trips",
      tag: "STAGING",
      user: "qa-member-04",
      data: O(s, "脱敏账号 \xb7 近生产配置", "Masked account \xb7 production-like config")
    }, {
      address: "trip.example.com/trips",
      tag: O(s, "生产", "PRODUCTION"),
      user: O(s, "真实用户", "Real customer"),
      data: O(s, "真实订单 \xb7 正在服务用户", "Real orders \xb7 serving customers")
    }][n];
  return (0, t.jsxs)("div", {
    className: "td-app td-staging td-env-".concat(n),
    children: [(0, t.jsx)(B, {
      address: a.address,
      badge: a.tag
    }), (0, t.jsx)("div", {
      className: "td-env-banner",
      children: 1 === n ? O(s, "预发布环境 \xb7 禁止使用真实用户数据", "Staging \xb7 do not use real customer data") : 0 === n ? O(s, "仅在这台电脑运行", "Runs on this computer only") : O(s, "生产环境 \xb7 所有操作影响真实用户", "Production \xb7 actions affect real customers")
    }), (0, t.jsxs)("main", {
      children: [(0, t.jsxs)("header", {
        children: [(0, t.jsx)("b", {
          children: "TRIP"
        }), (0, t.jsx)("span", {
          children: O(s, "我的行程", "My trips")
        }), (0, t.jsx)("i", {
          children: a.user
        })]
      }), (0, t.jsxs)("article", {
        children: [(0, t.jsx)("small", {
          children: "2026 / 08 / 08"
        }), (0, t.jsx)("h3", {
          children: O(s, "杭州周末", "Hangzhou weekend")
        }), (0, t.jsx)("p", {
          children: a.data
        }), (0, t.jsx)("button", {
          children: 1 === n ? O(s, "开始验收", "Start acceptance") : O(s, "查看行程", "View trip")
        })]
      })]
    }), (0, t.jsx)(L, {
      children: 1 === n ? O(s, "预发布尽量像生产，但地址、账号和数据边界都明确隔离。", "Staging resembles production while its URL, accounts, and data remain clearly isolated.") : O(s, "同一页面在不同环境中服务不同目的，不能只凭长得一样判断。", "The same page serves different purposes in each environment; appearance alone cannot identify the boundary.")
    })]
  });
}
function Q(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = 2 === n;
  return (0, t.jsxs)("div", {
    className: "td-flow-map td-coverage",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("b", {
        children: O(s, "结账决策路径", "Checkout decision paths")
      }), (0, t.jsx)("span", {
        children: O(s, "绿色 = 已有测试走过", "Green = exercised by a test")
      })]
    }), (0, t.jsxs)("div", {
      className: "td-tree",
      children: [(0, t.jsx)("div", {
        className: "td-tree-node is-covered",
        children: O(s, "提交订单", "Submit order")
      }), (0, t.jsx)("div", {
        className: "td-tree-split",
        children: (0, t.jsx)("span", {})
      }), (0, t.jsxs)("div", {
        className: "td-tree-branches",
        children: [(0, t.jsxs)("section", {
          children: [(0, t.jsx)("b", {
            className: "is-covered",
            children: O(s, "支付成功", "Payment succeeds")
          }), (0, t.jsx)("i", {}), (0, t.jsx)("strong", {
            className: "is-covered",
            children: O(s, "确认页", "Confirmation")
          })]
        }), (0, t.jsxs)("section", {
          children: [(0, t.jsx)("b", {
            className: a ? "is-covered" : "is-missed",
            children: O(s, "支付失败", "Payment fails")
          }), (0, t.jsx)("i", {}), (0, t.jsx)("strong", {
            className: a ? "is-covered" : "is-missed",
            children: O(s, "恢复购物车", "Restore cart")
          }), 1 === n && (0, t.jsx)("em", {
            children: O(s, "这里没有用例", "No test reaches this")
          })]
        })]
      })]
    }), (0, t.jsx)(L, {
      children: a ? O(s, "新增用例走过失败分支后，最危险的“钱没付成、商品却丢了”已有保护。", "A new case exercises the failure branch, protecting against a failed payment that loses the cart.") : O(s, "覆盖率的价值是暴露没被走过的风险路径，不是只追一个百分比。", "Coverage is useful when it reveals unexercised risky paths, not when it is only a percentage.")
    })]
  });
}
function J(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = n > 0;
  return (0, t.jsxs)("div", {
    className: "td-workbench td-double",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("b", {
        children: "order.test.js"
      }), (0, t.jsx)("span", {
        children: O(s, "支付请求检查器", "Payment request inspector")
      })]
    }), (0, t.jsxs)("div", {
      className: "td-double-layout",
      children: [(0, t.jsx)("pre", {
        children: (0, t.jsxs)("code", {
          children: ["createOrder(", "{", " amount: 120 ", "}", ")", "\n", a ? 'payment.reply({ status: "paid" })' : "payment.charge(120)"]
        })
      }), (0, t.jsxs)("div", {
        className: "td-request-inspector",
        children: [(0, t.jsx)("small", {
          children: "POST /payments"
        }), (0, t.jsxs)("dl", {
          children: [(0, t.jsxs)("div", {
            children: [(0, t.jsx)("dt", {
              children: "endpoint"
            }), (0, t.jsx)("dd", {
              children: a ? "stub://payment" : "https://pay.example"
            })]
          }), (0, t.jsxs)("div", {
            children: [(0, t.jsx)("dt", {
              children: "amount"
            }), (0, t.jsx)("dd", {
              children: "120"
            })]
          }), (0, t.jsxs)("div", {
            children: [(0, t.jsx)("dt", {
              children: "response"
            }), (0, t.jsx)("dd", {
              className: a ? "is-fixed" : "",
              children: a ? '{ "status": "paid" }' : O(s, "受网络和账号影响", "depends on network/account")
            })]
          })]
        })]
      })]
    }), (0, t.jsxs)("div", {
      className: "td-repeat-row",
      children: [(0, t.jsxs)("span", {
        children: [O(s, "运行 1", "Run 1"), " ", 2 === n ? "✓ paid" : "—"]
      }), (0, t.jsxs)("span", {
        children: [O(s, "运行 2", "Run 2"), " ", 2 === n ? "✓ paid" : "—"]
      }), (0, t.jsxs)("span", {
        children: [O(s, "运行 3", "Run 3"), " ", 2 === n ? "✓ paid" : "—"]
      })]
    }), (0, t.jsx)(L, {
      children: a ? O(s, "订单代码仍发出真实形状的请求，但测试替身把响应固定成 paid。", "Order code still sends the real request shape, while the double fixes the response to paid.") : O(s, "直接调用真实支付会把网络、账号和费用都带进这条订单测试。", "Calling real payment brings network, account, and cost into this order test.")
    })]
  });
}
function X(e) {
  let {
    locale: s,
    index: n
  } = e;
  return (0, t.jsxs)("div", {
    className: "td-data-console td-fixture",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsxs)("div", {
        children: [(0, t.jsx)("b", {
          children: "test_db"
        }), (0, t.jsx)("code", {
          children: "users"
        })]
      }), (0, t.jsx)("span", {
        children: 0 === n ? "setup()" : 1 === n ? "test()" : "teardown()"
      })]
    }), (0, t.jsxs)("div", {
      className: "td-db-table",
      children: [(0, t.jsxs)("div", {
        className: "td-db-head",
        children: [(0, t.jsx)("span", {
          children: "id"
        }), (0, t.jsx)("span", {
          children: "email"
        }), (0, t.jsx)("span", {
          children: "cart_items"
        }), (0, t.jsx)("span", {
          children: "source"
        })]
      }), n < 2 ? (0, t.jsxs)("div", {
        className: "td-db-row ".concat(0 === n ? "is-created" : "is-used"),
        children: [(0, t.jsx)("b", {
          children: "U-TEST-04"
        }), (0, t.jsx)("span", {
          children: "member@trip.test"
        }), (0, t.jsx)("span", {
          children: 1 === n ? "2 → checkout" : "2"
        }), (0, t.jsx)("em", {
          children: "fixture"
        })]
      }) : (0, t.jsx)("div", {
        className: "td-db-empty",
        children: O(s, "U-TEST-04 已删除 \xb7 表格恢复到运行前", "U-TEST-04 removed \xb7 table restored")
      })]
    }), (0, t.jsxs)("ol", {
      children: [(0, t.jsx)("li", {
        className: 0 === n ? "is-current" : "is-done",
        children: O(s, "创建固定账号", "Create fixed account")
      }), (0, t.jsx)("li", {
        className: 1 === n ? "is-current" : n > 1 ? "is-done" : "",
        children: O(s, "用例使用这行数据", "Case uses this row")
      }), (0, t.jsx)("li", {
        className: 2 === n ? "is-current" : "",
        children: O(s, "清理测试账号", "Remove test account")
      })]
    }), (0, t.jsx)(L, {
      children: 2 === n ? O(s, "第二次运行又会从没有 U-TEST-04 的干净表格开始。", "The next run starts again from a clean table without U-TEST-04.") : O(s, "测试数据是这行值；Fixture 负责让它按时出现并在结束后消失。", "Test data is the row value; the fixture makes it appear on time and disappear afterward.")
    })]
  });
}
function ee(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = n > 0;
  return (0, t.jsxs)("div", {
    className: "td-repo-page td-flaky",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("span", {
        children: O(s, "测试历史", "TEST HISTORY")
      }), (0, t.jsx)("b", {
        children: "login.e2e.ts"
      }), (0, t.jsx)("em", {
        children: "commit 8fd21a"
      })]
    }), (0, t.jsxs)("div", {
      className: "td-run-table",
      children: [(0, t.jsxs)("div", {
        children: [(0, t.jsx)("span", {
          children: "run"
        }), (0, t.jsx)("span", {
          children: "commit"
        }), (0, t.jsx)("span", {
          children: "result"
        }), (0, t.jsx)("span", {
          children: "time"
        })]
      }), (a ? [["#5912", "8fd21a", "✓", "41s"], ["#5913", "8fd21a", "\xd7", "43s"], ["#5914", "8fd21a", "✓", "40s"], ["#5915", "8fd21a", "\xd7", "42s"]] : [["#5912", "8fd21a", "✓", "41s"], ["#5913", "8fd21a", "✓", "40s"], ["#5914", "8fd21a", "✓", "42s"], ["#5915", "8fd21a", "✓", "41s"]]).map(e => (0, t.jsx)("div", {
        className: "\xd7" === e[2] ? "is-failed" : "",
        children: e.map(e => (0, t.jsx)("span", {
          children: e
        }, e))
      }, e[0]))]
    }), 2 === n && (0, t.jsxs)("div", {
      className: "td-trace-clue",
      children: [(0, t.jsx)("b", {
        children: O(s, "共同线索", "Shared clue")
      }), (0, t.jsx)("span", {
        children: O(s, "4 次运行并行使用同一个 member@trip.test，登录状态相互覆盖。", "Four parallel runs use member@trip.test and overwrite one another's session.")
      })]
    }), (0, t.jsx)(L, {
      children: a ? O(s, "代码和提交都没变，结果却红绿交替；重试能隐藏问题，不能修复共享状态。", "Code and commit are unchanged but results alternate; retries hide the shared-state problem rather than fix it.") : O(s, "先固定同一提交连续运行，才能排除“代码本来就变了”。", "Repeatedly run the same commit first to rule out changing code.")
    })]
  });
}
function es(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = 2 === n;
  return (0, t.jsxs)("div", {
    className: "td-workbench td-lint",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("b", {
        children: "checkout.js"
      }), (0, t.jsx)("span", {
        children: a ? "✓ 0 problems" : 1 === n ? "1 problem" : O(s, "正在扫描", "Scanning")
      })]
    }), (0, t.jsxs)("div", {
      className: "td-lint-layout",
      children: [(0, t.jsx)("pre", {
        children: (0, t.jsxs)("code", {
          children: [(0, t.jsx)("em", {
            children: "11"
          }), " async function submit(order) ", "{", "\n", (0, t.jsx)("em", {
            children: "12"
          }), " const total = price + tax;", "\n", (0, t.jsx)("em", {
            className: 1 === n ? "is-error" : "",
            children: "13"
          }), " ", a ? "try { await saveOrder(order); }" : "await saveOrder(order)", "\n", (0, t.jsx)("em", {
            children: "14"
          }), " return total;", "\n", (0, t.jsx)("em", {
            children: "15"
          }), " ", "}"]
        })
      }), (0, t.jsxs)("aside", {
        children: [(0, t.jsx)("small", {
          children: "PROBLEMS"
        }), 0 === n ? (0, t.jsx)("span", {
          children: O(s, "等待规则扫描…", "Waiting for rule scan…")
        }) : a ? (0, t.jsxs)("b", {
          className: "is-clear",
          children: ["✓ ", O(s, "没有问题", "No problems")]
        }) : (0, t.jsxs)("div", {
          children: [(0, t.jsx)("b", {
            children: "checkout.js:13"
          }), (0, t.jsx)("span", {
            children: O(s, "语句末尾缺少分号", "Missing semicolon")
          }), (0, t.jsx)("code", {
            children: "semi"
          })]
        })]
      })]
    }), (0, t.jsx)(L, {
      children: a ? O(s, "源码规则问题已经清零，但这不等于登录、支付等运行行为都正确。", "Source-rule problems are now zero; this does not prove login or payment behavior.") : O(s, "Lint 直接把可疑写法定位到文件和行号，不需要运行完整网站。", "Lint locates suspicious source at a file and line without running the full site.")
    })]
  });
}
function en(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = n > 0;
  return (0, t.jsxs)("div", {
    className: "td-observability td-monitoring",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsxs)("div", {
        children: [(0, t.jsx)("small", {
          children: "checkout-api"
        }), (0, t.jsx)("b", {
          children: O(s, "生产错误率", "Production error rate")
        })]
      }), (0, t.jsx)("span", {
        children: 2 === n ? "release v2.14.0" : "last 30 min"
      })]
    }), (0, t.jsxs)("div", {
      className: "td-metric-summary",
      children: [(0, t.jsx)("b", {
        className: a ? "is-alert" : "",
        children: a ? "6.8%" : "0.2%"
      }), (0, t.jsx)("span", {
        children: O(s, "阈值 2%", "threshold 2%")
      }), (0, t.jsx)("em", {
        children: a ? O(s, "需要处理", "Action needed") : O(s, "健康", "Healthy")
      })]
    }), (0, t.jsxs)("div", {
      className: "td-metric-chart",
      children: [(0, t.jsx)("span", {
        className: "td-threshold",
        children: O(s, "阈值 2%", "2% threshold")
      }), (0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("i", {
        className: a ? "is-high" : ""
      }), (0, t.jsx)("i", {
        className: a ? "is-high" : ""
      }), (0, t.jsx)("i", {
        className: a ? "is-high" : ""
      }), 2 === n && (0, t.jsx)("b", {
        children: "v2.14.0"
      })]
    }), (0, t.jsxs)("div", {
      className: a ? "td-alert-row is-active" : "td-alert-row",
      children: [(0, t.jsx)("i", {
        children: a ? "!" : "✓"
      }), (0, t.jsx)("span", {
        children: a ? O(s, "结账错误率持续 5 分钟高于阈值", "Checkout errors exceeded the threshold for 5 minutes") : O(s, "当前没有触发告警", "No alert is firing")
      }), 2 === n && (0, t.jsx)("code", {
        children: "deploy #8842"
      })]
    }), (0, t.jsx)(L, {
      children: 2 === n ? O(s, "告警、时间点和发布记录对上，团队才有依据关开关或回滚。", "The alert, time, and release record now align, supporting a flag-off or rollback decision.") : O(s, "监控持续看线上信号；一次截图或用户口头反馈不能替代时间序列。", "Monitoring continuously watches production signals; a screenshot or anecdote cannot replace the time series.")
    })]
  });
}
function et(e) {
  let {
    locale: s,
    index: n
  } = e;
  return (0, t.jsxs)("div", {
    className: "td-deploy-console td-rollback",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsxs)("div", {
        children: [(0, t.jsx)("small", {
          children: O(s, "生产部署", "PRODUCTION DEPLOYMENTS")
        }), (0, t.jsx)("b", {
          children: "checkout-api"
        })]
      }), (0, t.jsx)("strong", {
        className: 0 === n ? "is-stop" : "is-go",
        children: 0 === n ? O(s, "错误率 6.8%", "6.8% errors") : 1 === n ? O(s, "切换中", "Switching") : O(s, "错误率 0.2%", "0.2% errors")
      })]
    }), (0, t.jsxs)("div", {
      className: "td-release-history",
      children: [(0, t.jsxs)("div", {
        className: 0 === n ? "is-serving is-bad" : "",
        children: [(0, t.jsx)("i", {
          children: "v2.14.0"
        }), (0, t.jsx)("span", {
          children: "deploy #8842 \xb7 09:42"
        }), (0, t.jsx)("b", {
          children: 0 === n ? O(s, "100% 流量", "100% traffic") : O(s, "0% 流量", "0% traffic")
        })]
      }), (0, t.jsxs)("div", {
        className: n > 0 ? "is-serving" : "",
        children: [(0, t.jsx)("i", {
          children: "v2.13.4"
        }), (0, t.jsx)("span", {
          children: "deploy #8819 \xb7 07/25"
        }), (0, t.jsx)("b", {
          children: 0 === n ? O(s, "保留工件", "artifact kept") : 1 === n ? O(s, "流量切换中…", "traffic switching…") : O(s, "100% 流量", "100% traffic")
        })]
      })]
    }), (0, t.jsxs)("div", {
      className: "td-health-strip",
      children: [(0, t.jsx)("span", {
        children: O(s, "错误率", "Error rate")
      }), (0, t.jsxs)("div", {
        children: [(0, t.jsx)("i", {
          className: "is-bad"
        }), (0, t.jsx)("i", {
          className: "is-bad"
        }), (0, t.jsx)("i", {
          className: n > 0 ? "is-mid" : "is-bad"
        }), (0, t.jsx)("i", {
          className: 2 === n ? "is-good" : "is-mid"
        }), (0, t.jsx)("i", {
          className: 2 === n ? "is-good" : "is-mid"
        })]
      }), (0, t.jsx)("b", {
        children: 2 === n ? "0.2%" : 1 === n ? "3.1%" : "6.8%"
      })]
    }), (0, t.jsx)(L, {
      children: 2 === n ? O(s, "流量已回到 v2.13.4，同时错误率恢复，才证明止损完成。", "Traffic returned to v2.13.4 and the error rate recovered, proving mitigation completed.") : O(s, "回滚用已有旧工件立刻切回，不必等新版问题先修好。", "Rollback switches immediately to an existing older artifact; it does not wait for a forward fix.")
    })]
  });
}
function ea(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = 2 === n;
  return (0, t.jsxs)("div", {
    className: "td-flag-console",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsxs)("div", {
        children: [(0, t.jsx)("small", {
          children: "feature / smart-itinerary"
        }), (0, t.jsx)("b", {
          children: O(s, "新版行程推荐", "New itinerary recommendations")
        })]
      }), (0, t.jsxs)("button", {
        className: a ? "is-off" : "",
        children: [(0, t.jsx)("i", {}), a ? "OFF" : "ON"]
      })]
    }), (0, t.jsxs)("div", {
      className: "td-flag-grid",
      children: [(0, t.jsxs)("aside", {
        children: [(0, t.jsxs)("div", {
          children: [(0, t.jsx)("span", {
            children: O(s, "已部署版本", "Deployed release")
          }), (0, t.jsx)("b", {
            children: "v2.14.0"
          })]
        }), (0, t.jsxs)("div", {
          children: [(0, t.jsx)("span", {
            children: O(s, "开放规则", "Target rule")
          }), (0, t.jsx)("b", {
            children: a ? O(s, "无人", "Nobody") : 1 === n ? O(s, "员工邮箱", "Employee email") : O(s, "0% 用户", "0% users")
          })]
        }), (0, t.jsxs)("div", {
          children: [(0, t.jsx)("span", {
            children: O(s, "无需重新部署", "Redeploy")
          }), (0, t.jsx)("b", {
            children: O(s, "否", "No")
          })]
        })]
      }), (0, t.jsxs)("main", {
        children: [(0, t.jsxs)("section", {
          children: [(0, t.jsx)("small", {
            children: O(s, "员工 \xb7 lin@trip.local", "Employee \xb7 lin@trip.local")
          }), (0, t.jsxs)("div", {
            className: a || 1 !== n ? "td-old-trip" : "td-new-trip",
            children: [(0, t.jsx)("b", {
              children: a || 1 !== n ? O(s, "经典行程列表", "Classic itinerary list") : O(s, "AI 智能排程", "AI smart itinerary")
            }), (0, t.jsx)("span", {
              children: a || 1 !== n ? O(s, "按日期查看", "Browse by date") : O(s, "按天气自动调整", "Adjusts to weather")
            })]
          })]
        }), (0, t.jsxs)("section", {
          children: [(0, t.jsx)("small", {
            children: O(s, "普通用户 \xb7 guest@example.com", "Customer \xb7 guest@example.com")
          }), (0, t.jsxs)("div", {
            className: "td-old-trip",
            children: [(0, t.jsx)("b", {
              children: O(s, "经典行程列表", "Classic itinerary list")
            }), (0, t.jsx)("span", {
              children: O(s, "按日期查看", "Browse by date")
            })]
          })]
        })]
      })]
    }), (0, t.jsx)(L, {
      children: a ? O(s, "同一版本仍在线，但两类用户都立刻回到旧路径；这不是回滚版本。", "The same release stays online while both audiences immediately return to the old path; no version rollback occurred.") : O(s, "版本部署和功能开放被拆开，规则决定谁进入新业务路径。", "Deployment and exposure are separate; the rule decides who enters the new business path.")
    })]
  });
}
function ei(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = 5 * (1 === n),
    i = 100 - a;
  return (0, t.jsxs)("div", {
    className: "td-deploy-console td-canary-release",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsxs)("div", {
        children: [(0, t.jsx)("small", {
          children: O(s, "生产流量", "PRODUCTION TRAFFIC")
        }), (0, t.jsx)("b", {
          children: "checkout-api"
        })]
      }), (0, t.jsx)("strong", {
        className: 1 === n ? "is-stop" : "is-go",
        children: 0 === n ? O(s, "v1 稳定", "v1 stable") : 1 === n ? O(s, "v2 超过阈值", "v2 over threshold") : O(s, "已停止扩大", "Expansion stopped")
      })]
    }), (0, t.jsxs)("div", {
      className: "td-canary-routing",
      children: [(0, t.jsxs)("div", {
        className: "td-traffic-source",
        children: [(0, t.jsx)("span", {
          children: O(s, "用户请求", "User requests")
        }), (0, t.jsx)("b", {
          children: "100%"
        })]
      }), (0, t.jsxs)("div", {
        className: "td-version-lanes",
        children: [(0, t.jsxs)("section", {
          className: "is-stable",
          children: [(0, t.jsxs)("header", {
            children: [(0, t.jsxs)("span", {
              children: [(0, t.jsx)("small", {
                children: O(s, "稳定版", "STABLE")
              }), (0, t.jsx)("b", {
                children: "v1.8.4"
              })]
            }), (0, t.jsxs)("strong", {
              children: [i, "%"]
            })]
          }), (0, t.jsx)("div", {
            className: "td-traffic-meter",
            children: (0, t.jsx)("i", {
              style: {
                width: "".concat(i, "%")
              }
            })
          }), (0, t.jsxs)("p", {
            children: [(0, t.jsx)("span", {
              children: O(s, "结账错误率", "Checkout errors")
            }), (0, t.jsx)("b", {
              children: "0.2%"
            })]
          })]
        }), (0, t.jsxs)("section", {
          className: n > 0 ? "is-canary is-failed" : "is-canary",
          children: [(0, t.jsxs)("header", {
            children: [(0, t.jsxs)("span", {
              children: [(0, t.jsx)("small", {
                children: O(s, "候选版", "CANDIDATE")
              }), (0, t.jsx)("b", {
                children: "v2.0.0"
              })]
            }), (0, t.jsxs)("strong", {
              children: [a, "%"]
            })]
          }), (0, t.jsx)("div", {
            className: "td-traffic-meter",
            children: (0, t.jsx)("i", {
              style: {
                width: "".concat(a, "%")
              }
            })
          }), (0, t.jsxs)("p", {
            children: [(0, t.jsx)("span", {
              children: O(s, "结账错误率", "Checkout errors")
            }), (0, t.jsx)("b", {
              children: 1 === n ? "7.0%" : O(s, "未接流量", "No traffic")
            })]
          })]
        })]
      })]
    }), (0, t.jsx)(L, {
      children: 0 === n ? O(s, "v1 承接全部请求；v2 已准备好，但还没有真实用户进入。", "v1 serves every request; v2 is ready but has no real users yet.") : 1 === n ? O(s, "只有 5% 请求进入 v2，真实错误率已经越过 2% 门槛。", "Only 5% of requests reach v2, and its real error rate has crossed the 2% gate.") : O(s, "v2 流量退回 0%，v1 恢复 100%；异常没有继续扩大。", "v2 returns to 0% and v1 to 100%, so the anomaly does not widen.")
    })]
  });
}
function er(e) {
  let {
      locale: s,
      index: n
    } = e,
    a = n > 0,
    i = 2 === n;
  return (0, t.jsxs)("div", {
    className: "td-deploy-console td-blue-green-deployment",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsxs)("div", {
        children: [(0, t.jsx)("small", {
          children: O(s, "生产入口", "PRODUCTION ENTRY")
        }), (0, t.jsx)("b", {
          children: "travel.example.com"
        })]
      }), (0, t.jsx)("strong", {
        className: "is-go",
        children: i ? O(s, "100% → GREEN", "100% → GREEN") : O(s, "100% → BLUE", "100% → BLUE")
      })]
    }), (0, t.jsxs)("div", {
      className: "td-environment-routing",
      children: [(0, t.jsxs)("div", {
        className: "td-route-shares",
        children: [(0, t.jsx)("span", {
          className: i ? "" : "is-active",
          children: i ? "0%" : "↓ 100%"
        }), (0, t.jsx)("span", {
          className: i ? "is-active" : "",
          children: i ? "↓ 100%" : "0%"
        })]
      }), (0, t.jsxs)("div", {
        className: "td-environment-pools",
        children: [(0, t.jsxs)("section", {
          className: i ? "is-blue" : "is-blue is-live",
          children: [(0, t.jsxs)("header", {
            children: [(0, t.jsx)("span", {
              children: "BLUE"
            }), (0, t.jsx)("b", {
              children: "v1.8.4"
            })]
          }), (0, t.jsxs)("div", {
            className: "td-travel-screen",
            children: [(0, t.jsx)("b", {
              children: O(s, "杭州周末", "Hangzhou weekend")
            }), (0, t.jsx)("span", {
              children: O(s, "登录正常 \xb7 预订正常", "Login healthy \xb7 Booking healthy")
            })]
          }), (0, t.jsx)("p", {
            children: i ? O(s, "暂时保留，可切回", "Retained for return") : O(s, "正在服务生产", "Serving production")
          })]
        }), (0, t.jsxs)("section", {
          className: i ? "is-green is-live" : "is-green",
          children: [(0, t.jsxs)("header", {
            children: [(0, t.jsx)("span", {
              children: "GREEN"
            }), (0, t.jsx)("b", {
              children: "v2.0.0"
            })]
          }), (0, t.jsx)("div", {
            className: "td-travel-screen",
            children: a ? (0, t.jsxs)(t.Fragment, {
              children: [(0, t.jsx)("b", {
                children: O(s, "候选版检查", "Candidate checks")
              }), (0, t.jsx)("span", {
                children: O(s, "登录 ✓　预订 ✓　健康检查 ✓", "Login ✓　Booking ✓　Health ✓")
              })]
            }) : (0, t.jsxs)(t.Fragment, {
              children: [(0, t.jsx)("b", {
                children: O(s, "等待部署 v2", "Waiting for v2")
              }), (0, t.jsx)("span", {
                children: O(s, "没有生产流量", "No production traffic")
              })]
            })
          }), (0, t.jsx)("p", {
            children: i ? O(s, "正在服务生产", "Serving production") : a ? O(s, "验收通过，尚未切流", "Verified, not switched") : O(s, "独立候选环境", "Independent candidate")
          })]
        })]
      })]
    }), (0, t.jsx)(L, {
      children: i ? O(s, "入口已经指向绿色 v2，蓝色 v1 仍在，异常时才有快速切回的目标。", "The entry now points to green v2 while blue v1 remains as a fast return target.") : a ? O(s, "绿色环境已通过登录和预订检查，但生产请求仍由蓝色环境处理。", "Green passed login and booking checks, while blue still handles production requests.") : O(s, "蓝色 v1 保持服务，部署 v2 不会原地覆盖正在运行的应用。", "Blue v1 stays live, so deploying v2 does not overwrite the serving application in place.")
    })]
  });
}
function el(e) {
  let {
    locale: s,
    index: n
  } = e;
  return (0, t.jsxs)("div", {
    className: "td-app td-contract",
    children: [(0, t.jsx)(B, {
      address: "api.service.local/v1/users/42"
    }), (0, t.jsxs)("div", {
      className: "td-contract-board",
      children: [0 === n && (0, t.jsxs)("div", {
        className: "td-contract-step",
        children: [(0, t.jsx)("span", {
          className: "td-badge",
          children: O(s, "调用方记录真实依赖", "Consumer records real needs")
        }), (0, t.jsxs)("div", {
          className: "td-contract-pair",
          children: [(0, t.jsxs)("section", {
            children: [(0, t.jsx)("small", {
              children: O(s, "资料页实际读取", "Profile page reads")
            }), (0, t.jsx)("pre", {
              children: "const avatar = user.avatar_url\nconst name = user.nickname"
            })]
          }), (0, t.jsx)("i", {
            "aria-hidden": "true",
            children: "→"
          }), (0, t.jsxs)("section", {
            children: [(0, t.jsx)("small", {
              children: O(s, "最小响应契约", "Minimum response contract")
            }), (0, t.jsx)("pre", {
              children: 'GET /v1/users/42 → 200\n{\n  "avatar_url": "string",\n  "nickname": "string"\n}'
            })]
          })]
        }), (0, t.jsx)(L, {
          children: O(s, "契约只记录页面真正读取的字段；后端仍可返回其他数据。", "The contract records only fields the page truly reads; the backend may return more.")
        })]
      }), 1 === n && (0, t.jsxs)("div", {
        className: "td-contract-step",
        children: [(0, t.jsx)("span", {
          className: "td-badge is-warn",
          children: O(s, "提供方返回值发生变化", "Provider response changes")
        }), (0, t.jsxs)("div", {
          className: "td-contract-pair is-compare",
          children: [(0, t.jsxs)("section", {
            children: [(0, t.jsx)("small", {
              children: O(s, "契约期望", "Contract expects")
            }), (0, t.jsx)("pre", {
              children: '{\n  "avatar_url": "/a/42.png",\n  "nickname": "Lin"\n}'
            })]
          }), (0, t.jsx)("i", {
            "aria-hidden": "true",
            children: "≠"
          }), (0, t.jsxs)("section", {
            className: "is-broken",
            children: [(0, t.jsx)("small", {
              children: O(s, "后端 PR #108 实际响应", "Backend PR #108 response")
            }), (0, t.jsx)("pre", {
              children: '{\n  "avatar": "/a/42.png",\n  "nickname": "Lin"\n}'
            })]
          })]
        }), (0, t.jsx)(L, {
          children: O(s, "图片地址没变，但字段名不同，资料页会读不到头像。", "The URL is unchanged, but the renamed field leaves the profile page without an avatar.")
        })]
      }), 2 === n && (0, t.jsxs)("div", {
        className: "td-contract-step",
        children: [(0, t.jsx)("span", {
          className: "td-badge is-fail",
          children: O(s, "提供方验证把结果送回 PR", "Provider verification reports to the PR")
        }), (0, t.jsxs)("div", {
          className: "td-contract-checks",
          children: [(0, t.jsxs)("header", {
            children: [(0, t.jsx)("span", {
              children: "PR #108 \xb7 rename profile field"
            }), (0, t.jsx)("b", {
              children: O(s, "检查失败", "Checks failed")
            })]
          }), (0, t.jsxs)("div", {
            className: "td-contract-result is-failed",
            children: [(0, t.jsx)("strong", {
              children: "\xd7 Provider contract verification"
            }), (0, t.jsx)("code", {
              children: O(s, "缺少字段 avatar_url；实际只返回 avatar", "Missing avatar_url; provider returned avatar")
            })]
          }), (0, t.jsx)("button", {
            type: "button",
            disabled: !0,
            children: O(s, "无法合并", "Merge blocked")
          })]
        }), (0, t.jsx)(L, {
          children: O(s, "验收时先让不兼容改名触发失败，再恢复 avatar_url 并确认同一检查通过。", "Acceptance first observes the incompatible rename fail, then restores avatar_url and sees the same check pass.")
        })]
      })]
    })]
  });
}
function ec(e) {
  let {
      kind: s,
      locale: n,
      index: a
    } = e,
    i = {
      locale: n,
      index: a
    };
  return "acceptance-criteria" === s ? (0, t.jsx)(F, {
    ...i
  }) : "test-case" === s ? (0, t.jsx)(W, {
    ...i
  }) : "unit-test" === s ? (0, t.jsx)(U, {
    ...i
  }) : "integration-test" === s ? (0, t.jsx)(V, {
    ...i
  }) : "contract-testing" === s ? (0, t.jsx)(el, {
    ...i
  }) : "e2e-test" === s ? (0, t.jsx)(z, {
    ...i
  }) : "smoke-test" === s ? (0, t.jsx)(G, {
    ...i
  }) : "regression-test" === s ? (0, t.jsx)(K, {
    ...i
  }) : "build" === s ? (0, t.jsx)(_, {
    ...i
  }) : "ci" === s ? (0, t.jsx)($, {
    ...i
  }) : "cd" === s ? (0, t.jsx)(Y, {
    ...i
  }) : "staging" === s ? (0, t.jsx)(Z, {
    ...i
  }) : "test-coverage" === s ? (0, t.jsx)(Q, {
    ...i
  }) : "test-double" === s ? (0, t.jsx)(J, {
    ...i
  }) : "test-fixture" === s ? (0, t.jsx)(X, {
    ...i
  }) : "flaky-test" === s ? (0, t.jsx)(ee, {
    ...i
  }) : "lint" === s ? (0, t.jsx)(es, {
    ...i
  }) : "monitoring" === s ? (0, t.jsx)(en, {
    ...i
  }) : "rollback" === s ? (0, t.jsx)(et, {
    ...i
  }) : "feature-flag" === s ? (0, t.jsx)(ea, {
    ...i
  }) : "canary-release" === s ? (0, t.jsx)(ei, {
    ...i
  }) : "blue-green-deployment" === s ? (0, t.jsx)(er, {
    ...i
  }) : null;
}
let eo = new Set(Object.keys(M));
function ed(e) {
  let {
      kind: s,
      locale: n = "zh"
    } = e,
    [i, r] = (0, a.useState)(0);
  return M[s] ? (0, t.jsx)(q, {
    kind: s,
    locale: n,
    index: i,
    setIndex: r,
    children: (0, t.jsx)(ec, {
      kind: s,
      locale: n,
      index: i
    })
  }) : null;
}
let em = [{
  round: 1,
  icon: "读",
  text: 'read_file("nav.jsx")'
}, {
  round: 1,
  icon: "看",
  text: "观察：84 行，没有小屏媒体查询"
}, {
  round: 2,
  icon: "改",
  text: "patch nav.jsx：小屏横向滚动"
}, {
  round: 2,
  icon: "跑",
  text: "npm run build → ✓ 通过"
}];
let ej = [{
  phase: "收到目标",
  messages: [{
    from: "user",
    text: "把导航栏在小屏下溢出的问题修掉，修完自己验证一遍。"
  }],
  evidence: "任务已登记：修复小屏导航溢出，完成后自行验证。",
  status: "开始",
  traceCount: 0,
  caption: "目标可以跨多步；Agent 先登记任务和验证标准，而不是急着给答案。"
}, {
  phase: "判断下一步",
  messages: [],
  evidence: '提出行动：read_file("nav.jsx")',
  status: "继续",
  traceCount: 0,
  caption: "模型根据当前任务状态选择：先读什么、调用哪个工具、是否需要追问。"
}, {
  phase: "执行并观察",
  messages: [],
  evidence: "读取 84 行导航代码：没有找到小屏的媒体查询。",
  status: "继续",
  traceCount: 2,
  caption: "真正的读写由产品及工具执行；新观察会改变下一步的判断。"
}, {
  phase: "再判断、再行动",
  messages: [],
  evidence: "基于观察提出修改：小屏改为横向滚动。",
  status: "继续",
  traceCount: 3,
  caption: "权限和高风险确认仍由产品控制，模型只提出动作。"
}, {
  phase: "验证结果",
  messages: [],
  evidence: "构建通过；小屏页宽不再溢出。",
  status: "继续",
  traceCount: 4,
  caption: "用真实检查结果判断是否可以结束，而不是“看起来改了”。"
}, {
  phase: "达到条件，停止",
  messages: [{
    from: "ai",
    text: "已修复：小屏下导航改为横向滚动，构建通过，页面不再溢出。"
  }],
  evidence: "完成条件达成：构建通过 + 小屏无溢出 → 停止循环并汇报。",
  status: "停止",
  traceCount: 4,
  caption: "达到完成条件、遇到风险或需要决定时，就应该停下来。"
}];
let eg = [{
  label: "本轮目标",
  note: "修复登录按钮无反应",
  tokens: 120,
  action: "keep",
  tag: "放入",
  detail: "先保留这轮要完成的任务，Agent 才能判断其他资料是否有关。"
}, {
  label: "确认的限制",
  note: "不能修改公共组件",
  tokens: 180,
  action: "keep",
  tag: "放入",
  detail: "刚确认的限制必须继续出现，避免下一轮为了修按钮改动公共组件。"
}, {
  label: "login-button.jsx",
  note: "正在修改的文件",
  tokens: 260,
  action: "keep",
  tag: "放入",
  detail: "正在修改的文件直接带入，让 Agent 能对照目标和限制检查代码。"
}, {
  label: "旧讨论原文",
  note: "原文 800 Token",
  tokens: 60,
  action: "compress",
  tag: "压缩成摘要",
  detail: "旧讨论只保留仍然有效的决定，并留下原文件位置供需要时读取。"
}, {
  label: "营销页面资料",
  note: "与当前任务无关",
  tokens: 220,
  action: "drop",
  tag: "排除",
  detail: "营销页面与登录故障无关，这一轮不发送，避免掩盖当前限制。"
}];
let ev = [{
  label: "提出问题",
  part: "host",
  call: "等待选择工具",
  status: "还没有访问外部系统",
  detail: "用户只说想查什么；AI 应用负责接住问题，并决定这次可以使用哪些连接。"
}, {
  label: "找到工具",
  part: "server",
  call: "发现 get_ticket",
  status: "工具说明：按编号读取一条工单",
  detail: "工单服务通过 MCP 告诉应用：这里有一个 get_ticket 工具，以及它需要的参数。"
}, {
  label: "发送查询",
  part: "link",
  call: "get_ticket({ id: 1024 })",
  status: "请求沿 MCP 连接交给工单服务",
  detail: "模型提出工具名和参数，应用中的 MCP Client 按协议把这次查询发给工单服务。"
}, {
  label: "检查权限",
  part: "system",
  call: "get_ticket({ id: 1024 })",
  status: "当前测试账号：允许只读工单 ✓",
  detail: "工单系统仍会检查当前账号是否能读取 #1024；使用 MCP 不会跳过登录和授权。"
}, {
  label: "显示结果",
  part: "result",
  call: "get_ticket({ id: 1024 })",
  status: "真实结果已经返回",
  detail: "应用把工单系统返回的负责人展示给用户；“小林”不是模型猜出来的。"
}];
let eb = [{
  id: "skill",
  name: "SKILL.md",
  kind: "入口",
  when: "先看说明",
  action: "读取入口",
  detail: "SKILL.md 写清这个 Skill 做什么、什么时候使用，以及应该怎样完成任务。",
  preview: (0, t.jsx)("div", {
    className: "skill-doc",
    children: (0, t.jsxs)("div", {
      className: "skill-rules",
      children: [(0, t.jsx)("span", {
        children: "这个 Skill：帮助发布视频"
      }), (0, t.jsx)("span", {
        children: "什么时候用：准备发布或检查视频时"
      }), (0, t.jsx)("span", {
        children: "怎么做：读取规则 → 检查 → 生成结果"
      })]
    })
  })
}, {
  id: "references",
  name: "references/平台规则.md",
  kind: "可选",
  when: "读取资料",
  action: "读取文件",
  detail: "Agent 可以读取文件，所以较长的平台规则和团队知识可以和 Skill 放在一起。",
  preview: (0, t.jsx)("div", {
    className: "skill-doc",
    children: (0, t.jsxs)("div", {
      className: "skill-rules",
      children: [(0, t.jsx)("span", {
        children: "视频比例：9:16"
      }), (0, t.jsx)("span", {
        children: "标题：不超过 20 字"
      }), (0, t.jsx)("span", {
        children: "发布前：检查封面和字幕"
      })]
    })
  })
}, {
  id: "scripts",
  name: "scripts/检查视频.mjs",
  kind: "可选",
  when: "执行命令",
  action: "执行脚本",
  detail: "Agent 可以执行命令，所以重复、固定的检查可以直接交给脚本完成。",
  preview: (0, t.jsx)(eu.BK, {
    children: "$ node scripts/检查视频.mjs\n✓ 尺寸正确\n✓ 字幕存在"
  })
}, {
  id: "assets",
  name: "assets/封面模板.png",
  kind: "可选",
  when: "使用模板",
  action: "使用模板",
  detail: "模板和素材也可以放进文件夹，Agent 完成任务时直接使用。",
  preview: (0, t.jsxs)("div", {
    className: "skill-assets",
    children: [(0, t.jsxs)("div", {
      className: "skill-slide",
      children: [(0, t.jsx)("b", {
        children: "视频封面"
      }), (0, t.jsx)("i", {}), (0, t.jsx)("i", {})]
    }), (0, t.jsxs)("div", {
      className: "skill-slide",
      children: [(0, t.jsx)("b", {
        children: "标题位置"
      }), (0, t.jsx)("i", {})]
    }), (0, t.jsxs)("div", {
      className: "skill-slide",
      children: [(0, t.jsx)("b", {
        children: "产品画面"
      }), (0, t.jsx)("i", {}), (0, t.jsx)("i", {})]
    })]
  })
}];
let ef = [{
  id: "research",
  task: "查官方资料",
  input: "目标：核对 API 用法",
  output: "3 条带链接的结论",
  progress: 70
}, {
  id: "review",
  task: "检查代码风险",
  input: "目标：审这次改动",
  output: "2 处风险 + 建议",
  progress: 55
}, {
  id: "build",
  task: "实现不同文件",
  input: "目标：改 nav.jsx",
  output: "patch + 构建通过",
  progress: 80
}];
let ek = new Set(["transaction", "atomicity", "database-write", "idempotency", "side-effect", "process", "thread", "coroutine", "lock", "race-condition", "enqueue", "message-consumer", "backpressure", "circuit-breaker", "lease", "distributed-system", "single-instance", "multi-instance", "audit-log", "load-testing", "message-queue", "database-migration"]);
let eN = [{
  actor: "用户",
  label: "提出请求",
  detail: "“帮我查明天下午有没有空？”"
}, {
  actor: "应用",
  label: "带着消息和工具定义请求模型",
  detail: "应用把用户的话，以及“查询空闲时段”这个工具的用途和可填参数一起交给模型。"
}, {
  actor: "模型",
  label: "返回工具名和参数",
  detail: "模型请求：查询明天 13:00–18:00 的空闲时段。它没有直接读取日历。"
}, {
  actor: "应用",
  label: "校验后执行查询",
  detail: "应用确认工具允许只读日历、日期和时间段都合法，再去查询。"
}, {
  actor: "应用 → 模型",
  label: "交回真实结果",
  detail: "查询结果：15:00–16:00、17:30–18:00 空闲。"
}, {
  actor: "模型 → 应用 → 用户",
  label: "生成并展示回答",
  detail: "模型根据真实结果生成回答，再由应用展示给用户。"
}];
let ey = [{
  label: "系统规则",
  tokens: 180,
  kind: "rule"
}, {
  label: "当前问题",
  tokens: 120,
  kind: "current"
}, {
  label: "login.js",
  tokens: 260,
  kind: "file"
}, {
  label: "较早对话摘要",
  tokens: 140,
  kind: "history"
}, {
  label: "marketing.md（无关）",
  tokens: 220,
  kind: "noise"
}];
let ew = ["流式", "响应会", "让文字", "一段一段", "到达界面。"];
let eS = [{
  label: "先检查按钮",
  file: "tool call",
  line: 'read_file("src/login-button.jsx")',
  evidence: "初步判断：按钮可能没有绑定点击事件，先读取真实文件。"
}, {
  label: "读取真实文件",
  file: "login-button.jsx",
  line: "<button onClick={submit}>登录</button>",
  evidence: "观察结果：点击事件已经存在，原来的判断不成立。"
}, {
  label: "改查网络请求",
  file: "Network",
  line: "POST /api/login → 401",
  evidence: "根据新证据停止修改按钮，下一步检查登录请求为什么被拒绝。"
}, {
  label: "修正请求",
  file: "auth.ts",
  line: "Authorization: Bearer ${token}",
  evidence: "请求记录显示缺少认证信息，因此修正发送请求的代码。"
}, {
  label: "运行登录测试",
  file: "Terminal",
  line: "✓ login-flow.test 通过",
  evidence: "修正后重新检查，登录流程通过，任务才有完成证据。"
}];
let eA = [{
  round: 1,
  label: "首次检查失败",
  evidence: "$ check mobile-nav\n✗ 页面仍有横向滚动",
  status: "继续"
}, {
  round: 2,
  label: "同类失败再次出现",
  evidence: "$ check mobile-nav\n✗ 同一项检查再次失败",
  status: "暂停"
}, {
  round: 3,
  label: "确认后调整范围",
  evidence: "用户确认：可以修改公共 nav.css\n剩余尝试：1 次",
  status: "继续"
}, {
  round: 3,
  label: "两项检查通过",
  evidence: "✓ npm run build\n✓ 390px 页面没有横向滚动",
  status: "完成"
}];
let eT = [{
  task: "第 1 轮 \xb7 读需求",
  input: 1200,
  output: 180
}, {
  task: "第 2 轮 \xb7 加入 3 个文件",
  input: 3600,
  output: 420
}, {
  task: "第 3 轮 \xb7 加入测试结果",
  input: 5100,
  output: 260
}];
let eC = [{
  label: "3 个任务同时运行",
  workers: 3,
  message: "队列中还有 497 个任务",
  tone: "normal"
}, {
  label: "服务返回 429",
  workers: 0,
  message: "Retry-After: 2s",
  tone: "error"
}, {
  label: "应用等待并降并发",
  workers: 1,
  message: "2 秒后再试；并发从 3 降为 1",
  tone: "wait"
}, {
  label: "继续处理队列",
  workers: 1,
  message: "重试成功，剩余 496 个任务",
  tone: "success"
}];
let eP = [{
  id: "text",
  label: "文字",
  icon: "ti-file-text"
}, {
  id: "image",
  label: "图片",
  icon: "ti-photo"
}, {
  id: "audio",
  label: "语音 / 音频",
  note: "语音属于音频",
  icon: "ti-microphone"
}, {
  id: "video",
  label: "视频",
  icon: "ti-video"
}];
function eR(e) {
  let {
    title: s,
    description: n,
    activeIds: a
  } = e;
  return (0, t.jsx)(ep.vy, {
    children: (0, t.jsxs)("section", {
      className: "modality-panel",
      "aria-label": s,
      children: [(0, t.jsxs)("header", {
        children: [(0, t.jsx)("strong", {
          children: s
        }), (0, t.jsx)("span", {
          children: n
        })]
      }), (0, t.jsx)("ul", {
        children: eP.map(e => (0, t.jsxs)("li", {
          className: a.includes(e.id) ? "on" : "",
          children: [(0, t.jsx)("i", {
            className: "ti ".concat(e.icon),
            "aria-hidden": "true"
          }), (0, t.jsxs)("span", {
            children: [(0, t.jsx)("strong", {
              children: e.label
            }), e.note && (0, t.jsx)("small", {
              children: e.note
            })]
          })]
        }, e.id))
      })]
    })
  });
}
let eE = [{
  n: 1,
  text: "function Todo() {"
}, {
  n: 2,
  text: "  const [tasks, setTasks] = useState([])"
}, {
  n: 3,
  text: "  const add = () => setTasks([...tasks, text])"
}, {
  n: 4,
  text: "}"
}];
let eI = [{
  note: "第 1 轮 \xb7 你提出目标",
  messages: [{
    from: "user",
    text: "帮我做一个待办页面：能添加任务，点圆圈标记完成。"
  }],
  code: [],
  preview: 0,
  caption: "先给目标和现有项目，不必先写成一份僵硬模板。"
}, {
  note: "第 1 轮 \xb7 AI 生成第一版",
  messages: [{
    from: "ai",
    text: "收到，先搭出能运行的第一版。"
  }],
  code: eE,
  preview: 1,
  caption: "工具只产生候选改动，不代表功能已经正确。"
}, {
  note: "第 2 轮 \xb7 你运行并观察",
  messages: [{
    from: "user",
    text: "我试了下：添加后输入框没清空，完成的任务也没标记。"
  }],
  code: eE,
  preview: 2,
  caption: "打开页面亲手操作，用真实结果判断下一轮该补什么。"
}, {
  note: "第 2 轮 \xb7 AI 按反馈修改",
  messages: [{
    from: "ai",
    text: "明白：提交后清空输入框，完成的任务划线。"
  }],
  code: [eE[0], eE[1], {
    n: 3,
    text: "  const add = () => { setTasks(...); clear(); }",
    changed: !0
  }, {
    n: 4,
    text: "  const toggle = (id) => markDone(id)",
    changed: !0
  }],
  preview: 3,
  caption: "把“哪里不对”和期望结果说清楚，AI 再改一轮。"
}, {
  note: "第 3 轮 \xb7 继续迭代",
  messages: [{
    from: "user",
    text: "再加个删除按钮。"
  }, {
    from: "ai",
    text: "已加上，并重新跑了一遍检查。"
  }],
  code: [eE[0], eE[1], {
    n: 3,
    text: "  const add = () => { setTasks(...); clear(); }"
  }, {
    n: 4,
    text: "  const remove = (id) => drop(id)",
    changed: !0
  }],
  preview: 4,
  caption: "循环继续；重要改动仍要检查差异和测试。"
}];
function eM(e) {
  let {
    state: s
  } = e;
  if (0 === s) return (0, t.jsx)(ep.vy, {
    children: (0, t.jsxs)("div", {
      className: "vibe-preview-empty",
      children: [(0, t.jsx)("i", {
        className: "ti ti-cloud-code",
        "aria-hidden": "true"
      }), (0, t.jsx)("span", {
        children: "还没有页面，等你描述要做什么"
      })]
    })
  });
  let n = s >= 3,
    a = s >= 4;
  return (0, t.jsx)(ep.vy, {
    children: (0, t.jsxs)("div", {
      className: "vibe-todo".concat(2 === s ? " has-issues" : ""),
      children: [(0, t.jsxs)("div", {
        className: "vibe-todo-input",
        children: [(0, t.jsx)("span", {
          children: n ? "" : "买牛奶"
        }), (0, t.jsx)("b", {
          children: "添加"
        }), 2 === s && (0, t.jsx)("em", {
          className: "vibe-issue-tag",
          children: "残留文字"
        })]
      }), (0, t.jsxs)("div", {
        className: "vibe-todo-row".concat(n ? " done" : ""),
        children: [(0, t.jsx)("i", {
          children: n ? "✓" : "○"
        }), (0, t.jsx)("span", {
          children: "买牛奶"
        }), a && (0, t.jsx)("u", {
          children: "删除"
        }), 2 === s && (0, t.jsx)("em", {
          className: "vibe-issue-tag",
          children: "完成无标记"
        })]
      }), (0, t.jsxs)("div", {
        className: "vibe-todo-row",
        children: [(0, t.jsx)("i", {
          children: "○"
        }), (0, t.jsx)("span", {
          children: "写周报"
        }), a && (0, t.jsx)("u", {
          children: "删除"
        })]
      })]
    })
  });
}
function eO() {
  return (0, t.jsx)(ep.vy, {
    children: (0, t.jsxs)("div", {
      className: "mvp-mock mvp-mock-full",
      "aria-hidden": "true",
      children: [(0, t.jsxs)("div", {
        className: "mvp-mock-side",
        children: [(0, t.jsx)("b", {
          children: "催款云"
        }), (0, t.jsx)("span", {
          children: "仪表盘"
        }), (0, t.jsx)("span", {
          children: "客户管理"
        }), (0, t.jsx)("span", {
          children: "发票系统"
        }), (0, t.jsx)("span", {
          children: "催款引擎"
        }), (0, t.jsx)("span", {
          children: "多币种"
        }), (0, t.jsx)("span", {
          children: "团队权限"
        }), (0, t.jsx)("span", {
          children: "移动 App"
        })]
      }), (0, t.jsxs)("div", {
        className: "mvp-mock-main",
        children: [(0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("i", {})]
      })]
    })
  });
}
function eD() {
  return (0, t.jsx)(ep.vy, {
    children: (0, t.jsxs)("div", {
      className: "mvp-mock mvp-mock-lean",
      "aria-hidden": "true",
      children: [(0, t.jsx)("strong", {
        children: "自由职业者的催款提醒"
      }), (0, t.jsx)("span", {
        className: "mvp-mock-price",
        children: "\xa529 / 月"
      }), (0, t.jsx)("b", {
        className: "mvp-mock-pay",
        children: "立即付费试用"
      }), (0, t.jsx)("small", {
        children: "后台由人工完成催款"
      })]
    })
  });
}
let eq = [{
  id: "background",
  title: "背景与问题",
  caption: "先写清谁、在什么场景、遇到什么问题，并标明哪些是事实、哪些是假设。"
}, {
  id: "goal",
  title: "目标与衡量",
  caption: "说明希望什么发生变化，以及用什么信号判断有效，不写无法检查的话。"
}, {
  id: "concept",
  title: "概念设计",
  caption: "用一句话说清产品概念：在哪个页面多出什么动作，给用户带来什么。"
}, {
  id: "prototype",
  title: "原型设计",
  caption: "只画结构、内容和动作，帮助团队对齐理解，不替最终视觉做决定。"
}, {
  id: "scope",
  title: "范围 \xb7 做与不做",
  caption: "写清本次必须覆盖什么、明确不碰什么；非目标和范围同样重要。"
}, {
  id: "acceptance",
  title: "验收标准",
  caption: "每一条都要能被检查；写不出验收方式的内容，先标为待确认。"
}];
let eB = {
  background: function () {
    return (0, t.jsx)(ep.vy, {
      children: (0, t.jsxs)("div", {
        className: "prd-bg",
        children: [(0, t.jsxs)("div", {
          className: "prd-quote",
          children: [(0, t.jsx)("small", {
            children: "用户访谈 \xb7 项目经理"
          }), (0, t.jsx)("p", {
            children: "“每周开完 6 场会，光是整理纪要、逐个转发，就要花掉 40 分钟。”"
          })]
        }), (0, t.jsxs)("div", {
          className: "prd-facts",
          children: [(0, t.jsxs)("div", {
            children: [(0, t.jsx)("b", {
              children: "6+ 场"
            }), (0, t.jsx)("span", {
              children: "每周会议"
            })]
          }), (0, t.jsxs)("div", {
            children: [(0, t.jsx)("b", {
              children: "40 分钟"
            }), (0, t.jsx)("span", {
              children: "每次整理转发"
            })]
          }), (0, t.jsxs)("div", {
            children: [(0, t.jsx)("b", {
              children: "3 人"
            }), (0, t.jsx)("span", {
              children: "深访验证"
            })]
          })]
        }), (0, t.jsxs)("div", {
          className: "prd-tags",
          children: [(0, t.jsx)("span", {
            className: "prd-tag fact",
            children: "事实 \xb7 来自 3 次访谈"
          }), (0, t.jsx)("span", {
            className: "prd-tag assume",
            children: "假设 \xb7 转发对象是真正的读者"
          })]
        })]
      })
    });
  },
  goal: function () {
    return (0, t.jsx)(ep.vy, {
      children: (0, t.jsxs)("div", {
        className: "prd-metrics",
        children: [(0, t.jsxs)("div", {
          className: "prd-metric-head",
          children: [(0, t.jsx)("span", {
            children: "衡量信号"
          }), (0, t.jsx)("b", {
            children: "现状"
          }), (0, t.jsx)("i", {}), (0, t.jsx)("strong", {
            children: "目标"
          })]
        }), [{
          label: "导出一份纪要的耗时",
          from: "40 分钟",
          to: "< 1 分钟"
        }, {
          label: "试点团队纪要改用导出的比例",
          from: "0%",
          to: "≥ 60% / 4 周"
        }, {
          label: "导出格式错乱投诉",
          from: "—",
          to: "0 次"
        }].map(e => (0, t.jsxs)("div", {
          className: "prd-metric",
          children: [(0, t.jsx)("span", {
            children: e.label
          }), (0, t.jsx)("b", {
            children: e.from
          }), (0, t.jsx)("i", {
            children: "→"
          }), (0, t.jsx)("strong", {
            children: e.to
          })]
        }, e.label))]
      })
    });
  },
  concept: function () {
    return (0, t.jsx)(ep.vy, {
      children: (0, t.jsxs)("div", {
        className: "prd-concept",
        children: [(0, t.jsx)("p", {
          children: "在纪要页增加一个「导出」动作，把已有内容变成可分享的文件。"
        }), (0, t.jsxs)("div", {
          className: "prd-concept-flow",
          children: [(0, t.jsxs)("div", {
            className: "prd-cnode",
            children: [(0, t.jsx)("small", {
              children: "已有"
            }), (0, t.jsx)("b", {
              children: "纪要内容"
            })]
          }), (0, t.jsx)("i", {
            children: "→"
          }), (0, t.jsxs)("div", {
            className: "prd-cnode key",
            children: [(0, t.jsx)("small", {
              children: "新增动作"
            }), (0, t.jsx)("b", {
              children: "导出"
            })]
          }), (0, t.jsx)("i", {
            children: "→"
          }), (0, t.jsxs)("div", {
            className: "prd-cnode",
            children: [(0, t.jsx)("small", {
              children: "产物"
            }), (0, t.jsx)("b", {
              children: "Markdown / 剪贴板"
            })]
          }), (0, t.jsx)("i", {
            children: "→"
          }), (0, t.jsxs)("div", {
            className: "prd-cnode",
            children: [(0, t.jsx)("small", {
              children: "结果"
            }), (0, t.jsx)("b", {
              children: "直接转发相关人"
            })]
          })]
        })]
      })
    });
  },
  prototype: function () {
    return (0, t.jsx)(ep.vy, {
      children: (0, t.jsxs)("div", {
        className: "prd-wires",
        children: [(0, t.jsxs)("div", {
          className: "prd-wire",
          children: [(0, t.jsxs)("div", {
            className: "prd-wire-bar",
            children: [(0, t.jsx)("i", {}), (0, t.jsx)("span", {
              children: "纪要页"
            }), (0, t.jsx)("b", {
              className: "prd-wire-cta",
              children: "导出"
            })]
          }), (0, t.jsxs)("div", {
            className: "prd-wire-body",
            children: [(0, t.jsx)("strong", {
              children: "Q3 产品评审纪要"
            }), (0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("em", {
              children: "正文内容…"
            })]
          }), (0, t.jsx)("small", {
            className: "prd-wire-note",
            children: "右上角常驻「导出」入口"
          })]
        }), (0, t.jsxs)("div", {
          className: "prd-wire",
          children: [(0, t.jsxs)("div", {
            className: "prd-wire-modal",
            children: [(0, t.jsx)("strong", {
              children: "导出纪要"
            }), (0, t.jsx)("span", {
              className: "on",
              children: "◉ Markdown 文件"
            }), (0, t.jsx)("span", {
              children: "○ 复制到剪贴板"
            }), (0, t.jsxs)("div", {
              children: [(0, t.jsx)("u", {
                children: "取消"
              }), (0, t.jsx)("b", {
                children: "导出"
              })]
            })]
          }), (0, t.jsx)("small", {
            className: "prd-wire-note",
            children: "只提供两种最常用格式"
          })]
        })]
      })
    });
  },
  scope: function () {
    return (0, t.jsx)(ep.vy, {
      children: (0, t.jsxs)("div", {
        className: "prd-scope",
        children: [(0, t.jsxs)("div", {
          className: "prd-scope-col do",
          children: [(0, t.jsx)("small", {
            children: "本次做"
          }), (0, t.jsxs)("ul", {
            children: [(0, t.jsx)("li", {
              children: "纪要页一键导出 Markdown"
            }), (0, t.jsx)("li", {
              children: "复制到剪贴板"
            }), (0, t.jsx)("li", {
              children: "5 秒内生成文件"
            })]
          })]
        }), (0, t.jsxs)("div", {
          className: "prd-scope-col dont",
          children: [(0, t.jsx)("small", {
            children: "本次不做"
          }), (0, t.jsxs)("ul", {
            children: [(0, t.jsx)("li", {
              children: "自动翻译"
            }), (0, t.jsx)("li", {
              children: "第三方日历同步"
            }), (0, t.jsx)("li", {
              children: "移动端 App"
            })]
          })]
        })]
      })
    });
  },
  acceptance: function () {
    return (0, t.jsx)(ep.vy, {
      children: (0, t.jsxs)("div", {
        className: "prd-accept",
        children: [(0, t.jsxs)("div", {
          className: "prd-check",
          children: [(0, t.jsx)("b", {
            children: "✓"
          }), (0, t.jsx)("span", {
            children: "点击导出后 ≤ 5 秒生成文件"
          })]
        }), (0, t.jsxs)("div", {
          className: "prd-check",
          children: [(0, t.jsx)("b", {
            children: "✓"
          }), (0, t.jsx)("span", {
            children: "导出内容与页面显示逐字一致"
          })]
        }), (0, t.jsxs)("div", {
          className: "prd-check",
          children: [(0, t.jsx)("b", {
            children: "✓"
          }), (0, t.jsx)("span", {
            children: "无查看权限的用户看不到导出按钮"
          })]
        }), (0, t.jsxs)("div", {
          className: "prd-pending",
          children: [(0, t.jsx)("span", {
            children: "待确认"
          }), "法务对导出内容是否有脱敏要求"]
        })]
      })
    });
  }
};
let eL = [{
  id: "entry",
  kind: "node",
  who: "入口",
  label: "进入预约页"
}, {
  id: "slot",
  kind: "node",
  who: "操作",
  label: "选择时段"
}, {
  id: "judge1",
  kind: "judge",
  who: "判断",
  label: "有可用时段？"
}, {
  id: "form",
  kind: "node",
  who: "操作",
  label: "填写资料"
}, {
  id: "submit",
  kind: "node",
  who: "操作",
  label: "提交预约"
}, {
  id: "judge2",
  kind: "judge",
  who: "判断",
  label: "提交成功？"
}, {
  id: "done",
  kind: "ok",
  who: "终点",
  label: "预约成功"
}];
let eH = [{
  from: 2,
  label: "提示近期无号，返回重选时段"
}, {
  from: 5,
  label: "标出错误项，保留已填内容"
}];
let eF = ["先说明角色、目标和进入场景：访客从服务页进入预约。", "只保留推动目标前进的关键动作，不必记录每一次点击。", "真正影响去向的条件画成分支：没有可用时段时，用户去哪？", "同时写清用户做什么、系统怎样回应。", "提交是推动目标的关键动作，结果必须明确。", "第二个影响去向的条件：提交可能成功，也可能失败。", "成功终点要可确认：用户看到预约成功的凭证。", "两类失败分支都要有恢复路径，不能只画理想路线。"];
function eW(e, s, n) {
  return "en" === e ? n : s;
}
let eU = [["1", "行程自动保存", "目标匹配"], ["2", "地图配色建议", "1 条反馈"], ["3", "支付失败修复", "影响待确认"], ["4", "导出 PDF", "候选"]];
let eV = [["1", "支付失败修复", "所有订单受影响"], ["2", "行程自动保存", "目标匹配"], ["3", "地图配色建议", "等待更多证据"], ["4", "导出 PDF", "候选"]];
let ez = [{
  zh: "发现",
  en: "Discover",
  touchZh: "朋友分享",
  touchEn: "Friend share",
  actionZh: "打开课程介绍",
  actionEn: "Open course page",
  feelingZh: "好奇",
  feelingEn: "Curious",
  score: 1
}, {
  zh: "了解",
  en: "Evaluate",
  touchZh: "介绍页",
  touchEn: "Course page",
  actionZh: "比较内容与价格",
  actionEn: "Compare content and price",
  feelingZh: "仍有疑问",
  feelingEn: "Unsure",
  score: 0
}, {
  zh: "购买",
  en: "Purchase",
  touchZh: "支付页",
  touchEn: "Checkout",
  actionZh: "寻找退款说明",
  actionEn: "Look for refund terms",
  feelingZh: "担心",
  feelingEn: "Concerned",
  score: -1
}, {
  zh: "开始",
  en: "Start",
  touchZh: "邮件与应用",
  touchEn: "Email and app",
  actionZh: "进入第一课",
  actionEn: "Enter first lesson",
  feelingZh: "安心",
  feelingEn: "Confident",
  score: 1
}];
let eG = [["访问", "Visit", 1e3, 100], ["开始注册", "Start", 620, 62], ["提交资料", "Submit", 310, 31], ["完成注册", "Complete", 280, 28]];
let eK = [["访问", "Visit", 600, 100], ["开始注册", "Start", 330, 55], ["提交资料", "Submit", 132, 22], ["完成注册", "Complete", 114, 19]];
let e_ = [{
  zh: "交互设计",
  en: "Interaction design",
  start: 1,
  duration: 3,
  tone: "design"
}, {
  zh: "功能开发",
  en: "Development",
  start: 4,
  duration: 5,
  tone: "build"
}, {
  zh: "功能测试",
  en: "Testing",
  start: 9,
  duration: 2,
  tone: "test"
}];
let e$ = (0, a.lazy)(() => import("./web-foundation.js"));
let eY = (0, a.lazy)(() => import("./foundation-lessons.js"));
let eZ = (0, a.lazy)(() => import("./ai-tools.js"));
let eQ = (0, a.lazy)(() => import("./example-visual.js"));
let eJ = new Set(["provider", "base-url", "api-proxy", "openai-compatible-api", "config-file", "profile", "project-rules", "hook", "plugin", "permission-mode", "sandbox"]);
let eX = {
  "tech-stack": function () {
    let [e, s] = (0, a.useState)(0),
      n = ["components/task.tsx", "app/page.tsx", "styles/task.css", "package.json"];
    return (0, t.jsxs)(eu.xc, {
      label: "技术栈分工图解",
      className: "stack-workbench",
      onPrevious: () => s(Math.max(0, e - 1)),
      onNext: () => s(Math.min(3, e + 1)),
      children: [(0, t.jsx)(eu.tk, {
        items: ["写交互", "安排页面", "控制外观", "启动上线"],
        value: e,
        onChange: s
      }), (0, t.jsxs)("div", {
        className: "workbench-grid three-region",
        children: [(0, t.jsxs)("div", {
          className: "project-tree",
          "aria-label": "项目文件",
          children: [(0, t.jsx)("strong", {
            children: "todo-app"
          }), n.map((s, n) => (0, t.jsxs)("span", {
            className: e === n ? "active" : "",
            children: ["⌁ ", s]
          }, s))]
        }), (0, t.jsxs)(eu.KE, {
          filename: n[e],
          children: [0 === e && (0, t.jsxs)(t.Fragment, {
            children: [(0, t.jsx)(eu.SH, {
              n: "1",
              active: !0,
              children: "const [tasks, setTasks] = useState([])"
            }), (0, t.jsx)(eu.SH, {
              n: "2",
              children: 'onClick={() => addTask("买牛奶")}'
            })]
          }), 1 === e && (0, t.jsxs)(t.Fragment, {
            children: [(0, t.jsx)(eu.SH, {
              n: "1",
              active: !0,
              children: "export default function Page() {"
            }), (0, t.jsx)(eu.SH, {
              n: "2",
              children: "  return <TaskList />"
            }), (0, t.jsx)(eu.SH, {
              n: "3",
              children: "}"
            })]
          }), 2 === e && (0, t.jsxs)(t.Fragment, {
            children: [(0, t.jsx)(eu.SH, {
              n: "1",
              active: !0,
              children: ".task { padding: 12px; border-radius: 10px; }"
            }), (0, t.jsx)(eu.SH, {
              n: "2",
              children: ".addButton { color: white; }"
            })]
          }), 3 === e && (0, t.jsxs)(t.Fragment, {
            children: [(0, t.jsx)(eu.SH, {
              n: "1",
              active: !0,
              children: '"scripts": { "start": "next start" }'
            }), (0, t.jsx)(eu.SH, {
              n: "2",
              children: '"dependencies": { ... }'
            })]
          })]
        }), (0, t.jsxs)(eu.Tb, {
          url: 3 === e ? "todo.example.com" : "localhost:3000",
          children: [(0, t.jsxs)("div", {
            className: "todo-preview",
            children: [(0, t.jsx)("b", {
              children: "今天要做"
            }), (0, t.jsx)("span", {
              children: "○ 买牛奶"
            }), (0, t.jsx)("button", {
              type: "button",
              children: "新增任务"
            })]
          }), (0, t.jsx)("small", {
            className: "visual-callout",
            children: ["语言写下点击后要做什么", "框架按文件位置找到页面", "样式和组件决定长什么样", "运行命令让别人能打开"][e]
          })]
        })]
      })]
    });
  },
  javascript: function () {
    let [e, s] = (0, a.useState)("idle");
    return (0, t.jsx)(eu.xc, {
      label: "JavaScript 点击更新页面图解",
      className: "js-workbench",
      children: (0, t.jsxs)("div", {
        className: "workbench-grid two-region",
        children: [(0, t.jsxs)(eu.KE, {
          filename: "task.js",
          children: [(0, t.jsx)(eu.SH, {
            n: "1",
            active: "idle" === e,
            children: 'button.addEventListener("click", async () => {'
          }), (0, t.jsx)(eu.SH, {
            n: "2",
            active: "loading" === e,
            children: '  const task = await fetch("/api/task/1")'
          }), (0, t.jsx)(eu.SH, {
            n: "3",
            active: "success" === e,
            children: '  row.textContent = task.done ? "已完成" : "未完成"'
          }), (0, t.jsx)(eu.SH, {
            n: "4",
            error: "error" === e,
            children: "})"
          })]
        }), (0, t.jsxs)(eu.Tb, {
          status: "idle" === e ? "还没有点击" : "loading" === e ? "正在请求 /api/task/1" : "success" === e ? "收到：done = true" : "网络失败：请重试",
          children: [(0, t.jsxs)("div", {
            className: "task-row ".concat("success" === e ? "done" : ""),
            children: [(0, t.jsx)("span", {
              children: "success" === e ? "✓" : "○"
            }), (0, t.jsx)("b", {
              children: "整理会议笔记"
            }), (0, t.jsx)("button", {
              type: "button",
              onClick: () => s("loading"),
              children: "完成"
            })]
          }), (0, t.jsxs)("div", {
            className: "scene-controls compact",
            children: [(0, t.jsx)("button", {
              type: "button",
              onClick: () => s("success"),
              children: "返回成功"
            }), (0, t.jsx)("button", {
              type: "button",
              onClick: () => s("error"),
              children: "模拟失败"
            }), (0, t.jsx)("button", {
              type: "button",
              onClick: () => s("idle"),
              children: "重置"
            })]
          })]
        })]
      })
    });
  },
  typescript: function () {
    let [e, s] = (0, a.useState)(!1),
      n = e ? "name" : "nmae";
    return (0, t.jsxs)(eu.xc, {
      label: "JavaScript 和 TypeScript 同一拼写错误对比",
      className: "ts-compare",
      children: [(0, t.jsxs)("div", {
        className: "compare-heading",
        children: [(0, t.jsx)("span", {
          children: "同一个任务：显示用户姓名"
        }), (0, t.jsx)("button", {
          type: "button",
          onClick: () => s(e => !e),
          children: e ? "重新拼错" : "把 nmae 改成 name"
        })]
      }), (0, t.jsxs)("div", {
        className: "same-task-compare",
        children: [(0, t.jsxs)("div", {
          children: [(0, t.jsxs)(eu.KE, {
            filename: "profile.js",
            tone: "js-file",
            children: [(0, t.jsx)(eu.SH, {
              n: "1",
              children: 'const user = { name: "小林" }'
            }), (0, t.jsx)(eu.SH, {
              n: "2",
              children: "title.textContent = user.".concat(n)
            })]
          }), (0, t.jsxs)("div", {
            className: "run-result ".concat(e ? "ok" : "bad"),
            children: [(0, t.jsx)("small", {
              children: "运行网页后"
            }), (0, t.jsx)("strong", {
              children: e ? "小林" : "undefined"
            })]
          })]
        }), (0, t.jsxs)("div", {
          children: [(0, t.jsxs)(eu.KE, {
            filename: "profile.ts",
            tone: "ts-file",
            children: [(0, t.jsx)(eu.SH, {
              n: "1",
              children: 'const user: User = { name: "小林" }'
            }), (0, t.jsx)(eu.SH, {
              n: "2",
              error: !e,
              children: "title.textContent = user.".concat(n)
            })]
          }), (0, t.jsxs)("div", {
            className: "type-result ".concat(e ? "ok" : "bad"),
            children: [(0, t.jsx)("small", {
              children: e ? "✓ 检查通过，可以运行" : "运行前就停在这里"
            }), (0, t.jsx)("strong", {
              children: e ? "没有发现名称问题" : "User 里没有 nmae，你是想写 name 吗？"
            })]
          })]
        })]
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "TypeScript 像写代码时的拼写检查；它能提前拦住这类错误，但不会替你判断业务对不对。"
      })]
    });
  },
  python: function () {
    let [e, s] = (0, a.useState)(!1);
    return (0, t.jsxs)(eu.xc, {
      label: "Python 批量读取文件并生成汇总表图解",
      className: "python-workbench",
      children: [(0, t.jsxs)("div", {
        className: "workbench-grid three-region",
        children: [(0, t.jsxs)("div", {
          className: "project-tree",
          children: [(0, t.jsx)("strong", {
            children: "notes"
          }), (0, t.jsx)("span", {
            children: "▤ 产品计划.md"
          }), (0, t.jsx)("span", {
            children: "▤ 用户访谈.md"
          }), (0, t.jsx)("span", {
            children: "▤ 发布清单.md"
          }), e && (0, t.jsx)("span", {
            className: "active",
            children: "▦ summary.csv"
          })]
        }), (0, t.jsxs)(eu.KE, {
          filename: "summarize.py",
          children: [(0, t.jsx)(eu.SH, {
            n: "1",
            active: !e,
            children: 'for file in Path("notes").glob("*.md"):'
          }), (0, t.jsx)(eu.SH, {
            n: "2",
            children: " title = file.read_text().splitlines()[0]"
          }), (0, t.jsxs)(eu.SH, {
            n: "3",
            active: e,
            children: [" ", "rows.append([file.name, title])"]
          }), (0, t.jsx)(eu.SH, {
            n: "4",
            active: e,
            children: 'write_csv("summary.csv", rows)'
          })]
        }), (0, t.jsx)(eu.BK, {
          children: e ? "$ python summarize.py\n读取 3 个文件\n写入 summary.csv\n✓ 完成" : "$ python summarize.py\n等待运行…"
        })]
      }), (0, t.jsxs)("div", {
        className: "scene-controls compact",
        children: [(0, t.jsx)("button", {
          type: "button",
          onClick: () => s(!0),
          children: "在本机运行脚本"
        }), (0, t.jsx)("button", {
          type: "button",
          onClick: () => s(!1),
          disabled: !e,
          children: "重置"
        })]
      })]
    });
  },
  react: function () {
    let [e, s] = (0, a.useState)(0);
    return (0, t.jsxs)(eu.xc, {
      label: "React 状态更新界面图解",
      className: "react-workbench",
      children: [(0, t.jsxs)("div", {
        className: "workbench-grid two-region",
        children: [(0, t.jsxs)(eu.KE, {
          filename: "Counter.jsx",
          children: [(0, t.jsx)(eu.SH, {
            n: "1",
            active: !0,
            children: "const [count, setCount] = useState(0)"
          }), (0, t.jsx)(eu.SH, {
            n: "2",
            active: e > 0,
            children: "<button onClick={() => setCount(count + 1)}>"
          }), (0, t.jsx)(eu.SH, {
            n: "3",
            children: "  已加入 {count} 件"
          }), (0, t.jsx)(eu.SH, {
            n: "4",
            children: "</button>"
          })]
        }), (0, t.jsx)(eu.Tb, {
          status: "状态里的 count 现在是 ".concat(e),
          children: (0, t.jsxs)("div", {
            className: "shop-preview",
            children: [(0, t.jsx)("span", {
              children: "帆布包"
            }), (0, t.jsx)("b", {
              children: "\xa5 79"
            }), (0, t.jsxs)("button", {
              type: "button",
              onClick: () => s(e => e + 1),
              children: ["已加入 ", (0, t.jsx)("strong", {
                children: e
              }), " 件"]
            })]
          })
        })]
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "按钮读着 count；count 改了，React 就把这块按钮文字换成新值。"
      })]
    });
  },
  vue: function () {
    let [e, s] = (0, a.useState)(0);
    return (0, t.jsxs)(eu.xc, {
      label: "Vue ref 和模板同步图解",
      className: "vue-workbench",
      children: [(0, t.jsxs)("div", {
        className: "workbench-grid two-region",
        children: [(0, t.jsxs)(eu.KE, {
          filename: "Counter.vue",
          children: [(0, t.jsx)(eu.SH, {
            n: "1",
            active: !0,
            children: "const count = ref(0)"
          }), (0, t.jsx)(eu.SH, {
            n: "2",
            active: e > 0,
            children: '<button @click="count++">'
          }), (0, t.jsx)(eu.SH, {
            n: "3",
            children: "  已加入 {{ count }} 件"
          }), (0, t.jsx)(eu.SH, {
            n: "4",
            children: "</button>"
          })]
        }), (0, t.jsx)(eu.Tb, {
          status: "ref 里的 count.value 现在是 ".concat(e),
          children: (0, t.jsxs)("div", {
            className: "shop-preview vue",
            children: [(0, t.jsx)("span", {
              children: "帆布包"
            }), (0, t.jsx)("b", {
              children: "\xa5 79"
            }), (0, t.jsxs)("button", {
              type: "button",
              onClick: () => s(e => e + 1),
              children: ["已加入 ", (0, t.jsx)("strong", {
                children: e
              }), " 件"]
            })]
          })
        })]
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "模板里的 {{ count }} 一直读着这个值；ref 变了，文字就同步变。"
      })]
    });
  },
  nextjs: function () {
    let [e, s] = (0, a.useState)(0),
      n = 1 === e;
    return (0, t.jsxs)(eu.xc, {
      label: "Next.js 文件路由图解",
      className: "next-workbench",
      children: [(0, t.jsx)(eu.tk, {
        items: ["打开 /", "打开 /posts"],
        value: e,
        onChange: s,
        label: "切换网址"
      }), (0, t.jsxs)("div", {
        className: "workbench-grid three-region",
        children: [(0, t.jsxs)("div", {
          className: "project-tree",
          children: [(0, t.jsx)("strong", {
            children: "app"
          }), (0, t.jsx)("span", {
            className: n ? "" : "active",
            children: "⌁ page.tsx"
          }), (0, t.jsx)("span", {
            className: n ? "active" : "",
            children: "⌄ posts"
          }), (0, t.jsx)("span", {
            className: n ? "active indent" : "indent",
            children: "⌁ page.tsx"
          })]
        }), (0, t.jsx)(eu.BK, {
          children: n ? "$ GET /posts\n命中 app/posts/page.tsx\n服务器读取 3 篇文章\n✓ 生成页面" : "$ GET /\n命中 app/page.tsx\n✓ 生成首页"
        }), (0, t.jsx)(eu.Tb, {
          url: "example.com".concat(n ? "/posts" : "/"),
          children: n ? (0, t.jsxs)("div", {
            className: "posts-preview",
            children: [(0, t.jsx)("b", {
              children: "最新文章"
            }), (0, t.jsx)("span", {
              children: "怎么给按钮加状态"
            }), (0, t.jsx)("span", {
              children: "一次请求发生了什么"
            }), (0, t.jsx)("span", {
              children: "从本地到上线"
            })]
          }) : (0, t.jsxs)("div", {
            className: "posts-preview",
            children: [(0, t.jsx)("b", {
              children: "欢迎回来"
            }), (0, t.jsx)("span", {
              children: "从上方网址打开文章列表"
            })]
          })
        })]
      })]
    });
  },
  "tailwind-css": function () {
    let [e, s] = (0, a.useState)([!0, !1, !1]);
    return (0, t.jsxs)(eu.xc, {
      label: "Tailwind 类名改变卡片外观图解",
      className: "tailwind-workbench",
      children: [(0, t.jsxs)("div", {
        className: "tailwind-code-line",
        children: ['<article class="', ["p-6", "rounded-xl", "border"].map((n, a) => (0, t.jsx)("button", {
          type: "button",
          className: e[a] ? "on" : "",
          onClick: () => s(e => e.map((e, s) => s === a ? !e : e)),
          children: n
        }, n)), '">']
      }), (0, t.jsxs)("div", {
        className: "tailwind-result",
        children: [(0, t.jsx)("div", {
          className: "computed-rules",
          children: ["padding: 24px", "border-radius: 12px", "border: 1px solid"].map((s, n) => (0, t.jsxs)("span", {
            className: e[n] ? "on" : "",
            children: [e[n] ? "✓" : "○", " ", s]
          }, s))
        }), (0, t.jsxs)("div", {
          className: "tailwind-card ".concat(e[0] ? "has-padding" : "", " ").concat(e[1] ? "has-radius" : "", " ").concat(e[2] ? "has-border" : ""),
          children: [(0, t.jsx)("small", {
            children: "产品更新"
          }), (0, t.jsx)("strong", {
            children: "新版本已经上线"
          }), (0, t.jsx)("p", {
            children: "点上面的类名，观察这张卡片哪一处改变。"
          })]
        })]
      })]
    });
  },
  "shadcn-ui": function () {
    let [e, s] = (0, a.useState)(0);
    return (0, t.jsxs)(eu.xc, {
      label: "shadcn 组件代码进入项目图解",
      className: "shadcn-workbench",
      onPrevious: () => s(Math.max(0, e - 1)),
      onNext: () => s(Math.min(2, e + 1)),
      children: [(0, t.jsx)(eu.tk, {
        items: ["添加前", "加入 Button", "改成圆角"],
        value: e,
        onChange: s
      }), (0, t.jsxs)("div", {
        className: "workbench-grid three-region",
        children: [(0, t.jsx)(eu.BK, {
          children: 0 === e ? "$ ls components/ui\n（还没有 Button）" : "$ npx shadcn@latest add button\n✓ 写入 components/ui/button.tsx"
        }), (0, t.jsxs)("div", {
          className: "project-and-code",
          children: [(0, t.jsxs)("div", {
            className: "project-tree",
            children: [(0, t.jsx)("strong", {
              children: "components / ui"
            }), e > 0 && (0, t.jsx)("span", {
              className: "active",
              children: "⌁ button.tsx"
            })]
          }), e > 0 && (0, t.jsxs)(eu.KE, {
            filename: "button.tsx",
            children: [(0, t.jsx)(eu.SH, {
              n: "1",
              active: 2 === e,
              children: 'const styles = "'.concat(2 === e ? "rounded-full" : "rounded-md", ' px-4 py-2"')
            }), (0, t.jsx)(eu.SH, {
              n: "2",
              children: "export function Button(...) { ... }"
            })]
          })]
        }), (0, t.jsx)(eu.Tb, {
          children: (0, t.jsxs)("div", {
            className: "button-preview",
            children: [(0, t.jsx)("small", {
              children: "页面引用的是项目里的文件"
            }), (0, t.jsx)("button", {
              type: "button",
              className: 2 === e ? "pill" : "",
              children: 0 === e ? "普通按钮" : "保存修改"
            })]
          })
        })]
      })]
    });
  },
  "ai-basics": function () {
    let {
      index: e,
      select: s
    } = (0, ex.B)(eN.length);
    return (0, t.jsxs)(eu.xc, {
      label: "查日程时模型与应用的分工流程",
      className: "ai-task-scene",
      onPrevious: () => s(e - 1),
      onNext: () => s(e + 1),
      children: [(0, t.jsxs)("p", {
        className: "calendar-task-prompt",
        children: [(0, t.jsx)("span", {
          children: "用户请求"
        }), " 帮我查明天下午有没有空？"]
      }), (0, t.jsx)("ol", {
        className: "ai-calendar-flow",
        "aria-live": "polite",
        children: eN.map((n, a) => (0, t.jsx)("li", {
          className: a === e ? "current" : a < e ? "complete" : "",
          children: (0, t.jsxs)("button", {
            type: "button",
            className: "visual-selectable",
            "aria-pressed": a === e,
            onClick: () => s(a),
            children: [(0, t.jsx)("span", {
              "aria-hidden": "true",
              children: a + 1
            }), (0, t.jsx)("small", {
              children: n.actor
            }), (0, t.jsx)("strong", {
              children: n.label
            }), (0, t.jsx)("p", {
              children: n.detail
            })]
          })
        }, n.label))
      })]
    });
  },
  multimodal: function () {
    return (0, t.jsxs)(eu.xc, {
      label: "多模态输入与输出关系图解",
      className: "multimodal-scene",
      children: [(0, t.jsxs)("div", {
        className: "multimodal-heading",
        children: [(0, t.jsx)("strong", {
          children: "当前案例：用截图排查付款按钮为什么消失"
        }), (0, t.jsxs)("span", {
          children: [(0, t.jsx)("i", {}), "主题色表示本次实际使用"]
        })]
      }), (0, t.jsxs)("div", {
        className: "multimodal-flow",
        children: [(0, t.jsx)(eR, {
          title: "输入模态",
          description: "交给 AI 的内容",
          activeIds: ["text", "image"]
        }), (0, t.jsx)("span", {
          className: "multimodal-arrow",
          "aria-hidden": "true",
          children: "→"
        }), (0, t.jsxs)("div", {
          className: "multimodal-core",
          children: [(0, t.jsx)("i", {
            className: "ti ti-sparkles",
            "aria-hidden": "true"
          }), (0, t.jsx)("strong", {
            children: "AI 模型 / 系统"
          }), (0, t.jsx)("span", {
            children: "按实际能力处理"
          })]
        }), (0, t.jsx)("span", {
          className: "multimodal-arrow",
          "aria-hidden": "true",
          children: "→"
        }), (0, t.jsx)(eR, {
          title: "输出模态",
          description: "AI 返回的结果",
          activeIds: ["text"]
        })]
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "这次是文字和图片输入、文字输出；支持图片输入，不等于支持图片输出。"
      })]
    });
  },
  token: function () {
    let [e, s] = (0, a.useState)(0),
      n = [{
        text: "请修复 loginButton.tsx",
        pieces: ["请", "修复", " login", "Button", ".", "tsx"],
        output: ["已", "修复", "按钮"]
      }, {
        text: "把按钮改成 Save",
        pieces: ["把", "按钮", "改成", " Save"],
        output: ["Done", ":", " Save"]
      }][e];
    return (0, t.jsxs)(eu.xc, {
      label: "Token 切片与输入输出计数图解",
      className: "token-scene",
      children: [(0, t.jsx)(eu.tk, {
        items: ["中英代码名", "短句"],
        value: e,
        onChange: s
      }), (0, t.jsxs)("div", {
        className: "token-source",
        children: [(0, t.jsx)("small", {
          children: "你输入的文字"
        }), (0, t.jsx)("strong", {
          children: n.text
        })]
      }), (0, t.jsx)("div", {
        className: "token-pieces",
        "aria-label": "Token 切分示意",
        children: n.pieces.map((e, s) => (0, t.jsxs)("span", {
          children: [(0, t.jsx)("i", {
            children: s + 1
          }), e]
        }, "".concat(e, "-").concat(s)))
      }), (0, t.jsxs)("div", {
        className: "usage-receipt",
        children: [(0, t.jsxs)("span", {
          children: ["输入 ", (0, t.jsx)("b", {
            children: n.pieces.length
          }), " 个示意片段"]
        }), (0, t.jsxs)("span", {
          children: ["输出 ", (0, t.jsx)("b", {
            children: n.output.length
          }), " 个示意片段"]
        }), (0, t.jsx)("code", {
          children: "usage = input + output"
        })]
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "这是切片关系示意，不代表任何具体模型的精确 Token 结果。"
      })]
    });
  },
  "context-window": function () {
    let [e, s] = (0, a.useState)(3),
      n = ey.slice(0, e).reduce((e, s) => e + s.tokens, 0),
      i = n + 200 > 1e3;
    return (0, t.jsxs)(eu.xc, {
      label: "上下文窗口装入真实消息与文件图解",
      className: "context-scene",
      onPrevious: () => s(Math.max(1, e - 1)),
      onNext: () => s(Math.min(ey.length, e + 1)),
      children: [(0, t.jsxs)("div", {
        className: "context-request-head",
        children: [(0, t.jsx)("span", {
          children: "本次请求最多 1000 个示意 Token"
        }), (0, t.jsxs)("b", {
          className: i ? "over" : "",
          children: [n, " 输入 + ", 200, " 输出预留"]
        })]
      }), (0, t.jsxs)("div", {
        className: "context-capacity",
        children: [(0, t.jsx)("div", {
          className: "context-used",
          style: {
            width: "".concat(Math.min(100, n / 1e3 * 100), "%")
          }
        }), (0, t.jsx)("div", {
          className: "context-reserve",
          style: {
            width: "".concat(20, "%")
          }
        })]
      }), (0, t.jsx)("div", {
        className: "context-real-objects",
        children: ey.slice(0, e).map(e => (0, t.jsxs)("div", {
          className: "".concat(e.kind).concat("noise" === e.kind && i ? " rejected" : ""),
          children: [(0, t.jsx)("strong", {
            children: e.label
          }), (0, t.jsxs)("span", {
            children: [e.tokens, " Token（示意）"]
          })]
        }, e.label))
      }), (0, t.jsx)("div", {
        className: "context-decision ".concat(i ? "warn" : ""),
        children: i ? "放不下：先移除无关文件，或把较早对话整理成摘要。" : "仍放得下，并且给模型回答留了位置。"
      }), (0, t.jsxs)("div", {
        className: "scene-controls compact",
        children: [(0, t.jsx)("button", {
          type: "button",
          onClick: () => s(Math.min(ey.length, e + 1)),
          disabled: e === ey.length,
          children: "再放一项"
        }), (0, t.jsx)("button", {
          type: "button",
          onClick: () => s(Math.max(1, e - 1)),
          disabled: 1 === e,
          children: "移除最后一项"
        }), (0, t.jsx)("button", {
          type: "button",
          onClick: () => s(3),
          children: "重置"
        })]
      })]
    });
  },
  "system-prompt": function () {
    let [e, s] = (0, a.useState)(0);
    return (0, t.jsxs)(eu.xc, {
      label: "系统提示词与应用权限边界图解",
      className: "system-scene",
      onPrevious: () => s(Math.max(0, e - 1)),
      onNext: () => s(Math.min(2, e + 1)),
      children: [(0, t.jsx)(eu.tk, {
        items: ["收到要求", "模型提出动作", "应用拦截"],
        value: e,
        onChange: s
      }), (0, t.jsxs)("div", {
        className: "message-stack",
        children: [(0, t.jsxs)("div", {
          className: "system-message",
          children: [(0, t.jsx)("small", {
            children: "system"
          }), (0, t.jsx)("p", {
            children: "删除项目前，先说明范围并请求用户确认。"
          })]
        }), (0, t.jsxs)("div", {
          className: "user-message",
          children: [(0, t.jsx)("small", {
            children: "user"
          }), (0, t.jsx)("p", {
            children: "把旧项目都删掉。"
          })]
        })]
      }), (0, t.jsxs)("div", {
        className: "permission-gate",
        children: [(0, t.jsxs)("div", {
          className: e >= 1 ? "active" : "",
          children: [(0, t.jsx)("small", {
            children: "模型输出"
          }), (0, t.jsx)("code", {
            children: 'delete_projects(scope: "old")'
          })]
        }), (0, t.jsx)("span", {
          children: "→"
        }), (0, t.jsxs)("div", {
          className: e >= 2 ? "blocked" : "",
          children: [(0, t.jsx)("small", {
            children: "应用权限检查"
          }), (0, t.jsx)("strong", {
            children: e < 2 ? "等待动作" : "暂停：范围不清楚，需要确认"
          })]
        })]
      })]
    });
  },
  "conversation-history": function () {
    let [e, s] = (0, a.useState)(!0);
    return (0, t.jsxs)(eu.xc, {
      label: "有无对话历史时第二轮请求对比",
      className: "history-scene",
      children: [(0, t.jsx)(eu.tk, {
        items: ["带上上一轮", "不带上一轮"],
        value: +!e,
        onChange: e => s(0 === e)
      }), (0, t.jsxs)("div", {
        className: "history-layout",
        children: [(0, t.jsxs)("div", {
          className: "chat-crop",
          children: [(0, t.jsx)("small", {
            children: "第 1 轮 \xb7 用户"
          }), (0, t.jsx)("p", {
            children: "写三个标题：快速开始、常见问题、联系我们。"
          }), (0, t.jsx)("small", {
            children: "第 2 轮 \xb7 用户"
          }), (0, t.jsx)("p", {
            children: "把第二条改短。"
          })]
        }), (0, t.jsxs)("div", {
          className: "request-envelope",
          children: [(0, t.jsx)("strong", {
            children: "第 2 轮真正发送的 messages"
          }), e && (0, t.jsxs)("code", {
            children: ["user: 写三个标题…", (0, t.jsx)("br", {}), "assistant: 1. 快速开始 2. 常见问题 3. 联系我们"]
          }), (0, t.jsx)("code", {
            children: "user: 把第二条改短"
          }), (0, t.jsx)("div", {
            className: e ? "answer ok" : "answer bad",
            children: e ? "✓ 2. 问题" : "无法判断“第二条”指什么"
          })]
        })]
      })]
    });
  },
  "stateless-request": function () {
    let [e, s] = (0, a.useState)(!1);
    return (0, t.jsxs)(eu.xc, {
      label: "无状态请求是否携带必要信息对比",
      className: "stateless-scene",
      children: [(0, t.jsx)(eu.tk, {
        items: ["第二次只发“继续”", "第二次重新带上资料"],
        value: +!!e,
        onChange: e => s(1 === e)
      }), (0, t.jsxs)("div", {
        className: "request-pair",
        children: [(0, t.jsxs)("div", {
          children: [(0, t.jsx)("small", {
            children: "请求 1"
          }), (0, t.jsxs)("code", {
            children: ["task: 把标题改短", (0, t.jsx)("br", {}), "title: 新手快速入门指南"]
          }), (0, t.jsx)("strong", {
            children: "响应：新手入门"
          })]
        }), (0, t.jsx)("span", {
          children: "下一次调用"
        }), (0, t.jsxs)("div", {
          children: [(0, t.jsx)("small", {
            children: "请求 2"
          }), (0, t.jsx)("code", {
            children: e ? "task: 继续改短\ntitle: 新手入门" : "message: 继续"
          }), (0, t.jsx)("strong", {
            className: e ? "ok" : "bad",
            children: e ? "响应：入门" : "响应：要继续什么？"
          })]
        })]
      })]
    });
  },
  "structured-output": function () {
    let [e, s] = (0, a.useState)(0);
    return (0, t.jsxs)(eu.xc, {
      label: "邮件转成结构化数据并校验图解",
      className: "structured-scene",
      onPrevious: () => s(Math.max(0, e - 1)),
      onNext: () => s(Math.min(2, e + 1)),
      children: [(0, t.jsx)(eu.tk, {
        items: ["读邮件", "生成字段", "检查字段"],
        value: e,
        onChange: s
      }), (0, t.jsxs)("div", {
        className: "structured-layout",
        children: [(0, t.jsxs)("div", {
          className: "mail-evidence",
          children: [(0, t.jsx)("small", {
            children: "邀请邮件"
          }), (0, t.jsx)("p", {
            children: "下周三下午 3 点，在 A301 开产品评审。负责人是小林。"
          })]
        }), (0, t.jsx)("span", {
          children: "→"
        }), (0, t.jsxs)("div", {
          className: "json-evidence",
          children: [(0, t.jsx)("small", {
            children: "模型返回 JSON"
          }), (0, t.jsxs)("code", {
            children: ["{", (0, t.jsx)("br", {}), ' "date": "下周三",', (0, t.jsx)("br", {}), ' "time": "15:00",', (0, t.jsx)("br", {}), ' "room": "A301"', (0, t.jsx)("br", {}), "}"]
          })]
        }), (0, t.jsx)("span", {
          children: "→"
        }), (0, t.jsxs)("div", {
          className: "validator-evidence ".concat(2 === e ? "bad" : ""),
          children: [(0, t.jsx)("small", {
            children: "程序校验"
          }), (0, t.jsx)("strong", {
            children: e < 2 ? "等待检查" : "date 需要 YYYY-MM-DD，不能直接写“下周三”"
          })]
        })]
      })]
    });
  },
  "streaming-response": function () {
    let [e, s] = (0, a.useState)(0);
    return (0, t.jsxs)(eu.xc, {
      label: "流式响应片段逐段到达图解",
      className: "stream-scene",
      onPrevious: () => s(Math.max(0, e - 1)),
      onNext: () => s(Math.min(ew.length, e + 1)),
      children: [(0, t.jsxs)("div", {
        className: "stream-timeline",
        children: [(0, t.jsx)("span", {
          className: e > 0 ? "on" : "",
          children: "示意 0.8s \xb7 首段"
        }), (0, t.jsx)("i", {}), (0, t.jsx)("span", {
          className: e === ew.length ? "on" : "",
          children: "示意 3.2s \xb7 完成"
        })]
      }), (0, t.jsxs)("div", {
        className: "stream-chat",
        children: [(0, t.jsx)("small", {
          children: "AI"
        }), (0, t.jsxs)("p", {
          "aria-live": "polite",
          children: [ew.slice(0, e).join("") || "内容会显示在这里…", (0, t.jsx)("i", {
            className: e > 0 && e < ew.length ? "caret" : ""
          })]
        }), (0, t.jsx)("b", {
          children: 0 === e ? "等待首段" : e === ew.length ? "响应完成" : "已经收到 ".concat(e, " / ").concat(ew.length, " 段")
        })]
      }), (0, t.jsx)("div", {
        className: "stream-events",
        children: ew.map((s, n) => (0, t.jsxs)("span", {
          className: n < e ? "received" : "",
          children: ["event ", n + 1]
        }, s))
      }), (0, t.jsxs)("div", {
        className: "scene-controls compact",
        children: [(0, t.jsx)("button", {
          type: "button",
          onClick: () => s(Math.min(ew.length, e + 1)),
          disabled: e === ew.length,
          children: "下一段"
        }), (0, t.jsx)("button", {
          type: "button",
          onClick: () => s(0),
          disabled: 0 === e,
          children: "重置"
        })]
      })]
    });
  },
  "tool-calling": function () {
    let e = ["用户提问", "模型请求工具", "应用查询", "结果回传", "生成回答"],
      {
        index: s,
        select: n
      } = (0, ex.B)(e.length);
    return (0, t.jsx)(eu.xc, {
      label: "工具调用从请求到结果图解",
      className: "tool-scene",
      onPrevious: () => n(s - 1),
      onNext: () => n(s + 1),
      children: (0, t.jsxs)("div", {
        className: "tool-stage",
        children: [(0, t.jsxs)("div", {
          className: "calendar-crop",
          children: [(0, t.jsx)("div", {
            children: "明天"
          }), (0, t.jsx)("span", {
            children: "13:00 项目会"
          }), (0, t.jsx)("span", {
            className: "free",
            children: "15:00 空闲"
          }), (0, t.jsx)("span", {
            children: "16:00 评审"
          }), (0, t.jsx)("span", {
            className: "free",
            children: "17:30 空闲"
          })]
        }), (0, t.jsxs)("div", {
          className: "current-evidence",
          "aria-live": "polite",
          children: [(0, t.jsx)(eu.hV, {
            items: e,
            index: s,
            onSelect: n,
            label: "工具调用阶段"
          }), (0, t.jsx)("strong", {
            children: e[s]
          }), (0, t.jsx)("pre", {
            children: ["帮我查明天下午有没有空。", '{ "tool": "calendar.find_free_time", "date": "tomorrow", "period": "afternoon" }', "权限：只读日历 ✓\n正在查询 13:00–18:00", '{ "available": ["15:00-16:00", "17:30-18:00"] }', "明天下午 15:00–16:00 和 17:30–18:00 有空。"][s]
          }), (0, t.jsx)("b", {
            children: 1 === s ? "这只是模型提出的请求，还没有查询日历" : 2 === s ? "应用检查权限后才真的访问日历" : ""
          })]
        })]
      })
    });
  },
  "react-pattern": function () {
    let {
        index: e,
        select: s
      } = (0, ex.B)(eS.length),
      n = eS[e];
    return (0, t.jsx)(eu.xc, {
      label: "ReAct 在真实文件和工具结果之间推进图解",
      className: "react-agent-scene",
      onPrevious: () => s(e - 1),
      onNext: () => s(e + 1),
      children: (0, t.jsxs)("div", {
        className: "agent-workspace",
        children: [(0, t.jsx)(eu.KE, {
          filename: n.file,
          children: (0, t.jsx)(eu.SH, {
            n: "1",
            active: !0,
            children: n.line
          })
        }), (0, t.jsxs)("div", {
          className: "agent-evidence",
          children: [(0, t.jsx)(eu.hV, {
            items: eS.map(e => e.label),
            index: e,
            onSelect: s,
            label: "ReAct 阶段"
          }), (0, t.jsx)("strong", {
            children: n.evidence
          }), (0, t.jsx)("span", {
            children: ["初步判断", "真实观察", "改变方向", "根据证据修改", "可核对结果"][e]
          })]
        })]
      })
    });
  },
  "agent-loop": function () {
    let {
        index: e,
        select: s
      } = (0, ex.B)(eA.length),
      n = eA[e];
    return (0, t.jsxs)(eu.xc, {
      label: "Agent 循环控制器逐轮执行图解",
      className: "loop-scene",
      onPrevious: () => s(e - 1),
      onNext: () => s(e + 1),
      children: [(0, t.jsxs)("div", {
        className: "loop-controller",
        children: [(0, t.jsxs)("div", {
          className: "controller-state",
          children: [(0, t.jsx)("small", {
            children: "Agent 运行时"
          }), (0, t.jsxs)("strong", {
            children: ["第 ", n.round, " 轮 \xb7 同类失败上限 2 次"]
          }), (0, t.jsx)("span", {
            className: "完成" === n.status ? "done" : "",
            children: n.status
          }), (0, t.jsxs)("div", {
            children: [(0, t.jsx)("i", {
              children: "工具权限：项目文件"
            }), (0, t.jsx)("i", {
              children: "高风险动作：需要确认"
            })]
          })]
        }), (0, t.jsxs)("div", {
          className: "current-evidence",
          children: [(0, t.jsx)(eu.hV, {
            items: eA.map(e => e.label),
            index: e,
            onSelect: s,
            label: "Agent 循环阶段"
          }), (0, t.jsx)("strong", {
            children: n.label
          }), (0, t.jsx)("pre", {
            children: n.evidence
          })]
        })]
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "检查失败时继续，达到上限或需要确认时暂停，验收通过后结束。"
      })]
    });
  },
  "response-speed": function () {
    let [e, s] = (0, a.useState)(0),
      n = [{
        label: "回答 A",
        ttft: 1.2,
        tps: 40,
        total: 6.2,
        first: 20,
        generate: 64
      }, {
        label: "回答 B",
        ttft: .4,
        tps: 18,
        total: 11.5,
        first: 8,
        generate: 82
      }],
      i = n[e];
    return (0, t.jsxs)(eu.xc, {
      label: "TTFT TPS 和总时长时间线图解",
      className: "speed-scene",
      children: [(0, t.jsx)(eu.tk, {
        items: n.map(e => e.label),
        value: e,
        onChange: s,
        label: "切换同一任务的两次回答"
      }), (0, t.jsx)("p", {
        className: "visual-data-note",
        children: "以下时间和速度均为示意，只用来比较指标之间的关系。"
      }), (0, t.jsxs)("div", {
        className: "speed-timeline",
        children: [(0, t.jsxs)("div", {
          className: "speed-axis",
          children: [(0, t.jsx)("span", {
            children: "发送请求"
          }), (0, t.jsx)("i", {}), (0, t.jsx)("span", {
            children: "收到第一个 Token"
          }), (0, t.jsx)("i", {}), (0, t.jsx)("span", {
            children: "回答完成"
          })]
        }), (0, t.jsxs)("div", {
          className: "speed-bars",
          children: [(0, t.jsxs)("div", {
            className: "ttft",
            style: {
              width: "".concat(i.first, "%")
            },
            children: [(0, t.jsxs)("b", {
              children: ["TTFT ", i.ttft, "s"]
            }), (0, t.jsx)("small", {
              children: "先等多久"
            })]
          }), (0, t.jsxs)("div", {
            className: "tps",
            style: {
              width: "".concat(i.generate, "%")
            },
            children: [(0, t.jsxs)("b", {
              children: [i.tps, " TPS"]
            }), (0, t.jsx)("small", {
              children: "开始后每秒生成多少 Token"
            })]
          })]
        }), (0, t.jsxs)("strong", {
          className: "total-time",
          children: ["总时长 ", i.total, "s"]
        })]
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "B 更早开始说话，但后面生成得慢，所以完整回答反而更晚结束。"
      })]
    });
  },
  "token-cost": function () {
    let {
        index: e,
        select: s
      } = (0, ex.B)(eT.length),
      n = eT.slice(0, e + 1),
      a = n.reduce((e, s) => e + s.input, 0),
      i = n.reduce((e, s) => e + s.output, 0);
    return (0, t.jsxs)(eu.xc, {
      label: "多轮 Token 用量累计图解",
      className: "cost-scene",
      onPrevious: () => s(e - 1),
      onNext: () => s(e + 1),
      children: [(0, t.jsx)("p", {
        className: "visual-data-note",
        children: "以下轮次和 Token 数量均为示意。"
      }), (0, t.jsx)("div", {
        className: "usage-ledger",
        role: "group",
        "aria-label": "选择累计到哪一轮",
        children: eT.map((n, a) => (0, t.jsxs)("button", {
          type: "button",
          className: "visual-selectable".concat(a === e ? " on" : "").concat(a < e ? " included" : ""),
          "aria-pressed": a === e,
          onClick: () => s(a),
          children: [(0, t.jsx)("strong", {
            children: n.task
          }), (0, t.jsxs)("span", {
            children: ["输入 ", n.input.toLocaleString()]
          }), (0, t.jsxs)("span", {
            children: ["输出 ", n.output.toLocaleString()]
          })]
        }, n.task))
      }), (0, t.jsxs)("div", {
        className: "cost-total",
        children: [(0, t.jsx)("span", {
          children: "三轮累计到现在"
        }), (0, t.jsxs)("strong", {
          children: [(a + i).toLocaleString(), " Token"]
        }), (0, t.jsxs)("small", {
          children: ["输入 ", a.toLocaleString(), " + 输出 ", i.toLocaleString()]
        })]
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "每轮都会重新带上必要规则、历史和新结果；费用不是只看最后一句回答。"
      })]
    });
  },
  "rate-limit": function () {
    let {
        index: e,
        select: s
      } = (0, ex.B)(eC.length),
      n = eC[e];
    return (0, t.jsxs)(eu.xc, {
      label: "队列并发与 429 重试图解",
      className: "rate-scene",
      onPrevious: () => s(e - 1),
      onNext: () => s(e + 1),
      children: [(0, t.jsx)("p", {
        className: "visual-data-note",
        children: "队列数量、并发数和等待时间均为示意。"
      }), (0, t.jsxs)("div", {
        className: "rate-layout",
        children: [(0, t.jsxs)("div", {
          className: "job-queue",
          children: [(0, t.jsx)("strong", {
            children: "500 篇摘要任务"
          }), Array.from({
            length: 8
          }, (s, n) => (0, t.jsxs)("i", {
            className: n < 3 && 0 === e ? "running" : "",
            children: ["#", n + 1]
          }, n))]
        }), (0, t.jsx)("div", {
          className: "worker-lanes",
          children: [0, 1, 2].map(e => (0, t.jsxs)("div", {
            className: e < n.workers ? "active" : "",
            children: [(0, t.jsxs)("span", {
              children: ["worker ", e + 1]
            }), (0, t.jsx)("b", {
              children: e < n.workers ? "正在请求" : "等待"
            })]
          }, e))
        }), (0, t.jsxs)("div", {
          className: "rate-response ".concat(n.tone),
          children: [(0, t.jsx)(eu.hV, {
            items: eC.map(e => e.label),
            index: e,
            onSelect: s,
            label: "限流处理阶段"
          }), (0, t.jsx)("strong", {
            children: n.label
          }), (0, t.jsx)("code", {
            children: n.message
          })]
        })]
      })]
    });
  },
  "vibe-coding": function () {
    let {
        index: e,
        select: s
      } = (0, ex.B)(eI.length),
      n = eI[e],
      a = eI.slice(0, e + 1).flatMap(e => e.messages);
    return (0, t.jsxs)(eu.xc, {
      label: "Vibe Coding 对话迭代图解",
      className: "vibe-scene",
      onPrevious: () => s(e - 1),
      onNext: () => s(e + 1),
      children: [(0, t.jsx)(eu.hV, {
        items: eI.map(e => e.note),
        index: e,
        onSelect: s,
        label: "选择对话轮次",
        className: "vibe-round-choices"
      }), (0, t.jsxs)("div", {
        className: "vibe-layout",
        children: [(0, t.jsxs)("div", {
          className: "vibe-chat",
          children: [(0, t.jsxs)("div", {
            className: "vibe-chat-head",
            children: [(0, t.jsx)("i", {
              className: "ti ti-sparkles",
              "aria-hidden": "true"
            }), "AI 编码助手"]
          }), (0, t.jsx)("div", {
            className: "vibe-chat-body",
            children: a.map((e, s) => (0, t.jsxs)("div", {
              className: "vibe-msg ".concat(e.from).concat(s >= a.length - n.messages.length ? " fresh" : ""),
              children: [(0, t.jsx)("small", {
                children: "user" === e.from ? "你" : "AI"
              }), (0, t.jsx)("p", {
                children: e.text
              })]
            }, "".concat(e.from, "-").concat(s)))
          })]
        }), (0, t.jsxs)("div", {
          className: "vibe-work",
          children: [n.code.length > 0 ? (0, t.jsx)(eu.KE, {
            filename: "todo.jsx",
            children: n.code.filter(e => !!e).map(e => (0, t.jsx)(eu.SH, {
              n: e.n,
              active: !!e.changed,
              children: e.text
            }, "".concat(e.n, "-").concat(e.text)))
          }) : (0, t.jsxs)("div", {
            className: "vibe-idle-file",
            children: [(0, t.jsx)("i", {
              className: "ti ti-file-plus",
              "aria-hidden": "true"
            }), (0, t.jsx)("span", {
              children: "todo.jsx 等待创建"
            })]
          }), (0, t.jsx)(eu.Tb, {
            url: "localhost:3000",
            children: (0, t.jsx)(eM, {
              state: n.preview
            })
          })]
        })]
      }), (0, t.jsx)("p", {
        className: "vibe-caption",
        children: n.caption
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "自然语言负责推进，运行结果负责纠偏，检查与测试负责兜底。"
      })]
    });
  },
  mvp: function () {
    let [e, s] = (0, a.useState)(!1);
    return (0, t.jsxs)(eu.xc, {
      label: "MVP 与完整产品对比图解",
      className: "mvp-scene",
      children: [(0, t.jsxs)("p", {
        className: "mvp-hypothesis",
        children: [(0, t.jsx)("span", {
          children: "同一个待验证假设"
        }), "自由职业者愿意为“自动催款”付费"]
      }), (0, t.jsxs)("div", {
        className: "mvp-compare",
        children: [(0, t.jsxs)("div", {
          className: "mvp-side",
          children: [(0, t.jsxs)("header", {
            children: [(0, t.jsx)("strong", {
              children: "完整产品"
            }), (0, t.jsx)("span", {
              children: "先把想得到的都做出来"
            })]
          }), (0, t.jsx)(eO, {}), (0, t.jsxs)("ul", {
            className: "mvp-facts",
            children: [(0, t.jsxs)("li", {
              children: [(0, t.jsx)("small", {
                children: "功能"
              }), "12+ 个模块"]
            }), (0, t.jsxs)("li", {
              children: [(0, t.jsx)("small", {
                children: "投入"
              }), "约 6 个月"]
            }), (0, t.jsxs)("li", {
              children: [(0, t.jsx)("small", {
                children: "验证"
              }), "上线后才知道"]
            })]
          }), e && (0, t.jsxs)("div", {
            className: "mvp-result bad",
            children: [(0, t.jsx)("b", {
              children: "第 6 个月"
            }), "才发现没人愿意付费，投入已无法收回"]
          })]
        }), (0, t.jsxs)("div", {
          className: "mvp-side lean",
          children: [(0, t.jsxs)("header", {
            children: [(0, t.jsx)("strong", {
              children: "MVP"
            }), (0, t.jsx)("span", {
              children: "只验证最危险的假设"
            })]
          }), (0, t.jsx)(eD, {}), (0, t.jsxs)("ul", {
            className: "mvp-facts",
            children: [(0, t.jsxs)("li", {
              children: [(0, t.jsx)("small", {
                children: "功能"
              }), "1 个核心动作"]
            }), (0, t.jsxs)("li", {
              children: [(0, t.jsx)("small", {
                children: "投入"
              }), "约 2 周"]
            }), (0, t.jsxs)("li", {
              children: [(0, t.jsx)("small", {
                children: "验证"
              }), "第 1 周就有真实付费"]
            })]
          }), e && (0, t.jsxs)("div", {
            className: "mvp-result ok",
            children: [(0, t.jsx)("b", {
              children: "20 人看到报价，5 人真的付费"
            }), "假设有支撑，继续投入"]
          })]
        })]
      }), (0, t.jsxs)("div", {
        className: "scene-controls compact",
        children: [(0, t.jsx)("button", {
          type: "button",
          onClick: () => s(!0),
          disabled: e,
          children: "两种做法都开始验证"
        }), (0, t.jsx)("button", {
          type: "button",
          onClick: () => s(!1),
          disabled: !e,
          children: "重置"
        })]
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "MVP 不是把完整产品做薄，而是用最小投入先验证最可能让产品失败的那个假设。"
      })]
    });
  },
  prd: function () {
    let e = (0, a.useContext)(ep.gq),
      {
        index: s,
        select: n
      } = (0, ex.B)(eq.length),
      i = eq[s],
      r = eB[i.id];
    return (0, t.jsxs)(eu.xc, {
      label: "一份 PRD 从背景到验收的写法图解",
      className: "prd-scene",
      onPrevious: () => n(s - 1),
      onNext: () => n(s + 1),
      children: [(0, t.jsxs)("div", {
        className: "prd-layout",
        children: [(0, t.jsx)("div", {
          className: "prd-toc",
          role: "group",
          "aria-label": "PRD 章节",
          children: eq.map((e, a) => (0, t.jsxs)("button", {
            type: "button",
            className: "visual-selectable".concat(a === s ? " on" : a < s ? " done" : ""),
            "aria-pressed": a === s,
            onClick: () => n(a),
            children: [(0, t.jsx)("i", {
              children: a < s ? "✓" : a + 1
            }), (0, t.jsx)("span", {
              children: e.title
            })]
          }, e.id))
        }), (0, t.jsxs)("div", {
          className: "prd-doc",
          children: [(0, t.jsxs)("div", {
            className: "prd-doc-head",
            children: [(0, t.jsx)("strong", {
              children: "PRD \xb7 会议纪要一键导出"
            }), (0, t.jsx)("span", {
              children: "v0.3 \xb7 评审中"
            })]
          }), (0, t.jsxs)("div", {
            className: "prd-doc-sec",
            "aria-live": "polite",
            children: [(0, t.jsx)("small", {
              children: "en" === e ? "Section ".concat(s + 1, " of ").concat(eq.length) : (0, t.jsxs)(t.Fragment, {
                children: ["第 ", s + 1, " 节 / 共 ", eq.length, " 节"]
              })
            }), (0, t.jsx)("strong", {
              children: i.title
            })]
          }), (0, t.jsx)(r, {})]
        })]
      }), (0, t.jsx)("p", {
        className: "scene-caption",
        "aria-live": "polite",
        children: i.caption
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "PRD 按“背景 → 目标 → 概念 → 原型 → 范围 → 验收”把判断逐层对齐，技术方案可以链接进来，但不替它做决定。"
      })]
    });
  },
  "user-flow": function () {
    let {
        index: e,
        select: s
      } = (0, ex.B)(eF.length),
      n = e === eF.length - 1;
    return (0, t.jsxs)(eu.xc, {
      label: "User Flow 预约流程分支图解",
      className: "uf-scene",
      onPrevious: () => s(e - 1),
      onNext: () => s(e + 1),
      children: [(0, t.jsxs)("div", {
        className: "uf-flow",
        children: [(0, t.jsx)("div", {
          className: "uf-main",
          children: eL.map((a, i) => (0, t.jsxs)("div", {
            className: "uf-leg",
            children: [(0, t.jsxs)("button", {
              type: "button",
              className: "uf-step uf-".concat(a.kind, " visual-selectable").concat(n || i !== e ? "" : " current"),
              "aria-pressed": !n && i === e,
              onClick: () => s(i),
              children: [(0, t.jsx)("small", {
                children: a.who
              }), (0, t.jsx)("strong", {
                children: a.label
              })]
            }), i < eL.length - 1 && (0, t.jsx)("i", {
              className: "uf-arrow",
              "aria-hidden": "true",
              children: "judge" === a.kind ? "是 →" : "→"
            })]
          }, a.id))
        }), (0, t.jsx)("div", {
          className: "uf-branches",
          children: eH.map((a, i) => (0, t.jsxs)("button", {
            type: "button",
            className: "uf-branch visual-selectable".concat(n || e === a.from ? " current" : ""),
            "aria-pressed": n,
            onClick: () => s(eF.length - 1),
            children: [(0, t.jsx)("small", {
              children: "否 ↳"
            }), (0, t.jsx)("span", {
              children: a.label
            }), 0 === i && (0, t.jsx)("em", {
              children: "↩ 回到“选择时段”"
            }), 1 === i && (0, t.jsx)("em", {
              children: "↩ 回到“填写资料”"
            })]
          }, a.label))
        })]
      }), (0, t.jsx)("p", {
        className: "scene-caption",
        "aria-live": "polite",
        children: eF[e]
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "一张 User Flow 聚焦一个角色的一项目标：主路径之外，失败和恢复路径也要画出来。"
      })]
    });
  },
  "user-story": function () {
    let e = (0, a.useContext)(ep.gq),
      {
        index: s,
        select: n
      } = (0, ex.B)(3),
      i = [eW(e, "只有功能名", "Feature label"), eW(e, "补齐用户目标", "Add user goal"), eW(e, "连接验收", "Connect acceptance")];
    return (0, t.jsxs)(eu.xc, {
      label: "用户故事从功能名到可验收需求图解",
      className: "product-concept-scene story-scene",
      onPrevious: () => n(s - 1),
      onNext: () => n(s + 1),
      children: [(0, t.jsx)(eu.hV, {
        items: i,
        index: s,
        onSelect: n,
        label: eW(e, "选择用户故事状态", "Choose user-story state")
      }), (0, t.jsxs)("div", {
        className: "story-workbench state-".concat(s),
        children: [(0, t.jsxs)("div", {
          className: "story-ticket",
          children: [(0, t.jsxs)("header", {
            children: [(0, t.jsx)("span", {
              children: "TRIP-17"
            }), (0, t.jsx)("b", {
              children: eW(e, "行程保存", "Trip saving")
            }), (0, t.jsx)("em", {
              children: eW(e, "需求草稿", "Draft")
            })]
          }), 0 === s ? (0, t.jsxs)("div", {
            className: "story-empty",
            children: [(0, t.jsx)("strong", {
              children: eW(e, "增加保存按钮", "Add a save button")
            }), (0, t.jsx)("p", {
              children: eW(e, "还不知道谁需要、为什么需要，也无法判断是否完成。", "The user, reason, and completion conditions are still unknown.")
            })]
          }) : (0, t.jsxs)("div", {
            className: "story-sentence",
            children: [(0, t.jsxs)("span", {
              children: [eW(e, "作为", "As a"), " ", (0, t.jsx)("b", {
                children: eW(e, "规划多日旅行的人", "traveler planning a multi-day trip")
              })]
            }), (0, t.jsxs)("span", {
              children: [eW(e, "我希望", "I want to"), " ", (0, t.jsx)("b", {
                children: eW(e, "保存未完成的行程", "save an unfinished itinerary")
              })]
            }), (0, t.jsxs)("span", {
              children: [eW(e, "以便", "so I can"), " ", (0, t.jsx)("b", {
                children: eW(e, "稍后继续编辑", "continue editing later")
              })]
            })]
          }), (0, t.jsxs)("div", {
            className: "story-acceptance".concat(2 === s ? " visible" : ""),
            children: [(0, t.jsx)("small", {
              children: eW(e, "验收条件", "Acceptance")
            }), (0, t.jsxs)("p", {
              children: ["✓ ", eW(e, "保存后刷新，内容仍然存在", "Content remains after refresh")]
            }), (0, t.jsxs)("p", {
              children: ["✓", " ", eW(e, "换一台设备后可以继续编辑", "Editing can continue on another device")]
            })]
          })]
        }), (0, t.jsxs)("aside", {
          className: "story-evidence",
          children: [(0, t.jsx)("small", {
            children: eW(e, "当前能判断什么", "What can be judged")
          }), (0, t.jsx)("strong", {
            children: 0 === s ? eW(e, "只有一个方案名称", "Only a solution label") : 1 === s ? eW(e, "用户、目标和原因已经明确", "User, goal, and reason are clear") : eW(e, "需求已经连接到可检查结果", "The need connects to observable results")
          })]
        })]
      })]
    });
  },
  "use-case": function () {
    let e = (0, a.useContext)(ep.gq),
      [s, n] = (0, a.useState)(!1),
      i = s ? [[eW(e, "顾客", "Customer"), eW(e, "提交已超期订单", "Submits an expired order")], [eW(e, "系统", "System"), eW(e, "检查退款期限", "Checks the refund window")], [eW(e, "系统", "System"), eW(e, "说明不能退款的原因", "Explains why the refund is unavailable")], [eW(e, "顾客", "Customer"), eW(e, "查看申诉或客服入口", "Opens appeal or support options")]] : [[eW(e, "顾客", "Customer"), eW(e, "选择可退款订单", "Selects an eligible order")], [eW(e, "系统", "System"), eW(e, "显示金额和退款规则", "Shows amount and refund rules")], [eW(e, "顾客", "Customer"), eW(e, "确认退款原因", "Confirms the refund reason")], [eW(e, "系统", "System"), eW(e, "受理并显示预计到账时间", "Accepts and shows expected arrival")]];
    return (0, t.jsxs)(eu.xc, {
      label: "退款用户用例的参与者与系统回应图解",
      className: "product-concept-scene usecase-scene",
      children: [(0, t.jsxs)("div", {
        className: "scene-controls",
        children: [(0, t.jsx)("button", {
          type: "button",
          className: s ? "" : "on",
          "aria-pressed": !s,
          onClick: () => n(!1),
          children: eW(e, "主要路径", "Main path")
        }), (0, t.jsx)("button", {
          type: "button",
          className: s ? "on" : "",
          "aria-pressed": s,
          onClick: () => n(!0),
          children: eW(e, "超期例外", "Expired exception")
        })]
      }), (0, t.jsxs)("div", {
        className: "usecase-sheet",
        children: [(0, t.jsxs)("header", {
          children: [(0, t.jsxs)("div", {
            children: [(0, t.jsx)("small", {
              children: eW(e, "参与者", "Actor")
            }), (0, t.jsx)("strong", {
              children: eW(e, "顾客", "Customer")
            })]
          }), (0, t.jsxs)("div", {
            children: [(0, t.jsx)("small", {
              children: eW(e, "目标", "Goal")
            }), (0, t.jsx)("strong", {
              children: eW(e, "取回符合条件的订单费用", "Recover an eligible order payment")
            })]
          }), (0, t.jsxs)("div", {
            children: [(0, t.jsx)("small", {
              children: eW(e, "触发", "Trigger")
            }), (0, t.jsx)("strong", {
              children: eW(e, "点击“申请退款”", "Select “Request refund”")
            })]
          })]
        }), (0, t.jsxs)("div", {
          className: "usecase-lanes",
          children: [(0, t.jsx)("span", {
            children: eW(e, "参与者动作", "Actor action")
          }), (0, t.jsx)("span", {
            children: eW(e, "系统回应", "System response")
          })]
        }), (0, t.jsx)("ol", {
          children: i.map((s, n) => {
            let [a, i] = s;
            return (0, t.jsxs)("li", {
              className: a === eW(e, "系统", "System") ? "system" : "actor",
              children: [(0, t.jsx)("i", {
                children: n + 1
              }), (0, t.jsx)("small", {
                children: a
              }), (0, t.jsx)("strong", {
                children: i
              })]
            }, "".concat(a, "-").concat(i));
          })
        }), (0, t.jsxs)("footer", {
          className: s ? "warn" : "ok",
          children: [(0, t.jsx)("small", {
            children: eW(e, "可观察结果", "Observable result")
          }), (0, t.jsx)("b", {
            children: s ? eW(e, "没有退款，但顾客知道原因和下一步", "No refund, but the customer knows why and what to do") : eW(e, "申请已受理，并显示预计到账时间", "The request is accepted with an expected arrival time")
          })]
        })]
      })]
    });
  },
  "product-backlog": function () {
    let e = (0, a.useContext)(ep.gq),
      [s, n] = (0, a.useState)(!1);
    return (0, t.jsxs)(eu.xc, {
      label: "产品待办列表重新排序图解",
      className: "product-concept-scene backlog-scene",
      children: [(0, t.jsxs)("div", {
        className: "backlog-signal",
        children: [(0, t.jsx)("span", {
          className: s ? "active" : "",
          children: "!"
        }), (0, t.jsxs)("div", {
          children: [(0, t.jsx)("small", {
            children: eW(e, "新证据", "New evidence")
          }), (0, t.jsx)("strong", {
            children: eW(e, "支付失败影响所有订单", "Payment failures affect every order")
          })]
        }), (0, t.jsx)("button", {
          type: "button",
          onClick: () => n(e => !e),
          children: s ? eW(e, "查看原顺序", "Show old order") : eW(e, "根据证据重排", "Reorder with evidence")
        })]
      }), (0, t.jsxs)("div", {
        className: "backlog-board",
        children: [(0, t.jsxs)("header", {
          children: [(0, t.jsx)("b", {
            children: eW(e, "产品待办列表", "Product backlog")
          }), (0, t.jsx)("span", {
            children: eW(e, "顺序表示当前取舍，不是承诺日期", "Order is a current choice, not a date promise")
          })]
        }), (s ? eV : eU).map(n => {
          let [a, i, r] = n;
          return (0, t.jsxs)("div", {
            className: "backlog-row".concat(s && "支付失败修复" === i ? " moved" : ""),
            children: [(0, t.jsx)("i", {
              children: a
            }), (0, t.jsx)("strong", {
              children: "en" === e ? {
                行程自动保存: "Trip autosave",
                地图配色建议: "Map color idea",
                支付失败修复: "Fix payment failure",
                "导出 PDF": "Export PDF"
              }[i] : i
            }), (0, t.jsx)("small", {
              children: "en" === e ? {
                目标匹配: "Matches goal",
                "1 条反馈": "One request",
                影响待确认: "Impact unknown",
                候选: "Candidate",
                所有订单受影响: "All orders affected",
                等待更多证据: "Needs more evidence"
              }[r] : r
            }), (0, t.jsx)("span", {
              children: 3 > Number(a) ? eW(e, "已细化", "Refined") : eW(e, "待细化", "To refine")
            })]
          }, i);
        })]
      })]
    });
  },
  "product-roadmap": function () {
    let e = (0, a.useContext)(ep.gq),
      [s, n] = (0, a.useState)(!1);
    return (0, t.jsxs)(eu.xc, {
      label: "功能清单变成产品路线图图解",
      className: "product-concept-scene roadmap-scene",
      children: [(0, t.jsxs)("div", {
        className: "scene-controls",
        children: [(0, t.jsx)("button", {
          type: "button",
          className: s ? "" : "on",
          "aria-pressed": !s,
          onClick: () => n(!1),
          children: eW(e, "功能清单", "Feature list")
        }), (0, t.jsx)("button", {
          type: "button",
          className: s ? "on" : "",
          "aria-pressed": s,
          onClick: () => n(!0),
          children: eW(e, "目标路线图", "Goal-led roadmap")
        })]
      }), s ? (0, t.jsxs)("div", {
        className: "roadmap-horizons",
        children: [(0, t.jsxs)("section", {
          children: [(0, t.jsx)("small", {
            children: "NOW"
          }), (0, t.jsx)("strong", {
            children: eW(e, "减少行程丢失", "Reduce lost itineraries")
          }), (0, t.jsx)("p", {
            children: eW(e, "结果：保存后可以继续编辑", "Outcome: editing can continue after saving")
          }), (0, t.jsx)("span", {
            children: eW(e, "自动保存", "Autosave")
          })]
        }), (0, t.jsxs)("section", {
          children: [(0, t.jsx)("small", {
            children: "NEXT"
          }), (0, t.jsx)("strong", {
            children: eW(e, "让同行者一起完成计划", "Help companions plan together")
          }), (0, t.jsx)("p", {
            children: eW(e, "结果：修改与讨论留在同一处", "Outcome: edits and discussion stay together")
          }), (0, t.jsx)("span", {
            children: eW(e, "共同编辑 \xb7 评论", "Co-editing \xb7 Comments")
          })]
        }), (0, t.jsxs)("section", {
          children: [(0, t.jsx)("small", {
            children: "LATER"
          }), (0, t.jsx)("strong", {
            children: eW(e, "验证自动规划需求", "Validate automatic planning")
          }), (0, t.jsx)("p", {
            children: eW(e, "结果：先取得真实使用证据", "Outcome: gather real usage evidence first")
          }), (0, t.jsx)("span", {
            children: eW(e, "候选，不承诺日期", "Candidate, no date commitment")
          })]
        })]
      }) : (0, t.jsxs)("div", {
        className: "roadmap-wishlist",
        children: [[eW(e, "自动保存", "Autosave"), eW(e, "共同编辑", "Co-editing"), eW(e, "AI 规划", "AI planning"), eW(e, "评论", "Comments"), eW(e, "离线模式", "Offline mode")].map(e => (0, t.jsx)("span", {
          children: e
        }, e)), (0, t.jsx)("p", {
          children: eW(e, "没有目标、取舍和时间范围，无法说明为什么先做某项工作。", "Without goals, tradeoffs, or horizons, the list cannot explain what comes first.")
        })]
      })]
    });
  },
  "user-journey": function () {
    let e = (0, a.useContext)(ep.gq),
      {
        index: s,
        select: n
      } = (0, ex.B)(ez.length),
      i = ez[s];
    return (0, t.jsxs)(eu.xc, {
      label: "跨触点用户旅程图解",
      className: "product-concept-scene journey-scene",
      onPrevious: () => n(s - 1),
      onNext: () => n(s + 1),
      children: [(0, t.jsx)("div", {
        className: "journey-line",
        role: "group",
        "aria-label": eW(e, "选择旅程阶段", "Choose journey stage"),
        children: ez.map((a, i) => (0, t.jsxs)("button", {
          type: "button",
          className: i === s ? "on" : "",
          "aria-pressed": i === s,
          onClick: () => n(i),
          children: [(0, t.jsx)("i", {}), (0, t.jsx)("span", {
            children: "en" === e ? a.en : a.zh
          })]
        }, a.zh))
      }), (0, t.jsxs)("div", {
        className: "journey-evidence",
        children: [(0, t.jsxs)("section", {
          children: [(0, t.jsx)("small", {
            children: eW(e, "触点", "Touchpoint")
          }), (0, t.jsx)("strong", {
            children: "en" === e ? i.touchEn : i.touchZh
          })]
        }), (0, t.jsxs)("section", {
          children: [(0, t.jsx)("small", {
            children: eW(e, "用户行动", "User action")
          }), (0, t.jsx)("strong", {
            children: "en" === e ? i.actionEn : i.actionZh
          })]
        }), (0, t.jsxs)("section", {
          className: "feeling score-".concat(i.score),
          children: [(0, t.jsx)("small", {
            children: eW(e, "感受", "Feeling")
          }), (0, t.jsx)("strong", {
            children: "en" === e ? i.feelingEn : i.feelingZh
          })]
        }), (0, t.jsxs)("section", {
          children: [(0, t.jsx)("small", {
            children: eW(e, "依据", "Evidence")
          }), (0, t.jsx)("strong", {
            children: 2 === s ? eW(e, "5 次访谈中有 3 人询问退款规则", "3 of 5 interviewees asked about refunds") : eW(e, "访谈与行为记录", "Interview and behavior notes")
          })]
        })]
      }), (0, t.jsx)("div", {
        className: "journey-curve",
        "aria-hidden": "true",
        children: ez.map((e, n) => (0, t.jsx)("span", {
          className: "".concat(e.score < 0 ? "low" : "").concat(n === s ? " active" : ""),
          style: {
            "--journey-score": String(e.score)
          }
        }, e.zh))
      }), (0, t.jsx)("p", {
        className: "scene-caption",
        children: 2 === s ? eW(e, "付款阶段出现最低点，但“为什么担心”来自访谈证据，不由团队猜测。", "Purchase is the low point, and interviews—not team guesses—explain the concern.") : eW(e, "旅程把产品内外触点放在同一段时间里，并为判断保留证据来源。", "The journey connects touchpoints across time and keeps evidence attached to each claim.")
      })]
    });
  },
  "product-discovery": function () {
    let e = (0, a.useContext)(ep.gq),
      [s, n] = (0, a.useState)("assumptions");
    return (0, t.jsxs)(eu.xc, {
      label: "产品发现验证闭环图解",
      className: "product-concept-scene discovery-scene",
      children: [(0, t.jsxs)("div", {
        className: "scene-controls",
        children: [(0, t.jsx)("button", {
          type: "button",
          className: "assumptions" === s ? "on" : "",
          "aria-pressed": "assumptions" === s,
          onClick: () => n("assumptions"),
          children: eW(e, "1. 写下假设", "1. Write assumptions")
        }), (0, t.jsx)("button", {
          type: "button",
          className: "evidence" === s ? "on" : "",
          "aria-pressed": "evidence" === s,
          onClick: () => n("evidence"),
          children: eW(e, "2. 观察证据", "2. Observe evidence")
        }), (0, t.jsx)("button", {
          type: "button",
          className: "decision" === s ? "on" : "",
          "aria-pressed": "decision" === s,
          onClick: () => n("decision"),
          children: eW(e, "3. 改变决定", "3. Change the decision")
        })]
      }), (0, t.jsxs)("div", {
        className: "discovery-workbench",
        children: [(0, t.jsxs)("header", {
          children: [(0, t.jsx)("span", {
            children: eW(e, "示例研究记录", "Example research record")
          }), (0, t.jsx)("b", {
            children: eW(e, "提示词结果对比工具", "Prompt-result comparison tool")
          })]
        }), "assumptions" === s && (0, t.jsxs)("div", {
          className: "discovery-hypothesis-sheet",
          children: [(0, t.jsx)("h4", {
            children: eW(e, "现在只有想法，还没有用户证据", "There is an idea, but no user evidence yet")
          }), (0, t.jsxs)("dl", {
            children: [(0, t.jsxs)("div", {
              children: [(0, t.jsx)("dt", {
                children: eW(e, "价值", "Value")
              }), (0, t.jsx)("dd", {
                children: eW(e, "创作者经常需要并愿意使用结果对比", "Creators frequently need and will use result comparison")
              })]
            }), (0, t.jsxs)("div", {
              children: [(0, t.jsx)("dt", {
                children: eW(e, "可用性", "Usability")
              }), (0, t.jsx)("dd", {
                children: eW(e, "新手能看懂双栏差异并完成选择", "Beginners can understand two-column differences and choose")
              })]
            }), (0, t.jsxs)("div", {
              children: [(0, t.jsx)("dt", {
                children: eW(e, "可行性", "Feasibility")
              }), (0, t.jsx)("dd", {
                children: eW(e, "同一输入能稳定生成可比较的结果", "The same input can produce comparable results reliably")
              })]
            })]
          }), (0, t.jsx)("p", {
            children: eW(e, "“我觉得用户会喜欢”不能放进证据栏。", "“I think users will like it” does not belong in the evidence column.")
          })]
        }), "evidence" === s && (0, t.jsxs)("div", {
          className: "discovery-evidence-layout",
          children: [(0, t.jsxs)("article", {
            className: "discovery-transcript",
            children: [(0, t.jsx)("small", {
              children: eW(e, "访谈：追问最近一次真实操作", "Interview: reconstruct the last real event")
            }), (0, t.jsx)("blockquote", {
              children: eW(e, "“我把两个结果复制进表格，只想快速看出哪里不一样；导出格式不是现在的问题。”", "“I paste two results into a sheet just to spot differences. Export formats are not the current problem.”")
            }), (0, t.jsx)("p", {
              children: eW(e, "记录的是已经发生的行为，不是对产品想法的礼貌评价。", "This records past behavior, not polite feedback on the idea.")
            })]
          }), (0, t.jsxs)("article", {
            className: "discovery-prototype",
            children: [(0, t.jsx)("small", {
              children: eW(e, "低保真任务：找出两版差异", "Low-fidelity task: find the difference")
            }), (0, t.jsxs)("div", {
              children: [(0, t.jsx)("span", {
                children: eW(e, "结果 A", "Result A")
              }), (0, t.jsx)("span", {
                children: eW(e, "结果 B", "Result B")
              })]
            }), (0, t.jsx)("p", {
              children: eW(e, "观察：用户先找差异，再问能否保存；没有打开“团队协作”。", "Observed: the user looks for differences, then asks to save; team collaboration is ignored.")
            })]
          })]
        }), "decision" === s && (0, t.jsxs)("div", {
          className: "discovery-decision-log",
          children: [(0, t.jsxs)("header", {
            children: [(0, t.jsx)("span", {
              children: eW(e, "决策记录", "Decision log")
            }), (0, t.jsx)("b", {
              children: eW(e, "缩小范围后继续验证", "Narrow the scope and keep testing")
            })]
          }), (0, t.jsxs)("div", {
            className: "discovery-decision-options",
            children: [(0, t.jsx)("span", {
              children: eW(e, "继续完整方案", "Build the full idea")
            }), (0, t.jsx)("strong", {
              children: eW(e, "先测双栏差异", "Test two-column diff")
            }), (0, t.jsx)("span", {
              children: eW(e, "证据仍弱就暂停", "Pause if evidence stays weak")
            })]
          }), (0, t.jsx)("p", {
            children: eW(e, "保留双栏比较和保存结果；暂不做团队协作与多种导出。下一轮继续观察是否有人重复使用。", "Keep two-column comparison and saving; defer collaboration and export formats. Next, observe repeated use.")
          })]
        })]
      }), (0, t.jsx)("p", {
        className: "discovery-caption",
        children: eW(e, "产品发现的产出是有证据的下一步，不是自动批准立项。", "Discovery produces an evidence-backed next step, not automatic approval.")
      })]
    });
  },
  "heuristic-evaluation": function () {
    let e = (0, a.useContext)(ep.gq),
      [s, n] = (0, a.useState)(0),
      i = [eW(e, "1. 走一遍任务", "1. Run the task"), eW(e, "2. 记录问题", "2. Record issue"), eW(e, "3. 修复后复查", "3. Recheck")];
    return (0, t.jsxs)(eu.xc, {
      label: "启发式评估走查图解",
      className: "product-concept-scene heuristic-scene",
      children: [(0, t.jsx)("div", {
        className: "scene-controls",
        children: i.map((e, a) => (0, t.jsx)("button", {
          type: "button",
          className: s === a ? "on" : "",
          "aria-pressed": s === a,
          onClick: () => n(a),
          children: e
        }, e))
      }), (0, t.jsxs)("div", {
        className: "heuristic-workbench",
        children: [(0, t.jsxs)("section", {
          className: "heuristic-settings-page",
          children: [(0, t.jsxs)("header", {
            children: [(0, t.jsx)("span", {
              children: eW(e, "设置 / 个人资料", "Settings / Profile")
            }), (0, t.jsx)("b", {
              children: eW(e, "任务：修改昵称并保存", "Task: edit nickname and save")
            })]
          }), (0, t.jsxs)("label", {
            children: [(0, t.jsx)("span", {
              children: eW(e, "昵称", "Nickname")
            }), (0, t.jsx)("input", {
              readOnly: !0,
              value: eW(e, "林小猫", "Lin Cat")
            })]
          }), (0, t.jsxs)("div", {
            className: "heuristic-save-state state-".concat(s),
            children: [(0, t.jsx)("button", {
              type: "button",
              disabled: 2 === s,
              children: 2 === s ? eW(e, "已保存", "Saved") : eW(e, "保存", "Save")
            }), (0, t.jsx)("span", {
              children: 0 === s ? eW(e, "点击后没有任何变化", "Nothing changes after click") : 1 === s ? eW(e, "问题已定位：状态不可见", "Issue located: status is invisible") : eW(e, "保存中… → 保存成功", "Saving… → Saved")
            })]
          })]
        }), (0, t.jsxs)("aside", {
          className: "heuristic-issue-sheet state-".concat(s),
          children: [(0, t.jsxs)("header", {
            children: [(0, t.jsx)("span", {
              children: eW(e, "问题记录 #01", "Issue record #01")
            }), (0, t.jsx)("b", {
              children: 0 === s ? eW(e, "待记录", "Unrecorded") : 1 === s ? eW(e, "待修复", "Open") : eW(e, "已复查", "Rechecked")
            })]
          }), (0, t.jsxs)("dl", {
            children: [(0, t.jsxs)("div", {
              children: [(0, t.jsx)("dt", {
                children: eW(e, "位置", "Location")
              }), (0, t.jsx)("dd", {
                children: eW(e, "设置页 \xb7 昵称表单", "Settings \xb7 nickname form")
              })]
            }), (0, t.jsxs)("div", {
              children: [(0, t.jsx)("dt", {
                children: eW(e, "步骤", "Steps")
              }), (0, t.jsx)("dd", {
                children: eW(e, "改昵称 → 点击保存", "Edit nickname → Save")
              })]
            }), (0, t.jsxs)("div", {
              children: [(0, t.jsx)("dt", {
                children: eW(e, "原则", "Heuristic")
              }), (0, t.jsx)("dd", {
                children: eW(e, "系统状态可见性", "Visibility of system status")
              })]
            }), (0, t.jsxs)("div", {
              children: [(0, t.jsx)("dt", {
                children: eW(e, "影响", "Impact")
              }), (0, t.jsx)("dd", {
                children: eW(e, "用户可能重复提交，也不知道是否成功", "Users may resubmit and cannot tell whether it worked")
              })]
            })]
          })]
        })]
      }), (0, t.jsx)("p", {
        className: "heuristic-caption",
        children: eW(e, "复查通过只说明这个已知问题改善了；真实用户是否看懂仍要另测。", "Passing the recheck proves this known issue improved; real-user comprehension still needs testing.")
      })]
    });
  },
  "ab-test": function () {
    let e = (0, a.useContext)(ep.gq),
      {
        index: s,
        select: n
      } = (0, ex.B)(3),
      i = Array.from({
        length: 12
      }, (e, s) => s);
    return (0, t.jsxs)(eu.xc, {
      label: "A/B 测试随机分流与判断图解",
      className: "product-concept-scene abtest-scene",
      onPrevious: () => n(s - 1),
      onNext: () => n(s + 1),
      children: [(0, t.jsx)(eu.hV, {
        items: [eW(e, "同期随机分流", "Random assignment"), eW(e, "按同一口径收集", "Measure consistently"), eW(e, "达到规则再判断", "Decide by rule")],
        index: s,
        onSelect: n,
        label: eW(e, "选择实验阶段", "Choose experiment stage")
      }), (0, t.jsxs)("div", {
        className: "abtest-flow",
        children: [(0, t.jsxs)("div", {
          className: "abtest-pool",
          children: [(0, t.jsx)("small", {
            children: eW(e, "符合条件的新访客", "Eligible new visitors")
          }), (0, t.jsx)("div", {
            children: i.map(e => (0, t.jsx)("i", {}, e))
          })]
        }), (0, t.jsx)("b", {
          className: "abtest-split",
          children: "50 / 50"
        }), (0, t.jsxs)("div", {
          className: "abtest-variants",
          children: [(0, t.jsxs)("section", {
            className: "variant-a",
            children: [(0, t.jsxs)("header", {
              children: [(0, t.jsx)("b", {
                children: "A"
              }), (0, t.jsx)("span", {
                children: eW(e, "原版", "Control")
              })]
            }), (0, t.jsx)("button", {
              type: "button",
              children: eW(e, "创建账号", "Create account")
            }), s > 0 && (0, t.jsx)("strong", {
              children: "120 / 600 \xb7 20%"
            })]
          }), (0, t.jsxs)("section", {
            className: "variant-b",
            children: [(0, t.jsxs)("header", {
              children: [(0, t.jsx)("b", {
                children: "B"
              }), (0, t.jsx)("span", {
                children: eW(e, "新版", "Variant")
              })]
            }), (0, t.jsx)("button", {
              type: "button",
              children: eW(e, "免费开始", "Start free")
            }), s > 0 && (0, t.jsx)("strong", {
              children: "138 / 600 \xb7 23%"
            })]
          })]
        }), (0, t.jsxs)("div", {
          className: "abtest-result state-".concat(s),
          children: [(0, t.jsx)("small", {
            children: eW(e, "主要指标：注册完成率", "Primary metric: sign-up completion")
          }), (0, t.jsx)("b", {
            children: s < 2 ? eW(e, "还不能判断", "No decision yet") : eW(e, "示例仍未达到预设停止条件", "Example has not reached the predefined stopping rule")
          }), (0, t.jsx)("span", {
            children: eW(e, "保护指标：错误率不能上升", "Guardrail: error rate must not increase")
          })]
        })]
      })]
    });
  },
  "conversion-funnel": function () {
    let e = (0, a.useContext)(ep.gq),
      [s, n] = (0, a.useState)(!1),
      i = s ? eK : eG;
    return (0, t.jsxs)(eu.xc, {
      label: "注册转化漏斗图解",
      className: "product-concept-scene funnel-scene",
      children: [(0, t.jsxs)("div", {
        className: "scene-controls",
        children: [(0, t.jsx)("button", {
          type: "button",
          className: s ? "" : "on",
          "aria-pressed": !s,
          onClick: () => n(!1),
          children: eW(e, "全部用户", "All users")
        }), (0, t.jsx)("button", {
          type: "button",
          className: s ? "on" : "",
          "aria-pressed": s,
          onClick: () => n(!0),
          children: eW(e, "手机用户", "Mobile users")
        })]
      }), (0, t.jsxs)("div", {
        className: "funnel-workbench",
        children: [(0, t.jsxs)("div", {
          className: "funnel-chart",
          children: [(0, t.jsx)("small", {
            children: eW(e, "示例数据 \xb7 同一用户口径 \xb7 7 天", "Example data \xb7 one user scope \xb7 7 days")
          }), i.map((s, n) => {
            let [a, r, l, c] = s,
              o = 0 === n ? l : i[n - 1][2],
              d = Math.round(l / o * 100);
            return (0, t.jsxs)("div", {
              className: 2 === n ? "largest-loss" : "",
              children: [(0, t.jsxs)("span", {
                style: {
                  width: "".concat(c, "%")
                },
                children: [(0, t.jsx)("b", {
                  children: "en" === e ? r : a
                }), (0, t.jsx)("strong", {
                  children: l.toLocaleString()
                })]
              }), (0, t.jsx)("em", {
                children: 0 === n ? "100%" : "".concat(d, "%")
              })]
            }, a);
          })]
        }), (0, t.jsxs)("aside", {
          children: [(0, t.jsx)("small", {
            children: eW(e, "先调查", "Investigate first")
          }), (0, t.jsx)("strong", {
            children: eW(e, "开始注册 → 提交资料", "Start → Submit")
          }), (0, t.jsx)("p", {
            children: eW(e, "步骤转化最低；先核对事件采集，再调查页面和规则。", "Lowest step conversion. Verify tracking before investigating the page and rules.")
          })]
        })]
      })]
    });
  },
  "gantt-chart": function () {
    let e = (0, a.useContext)(ep.gq),
      [s, n] = (0, a.useState)(!1);
    return (0, t.jsxs)(eu.xc, {
      label: "甘特图延期影响图解",
      className: "product-concept-scene gantt-scene",
      children: [(0, t.jsxs)("div", {
        className: "gantt-toolbar",
        children: [(0, t.jsxs)("div", {
          children: [(0, t.jsx)("small", {
            children: eW(e, "版本", "Release")
          }), (0, t.jsx)("strong", {
            children: eW(e, "行程协作", "Trip collaboration")
          })]
        }), (0, t.jsx)("button", {
          type: "button",
          className: s ? "active" : "",
          onClick: () => n(e => !e),
          children: s ? eW(e, "恢复原计划", "Restore plan") : eW(e, "模拟开发延期 2 天", "Delay development by 2 days")
        })]
      }), (0, t.jsx)("p", {
        className: "gantt-scroll-hint",
        children: eW(e, "左右滑动查看完整排期", "Scroll sideways to see the full schedule")
      }), (0, t.jsxs)("div", {
        className: "gantt-board",
        role: "region",
        "aria-label": eW(e, "任务排期，可横向滚动", "Task schedule, scroll horizontally"),
        tabIndex: 0,
        children: [(0, t.jsxs)("div", {
          className: "gantt-head",
          children: [(0, t.jsx)("b", {
            children: eW(e, "任务", "Task")
          }), Array.from({
            length: 14
          }, (e, s) => (0, t.jsx)("span", {
            children: s + 1
          }, s))]
        }), e_.map((n, a) => (0, t.jsxs)("div", {
          className: "gantt-row",
          children: [(0, t.jsxs)("strong", {
            children: ["en" === e ? n.en : n.zh, (0, t.jsxs)("small", {
              children: [n.duration, "d"]
            })]
          }), (0, t.jsx)("span", {
            className: "gantt-bar ".concat(n.tone).concat(s && a > 0 ? " shifted" : ""),
            style: {
              "--gantt-start": String(n.start + (s && a > 0 ? 2 : 0)),
              "--gantt-span": String(n.duration)
            },
            children: 1 === a && s ? eW(e, "延期", "Delayed") : ""
          })]
        }, n.zh)), (0, t.jsxs)("div", {
          className: "gantt-row milestone-row",
          children: [(0, t.jsx)("strong", {
            children: eW(e, "发布", "Release")
          }), (0, t.jsx)("span", {
            className: "gantt-milestone".concat(s ? " shifted" : ""),
            style: {
              "--gantt-start": s ? "13" : "11"
            },
            children: "◆"
          })]
        })]
      }), (0, t.jsx)("p", {
        className: "gantt-impact".concat(s ? " visible" : ""),
        children: s ? eW(e, "开发推迟 2 天，依赖它的测试和发布里程碑一起后移。", "A two-day development delay moves dependent testing and the release milestone.") : eW(e, "依赖：交互设计 → 功能开发 → 功能测试 → 发布", "Dependency: design → development → testing → release")
      })]
    });
  },
  "event-tracking": function () {
    let e = (0, a.useContext)(ep.gq),
      [s, n] = (0, a.useState)([]),
      i = s.length,
      r = s.filter(e => "triggered" !== e.status).length,
      l = s.filter(e => "received" === e.status).length,
      c = i - r,
      o = eW(e, "发送待发送事件", "Send pending events"),
      d = eW(e, "模拟平台收到事件", "Simulate platform receipt"),
      h = eW(e, "重置测试", "Reset test"),
      x = s.slice(-4).reverse();
    return (0, t.jsxs)(eu.xc, {
      label: eW(e, "埋点事件触发、发送和接收演示", "Event trigger, send, and receipt demonstration"),
      className: "track-scene",
      children: [(0, t.jsxs)("div", {
        className: "track-layout",
        children: [(0, t.jsxs)("div", {
          className: "track-page",
          children: [(0, t.jsxs)("div", {
            className: "track-page-head",
            children: [(0, t.jsx)("i", {}), (0, t.jsx)("span", {
              children: "example.com"
            })]
          }), (0, t.jsxs)("div", {
            className: "track-page-body",
            children: [(0, t.jsx)("i", {
              className: "mk-line",
              style: {
                width: "60%"
              }
            }), (0, t.jsx)("button", {
              type: "button",
              className: "track-cta",
              onClick: () => n(e => [...e, {
                id: e.length + 1,
                status: "triggered"
              }]),
              children: eW(e, "立即试用", "Start trial")
            }), (0, t.jsx)("small", {
              "aria-live": "polite",
              children: c > 0 ? eW(e, "已触发 ".concat(c, " 条，尚未发送"), "".concat(c, " triggered, not sent yet")) : eW(e, "已触发 ".concat(i, " 条"), "".concat(i, " triggered"))
            })]
          })]
        }), (0, t.jsx)("span", {
          className: "track-arrow",
          "aria-hidden": "true",
          children: "→"
        }), (0, t.jsxs)("div", {
          className: "track-backend".concat(l > 0 ? " on" : ""),
          children: [(0, t.jsxs)("div", {
            className: "track-backend-head",
            children: [(0, t.jsx)("b", {
              children: eW(e, "统计调试视图", "Analytics debug view")
            }), (0, t.jsx)("span", {
              "aria-live": "polite",
              children: l > 0 ? eW(e, "收到 ".concat(l, " 条"), "".concat(l, " received")) : eW(e, "等待事件", "Waiting for events")
            })]
          }), (0, t.jsxs)("div", {
            className: "track-backend-rows",
            children: [(0, t.jsxs)("span", {
              className: "track-backend-row",
              children: [(0, t.jsx)("i", {
                children: eW(e, "触发", "Triggered")
              }), (0, t.jsx)("code", {
                children: i
              })]
            }), (0, t.jsxs)("span", {
              className: "track-backend-row",
              children: [(0, t.jsx)("i", {
                children: eW(e, "已发送", "Sent")
              }), (0, t.jsx)("code", {
                children: r
              })]
            }), (0, t.jsxs)("span", {
              className: "track-backend-row",
              children: [(0, t.jsx)("i", {
                children: eW(e, "已接收", "Received")
              }), (0, t.jsx)("code", {
                children: l
              })]
            }), x.map(s => (0, t.jsxs)("span", {
              className: "track-backend-row",
              children: [(0, t.jsxs)("i", {
                children: ["#", s.id]
              }), (0, t.jsxs)("code", {
                children: ["start_trial \xb7 page_source=home \xb7", " ", eW(e, "triggered" === s.status ? "待发送" : "sent" === s.status ? "已发送，待接收" : "平台已收到", "triggered" === s.status ? "triggered" : "sent" === s.status ? "sent \xb7 awaiting receipt" : "received by platform")]
              })]
            }, s.id))]
          }), (0, t.jsxs)("div", {
            className: "scene-controls compact",
            children: [(0, t.jsx)("button", {
              type: "button",
              onClick: () => n(e => e.map(e => "triggered" === e.status ? {
                ...e,
                status: "sent"
              } : e)),
              disabled: 0 === c,
              children: o
            }), (0, t.jsx)("button", {
              type: "button",
              onClick: () => n(e => e.map(e => "sent" === e.status ? {
                ...e,
                status: "received"
              } : e)),
              disabled: r === l,
              children: d
            }), (0, t.jsx)("button", {
              type: "button",
              onClick: () => n([]),
              disabled: 0 === s.length,
              children: h
            })]
          })]
        })]
      }), (0, t.jsx)("p", {
        className: "scene-caption",
        children: eW(e, "这是教学模拟：点击会先触发，手动按钮再推进发送和模拟接收。真实 SDK 通常按配置自动发送；调试视图收到事件能核对测试链路，但不等于汇总报表已更新。", "This is a teaching simulation: a click triggers an event, and the controls advance it to sent and simulated receipt. Real SDKs usually send according to configuration; seeing a test event in a debug view checks the path but does not mean aggregate reports have updated.")
      })]
    });
  },
  "ai-agent": function () {
    let {
        index: e,
        select: s
      } = (0, ex.B)(ej.length),
      n = ej[e],
      a = ej.slice(0, e + 1).flatMap(e => e.messages);
    return (0, t.jsxs)(eu.xc, {
      label: "AI Agent 工作循环图解",
      className: "agent-scene",
      onPrevious: () => s(e - 1),
      onNext: () => s(e + 1),
      children: [(0, t.jsxs)("div", {
        className: "agent-layout",
        children: [(0, t.jsxs)("div", {
          className: "vibe-chat",
          children: [(0, t.jsxs)("div", {
            className: "vibe-chat-head",
            children: [(0, t.jsx)("i", {
              className: "ti ti-sparkles",
              "aria-hidden": "true"
            }), "AI Agent"]
          }), (0, t.jsxs)("div", {
            className: "vibe-chat-body",
            children: [0 === a.length && (0, t.jsx)("div", {
              className: "agent-chat-idle",
              children: "对话会显示在这里"
            }), a.map((e, s) => (0, t.jsxs)("div", {
              className: "vibe-msg ".concat(e.from).concat(s >= a.length - n.messages.length ? " fresh" : ""),
              children: [(0, t.jsx)("small", {
                children: "user" === e.from ? "你" : "Agent"
              }), (0, t.jsx)("p", {
                children: e.text
              })]
            }, "".concat(e.from, "-").concat(s)))]
          })]
        }), (0, t.jsxs)("div", {
          className: "agent-panel",
          children: [(0, t.jsxs)("div", {
            className: "agent-panel-head",
            children: [(0, t.jsx)("small", {
              children: "Agent 运行时"
            }), (0, t.jsxs)("div", {
              className: "agent-panel-tags",
              children: [(0, t.jsx)("i", {
                children: "权限：项目文件"
              }), (0, t.jsx)("i", {
                children: "高风险需确认"
              }), (0, t.jsx)("span", {
                className: "停止" === n.status ? "halt" : "",
                children: n.status
              })]
            })]
          }), (0, t.jsx)(eu.hV, {
            items: ej.map(e => e.phase),
            index: e,
            onSelect: s,
            label: "Agent 工作阶段",
            className: "agent-phase-choices"
          }), (0, t.jsx)("ol", {
            className: "agent-trace",
            "aria-label": "工具调用轨迹",
            children: em.map((e, s) => (0, t.jsxs)("li", {
              className: s < n.traceCount ? "" : "pending",
              children: [(0, t.jsx)("b", {
                children: e.icon
              }), (0, t.jsx)("span", {
                children: e.text
              }), (0, t.jsxs)("small", {
                children: ["第 ", e.round, " 轮"]
              })]
            }, e.text))
          }), (0, t.jsx)("div", {
            className: "agent-evidence-box",
            "aria-live": "polite",
            children: (0, t.jsx)("pre", {
              children: n.evidence
            })
          })]
        })]
      }), (0, t.jsx)("p", {
        className: "scene-caption",
        "aria-live": "polite",
        children: n.caption
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "Agent 的关键不是会聊天，而是能在受控范围内依据结果继续行动，也知道何时停止。"
      })]
    });
  },
  "context-engineering": function () {
    let {
        index: e,
        select: s
      } = (0, ex.B)(eg.length),
      n = eg[e],
      a = eg.slice(0, e + 1).filter(e => "drop" !== e.action),
      i = a.reduce((e, s) => e + s.tokens, 0);
    return (0, t.jsxs)(eu.xc, {
      label: "上下文工程取舍图解",
      className: "ce-scene",
      onPrevious: () => s(e - 1),
      onNext: () => s(e + 1),
      children: [(0, t.jsxs)("div", {
        className: "ce-layout",
        children: [(0, t.jsxs)("div", {
          className: "ce-pool",
          children: [(0, t.jsx)("small", {
            children: "可用材料"
          }), eg.map((n, a) => (0, t.jsxs)("button", {
            type: "button",
            className: "ce-item visual-selectable".concat(a === e ? " current" : "").concat(a < e ? " done-".concat(n.action) : ""),
            "aria-pressed": a === e,
            onClick: () => s(a),
            children: [(0, t.jsx)("strong", {
              children: n.label
            }), (0, t.jsx)("span", {
              children: n.note
            }), (0, t.jsxs)("b", {
              className: "ce-tokens",
              children: [n.tokens, " Token"]
            }), a < e && (0, t.jsx)("em", {
              children: n.tag
            })]
          }, n.label))]
        }), (0, t.jsx)("div", {
          className: "ce-gate",
          "aria-hidden": "true",
          children: (0, t.jsx)("i", {
            className: "ti ti-filter"
          })
        }), (0, t.jsxs)("div", {
          className: "ce-box",
          children: [(0, t.jsxs)("small", {
            children: ["本次请求的上下文 \xb7 预算 ", 1e3, " Token"]
          }), a.map(e => (0, t.jsxs)("div", {
            className: "ce-kept ".concat(e.action),
            children: [(0, t.jsx)("strong", {
              children: "compress" === e.action ? "旧讨论摘要" : e.label
            }), (0, t.jsx)("span", {
              children: "compress" === e.action ? "一句决定 \xb7 原文：notes/decisions.md" : "".concat(e.tokens, " Token")
            })]
          }, e.label)), (0, t.jsxs)("div", {
            className: "ce-meter",
            "aria-label": "已使用 ".concat(i, " / ").concat(1e3, " Token"),
            children: [(0, t.jsx)("div", {
              className: "ce-meter-bar",
              children: (0, t.jsx)("i", {
                style: {
                  width: "".concat(Math.min(100, i / 1e3 * 100), "%")
                }
              })
            }), (0, t.jsxs)("span", {
              children: [i, " / ", 1e3, " \xb7 给回答留出 ", 1e3 - i]
            })]
          }), e >= eg.length - 1 && (0, t.jsx)("div", {
            className: "ce-dropped",
            children: "营销页面资料的 220 Token 留在了上下文之外"
          })]
        })]
      }), (0, t.jsx)("p", {
        className: "scene-caption",
        "aria-live": "polite",
        children: n.detail
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "下一轮只带完成当前任务需要的内容；旧记录用摘要和文件位置保留线索。"
      })]
    });
  },
  "harness-engineering": function () {
    var e;
    let s = (0, a.useContext)(ep.gq),
      n = "en" === s ? {
        phases: ["Page renders but fails", "A new session repeats work", "Code breaks repository rules"],
        scenario: "CLASSIC FAILURE",
        failure: "WHAT YOU CAN SEE",
        harness: "ADD TO THE HARNESS",
        feedback: "FEEDBACK TO THE NEXT TURN",
        proof: "WHAT COUNTS AS BETTER",
        cases: [{
          title: "The page looks finished, but the main flow is broken",
          source: "Anthropic \xb7 frontend application harness",
          failures: ["A static screenshot looks plausible", "Clicking Play does nothing", "The agent still reports “done”"],
          evidence: 'playwright.click("Play")\n✗ no state change\nfunctionality: 1 / 5',
          artifacts: ["Independent evaluator", "Playwright interaction", "Screenshots + four criteria"],
          feedbackText: "The evaluator returns the failed click, screenshot, and critique to the generator for another pass.",
          result: "A person can complete the main flow",
          resultDetail: "The run ends only after the live page works and the evaluator’s check passes.",
          takeaway: "A screenshot proves that a page can render. An evaluator that actually operates it proves whether the experience works."
        }, {
          title: "A long task restarts or declares victory too early",
          source: "Anthropic \xb7 long-running agent harness",
          failures: ["The next session repeats setup", "Completed and unfinished work are mixed", "No one knows the next safe step"],
          evidence: "new session\n? what was finished\n? what should run next",
          artifacts: ["feature_list.json", "claude-progress.txt", "init.sh + Git commits"],
          feedbackText: "Each session reads the feature list, progress note, and Git history, then runs a basic smoke test.",
          result: "The next session resumes one unfinished feature",
          resultDetail: "It marks a feature complete only after testing and leaves durable evidence for the next run.",
          takeaway: "Chat history is not durable project state. Files, tests, and commits make progress recoverable."
        }, {
          title: "A large repository gets harder to change every week",
          source: "OpenAI \xb7 agent-first repository harness",
          failures: ["The agent starts in the wrong directory", "New code violates an architecture rule", "Documentation falls out of sync"],
          evidence: "lint: domain layer\n✗ must not import UI layer\n→ docs/architecture.md",
          artifacts: ["Short AGENTS.md map", "Structured docs/ source", "Custom lint + structural tests"],
          feedbackText: "A failing rule names the invalid dependency and points to the documented remediation for the next turn.",
          result: "Invalid changes are blocked before they spread",
          resultDetail: "The repository explains the correct path and CI supplies proof instead of relying on memory.",
          takeaway: "Instructions help the agent find the path; executable rules keep the repository on that path."
        }],
        conclusion: "When a failure repeats, improve the environment that exposes, records, and corrects it—not just the prompt."
      } : {
        phases: ["页面能显示但不能操作", "换一轮就重复旧工作", "代码逐渐违反原有规则"],
        scenario: "经典故障现场",
        failure: "你能看到的失败",
        harness: "补入 Harness",
        feedback: "反馈怎样回到下一轮",
        proof: "什么结果才算改善",
        cases: [{
          title: "页面看起来完成了，主流程却根本不能用",
          source: "Anthropic \xb7 前端应用 Harness 案例",
          failures: ["静态截图看起来像成品", "点击「开始」没有反应", "Agent 仍然自评“已完成”"],
          evidence: 'playwright.click("开始")\n✗ 页面没有变化\n功能评分：1 / 5',
          artifacts: ["独立评审器", "Playwright 实际操作", "截图 + 四类评分"],
          feedbackText: "评审器把失败点击、现场截图和具体批评送回生成器，让下一轮按证据修正。",
          result: "真人可以完成主流程",
          resultDetail: "只有真实页面能操作、评审检查通过，这轮任务才结束。",
          takeaway: "截图只能证明页面能显示；会实际操作页面的评审器，才能证明体验是否真的可用。"
        }, {
          title: "长任务一换会话，就重做旧工作或过早宣布完成",
          source: "Anthropic \xb7 长时间运行 Agent Harness 案例",
          failures: ["新一轮重复搭脚手架", "已完成和未完成混在一起", "没人知道下一步该接哪里"],
          evidence: "新会话开始\n? 昨天完成了什么\n? 下一步该跑什么",
          artifacts: ["feature_list.json", "claude-progress.txt", "init.sh + Git 提交"],
          feedbackText: "每轮先读取功能清单、进度记录和提交历史，再跑一次基础检查确认当前状态。",
          result: "下一轮只接着做一个未完成项",
          resultDetail: "功能经过测试才标记完成，并把可恢复的进度继续留给下一轮。",
          takeaway: "聊天记录不是可靠的项目状态；文件、测试和提交才能让进度真正可恢复。"
        }, {
          title: "大仓库越改越乱，错误做法还会不断复制",
          source: "OpenAI \xb7 Agent 优先仓库 Harness 案例",
          failures: ["Agent 从错误目录开始", "新代码违反架构约束", "项目文档逐渐失效"],
          evidence: "lint：业务层\n✗ 不得引用界面层\n→ docs/architecture.md",
          artifacts: ["短 AGENTS.md 项目地图", "结构化 docs/ 知识源", "自定义 lint + 结构测试"],
          feedbackText: "规则失败时指出哪条依赖不合法，并把修正路径和对应文档交给下一轮。",
          result: "错误改动在扩散前被拦住",
          resultDetail: "仓库告诉 Agent 正确路径，CI 再提供通过证据，不依赖它临时记住规则。",
          takeaway: "说明文件帮助 Agent 找到路；可执行规则确保它不会慢慢偏离这条路。"
        }],
        conclusion: "同一种失败反复出现时，应补能暴露、记录并纠正它的环境支持，而不是只把提示词写得更长。"
      },
      {
        index: i,
        select: r
      } = (0, ex.B)(n.phases.length),
      l = null != (e = n.cases[i]) ? e : n.cases[0];
    return (0, t.jsxs)(eu.xc, {
      label: "en" === s ? "Three classic harness engineering failures" : "三个经典 Harness Engineering 故障案例",
      className: "harness-scene",
      onPrevious: () => r(i - 1),
      onNext: () => r(i + 1),
      children: [(0, t.jsx)(eu.hV, {
        items: n.phases,
        index: i,
        onSelect: r,
        label: "en" === s ? "Classic harness scenarios" : "经典 Harness 场景",
        className: "harness-stage-choices"
      }), (0, t.jsxs)("div", {
        className: "harness-caseboard case-".concat(i),
        children: [(0, t.jsxs)("header", {
          children: [(0, t.jsx)("span", {
            children: n.scenario
          }), (0, t.jsx)("strong", {
            children: l.title
          }), (0, t.jsx)("small", {
            children: l.source
          })]
        }), (0, t.jsxs)("div", {
          className: "harness-case-grid",
          children: [(0, t.jsxs)("section", {
            className: "harness-failure",
            children: [(0, t.jsx)("small", {
              children: n.failure
            }), (0, t.jsx)("ul", {
              children: l.failures.map(e => (0, t.jsx)("li", {
                children: e
              }, e))
            }), (0, t.jsx)("pre", {
              "aria-live": "polite",
              children: l.evidence
            })]
          }), (0, t.jsxs)("section", {
            className: "harness-support",
            children: [(0, t.jsx)("small", {
              children: n.harness
            }), (0, t.jsx)("div", {
              className: "harness-artifact-list",
              children: l.artifacts.map((e, s) => (0, t.jsxs)("code", {
                children: [(0, t.jsx)("i", {
                  children: s + 1
                }), e]
              }, e))
            }), (0, t.jsxs)("p", {
              children: [(0, t.jsx)("b", {
                children: n.feedback
              }), l.feedbackText]
            })]
          }), (0, t.jsxs)("section", {
            className: "harness-proof",
            children: [(0, t.jsx)("small", {
              children: n.proof
            }), (0, t.jsx)("i", {
              className: "ti ti-circle-check"
            }), (0, t.jsx)("strong", {
              children: l.result
            }), (0, t.jsx)("p", {
              children: l.resultDetail
            })]
          })]
        })]
      }), (0, t.jsx)("p", {
        className: "scene-caption",
        "aria-live": "polite",
        children: l.takeaway
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: n.conclusion
      })]
    });
  },
  "human-in-the-loop": function () {
    let e = (0, a.useContext)(ep.gq),
      s = "en" === e ? {
        phases: ["Search complete", "Waiting for you", "Approve and ticket", "Reject and stop"],
        eyebrow: "FICTIONAL EXAMPLE \xb7 PRICES FOR EXPLANATION ONLY",
        title: "Shanghai ⇄ Tokyo \xb7 Weekend trip",
        agent: "Travel Agent",
        flight: "Selected itinerary",
        outbound: "Fri 18:40 \xb7 SHA → HND \xb7 2h 45m",
        inbound: "Sun 19:10 \xb7 HND → SHA \xb7 3h 10m",
        passenger: "Passenger",
        passengerValue: "Lin \xb7 1 adult",
        baggage: "Baggage",
        baggageValue: "1 \xd7 20 kg checked",
        rules: "Change rule",
        rulesValue: "\xa5680 fee \xb7 non-refundable",
        total: "Total with taxes",
        totalValue: "\xa54,260",
        payment: "Payment & ticketing",
        status: ["6 options compared; no charge has occurred", "PAUSED before charge \xb7 your decision is required", "Approved \xb7 charged and ticketed after approval", "Rejected \xb7 stopped with no charge"],
        receipt: ["Search and comparison are read-only, so the agent can complete them automatically.", "The payment tool is interrupted. The dates, passenger, total, and rules are shown before you decide.", "Your approval resumes the same run. Ticket TK-2048 is issued only after the approval event.", "Your rejection ends this branch. The saved payment method was not used."],
        outcome: ["RESEARCHED", "AWAITING APPROVAL", "TICKET ISSUED", "NO CHARGE"],
        timeline: ["Compared", "Pause before payment", "Human decision", "Continue or stop"],
        conclusion: "Human-in-the-loop keeps low-risk research automatic and places a human decision before the high-risk action."
      } : {
        phases: ["搜索完成", "等你确认", "批准后出票", "拒绝并停止"],
        eyebrow: "虚构示例 \xb7 价格仅用于讲解",
        title: "上海 ⇄ 东京 \xb7 周末行程",
        agent: "旅行 Agent",
        flight: "已选往返方案",
        outbound: "周五 18:40 \xb7 SHA → HND \xb7 2 小时 45 分",
        inbound: "周日 19:10 \xb7 HND → SHA \xb7 3 小时 10 分",
        passenger: "乘机人",
        passengerValue: "小林 \xb7 成人 1 人",
        baggage: "行李",
        baggageValue: "20 kg 托运 \xd7 1",
        rules: "退改规则",
        rulesValue: "改签费 \xa5680 \xb7 不可退",
        total: "含税总价",
        totalValue: "\xa54,260",
        payment: "付款与出票",
        status: ["已比较 6 个方案，尚未发生扣款", "扣款前已暂停 \xb7 等待你的决定", "你已批准 \xb7 批准后才扣款出票", "你已拒绝 \xb7 流程停止且没有扣款"],
        receipt: ["搜索和比较是只读操作，Agent 可以自动完成，不必每查一个航班都来询问。", "付款工具被中断；日期、乘机人、总价和退改规则会在你决定前完整展示。", "批准事件让同一次运行从暂停点继续；电子票 TK-2048 只在批准后生成。", "拒绝会结束这条分支；已保存的支付方式没有被使用。"],
        outcome: ["检索完成", "等待人工批准", "已出票", "未扣款"],
        timeline: ["自动比较", "付款前暂停", "人作出决定", "继续或停止"],
        conclusion: "人在回路让低风险检索保持自动化，同时把人的决定放在真正高风险的动作之前。"
      },
      {
        index: n,
        select: i
      } = (0, ex.B)(s.phases.length),
      r = 2 === n ? "approved" : 3 === n ? "rejected" : 1 === n ? "waiting" : "";
    return (0, t.jsxs)(eu.xc, {
      label: "旅行 Agent 付款前人工确认图解",
      className: "hitl-scene",
      onPrevious: () => i(n - 1),
      onNext: () => i(n + 1),
      children: [(0, t.jsx)(eu.hV, {
        items: s.phases,
        index: n,
        onSelect: i,
        label: "en" === e ? "Travel approval stage" : "旅行审批阶段",
        className: "hitl-stage-choices"
      }), (0, t.jsxs)("div", {
        className: "hitl-booking ".concat(r).trim(),
        children: [(0, t.jsxs)("header", {
          children: [(0, t.jsxs)("span", {
            children: [(0, t.jsx)("small", {
              children: s.eyebrow
            }), (0, t.jsx)("strong", {
              children: s.title
            })]
          }), (0, t.jsxs)("b", {
            children: [(0, t.jsx)("i", {
              className: "ti ti-sparkles"
            }), s.agent]
          })]
        }), (0, t.jsx)("div", {
          className: "hitl-runline",
          "aria-hidden": "true",
          children: s.timeline.map((e, s) => (0, t.jsxs)("span", {
            className: s <= n ? "on" : "",
            children: [(0, t.jsx)("i", {
              children: s < n ? "✓" : s + 1
            }), e]
          }, e))
        }), (0, t.jsxs)("div", {
          className: "hitl-body",
          children: [(0, t.jsxs)("section", {
            className: "hitl-ticket",
            children: [(0, t.jsx)("small", {
              children: s.flight
            }), (0, t.jsx)("strong", {
              children: s.outbound
            }), (0, t.jsx)("strong", {
              children: s.inbound
            }), (0, t.jsxs)("dl", {
              children: [(0, t.jsxs)("div", {
                children: [(0, t.jsx)("dt", {
                  children: s.passenger
                }), (0, t.jsx)("dd", {
                  children: s.passengerValue
                })]
              }), (0, t.jsxs)("div", {
                children: [(0, t.jsx)("dt", {
                  children: s.baggage
                }), (0, t.jsx)("dd", {
                  children: s.baggageValue
                })]
              }), (0, t.jsxs)("div", {
                children: [(0, t.jsx)("dt", {
                  children: s.rules
                }), (0, t.jsx)("dd", {
                  children: s.rulesValue
                })]
              })]
            })]
          }), (0, t.jsxs)("section", {
            className: "hitl-decision",
            children: [(0, t.jsx)("small", {
              children: s.payment
            }), (0, t.jsxs)("div", {
              className: "hitl-total",
              children: [(0, t.jsx)("span", {
                children: s.total
              }), (0, t.jsx)("strong", {
                children: s.totalValue
              })]
            }), (0, t.jsxs)("div", {
              className: "hitl-gate",
              "aria-live": "polite",
              children: [(0, t.jsx)("i", {
                className: "ti ".concat(2 === n ? "ti-ticket" : 3 === n ? "ti-circle-x" : 1 === n ? "ti-user-check" : "ti-lock")
              }), (0, t.jsxs)("span", {
                children: [(0, t.jsx)("b", {
                  children: s.outcome[n]
                }), (0, t.jsx)("small", {
                  children: s.status[n]
                })]
              })]
            }), (0, t.jsx)("p", {
              children: s.receipt[n]
            })]
          })]
        })]
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: s.conclusion
      })]
    });
  },
  mcp: function () {
    let {
        index: e,
        select: s
      } = (0, ex.B)(ev.length),
      n = ev[e],
      a = e => n.part === e ? " current" : "";
    return (0, t.jsxs)(eu.xc, {
      label: "MCP 查询真实工单图解",
      className: "mcp-scene",
      onPrevious: () => s(e - 1),
      onNext: () => s(e + 1),
      children: [(0, t.jsx)(eu.hV, {
        items: ev.map(e => e.label),
        index: e,
        onSelect: s,
        label: "查工单阶段",
        className: "mcp-stage-choices"
      }), (0, t.jsxs)("div", {
        className: "mcp-case-study",
        children: [(0, t.jsxs)("header", {
          className: a("host"),
          children: [(0, t.jsx)("small", {
            children: "用户问题"
          }), (0, t.jsx)("strong", {
            children: "“工单 #1024 谁负责？”"
          })]
        }), (0, t.jsxs)("div", {
          className: "mcp-case-path",
          children: [(0, t.jsxs)("button", {
            type: "button",
            className: "mcp-case-node visual-selectable".concat(a("host")),
            "aria-pressed": "host" === n.part,
            onClick: () => s(0),
            children: [(0, t.jsx)("small", {
              children: "Host"
            }), (0, t.jsx)("strong", {
              children: "AI 应用"
            }), (0, t.jsx)("span", {
              children: "MCP Client 在应用内"
            })]
          }), (0, t.jsxs)("button", {
            type: "button",
            className: "mcp-case-link visual-selectable".concat(a("link")),
            "aria-pressed": "link" === n.part,
            onClick: () => s(2),
            children: [(0, t.jsx)("i", {
              "aria-hidden": "true",
              children: "→"
            }), (0, t.jsx)("code", {
              children: n.call
            })]
          }), (0, t.jsxs)("button", {
            type: "button",
            className: "mcp-case-node visual-selectable".concat(a("server")),
            "aria-pressed": "server" === n.part,
            onClick: () => s(1),
            children: [(0, t.jsx)("small", {
              children: "MCP Server"
            }), (0, t.jsx)("strong", {
              children: "工单服务"
            }), (0, t.jsx)("code", {
              children: "get_ticket"
            })]
          }), (0, t.jsxs)("button", {
            type: "button",
            className: "mcp-case-node visual-selectable".concat(a("system")),
            "aria-pressed": "system" === n.part,
            onClick: () => s(3),
            children: [(0, t.jsx)("small", {
              children: "外部系统"
            }), (0, t.jsx)("strong", {
              children: "工单系统"
            }), (0, t.jsx)("span", {
              children: e >= 3 ? "只读权限 ✓" : "保存真实工单"
            })]
          })]
        }), (0, t.jsxs)("button", {
          type: "button",
          className: "mcp-case-result visual-selectable".concat(a("result")),
          "aria-pressed": "result" === n.part,
          onClick: () => s(4),
          children: [(0, t.jsxs)("span", {
            children: [(0, t.jsx)("small", {
              children: "本轮状态"
            }), (0, t.jsx)("strong", {
              children: n.status
            })]
          }), (0, t.jsx)("code", {
            children: e >= 4 ? "#1024 登录失败 \xb7 负责人：小林" : "结果等待中"
          })]
        })]
      }), (0, t.jsx)("p", {
        className: "scene-caption",
        "aria-live": "polite",
        children: n.detail
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "MCP 统一工具怎样被发现和调用；真实数据与访问权限仍由外部系统负责。"
      })]
    });
  },
  skill: function () {
    let {
        index: e,
        select: s
      } = (0, ex.B)(eb.length),
      n = eb[e];
    return (0, t.jsxs)(eu.xc, {
      label: "Skill 组成与按需加载图解",
      className: "skill-scene",
      onPrevious: () => s(e - 1),
      onNext: () => s(e + 1),
      children: [(0, t.jsxs)("div", {
        className: "skill-task-strip",
        children: [(0, t.jsxs)("span", {
          children: [(0, t.jsx)("small", {
            children: "当前任务"
          }), (0, t.jsx)("strong", {
            children: "准备一条视频并完成发布前检查"
          })]
        }), (0, t.jsx)("em", {
          children: n.when
        })]
      }), (0, t.jsxs)("div", {
        className: "skill-layout",
        children: [(0, t.jsxs)("div", {
          className: "project-tree skill-tree",
          children: [(0, t.jsxs)("strong", {
            children: ["video-publisher/", (0, t.jsx)("small", {
              children: "一个 Skill 文件夹"
            })]
          }), eb.map((n, a) => (0, t.jsxs)("button", {
            type: "button",
            className: "visual-selectable".concat(a === e ? " active" : ""),
            "aria-pressed": a === e,
            onClick: () => s(a),
            children: [(0, t.jsxs)("b", {
              children: ["⌁ ", n.name]
            }), (0, t.jsx)("em", {
              children: n.kind
            })]
          }, n.id))]
        }), (0, t.jsxs)("div", {
          className: "skill-agent-node",
          children: [(0, t.jsx)("div", {
            className: "skill-agent-face",
            "aria-hidden": "true",
            children: (0, t.jsx)("i", {
              className: "ti ti-ai-agent"
            })
          }), (0, t.jsx)("small", {
            children: "Agent"
          }), (0, t.jsx)("strong", {
            children: n.action
          }), (0, t.jsx)("i", {
            className: "skill-agent-link left",
            "aria-hidden": "true"
          }), (0, t.jsx)("i", {
            className: "skill-agent-link right",
            "aria-hidden": "true"
          })]
        }), (0, t.jsxs)("div", {
          className: "skill-preview",
          "aria-live": "polite",
          children: [(0, t.jsxs)("div", {
            className: "skill-preview-head",
            children: [(0, t.jsx)("small", {
              children: n.when
            }), (0, t.jsx)("strong", {
              children: n.name
            })]
          }), n.preview, (0, t.jsx)("p", {
            children: n.detail
          })]
        })]
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "Skill 是一个文件夹，入口是 SKILL.md；其他文件按任务需要添加。"
      })]
    });
  },
  "sub-agent": function () {
    let {
        index: e,
        select: s
      } = (0, ex.B)(ef.length + 2),
      n = e === ef.length + 1,
      a = ["主 Agent 写清每个子任务的目标、输入、权限和交付格式，避免多个 Agent 做同一件事。", ...ef.map(e => "Sub Agent「".concat(e.task, "」在独立上下文中执行，互不占对方的窗口。")), "主 Agent 汇总证据、解决冲突：两个子任务都提到 nav.jsx，保留通过构建的版本。"];
    return (0, t.jsxs)(eu.xc, {
      label: "Sub Agent 委派关系图解",
      className: "sub-scene",
      onPrevious: () => s(e - 1),
      onNext: () => s(e + 1),
      children: [(0, t.jsxs)("div", {
        className: "sub-layout",
        children: [(0, t.jsxs)("button", {
          type: "button",
          className: "sub-main visual-selectable".concat(0 === e ? " current" : ""),
          "aria-pressed": 0 === e,
          onClick: () => s(0),
          children: [(0, t.jsx)("small", {
            children: "主 Agent"
          }), (0, t.jsx)("strong", {
            children: 0 === e ? "拆出 3 个边界清楚的子任务" : "等待各 Sub Agent 交付"
          })]
        }), (0, t.jsxs)("div", {
          className: "sub-fan",
          "aria-hidden": "true",
          children: [(0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("i", {})]
        }), (0, t.jsx)("div", {
          className: "sub-lanes",
          children: ef.map((n, a) => {
            let i = e === a + 1 ? "running" : e > a + 1 ? "done" : "idle";
            return (0, t.jsxs)("button", {
              type: "button",
              className: "sub-lane visual-selectable ".concat(i),
              "aria-pressed": e === a + 1,
              onClick: () => s(a + 1),
              children: [(0, t.jsx)("small", {
                children: "Sub Agent"
              }), (0, t.jsx)("strong", {
                children: n.task
              }), (0, t.jsx)("span", {
                children: "done" === i ? "✓ ".concat(n.output) : "running" === i ? "执行中…" : n.input
              }), (0, t.jsx)("span", {
                className: "sub-progress",
                "aria-hidden": "true",
                children: (0, t.jsx)("i", {
                  style: {
                    width: "done" === i ? "100%" : "running" === i ? "".concat(n.progress, "%") : "0%"
                  }
                })
              })]
            }, n.id);
          })
        }), (0, t.jsxs)("button", {
          type: "button",
          className: "sub-conflict visual-selectable".concat(n ? " current" : ""),
          "aria-pressed": n,
          onClick: () => s(ef.length + 1),
          children: [(0, t.jsx)("small", {
            children: n ? "汇总时发现的冲突" : "汇总结果"
          }), (0, t.jsx)("span", {
            children: n ? "两个子任务都涉及 nav.jsx → 保留构建通过的版本，重新检查一次。" : "接收并核对 3 份结果"
          })]
        })]
      }), (0, t.jsx)("p", {
        className: "scene-caption",
        "aria-live": "polite",
        children: a[e]
      }), (0, t.jsx)("p", {
        className: "stage-conclusion",
        children: "Sub Agent 适合边界清楚、可以独立验收的工作；拆分本身也会带来协调成本。"
      })]
    });
  }
};
function e0(e) {
  let {
    kind: s,
    locale: n = "zh",
    example: i
  } = e;
  if (i) return (0, t.jsx)(a.Suspense, {
    fallback: null,
    children: (0, t.jsx)(eQ, {
      example: i,
      locale: n
    }, "".concat(s, "-").concat(n))
  });
  if (ek.has(s)) return (0, t.jsx)(a.Suspense, {
    fallback: null,
    children: (0, t.jsx)(eY, {
      kind: s,
      locale: n
    })
  });
  if (eJ.has(s)) return (0, t.jsx)(ep.gq.Provider, {
    value: "en" === n ? "en" : "zh",
    children: (0, t.jsx)(a.Suspense, {
      fallback: null,
      children: (0, t.jsx)(eZ, {
        kind: s
      })
    })
  });
  if (eh.l.has(s)) return (0, t.jsx)(ep.gq.Provider, {
    value: "en" === n ? "en" : "zh",
    children: (0, t.jsx)(a.Suspense, {
      fallback: null,
      children: (0, t.jsx)(e$, {
        kind: s
      })
    })
  });
  let r = eX[s];
  return r ? (0, t.jsx)(ep.gq.Provider, {
    value: "en" === n ? "en" : "zh",
    children: (0, t.jsx)(r, {})
  }) : eo.has(s) ? (0, t.jsx)(ed, {
    kind: s,
    locale: n
  }) : E.has(s) ? (0, t.jsx)(I, {
    kind: s,
    locale: n
  }) : null;
}
function e1(e) {
  let {
    eyebrow: s,
    title: n,
    lead: a
  } = e;
  return (0, t.jsxs)("header", {
    className: "asg-heading",
    children: [(0, t.jsx)("span", {
      children: s
    }), (0, t.jsx)("h2", {
      children: n
    }), a && (0, t.jsx)("p", {
      children: a
    })]
  });
}
function e2(e) {
  let {
    items: s,
    value: n,
    onChange: a,
    label: i
  } = e;
  return (0, t.jsx)("div", {
    className: "asg-controls",
    role: "group",
    "aria-label": i,
    children: s.map((e, s) => (0, t.jsxs)("button", {
      type: "button",
      className: n === s ? "is-active" : "",
      "aria-pressed": n === s,
      onClick: () => a(s),
      children: [(0, t.jsx)("span", {
        children: s + 1
      }), e.label]
    }, e.id))
  });
}
function e3(e) {
  let {
      text: s,
      isEn: n
    } = e,
    [i, r] = (0, a.useState)(!1);
  async function l() {
    await navigator.clipboard.writeText(s), r(!0);
  }
  return (0, a.useEffect)(() => {
    if (!i) return;
    let e = window.setTimeout(() => r(!1), 1600);
    return () => window.clearTimeout(e);
  }, [i]), (0, t.jsxs)("button", {
    className: "asg-copy",
    type: "button",
    onClick: l,
    children: [(0, t.jsx)("i", {
      className: "ti ".concat(i ? "ti-check" : "ti-copy"),
      "aria-hidden": "true"
    }), i ? n ? "Copied" : "已复制" : n ? "Copy" : "复制"]
  });
}
function e4(e) {
  let {
    title: s,
    text: n,
    copyable: a = !1,
    isEn: i
  } = e;
  return (0, t.jsxs)("div", {
    className: "asg-chat-window",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("span", {
        className: "asg-chat-avatar",
        children: i ? "You" : "你"
      }), (0, t.jsx)("strong", {
        children: s
      }), a && (0, t.jsx)(e3, {
        text: n,
        isEn: i
      })]
    }), (0, t.jsx)("pre", {
      children: n
    })]
  });
}
function e8(e) {
  let {
    data: s,
    isEn: n
  } = e;
  return (0, t.jsxs)("section", {
    className: "asg-section",
    children: [(0, t.jsx)(e1, {
      eyebrow: s.eyebrow,
      title: s.title,
      lead: s.lead
    }), (0, t.jsxs)("div", {
      className: "asg-install-scene",
      children: [(0, t.jsx)(e4, {
        title: n ? "Send these two lines to your agent" : "把这两行发给 Agent",
        text: s.prompt,
        copyable: !0,
        isEn: n
      }), (0, t.jsx)("div", {
        className: "asg-install-arrow",
        "aria-hidden": "true",
        children: "→"
      }), (0, t.jsxs)("div", {
        className: "asg-installed-folder",
        children: [(0, t.jsx)("i", {
          className: "ti ti-folder-check",
          "aria-hidden": "true"
        }), (0, t.jsxs)("span", {
          children: [(0, t.jsx)("small", {
            children: n ? "Installed" : "安装完成"
          }), (0, t.jsx)("strong", {
            children: "skills/vibehub/"
          }), (0, t.jsx)("em", {
            children: n ? "Your agent can use it now" : "Agent 已经可以使用"
          })]
        })]
      })]
    }), (0, t.jsxs)("p", {
      className: "asg-source-line",
      children: [(0, t.jsx)("strong", {
        children: n ? "A Skill can also come from: " : "Skill 也可以来自："
      }), s.sources.join(n ? ", " : "、")]
    }), (0, t.jsxs)("div", {
      className: "asg-use-example",
      children: [(0, t.jsxs)("div", {
        children: [(0, t.jsx)("small", {
          children: n ? "How to use it after installation" : "安装以后怎么用"
        }), (0, t.jsx)("strong", {
          children: n ? "Tell your agent what you want to do" : "直接告诉 Agent 你要做什么"
        }), (0, t.jsx)("p", {
          children: s.usageNote
        })]
      }), (0, t.jsx)(e4, {
        title: n ? "For example" : "例如",
        text: s.usagePrompt,
        isEn: n
      })]
    }), (0, t.jsx)("p", {
      className: "asg-boundary-line",
      children: s.boundary
    })]
  });
}
function e5(e) {
  let {
    data: s,
    isEn: n
  } = e;
  return (0, t.jsxs)("section", {
    className: "asg-section",
    children: [(0, t.jsx)(e1, {
      eyebrow: s.eyebrow,
      title: s.title,
      lead: s.lead
    }), (0, t.jsxs)("div", {
      className: "asg-value-scene",
      children: [(0, t.jsxs)("div", {
        className: "asg-workflow-sheet",
        children: [(0, t.jsxs)("span", {
          children: [(0, t.jsx)("i", {
            className: "ti ti-list-check",
            "aria-hidden": "true"
          }), s.workflow.title]
        }), (0, t.jsx)("ol", {
          children: s.workflow.items.map(e => (0, t.jsx)("li", {
            children: e
          }, e))
        })]
      }), (0, t.jsxs)("div", {
        className: "asg-skill-core",
        children: [(0, t.jsx)("i", {
          className: "ti ti-folder",
          "aria-hidden": "true"
        }), (0, t.jsx)("strong", {
          children: "Skill"
        })]
      }), (0, t.jsxs)("div", {
        className: "asg-knowledge-files",
        children: [(0, t.jsxs)("span", {
          children: [(0, t.jsx)("i", {
            className: "ti ti-books",
            "aria-hidden": "true"
          }), s.knowledge.title]
        }), s.knowledge.items.map(e => (0, t.jsxs)("code", {
          children: [(0, t.jsx)("i", {
            className: "ti ti-file",
            "aria-hidden": "true"
          }), e]
        }, e))]
      })]
    }), (0, t.jsxs)("div", {
      className: "asg-value-labels",
      "aria-label": n ? "Two things a Skill does" : "Skill 的两个作用",
      children: [(0, t.jsxs)("span", {
        children: [(0, t.jsx)("b", {
          children: "1"
        }), (0, t.jsx)("strong", {
          children: n ? "Standardize a workflow" : "固化工作流"
        }), (0, t.jsx)("small", {
          children: n ? "Use the same steps each time" : "每次按同一套步骤做"
        })]
      }), (0, t.jsxs)("span", {
        children: [(0, t.jsx)("b", {
          children: "2"
        }), (0, t.jsx)("strong", {
          children: n ? "Provide new knowledge" : "提供新知识"
        }), (0, t.jsx)("small", {
          children: n ? "Give the agent information it did not have" : "把 Agent 原本没有的资料交给它"
        })]
      })]
    })]
  });
}
function e6(e) {
  let {
    data: s,
    isEn: n
  } = e;
  return (0, t.jsxs)("section", {
    className: "asg-section",
    children: [(0, t.jsx)(e1, {
      eyebrow: s.eyebrow,
      title: s.title,
      lead: s.lead
    }), (0, t.jsxs)("div", {
      className: "asg-create-scene",
      children: [(0, t.jsx)(e4, {
        title: n ? "Tell your agent this" : "直接这样告诉 Agent",
        text: s.prompt,
        copyable: !0,
        isEn: n
      }), (0, t.jsx)("div", {
        className: "asg-create-arrow",
        "aria-hidden": "true",
        children: "→"
      }), (0, t.jsxs)("div", {
        className: "asg-created-skill",
        children: [(0, t.jsx)("i", {
          className: "ti ti-folder-plus",
          "aria-hidden": "true"
        }), (0, t.jsxs)("span", {
          children: [(0, t.jsx)("strong", {
            children: "video-publisher/"
          }), (0, t.jsx)("code", {
            children: "SKILL.md"
          }), (0, t.jsx)("code", {
            children: "scripts/"
          }), (0, t.jsx)("code", {
            children: "references/"
          })]
        })]
      })]
    }), (0, t.jsx)("ol", {
      className: "asg-create-steps",
      children: s.steps.map((e, s) => (0, t.jsxs)("li", {
        children: [(0, t.jsx)("span", {
          children: s + 1
        }), (0, t.jsx)("p", {
          children: e
        })]
      }, e))
    })]
  });
}
function e9(e) {
  let {
    data: s,
    isEn: n
  } = e;
  return (0, t.jsxs)("section", {
    className: "asg-section",
    children: [(0, t.jsx)(e1, {
      eyebrow: s.eyebrow,
      title: s.title,
      lead: s.lead
    }), (0, t.jsxs)("div", {
      className: "asg-test-task",
      children: [(0, t.jsx)("small", {
        children: n ? "Same model \xb7 same input \xb7 same task" : "相同模型 \xb7 相同输入 \xb7 相同任务"
      }), (0, t.jsx)("strong", {
        children: s.task
      })]
    }), (0, t.jsxs)("div", {
      className: "asg-test-lanes",
      children: [(0, t.jsxs)("article", {
        children: [(0, t.jsxs)("header", {
          children: [(0, t.jsx)("i", {
            className: "ti ti-user-question",
            "aria-hidden": "true"
          }), (0, t.jsx)("strong", {
            children: n ? "Without a Skill" : "没有 Skill"
          })]
        }), (0, t.jsx)("p", {
          children: s.without
        }), (0, t.jsxs)("div", {
          className: "asg-test-output is-rough",
          children: [(0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("span", {
            children: n ? "Results vary more" : "结果容易变化"
          })]
        })]
      }), (0, t.jsxs)("article", {
        children: [(0, t.jsxs)("header", {
          children: [(0, t.jsx)("i", {
            className: "ti ti-folder-check",
            "aria-hidden": "true"
          }), (0, t.jsx)("strong", {
            children: n ? "With the Skill loaded" : "加载 Skill"
          })]
        }), (0, t.jsx)("p", {
          children: s.with
        }), (0, t.jsxs)("div", {
          className: "asg-test-output is-ready",
          children: [(0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("span", {
            children: n ? "Results are easier to reproduce" : "结果更容易复现"
          })]
        })]
      })]
    }), (0, t.jsx)("div", {
      className: "asg-test-metrics",
      children: s.metrics.map(e => (0, t.jsxs)("span", {
        children: [(0, t.jsx)("i", {}), e]
      }, e))
    }), (0, t.jsx)("p", {
      className: "asg-boundary-line",
      children: s.boundary
    })]
  });
}
function e7(e) {
  let {
    item: s,
    isEn: n
  } = e;
  return "description" === s.id ? (0, t.jsxs)("div", {
    className: "asg-skill-editor",
    children: [(0, t.jsxs)("header", {
      children: [(0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("b", {
        children: "SKILL.md"
      })]
    }), (0, t.jsxs)("code", {
      children: [(0, t.jsx)("em", {
        children: "name:"
      }), " video-publisher"]
    }), (0, t.jsxs)("code", {
      className: "is-highlighted",
      children: [(0, t.jsx)("em", {
        children: "description:"
      }), " ", n ? "Publish videos and check platform requirements. Use when someone is preparing to publish, checking dimensions, or making a cover image." : "发布视频并检查平台要求。用户准备发布、检查尺寸或生成封面时使用。"]
    }), (0, t.jsx)("code", {
      children: n ? "Complete the checks, generation, and pre-publish confirmation in order." : "按顺序完成检查、生成和发布前确认。"
    })]
  }) : "scripts" === s.id ? (0, t.jsxs)("div", {
    className: "asg-script-evidence",
    children: [(0, t.jsxs)("div", {
      children: [(0, t.jsx)("i", {
        className: "ti ti-file-code",
        "aria-hidden": "true"
      }), (0, t.jsx)("strong", {
        children: "scripts/check-video.mjs"
      }), (0, t.jsx)("span", {
        children: n ? "Let the script handle repeatable checks" : "固定检查交给程序"
      })]
    }), (0, t.jsxs)("pre", {
      children: ["$ node scripts/check-video.mjs", "\n", "✓ ", n ? "Dimensions are correct" : "尺寸正确", "\n", "✓ ", n ? "Captions found" : "字幕存在"]
    })]
  }) : (0, t.jsxs)("div", {
    className: "asg-concise-evidence",
    children: [(0, t.jsxs)("div", {
      className: "asg-skill-editor",
      children: [(0, t.jsxs)("header", {
        children: [(0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("i", {}), (0, t.jsx)("b", {
          children: "SKILL.md"
        })]
      }), (0, t.jsx)("code", {
        children: n ? "1. Read the platform rules" : "1. 读取平台规则"
      }), (0, t.jsx)("code", {
        children: n ? "2. Run the check script" : "2. 运行检查脚本"
      }), (0, t.jsx)("code", {
        children: n ? "3. Generate a pre-publish checklist" : "3. 生成发布前清单"
      })]
    }), (0, t.jsxs)("p", {
      children: [(0, t.jsx)("strong", {
        children: n ? "Keep only what the task needs" : "只保留完成任务需要的信息"
      }), (0, t.jsx)("span", {
        children: n ? "Short, clear, and easy to find" : "短、清楚、容易定位"
      })]
    })]
  });
}
function se(e) {
  var s;
  let {
      data: n,
      isEn: i
    } = e,
    [r, l] = (0, a.useState)(0),
    c = null != (s = n.topics[r]) ? s : n.topics[0];
  return c ? (0, t.jsxs)("section", {
    className: "asg-section",
    children: [(0, t.jsx)(e1, {
      eyebrow: n.eyebrow,
      title: n.title,
      lead: n.lead
    }), (0, t.jsxs)("div", {
      className: "asg-practice",
      children: [(0, t.jsx)(e2, {
        items: n.topics,
        value: r,
        onChange: l,
        label: i ? "Switch Skill best practices" : "切换 Skill 最佳实践"
      }), (0, t.jsx)("div", {
        className: "asg-practice-stage",
        "aria-live": "polite",
        children: (0, t.jsx)(e7, {
          item: c,
          isEn: i
        })
      }), (0, t.jsxs)("p", {
        className: "asg-result-note",
        children: [(0, t.jsxs)("strong", {
          children: [c.label, "："]
        }), c.detail]
      })]
    })]
  }) : null;
}
function ss(e) {
  let {
    module: s,
    locale: n
  } = e;
  if (!s) return null;
  let a = "en" === n;
  return (0, t.jsxs)("div", {
    className: "agent-skill-guide",
    children: [(0, t.jsx)(e8, {
      data: s.install,
      isEn: a
    }), (0, t.jsx)(e5, {
      data: s.value,
      isEn: a
    }), (0, t.jsx)(e6, {
      data: s.creation,
      isEn: a
    }), (0, t.jsx)(e9, {
      data: s.test,
      isEn: a
    }), (0, t.jsx)(se, {
      data: s.practices,
      isEn: a
    })]
  });
}
export { e0 as ConceptVisual, ss as SkillGuide };
