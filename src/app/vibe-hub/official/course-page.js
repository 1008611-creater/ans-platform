// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import { CourseLearningActions, CourseReaderContext } from "../courses/course-learning-actions";
import { EmbeddedCourseTerm } from "../courses/embedded-term";
import * as a from "react/jsx-runtime";
import * as t from "react";
import {useCourseProgress as j,emptyChapterProgress as m} from "../courses/course-progress";
import * as n from "./course-catalog.js";
import * as i from "./course-cache.js";
import * as l from "next/image";
import * as o from "../courses/routing";
import * as g from "./prefetch-queue.js";
import * as w from "./course-terms.js";
function c(e) {
  var s;
  let r = null == (s = e.src.match(/^\/vibe-hub\/source\/assets\/((?:product-website|git-workflow)-(?:route|chapter-\d+)-list(?:-en)?-v\d+)\.webp$/)) ? void 0 : s[1];
  return r ? (0, a.jsx)("svg", {
    width: e.width,
    height: e.height,
    viewBox: "0 0 640 640",
    "aria-hidden": "true",
    focusable: "false",
    preserveAspectRatio: "xMidYMid meet",
    children: (0, a.jsx)("use", {
      href: "/vibe-hub/source/assets/course-blueprints.svg#".concat(r)
    })
  }) : (0, a.jsx)(l.default, {
    ...e,
    alt: e.alt
  });
}
function f(e) {
  let {
      locale: s,
      onOpenRoute: r,
      route: t
    } = e,
    {
      hydrated: n,
      progress: i
    } = j(t.id),
    l = t.chapterIds.filter(e => {
      var s;
      return (null == (s = i.chapters[e]) ? void 0 : s.status) === "completed";
    }).length;
  return (0, a.jsx)("li", {
    children: (0, a.jsxs)("a", {
      className: "course-route-card has-route-visual",
      href: (0, o.BB)(t.id, s),
      onClick: e => {
        !r || e.metaKey || e.ctrlKey || e.shiftKey || (e.preventDefault(), r(t.id));
      },
      children: [(0, a.jsxs)("div", {
        className: "course-route-summary",
        children: [(0, a.jsx)("h2", {
          children: t.title
        }), (0, a.jsx)("p", {
          children: t.description
        }), (0, a.jsxs)("div", {
          className: "course-route-meta",
          children: [(0, a.jsxs)("span", {
            children: [t.chapterIds.length, " ", t.unitLabel]
          }), n && l > 0 ? (0, a.jsxs)("span", {
            children: ["已读完 ", l, " ", t.unitLabel]
          }) : null]
        })]
      }), t.visual ? (0, a.jsx)("span", {
        className: "course-route-list-visual",
        children: (0, a.jsx)(c, {
          src: "en" === s && t.visual.srcEn ? t.visual.srcEn : t.visual.src,
          alt: "",
          "aria-hidden": "true",
          width: t.visual.width,
          height: t.visual.height,
          sizes: "(max-width: 560px) 0px, (max-width: 959px) 200px, 280px"
        })
      }) : null]
    })
  });
}
function v(e) {
  let {
    locale: s,
    routes: r,
    onOpenRoute: t
  } = e;
  return (0, a.jsx)("div", {
    className: "course-app course-index-app",
    children: (0, a.jsxs)("div", {
      className: "course-index-main",
      children: [(0, a.jsx)("header", {
        className: "course-index-heading",
        children: (0, a.jsx)("h1", {
          children: "课程"
        })
      }), (0, a.jsx)("ul", {
        className: "course-route-list",
        children: r.map(e => (0, a.jsx)(f, {
          locale: s,
          onOpenRoute: t,
          route: e
        }, e.id))
      })]
    })
  });
}
function N(e) {
  let s = (0, t.useRef)(null),
    r = () => {
      var e;
      null == (e = s.current) || e.call(s), s.current = null;
    };
  return (0, t.useEffect)(() => () => {
    var e;
    return null == (e = s.current) ? void 0 : e.call(s);
  }, [e]), {
    prepare(a) {
      r(), s.current = (0, g.b)(() => i.courseChapters.load(e, a));
    },
    cancel: r
  };
}
let b = {
  "not-started": "未开始",
  "in-progress": "学习中",
  completed: "已读完"
};
function y(e) {
  var s, r;
  let {
      course: n,
      courseId: l,
      locale: d,
      onOpenChapter: u,
      onOpenRoutes: h
    } = e,
    {
      hydrated: m,
      progress: p
    } = j(l),
    x = N(l),
    f = n.chapters.filter(e => {
      var s;
      return (null == (s = p.chapters[e.id]) ? void 0 : s.status) === "completed";
    }).length,
    v = null != (r = null != (s = n.chapters.find(e => {
      var s;
      return "in-progress" === (null == (s = p.chapters[e.id]) ? void 0 : s.status);
    })) ? s : n.chapters.find(e => {
      var s;
      return (null == (s = p.chapters[e.id]) ? void 0 : s.status) !== "completed";
    })) ? r : n.chapters[0],
    y = null == v ? void 0 : v.id;
  return (0, t.useEffect)(() => {
    if (y) return (0, g.b)(() => i.courseChapters.load(l, y), 150);
  }, [l, y]), (0, a.jsx)("div", {
    className: "course-app course-home-app",
    children: (0, a.jsxs)("div", {
      className: "course-home-main",
      children: [(0, a.jsxs)("header", {
        className: "course-home-intro",
        children: [(0, a.jsx)("a", {
          className: "course-home-back",
          href: (0, o.qD)(d),
          onClick: e => {
            !h || e.metaKey || e.ctrlKey || e.shiftKey || (e.preventDefault(), h());
          },
          children: "全部课程"
        }), (0, a.jsx)("h1", {
          children: n.title
        }), (0, a.jsx)("p", {
          className: "course-home-lead",
          children: n.description
        }), (0, a.jsxs)("div", {
          className: "course-home-actions",
          children: [v ? (0, a.jsxs)("a", {
            className: "course-primary-link",
            href: (0, o.Qi)(l, v.id, d),
            onPointerEnter: () => x.prepare(v.id),
            onPointerLeave: x.cancel,
            onFocus: () => x.prepare(v.id),
            onBlur: x.cancel,
            onPointerDown: () => (0, i.prefetchCourseChapter)(l, v.id),
            onClick: e => {
              !u || e.metaKey || e.ctrlKey || e.shiftKey || (e.preventDefault(), u(v.id));
            },
            children: [f > 0 ? "继续学习" : "从第一".concat(n.unitLabel, "开始"), (0, a.jsx)("span", {
              "aria-hidden": "true",
              children: "→"
            })]
          }) : null, (0, a.jsx)("span", {
            className: "course-progress-copy",
            "aria-live": "polite",
            children: m ? "已读完 ".concat(f, " / ").concat(n.chapters.length, " ").concat(n.unitLabel) : "正在读取进度"
          })]
        })]
      }), (0, a.jsx)("nav", {
        className: "course-chapter-list",
        "aria-label": "章" === n.unitLabel ? "章节目录" : "课程目录",
        children: (0, a.jsx)("ol", {
          children: n.chapters.map(e => {
            var s, r, t;
            let n = null != (r = null == (s = p.chapters[e.id]) ? void 0 : s.status) ? r : "not-started",
              h = null != (t = e.header.listVisual) ? t : e.header.visual;
            return (0, a.jsx)("li", {
              children: (0, a.jsxs)("a", {
                className: "course-chapter-card".concat(h ? " has-list-visual" : "").concat("not-started" === n ? " is-not-started" : ""),
                href: (0, o.Qi)(l, e.id, d),
                onPointerEnter: () => x.prepare(e.id),
                onPointerLeave: x.cancel,
                onFocus: () => x.prepare(e.id),
                onBlur: x.cancel,
                onPointerDown: () => (0, i.prefetchCourseChapter)(l, e.id),
                onClick: s => {
                  !u || s.metaKey || s.ctrlKey || s.shiftKey || (s.preventDefault(), u(e.id));
                },
                children: [(0, a.jsxs)("div", {
                  className: "course-chapter-summary",
                  children: [(0, a.jsx)("span", {
                    className: "course-chapter-number",
                    children: String(e.order).padStart(2, "0")
                  }), (0, a.jsxs)("div", {
                    className: "course-chapter-title-row",
                    children: [(0, a.jsx)("h3", {
                      children: e.title
                    }), (0, a.jsx)("span", {
                      className: "course-status is-".concat(n),
                      children: b[n]
                    })]
                  }), (0, a.jsx)("p", {
                    children: e.intro
                  })]
                }), (0, a.jsx)("span", {
                  className: "course-chapter-card-highlight",
                  "aria-hidden": "true"
                }), h ? (0, a.jsx)("span", {
                  className: "course-chapter-list-visual",
                  children: (0, a.jsx)(c, {
                    src: "en" === d && h.srcEn ? h.srcEn : h.src,
                    alt: "",
                    "aria-hidden": "true",
                    width: h.width,
                    height: h.height,
                    sizes: "(max-width: 560px) 0px, (max-width: 959px) 200px, 280px"
                  })
                }) : null]
              })
            }, e.id);
          })
        })
      })]
    })
  });
}
function k(e) {
  let {
      progress: s,
      chapterOrder: r,
      chapterCount: t,
      stages: n,
      unitLabel: i
    } = e,
    l = n.find(e => r >= e.startChapter && r <= e.endChapter),
    c = s.decisions.filter(e => e.chapter <= r && (!l || e.chapter >= l.startChapter && e.chapter <= l.endChapter));
  return (0, a.jsxs)("div", {
    className: "course-chapter-progress",
    children: [(0, a.jsxs)("div", {
      className: "course-chapter-progress-header",
      children: [(0, a.jsx)("strong", {
        children: s.title
      }), (0, a.jsxs)("span", {
        children: ["第 ", (0, a.jsx)("b", {
          children: r
        }), " ", i, " / 共 ", t, " ", i, l ? " \xb7 ".concat(l.name) : ""]
      })]
    }), n.length ? (0, a.jsx)("ol", {
      className: "course-progress-track",
      "aria-label": "课程阶段进度",
      children: n.map(e => {
        let s = r > e.endChapter,
          t = r >= e.startChapter && r <= e.endChapter,
          n = e.endChapter - e.startChapter + 1,
          l = s ? 100 : t ? (r - e.startChapter + 1) / n * 100 : 0;
        return (0, a.jsxs)("li", {
          className: t ? "is-current" : s ? "is-done" : void 0,
          children: [(0, a.jsx)("strong", {
            children: e.name
          }), (0, a.jsx)("small", {
            children: t ? "".concat(e.range, " \xb7 第 ").concat(r, " ").concat(i) : e.range
          }), (0, a.jsx)("span", {
            className: "course-progress-bar",
            "aria-hidden": "true",
            children: (0, a.jsx)("i", {
              style: {
                width: "".concat(l, "%")
              }
            })
          })]
        }, e.name);
      })
    }) : null, (0, a.jsxs)("div", {
      className: "course-progress-decisions",
      children: [(0, a.jsx)("strong", {
        children: "到目前为止，我们确定了"
      }), (0, a.jsx)("ul", {
        children: c.map(e => (0, a.jsxs)("li", {
          className: e.chapter === r ? "is-current" : void 0,
          children: [(0, a.jsxs)("b", {
            children: ["第 ", e.chapter, " ", i]
          }), "：", e.text]
        }, e.chapter))
      })]
    })]
  });
}
function T(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsx)("ol", {
    className: "course-inline-flow",
    children: s.steps.map(e => (0, a.jsxs)("li", {
      children: [(0, a.jsx)("strong", {
        children: e.title
      }), (0, a.jsx)("span", {
        children: e.detail
      })]
    }, e.title))
  });
}
function C() {
  return (0, a.jsxs)("div", {
    className: "course-compare-wireframe-browser",
    "aria-hidden": "true",
    children: [(0, a.jsxs)("div", {
      className: "course-compare-browser-dots",
      children: [(0, a.jsx)("span", {}), (0, a.jsx)("span", {}), (0, a.jsx)("span", {})]
    }), (0, a.jsxs)("div", {
      className: "course-compare-browser-bar",
      children: [(0, a.jsxs)("div", {
        className: "course-compare-header-callout",
        children: [(0, a.jsx)("span", {
          className: "course-compare-badge-pill is-header",
          children: "Header 页头"
        }), (0, a.jsxs)("div", {
          className: "course-compare-logo-mock",
          children: [(0, a.jsx)("i", {}), (0, a.jsx)("b", {
            children: "作品页工具"
          })]
        })]
      }), (0, a.jsxs)("div", {
        className: "course-compare-navbar-callout",
        children: [(0, a.jsx)("span", {
          className: "course-compare-badge-pill is-navbar",
          children: "Navbar 导航栏"
        }), (0, a.jsxs)("div", {
          className: "course-compare-nav-links",
          children: [(0, a.jsx)("em", {
            children: "功能"
          }), (0, a.jsx)("em", {
            children: "示例"
          }), (0, a.jsx)("em", {
            children: "FAQ"
          })]
        })]
      })]
    })]
  });
}
function S() {
  return (0, a.jsx)("div", {
    className: "course-compare-boxmodel-visual",
    "aria-hidden": "true",
    children: (0, a.jsxs)("div", {
      className: "course-compare-boxmodel-gap",
      children: [(0, a.jsx)("span", {
        className: "course-compare-boxmodel-label is-gap",
        children: "Gap 区块间距 (两张卡片之间)"
      }), (0, a.jsxs)("div", {
        className: "course-compare-boxmodel-cards",
        children: [(0, a.jsx)("div", {
          className: "course-compare-boxmodel-card",
          children: (0, a.jsxs)("div", {
            className: "course-compare-boxmodel-padding",
            children: [(0, a.jsx)("span", {
              className: "course-compare-boxmodel-label is-padding",
              children: "Padding 内边距"
            }), (0, a.jsxs)("div", {
              className: "course-compare-boxmodel-inner",
              children: [(0, a.jsx)("strong", {
                children: "卡片 1"
              }), (0, a.jsx)("span", {
                children: "文字留出呼吸空间"
              })]
            })]
          })
        }), (0, a.jsx)("div", {
          className: "course-compare-boxmodel-card",
          children: (0, a.jsxs)("div", {
            className: "course-compare-boxmodel-padding",
            children: [(0, a.jsx)("span", {
              className: "course-compare-boxmodel-label is-padding",
              children: "Padding 内边距"
            }), (0, a.jsxs)("div", {
              className: "course-compare-boxmodel-inner",
              children: [(0, a.jsx)("strong", {
                children: "卡片 2"
              }), (0, a.jsx)("span", {
                children: "同档统一内边距"
              })]
            })]
          })
        })]
      })]
    })
  });
}
function I(e) {
  let {
      visual: s
    } = e,
    r = s.left.title.includes("Header") || s.left.title.includes("页头"),
    t = s.left.title.includes("Padding") || s.left.title.includes("内边距");
  return (0, a.jsxs)("div", {
    className: "course-inline-compare-wrapper",
    children: [r ? (0, a.jsx)(C, {}) : null, t ? (0, a.jsx)(S, {}) : null, (0, a.jsx)("div", {
      className: "course-inline-compare",
      children: [s.left, s.right].map((e, s) => (0, a.jsxs)("section", {
        className: 0 === s ? "is-left" : "is-right",
        children: [(0, a.jsxs)("div", {
          children: [(0, a.jsx)("strong", {
            children: e.title
          }), (0, a.jsx)("span", {
            children: e.detail
          })]
        }), (0, a.jsx)("ul", {
          children: e.items.map(e => (0, a.jsx)("li", {
            children: e
          }, e))
        })]
      }, e.title))
    })]
  });
}
function E(e) {
  let {
    card: s,
    tone: r
  } = e;
  return (0, a.jsxs)("div", {
    className: "course-before-after-card is-".concat(r),
    children: [(0, a.jsxs)("div", {
      className: "course-before-after-card-body",
      children: [(0, a.jsx)("strong", {
        children: s.title
      }), (0, a.jsx)("span", {
        children: s.text
      }), s.chips ? (0, a.jsx)("div", {
        className: "course-before-after-chips".concat(s.primaryChip ? " has-primary" : ""),
        children: s.chips.map(e => (0, a.jsx)("em", {
          children: e
        }, e))
      }) : null]
    }), s.annotation ? (0, a.jsx)("em", {
      children: s.annotation
    }) : null]
  });
}
function B(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsxs)("div", {
    className: "course-before-after",
    children: [[s.before, s.after].map((e, r) => {
      var t;
      return (0, a.jsxs)("section", {
        children: [(0, a.jsx)("small", {
          className: 1 === r ? "is-after" : void 0,
          children: e.label
        }), (0, a.jsx)(E, {
          card: e.card,
          tone: 1 === r ? "fixed" : null != (t = e.card.tone) ? t : "problem"
        }), 0 === r ? (0, a.jsxs)("p", {
          className: "course-before-after-say",
          children: ["对 AI 说：", (0, a.jsx)("strong", {
            children: s.agentSay
          })]
        }) : e.note ? (0, a.jsx)("p", {
          className: "course-before-after-say",
          children: e.note
        }) : null]
      }, e.label);
    }), (0, a.jsx)("span", {
      className: "course-before-after-arrow",
      "aria-hidden": "true",
      children: (0, a.jsx)("small", {
        children: "AI 调整"
      })
    })]
  });
}
function P(e) {
  var s, r, t;
  let {
    block: n,
    index: i
  } = e;
  return (0, a.jsxs)("li", {
    className: "is-".concat(n.type).concat(n.emphasis ? " is-emphasis" : ""),
    children: [(0, a.jsxs)("div", {
      className: "course-site-preview-tag",
      children: [(0, a.jsx)("i", {
        children: String(i + 1).padStart(2, "0")
      }), (0, a.jsx)("strong", {
        children: n.label
      }), n.note ? (0, a.jsx)("small", {
        children: n.note
      }) : null]
    }), (0, a.jsxs)("div", {
      className: "course-site-preview-stage",
      children: [0 === i ? (0, a.jsxs)("div", {
        className: "course-site-preview-chrome",
        "aria-hidden": "true",
        children: [(0, a.jsx)("span", {}), (0, a.jsx)("span", {}), (0, a.jsx)("span", {}), (0, a.jsx)("i", {})]
      }) : null, "header" === n.type ? (0, a.jsxs)("div", {
        className: "course-site-preview-header",
        children: [(0, a.jsxs)("b", {
          children: [(0, a.jsx)("i", {
            "aria-hidden": "true"
          }), n.brand]
        }), (0, a.jsx)("nav", {
          "aria-hidden": "true",
          children: (null != (s = n.links) ? s : []).map(e => (0, a.jsx)("span", {
            children: e
          }, e))
        })]
      }) : null, "hero" === n.type ? (0, a.jsxs)("div", {
        className: "course-site-preview-hero",
        children: [(0, a.jsx)("b", {
          children: n.heading
        }), (0, a.jsx)("span", {
          children: n.subheading
        }), (0, a.jsx)("em", {
          children: n.button
        })]
      }) : null, "cards" === n.type ? (0, a.jsx)("div", {
        className: "course-site-preview-cards",
        children: (null != (r = n.cards) ? r : []).map(e => (0, a.jsxs)("div", {
          children: [(0, a.jsx)("i", {
            "aria-hidden": "true"
          }), (0, a.jsx)("b", {
            children: e.title
          }), (0, a.jsx)("span", {
            children: e.text
          })]
        }, e.title))
      }) : null, "links" === n.type ? (0, a.jsx)("div", {
        className: "course-site-preview-links",
        children: (null != (t = n.links) ? t : []).map(e => (0, a.jsx)("span", {
          children: e
        }, e))
      }) : null, "footer" === n.type ? (0, a.jsx)("div", {
        className: "course-site-preview-footer",
        children: n.text
      }) : null]
    })]
  });
}
function R(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsx)("div", {
    className: "course-site-preview",
    children: (0, a.jsx)("ol", {
      children: s.blocks.map((e, s) => (0, a.jsx)(P, {
        block: e,
        index: s
      }, e.label))
    })
  });
}
function O(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsx)("div", {
    className: "course-text-scale",
    children: s.samples.map(e => (0, a.jsxs)("div", {
      className: "is-".concat(e.level),
      children: [(0, a.jsx)("div", {
        className: "course-text-scale-sample",
        children: "button" === e.level ? (0, a.jsx)("em", {
          children: e.text
        }) : (0, a.jsx)("p", {
          children: e.text
        })
      }), (0, a.jsxs)("div", {
        className: "course-text-scale-tag",
        children: [(0, a.jsx)("strong", {
          children: e.label
        }), (0, a.jsx)("span", {
          children: e.note
        })]
      })]
    }, e.label))
  });
}
function A(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsx)("div", {
    className: "course-control-states",
    children: s.states.map(e => (0, a.jsxs)("div", {
      children: [(0, a.jsx)("button", {
        type: "button",
        className: "course-state-demo is-".concat(e.state),
        tabIndex: -1,
        children: s.control
      }), (0, a.jsx)("strong", {
        children: e.label
      }), (0, a.jsx)("span", {
        children: e.note
      })]
    }, e.state))
  });
}
function F(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsx)("div", {
    className: "course-ui-panels",
    children: s.panels.map(e => {
      var s, r;
      return (0, a.jsxs)("section", {
        children: [(0, a.jsx)("small", {
          children: e.label
        }), (0, a.jsxs)("div", {
          className: "course-ui-panel-demo is-".concat(e.variant),
          children: ["cards" === e.variant || "grid" === e.variant ? e.items.map(e => (0, a.jsxs)("div", {
            children: [(0, a.jsx)("i", {
              "aria-hidden": "true"
            }), (0, a.jsx)("b", {
              children: e.title
            }), (0, a.jsx)("span", {
              children: e.text
            })]
          }, e.title)) : null, "list" === e.variant ? (0, a.jsx)("ul", {
            children: e.items.map(e => (0, a.jsxs)("li", {
              children: [(0, a.jsx)("i", {
                "aria-hidden": "true"
              }), (0, a.jsx)("b", {
                children: e.title
              })]
            }, e.title))
          }) : null, "flex" === e.variant ? (0, a.jsxs)("div", {
            className: "course-ui-panel-flex-item",
            children: [(0, a.jsx)("i", {
              "aria-hidden": "true"
            }), (0, a.jsxs)("div", {
              children: [(0, a.jsx)("b", {
                children: null == (s = e.items[0]) ? void 0 : s.title
              }), (0, a.jsx)("span", {
                children: null == (r = e.items[0]) ? void 0 : r.text
              })]
            })]
          }) : null, "link-button" === e.variant ? (0, a.jsx)("div", {
            className: "course-ui-panel-controls",
            children: e.items.map(s => e.label.toLowerCase().includes("button") || e.label.includes("按钮") ? (0, a.jsx)("button", {
              type: "button",
              className: "course-ui-button-demo",
              children: s.title
            }, s.title) : (0, a.jsxs)("a", {
              href: "#",
              className: "course-ui-link-demo",
              onClick: e => e.preventDefault(),
              children: [s.title, " ↗"]
            }, s.title))
          }) : null]
        }), (0, a.jsx)("p", {
          children: e.note
        })]
      }, e.label);
    })
  });
}
function D(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsx)("div", {
    className: "course-form-states",
    children: s.states.map(e => {
      var r;
      return (0, a.jsxs)("div", {
        className: "is-".concat(e.state),
        children: [(0, a.jsx)("small", {
          children: e.label
        }), (0, a.jsxs)("div", {
          className: "course-form-states-field",
          children: [(0, a.jsx)("label", {
            children: s.fieldLabel
          }), "success" === e.state ? (0, a.jsx)("div", {
            className: "course-form-states-result",
            children: e.message
          }) : (0, a.jsxs)(a.Fragment, {
            children: [(0, a.jsx)("input", {
              readOnly: !0,
              tabIndex: -1,
              value: null != (r = e.value) ? r : "",
              placeholder: "you@example.com"
            }), e.message ? (0, a.jsx)("em", {
              children: e.message
            }) : null]
          })]
        }), (0, a.jsx)("p", {
          children: e.note
        })]
      }, e.state);
    })
  });
}
function L(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsx)("div", {
    className: "course-device-drawer",
    children: [{
      side: s.closed,
      open: !1
    }, {
      side: s.open,
      open: !0
    }].map(e => {
      let {
        side: r,
        open: t
      } = e;
      return (0, a.jsxs)("section", {
        className: t ? "is-open" : void 0,
        children: [(0, a.jsx)("small", {
          children: r.label
        }), (0, a.jsxs)("div", {
          className: "course-device-frame",
          children: [(0, a.jsxs)("div", {
            className: "course-device-bar",
            "aria-hidden": "true",
            children: [(0, a.jsx)("i", {}), (0, a.jsx)("b", {
              "aria-hidden": "true",
              children: (0, a.jsx)("i", {
                className: "ti ti-menu-2"
              })
            })]
          }), (0, a.jsxs)("div", {
            className: "course-device-screen",
            children: [(0, a.jsxs)("div", {
              className: "course-device-page",
              "aria-hidden": "true",
              children: [(0, a.jsx)("b", {
                children: "作品页工具"
              }), (0, a.jsx)("span", {
                children: "把散落的项目素材，整理成作品页"
              }), (0, a.jsx)("em", {
                children: "查看完整示例"
              })]
            }), t ? (0, a.jsxs)(a.Fragment, {
              children: [(0, a.jsxs)("div", {
                className: "course-device-drawer-panel",
                "aria-hidden": "true",
                children: [(0, a.jsx)("i", {
                  className: "ti ti-x"
                }), s.menu.map(e => (0, a.jsx)("b", {
                  children: e
                }, e))]
              }), (0, a.jsx)("div", {
                className: "course-device-drawer-backdrop",
                "aria-hidden": "true"
              })]
            }) : null]
          })]
        }), (0, a.jsx)("p", {
          children: r.note
        })]
      }, r.label);
    })
  });
}
function M(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsxs)("div", {
    className: "course-material-flow",
    children: [(0, a.jsxs)("section", {
      children: [(0, a.jsx)("small", {
        children: "现在：素材散在各处"
      }), (0, a.jsx)("div", {
        className: "course-material-cards",
        children: s.materials.map((e, s) => (0, a.jsxs)("div", {
          style: {
            transform: "rotate(".concat((s - 1) * 3, "deg)")
          },
          children: [(0, a.jsx)("b", {
            children: e.app
          }), (0, a.jsx)("span", {
            children: e.text
          })]
        }, e.app))
      })]
    }), (0, a.jsx)("span", {
      className: "course-material-flow-arrow",
      "aria-hidden": "true",
      children: (0, a.jsx)("small", {
        children: "工具整理"
      })
    }), (0, a.jsxs)("section", {
      children: [(0, a.jsx)("small", {
        children: "之后：一张作品页"
      }), (0, a.jsx)("div", {
        className: "course-material-result",
        children: s.result.map((e, s) => (0, a.jsxs)("div", {
          children: [(0, a.jsx)("i", {
            children: s + 1
          }), e]
        }, e))
      })]
    })]
  });
}
function _(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsxs)("div", {
    className: "course-token-board",
    children: [(0, a.jsxs)("div", {
      className: "course-token-row",
      children: [(0, a.jsx)("small", {
        children: "颜色"
      }), (0, a.jsx)("div", {
        className: "course-token-swatches",
        children: s.swatches.map(e => (0, a.jsxs)("div", {
          children: [(0, a.jsx)("i", {
            className: "is-".concat(e.tone)
          }), (0, a.jsx)("b", {
            children: e.name
          }), (0, a.jsx)("span", {
            children: e.note
          })]
        }, e.name))
      })]
    }), (0, a.jsxs)("div", {
      className: "course-token-row",
      children: [(0, a.jsx)("small", {
        children: "间距档位"
      }), (0, a.jsx)("div", {
        className: "course-token-spaces",
        children: s.spaces.map(e => (0, a.jsxs)("div", {
          children: [(0, a.jsx)("i", {
            style: {
              width: "".concat(e, "px")
            }
          }), (0, a.jsx)("b", {
            children: e
          })]
        }, e))
      })]
    }), (0, a.jsxs)("div", {
      className: "course-token-row",
      children: [(0, a.jsx)("small", {
        children: "圆角"
      }), (0, a.jsx)("div", {
        className: "course-token-radii",
        children: s.radii.map(e => (0, a.jsxs)("div", {
          children: [(0, a.jsx)("i", {
            style: {
              borderRadius: "".concat(e, "px")
            }
          }), (0, a.jsxs)("b", {
            children: [e, "px"]
          })]
        }, e))
      })]
    })]
  });
}
function K(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsx)("div", {
    className: "course-chat-flow",
    children: s.messages.map((e, s) => (0, a.jsxs)("div", {
      className: "user" === e.role ? "is-user" : "is-agent",
      children: [(0, a.jsx)("i", {
        "aria-hidden": "true",
        children: "user" === e.role ? "我" : "AI"
      }), (0, a.jsx)("p", {
        children: e.text
      })]
    }, s))
  });
}
function W(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsxs)("div", {
    className: "course-checklist",
    children: [(0, a.jsx)("strong", {
      children: s.heading
    }), (0, a.jsx)("ol", {
      children: s.steps.map((e, s) => (0, a.jsxs)("li", {
        children: [(0, a.jsx)("i", {
          "aria-hidden": "true",
          children: s + 1
        }), (0, a.jsxs)("div", {
          children: [(0, a.jsx)("b", {
            children: e.label
          }), (0, a.jsx)("span", {
            children: e.text
          })]
        })]
      }, e.label))
    })]
  });
}
function q(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsx)("div", {
    className: "course-git-four-areas",
    children: s.areas.map(e => {
      var r;
      let t = null == (r = e.commandToNext) ? void 0 : r.replace(/^git\s+/u, "");
      return (0, a.jsxs)("section", {
        className: "course-git-area is-".concat(e.id),
        children: [(0, a.jsxs)("div", {
          className: "course-git-area-card",
          children: ["work" === e.id ? (0, a.jsxs)(a.Fragment, {
            children: [(0, a.jsx)("code", {
              children: s.file
            }), (0, a.jsx)("span", {
              className: "is-add",
              children: "+ 本地修改"
            })]
          }) : null, "stage" === e.id ? (0, a.jsxs)(a.Fragment, {
            children: [(0, a.jsx)("span", {
              children: "add 时的内容"
            }), (0, a.jsx)("code", {
              children: s.file
            })]
          }) : null, "repo" === e.id ? (0, a.jsxs)(a.Fragment, {
            children: [(0, a.jsx)("code", {
              children: s.commit
            }), (0, a.jsx)("b", {
              children: s.file
            })]
          }) : null, "remote" === e.id ? (0, a.jsxs)(a.Fragment, {
            children: [(0, a.jsx)("code", {
              children: s.remote
            }), (0, a.jsx)("b", {
              children: s.commit
            })]
          }) : null]
        }), (0, a.jsx)("strong", {
          children: e.name
        }), t ? (0, a.jsx)("span", {
          className: "course-git-area-cmd",
          children: t
        }) : null]
      }, e.id);
    })
  });
}
function H(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsxs)("div", {
    className: "course-git-commit-graph",
    children: [(0, a.jsx)("div", {
      className: "course-git-commit-chain",
      children: s.commits.map((e, r) => (0, a.jsxs)("div", {
        className: "course-git-commit-node".concat(e.isHead ? " is-head" : ""),
        children: [(0, a.jsx)("div", {
          className: "course-git-node-circle",
          children: (0, a.jsxs)("span", {
            className: "course-git-node-id",
            children: ["C", r]
          })
        }), r < s.commits.length - 1 ? (0, a.jsxs)("div", {
          className: "course-git-parent-link",
          title: "指向父提交",
          children: [(0, a.jsx)("span", {
            className: "course-git-link-line"
          }), (0, a.jsx)("span", {
            className: "course-git-link-arrow",
            children: "←"
          })]
        }) : null, (0, a.jsxs)("div", {
          className: "course-git-node-details",
          children: [(0, a.jsxs)("div", {
            className: "course-git-node-badges",
            children: [(0, a.jsx)("code", {
              className: "course-git-hash",
              children: e.hash
            }), e.branch ? (0, a.jsx)("span", {
              className: "course-git-branch-badge",
              children: e.branch
            }) : null, e.isHead ? (0, a.jsx)("span", {
              className: "course-git-head-badge",
              children: "HEAD ➔"
            }) : null]
          }), (0, a.jsx)("strong", {
            className: "course-git-node-msg",
            children: e.message
          }), (0, a.jsx)("div", {
            className: "course-git-node-files",
            children: e.files.map(e => (0, a.jsxs)("span", {
              className: "course-git-file-chip",
              children: [(0, a.jsx)("i", {
                className: "ti ti-file",
                "aria-hidden": "true"
              }), " ", e]
            }, e))
          })]
        })]
      }, e.hash))
    }), (0, a.jsx)("p", {
      className: "course-git-caption-hint",
      children: "每个提交引用一份已记录的文件树。文件名仅列本次改动，反向箭头指向父提交。"
    })]
  });
}
function z(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsxs)("div", {
    className: "course-git-diff-viewer",
    children: [(0, a.jsxs)("div", {
      className: "course-git-terminal-header",
      children: [(0, a.jsxs)("div", {
        className: "course-git-terminal-dots",
        "aria-hidden": "true",
        children: [(0, a.jsx)("span", {
          className: "dot-red"
        }), (0, a.jsx)("span", {
          className: "dot-yellow"
        }), (0, a.jsx)("span", {
          className: "dot-green"
        })]
      }), (0, a.jsx)("span", {
        className: "course-git-terminal-title",
        children: s.filename
      }), (0, a.jsxs)("div", {
        className: "course-git-diff-stats",
        children: [(0, a.jsxs)("span", {
          className: "stat-add",
          children: ["+", s.stats.additions]
        }), (0, a.jsxs)("span", {
          className: "stat-del",
          children: ["-", s.stats.deletions]
        })]
      })]
    }), (0, a.jsx)("div", {
      className: "course-git-diff-body",
      children: s.lines.map((e, s) => {
        var r, t;
        return (0, a.jsxs)("div", {
          className: "course-git-diff-line is-".concat(e.type),
          children: [(0, a.jsx)("span", {
            className: "line-num line-old",
            children: null != (r = e.oldNum) ? r : " "
          }), (0, a.jsx)("span", {
            className: "line-num line-new",
            children: null != (t = e.newNum) ? t : " "
          }), (0, a.jsx)("span", {
            className: "line-marker",
            children: "addition" === e.type ? "+" : "deletion" === e.type ? "-" : " "
          }), (0, a.jsx)("span", {
            className: "line-content",
            children: e.text
          })]
        }, s);
      })
    }), (0, a.jsxs)("div", {
      className: "course-git-diff-annotation",
      children: [(0, a.jsx)("span", {
        className: "annotation-icon",
        "aria-hidden": "true",
        children: (0, a.jsx)("i", {
          className: "ti ti-bulb"
        })
      }), (0, a.jsx)("p", {
        children: s.annotation
      })]
    })]
  });
}
function Q(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsxs)("div", {
    className: "course-git-ignore-board",
    children: [(0, a.jsxs)("div", {
      className: "course-git-ignore-rules-bar",
      children: [(0, a.jsxs)("div", {
        className: "rules-bar-label",
        children: [(0, a.jsx)("span", {
          className: "icon",
          "aria-hidden": "true",
          children: (0, a.jsx)("i", {
            className: "ti ti-shield-check"
          })
        }), (0, a.jsx)("strong", {
          children: ".gitignore 规则过滤中"
        })]
      }), (0, a.jsx)("div", {
        className: "rules-tags",
        children: s.rules.map(e => (0, a.jsx)("code", {
          children: e
        }, e))
      })]
    }), (0, a.jsx)("div", {
      className: "course-git-ignore-grid",
      children: s.files.map(e => (0, a.jsxs)("div", {
        className: "course-git-file-card is-".concat(e.status),
        children: [(0, a.jsxs)("div", {
          className: "file-header",
          children: [(0, a.jsx)("span", {
            className: "file-icon",
            "aria-hidden": "true",
            children: "tracked" === e.status ? (0, a.jsx)("i", {
              className: "ti ti-file-check"
            }) : (0, a.jsx)("i", {
              className: "ti ti-file-off"
            })
          }), (0, a.jsx)("strong", {
            className: "file-path",
            children: e.path
          }), (0, a.jsx)("span", {
            className: "file-badge is-".concat(e.status),
            children: e.badge
          })]
        }), (0, a.jsx)("p", {
          className: "file-reason",
          children: e.reason
        })]
      }, e.path))
    })]
  });
}
function X(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsxs)("div", {
    className: "course-git-branch-graph",
    children: [(0, a.jsxs)("div", {
      className: "course-git-branch-lanes",
      children: [(0, a.jsxs)("div", {
        className: "lane-row is-main",
        children: [(0, a.jsxs)("div", {
          className: "lane-label",
          children: [(0, a.jsx)("span", {
            className: "branch-tag is-main",
            children: s.mainBranch.name
          }), s.mainBranch.isHead ? (0, a.jsx)("span", {
            className: "head-tag",
            children: "HEAD ➔"
          }) : null]
        }), (0, a.jsxs)("div", {
          className: "lane-track",
          children: [(0, a.jsxs)("div", {
            className: "commit-point is-base",
            children: [(0, a.jsx)("span", {
              className: "dot"
            }), (0, a.jsx)("code", {
              className: "hash",
              children: s.baseCommit.hash
            }), (0, a.jsx)("small", {
              className: "msg",
              children: s.baseCommit.msg
            })]
          }), (0, a.jsx)("span", {
            className: "track-connector"
          }), s.mainBranch.commits.map(e => (0, a.jsxs)("div", {
            className: "commit-point",
            children: [(0, a.jsx)("span", {
              className: "dot is-main"
            }), (0, a.jsx)("code", {
              className: "hash",
              children: e.hash
            }), (0, a.jsx)("small", {
              className: "msg",
              children: e.msg
            })]
          }, e.hash))]
        })]
      }), (0, a.jsxs)("div", {
        className: "lane-fork-line",
        children: [(0, a.jsx)("span", {
          className: "fork-curve"
        }), (0, a.jsxs)("span", {
          className: "fork-note",
          children: ["从 ", s.baseCommit.hash, " 分叉"]
        })]
      }), (0, a.jsxs)("div", {
        className: "lane-row is-feature",
        children: [(0, a.jsxs)("div", {
          className: "lane-label",
          children: [(0, a.jsx)("span", {
            className: "branch-tag is-feature",
            children: s.featureBranch.name
          }), s.featureBranch.isHead ? (0, a.jsx)("span", {
            className: "head-tag is-active",
            children: "HEAD ➔"
          }) : null]
        }), (0, a.jsx)("div", {
          className: "lane-track has-offset",
          children: s.featureBranch.commits.map(e => (0, a.jsxs)("div", {
            className: "commit-point is-feature",
            children: [(0, a.jsx)("span", {
              className: "dot is-feature"
            }), (0, a.jsx)("code", {
              className: "hash",
              children: e.hash
            }), (0, a.jsx)("small", {
              className: "msg",
              children: e.msg
            })]
          }, e.hash))
        })]
      })]
    }), (0, a.jsxs)("div", {
      className: "course-git-head-explainer",
      children: [(0, a.jsx)("strong", {
        children: "当前指针位置："
      }), (0, a.jsx)("span", {
        children: s.headDesc
      })]
    })]
  });
}
function G(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsx)("div", {
    className: "course-git-merge-diagram",
    children: (0, a.jsxs)("div", {
      className: "merge-compare-grid",
      children: [(0, a.jsxs)("div", {
        className: "merge-side is-ff",
        children: [(0, a.jsxs)("div", {
          className: "side-header",
          children: [(0, a.jsx)("span", {
            className: "merge-kind-tag is-ff",
            children: "快进合并 (Fast-forward)"
          }), (0, a.jsx)("strong", {
            children: s.fastForward.title
          })]
        }), (0, a.jsxs)("div", {
          className: "merge-visual-lane",
          children: [(0, a.jsx)("div", {
            className: "ff-flow",
            children: s.fastForward.commits.map((e, r) => (0, a.jsxs)("div", {
              className: "ff-node",
              children: [(0, a.jsx)("span", {
                className: "ff-circle",
                children: e
              }), r < s.fastForward.commits.length - 1 ? (0, a.jsx)("span", {
                className: "ff-line",
                children: "→"
              }) : null]
            }, e))
          }), (0, a.jsx)("div", {
            className: "ff-pointer-action",
            children: (0, a.jsx)("span", {
              className: "pointer-pill",
              children: s.fastForward.branchPointerMove
            })
          })]
        }), (0, a.jsx)("p", {
          className: "side-desc",
          children: s.fastForward.summary
        }), (0, a.jsxs)("div", {
          className: "side-note",
          children: [(0, a.jsx)("span", {
            className: "icon",
            "aria-hidden": "true",
            children: (0, a.jsx)("i", {
              className: "ti ti-check"
            })
          }), (0, a.jsx)("small", {
            children: s.fastForward.actionNote
          })]
        })]
      }), (0, a.jsxs)("div", {
        className: "merge-side is-threeway",
        children: [(0, a.jsxs)("div", {
          className: "side-header",
          children: [(0, a.jsx)("span", {
            className: "merge-kind-tag is-threeway",
            children: "三方合并 (Three-way Merge)"
          }), (0, a.jsx)("strong", {
            children: s.threeWay.title
          })]
        }), (0, a.jsxs)("div", {
          className: "merge-visual-tree",
          children: [(0, a.jsxs)("div", {
            className: "tree-top",
            children: [(0, a.jsxs)("span", {
              className: "tree-node is-base",
              children: ["祖先: ", s.threeWay.ancestor]
            }), (0, a.jsx)("span", {
              className: "tree-split",
              children: "⤹ ⤷"
            })]
          }), (0, a.jsxs)("div", {
            className: "tree-branches",
            children: [(0, a.jsx)("span", {
              className: "tree-node is-main",
              children: s.threeWay.mainTip
            }), (0, a.jsx)("span", {
              className: "tree-node is-feature",
              children: s.threeWay.featureTip
            })]
          }), (0, a.jsx)("div", {
            className: "tree-merge-arrow",
            children: "↓ 汇合"
          }), (0, a.jsxs)("div", {
            className: "tree-merge-commit",
            children: [(0, a.jsx)("i", {
              className: "ti ti-git-commit merge-star",
              "aria-hidden": "true"
            }), (0, a.jsx)("strong", {
              children: s.threeWay.mergeCommit
            })]
          })]
        }), (0, a.jsx)("p", {
          className: "side-desc",
          children: s.threeWay.summary
        }), (0, a.jsxs)("div", {
          className: "side-note",
          children: [(0, a.jsx)("span", {
            className: "icon",
            "aria-hidden": "true",
            children: (0, a.jsx)("i", {
              className: "ti ti-info-circle"
            })
          }), (0, a.jsx)("small", {
            children: s.threeWay.actionNote
          })]
        })]
      })]
    })
  });
}
function U(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsxs)("div", {
    className: "course-git-conflict-viewer",
    children: [(0, a.jsxs)("div", {
      className: "conflict-file-bar",
      children: [(0, a.jsx)("span", {
        className: "file-icon",
        "aria-hidden": "true",
        children: (0, a.jsx)("i", {
          className: "ti ti-file-diff"
        })
      }), (0, a.jsx)("strong", {
        children: s.filename
      }), (0, a.jsxs)("span", {
        className: "conflict-badge",
        children: [(0, a.jsx)("i", {
          className: "ti ti-alert-triangle",
          "aria-hidden": "true"
        }), " 产生代码冲突"]
      })]
    }), (0, a.jsxs)("div", {
      className: "conflict-code-box",
      children: [(0, a.jsxs)("div", {
        className: "conflict-marker is-head",
        children: [(0, a.jsxs)("code", {
          children: ["<<<<<<< HEAD", "（", s.currentChange.branch, "）"]
        }), (0, a.jsx)("small", {
          children: s.currentChange.note
        })]
      }), (0, a.jsx)("pre", {
        className: "code-block is-ours",
        children: (0, a.jsx)("code", {
          children: s.currentChange.code
        })
      }), (0, a.jsx)("div", {
        className: "conflict-marker is-sep",
        children: (0, a.jsx)("code", {
          children: "======="
        })
      }), (0, a.jsx)("pre", {
        className: "code-block is-theirs",
        children: (0, a.jsx)("code", {
          children: s.incomingChange.code
        })
      }), (0, a.jsxs)("div", {
        className: "conflict-marker is-incoming",
        children: [(0, a.jsxs)("code", {
          children: [">>>>>>>", " ", s.incomingChange.branch]
        }), (0, a.jsx)("small", {
          children: s.incomingChange.note
        })]
      })]
    }), (0, a.jsxs)("div", {
      className: "conflict-resolution-box",
      children: [(0, a.jsxs)("div", {
        className: "res-header",
        children: [(0, a.jsx)("span", {
          className: "res-icon",
          "aria-hidden": "true",
          children: (0, a.jsx)("i", {
            className: "ti ti-circle-check"
          })
        }), (0, a.jsx)("strong", {
          children: "清理标记后的最终裁决结果："
        })]
      }), (0, a.jsx)("pre", {
        className: "res-code",
        children: (0, a.jsx)("code", {
          children: s.resolvedResult.code
        })
      }), (0, a.jsx)("p", {
        className: "res-note",
        children: s.resolvedResult.note
      })]
    })]
  });
}
function J(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsxs)("div", {
    className: "course-git-remote-sync",
    children: [(0, a.jsxs)("div", {
      className: "sync-topology-grid",
      children: [(0, a.jsxs)("div", {
        className: "topology-box is-local",
        children: [(0, a.jsxs)("div", {
          className: "box-header",
          children: [(0, a.jsx)("div", {
            className: "box-icon",
            "aria-hidden": "true",
            children: (0, a.jsx)("i", {
              className: "ti ti-device-laptop"
            })
          }), (0, a.jsxs)("div", {
            className: "box-title-wrap",
            children: [(0, a.jsxs)("div", {
              className: "box-title-row",
              children: [(0, a.jsx)("strong", {
                children: s.local.label
              }), (0, a.jsx)("span", {
                className: "box-badge",
                children: "本地仓库"
              })]
            }), (0, a.jsxs)("small", {
              children: ["分支: ", (0, a.jsx)("code", {
                children: s.local.branch
              })]
            })]
          })]
        }), (0, a.jsx)("div", {
          className: "commits-stack",
          children: s.local.commits.map(e => {
            let s = e.includes("待推送");
            return (0, a.jsxs)("div", {
              className: "commit-chip".concat(s ? " is-pending" : ""),
              children: [(0, a.jsx)("i", {
                className: "ti ti-git-commit commit-icon",
                "aria-hidden": "true"
              }), (0, a.jsx)("code", {
                children: e
              }), s ? (0, a.jsx)("span", {
                className: "unpushed-badge",
                children: "未推送"
              }) : null]
            }, e);
          })
        })]
      }), (0, a.jsxs)("div", {
        className: "topology-sync-actions",
        children: [(0, a.jsxs)("div", {
          className: "sync-action is-push",
          children: [(0, a.jsx)("span", {
            children: "git push"
          }), (0, a.jsxs)("strong", {
            children: ["上传提交 ", (0, a.jsx)("i", {
              className: "ti ti-arrow-narrow-right",
              "aria-hidden": "true"
            })]
          })]
        }), (0, a.jsxs)("div", {
          className: "sync-action is-pull",
          children: [(0, a.jsxs)("strong", {
            children: [(0, a.jsx)("i", {
              className: "ti ti-arrow-narrow-left",
              "aria-hidden": "true"
            }), " 获取后按策略整合"]
          }), (0, a.jsx)("span", {
            children: "git pull"
          })]
        })]
      }), (0, a.jsxs)("div", {
        className: "topology-box is-remote",
        children: [(0, a.jsxs)("div", {
          className: "box-header",
          children: [(0, a.jsx)("div", {
            className: "box-icon",
            "aria-hidden": "true",
            children: (0, a.jsx)("i", {
              className: "ti ti-cloud"
            })
          }), (0, a.jsxs)("div", {
            className: "box-title-wrap",
            children: [(0, a.jsxs)("div", {
              className: "box-title-row",
              children: [(0, a.jsx)("strong", {
                children: s.remote.label
              }), (0, a.jsx)("span", {
                className: "box-badge",
                children: "远程上游"
              })]
            }), (0, a.jsxs)("small", {
              children: ["远程分支: ", (0, a.jsx)("code", {
                children: s.remote.branch
              })]
            })]
          })]
        }), (0, a.jsx)("div", {
          className: "commits-stack",
          children: s.remote.commits.map(e => (0, a.jsxs)("div", {
            className: "commit-chip",
            children: [(0, a.jsx)("i", {
              className: "ti ti-git-commit commit-icon",
              "aria-hidden": "true"
            }), (0, a.jsx)("code", {
              children: e
            })]
          }, e))
        })]
      })]
    }), (0, a.jsxs)("div", {
      className: "sync-pr-card",
      children: [(0, a.jsxs)("div", {
        className: "pr-header",
        children: [(0, a.jsx)("i", {
          className: "ti ti-git-pull-request pr-icon",
          "aria-hidden": "true"
        }), (0, a.jsx)("span", {
          className: "pr-badge",
          children: "● Open"
        }), (0, a.jsx)("strong", {
          children: s.pullRequest.title
        }), (0, a.jsxs)("code", {
          className: "pr-id",
          children: ["#", s.pullRequest.id]
        })]
      }), (0, a.jsx)("div", {
        className: "pr-meta",
        children: (0, a.jsxs)("span", {
          children: ["请求将 ", (0, a.jsx)("code", {
            children: s.pullRequest.sourceBranch
          }), " 合并入", " ", (0, a.jsx)("code", {
            children: s.pullRequest.targetBranch
          })]
        })
      }), (0, a.jsxs)("div", {
        className: "pr-checks",
        children: [(0, a.jsxs)("span", {
          className: "check-item is-pass",
          children: [(0, a.jsx)("i", {
            className: "ti ti-check",
            "aria-hidden": "true"
          }), " ", s.pullRequest.checksStatus]
        }), (0, a.jsxs)("span", {
          className: "check-item is-pass",
          children: [(0, a.jsx)("i", {
            className: "ti ti-check",
            "aria-hidden": "true"
          }), " ", s.pullRequest.reviewStatus]
        })]
      })]
    })]
  });
}
function V(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsxs)("div", {
    className: "course-git-undo-diagram",
    children: [(0, a.jsx)("div", {
      className: "undo-methods-grid",
      children: s.methods.map(e => (0, a.jsxs)("div", {
        className: "undo-method-card is-".concat(e.safeTone),
        children: [(0, a.jsxs)("div", {
          className: "method-header",
          children: [(0, a.jsx)("code", {
            children: e.command
          }), (0, a.jsx)("span", {
            className: "method-badge is-".concat(e.safeTone),
            children: "safe" === e.safeTone ? "历史安全" : "caution" === e.safeTone ? "本地丢弃" : "临时暂存"
          })]
        }), (0, a.jsxs)("div", {
          className: "method-body",
          children: [(0, a.jsxs)("div", {
            className: "method-row",
            children: [(0, a.jsx)("small", {
              children: "作用范围"
            }), (0, a.jsx)("span", {
              children: e.scope
            })]
          }), (0, a.jsxs)("div", {
            className: "method-row",
            children: [(0, a.jsx)("small", {
              children: "底层机制"
            }), (0, a.jsx)("span", {
              children: e.mechanism
            })]
          }), (0, a.jsxs)("div", {
            className: "method-row",
            children: [(0, a.jsx)("small", {
              children: "历史影响"
            }), (0, a.jsx)("strong", {
              children: e.historyImpact
            })]
          })]
        })]
      }, e.command))
    }), s.stashDetail ? (0, a.jsxs)("div", {
      className: "undo-stash-drawer",
      children: [(0, a.jsxs)("div", {
        className: "stash-header",
        children: [(0, a.jsx)("span", {
          className: "stash-icon",
          "aria-hidden": "true",
          children: (0, a.jsx)("i", {
            className: "ti ti-archive"
          })
        }), (0, a.jsx)("strong", {
          children: s.stashDetail.label
        })]
      }), (0, a.jsx)("p", {
        children: s.stashDetail.desc
      }), (0, a.jsxs)("div", {
        className: "stash-action",
        children: [(0, a.jsx)("small", {
          children: "取回代码命令："
        }), (0, a.jsx)("code", {
          children: s.stashDetail.popCmd
        })]
      })]
    }) : null]
  });
}
function Y(e) {
  let {
    visual: s
  } = e;
  return (0, a.jsxs)("figure", {
    className: "course-inline-visual",
    "data-visual-kind": s.kind,
    children: [(0, a.jsxs)("figcaption", {
      children: [(0, a.jsx)("strong", {
        children: s.title
      }), (0, a.jsx)("span", {
        children: s.caption
      })]
    }), "flow" === s.kind ? (0, a.jsx)(T, {
      visual: s
    }) : null, "compare" === s.kind ? (0, a.jsx)(I, {
      visual: s
    }) : null, "before-after" === s.kind ? (0, a.jsx)(B, {
      visual: s
    }) : null, "site-preview" === s.kind ? (0, a.jsx)(R, {
      visual: s
    }) : null, "text-scale" === s.kind ? (0, a.jsx)(O, {
      visual: s
    }) : null, "control-states" === s.kind ? (0, a.jsx)(A, {
      visual: s
    }) : null, "ui-panels" === s.kind ? (0, a.jsx)(F, {
      visual: s
    }) : null, "form-states" === s.kind ? (0, a.jsx)(D, {
      visual: s
    }) : null, "device-drawer" === s.kind ? (0, a.jsx)(L, {
      visual: s
    }) : null, "material-flow" === s.kind ? (0, a.jsx)(M, {
      visual: s
    }) : null, "token-board" === s.kind ? (0, a.jsx)(_, {
      visual: s
    }) : null, "chat-flow" === s.kind ? (0, a.jsx)(K, {
      visual: s
    }) : null, "checklist" === s.kind ? (0, a.jsx)(W, {
      visual: s
    }) : null, "git-four-areas" === s.kind ? (0, a.jsx)(q, {
      visual: s
    }) : null, "git-commit-graph" === s.kind ? (0, a.jsx)(H, {
      visual: s
    }) : null, "git-diff-viewer" === s.kind ? (0, a.jsx)(z, {
      visual: s
    }) : null, "git-ignore-board" === s.kind ? (0, a.jsx)(Q, {
      visual: s
    }) : null, "git-branch-graph" === s.kind ? (0, a.jsx)(X, {
      visual: s
    }) : null, "git-merge-diagram" === s.kind ? (0, a.jsx)(G, {
      visual: s
    }) : null, "git-conflict-viewer" === s.kind ? (0, a.jsx)(U, {
      visual: s
    }) : null, "git-remote-sync" === s.kind ? (0, a.jsx)(J, {
      visual: s
    }) : null, "git-undo-diagram" === s.kind ? (0, a.jsx)(V, {
      visual: s
    }) : null]
  });
}
function $(e) {
  let {
    fill: s
  } = e;
  return (0, a.jsxs)("div", {
    className: "course-map-site",
    "data-fill": s,
    "aria-hidden": "true",
    children: [(0, a.jsxs)("div", {
      className: "course-map-site-chrome",
      children: [(0, a.jsx)("i", {}), (0, a.jsx)("i", {}), (0, a.jsx)("i", {})]
    }), (0, a.jsxs)("div", {
      className: "course-map-site-body",
      children: [(0, a.jsx)("div", {
        className: "course-map-hero",
        children: 0 === s ? (0, a.jsx)("em", {
          children: "用户"
        }) : (0, a.jsxs)(a.Fragment, {
          children: [(0, a.jsx)("b", {}), (0, a.jsx)("span", {})]
        })
      }), (0, a.jsxs)("div", {
        className: "course-map-rows",
        children: [(0, a.jsx)("i", {}), (0, a.jsx)("i", {}), (0, a.jsx)("i", {})]
      }), s >= 2 ? (0, a.jsxs)("div", {
        className: "course-map-form",
        children: [(0, a.jsx)("i", {}), (0, a.jsx)("span", {})]
      }) : (0, a.jsx)("div", {
        className: "course-map-form is-empty"
      })]
    })]
  });
}
function Z(e) {
  let {
    index: s
  } = e;
  return 0 === s ? (0, a.jsxs)("div", {
    className: "course-map-git is-flow",
    "aria-hidden": "true",
    children: [(0, a.jsxs)("div", {
      className: "course-map-git-nodes",
      children: [(0, a.jsxs)("div", {
        className: "course-map-git-step",
        children: [(0, a.jsx)("span", {
          className: "step-icon",
          children: (0, a.jsx)("i", {
            className: "ti ti-file-text"
          })
        }), (0, a.jsx)("span", {
          className: "step-label",
          children: "工作区"
        })]
      }), (0, a.jsx)("span", {
        className: "step-arrow",
        children: "➔"
      }), (0, a.jsxs)("div", {
        className: "course-map-git-step",
        children: [(0, a.jsx)("span", {
          className: "step-icon",
          children: (0, a.jsx)("i", {
            className: "ti ti-clipboard-list"
          })
        }), (0, a.jsx)("span", {
          className: "step-label",
          children: "暂存区"
        })]
      }), (0, a.jsx)("span", {
        className: "step-arrow",
        children: "➔"
      }), (0, a.jsxs)("div", {
        className: "course-map-git-step is-accent",
        children: [(0, a.jsx)("span", {
          className: "step-icon",
          children: (0, a.jsx)("i", {
            className: "ti ti-device-floppy"
          })
        }), (0, a.jsx)("span", {
          className: "step-label",
          children: "快照"
        })]
      })]
    }), (0, a.jsxs)("span", {
      className: "course-map-git-caption",
      children: [(0, a.jsx)("i", {
        className: "ti ti-shield-lock"
      }), " .gitignore 过滤密钥与缓存"]
    })]
  }) : 1 === s ? (0, a.jsxs)("div", {
    className: "course-map-git is-branch",
    "aria-hidden": "true",
    children: [(0, a.jsxs)("svg", {
      viewBox: "0 0 190 56",
      className: "course-map-git-svg",
      children: [(0, a.jsx)("line", {
        x1: "14",
        y1: "18",
        x2: "176",
        y2: "18",
        stroke: "var(--border)",
        strokeWidth: "2"
      }), (0, a.jsx)("circle", {
        cx: "26",
        cy: "18",
        r: "5",
        fill: "var(--bg)",
        stroke: "var(--brand)",
        strokeWidth: "2"
      }), (0, a.jsx)("text", {
        x: "26",
        y: "32",
        textAnchor: "middle",
        fontSize: "10",
        fontWeight: "700",
        fill: "var(--text-3)",
        children: "C1"
      }), (0, a.jsx)("circle", {
        cx: "80",
        cy: "18",
        r: "5",
        fill: "var(--bg)",
        stroke: "var(--brand)",
        strokeWidth: "2"
      }), (0, a.jsx)("text", {
        x: "80",
        y: "32",
        textAnchor: "middle",
        fontSize: "10",
        fontWeight: "700",
        fill: "var(--text-3)",
        children: "C2"
      }), (0, a.jsx)("circle", {
        cx: "150",
        cy: "18",
        r: "6",
        fill: "var(--brand-light)",
        stroke: "var(--brand)",
        strokeWidth: "2"
      }), (0, a.jsx)("text", {
        x: "150",
        y: "32",
        textAnchor: "middle",
        fontSize: "10",
        fontWeight: "700",
        fill: "var(--brand)",
        children: "M"
      }), (0, a.jsx)("text", {
        x: "170",
        y: "14",
        textAnchor: "start",
        fontSize: "9",
        fontWeight: "700",
        fill: "var(--text-3)",
        children: "main"
      }), (0, a.jsx)("path", {
        d: "M 26 18 Q 46 42 72 42 L 118 42 Q 140 42 150 18",
        fill: "none",
        stroke: "var(--brand)",
        strokeWidth: "1.75",
        strokeDasharray: "3 2"
      }), (0, a.jsx)("circle", {
        cx: "95",
        cy: "42",
        r: "5",
        fill: "var(--bg)",
        stroke: "var(--brand)",
        strokeWidth: "2"
      }), (0, a.jsx)("text", {
        x: "95",
        y: "54",
        textAnchor: "middle",
        fontSize: "9",
        fontWeight: "700",
        fill: "var(--brand)",
        children: "feature"
      }), (0, a.jsx)("rect", {
        x: "66",
        y: "2",
        width: "28",
        height: "11",
        rx: "3",
        fill: "var(--brand)"
      }), (0, a.jsx)("text", {
        x: "80",
        y: "10",
        textAnchor: "middle",
        fontSize: "8",
        fontWeight: "700",
        fill: "var(--on-brand)",
        children: "HEAD"
      })]
    }), (0, a.jsxs)("span", {
      className: "course-map-git-caption",
      children: [(0, a.jsx)("i", {
        className: "ti ti-git-branch"
      }), " 独立分支隔离 \xb7 裁决冲突"]
    })]
  }) : (0, a.jsxs)("div", {
    className: "course-map-git is-remote",
    "aria-hidden": "true",
    children: [(0, a.jsxs)("div", {
      className: "course-map-git-sync",
      children: [(0, a.jsxs)("div", {
        className: "sync-endpoint",
        children: [(0, a.jsx)("span", {
          className: "endpoint-icon",
          children: (0, a.jsx)("i", {
            className: "ti ti-device-laptop"
          })
        }), (0, a.jsx)("span", {
          className: "endpoint-name",
          children: "本地"
        })]
      }), (0, a.jsxs)("div", {
        className: "sync-arrows",
        children: [(0, a.jsx)("span", {
          className: "sync-dir",
          children: "push ➔"
        }), (0, a.jsx)("span", {
          className: "sync-pr",
          children: "PR 评审"
        }), (0, a.jsx)("span", {
          className: "sync-dir",
          children: "⬅ pull"
        })]
      }), (0, a.jsxs)("div", {
        className: "sync-endpoint",
        children: [(0, a.jsx)("span", {
          className: "endpoint-icon",
          children: (0, a.jsx)("i", {
            className: "ti ti-cloud"
          })
        }), (0, a.jsx)("span", {
          className: "endpoint-name",
          children: "云端"
        })]
      })]
    }), (0, a.jsxs)("span", {
      className: "course-map-git-caption",
      children: [(0, a.jsx)("i", {
        className: "ti ti-arrow-back-up"
      }), " restore 放弃 \xb7 revert 回滚"]
    })]
  });
}
function ee(e) {
  let {
      map: s
    } = e,
    r = s.stages.length,
    t = "git-workflow" === s.trackType;
  return (0, a.jsxs)("figure", {
    className: "course-learning-map",
    "aria-label": s.title,
    "data-stages": r,
    style: {
      "--stage-count": r
    },
    children: [(0, a.jsxs)("figcaption", {
      children: [(0, a.jsx)("strong", {
        children: s.title
      }), (0, a.jsx)("span", {
        children: s.caption
      })]
    }), (0, a.jsx)("ol", {
      children: s.stages.map((e, s) => (0, a.jsxs)("li", {
        children: [t ? (0, a.jsx)(Z, {
          index: s
        }) : (0, a.jsx)($, {
          fill: Math.min(s, 3)
        }), (0, a.jsx)("strong", {
          children: e.name
        }), (0, a.jsx)("small", {
          children: e.range
        })]
      }, e.name))
    })]
  });
}
let er = EmbeddedCourseTerm;
function ea(e) {
  let {
      closeButtonRef: s,
      isMobile: n,
      locale: i,
      onClose: l,
      onContentReady: c,
      onOpenFullTerm: d,
      scrollRef: u,
      termId: h
    } = e,
    [m, p] = (0, t.useState)(null),
    x = (null == m ? void 0 : m.id) === h && m.locale === i ? m.name : h;
  return (0, t.useEffect)(() => {
    let e = !0;
    return import("../courses/term-adapter").then(s => {
      var r;
      let {
          getClientEntry: a
        } = s,
        t = a(h);
      e && p({
        id: h,
        locale: i,
        name: null != (r = "en" === i ? null == t ? void 0 : t.name : null == t ? void 0 : t.cn) ? r : h
      });
    }).catch(() => {}), () => {
      e = !1;
    };
  }, [h, i]), (0, a.jsxs)(a.Fragment, {
    children: [n ? (0, a.jsx)("button", {
      className: "course-term-backdrop",
      type: "button",
      tabIndex: -1,
      "aria-label": "关闭术语详情",
      onClick: l
    }) : null, (0, a.jsxs)("aside", {
      className: "course-term-panel".concat(n ? " is-sheet" : ""),
      "aria-label": "".concat(x || h, "术语详情"),
      "aria-modal": n || void 0,
      role: n ? "dialog" : "complementary",
      children: [(0, a.jsxs)("div", {
        className: "course-term-toolbar",
        children: [(0, a.jsx)("div", {
          children: (0, a.jsx)("strong", {
            children: x || h
          })
        }), (0, a.jsxs)("div", {
          className: "course-term-actions",
          children: [(0, a.jsx)("a", {
            href: (0, o.s3)(h, i),
            onClick: d,
            children: "完整术语页 ↗"
          }), (0, a.jsx)("button", {
            ref: s,
            type: "button",
            onClick: l,
            "aria-label": "关闭术语详情",
            children: (0, a.jsx)("i", {
              className: "ti ti-x",
              "aria-hidden": "true"
            })
          })]
        })]
      }), (0, a.jsx)("div", {
        className: "course-term-scroll",
        ref: u,
        children: (0, a.jsx)(er, {
          className: "course-embedded-term",
          locale: i,
          onReady: c,
          termId: h
        }, h)
      })]
    })]
  });
}
function et(e) {
  return !Number.isFinite(e) || e < 752 ? {
    min: .5,
    max: .5
  } : {
    min: 420 / e,
    max: (e - 12 - 320) / e
  };
}
function en(e, s) {
  let r = et(e);
  return Number.isFinite(s) ? Math.min(r.max, Math.max(r.min, s)) : .5;
}
let ei = "vibehub:course-reader-main-share";
function el(e) {
  try {
    window.localStorage.setItem(ei, String(e));
  } catch (e) {}
}
function ec() {
  let e = new URL(window.location.href).searchParams.get("term");
  return e && (0, w.X)(e) ? e : null;
}
function eo(e, s) {
  let r = new URL(window.location.href);
  e ? r.searchParams.set("term", e) : r.searchParams.delete("term");
  let a = "".concat(r.pathname).concat(r.search).concat(r.hash),
    t = window.history.state && "object" == typeof window.history.state ? window.history.state : {},
    n = {
      ...t,
      courseTermEntry: !!e && ("push" === s || "courseTermEntry" in t && !0 === t.courseTermEntry)
    };
  "push" === s ? window.history.pushState(n, "", a) : window.history.replaceState(n, "", a);
}
function ed(e, s) {
  return e.split(/(`[^`\n]+`)/gu).map((e, r) => e.startsWith("`") && e.endsWith("`") ? (0, a.jsx)("code", {
    className: "course-inline-code",
    children: e.slice(1, -1)
  }, "".concat(s, "-code-").concat(r)) : (0, a.jsx)(t.Fragment, {
    children: e
  }, "".concat(s, "-text-").concat(r)));
}
function eu(e, s, r, n) {
  return e.map((e, i) => "string" == typeof e ? (0, a.jsx)(t.Fragment, {
    children: ed(e, String(i))
  }, i) : "strong" === e.type ? (0, a.jsx)("strong", {
    children: ed(e.text, String(i))
  }, "strong-".concat(i)) : "link" === e.type ? (0, a.jsx)("a", {
    className: "course-external-link",
    href: e.href,
    children: e.label
  }, "link-".concat(i)) : (0, a.jsxs)("button", {
    className: "course-term-ref",
    type: "button",
    "aria-expanded": s === e.termId,
    "aria-controls": "course-term-panel",
    "data-term-id": e.termId,
    ref: s => {
      s ? n.set(e.termId, s) : n.delete(e.termId);
    },
    onClick: s => r(e.termId, s.currentTarget),
    children: [e.label, (0, a.jsx)("span", {
      "aria-hidden": "true",
      children: "↗"
    })]
  }, "".concat(e.termId, "-").concat(i)));
}
function eh(e) {
  let {
      sections: s,
      activeSectionId: r,
      onOpenSection: n,
      visibilityKey: i,
      label: l
    } = e,
    c = (0, t.useRef)(new Map()),
    [o, d] = (0, t.useState)(null);
  return (0, t.useLayoutEffect)(() => {
    let e = r ? c.current.get(r) : void 0;
    if (!e || 0 === e.offsetHeight) return void d(null);
    d({
      left: e.offsetLeft,
      width: e.offsetWidth,
      offset: e.offsetTop,
      height: e.offsetHeight
    });
  }, [r, s, i]), (0, a.jsxs)("nav", {
    "aria-label": l,
    children: [o ? (0, a.jsx)("span", {
      "aria-hidden": "true",
      className: "course-nav-indicator",
      style: {
        left: "".concat(o.left, "px"),
        width: "".concat(o.width, "px"),
        height: "".concat(o.height, "px"),
        transform: "translateY(".concat(o.offset, "px)")
      }
    }) : null, s.map(e => (0, a.jsx)("a", {
      className: r === e.id ? "is-active" : "",
      href: "#".concat(e.id),
      onClick: s => n(s, e.id),
      ref: s => {
        s ? c.current.set(e.id, s) : c.current.delete(e.id);
      },
      children: e.title
    }, e.id))]
  });
}
function em(e) {
  var s, r, n;
  let {
      chapter: l,
      chapters: c,
      courseId: d,
      initialTermId: u,
      locale: h,
      onMobileTermSheetChange: p,
      onOpenChapter: x,
      onOpenHome: f,
      onOpenTermPage: v,
      stages: g,
      unitLabel: b
    } = e,
    {
      hydrated: y,
      persisted: progressPersisted,
      progress: T,
      updateChapter: C,
      updateView: S
    } = j(d),
    I = N(d),
    E = u && (0, w.X)(u) ? u : null,
    [B, P] = (0, t.useState)(E),
    [R, O] = (0, t.useState)(!1),
    [A, F] = (0, t.useState)(null != (r = null == (s = l.sections[0]) ? void 0 : s.id) ? r : null),
    [D, L] = (0, t.useState)(!1),
    [M, _] = (0, t.useState)(.5),
    [K, W] = (0, t.useState)(0),
    [q, H] = (0, t.useState)(!1),
    z = (0, t.useRef)(null),
    Q = (0, t.useRef)(.5),
    X = (0, t.useRef)(!1),
    G = (0, t.useRef)(null),
    U = (0, t.useRef)(null),
    J = (0, t.useRef)(null),
    V = (0, t.useRef)(new Map()),
    $ = (0, t.useRef)(null),
    Z = (0, t.useRef)(null),
    es = (0, t.useRef)(null),
    er = (0, t.useRef)(null),
    ed = (0, t.useRef)(!1),
    em = (0, t.useRef)(!1),
    ep = (0, t.useRef)(null),
    ex = null != (n = T.chapters[l.id]) ? n : m(),
    ej = T.views[l.id],
    ef = (0, t.useRef)(ej),
    ev = c.findIndex(e => e.id === l.id),
    eg = ev > 0 ? c[ev - 1] : void 0,
    eN = ev >= 0 ? c[ev + 1] : void 0,
    eb = "章" === b ? "章节目录" : "课程目录",
    ey = "章" === b ? "本章目录" : "本课目录",
    ew = et(K),
    ek = en(K, M),
    eT = (0, t.useCallback)(e => {
      ef.current = S(l.id, e);
    }, [l.id, S]),
    eC = e => {
      e && (ep.current = {
        element: e,
        top: e.getBoundingClientRect().top
      });
    };
  (0, t.useEffect)(() => {
    y && "not-started" === ex.status && C(l.id, {
      status: "in-progress"
    });
  }, [l.id, ex.status, y, C]), (0, t.useEffect)(() => {
    y && !em.current && (ef.current = ej, em.current = !0);
  }, [y, ej]), (0, t.useEffect)(() => {
    let e = window.matchMedia("(max-width: 959px)"),
      s = () => O(e.matches);
    return s(), e.addEventListener("change", s), () => e.removeEventListener("change", s);
  }, []), (0, t.useEffect)(() => {
    P(ec());
  }, []), (0, t.useLayoutEffect)(() => {
    let e = z.current;
    if (!e) return;
    let s = () => W(e.getBoundingClientRect().width);
    s();
    let r = new ResizeObserver(s);
    return r.observe(e), () => r.disconnect();
  }, []), (0, t.useEffect)(() => {
    let e = function () {
      try {
        let e = window.localStorage.getItem(ei);
        if (null === e) return null;
        let s = Number(e);
        return Number.isFinite(s) ? s : null;
      } catch (e) {
        return null;
      }
    }();
    null !== e && (Q.current = e, _(e));
  }, []), (0, t.useEffect)(() => {
    var e;
    y && !ed.current && G.current && (G.current.scrollTop = null != (e = null == ej ? void 0 : ej.articleScrollTop) ? e : 0, ed.current = !0);
  }, [y, null == ej ? void 0 : ej.articleScrollTop]), (0, t.useEffect)(() => {
    let e = () => {
      var e, s, r;
      let a = ec();
      !a && B && eC(null != (s = null != (e = $.current) ? e : V.current.get(B)) ? s : null), !a && B && ($.current = null != (r = V.current.get(B)) ? r : null), P(a), a || window.requestAnimationFrame(() => {
        var e;
        return null == (e = $.current) ? void 0 : e.focus();
      });
    };
    return window.addEventListener("popstate", e), () => window.removeEventListener("popstate", e);
  }, [B]), (0, t.useEffect)(() => {
    if (!B) return;
    eT({
      selectedTermId: B
    });
    let e = window.requestAnimationFrame(() => {
      var e, s, r;
      if (U.current) {
        let e = null != (r = null == (s = ef.current) ? void 0 : s.termScrollTopById[B]) ? r : 0;
        U.current.scrollTop = e, er.current = {
          termId: B,
          scrollTop: e
        };
      }
      null == (e = J.current) || e.focus();
    });
    return () => window.cancelAnimationFrame(e);
  }, [eT, B]), (0, t.useEffect)(() => {
    let e = ep.current;
    if (!e) return;
    let s = window.requestAnimationFrame(() => {
      G.current && e.element.isConnected && (G.current.scrollTop += e.element.getBoundingClientRect().top - e.top, ep.current = null);
    });
    return () => window.cancelAnimationFrame(s);
  }, [B]), (0, t.useEffect)(() => {
    if (!R || !B) return;
    let e = document.body.style.overflow;
    return document.body.style.overflow = "hidden", () => {
      document.body.style.overflow = e;
    };
  }, [R, B]), (0, t.useEffect)(() => (null == p || p(R && !!B), () => null == p ? void 0 : p(!1)), [R, p, B]), (0, t.useEffect)(() => {
    if (!B) return;
    let e = e => {
      if ("Escape" === e.key) return void eE();
      if (!R || "Tab" !== e.key) return;
      let s = document.getElementById("course-term-panel"),
        r = s ? [...s.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(e => e.getClientRects().length > 0) : [],
        a = r[0],
        t = r[r.length - 1];
      a && t && ((null == s ? void 0 : s.contains(document.activeElement)) ? e.shiftKey && document.activeElement === a ? (e.preventDefault(), t.focus()) : e.shiftKey || document.activeElement !== t || (e.preventDefault(), a.focus()) : (e.preventDefault(), (e.shiftKey ? t : a).focus()));
    };
    return window.addEventListener("keydown", e), () => window.removeEventListener("keydown", e);
  }), (0, t.useEffect)(() => {
    let e = G.current;
    return () => {
      var s, r, a;
      Z.current && window.clearTimeout(Z.current), es.current && window.clearTimeout(es.current);
      let t = {
          ...(null != (r = null == (s = ef.current) ? void 0 : s.termScrollTopById) ? r : {})
        },
        n = er.current;
      n && (t[n.termId] = n.scrollTop), eT({
        articleScrollTop: null != (a = null == e ? void 0 : e.scrollTop) ? a : 0,
        termScrollTopById: t
      });
    };
  }, [eT]);
  let eS = () => {
      var e, s;
      B && U.current && (er.current = {
        termId: B,
        scrollTop: U.current.scrollTop
      }, eT({
        termScrollTopById: {
          ...(null != (s = null == (e = ef.current) ? void 0 : e.termScrollTopById) ? s : {}),
          [B]: U.current.scrollTop
        }
      }));
    },
    eI = (e, s) => {
      if (B === e) return;
      es.current && window.clearTimeout(es.current), eS(), $.current = s;
      let r = null === B;
      r && eC(s), P(e), eo(e, r ? "push" : "replace");
    };
  function eE() {
    var e, s, r;
    if (!B) return;
    es.current && window.clearTimeout(es.current), eS(), eC(null != (s = null != (e = $.current) ? e : V.current.get(B)) ? s : null), null != $.current || ($.current = null != (r = V.current.get(B)) ? r : null);
    let a = window.history.state;
    if (null == a ? void 0 : a.courseTermEntry) return void window.history.back();
    eo(null, "replace"), P(null), window.requestAnimationFrame(() => {
      var e;
      return null == (e = $.current) ? void 0 : e.focus();
    });
  }
  let eB = (0, t.useCallback)(e => {
      var s, r;
      if (!U.current) return;
      let a = null != (r = null == (s = ef.current) ? void 0 : s.termScrollTopById[e]) ? r : 0;
      U.current.scrollTop = a, er.current = {
        termId: e,
        scrollTop: a
      };
    }, []),
    eP = e => {
      !f || e.metaKey || e.ctrlKey || e.shiftKey || (e.preventDefault(), f());
    },
    eR = (e, s) => {
      !x || e.metaKey || e.ctrlKey || e.shiftKey || (e.preventDefault(), x(s));
    },
    eO = (e, s) => {
      var r;
      e.preventDefault();
      let a = G.current,
        t = document.getElementById(s);
      a && t && (a.scrollTo({
        top: a.scrollTop + t.getBoundingClientRect().top - a.getBoundingClientRect().top - 24,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
      }), null == (r = e.currentTarget.closest("details")) || r.removeAttribute("open"), F(s));
    },
    eA = e => {
      var s, r;
      let a = z.current;
      if (!a) return;
      let t = a.getBoundingClientRect(),
        n = (s = t.left, r = t.width, !Number.isFinite(r) || r <= 0 ? .5 : en(r, (e - s) / r));
      Q.current = n, _(n);
    },
    eF = e => {
      X.current && (X.current = !1, H(!1), e.currentTarget.hasPointerCapture(e.pointerId) && e.currentTarget.releasePointerCapture(e.pointerId), el(Q.current));
    };
  return (0, a.jsx)("div", {
    className: "course-app course-reader-app",
    children: (0, a.jsxs)("div", {
      className: "course-workspace".concat(B ? " has-term" : "").concat(q ? " is-resizing" : ""),
      ref: z,
      style: {
        "--course-reader-main-share": "".concat(100 * ek, "%")
      },
      children: [(0, a.jsxs)("div", {
        className: "course-reader-pane",
        children: [(0, a.jsx)("article", {
          className: "course-article".concat(R && B ? " is-locked" : ""),
          inert: R && !!B || void 0,
          ref: G,
          onScroll: () => {
            var e, s;
            Z.current && window.clearTimeout(Z.current);
            let r = null != (s = null == (e = G.current) ? void 0 : e.scrollTop) ? s : 0,
              a = G.current;
            (() => {
              var e, s;
              let r = G.current;
              if (!r) return;
              let a = r.getBoundingClientRect().top,
                t = null != (s = null == (e = l.sections[0]) ? void 0 : e.id) ? s : null;
              for (let e of l.sections) {
                let s = document.getElementById(e.id);
                s && s.getBoundingClientRect().top - a <= 128 && (t = e.id);
              }
              F(e => e === t ? e : t);
            })(), Z.current = window.setTimeout(() => {
              eT({
                articleScrollTop: r
              });
            }, 400);
          },
          children: (0, a.jsxs)("div", {
            className: "course-article-layout",
            children: [(0, a.jsxs)("div", {
              className: "course-article-side",
              children: [(0, a.jsx)("a", {
                className: "detail-back-button course-reader-back",
                href: (0, o.BB)(d, h),
                "aria-label": "返回".concat(eb),
                title: "返回".concat(eb),
                onClick: eP,
                children: (0, a.jsx)("svg", {
                  className: "ui-icon",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  "aria-hidden": "true",
                  children: (0, a.jsx)("path", {
                    d: "M19 12H5m6-6-6 6 6 6"
                  })
                })
              }), (0, a.jsxs)("aside", {
                className: "course-section-rail",
                "aria-label": ey,
                children: [(0, a.jsx)("strong", {
                  children: ey
                }), (0, a.jsx)(eh, {
                  activeSectionId: A,
                  label: ey,
                  onOpenSection: eO,
                  sections: l.sections,
                  visibilityKey: null != B ? B : "no-term"
                })]
              })]
            }), (0, a.jsxs)("div", {
              className: "course-article-inner",
              children: [(0, a.jsxs)("header", {
                className: "course-chapter-hero",
                children: [(0, a.jsx)(CourseReaderContext, {order: l.order, total: c.length}), (0, a.jsx)("h1", {
                  children: l.title
                }), (0, a.jsx)("p", {
                  className: "course-chapter-intro",
                  children: l.intro
                })]
              }), l.sections.map(e => (0, a.jsxs)("section", {
                className: "summary" === e.variant ? "course-lesson-section course-section-summary" : "course-lesson-section",
                id: e.id,
                children: [(0, a.jsx)("h2", {
                  children: e.title
                }), e.content.map((s, r) => {
                  var n, i, o;
                  return "paragraph" === s.kind ? (0, a.jsx)("p", {
                    children: eu(s.content, B, eI, V.current)
                  }, "".concat(e.id, "-paragraph-").concat(r)) : "list" === s.kind ? (0, a.jsx)("ul", {
                    children: s.items.map((e, s) => (0, a.jsx)("li", {
                      children: eu(e, B, eI, V.current)
                    }, s))
                  }, "".concat(e.id, "-list-").concat(r)) : (0, a.jsx)(t.Fragment, {
                    children: (n = s.block, i = l.order, o = c.length, "visual" === n.kind ? (0, a.jsx)(Y, {
                      visual: n.visual
                    }) : "learning-map" === n.kind ? (0, a.jsx)(ee, {
                      map: n.map
                    }) : (0, a.jsx)(k, {
                      progress: n.progress,
                      chapterOrder: i,
                      chapterCount: o,
                      stages: g,
                      unitLabel: b
                    }))
                  }, "".concat(e.id, "-block-").concat(r));
                })]
              }, e.id)), (0, a.jsx)(CourseLearningActions, {course: d, chapter: l.id, complete: ex.readCompleted, persisted: progressPersisted, onComplete: () => C(l.id, {readCompleted: !0})}), (0, a.jsxs)("nav", {
                className: "course-bottom-nav",
                "aria-label": "上一".concat(b, "和下一").concat(b),
                children: [eg ? (0, a.jsxs)("a", {
                  href: (0, o.Qi)(d, eg.id, h),
                  onPointerEnter: () => I.prepare(eg.id),
                  onPointerLeave: I.cancel,
                  onFocus: () => I.prepare(eg.id),
                  onBlur: I.cancel,
                  onPointerDown: () => (0, i.prefetchCourseChapter)(d, eg.id),
                  onClick: e => eR(e, eg.id),
                  children: [(0, a.jsxs)("span", {
                    children: ["上一", b]
                  }), (0, a.jsx)("strong", {
                    children: eg.shortTitle
                  })]
                }) : null, eN ? (0, a.jsxs)("a", {
                  className: "is-next",
                  href: (0, o.Qi)(d, eN.id, h),
                  onPointerEnter: () => I.prepare(eN.id),
                  onPointerLeave: I.cancel,
                  onFocus: () => I.prepare(eN.id),
                  onBlur: I.cancel,
                  onPointerDown: () => (0, i.prefetchCourseChapter)(d, eN.id),
                  onClick: e => eR(e, eN.id),
                  children: [(0, a.jsxs)("span", {
                    children: ["下一", b]
                  }), (0, a.jsx)("strong", {
                    children: eN.shortTitle
                  })]
                }) : (0, a.jsxs)("a", {
                  className: "is-next",
                  href: (0, o.BB)(d, h),
                  onClick: eP,
                  children: [(0, a.jsx)("span", {
                    children: "已经到最后"
                  }), (0, a.jsx)("strong", {
                    children: "查看全部进度"
                  })]
                })]
              })]
            })]
          })
        }), (0, a.jsxs)("details", {
          className: "course-mobile-section-sheet",
          onToggle: e => L(e.currentTarget.open),
          children: [(0, a.jsx)("summary", {
            children: ey
          }), (0, a.jsx)(eh, {
            activeSectionId: A,
            label: ey,
            onOpenSection: eO,
            sections: l.sections,
            visibilityKey: String(D)
          })]
        })]
      }), B ? (0, a.jsx)("div", {
        "aria-controls": "course-term-panel",
        "aria-label": "调整正文和术语面板宽度",
        "aria-orientation": "vertical",
        "aria-valuemax": Math.round(100 * ew.max),
        "aria-valuemin": Math.round(100 * ew.min),
        "aria-valuenow": Math.round(100 * ek),
        "aria-valuetext": "正文宽度 ".concat(Math.round(100 * ek), "%"),
        className: "course-pane-splitter",
        onKeyDown: e => {
          let s;
          if (R) return;
          let r = e.shiftKey ? .05 : .02;
          if ("ArrowLeft" === e.key) s = ek - r;else if ("ArrowRight" === e.key) s = ek + r;else if ("Home" === e.key) s = ew.min;else {
            if ("End" !== e.key) return;
            s = ew.max;
          }
          e.preventDefault();
          let a = en(K, s);
          Q.current = a, _(a), el(a);
        },
        onPointerCancel: eF,
        onPointerDown: e => {
          !R && e.isPrimary && 0 === e.button && (e.preventDefault(), X.current = !0, H(!0), e.currentTarget.setPointerCapture(e.pointerId), eA(e.clientX));
        },
        onPointerMove: e => {
          X.current && eA(e.clientX);
        },
        onPointerUp: eF,
        role: "separator",
        tabIndex: 0,
        title: "拖动调整左右宽度；方向键可微调"
      }) : null, B ? (0, a.jsx)("div", {
        id: "course-term-panel",
        onScrollCapture: () => {
          var e, s;
          if (!B || !U.current) return;
          es.current && window.clearTimeout(es.current);
          let r = U.current.scrollTop;
          er.current = {
            termId: B,
            scrollTop: r
          };
          let a = null != (s = null == (e = ef.current) ? void 0 : e.termScrollTopById) ? s : {};
          es.current = window.setTimeout(() => {
            eT({
              termScrollTopById: {
                ...a,
                [B]: r
              }
            });
          }, 400);
        },
        children: (0, a.jsx)(ea, {
          closeButtonRef: J,
          isMobile: R,
          locale: h,
          onClose: eE,
          onContentReady: eB,
          onOpenFullTerm: e => {
            var s, r, a, t, n, i;
            Z.current && window.clearTimeout(Z.current), es.current && window.clearTimeout(es.current), eT({
              articleScrollTop: null != (t = null == (s = G.current) ? void 0 : s.scrollTop) ? t : 0,
              termScrollTopById: {
                ...(null != (n = null == (r = ef.current) ? void 0 : r.termScrollTopById) ? n : {}),
                [B]: null != (i = null == (a = U.current) ? void 0 : a.scrollTop) ? i : 0
              }
            }), !v || e.metaKey || e.ctrlKey || e.shiftKey || 0 !== e.button || (e.preventDefault(), v(B));
          },
          scrollRef: U,
          termId: B
        })
      }) : null]
    })
  });
}
function ep(e) {
  var s, r, l, c;
  let {
      initialChapter: o = null,
      courseId: d,
      chapterId: u,
      initialTermId: h,
      locale: m,
      onChapterResolved: p,
      onMobileTermSheetChange: x,
      onOpenChapter: j,
      onOpenHome: f,
      onOpenRoute: g,
      onOpenRoutes: N,
      onOpenTermPage: b
    } = e,
    [w, k] = (0, t.useState)(null),
    [T, C] = (0, t.useState)(0),
    [S, I] = (0, t.useState)(null),
    E = d && u ? null != (r = null != (s = (null == o ? void 0 : o.id) === u ? o : null) ? s : i.courseChapters.get(d, u)) ? r : (null == S ? void 0 : S.courseId) === d && S.chapterId === u ? S.chapter : null : null;
  if ((0, t.useEffect)(() => {
    let e = !0;
    if (!d || !u) return void p(null);
    if (E) {
      i.courseChapters.seed(d, E), p(E);
      return;
    }
    return p(null), k(null), i.courseChapters.load(d, u).then(s => {
      e && I({
        courseId: d,
        chapterId: u,
        chapter: s
      });
    }).catch(() => {
      e && k("".concat(d, ":").concat(u));
    }), () => {
      e = !1;
    };
  }, [E, u, d, p, T]), !d) return (0, a.jsx)(v, {
    locale: m,
    onOpenRoute: g,
    routes: n.Nn
  });
  let B = (0, n.FB)(d);
  if (!u) return (0, a.jsx)(y, {
    course: {
      ...B.meta,
      chapters: B.chapters
    },
    courseId: d,
    locale: m,
    onOpenChapter: e => j(d, e),
    onOpenRoutes: N
  });
  if (!E) {
    let e = B.chapters.find(e => e.id === u),
      s = w === "".concat(d, ":").concat(u);
    return (0, a.jsx)("div", {
      className: "course-app course-reader-app",
      children: (0, a.jsxs)("div", {
        className: "course-chapter-pending",
        "aria-busy": !s,
        children: [(0, a.jsxs)("header", {
          className: "course-chapter-hero",
          children: [(0, a.jsx)("h1", {
            children: null != (l = null == e ? void 0 : e.title) ? l : "课程章节"
          }), (0, a.jsx)("p", {
            className: "course-chapter-intro",
            children: null == e ? void 0 : e.intro
          })]
        }), s ? (0, a.jsxs)("div", {
          role: "alert",
          children: [(0, a.jsx)("p", {
            children: "课程暂时没有加载成功，请重试。"
          }), (0, a.jsx)("button", {
            className: "btn btn-primary",
            type: "button",
            onClick: () => {
              k(null), C(e => e + 1);
            },
            children: "重新加载"
          })]
        }) : (0, a.jsx)("p", {
          role: "status",
          children: "正在载入正文…"
        })]
      })
    });
  }
  return (0, a.jsx)(em, {
    chapter: E,
    chapters: B.chapters,
    courseId: d,
    initialTermId: h,
    locale: m,
    onMobileTermSheetChange: x,
    onOpenChapter: e => j(d, e),
    onOpenHome: () => f(d),
    onOpenTermPage: b,
    stages: null != (c = B.stages) ? c : [],
    unitLabel: B.meta.unitLabel
  }, "".concat(d, ":").concat(E.id));
}
export { ep as CoursePage };
