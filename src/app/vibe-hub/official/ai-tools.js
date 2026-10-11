// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import * as i from "react/jsx-runtime";
import * as s from "react";
import * as r from "./visual-language.js";
import * as l from "./visual-shell.js";
let a = (e, o) => e[o];
let t = [{
  id: "ask",
  icon: "ti-hand-stop",
  label: {
    zh: "请求批准",
    en: "Ask for approval"
  },
  description: {
    zh: "Codex 可以读取和编辑当前工作区的文件，并运行常规本地命令。访问互联网或超出工作区边界前，它会先询问。",
    en: "Codex can read and edit files in the current workspace and run routine local commands. It asks before using the internet or going beyond the workspace boundary."
  },
  status: [{
    label: {
      zh: "沙箱",
      en: "Sandbox"
    },
    value: {
      zh: "workspace-write",
      en: "workspace-write"
    }
  }, {
    label: {
      zh: "审批策略",
      en: "Approvals policy"
    },
    value: {
      zh: "on-request",
      en: "on-request"
    }
  }, {
    label: {
      zh: "审查者",
      en: "Reviewer"
    },
    value: {
      zh: "用户",
      en: "user"
    }
  }]
}, {
  id: "approve",
  icon: "ti-shield-check",
  label: {
    zh: "代为批准",
    en: "Approve for me"
  },
  description: {
    zh: "代为批准会沿用“请求批准”的 workspace-write 沙箱，但符合条件的审批请求会交给自动审查，而不是显示给用户手动批准。",
    en: "Approve for me keeps the same workspace-write sandbox as Ask for approval, but eligible approval requests are routed through automatic review instead of showing a prompt for manual approval."
  },
  status: [{
    label: {
      zh: "沙箱",
      en: "Sandbox"
    },
    value: {
      zh: "workspace-write",
      en: "workspace-write"
    }
  }, {
    label: {
      zh: "审批策略",
      en: "Approvals policy"
    },
    value: {
      zh: "on-request",
      en: "on-request"
    }
  }, {
    label: {
      zh: "审查者",
      en: "Reviewer"
    },
    value: {
      zh: "自动审查",
      en: "auto_review"
    }
  }]
}, {
  id: "full",
  icon: "ti-alert-circle",
  label: {
    zh: "完全访问",
    en: "Full access"
  },
  description: {
    zh: "Codex 可以编辑工作区之外的文件并访问互联网，无需请求批准。只有在你希望 Codex 获得完整机器访问权限时才使用此设置。",
    en: "Codex can edit files outside the workspace and use the internet without asking for approval. Use this only when you want Codex to operate with full machine access."
  },
  status: [{
    label: {
      zh: "沙箱",
      en: "Sandbox"
    },
    value: {
      zh: "danger-full-access",
      en: "danger-full-access"
    }
  }, {
    label: {
      zh: "审批策略",
      en: "Approvals policy"
    },
    value: {
      zh: "never",
      en: "never"
    }
  }, {
    label: {
      zh: "审查者",
      en: "Reviewer"
    },
    value: {
      zh: "不适用",
      en: "Not Applicable"
    }
  }]
}, {
  id: "custom",
  icon: "ti-settings-2",
  label: {
    zh: "自定义（config.toml）",
    en: "Custom (config.toml)"
  },
  description: {
    zh: "Codex 使用本地配置中的权限配置和沙箱设置。你可以在这里定义比内置预设更窄或更宽的默认范围。",
    en: "Codex uses the permissions profile and sandbox settings from your local configuration. This is where you define narrower or broader defaults than the built-in presets."
  },
  status: [{
    label: {
      zh: "沙箱",
      en: "Sandbox"
    },
    value: {
      zh: "在配置中设置",
      en: "Configured in profile"
    }
  }, {
    label: {
      zh: "审批策略",
      en: "Approvals policy"
    },
    value: {
      zh: "在配置中设置",
      en: "Configured in profile"
    }
  }, {
    label: {
      zh: "审查者",
      en: "Reviewer"
    },
    value: {
      zh: "在配置中设置",
      en: "Configured in profile"
    }
  }],
  commonSettings: {
    zh: "常见自定义设置包括 default_permissions、sandbox_mode、approval_policy 和命名的 [permissions.<name>] 配置。",
    en: "Common custom settings include default_permissions, sandbox_mode, approval_policy, and named [permissions.<name>] profiles."
  }
}];
let d = [{
  id: "openai",
  provider: {
    zh: "OpenAI",
    en: "OpenAI"
  },
  model: {
    zh: "GPT",
    en: "GPT"
  },
  docTitle: {
    zh: "OpenAI API 文档",
    en: "OpenAI API docs"
  },
  docUrl: "https://platform.openai.com/docs/api-reference/introduction"
}, {
  id: "google",
  provider: {
    zh: "Google",
    en: "Google"
  },
  model: {
    zh: "Gemini",
    en: "Gemini"
  },
  docTitle: {
    zh: "Gemini API 文档",
    en: "Gemini API docs"
  },
  docUrl: "https://ai.google.dev/gemini-api/docs/openai"
}, {
  id: "anthropic",
  provider: {
    zh: "Anthropic",
    en: "Anthropic"
  },
  model: {
    zh: "Claude",
    en: "Claude"
  },
  docTitle: {
    zh: "Anthropic API 文档",
    en: "Anthropic API docs"
  },
  docUrl: "https://docs.anthropic.com/en/api/getting-started"
}, {
  id: "deepseek",
  provider: {
    zh: "DeepSeek",
    en: "DeepSeek"
  },
  model: {
    zh: "DeepSeek",
    en: "DeepSeek"
  },
  docTitle: {
    zh: "DeepSeek API 文档",
    en: "DeepSeek API docs"
  },
  docUrl: "https://api-docs.deepseek.com/"
}, {
  id: "qwen",
  provider: {
    zh: "阿里云百炼",
    en: "Alibaba Cloud Model Studio"
  },
  model: {
    zh: "Qwen",
    en: "Qwen"
  },
  docTitle: {
    zh: "通义千问兼容接口",
    en: "Qwen compatibility docs"
  },
  docUrl: "https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope"
}, {
  id: "glm",
  provider: {
    zh: "智谱 AI",
    en: "Zhipu AI"
  },
  model: {
    zh: "GLM",
    en: "GLM"
  },
  docTitle: {
    zh: "智谱开放平台 API",
    en: "Zhipu AI API docs"
  },
  docUrl: "https://open.bigmodel.cn/dev/api"
}, {
  id: "minimax",
  provider: {
    zh: "MiniMax",
    en: "MiniMax"
  },
  model: {
    zh: "MiniMax",
    en: "MiniMax"
  },
  docTitle: {
    zh: "MiniMax API 文档",
    en: "MiniMax API docs"
  },
  docUrl: "https://platform.minimaxi.com/docs/api-reference/api-overview"
}, {
  id: "openrouter",
  provider: {
    zh: "OpenRouter",
    en: "OpenRouter"
  },
  model: {
    zh: "多个模型",
    en: "Multiple models"
  },
  docTitle: {
    zh: "OpenRouter API 概览",
    en: "OpenRouter API overview"
  },
  docUrl: "https://openrouter.ai/docs/api-reference/overview"
}];
let c = [{
  id: "person",
  label: {
    zh: "个人",
    en: "You"
  },
  detail: {
    zh: "通过 AI 工具发起调用",
    en: "Starts the call through an AI tool"
  }
}, {
  id: "relay",
  label: {
    zh: "中转站",
    en: "Proxy relay"
  },
  detail: {
    zh: "接收并转发请求和结果",
    en: "Forwards requests and results"
  },
  tone: "warning"
}, {
  id: "provider",
  label: {
    zh: "模型提供商",
    en: "Provider"
  },
  detail: {
    zh: "运行模型并生成结果",
    en: "Runs the model and generates the result"
  }
}];
let h = [{
  id: "codex",
  name: {
    zh: "Codex",
    en: "Codex"
  },
  supportsEditing: !0,
  locations: [{
    zh: "~/.codex/config.toml",
    en: "~/.codex/config.toml"
  }, {
    zh: "项目级：<项目目录>/.codex/config.toml",
    en: "Project: <project directory>/.codex/config.toml"
  }],
  doc: {
    url: "https://developers.openai.com/codex/config-reference/",
    label: {
      zh: "官方文档",
      en: "Official docs"
    },
    logo: {
      src: "/vibe-hub/source/assets/ai-tools/codex.png",
      alt: {
        zh: "Codex 官方 Logo",
        en: "Codex official logo"
      }
    }
  }
}, {
  id: "claude-code",
  name: {
    zh: "Claude Code",
    en: "Claude Code"
  },
  supportsEditing: !0,
  locations: [{
    zh: "~/.claude/settings.json",
    en: "~/.claude/settings.json"
  }, {
    zh: "项目级：<项目目录>/.claude/settings.json",
    en: "Project: <project directory>/.claude/settings.json"
  }],
  doc: {
    url: "https://code.claude.com/docs/en/settings",
    label: {
      zh: "官方文档",
      en: "Official docs"
    },
    logo: {
      src: "/vibe-hub/source/assets/ai-tools/claude-code.ico",
      alt: {
        zh: "Claude Code 官方 Logo",
        en: "Claude Code official logo"
      }
    }
  }
}, {
  id: "gemini-cli",
  name: {
    zh: "Gemini CLI",
    en: "Gemini CLI"
  },
  supportsEditing: !0,
  locations: [{
    zh: "%USERPROFILE%\\.gemini\\settings.json",
    en: "%USERPROFILE%\\.gemini\\settings.json"
  }, {
    zh: "项目级：<项目目录>\\.gemini\\settings.json",
    en: "Project: <project directory>\\.gemini\\settings.json"
  }],
  doc: {
    url: "https://geminicli.com/docs/reference/configuration/",
    label: {
      zh: "官方文档",
      en: "Official docs"
    },
    logo: {
      src: "/vibe-hub/source/assets/ai-tools/gemini-cli.ico",
      alt: {
        zh: "Gemini CLI 官方 Logo",
        en: "Gemini CLI official logo"
      }
    }
  }
}, {
  id: "qoder",
  name: {
    zh: "Qoder",
    en: "Qoder"
  },
  supportsEditing: !1,
  productConfiguration: {
    zh: "可通过工具内的模型配置入口 /model 配置。",
    en: "Configure models from the in-tool /model entry."
  },
  doc: {
    url: "https://docs.qoder.com/cli/custom-models.md",
    label: {
      zh: "官方文档",
      en: "Official docs"
    },
    logo: {
      src: "/vibe-hub/source/assets/ai-tools/qoder.svg",
      alt: {
        zh: "Qoder 官方 Logo",
        en: "Qoder official logo"
      }
    }
  }
}, {
  id: "trae",
  name: {
    zh: "Trae",
    en: "Trae"
  },
  supportsEditing: !1,
  productConfiguration: {
    zh: "可通过产品内“设置 → 模型”配置。",
    en: "Configure models in the product under “Settings → Models”."
  },
  doc: {
    url: "https://docs.trae.ai/ide/models?_lang=en",
    label: {
      zh: "官方文档",
      en: "Official docs"
    },
    logo: {
      src: "/vibe-hub/source/assets/ai-tools/trae.png",
      alt: {
        zh: "Trae 官方 Logo",
        en: "Trae official logo"
      }
    }
  }
}, {
  id: "workbuddy",
  name: {
    zh: "WorkBuddy",
    en: "WorkBuddy"
  },
  supportsEditing: !1,
  productConfiguration: {
    zh: "可通过产品内“设置 → 模型”配置。",
    en: "Configure models in the product under “Settings → Models”."
  },
  doc: {
    url: "https://www.workbuddy.ai/docs/zh/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Model",
    label: {
      zh: "官方文档",
      en: "Official docs"
    },
    logo: {
      src: "/vibe-hub/source/assets/ai-tools/workbuddy.svg",
      alt: {
        zh: "WorkBuddy 官方 Logo",
        en: "WorkBuddy official logo"
      }
    }
  }
}];
let p = {
  profile: {
    ariaLabel: {
      zh: "Profile 在不同配置组之间切换",
      en: "A Profile switching between configuration sets"
    },
    nodes: [{
      id: "selector",
      label: {
        zh: "Profile 选择",
        en: "Profile selector"
      },
      detail: {
        zh: "选择当前要使用的配置组",
        en: "Chooses which configuration set to use"
      },
      evidence: {
        kind: "tabs",
        lines: [{
          zh: "默认",
          en: "default"
        }, {
          zh: "工作",
          en: "work"
        }]
      }
    }, {
      id: "sets",
      label: {
        zh: "配置组 A / B",
        en: "Config set A / B"
      },
      detail: {
        zh: "各自保存一组服务和运行设置",
        en: "Each keeps its own service and runtime settings"
      },
      evidence: {
        kind: "file",
        lines: [{
          zh: "provider = ...",
          en: "provider = ..."
        }, {
          zh: "sandbox = ...",
          en: "sandbox = ..."
        }]
      },
      tone: "brand"
    }, {
      id: "run",
      label: {
        zh: "本次工具运行",
        en: "Current tool run"
      },
      detail: {
        zh: "按选中的配置工作",
        en: "Works with the selected configuration"
      },
      evidence: {
        kind: "status",
        lines: [{
          zh: "当前：工作",
          en: "Active: work"
        }, {
          zh: "使用已选设置",
          en: "Uses selected settings"
        }]
      }
    }],
    relations: [{
      from: "selector",
      to: "sets",
      label: {
        zh: "切换配置组",
        en: "selects a set"
      }
    }, {
      from: "sets",
      to: "run",
      label: {
        zh: "应用设置",
        en: "applies settings"
      }
    }],
    conclusion: {
      zh: "Profile 主要隔离配置，不等于新建一个会话；会话和配置是两个不同概念。",
      en: "A Profile isolates configuration; it does not create a new session. Sessions and configuration are different concepts."
    }
  },
  "project-rules": {
    ariaLabel: {
      zh: "项目仓库、规则文件和 Agent 行为的关系",
      en: "How a repository rule file influences agent behavior"
    },
    nodes: [{
      id: "repo",
      label: {
        zh: "项目仓库",
        en: "Project repository"
      },
      detail: {
        zh: "代码、目录和当前任务所在的位置",
        en: "Where the code, folders, and task live"
      },
      evidence: {
        kind: "tree",
        lines: [{
          zh: "project/",
          en: "project/"
        }, {
          zh: "src/",
          en: "src/"
        }, {
          zh: "AGENTS.md \xb7 CLAUDE.md",
          en: "AGENTS.md \xb7 CLAUDE.md"
        }]
      }
    }, {
      id: "rules",
      label: {
        zh: "AGENTS.md / CLAUDE.md",
        en: "AGENTS.md / CLAUDE.md"
      },
      detail: {
        zh: "说明当前范围内要遵守的规则",
        en: "States rules for the applicable scope"
      },
      evidence: {
        kind: "file",
        lines: [{
          zh: "AGENTS.md / CLAUDE.md",
          en: "AGENTS.md / CLAUDE.md"
        }, {
          zh: "作用域规则",
          en: "Scoped rules"
        }]
      },
      tone: "brand"
    }, {
      id: "behavior",
      label: {
        zh: "Agent 行为",
        en: "Agent behavior"
      },
      detail: {
        zh: "读文件、改代码和验证时遵守规则",
        en: "Follows the rules while reading, editing, and verifying"
      },
      evidence: {
        kind: "status",
        lines: [{
          zh: "读取",
          en: "Read"
        }, {
          zh: "按规则执行",
          en: "Follows rules"
        }]
      }
    }],
    relations: [{
      from: "repo",
      to: "rules",
      label: {
        zh: "按作用域读取",
        en: "reads by scope"
      }
    }, {
      from: "rules",
      to: "behavior",
      label: {
        zh: "影响执行",
        en: "shapes actions"
      }
    }],
    conclusion: {
      zh: "项目规则告诉 Agent 在当前目录怎样工作；它不是模型本身的永久记忆。",
      en: "Project rules tell an agent how to work in a directory; they are not permanent memory inside the model."
    }
  },
  hook: {
    ariaLabel: {
      zh: "生命周期事件触发 Hook 并得到命令结果",
      en: "A lifecycle event triggering a Hook and receiving a result"
    },
    nodes: [{
      id: "event",
      label: {
        zh: "生命周期事件",
        en: "Lifecycle event"
      },
      detail: {
        zh: "例如工具开始或完成一次动作",
        en: "For example, an action starts or finishes"
      },
      evidence: {
        kind: "timeline",
        lines: [{
          zh: "开始编辑",
          en: "Before edit"
        }, {
          zh: "命令完成",
          en: "After command"
        }]
      }
    }, {
      id: "hook",
      label: {
        zh: "Hook",
        en: "Hook"
      },
      detail: {
        zh: "在指定事件发生时被触发",
        en: "Runs when the configured event occurs"
      },
      evidence: {
        kind: "file",
        lines: [{
          zh: "Hook 配置",
          en: "Hook config"
        }, {
          zh: "command: npm test",
          en: "command: npm test"
        }]
      },
      tone: "brand"
    }, {
      id: "result",
      label: {
        zh: "命令或结果",
        en: "Command or result"
      },
      detail: {
        zh: "执行检查、记录或后续动作",
        en: "Runs a check, records data, or performs a follow-up"
      },
      evidence: {
        kind: "status",
        lines: [{
          zh: "检查通过",
          en: "Check passed"
        }, {
          zh: "记录结果",
          en: "Result recorded"
        }]
      }
    }],
    relations: [{
      from: "event",
      to: "hook",
      label: {
        zh: "触发",
        en: "triggers"
      }
    }, {
      from: "hook",
      to: "result",
      label: {
        zh: "执行动作",
        en: "runs action"
      }
    }],
    conclusion: {
      zh: "Hook 是事件触发的自动动作，不是用户每次手动输入的提示词。",
      en: "A Hook is an event-triggered action, not a prompt the user must type every time."
    }
  },
  plugin: {
    ariaLabel: {
      zh: "编辑器或工作区通过 Plugin 获得界面能力",
      en: "An editor or workspace gaining a tool surface through a Plugin"
    },
    nodes: [{
      id: "workspace",
      label: {
        zh: "编辑器 / 工作区",
        en: "Editor / workspace"
      },
      detail: {
        zh: "用户正在使用的开发环境",
        en: "The development environment the user is using"
      },
      evidence: {
        kind: "window",
        lines: [{
          zh: "编辑器",
          en: "Editor"
        }, {
          zh: "文件树",
          en: "File tree"
        }]
      }
    }, {
      id: "plugin",
      label: {
        zh: "Plugin",
        en: "Plugin"
      },
      detail: {
        zh: "把扩展能力接入宿主环境",
        en: "Connects an extension to the host environment"
      },
      evidence: {
        kind: "code",
        lines: [{
          zh: "Plugin",
          en: "Plugin"
        }, {
          zh: "扩展入口",
          en: "Extension entry"
        }]
      },
      tone: "brand"
    }, {
      id: "surface",
      label: {
        zh: "界面中的工具",
        en: "Tool surface"
      },
      detail: {
        zh: "菜单、面板或编辑器内能力",
        en: "A menu, panel, or in-editor capability"
      },
      evidence: {
        kind: "window",
        lines: [{
          zh: "菜单",
          en: "Menu"
        }, {
          zh: "侧边面板",
          en: "Side panel"
        }]
      }
    }],
    relations: [{
      from: "workspace",
      to: "plugin",
      label: {
        zh: "加载扩展",
        en: "loads extension"
      }
    }, {
      from: "plugin",
      to: "surface",
      label: {
        zh: "提供界面入口",
        en: "adds an interface"
      }
    }],
    conclusion: {
      zh: "Plugin 主要扩展宿主工具的能力和界面；它不等同于 MCP 的连接协议或 Skill 的做事方法。",
      en: "A Plugin mainly extends a host tool's capabilities and interface; it is not the MCP connection protocol or a Skill's method."
    }
  },
  sandbox: {
    ariaLabel: {
      zh: "Agent 进程受到文件和网络边界限制",
      en: "An agent process operating within file and network boundaries"
    },
    nodes: [{
      id: "process",
      label: {
        zh: "Agent 进程",
        en: "Agent process"
      },
      detail: {
        zh: "尝试读取文件或访问网络",
        en: "Tries to read files or access the network"
      },
      evidence: {
        kind: "terminal",
        lines: [{
          zh: "读取项目文件",
          en: "Read project files"
        }, {
          zh: "执行命令",
          en: "Run command"
        }]
      }
    }, {
      id: "boundary",
      label: {
        zh: "文件 / 网络边界",
        en: "File / network boundary"
      },
      detail: {
        zh: "规定哪些资源可以接触",
        en: "Defines which resources can be reached"
      },
      evidence: {
        kind: "boundary",
        lines: [{
          zh: "project/ 允许",
          en: "project/ allowed"
        }, {
          zh: "网络受限",
          en: "network limited"
        }]
      },
      tone: "warning"
    }, {
      id: "access",
      label: {
        zh: "允许 / 拒绝访问",
        en: "Access allowed / denied"
      },
      detail: {
        zh: "系统返回可观察的结果",
        en: "The system returns an observable result"
      },
      evidence: {
        kind: "status",
        lines: [{
          zh: "文件：允许",
          en: "File: allowed"
        }, {
          zh: "网络：拒绝",
          en: "Network: denied"
        }]
      }
    }],
    relations: [{
      from: "process",
      to: "boundary",
      label: {
        zh: "受到限制",
        en: "meets boundary"
      }
    }, {
      from: "boundary",
      to: "access",
      label: {
        zh: "放行或拦截",
        en: "allows or blocks"
      }
    }],
    conclusion: {
      zh: "Sandbox 是运行边界；它减少越界影响，但不能替代权限、审核和用户确认。",
      en: "A Sandbox is a runtime boundary; it reduces blast radius but does not replace permissions, review, or user approval."
    }
  }
};
let u = [{
  id: "chat",
  label: {
    zh: "普通对话",
    en: "Chat"
  },
  format: {
    zh: "messages / input",
    en: "messages / input"
  },
  detail: {
    zh: "把问题和上下文发给模型，再返回文字回答。",
    en: "Send the question and context, then receive a text answer."
  },
  note: {
    zh: "基础格式",
    en: "basic format"
  }
}, {
  id: "streaming",
  label: {
    zh: "流式返回",
    en: "Streaming"
  },
  format: {
    zh: "stream: true",
    en: "stream: true"
  },
  detail: {
    zh: "让回答边生成边返回，工具可以逐段显示。",
    en: "Return the answer as it is generated so the tool can show it in parts."
  },
  note: {
    zh: "需要接口和服务支持",
    en: "endpoint and service support required"
  }
}, {
  id: "tools",
  label: {
    zh: "工具调用",
    en: "Tool calls"
  },
  format: {
    zh: "tools",
    en: "tools"
  },
  detail: {
    zh: "把工具名称、参数和说明一起发给模型。",
    en: "Send the tool name, parameters, and description to the model."
  },
  note: {
    zh: "模型与服务都要支持",
    en: "model and service support required"
  }
}, {
  id: "vision",
  label: {
    zh: "图片输入",
    en: "Image input"
  },
  format: {
    zh: "image_url / input_image",
    en: "image_url / input_image"
  },
  detail: {
    zh: "把图片和文字一起发给支持图片的模型。",
    en: "Send an image with text to a model that supports images."
  },
  note: {
    zh: "需要视觉模型",
    en: "vision model required"
  }
}, {
  id: "structured",
  label: {
    zh: "结构化输出",
    en: "Structured output"
  },
  format: {
    zh: "response_format / text.format",
    en: "response_format / text.format"
  },
  detail: {
    zh: "要求结果遵守指定的 JSON 结构，方便工具继续处理。",
    en: "Ask the result to follow a JSON structure so the tool can process it."
  },
  note: {
    zh: "不同接口写法不同",
    en: "syntax varies by API"
  }
}, {
  id: "embeddings",
  label: {
    zh: "向量生成",
    en: "Embeddings"
  },
  format: {
    zh: "POST /v1/embeddings",
    en: "POST /v1/embeddings"
  },
  detail: {
    zh: "把文字转换成向量，供检索或相似度比较使用。",
    en: "Turn text into vectors for retrieval or similarity comparison."
  },
  note: {
    zh: "独立接口，通常使用专用模型",
    en: "separate endpoint, usually a dedicated model"
  }
}];
function m(e) {
  let {
    evidence: o,
    locale: n
  } = e;
  return (0, i.jsxs)("div", {
    className: "tool-flow-object ".concat(o.kind),
    "aria-hidden": "true",
    children: [(0, i.jsx)("span", {
      className: "tool-flow-object-mark"
    }), (0, i.jsx)("span", {
      className: "tool-flow-object-lines",
      children: o.lines.map((e, o) => (0, i.jsx)("span", {
        children: a(e, n)
      }, "evidence-line-".concat(o)))
    })]
  });
}
function x(e) {
  let {
      kind: o
    } = e,
    n = (0, s.useContext)(r.gq),
    t = p[o];
  return (0, i.jsxs)(l.xc, {
    label: a(t.ariaLabel, n),
    className: "tool-flow-visual",
    children: [(0, i.jsx)("div", {
      className: "tool-flow-track",
      role: "list",
      "aria-label": a(t.ariaLabel, n),
      children: t.nodes.map((e, o) => {
        var r;
        let l = t.relations[o];
        return (0, i.jsxs)(s.Fragment, {
          children: [(0, i.jsxs)("article", {
            className: "tool-flow-node ".concat(null != (r = e.tone) ? r : "neutral"),
            "data-node-id": e.id,
            role: "listitem",
            children: [(0, i.jsx)("strong", {
              children: a(e.label, n)
            }), (0, i.jsx)(m, {
              evidence: e.evidence,
              locale: n
            }), (0, i.jsx)("p", {
              children: a(e.detail, n)
            })]
          }), l && (0, i.jsxs)("div", {
            className: "tool-flow-relation",
            "data-from": l.from,
            "data-to": l.to,
            "aria-label": a(l.label, n),
            children: [(0, i.jsx)("span", {
              "aria-hidden": "true",
              children: "→"
            }), (0, i.jsx)("small", {
              children: a(l.label, n)
            })]
          })]
        }, e.id);
      })
    }), (0, i.jsx)("p", {
      className: "tool-flow-conclusion",
      children: a(t.conclusion, n)
    })]
  });
}
let f = e => {
  let o = () => (0, i.jsx)(x, {
    kind: e
  });
  return o.displayName = "".concat(e, "Visual"), o;
};
let b = {
  provider: function () {
    let e = "en" === (0, s.useContext)(r.gq),
      o = e ? "A config file sends a request to OpenRouter and receives a model result" : "配置文件把请求发给 OpenRouter 并收到模型结果";
    return (0, i.jsxs)(l.xc, {
      label: o,
      className: "provider-call-visual",
      children: [(0, i.jsxs)("div", {
        className: "provider-call-flow",
        role: "list",
        "aria-label": o,
        children: [(0, i.jsxs)("div", {
          className: "provider-call-step provider-call-config",
          role: "listitem",
          children: [(0, i.jsxs)("div", {
            className: "provider-call-step-heading",
            children: [(0, i.jsx)("span", {
              children: e ? "1 \xb7 Local config" : "1 \xb7 本地配置"
            }), (0, i.jsx)("strong", {
              children: "config.toml"
            })]
          }), (0, i.jsxs)(l.KE, {
            filename: "config.toml",
            children: [(0, i.jsx)(l.SH, {
              n: 1,
              children: 'provider = "openrouter"'
            }), (0, i.jsx)(l.SH, {
              n: 2,
              active: !0,
              children: 'model = "deepseek-v4-flash"'
            }), (0, i.jsx)(l.SH, {
              n: 3,
              children: 'base_url = "https://openrouter.ai/api/v1"'
            })]
          }), (0, i.jsx)("p", {
            children: e ? "The tool reads who to call and which model to use." : "工具先读取要通过谁调用，以及要使用哪个模型。"
          })]
        }), (0, i.jsxs)("div", {
          className: "provider-call-connector",
          "aria-hidden": "true",
          children: [(0, i.jsx)("span", {
            children: "→"
          }), (0, i.jsx)("small", {
            children: e ? "send" : "按配置发送"
          })]
        }), (0, i.jsxs)("div", {
          className: "provider-call-step provider-call-request",
          role: "listitem",
          children: [(0, i.jsxs)("div", {
            className: "provider-call-step-heading",
            children: [(0, i.jsx)("span", {
              children: e ? "2 \xb7 Actual request" : "2 \xb7 实际请求"
            }), (0, i.jsx)("strong", {
              children: "OpenRouter API"
            })]
          }), (0, i.jsxs)("div", {
            className: "provider-call-request-record",
            children: [(0, i.jsxs)("div", {
              className: "provider-call-request-line",
              children: [(0, i.jsx)("b", {
                children: "POST"
              }), (0, i.jsx)("code", {
                children: "/chat/completions"
              })]
            }), (0, i.jsx)("code", {
              children: "https://openrouter.ai/api/v1"
            }), (0, i.jsx)("code", {
              children: "model: deepseek-v4-flash"
            }), (0, i.jsx)("p", {
              children: e ? "The request reaches OpenRouter, not the model name." : "请求实际到达 OpenRouter；模型名只是这次调用的目标。"
            })]
          })]
        }), (0, i.jsxs)("div", {
          className: "provider-call-connector",
          "aria-hidden": "true",
          children: [(0, i.jsx)("span", {
            children: "→"
          }), (0, i.jsx)("small", {
            children: e ? "return" : "返回结果"
          })]
        }), (0, i.jsxs)("div", {
          className: "provider-call-step provider-call-result",
          role: "listitem",
          children: [(0, i.jsxs)("div", {
            className: "provider-call-step-heading",
            children: [(0, i.jsx)("span", {
              children: e ? "3 \xb7 Observable result" : "3 \xb7 可观察结果"
            }), (0, i.jsx)("strong", {
              children: "200 OK"
            })]
          }), (0, i.jsx)(l.BK, {
            children: e ? "$ OpenRouter\n  model: deepseek-v4-flash\n  answer: button code returned" : "$ OpenRouter\n  model: deepseek-v4-flash\n  answer: 返回按钮代码"
          }), (0, i.jsx)("p", {
            children: e ? "The Provider returns the model result to the tool." : "Provider 把模型生成的结果返回给工具。"
          })]
        })]
      }), (0, i.jsx)("p", {
        className: "provider-call-conclusion",
        children: e ? "Provider is the service platform in the request path; Model is the specific capability selected in that request." : "Provider 是请求链路中的服务平台；Model 是这次请求选中的具体模型。"
      })]
    });
  },
  "base-url": function () {
    let e = (0, s.useContext)(r.gq),
      o = "en" === e;
    return (0, i.jsxs)(l.xc, {
      label: o ? "Configuration docs for common providers" : "常见服务方配置文档",
      className: "base-url-reference-visual",
      children: [(0, i.jsx)("ul", {
        className: "base-url-reference-list",
        "aria-label": o ? "Base URL reference list" : "Base URL 参考地址列表",
        children: d.map(o => (0, i.jsx)("li", {
          className: "base-url-reference-row",
          children: (0, i.jsxs)("a", {
            className: "base-url-reference-card",
            href: o.docUrl,
            target: "_blank",
            rel: "noreferrer",
            children: [(0, i.jsxs)("div", {
              className: "base-url-reference-provider",
              children: [(0, i.jsx)("strong", {
                children: a(o.provider, e)
              }), (0, i.jsx)("span", {
                children: a(o.model, e)
              })]
            }), (0, i.jsxs)("span", {
              className: "base-url-reference-doc",
              children: [(0, i.jsx)("span", {
                children: a(o.docTitle, e)
              }), (0, i.jsx)("i", {
                className: "ti ti-arrow-up-right",
                "aria-hidden": "true"
              })]
            })]
          })
        }, o.id))
      }), (0, i.jsx)("p", {
        className: "base-url-reference-note",
        children: o ? "The same provider may offer more than one interface. Confirm which interface your tool supports before copying an address." : "同一个服务方可能提供不止一种接口；请先确认工具支持哪种接口，再从官方文档复制地址。"
      })]
    });
  },
  "api-proxy": function () {
    let e = (0, s.useContext)(r.gq),
      o = "en" === e,
      n = o ? "How you, a proxy relay, and a model provider exchange a request and result" : "个人、中转站和模型提供商如何交换请求与结果";
    return (0, i.jsxs)(l.xc, {
      label: n,
      className: "api-proxy-visual",
      children: [(0, i.jsxs)("div", {
        className: "proxy-network",
        role: "list",
        "aria-label": n,
        children: [c.map(o => {
          var n;
          return (0, i.jsxs)("article", {
            className: "proxy-network-node proxy-network-node-".concat(o.id, " ").concat(null != (n = o.tone) ? n : "neutral"),
            "data-node-id": o.id,
            role: "listitem",
            children: [(0, i.jsx)("strong", {
              children: a(o.label, e)
            }), (0, i.jsx)("p", {
              children: a(o.detail, e)
            })]
          }, o.id);
        }), (0, i.jsxs)("div", {
          className: "proxy-network-channel proxy-network-channel-person-relay",
          "aria-label": o ? "exchange between you and the proxy relay" : "个人和中转站之间的双向交换",
          children: [(0, i.jsxs)("div", {
            className: "proxy-network-transfer proxy-network-request proxy-network-request-person",
            "aria-label": o ? "you send the request to the proxy relay" : "个人把请求发给中转站",
            children: [(0, i.jsx)("span", {
              "aria-hidden": "true",
              children: "→"
            }), (0, i.jsx)("small", {
              children: o ? "send request" : "发送请求"
            })]
          }), (0, i.jsxs)("div", {
            className: "proxy-network-transfer proxy-network-response proxy-network-response-person",
            "aria-label": o ? "the proxy relay returns the result to you" : "中转站把结果返回给个人",
            children: [(0, i.jsx)("span", {
              "aria-hidden": "true",
              children: "←"
            }), (0, i.jsx)("small", {
              children: o ? "return to you" : "返回给个人"
            })]
          })]
        }), (0, i.jsxs)("div", {
          className: "proxy-network-channel proxy-network-channel-relay-provider",
          "aria-label": o ? "exchange between the proxy relay and the model provider" : "中转站和模型提供商之间的双向交换",
          children: [(0, i.jsxs)("div", {
            className: "proxy-network-transfer proxy-network-request proxy-network-request-provider",
            "aria-label": o ? "the proxy relay forwards the request to the model provider" : "中转站把请求转给模型提供商",
            children: [(0, i.jsx)("span", {
              "aria-hidden": "true",
              children: "→"
            }), (0, i.jsx)("small", {
              children: o ? "forward request" : "转发请求"
            })]
          }), (0, i.jsxs)("div", {
            className: "proxy-network-transfer proxy-network-response proxy-network-response-provider",
            "aria-label": o ? "the model provider returns the result to the proxy relay" : "模型提供商把结果返回给中转站",
            children: [(0, i.jsx)("span", {
              "aria-hidden": "true",
              children: "←"
            }), (0, i.jsx)("small", {
              children: o ? "return result" : "返回结果"
            })]
          })]
        })]
      }), (0, i.jsx)("p", {
        className: "proxy-network-conclusion",
        children: o ? "The request travels to the model provider through the relay, and the result comes back through the same relay." : "请求经过中转站到达模型提供商，结果再沿着同一条中转链路返回个人。"
      })]
    });
  },
  "openai-compatible-api": function () {
    var e;
    let o = (0, s.useContext)(r.gq),
      n = "en" === o,
      [t, d] = (0, s.useState)("chat"),
      c = null != (e = u.find(e => e.id === t)) ? e : u[0];
    return (0, i.jsxs)(l.xc, {
      label: n ? "Common OpenAI API request formats" : "OpenAI API 常见功能的请求格式",
      className: "openai-compatible-visual",
      children: [(0, i.jsxs)("section", {
        className: "openai-compatible-capabilities",
        children: [(0, i.jsx)("div", {
          className: "openai-compatible-capability-tabs",
          role: "tablist",
          "aria-label": n ? "OpenAI-compatible capability formats" : "OpenAI 兼容 API 能力格式",
          children: u.map(e => {
            let n = e.id === t;
            return (0, i.jsxs)("button", {
              className: "openai-compatible-capability-tab ".concat(n ? "is-active" : ""),
              type: "button",
              role: "tab",
              "aria-selected": n,
              "aria-controls": "openai-capability-panel",
              onClick: () => d(e.id),
              children: [(0, i.jsx)("span", {
                children: a(e.label, o)
              }), (0, i.jsx)("code", {
                children: a(e.format, o)
              })]
            }, e.id);
          })
        }), (0, i.jsxs)("div", {
          className: "openai-compatible-capability-panel",
          id: "openai-capability-panel",
          role: "tabpanel",
          "aria-live": "polite",
          children: [(0, i.jsxs)("div", {
            className: "openai-compatible-capability-panel-title",
            children: [(0, i.jsx)("strong", {
              children: a(c.label, o)
            }), (0, i.jsx)("code", {
              children: a(c.format, o)
            })]
          }), (0, i.jsx)("p", {
            children: a(c.detail, o)
          }), (0, i.jsx)("span", {
            children: a(c.note, o)
          })]
        })]
      }), (0, i.jsx)("p", {
        className: "openai-compatible-conclusion",
        children: n ? "These formats come from different OpenAI API endpoints; compatibility only means a similar request shape, not that every service supports every capability." : "这些格式来自不同的 OpenAI API 接口；兼容只说明请求外形相近，不代表每个服务都会支持这些能力。"
      })]
    });
  },
  "config-file": function () {
    let e = (0, s.useContext)(r.gq),
      o = "en" === e;
    return (0, i.jsx)(l.xc, {
      label: o ? "AI tool configuration file comparison" : "AI 工具配置文件对照",
      className: "config-file-visual",
      children: (0, i.jsx)("div", {
        className: "config-file-table-wrap",
        children: (0, i.jsxs)("table", {
          className: "config-file-table",
          "aria-label": o ? "AI tool configuration file comparison" : "AI 工具配置文件对照",
          children: [(0, i.jsx)("thead", {
            children: (0, i.jsxs)("tr", {
              children: [(0, i.jsx)("th", {
                scope: "col",
                children: o ? "AI tool" : "AI 工具名称"
              }), (0, i.jsx)("th", {
                scope: "col",
                children: o ? "Can edit config file" : "是否支持修改配置文件"
              }), (0, i.jsx)("th", {
                scope: "col",
                children: o ? "Configuration file location" : "配置文件位置"
              }), (0, i.jsx)("th", {
                scope: "col",
                children: o ? "Official docs" : "官方文档"
              })]
            })
          }), (0, i.jsx)("tbody", {
            children: h.map(n => {
              var s;
              return (0, i.jsxs)("tr", {
                children: [(0, i.jsx)("th", {
                  scope: "row",
                  children: a(n.name, e)
                }), (0, i.jsx)("td", {
                  children: (0, i.jsx)("span", {
                    className: "config-file-status ".concat(n.supportsEditing ? "is-supported" : "is-unsupported"),
                    children: n.supportsEditing ? o ? "Supported" : "支持" : o ? "Not supported" : "不支持"
                  })
                }), (0, i.jsx)("td", {
                  children: (0, i.jsx)("div", {
                    className: "config-file-location",
                    children: n.supportsEditing ? null == (s = n.locations) ? void 0 : s.map(o => (0, i.jsx)("code", {
                      className: "config-file-path",
                      children: a(o, e)
                    }, o.en)) : (0, i.jsx)("span", {
                      className: "config-file-product",
                      children: a(n.productConfiguration, e)
                    })
                  })
                }), (0, i.jsx)("td", {
                  className: "config-file-doc-cell",
                  children: (0, i.jsxs)("a", {
                    className: "config-file-doc",
                    href: n.doc.url,
                    target: "_blank",
                    rel: "noreferrer",
                    children: [(0, i.jsx)("img", {
                      className: "config-file-doc-logo",
                      src: n.doc.logo.src,
                      alt: a(n.doc.logo.alt, e),
                      width: 28,
                      height: 28
                    }), (0, i.jsxs)("span", {
                      className: "config-file-doc-label",
                      children: [(0, i.jsx)("span", {
                        children: a(n.doc.label, e)
                      }), (0, i.jsx)("i", {
                        className: "ti ti-external-link",
                        "aria-hidden": "true"
                      })]
                    })]
                  })
                })]
              }, n.id);
            })
          })]
        })
      })
    });
  },
  profile: f("profile"),
  "project-rules": f("project-rules"),
  hook: f("hook"),
  plugin: f("plugin"),
  "permission-mode": function () {
    var e;
    let o = (0, s.useContext)(r.gq),
      [n, d] = (0, s.useState)("ask"),
      [c, h] = (0, s.useState)(!0),
      p = null != (e = t.find(e => e.id === n)) ? e : t[0],
      u = "en" === o ? "Codex permissions" : "Codex 权限设置";
    return (0, i.jsx)(l.xc, {
      label: u,
      className: "permission-mode-visual",
      children: (0, i.jsxs)("div", {
        className: "permission-mode-codex-shell".concat(c ? " is-menu-open" : ""),
        children: [(0, i.jsxs)("div", {
          className: "permission-mode-composer",
          children: [(0, i.jsx)("span", {
            className: "permission-mode-composer-placeholder",
            children: "en" === o ? "Ask Codex anything." : "向 Codex 提问。"
          }), (0, i.jsxs)("div", {
            className: "permission-mode-toolbar",
            children: [(0, i.jsxs)("div", {
              className: "permission-mode-toolbar-group permission-mode-toolbar-group-start",
              children: [(0, i.jsx)("span", {
                className: "permission-mode-tool-button",
                "aria-hidden": "true",
                children: (0, i.jsx)("i", {
                  className: "ti ti-plus"
                })
              }), (0, i.jsxs)("div", {
                className: "permission-mode-selector",
                children: [(0, i.jsxs)("button", {
                  type: "button",
                  className: "permission-mode-selector-trigger",
                  "aria-expanded": c,
                  "aria-haspopup": "menu",
                  onClick: () => h(e => !e),
                  children: [(0, i.jsx)("i", {
                    className: "ti ".concat(p.icon, " permission-mode-selector-icon"),
                    "aria-hidden": "true"
                  }), (0, i.jsx)("span", {
                    children: a(p.label, o)
                  }), (0, i.jsx)("i", {
                    className: "ti ti-chevron-down permission-mode-selector-chevron",
                    "aria-hidden": "true"
                  })]
                }), c && (0, i.jsx)("div", {
                  className: "permission-mode-selector-menu",
                  role: "menu",
                  "aria-label": "en" === o ? "Choose an option" : "选择权限设置",
                  children: t.map(e => {
                    let s = e.id === n;
                    return (0, i.jsxs)("button", {
                      type: "button",
                      className: "permission-mode-option".concat(s ? " is-selected" : ""),
                      role: "menuitemradio",
                      "aria-checked": s,
                      onClick: () => {
                        d(e.id);
                      },
                      children: [(0, i.jsx)("i", {
                        className: "ti ".concat(e.icon, " permission-mode-option-icon"),
                        "aria-hidden": "true"
                      }), (0, i.jsx)("span", {
                        children: a(e.label, o)
                      }), s && (0, i.jsx)("i", {
                        className: "ti ti-check permission-mode-option-check",
                        "aria-hidden": "true"
                      })]
                    }, e.id);
                  })
                })]
              })]
            }), (0, i.jsxs)("div", {
              className: "permission-mode-toolbar-group permission-mode-toolbar-group-end",
              "aria-hidden": "true",
              children: [(0, i.jsx)("span", {
                className: "permission-mode-model",
                children: "5.6 Sol Medium"
              }), (0, i.jsx)("span", {
                className: "permission-mode-tool-button",
                children: (0, i.jsx)("i", {
                  className: "ti ti-microphone"
                })
              }), (0, i.jsx)("span", {
                className: "permission-mode-send-button",
                children: (0, i.jsx)("i", {
                  className: "ti ti-arrow-up"
                })
              })]
            })]
          })]
        }), (0, i.jsxs)("section", {
          className: "permission-mode-details",
          "aria-live": "polite",
          children: [(0, i.jsxs)("div", {
            className: "permission-mode-details-heading",
            children: [(0, i.jsx)("i", {
              className: "ti ".concat(p.icon),
              "aria-hidden": "true"
            }), (0, i.jsx)("h4", {
              children: a(p.label, o)
            })]
          }), (0, i.jsx)("p", {
            children: a(p.description, o)
          }), (0, i.jsx)("dl", {
            children: p.status.map(e => (0, i.jsxs)("div", {
              children: [(0, i.jsx)("dt", {
                children: a(e.label, o)
              }), (0, i.jsx)("dd", {
                children: (0, i.jsx)("code", {
                  children: a(e.value, o)
                })
              })]
            }, e.label.en))
          }), p.commonSettings && (0, i.jsx)("p", {
            children: a(p.commonSettings, o)
          })]
        })]
      })
    });
  },
  sandbox: f("sandbox")
};
function g(e) {
  let {
      kind: o
    } = e,
    n = b[o];
  return n ? (0, i.jsx)(n, {}) : null;
}
export {};
export default g;
