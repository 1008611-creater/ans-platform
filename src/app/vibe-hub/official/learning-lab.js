// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import { SkillCopyButton } from "../skill-copy-button";
import * as n from "react/jsx-runtime";
import * as a from "react";
import * as l from "../courses/term-adapter";
import * as c from "./anatomy-copy.js";
import * as d from "../courses/routing";
let u = JSON.parse('{"Ek":"https://github.com/oil-oil/vibe-hub-skill","J_":"skills/vibehub"}');
let h = u.Ek;
let p = new Map(l.CLIENT_ENTRIES.map(e => [e.id, e]));
let m = p.get("tooltip");
function g(e, t) {
  return String(e || "").replace(/\{c:([^}]+)\}/g, (e, i) => {
    let r = p.get(i);
    return "en" === t ? (null == r ? void 0 : r.name) || i : (null == r ? void 0 : r.cn) || (null == r ? void 0 : r.name) || i;
  });
}
let f = {
  zh: {
    installPrompt: "帮我安装这个仓库里的 ".concat(u.J_, " Skill。"),
    copied: "已复制",
    copy: "复制",
    breadcrumbAria: "面包屑",
    catalog: "术语图鉴",
    hero: (0, n.jsxs)(n.Fragment, {
      children: [(0, n.jsx)("span", {
        className: "skill-hero-context",
        children: "让 Vibe Coding"
      }), (0, n.jsxs)("strong", {
        children: ["表达更", (0, n.jsx)("span", {
          className: "skill-hero-accent",
          children: "准确"
        })]
      })]
    }),
    heroDescription: "每当你的描述可能产生歧义，VibeHub 都会找出更恰当的技术术语，把需求改成可以直接发给 Agent 的准确表达，并附上通俗解释和链接。",
    terms: "个可视化术语",
    coreActions: "个核心功能",
    start: "一句话即可开始",
    demoAria: "VibeHub Skill 真实对话演示",
    agentTab: "Agent 对话",
    chatAddress: "agent.local/project",
    userMessage: "鼠标放到这个按钮上时，显示一个小提示，告诉用户它是做什么的。",
    agentDone: "已完成",
    demoAgentReplyStart: "已经加好了：鼠标悬停或键盘聚焦时，会显示“下载”。这种短提示通常叫 ",
    demoAgentTerm: "Tooltip（文字提示）",
    demoAgentReplyEnd: "。",
    demoHint: "点击术语，原地查看通俗解释",
    closeTermPreview: "关闭术语解释",
    openFullTerm: "打开完整词条",
    installation: "一分钟安装",
    installTitle: "复制这段话，发给你的 Agent",
    installDescription: "Agent 会打开 GitHub 仓库并完成安装。",
    copyInstall: "复制安装指令",
    rewriteEyebrow: "功能一 \xb7 规范表达",
    rewriteTitle: "把模糊描述改成可以直接发送的需求",
    rewriteDescription: "Skill 会保留你的原意，只补上真正有用的术语，不擅自增加框架、参数或实现方案。",
    before: "你的原话",
    beforeText: "这个按钮鼠标放上去变个色，点下去也要有一下反馈。",
    after: "可以直接对 Agent 说",
    afterStart: "为按钮补充",
    afterMiddle: "状态和",
    afterEnd: "状态，并使用",
    afterTail: "让状态变化更自然。",
    copyRewrite: "复制规范后的表达",
    suggestEyebrow: "功能二 \xb7 主动提示",
    suggestTitle: "不用先问“这叫什么”",
    suggestDescription: "只要你的描述存在歧义或缺少恰当名词，Skill 就会主动指出最相关的 1–3 个术语，并把解释放在当前场景里，不需要等你追问。",
    userSays: "你说",
    userQuote: "这个设置我想改了就马上生效，不想再点一次保存。",
    agentReplies: "VibeHub 提示",
    agentReplyStart: "这种场景通常适合",
    agentReplyEnd: "：它适合只有开和关两种状态、修改后立即生效的设置。如果用户需要先调整多项内容再统一确认，就不应该这样设计。",
    inlineLink: "术语第一次出现时直接链接到 VibeHub",
    plainExplanation: "解释紧跟当前任务，不讲百科式定义",
    noOverload: "每次最多提示 3 个真正相关的术语"
  },
  en: {
    installPrompt: "Install the ".concat(u.J_, " Skill from this repository."),
    copied: "Copied",
    copy: "Copy",
    breadcrumbAria: "Breadcrumb",
    catalog: "Term catalog",
    hero: (0, n.jsxs)(n.Fragment, {
      children: ["Turn rough ideas", (0, n.jsx)("br", {}), "into clear requests", (0, n.jsx)("br", {}), "your Agent understands"]
    }),
    heroDescription: "Whenever a description could be misunderstood, VibeHub finds the most fitting technical terms, turns it into a request that is ready to send, and adds plain-English explanations and links.",
    terms: "visual term guides",
    coreActions: "core functions",
    start: "Start with one sentence",
    demoAria: "A real VibeHub Skill conversation",
    agentTab: "Agent conversation",
    chatAddress: "agent.local/project",
    userMessage: "When someone hovers over this button, show a short hint explaining what it does.",
    agentDone: "Done",
    demoAgentReplyStart: "Done. Hovering over or focusing the button now shows “Download.” This kind of short hint is usually called a ",
    demoAgentTerm: "Tooltip",
    demoAgentReplyEnd: ".",
    demoHint: "Select the term to see a plain-English explanation here",
    closeTermPreview: "Close term explanation",
    openFullTerm: "Open the full guide",
    installation: "Install in a minute",
    installTitle: "Copy this and send it to your Agent",
    installDescription: "Your Agent will open the GitHub repository and install the Skill.",
    copyInstall: "Copy install request",
    rewriteEyebrow: "Function one \xb7 Rewrite",
    rewriteTitle: "Turn everyday language into a request that is ready to send",
    rewriteDescription: "The Skill preserves your intent and adds only the terms that help. It will not invent a framework, parameters, or implementation details.",
    before: "What you said",
    beforeText: "Change the button color when I move the mouse over it, and make it react when I press it.",
    after: "Ready to send",
    afterStart: "Add a",
    afterMiddle: "state and an",
    afterEnd: "state to the button, then use a",
    afterTail: "to make the visual change feel smooth.",
    copyRewrite: "Copy rewritten request",
    suggestEyebrow: "Function two \xb7 Proactive hints",
    suggestTitle: "You do not have to ask, “What is this called?”",
    suggestDescription: "Whenever your wording is ambiguous or missing the right name, the Skill surfaces the one to three terms that actually matter and explains them in context—before you have to ask.",
    userSays: "You said",
    userQuote: "I want this setting to take effect as soon as I change it. I do not want another Save button.",
    agentReplies: "VibeHub suggests",
    agentReplyStart: "A",
    agentReplyEnd: "is usually a good fit here: it works for a setting with two states that takes effect immediately. If people need to adjust several options and confirm them together, this is not the right pattern.",
    inlineLink: "The first mention links straight to VibeHub",
    plainExplanation: "The explanation stays tied to the task at hand",
    noOverload: "Only one to three genuinely useful terms at a time"
  }
};
const v = SkillCopyButton;
function y(e) {
  let {
    id: t,
    locale: i,
    children: r
  } = e;
  return (0, n.jsx)("a", {
    className: "skill-term-link",
    href: (0, d.s3)(t, i),
    children: r
  });
}
function b(e) {
  let {
      copy: t,
      locale: i
    } = e,
    [r, s] = (0, a.useState)(!1);
  if (!m) return null;
  let l = (0, d.s3)("tooltip", i),
    o = "en" === i ? m.en : m,
    u = "en" === i && c.R.en[m.cat] || m.cat,
    h = "en" === i ? m.name : m.cn,
    p = "en" === i ? "" : m.name;
  return (0, n.jsxs)("section", {
    className: "skill-browser-demo",
    "aria-label": t.demoAria,
    children: [(0, n.jsxs)("div", {
      className: "skill-browser-chrome",
      children: [(0, n.jsxs)("span", {
        className: "skill-browser-dots",
        "aria-hidden": "true",
        children: [(0, n.jsx)("i", {}), (0, n.jsx)("i", {}), (0, n.jsx)("i", {})]
      }), (0, n.jsx)("span", {
        className: "skill-browser-back",
        "aria-hidden": "true",
        children: (0, n.jsx)("i", {
          className: "ti ti-arrow-left",
          "aria-hidden": "true"
        })
      }), (0, n.jsxs)("div", {
        className: "skill-browser-address",
        children: [(0, n.jsx)("i", {
          className: "ti ti-lock",
          "aria-hidden": "true"
        }), (0, n.jsx)("span", {
          children: t.chatAddress
        })]
      }), (0, n.jsx)("span", {
        className: "skill-browser-more",
        "aria-hidden": "true",
        children: "•••"
      })]
    }), (0, n.jsxs)("div", {
      className: "skill-browser-tab",
      children: [(0, n.jsx)("i", {
        className: "ti ti-message-circle",
        "aria-hidden": "true"
      }), (0, n.jsx)("span", {
        children: t.agentTab
      })]
    }), (0, n.jsx)("div", {
      className: "skill-browser-viewport",
      "aria-live": "polite",
      children: (0, n.jsxs)("div", {
        className: "skill-browser-thread",
        children: [(0, n.jsx)("div", {
          className: "skill-browser-user",
          children: (0, n.jsx)("span", {
            children: t.userMessage
          })
        }), (0, n.jsxs)("div", {
          className: "skill-browser-agent",
          children: [(0, n.jsxs)("div", {
            className: "skill-browser-agent-head",
            children: [(0, n.jsx)("i", {
              className: "ti ti-sparkles",
              "aria-hidden": "true"
            }), (0, n.jsx)("strong", {
              children: "Agent"
            }), (0, n.jsxs)("span", {
              children: [(0, n.jsx)("i", {
                className: "ti ti-check",
                "aria-hidden": "true"
              }), t.agentDone]
            })]
          }), (0, n.jsxs)("div", {
            className: "skill-browser-agent-bubble",
            children: [(0, n.jsxs)("p", {
              children: [t.demoAgentReplyStart, (0, n.jsx)("button", {
                type: "button",
                className: "skill-browser-term-trigger",
                "aria-expanded": r,
                "aria-controls": "skill-tooltip-preview",
                onClick: () => s(e => !e),
                children: t.demoAgentTerm
              }), t.demoAgentReplyEnd]
            }), r ? (0, n.jsxs)("aside", {
              id: "skill-tooltip-preview",
              className: "skill-browser-term-popover",
              role: "dialog",
              "aria-modal": "false",
              "aria-labelledby": "skill-tooltip-preview-title",
              children: [(0, n.jsxs)("header", {
                children: [(0, n.jsx)("span", {
                  children: u
                }), (0, n.jsx)("button", {
                  type: "button",
                  "aria-label": t.closeTermPreview,
                  onClick: () => s(!1),
                  children: (0, n.jsx)("i", {
                    className: "ti ti-x",
                    "aria-hidden": "true"
                  })
                })]
              }), (0, n.jsxs)("h2", {
                id: "skill-tooltip-preview-title",
                children: [h, p ? (0, n.jsx)("small", {
                  children: p
                }) : null]
              }), (0, n.jsx)("strong", {
                children: g(o.tagline, i)
              }), (0, n.jsx)("p", {
                children: g(o.desc, i)
              }), (0, n.jsxs)("a", {
                href: l,
                children: [t.openFullTerm, (0, n.jsx)("i", {
                  className: "ti ti-arrow-up-right",
                  "aria-hidden": "true"
                })]
              })]
            }) : null]
          }), (0, n.jsxs)("small", {
            children: [(0, n.jsx)("i", {
              className: "ti ti-pointer",
              "aria-hidden": "true"
            }), t.demoHint]
          })]
        })]
      })
    })]
  });
}
function x(e) {
  let {
    copy: t,
    locale: i
  } = e;
  return (0, n.jsxs)(n.Fragment, {
    children: [t.afterStart, " ", (0, n.jsx)(y, {
      id: "hover",
      locale: i,
      children: "Hover"
    }), " ", t.afterMiddle, " ", (0, n.jsx)(y, {
      id: "active",
      locale: i,
      children: "Active"
    }), " ", t.afterEnd, " ", (0, n.jsx)(y, {
      id: "transition",
      locale: i,
      children: "Transition"
    }), " ", t.afterTail]
  });
}
function w(e) {
  let {
    copy: t,
    locale: i
  } = e;
  return (0, n.jsxs)("div", {
    className: "skill-rewrite-visual",
    children: [(0, n.jsxs)("div", {
      className: "skill-rewrite-before",
      children: [(0, n.jsx)("span", {
        children: t.before
      }), (0, n.jsx)("p", {
        children: t.beforeText
      })]
    }), (0, n.jsx)("i", {
      className: "ti ti-arrow-down skill-rewrite-arrow",
      "aria-hidden": "true"
    }), (0, n.jsxs)("div", {
      className: "skill-rewrite-after",
      children: [(0, n.jsxs)("header", {
        children: [(0, n.jsx)("span", {
          children: t.after
        }), (0, n.jsx)(v, {
          text: "en" === i ? "Add a Hover state and an Active state to the button, then use a Transition to make the visual change feel smooth." : "为按钮补充 Hover 状态和 Active 状态，并使用 Transition 让状态变化更自然。",
          label: t.copyRewrite,
          copiedLabel: t.copied
        })]
      }), (0, n.jsx)("p", {
        children: (0, n.jsx)(x, {
          copy: t,
          locale: i
        })
      })]
    })]
  });
}
function j(e) {
  let {
    copy: t,
    locale: i
  } = e;
  return (0, n.jsxs)("div", {
    className: "skill-suggest-visual",
    children: [(0, n.jsxs)("div", {
      className: "skill-dialogue-user",
      children: [(0, n.jsx)("small", {
        children: t.userSays
      }), (0, n.jsx)("p", {
        children: t.userQuote
      })]
    }), (0, n.jsxs)("div", {
      className: "skill-dialogue-agent",
      children: [(0, n.jsxs)("header", {
        children: [(0, n.jsx)("i", {
          className: "ti ti-sparkles",
          "aria-hidden": "true"
        }), (0, n.jsx)("small", {
          children: t.agentReplies
        })]
      }), (0, n.jsxs)("p", {
        children: [t.agentReplyStart, " ", (0, n.jsx)(y, {
          id: "switch",
          locale: i,
          children: "Switch"
        }), t.agentReplyEnd]
      })]
    }), (0, n.jsxs)("ul", {
      className: "skill-suggest-rules",
      children: [(0, n.jsxs)("li", {
        children: [(0, n.jsx)("i", {
          className: "ti ti-link",
          "aria-hidden": "true"
        }), t.inlineLink]
      }), (0, n.jsxs)("li", {
        children: [(0, n.jsx)("i", {
          className: "ti ti-message-circle",
          "aria-hidden": "true"
        }), t.plainExplanation]
      }), (0, n.jsxs)("li", {
        children: [(0, n.jsx)("i", {
          className: "ti ti-filter",
          "aria-hidden": "true"
        }), t.noOverload]
      })]
    })]
  });
}
function k(e) {
  var t;
  let {
      locale: i = "zh",
      onBack: r
    } = e,
    a = null != (t = f[i]) ? t : f.zh,
    s = "".concat(h, "\n").concat(a.installPrompt);
  return (0, n.jsx)("div", {
    className: "skill-page",
    children: (0, n.jsxs)("div", {
      className: "skill-detail",
      children: [(0, n.jsxs)("nav", {
        className: "detail-breadcrumb skill-breadcrumb",
        "aria-label": a.breadcrumbAria,
        children: [(0, n.jsx)("button", {
          className: "breadcrumb-link",
          type: "button",
          onClick: r,
          children: a.catalog
        }), (0, n.jsx)("span", {
          className: "breadcrumb-separator",
          "aria-hidden": "true",
          children: "›"
        }), (0, n.jsx)("span", {
          className: "breadcrumb-current",
          "aria-current": "page",
          children: "VibeHub Skill"
        })]
      }), (0, n.jsxs)("section", {
        className: "skill-intro",
        children: [(0, n.jsxs)("div", {
          className: "skill-intro-copy",
          children: [(0, n.jsx)("div", {
            className: "skill-label",
            children: "VibeHub Skill"
          }), (0, n.jsx)("h1", {
            children: a.hero
          }), (0, n.jsx)("p", {
            children: a.heroDescription
          }), (0, n.jsxs)("div", {
            className: "skill-facts",
            children: [(0, n.jsxs)("div", {
              className: "skill-fact",
              children: [(0, n.jsx)("b", {
                children: l.CLIENT_ENTRIES.length
              }), (0, n.jsx)("span", {
                children: a.terms
              })]
            }), (0, n.jsxs)("div", {
              className: "skill-fact",
              children: [(0, n.jsx)("b", {
                children: "2"
              }), (0, n.jsx)("span", {
                children: a.coreActions
              })]
            }), (0, n.jsxs)("div", {
              className: "skill-fact",
              children: [(0, n.jsx)("i", {
                className: "ti ti-message",
                "aria-hidden": "true"
              }), (0, n.jsx)("span", {
                children: a.start
              })]
            })]
          })]
        }), (0, n.jsx)(b, {
          copy: a,
          locale: i
        })]
      }), (0, n.jsxs)("section", {
        className: "skill-install",
        id: "skill-install",
        "aria-labelledby": "install-title",
        children: [(0, n.jsxs)("div", {
          className: "skill-install-copy",
          children: [(0, n.jsx)("small", {
            children: a.installation
          }), (0, n.jsx)("h2", {
            id: "install-title",
            children: a.installTitle
          }), (0, n.jsx)("p", {
            children: a.installDescription
          })]
        }), (0, n.jsxs)("div", {
          className: "skill-install-prompt",
          children: [(0, n.jsxs)("code", {
            children: [(0, n.jsx)("a", {
              href: h,
              target: "_blank",
              rel: "noreferrer",
              children: h
            }), (0, n.jsx)("span", {
              children: a.installPrompt
            })]
          }), (0, n.jsx)(v, {
            text: s,
            label: a.copyInstall,
            copiedLabel: a.copied
          })]
        })]
      }), (0, n.jsxs)("section", {
        className: "skill-block",
        "aria-labelledby": "rewrite-title",
        children: [(0, n.jsxs)("div", {
          className: "skill-block-title",
          children: [(0, n.jsx)("span", {
            children: a.rewriteEyebrow
          }), (0, n.jsx)("h2", {
            id: "rewrite-title",
            children: a.rewriteTitle
          }), (0, n.jsx)("p", {
            children: a.rewriteDescription
          })]
        }), (0, n.jsx)(w, {
          copy: a,
          locale: i
        })]
      }), (0, n.jsxs)("section", {
        className: "skill-block",
        "aria-labelledby": "suggest-title",
        children: [(0, n.jsxs)("div", {
          className: "skill-block-title",
          children: [(0, n.jsx)("span", {
            children: a.suggestEyebrow
          }), (0, n.jsx)("h2", {
            id: "suggest-title",
            children: a.suggestTitle
          }), (0, n.jsx)("p", {
            children: a.suggestDescription
          })]
        }), (0, n.jsx)(j, {
          copy: a,
          locale: i
        })]
      })]
    })
  });
}
let N = {
  observe: {
    label: "看差异",
    description: "比较两种做法"
  },
  prioritize: {
    label: "定下第一眼",
    description: "选择页面重点"
  },
  tune: {
    label: "自己调整",
    description: "控制差别程度"
  },
  verify: {
    label: "离开参数检查",
    description: "确认实际感受"
  }
};
let C = {
  v: 1,
  goal: "让产品首页更有高级感",
  context: "准备上线的 AI 产品首页",
  focus: "hierarchy",
  modules: ["observe", "prioritize", "tune", "verify"]
};
let S = {
  title: 72,
  spacing: 62,
  quiet: 68
};
let E = {
  value: {
    label: "先看懂它能做什么",
    shortLabel: "产品价值",
    description: "让主标题和一句说明先被看到。"
  },
  action: {
    label: "先开始体验",
    shortLabel: "开始使用",
    description: "让主要按钮成为最明确的下一步。"
  },
  proof: {
    label: "先确认它是否可信",
    shortLabel: "使用证明",
    description: "让使用人数和评价更容易被注意到。"
  }
};
let A = {
  firstLook: "第一眼能找到最重要的信息",
  nextAction: "知道接下来应该点哪里",
  noCompetition: "说明文字没有和重点抢注意力"
};
let T = {
  hierarchy: {
    name: "视觉层级",
    insight: "页面不需要每一处都醒目，只要让人知道应该先看哪里。"
  },
  spacing: {
    name: "间距节奏",
    insight: "相关内容靠近一些，不同内容拉开一些，页面关系就会更清楚。"
  },
  contrast: {
    name: "对比关系",
    insight: "重要信息和次要信息有足够差别，重点才会自然出现。"
  }
};
let q = {
  modules: {
    observe: {
      label: "Compare",
      description: "Compare two approaches"
    },
    prioritize: {
      label: "Choose the first impression",
      description: "Decide what matters most"
    },
    tune: {
      label: "Adjust it",
      description: "Control how strong the contrast feels"
    },
    verify: {
      label: "Check the page",
      description: "Judge the result without looking at settings"
    }
  },
  defaultSpec: {
    ...C,
    goal: "Make the product homepage feel more polished",
    context: "An AI product homepage that is almost ready to launch"
  },
  priorities: {
    value: {
      label: "Understand what the product does first",
      shortLabel: "Product value",
      description: "Make the main heading and one supporting sentence stand out first."
    },
    action: {
      label: "Start trying it first",
      shortLabel: "Get started",
      description: "Make the primary button the clearest next step."
    },
    proof: {
      label: "See whether it is trustworthy first",
      shortLabel: "Proof",
      description: "Make usage numbers and ratings easier to notice."
    }
  },
  verifyItems: {
    firstLook: "The most important information is clear at first glance",
    nextAction: "The next action is easy to find",
    noCompetition: "Supporting text does not compete with the main point"
  },
  focus: {
    hierarchy: {
      name: "visual hierarchy",
      insight: "Not everything needs to stand out. The page only needs to make the reading order clear."
    },
    spacing: {
      name: "spacing rhythm",
      insight: "Keep related content closer and separate unrelated content so the page structure is easier to read."
    },
    contrast: {
      name: "contrast",
      insight: "The main point becomes clear when important and supporting information look meaningfully different."
    }
  }
};
function L() {
  let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "zh";
  return "en" === e ? q : {
    modules: N,
    defaultSpec: C,
    priorities: E,
    verifyItems: A,
    focus: T
  };
}
function M(e, t, i) {
  if ("string" != typeof e) return t;
  let r = e.trim().replace(/\s+/g, " ");
  return r ? r.slice(0, i) : t;
}
function R(e, t) {
  let i = Number(e);
  return Number.isFinite(i) ? Math.min(100, Math.max(0, i)) : t;
}
function I(e) {
  let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "zh",
    i = L(t).defaultSpec,
    r = "string" == typeof (null == e ? void 0 : e.focus) && Object.hasOwn(T, e.focus) ? e.focus : C.focus;
  return {
    v: 1,
    goal: M(null == e ? void 0 : e.goal, i.goal, 80),
    context: M(null == e ? void 0 : e.context, i.context, 100),
    focus: r,
    modules: function (e) {
      if (!Array.isArray(e)) return [...C.modules];
      let t = [...new Set(e)].filter(e => "string" == typeof e && Object.hasOwn(N, e)).slice(0, 6);
      return t.length ? t : [...C.modules];
    }(null == e ? void 0 : e.modules)
  };
}
function P(e) {
  return "object" == typeof e && null !== e;
}
let D = {
  zh: {
    preview: "页面预览",
    currentPriority: "当前重点 \xb7 ",
    emphasizeOne: "先突出一个重点",
    competingContent: "内容差不多抢眼",
    examplePage: "示例页面",
    previewNavAria: "示例页面导航",
    nav: ["产品", "案例", "价格"],
    login: "登录",
    creator: "为独立创作者准备",
    productTitle: (0, n.jsxs)(n.Fragment, {
      children: ["把想法变成", (0, n.jsx)("br", {}), "可以分享的作品"]
    }),
    productDescription: "从第一张画布到最终发布，把创作过程放进一个安静、顺手的工作空间。",
    startFree: "免费开始",
    seeWork: "看看作品",
    creators: "位创作者正在使用",
    rating: "用户评分",
    springNotes: "春日笔记",
    breadcrumbAria: "面包屑",
    lab: "组合练习",
    generated: "Agent 组合了 ",
    interactions: " 个互动",
    combinedCase: "组合案例 \xb7 ",
    intro: "先比较做法，再决定第一眼要看到什么。调整完成以后，离开参数检查一次真实感受。",
    routeAria: "练习步骤",
    stageAria: "组合互动练习",
    practicing: "正在练习 \xb7 ",
    stageTitle: "先让首页说清楚一件事",
    restart: "重来一次",
    choicesAria: "选择页面方案",
    optionA: "方案 A",
    optionATitle: "内容差不多抢眼",
    optionADescription: "标题、说明和按钮保持接近的强调程度。",
    optionB: "方案 B",
    optionBTitle: "先突出一个重点",
    optionBDescription: "让主标题和主要操作先被看到。",
    compareInstruction: "切换两个方案看完效果，再选择更适合当前页面的方向。",
    chooseDirection: "选择这个方向",
    insightPrefix: "你刚才看到的是",
    sentenceEnd: "。",
    priorityAria: "选择页面重点",
    priorityStep: "接着决定",
    priorityTitle: "别人打开页面时，第一眼应该知道什么？",
    priorityDescription: "没有标准答案，只看这个页面现在最需要完成什么。",
    tuningAria: "调整页面表现",
    tuningStep: "然后自己调",
    tuningTitle: "把重点做到刚刚好",
    tuningDescription: "拖动三项，直接看页面里的阅读顺序怎么变化。",
    startCheck: "调好了，开始检查",
    titleControl: "主标题更明显",
    spacingControl: "内容之间更松",
    quietControl: "说明文字更安静",
    verifyAria: "检查调整结果",
    verifyStep: "最后检查",
    verifyTitle: "先别看参数，只看页面",
    verifyDescription: "下面三句话都符合你的真实感受，再把结果交给 Agent。",
    checked: "这次调整已经通过你的检查。",
    unchecked: "按你看到的结果选择，不需要勉强全部通过。",
    prepareRequest: "整理成修改要求",
    complete: "这次练习已经完成",
    resultTitle: "现在可以让 Agent 修改真实页面了",
    resultDescription: "页面会把你的选择、调整幅度和检查结果一起带回去。",
    copied: "已复制",
    copyRequest: "复制修改要求",
    copyExercise: "复制这个练习"
  },
  en: {
    preview: "Page preview",
    currentPriority: "Current priority \xb7 ",
    emphasizeOne: "Lead with one main point",
    competingContent: "Everything competes for attention",
    examplePage: "Example page",
    previewNavAria: "Example page navigation",
    nav: ["Product", "Stories", "Pricing"],
    login: "Log in",
    creator: "Made for independent creators",
    productTitle: (0, n.jsxs)(n.Fragment, {
      children: ["Turn ideas into", (0, n.jsx)("br", {}), "work you can share"]
    }),
    productDescription: "From the first canvas to launch, keep your creative process in one calm, practical workspace.",
    startFree: "Start for free",
    seeWork: "View examples",
    creators: " creators are using it",
    rating: " user rating",
    springNotes: "Spring Notes",
    breadcrumbAria: "Breadcrumb",
    lab: "Learning Lab",
    generated: "Your Agent combined ",
    interactions: " interactions",
    combinedCase: "Combined exercise \xb7 ",
    intro: "Compare two approaches first, then decide what people should notice at first glance. When you finish adjusting, check the page based on how it actually feels—not the settings.",
    routeAria: "Exercise steps",
    stageAria: "Combined interactive exercise",
    practicing: "Practicing \xb7 ",
    stageTitle: "Help the homepage communicate one clear thing",
    restart: "Start over",
    choicesAria: "Choose a page approach",
    optionA: "Option A",
    optionATitle: "Everything competes for attention",
    optionADescription: "Keep the heading, description, and buttons at a similar level of emphasis.",
    optionB: "Option B",
    optionBTitle: "Lead with one main point",
    optionBDescription: "Make the main heading and primary action the first things people notice.",
    compareInstruction: "Switch between both approaches, then choose the direction that fits this page better.",
    chooseDirection: "Choose this direction",
    insightPrefix: "What you just saw was ",
    sentenceEnd: ". ",
    priorityAria: "Choose the page priority",
    priorityStep: "Then decide",
    priorityTitle: "What should someone understand first when they open this page?",
    priorityDescription: "There is no single right answer. Choose what this page needs to accomplish now.",
    tuningAria: "Adjust the page",
    tuningStep: "Adjust it yourself",
    tuningTitle: "Make the priority feel just right",
    tuningDescription: "Move the three controls and watch how the reading order changes on the page.",
    startCheck: "Ready to check it",
    titleControl: "Make the main heading clearer",
    spacingControl: "Give content more room",
    quietControl: "Make supporting text quieter",
    verifyAria: "Check the result",
    verifyStep: "Final check",
    verifyTitle: "Look at the page, not the settings",
    verifyDescription: "Check all three statements only if they match what you actually see, then send the result to your Agent.",
    checked: "This adjustment passes your checks.",
    unchecked: "Choose based on what you see. You do not need to force every statement to pass.",
    prepareRequest: "Turn this into an edit request",
    complete: "This exercise is complete",
    resultTitle: "You can now ask your Agent to edit the real page",
    resultDescription: "The edit request will include your choices, adjustment levels, and checklist results.",
    copied: "Copied",
    copyRequest: "Copy edit request",
    copyExercise: "Copy this exercise"
  }
};
function F(e) {
  let t = new TextEncoder().encode(JSON.stringify(e)),
    i = "";
  return t.forEach(e => {
    i += String.fromCharCode(e);
  }), window.btoa(i).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function z(e) {
  if (!e) return null;
  if (e.length > 4096) throw Error("Activity payload is too large");
  let t = e.replace(/-/g, "+").replace(/_/g, "/"),
    i = t.padEnd(4 * Math.ceil(t.length / 4), "="),
    r = window.atob(i),
    n = Uint8Array.from(r, e => e.charCodeAt(0)),
    a = JSON.parse(new TextDecoder().decode(n));
  return "object" == typeof a && null !== a ? a : null;
}
function O(e) {
  let {
      enhanced: t,
      priority: i,
      controls: r,
      copy: a,
      activityCopy: s
    } = e,
    l = i || "value",
    o = s.priorities[l],
    c = {
      "--learning-title": "".concat(38 + Math.round(.22 * r.title), "px"),
      "--learning-gap": "".concat(22 + Math.round(.22 * r.spacing), "px"),
      "--learning-muted": String(Math.max(.4, 1 - .006 * r.quiet))
    };
  return (0, n.jsxs)("div", {
    className: "learning-product".concat(t ? " is-enhanced" : " is-flat", " priority-").concat(l),
    style: c,
    children: [(0, n.jsxs)("div", {
      className: "learning-preview-caption",
      children: [(0, n.jsx)("span", {
        children: a.preview
      }), (0, n.jsx)("b", {
        children: t ? i ? "".concat(a.currentPriority).concat(o.shortLabel) : a.emphasizeOne : a.competingContent
      })]
    }), (0, n.jsxs)("header", {
      className: "learning-product-nav",
      children: [(0, n.jsxs)("span", {
        className: "learning-product-brand",
        children: [(0, n.jsx)("i", {
          "aria-hidden": "true"
        }), a.examplePage]
      }), (0, n.jsx)("nav", {
        "aria-label": a.previewNavAria,
        children: a.nav.map(e => (0, n.jsx)("span", {
          children: e
        }, e))
      }), (0, n.jsx)("span", {
        className: "learning-product-login",
        children: a.login
      })]
    }), (0, n.jsxs)("div", {
      className: "learning-product-hero",
      children: [(0, n.jsxs)("div", {
        className: "learning-product-copy",
        children: [(0, n.jsx)("small", {
          children: a.creator
        }), (0, n.jsx)("h2", {
          children: a.productTitle
        }), (0, n.jsx)("p", {
          children: a.productDescription
        }), (0, n.jsxs)("div", {
          className: "learning-product-actions",
          children: [(0, n.jsx)("span", {
            children: a.startFree
          }), (0, n.jsx)("span", {
            children: a.seeWork
          })]
        }), (0, n.jsxs)("div", {
          className: "learning-product-proof",
          children: [(0, n.jsxs)("span", {
            children: [(0, n.jsx)("b", {
              children: "12,800"
            }), a.creators]
          }), (0, n.jsxs)("span", {
            children: [(0, n.jsx)("b", {
              children: "4.9"
            }), a.rating]
          })]
        })]
      }), (0, n.jsxs)("div", {
        className: "learning-product-art",
        "aria-hidden": "true",
        children: [(0, n.jsx)("div", {
          className: "learning-art-orbit orbit-one"
        }), (0, n.jsx)("div", {
          className: "learning-art-orbit orbit-two"
        }), (0, n.jsxs)("div", {
          className: "learning-art-card card-back",
          children: [(0, n.jsx)("span", {}), (0, n.jsx)("span", {})]
        }), (0, n.jsxs)("div", {
          className: "learning-art-card card-front",
          children: [(0, n.jsx)("i", {}), (0, n.jsx)("strong", {
            children: a.springNotes
          }), (0, n.jsx)("span", {}), (0, n.jsx)("span", {})]
        }), (0, n.jsx)("div", {
          className: "learning-art-dot dot-one"
        }), (0, n.jsx)("div", {
          className: "learning-art-dot dot-two"
        })]
      })]
    })]
  });
}
function _(e) {
  let {
    label: t,
    value: i,
    onChange: r
  } = e;
  return (0, n.jsxs)("label", {
    className: "learning-control",
    children: [(0, n.jsx)("span", {
      children: t
    }), (0, n.jsx)("input", {
      type: "range",
      min: "0",
      max: "100",
      value: i,
      onInput: e => r(Number(e.currentTarget.value))
    }), (0, n.jsx)("output", {
      children: i
    })]
  });
}
function B(e) {
  let {
    step: t,
    title: i,
    description: r,
    action: a
  } = e;
  return (0, n.jsxs)("header", {
    className: "learning-module-heading",
    children: [(0, n.jsxs)("div", {
      children: [(0, n.jsx)("small", {
        children: t
      }), (0, n.jsx)("h3", {
        children: i
      }), r ? (0, n.jsx)("p", {
        children: r
      }) : null]
    }), a]
  });
}
function H(e) {
  var t;
  let {
      locale: i = "zh",
      onBack: r
    } = e,
    s = null != (t = D[i]) ? t : D.zh,
    l = L(i),
    [o, c] = (0, a.useState)(() => I(null, i)),
    [d, u] = (0, a.useState)("a"),
    [h, p] = (0, a.useState)(null),
    [m, g] = (0, a.useState)(S),
    [f, v] = (0, a.useState)([]),
    [y, b] = (0, a.useState)(0),
    [x, w] = (0, a.useState)(!1),
    [j, k] = (0, a.useState)(null),
    N = (0, a.useMemo)(() => o.modules.map(e => ({
      id: e,
      ...l.modules[e]
    })), [l.modules, o.modules]),
    C = (0, a.useMemo)(() => N.map(e => e.id), [N]),
    T = l.focus[o.focus] || l.focus.hierarchy,
    q = h || "value",
    M = function (e, t, i, r) {
      let n = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : "zh",
        a = L(n),
        s = a.focus[e.focus] || a.focus.hierarchy,
        l = a.priorities[i] || a.priorities.value;
      if ("en" === n) {
        let i = "b" === t ? "Adjustment guide: emphasis ".concat(r.title, "/100, spacing ").concat(r.spacing, "/100, supporting information reduction ").concat(r.quiet, "/100.") : "Keep the information compact and parallel; there is no need to create an extra focal point.";
        return ["I’m working on ".concat(e.context, " and want to ").concat(e.goal.replace(/^Make /, "make "), "."), "At first glance, lead with “".concat(l.shortLabel, ".” ").concat("a" === t ? "Keep the content at a similar level of emphasis because its priorities are similar." : "Emphasize one main point first, then let supporting text and secondary actions recede."), "This pass focuses on ".concat(s.name, ": ").concat(s.insight), i, "Please update the current page in this direction. Then check what stands out first and whether the next action is clear."].join("\n");
      }
      let o = "b" === t ? "调整参考：重点 ".concat(r.title, "/100，留白 ").concat(r.spacing, "/100，次要信息弱化 ").concat(r.quiet, "/100。") : "保留紧凑、平行的信息结构，不需要额外制造一个重点。";
      return ["我正在调整「".concat(e.context, "」，希望").concat(e.goal, "。"), "第一眼先让人看到「".concat(l.shortLabel, "」。").concat("a" === t ? "不同内容可以保持接近的强调程度，因为它们的优先级差不多。" : "先突出一个重点，再让说明和次要操作退后。"), "这次主要调整".concat(s.name, "：").concat(s.insight), o, "请先按这个方向修改当前页面。改完以后，再检查第一眼看到了什么、下一步是否明确。"].join("\n");
    }(o, d, q, m, i),
    H = Object.keys(l.verifyItems).every(e => f.includes(e));
  function V(e) {
    return C.indexOf(e);
  }
  function G(e) {
    let t = V(e);
    return -1 !== t && t <= y;
  }
  function W(e) {
    let t = V(e);
    -1 !== t && b(e => Math.min(N.length - 1, Math.max(e, t + 1)));
  }
  function Q(e) {
    u(e), b(Math.max(0, V("observe"))), v([]), w(!1);
  }
  function $(e, t) {
    g(i => ({
      ...i,
      [e]: t
    })), v([]), w(!1);
  }
  function J(e) {
    let t = new URLSearchParams();
    return t.set("spec", F(o)), e && t.set("result", F({
      choice: d,
      priority: q,
      controls: m,
      checks: f
    })), window.history.replaceState(window.history.state, "", "".concat(window.location.pathname).concat(window.location.search, "#").concat(t)), window.location.href;
  }
  function K() {
    w(!0), window.requestAnimationFrame(() => J(!0));
  }
  async function U(e) {
    let t = "link" === e ? J(!0) : M;
    try {
      await navigator.clipboard.writeText(t), k(e);
    } catch (e) {
      k(null);
    }
  }
  (0, a.useEffect)(() => {
    let e = function (e) {
      try {
        let t = new URLSearchParams(window.location.hash.slice(1));
        return {
          spec: I(z(t.get("spec")), e),
          result: function (e) {
            if (!e || "a" !== e.choice && "b" !== e.choice) return null;
            let t = "string" == typeof e.priority && Object.hasOwn(E, e.priority) ? e.priority : "value",
              i = Array.isArray(e.checks) ? e.checks.filter(e => "string" == typeof e && Object.hasOwn(A, e)) : Object.keys(A);
            return {
              choice: e.choice,
              priority: t,
              controls: {
                title: R(P(e.controls) ? e.controls.title : void 0, S.title),
                spacing: R(P(e.controls) ? e.controls.spacing : void 0, S.spacing),
                quiet: R(P(e.controls) ? e.controls.quiet : void 0, S.quiet)
              },
              checks: [...new Set(i)]
            };
          }(z(t.get("result")))
        };
      } catch (t) {
        return {
          spec: I(null, e),
          result: null
        };
      }
    }(i);
    c(e.spec), e.result && (u(e.result.choice), p(e.result.priority), g(e.result.controls), v([...e.result.checks]), b(Math.max(0, e.spec.modules.length - 1)), w(!0));
  }, [i]), (0, a.useEffect)(() => {
    if (!j) return;
    let e = window.setTimeout(() => k(null), 1600);
    return () => window.clearTimeout(e);
  }, [j]);
  let Y = x ? N.length - 1 : Math.min(y, N.length - 1);
  return (0, n.jsx)("div", {
    className: "learning-lab-page",
    children: (0, n.jsxs)("div", {
      className: "learning-lab-shell",
      children: [(0, n.jsxs)("header", {
        className: "learning-lab-topbar",
        children: [(0, n.jsxs)("nav", {
          className: "detail-breadcrumb",
          "aria-label": s.breadcrumbAria,
          children: [(0, n.jsx)("button", {
            className: "breadcrumb-link",
            type: "button",
            onClick: r,
            children: "VibeHub Skill"
          }), (0, n.jsx)("span", {
            className: "breadcrumb-separator",
            "aria-hidden": "true",
            children: "›"
          }), (0, n.jsx)("span", {
            className: "breadcrumb-current",
            "aria-current": "page",
            children: s.lab
          })]
        }), (0, n.jsxs)("span", {
          className: "learning-generated",
          children: [(0, n.jsx)("i", {
            className: "ti ti-sparkles",
            "aria-hidden": "true"
          }), s.generated, N.length, s.interactions]
        })]
      }), (0, n.jsxs)("section", {
        className: "learning-intro",
        children: [(0, n.jsxs)("div", {
          className: "learning-intro-context",
          children: [s.combinedCase, o.context]
        }), (0, n.jsx)("h1", {
          children: o.goal
        }), (0, n.jsx)("p", {
          children: s.intro
        }), (0, n.jsx)("ol", {
          className: "learning-route",
          "aria-label": s.routeAria,
          children: N.map((e, t) => (0, n.jsx)("li", {
            className: [t === Y ? "is-current" : "", t < Y || x ? "is-done" : ""].filter(Boolean).join(" "),
            children: e.label
          }, e.id))
        })]
      }), (0, n.jsxs)("section", {
        className: "learning-stage",
        "aria-label": s.stageAria,
        children: [(0, n.jsxs)("header", {
          className: "learning-stage-header",
          children: [(0, n.jsxs)("div", {
            children: [(0, n.jsxs)("small", {
              children: [s.practicing, T.name]
            }), (0, n.jsx)("h2", {
              children: s.stageTitle
            })]
          }), (0, n.jsxs)("button", {
            className: "learning-reset",
            type: "button",
            onClick: function () {
              u("a"), p(null), g(S), v([]), b(0), w(!1), k(null), window.requestAnimationFrame(() => J(!1));
            },
            children: [(0, n.jsx)("i", {
              className: "ti ti-refresh",
              "aria-hidden": "true"
            }), s.restart]
          })]
        }), (0, n.jsx)(O, {
          enhanced: "b" === d,
          priority: h,
          controls: m,
          copy: s,
          activityCopy: l
        }), C.includes("observe") ? (0, n.jsxs)(n.Fragment, {
          children: [(0, n.jsx)("div", {
            className: "learning-compare-row",
            children: (0, n.jsxs)("div", {
              className: "learning-option-cards",
              "aria-label": s.choicesAria,
              children: [(0, n.jsxs)("button", {
                className: "a" === d ? "is-active" : "",
                type: "button",
                "aria-pressed": "a" === d,
                onClick: () => Q("a"),
                children: [(0, n.jsx)("i", {
                  className: "ti ti-check",
                  "aria-hidden": "true"
                }), (0, n.jsx)("small", {
                  children: s.optionA
                }), (0, n.jsx)("b", {
                  children: s.optionATitle
                }), (0, n.jsx)("span", {
                  children: s.optionADescription
                })]
              }), (0, n.jsxs)("button", {
                className: "b" === d ? "is-active" : "",
                type: "button",
                "aria-pressed": "b" === d,
                onClick: () => Q("b"),
                children: [(0, n.jsx)("i", {
                  className: "ti ti-check",
                  "aria-hidden": "true"
                }), (0, n.jsx)("small", {
                  children: s.optionB
                }), (0, n.jsx)("b", {
                  children: s.optionBTitle
                }), (0, n.jsx)("span", {
                  children: s.optionBDescription
                })]
              })]
            })
          }), (0, n.jsxs)("div", {
            className: "learning-observe-action",
            children: [(0, n.jsx)("p", {
              children: s.compareInstruction
            }), (0, n.jsxs)("button", {
              className: "learning-choose",
              type: "button",
              onClick: function () {
                C.includes("observe") ? W("observe") : b(0);
              },
              children: [s.chooseDirection, (0, n.jsx)("i", {
                className: "ti ti-arrow-right",
                "aria-hidden": "true"
              })]
            })]
          })]
        }) : null, y > V("observe") && C.includes("observe") ? (0, n.jsxs)("p", {
          className: "learning-insight",
          children: [s.insightPrefix, (0, n.jsx)("b", {
            children: T.name
          }), s.sentenceEnd, T.insight]
        }) : null, G("prioritize") ? (0, n.jsxs)("section", {
          className: "learning-module learning-priority",
          "aria-label": s.priorityAria,
          children: [(0, n.jsx)(B, {
            step: s.priorityStep,
            title: s.priorityTitle,
            description: s.priorityDescription
          }), (0, n.jsx)("div", {
            className: "learning-priority-options",
            children: Object.entries(l.priorities).map(e => {
              let [t, i] = e;
              return (0, n.jsxs)("button", {
                className: h === t ? "is-active" : "",
                type: "button",
                "aria-pressed": h === t,
                onClick: () => {
                  p(t), W("prioritize"), w(!1);
                },
                children: [(0, n.jsx)("i", {
                  className: "ti ti-check",
                  "aria-hidden": "true"
                }), (0, n.jsx)("b", {
                  children: i.label
                }), (0, n.jsx)("span", {
                  children: i.description
                })]
              }, t);
            })
          })]
        }) : null, G("tune") ? (0, n.jsxs)("section", {
          className: "learning-module learning-tuning",
          "aria-label": s.tuningAria,
          children: [(0, n.jsx)(B, {
            step: s.tuningStep,
            title: s.tuningTitle,
            description: s.tuningDescription,
            action: (0, n.jsxs)("button", {
              className: "learning-next",
              type: "button",
              onClick: function () {
                C.includes("verify") ? W("tune") : K();
              },
              children: [s.startCheck, (0, n.jsx)("i", {
                className: "ti ti-arrow-right",
                "aria-hidden": "true"
              })]
            })
          }), (0, n.jsxs)("div", {
            className: "learning-controls",
            children: [(0, n.jsx)(_, {
              label: s.titleControl,
              value: m.title,
              onChange: e => $("title", e)
            }), (0, n.jsx)(_, {
              label: s.spacingControl,
              value: m.spacing,
              onChange: e => $("spacing", e)
            }), (0, n.jsx)(_, {
              label: s.quietControl,
              value: m.quiet,
              onChange: e => $("quiet", e)
            })]
          })]
        }) : null, G("verify") ? (0, n.jsxs)("section", {
          className: "learning-module learning-verify",
          "aria-label": s.verifyAria,
          children: [(0, n.jsx)(B, {
            step: s.verifyStep,
            title: s.verifyTitle,
            description: s.verifyDescription
          }), (0, n.jsx)("div", {
            className: "learning-checks",
            children: Object.entries(l.verifyItems).map(e => {
              let [t, i] = e;
              return (0, n.jsxs)("button", {
                className: f.includes(t) ? "is-checked" : "",
                type: "button",
                "aria-pressed": f.includes(t),
                onClick: () => {
                  v(e => e.includes(t) ? e.filter(e => e !== t) : [...e, t]), w(!1);
                },
                children: [(0, n.jsx)("i", {
                  className: "ti ti-check",
                  "aria-hidden": "true"
                }), (0, n.jsx)("span", {
                  children: i
                })]
              }, t);
            })
          }), (0, n.jsxs)("div", {
            className: "learning-verify-action",
            children: [(0, n.jsx)("p", {
              children: H ? s.checked : s.unchecked
            }), (0, n.jsxs)("button", {
              className: "learning-finish",
              type: "button",
              disabled: !H,
              onClick: K,
              children: [s.prepareRequest, (0, n.jsx)("i", {
                className: "ti ti-arrow-right",
                "aria-hidden": "true"
              })]
            })]
          })]
        }) : null, x ? (0, n.jsxs)("section", {
          className: "learning-result",
          "aria-live": "polite",
          children: [(0, n.jsxs)("div", {
            children: [(0, n.jsx)("small", {
              children: s.complete
            }), (0, n.jsx)("h3", {
              children: s.resultTitle
            }), (0, n.jsx)("p", {
              children: s.resultDescription
            })]
          }), (0, n.jsxs)("div", {
            className: "learning-result-actions",
            children: [(0, n.jsxs)("button", {
              type: "button",
              onClick: () => U("result"),
              children: [(0, n.jsx)("i", {
                className: "ti ".concat("result" === j ? "ti-check" : "ti-copy"),
                "aria-hidden": "true"
              }), "result" === j ? s.copied : s.copyRequest]
            }), (0, n.jsxs)("button", {
              type: "button",
              onClick: () => U("link"),
              children: [(0, n.jsx)("i", {
                className: "ti ".concat("link" === j ? "ti-check" : "ti-link"),
                "aria-hidden": "true"
              }), "link" === j ? s.copied : s.copyExercise]
            })]
          })]
        }) : null]
      })]
    })
  });
}
export { H as LearningLab, k as VibeSkillPage };
