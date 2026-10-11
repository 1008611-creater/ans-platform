// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import * as n from "react/jsx-runtime";
import * as i from "react";
import * as r from "./visual-state.js";
import * as t from "./shuffle.js";
let c = {
  frontend: {
    zh: "前端 \xb7 浏览器",
    en: "Frontend \xb7 Browser",
    hintZh: "用户看得到、点得到的一层",
    hintEn: "What users see and touch"
  },
  api: {
    zh: "API \xb7 约定",
    en: "API \xb7 Contract",
    hintZh: "请求与响应的共同约定",
    hintEn: "Shared request / response rules"
  },
  backend: {
    zh: "后端",
    en: "Backend",
    hintZh: "可信规则真正执行的地方",
    hintEn: "Where trusted rules run"
  },
  database: {
    zh: "数据库",
    en: "Database",
    hintZh: "长期保存数据的地方",
    hintEn: "Where data stays long-term"
  }
};
function d(e, a, s) {
  let n = ["fj-zone", "fj-".concat(e)];
  return a.activeZones.includes(e) && n.push("is-active"), s.includes(e) && n.push("is-focus"), n.join(" ");
}
function l(e) {
  let {
      state: a,
      isEn: s
    } = e,
    i = s ? "Aiko" : "小林",
    r = "success" === a,
    t = "sending" === a || "waiting" === a,
    c = "refreshing" === a,
    d = "loading" === a,
    l = t || d || c;
  return (0, n.jsxs)("div", {
    className: "fj-browser-frame browser-".concat(a),
    children: [(0, n.jsxs)("div", {
      className: "fj-browser-bar",
      "aria-hidden": "true",
      children: [(0, n.jsx)("i", {}), (0, n.jsx)("i", {}), (0, n.jsx)("i", {}), (0, n.jsx)("span", {
        children: "app.example.com/profile"
      })]
    }), (0, n.jsxs)("div", {
      className: "fj-browser-page",
      children: [(0, n.jsxs)("div", {
        className: "fj-profile-card",
        children: [(0, n.jsx)("div", {
          className: "fj-avatar",
          "aria-hidden": "true",
          children: i.slice(0, 1)
        }), (0, n.jsxs)("div", {
          className: "fj-profile-fields",
          children: [(0, n.jsxs)("label", {
            children: [(0, n.jsx)("span", {
              children: s ? "Display name" : "昵称"
            }), (0, n.jsx)("div", {
              className: "fj-input".concat(l ? " is-busy" : "").concat(r ? " is-saved" : ""),
              children: c ? "…" : i
            })]
          }), (0, n.jsx)("button", {
            type: "button",
            className: "fj-save-btn".concat(t || d ? " is-busy" : "").concat(r ? " is-done" : ""),
            tabIndex: -1,
            children: r ? s ? "Saved" : "已保存" : t ? s ? "Saving…" : "保存中…" : d ? s ? "Loading…" : "读取中…" : s ? "Save" : "保存"
          })]
        })]
      }), r && (0, n.jsx)("div", {
        className: "fj-toast is-ok",
        "aria-hidden": "true",
        children: s ? "Updated from the real response" : "已按服务端真实结果更新"
      }), c && (0, n.jsx)("div", {
        className: "fj-toast is-info",
        "aria-hidden": "true",
        children: s ? "Page reloading…" : "页面正在刷新…"
      }), d && (0, n.jsx)("div", {
        className: "fj-toast is-info",
        "aria-hidden": "true",
        children: s ? "Reading the same saved record…" : "正在读取同一条已保存记录…"
      })]
    })]
  });
}
function o(e) {
  let {
      state: a,
      isEn: s
    } = e,
    i = "read" === a,
    r = "request" === a || "read" === a || "response" === a,
    t = "response" === a;
  return (0, n.jsxs)("div", {
    className: "fj-api-card api-".concat(a),
    children: [(0, n.jsx)("div", {
      className: "fj-api-block".concat(r && !t ? " is-on" : "").concat(t ? " is-done" : "").concat(r ? "" : " is-idle"),
      children: r ? (0, n.jsxs)(n.Fragment, {
        children: [(0, n.jsxs)("div", {
          className: "fj-api-line",
          children: [(0, n.jsx)("b", {
            children: i ? "GET" : "POST"
          }), (0, n.jsx)("code", {
            children: "/api/profile"
          })]
        }), (0, n.jsx)("pre", {
          children: i ? "id = 7" : '{ "name": "'.concat(s ? "Aiko" : "小林", '" }')
        })]
      }) : (0, n.jsxs)(n.Fragment, {
        children: [(0, n.jsxs)("div", {
          className: "fj-api-line",
          children: [(0, n.jsx)("b", {
            children: "API"
          }), (0, n.jsx)("code", {
            children: "/api/profile"
          })]
        }), (0, n.jsx)("pre", {
          children: s ? "URL \xb7 method \xb7 body" : "地址 \xb7 方法 \xb7 数据"
        })]
      })
    }), (0, n.jsx)("div", {
      className: "fj-api-arrow",
      "aria-hidden": "true",
      children: t ? "←" : r ? "→" : "\xb7"
    }), (0, n.jsx)("div", {
      className: "fj-api-block response".concat(t ? " is-on" : "").concat(t ? "" : " is-idle"),
      children: t ? (0, n.jsxs)(n.Fragment, {
        children: [(0, n.jsxs)("div", {
          className: "fj-api-line",
          children: [(0, n.jsx)("b", {
            className: "ok",
            children: "200"
          }), (0, n.jsx)("code", {
            children: s ? "OK" : "成功"
          })]
        }), (0, n.jsx)("pre", {
          children: '{ "ok": true }'
        })]
      }) : (0, n.jsxs)(n.Fragment, {
        children: [(0, n.jsxs)("div", {
          className: "fj-api-line",
          children: [(0, n.jsx)("b", {
            className: "muted",
            children: "—"
          }), (0, n.jsx)("code", {
            children: s ? "response" : "响应"
          })]
        }), (0, n.jsx)("pre", {
          children: s ? "status \xb7 body" : "状态码 \xb7 内容"
        })]
      })
    })]
  });
}
function h(e) {
  let {
      state: a,
      isEn: s
    } = e,
    i = "writing" === a || "done" === a || "reading" === a,
    r = s ? [{
      id: "auth",
      label: "Signed-in user?",
      pass: "idle" !== a,
      run: "checking" === a
    }, {
      id: "rules",
      label: "Name length OK?",
      pass: i || "checking" === a,
      run: "checking" === a
    }, {
      id: "perm",
      label: "Allowed to update?",
      pass: i,
      run: "checking" === a
    }, {
      id: "persist",
      label: "reading" === a ? "Query by same id" : "Write only after checks",
      pass: "writing" === a || "done" === a || "reading" === a,
      run: "writing" === a || "reading" === a
    }] : [{
      id: "auth",
      label: "已登录？",
      pass: "idle" !== a,
      run: "checking" === a
    }, {
      id: "rules",
      label: "昵称长度合法？",
      pass: i || "checking" === a,
      run: "checking" === a
    }, {
      id: "perm",
      label: "有权限改这条？",
      pass: i,
      run: "checking" === a
    }, {
      id: "persist",
      label: "reading" === a ? "按同一 id 查询" : "校验通过再写入",
      pass: "writing" === a || "done" === a || "reading" === a,
      run: "writing" === a || "reading" === a
    }];
  return (0, n.jsxs)("div", {
    className: "fj-backend-panel backend-".concat(a),
    children: [(0, n.jsxs)("div", {
      className: "fj-backend-status",
      children: [(0, n.jsx)("span", {
        className: "fj-pulse".concat("idle" !== a && "done" !== a ? " is-on" : ""),
        "aria-hidden": "true"
      }), (0, n.jsx)("strong", {
        children: {
          idle: s ? "Waiting for request" : "等待请求",
          checking: s ? "Checking rules…" : "正在检查规则…",
          writing: s ? "Writing to database…" : "正在写入数据库…",
          reading: s ? "Reading from database…" : "正在查询数据库…",
          done: s ? "Returning result" : "正在返回结果"
        }[a] || (s ? "Idle" : "空闲")
      })]
    }), (0, n.jsx)("ul", {
      className: "fj-check-list",
      children: r.map(e => (0, n.jsxs)("li", {
        className: "".concat(e.pass ? "is-pass" : "").concat(e.run && !e.pass ? " is-run" : ""),
        children: [(0, n.jsx)("i", {
          "aria-hidden": "true",
          children: e.pass ? "✓" : "\xb7"
        }), (0, n.jsx)("span", {
          children: e.label
        })]
      }, e.id))
    })]
  });
}
function u(e) {
  let {
      state: a,
      isEn: s
    } = e,
    i = "writing" === a || "saved" === a || "reading" === a;
  return (0, n.jsxs)("div", {
    className: "fj-db-panel db-".concat(a),
    children: [(0, n.jsxs)("div", {
      className: "fj-db-head",
      children: [(0, n.jsx)("strong", {
        children: "profiles"
      }), (0, n.jsx)("span", {
        children: s ? "table" : "表"
      })]
    }), (0, n.jsxs)("table", {
      className: "fj-db-table",
      children: [(0, n.jsx)("thead", {
        children: (0, n.jsxs)("tr", {
          children: [(0, n.jsx)("th", {
            children: "id"
          }), (0, n.jsx)("th", {
            children: s ? "name" : "昵称"
          }), (0, n.jsx)("th", {
            children: s ? "updated" : "更新"
          })]
        })
      }), (0, n.jsx)("tbody", {
        children: (0, n.jsxs)("tr", {
          className: "fj-db-row".concat("writing" === a ? " is-writing" : "").concat("saved" === a ? " is-saved" : "").concat("reading" === a ? " is-reading" : "").concat("stale" === a ? " is-stale" : ""),
          children: [(0, n.jsx)("td", {
            children: "7"
          }), (0, n.jsxs)("td", {
            children: [(0, n.jsx)("b", {
              children: i ? s ? "Aiko" : "小林" : s ? "Momo" : "小明"
            }), "writing" === a && (0, n.jsx)("em", {
              children: s ? "writing…" : "写入中…"
            }), "reading" === a && (0, n.jsx)("em", {
              children: s ? "read" : "读出"
            })]
          }), (0, n.jsx)("td", {
            children: i ? s ? "just now" : "刚刚" : s ? "yesterday" : "昨天"
          })]
        })
      })]
    }), (0, n.jsxs)("div", {
      className: "fj-db-disk",
      "aria-hidden": "true",
      children: [(0, n.jsx)("span", {}), (0, n.jsx)("span", {}), (0, n.jsx)("span", {})]
    })]
  });
}
function p(e) {
  let {
    live: a,
    reverse: s = !1
  } = e;
  return (0, n.jsx)("div", {
    className: "fj-path".concat(a ? " is-live" : "").concat(s ? " is-back" : ""),
    "aria-hidden": "true",
    children: (0, n.jsx)("span", {
      className: "fj-path-arrow"
    })
  });
}
function j(e) {
  var a;
  let {
      lesson: s,
      entryId: i,
      isEn: t
    } = e,
    j = s.steps || [],
    x = s.focusStepIds || [],
    b = "frontend" === i ? ["frontend"] : "api" === i ? ["api"] : "backend" === i ? ["backend"] : "database" === i ? ["database"] : [],
    {
      index: f,
      select: m,
      nudge: g,
      stageProps: v
    } = (0, r.U)(Math.max(1, j.length), 3200),
    w = j[f],
    k = function (e) {
      switch (e) {
        case "input":
          return {
            browser: "editing",
            api: "idle",
            backend: "idle",
            database: "stale",
            packet: null,
            activeZones: ["frontend"]
          };
        case "request":
          return {
            browser: "sending",
            api: "request",
            backend: "idle",
            database: "stale",
            packet: "out",
            activeZones: ["frontend", "api"]
          };
        case "validate":
          return {
            browser: "waiting",
            api: "request",
            backend: "checking",
            database: "stale",
            packet: "at-backend",
            activeZones: ["api", "backend"]
          };
        case "write":
          return {
            browser: "waiting",
            api: "request",
            backend: "writing",
            database: "writing",
            packet: "at-db",
            activeZones: ["backend", "database"]
          };
        case "response":
          return {
            browser: "waiting",
            api: "response",
            backend: "done",
            database: "saved",
            packet: "in",
            activeZones: ["backend", "api"]
          };
        case "refresh":
          return {
            browser: "refreshing",
            api: "idle",
            backend: "idle",
            database: "saved",
            packet: null,
            activeZones: ["frontend"]
          };
        case "read":
          return {
            browser: "loading",
            api: "read",
            backend: "reading",
            database: "reading",
            packet: "out-read",
            activeZones: ["backend", "database"]
          };
        case "display":
          return {
            browser: "success",
            api: "response",
            backend: "done",
            database: "saved",
            packet: null,
            activeZones: ["frontend"]
          };
        default:
          return {
            browser: "editing",
            api: "idle",
            backend: "idle",
            database: "stale",
            packet: null,
            activeZones: []
          };
      }
    }(null == w ? void 0 : w.id),
    N = x.includes(null != (a = null == w ? void 0 : w.id) ? a : ""),
    y = j.length,
    S = k.packet;
  return j.length ? (0, n.jsxs)("div", {
    className: "flow-journey",
    tabIndex: 0,
    "aria-label": t ? "Save journey diagram; use arrow keys to switch steps" : "一次保存的系统旅程图解，可用左右方向键切换步骤",
    onKeyDown: e => {
      "ArrowLeft" === e.key && (e.preventDefault(), g(-1)), "ArrowRight" === e.key && (e.preventDefault(), g(1));
    },
    ...v,
    children: [(0, n.jsxs)("div", {
      className: "fj-scene",
      "data-step": (null == w ? void 0 : w.id) || "",
      children: [(0, n.jsxs)("div", {
        className: d("frontend", k, b),
        children: [(0, n.jsx)("header", {
          className: "fj-zone-head",
          children: (0, n.jsx)("strong", {
            children: t ? c.frontend.en : c.frontend.zh
          })
        }), (0, n.jsx)(l, {
          state: k.browser,
          isEn: t
        })]
      }), (0, n.jsx)(p, {
        live: "out" === S || "out-read" === S || "in" === S,
        reverse: "in" === S
      }), (0, n.jsxs)("div", {
        className: d("api", k, b),
        children: [(0, n.jsx)("header", {
          className: "fj-zone-head",
          children: (0, n.jsx)("strong", {
            children: t ? c.api.en : c.api.zh
          })
        }), (0, n.jsx)(o, {
          state: k.api,
          isEn: t
        })]
      }), (0, n.jsx)(p, {
        live: "at-backend" === S
      }), (0, n.jsxs)("div", {
        className: d("backend", k, b),
        children: [(0, n.jsx)("header", {
          className: "fj-zone-head",
          children: (0, n.jsx)("strong", {
            children: t ? c.backend.en : c.backend.zh
          })
        }), (0, n.jsx)(h, {
          state: k.backend,
          isEn: t
        })]
      }), (0, n.jsx)(p, {
        live: "at-db" === S
      }), (0, n.jsxs)("div", {
        className: d("database", k, b),
        children: [(0, n.jsx)("header", {
          className: "fj-zone-head",
          children: (0, n.jsx)("strong", {
            children: t ? c.database.en : c.database.zh
          })
        }), (0, n.jsx)(u, {
          state: k.database,
          isEn: t
        })]
      })]
    }), (0, n.jsxs)("div", {
      className: "fj-control",
      role: "group",
      "aria-label": t ? "Step controls" : "步骤切换",
      children: [(0, n.jsx)("button", {
        type: "button",
        className: "fj-nav",
        disabled: f <= 0,
        onClick: () => m(f - 1),
        children: t ? "Previous" : "上一步"
      }), (0, n.jsxs)("div", {
        className: "fj-now",
        "aria-live": "polite",
        children: [(0, n.jsxs)("div", {
          className: "fj-now-head",
          children: [(0, n.jsxs)("span", {
            className: "fj-now-index",
            children: [f + 1, " / ", y]
          }), (0, n.jsx)("strong", {
            children: null == w ? void 0 : w.label
          }), N && (0, n.jsx)("em", {
            children: t ? "Focus" : "本页重点"
          })]
        }), ((null == w ? void 0 : w.detail) || (null == w ? void 0 : w.owner)) && (0, n.jsxs)("p", {
          className: "fj-now-detail",
          children: [(null == w ? void 0 : w.owner) ? (0, n.jsx)("span", {
            children: w.owner
          }) : null, null == w ? void 0 : w.detail]
        })]
      }), (0, n.jsx)("button", {
        type: "button",
        className: "fj-nav",
        disabled: f >= y - 1,
        onClick: () => m(f + 1),
        children: t ? "Next" : "下一步"
      })]
    })]
  }) : null;
}
function x(e) {
  let {
    boundary: a
  } = e;
  return a ? "string" == typeof a ? (0, n.jsx)("aside", {
    className: "flow-boundary",
    children: a
  }) : (0, n.jsxs)("aside", {
    className: "flow-boundary",
    children: [a.title && (0, n.jsx)("strong", {
      children: a.title
    }), (0, n.jsx)("span", {
      children: a.detail || a.text || a.label
    })]
  }) : null;
}
function b(e) {
  let {
      entry: a,
      isEn: s,
      showPractice: r = !0
    } = e,
    c = function (e, a) {
      var s, n, i, r, t, c;
      let d = e.flowLesson;
      return a && d.en ? {
        ...d,
        ...d.en,
        steps: null != (n = d.en.steps) ? n : d.steps,
        focusStepIds: null != (i = d.en.focusStepIds) ? i : d.focusStepIds,
        boundary: null != (r = d.en.boundary) ? r : d.boundary,
        practice: {
          ...d.practice,
          ...d.en.practice,
          options: null != (t = null == (s = d.en.practice) ? void 0 : s.options) ? t : d.practice.options
        },
        agentPrompt: null != (c = d.en.agentPrompt) ? c : d.agentPrompt
      } : d;
    }(a, s),
    [d, l] = (0, i.useState)(void 0),
    o = "".concat(a.id, "-").concat(s ? "en" : "zh");
  (0, i.useEffect)(() => {
    l(void 0);
  }, [o]);
  let h = null == c ? void 0 : c.practice,
    u = (0, i.useMemo)(() => {
      let e = (null == h ? void 0 : h.options) || [];
      return (0, t.T)(e, "".concat(a.id, ":").concat(o));
    }, [null == h ? void 0 : h.options, a.id, o]),
    p = (0, i.useMemo)(() => u.find(e => e.id === d) || null, [u, d]);
  return c ? (0, n.jsxs)("div", {
    className: "flow-details",
    children: [(0, n.jsxs)("section", {
      className: "flow-overview",
      "aria-labelledby": "flow-lesson-title",
      children: [(0, n.jsx)("h2", {
        id: "flow-lesson-title",
        children: c.title
      }), (0, n.jsx)("p", {
        children: c.instruction
      })]
    }), (0, n.jsx)(j, {
      lesson: c,
      entryId: a.id,
      isEn: s
    }, o), (0, n.jsx)(x, {
      boundary: c.boundary
    }), r && h && (0, n.jsxs)("section", {
      className: "flow-practice",
      "aria-labelledby": "flow-practice-title",
      children: [(0, n.jsxs)("div", {
        className: "flow-practice-heading",
        children: [(0, n.jsx)("span", {
          className: "flow-practice-kicker",
          children: s ? "Quick check" : "选择题"
        }), (0, n.jsx)("span", {
          className: "flow-practice-hint",
          children: s ? "Choose the best answer" : "选择一个你认为最合适的答案"
        })]
      }), (0, n.jsx)("h2", {
        id: "flow-practice-title",
        children: h.title
      }), (0, n.jsx)("div", {
        className: "flow-practice-options",
        role: "radiogroup",
        "aria-label": h.title,
        children: u.map((e, a) => {
          let s = d === e.id,
            i = s ? e.correct ? " is-correct" : " is-incorrect" : "";
          return (0, n.jsxs)("button", {
            className: "flow-practice-option".concat(i),
            type: "button",
            role: "radio",
            "aria-checked": s,
            "aria-describedby": s ? "flow-practice-feedback" : void 0,
            onClick: () => l(e.id),
            children: [(0, n.jsx)("span", {
              className: "flow-practice-marker",
              "aria-hidden": "true",
              children: String.fromCharCode(65 + a)
            }), (0, n.jsx)("span", {
              className: "flow-practice-label",
              children: e.label
            }), s && (0, n.jsx)("span", {
              className: "flow-practice-state",
              "aria-hidden": "true",
              children: e.correct ? "✓" : "\xd7"
            })]
          }, e.id);
        })
      }), p && (0, n.jsxs)("div", {
        className: "flow-practice-feedback".concat(p.correct ? " is-correct" : " is-incorrect"),
        id: "flow-practice-feedback",
        role: "status",
        "aria-live": "polite",
        children: [(0, n.jsx)("span", {
          className: "flow-practice-feedback-icon",
          "aria-hidden": "true",
          children: p.correct ? "✓" : "!"
        }), (0, n.jsxs)("div", {
          children: [(0, n.jsx)("strong", {
            children: p.correct ? s ? "Correct" : "回答正确" : s ? "Try again" : "这个答案不太对"
          }), (0, n.jsx)("p", {
            children: p.feedback
          })]
        })]
      })]
    }), c.agentPrompt && (0, n.jsxs)("section", {
      className: "flow-agent-prompt",
      "aria-label": s ? "Agent prompt" : "Agent 提示词",
      children: [(0, n.jsx)("h2", {
        children: s ? "You can say this to an AI Agent" : "你可以这样告诉 AI Agent"
      }), (0, n.jsxs)("blockquote", {
        children: [(0, n.jsx)("span", {
          className: "flow-agent-quote",
          "aria-hidden": "true",
          children: "“"
        }), (0, n.jsx)("p", {
          children: c.agentPrompt
        })]
      })]
    })]
  }) : null;
}
export { b as FlowDetails };
