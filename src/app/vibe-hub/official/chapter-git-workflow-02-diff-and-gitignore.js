// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

let n = {
  id: "02-diff-and-gitignore",
  order: 2,
  shortTitle: "改动与忽略",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/git-workflow-chapter-02-overview-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-02-overview-en-v1.webp",
      alt: "使用 Diff 审查改动并配置忽略规则",
      altEn: "Review code changes with diff and configure .gitignore",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/git-workflow-chapter-02-list-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-02-list-en-v1.webp",
      alt: "代码差异对比与敏感文件忽略示意图",
      altEn: "Code diff comparison and secret file ignoring diagram",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["diff", "gitignore"],
  title: "查看改动与配置忽略文件",
  intro: "在保存新版本前，通过代码差异（Diff）核对 AI 具体修改了哪些文件与代码行，并配置 .gitignore 排除密码、密钥和本地临时文件。",
  sections: [{
    id: "diff-inspection",
    title: "使用 Diff 查看具体改动",
    content: [{
      kind: "paragraph",
      content: ["AI 生成代码的速度很快，但它有时会在我们看不见的地方修改非目标文件，甚至删除原本正常的逻辑。如果我们只凭界面表现来判断，很容易遗漏潜在问题。"]
    }, {
      kind: "paragraph",
      content: ["在 Git 中，", {
        type: "term",
        termId: "diff",
        label: "差异对比"
      }, " 用于逐行核对两个状态之间的变化。在编辑器对比窗口或 Agent 输出的报告中，通常会以加号与绿色标注新增代码，以减号与红色标注删除代码。通过要求 Agent 提供 Diff 报告，我们能够确认三件事：第一，AI 是否只修改了当前任务涉及的文件；第二，是否误删了原有的必要逻辑；第三，改动是否仍满足功能要求。"]
    }, {
      kind: "paragraph",
      content: ["让 Agent 审查改动时，需要明确比较的两端，否则“没有改动”可能只是看错了范围："]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "未暂存改动"
      }, "：工作区与暂存区比较，显示已跟踪文件尚未登记到暂存清单的编辑（对应 `git diff`）。"], [{
        type: "strong",
        text: "待提交改动"
      }, "：暂存区与最近一次提交比较，显示下一次提交将正式记录的改动（对应 `git diff --cached`）。"], [{
        type: "strong",
        text: "未跟踪新文件"
      }, "：尚未纳入版本管理的新文件，通常以 `??` 标记显示在状态列表中，不会直接出现在普通差异对比中。"]]
    }, {
      kind: "paragraph",
      content: ["初学者在实际使用中经常会遇到一种情况：明明让 AI 修改了代码，但在询问改动时，AI 却说 `git diff` 没有任何输出。这通常不是因为改动丢失了，而是 AI 在修改完文件后，已经顺手运行了 `git add` 将改动加入了暂存区。此时工作区与暂存区之间没有差异；只要让 AI 检查暂存区的差异（`git diff --cached`），就能看清即将写入新提交的代码内容。"]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "flow",
          title: "两组 Diff 命令的核对范围",
          caption: "如果 git diff 结果为空，检查改动是否已经被加入到了暂存区。",
          steps: [{
            title: "本地工作区（未暂存）",
            detail: "我们或 AI 刚刚完成的编辑。运行 git diff，可查看它与暂存区的差异。"
          }, {
            title: "待提交暂存区（已暂存）",
            detail: "运行 git add 登记的内容。运行 git diff --cached，可查看它与上一次提交的差异。"
          }, {
            title: "本地仓库（已记录）",
            detail: "运行 git commit 生成的正式快照。提交后暂存区清空，两份 Diff 均恢复为空。"
          }]
        }
      }
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "git-diff-viewer",
          title: "导航栏的一处改动",
          caption: "示例 git diff：比较工作区与暂存区，保留登录跳转，只调整显示。",
          filename: "src/components/Navbar.tsx",
          stats: {
            additions: 2,
            deletions: 1
          },
          lines: [{
            type: "context",
            oldNum: 10,
            newNum: 10,
            text: "export function Navbar() {"
          }, {
            type: "context",
            oldNum: 11,
            newNum: 11,
            text: "  return ("
          }, {
            type: "context",
            oldNum: 12,
            newNum: 12,
            text: '    <header className="nav-header">'
          }, {
            type: "deletion",
            oldNum: 13,
            text: '      <a href="/login" className="link-old">旧版登录</a>'
          }, {
            type: "addition",
            newNum: 13,
            text: '      <a href="/login" className="btn-primary">立即登录</a>'
          }, {
            type: "addition",
            newNum: 14,
            text: '      <span className="badge-new">新功能</span>'
          }, {
            type: "context",
            oldNum: 14,
            newNum: 15,
            text: "    </header>"
          }, {
            type: "context",
            oldNum: 15,
            newNum: 16,
            text: "  );"
          }, {
            type: "context",
            oldNum: 16,
            newNum: 17,
            text: "}"
          }],
          annotation: "红色减号（-）表示相对暂存区删掉的行；绿色加号（+）表示本次新增的行；白色表示未改动的上下文参考行。"
        }
      }
    }, {
      kind: "paragraph",
      content: ["图中展示了一处典型的导航栏修改：新增 2 行、删除 1 行。", {
        type: "strong",
        text: "如果把链接改成没有跳转逻辑的按钮，即使样式正确，登录入口还能用吗？"
      }, " 不能。因此例子保留了 `/login` 链接，在让 Agent 提交前，我们还要在浏览器中实际点击验收。Agent 暂存后，再让它核对一次待提交差异，确认准备记录的正是检查过的内容。"]
    }]
  }, {
    id: "gitignore-rules",
    title: "配置 .gitignore 保护敏感信息与排除产物",
    content: [{
      kind: "paragraph",
      content: ["并不是项目目录下的所有文件都应当被 Git 记录。有些文件体积庞大且可以通过命令自动下载，例如依赖包目录；有些文件包含敏感凭据，例如本地环境变量文件。如果把这些内容提交到公开仓库，会带来严重的安全风险。"]
    }, {
      kind: "paragraph",
      content: [{
        type: "term",
        termId: "gitignore",
        label: ".gitignore"
      }, " 是存放在项目根目录下的文本文件，用于指定 Git 应当忽略的文件或目录规则。对尚未被跟踪且命中规则的文件，普通 `git add` 会跳过它们；规则不会加密文件，也不能阻止强制添加，更不会清除已有历史。图中的每条规则单独写一行；`!.env.example` 放在 `.env*` 后面，只为不含真实秘密的配置模板保留入口。"]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "git-ignore-board",
          title: ".gitignore 的生效范围",
          caption: "规则只忽略未跟踪文件。下面特意保留一个已跟踪配置作为反例；这不是密钥保险箱。",
          rules: [".env*", "!.env.example", "node_modules/", "dist/", ".DS_Store"],
          files: [{
            path: "src/components/Navbar.tsx",
            status: "tracked",
            reason: "已跟踪的源码。是否 add，由本次提交范围决定。",
            badge: "已跟踪"
          }, {
            path: ".env.local",
            status: "ignored",
            reason: "假设尚未跟踪，命中 .env*；普通 add 会跳过，但规则不会加密内容。",
            badge: "未跟踪 \xb7 已忽略"
          }, {
            path: "node_modules/axios/...",
            status: "ignored",
            reason: "假设尚未跟踪，第三方依赖命中 node_modules/，通常由包管理器安装。",
            badge: "未跟踪 \xb7 已忽略"
          }, {
            path: ".DS_Store",
            status: "ignored",
            reason: "macOS 保存文件夹显示设置的文件，假设尚未跟踪，命中忽略规则。",
            badge: "未跟踪 \xb7 已忽略"
          }, {
            path: ".env.production",
            status: "tracked",
            reason: "反例：若此前已跟踪，后加 .env* 也不会阻止其修改进入提交。必须另行停止跟踪；旧历史仍在。",
            badge: "已跟踪 \xb7 规则不拦截"
          }]
        }
      }
    }, {
      kind: "paragraph",
      content: ["初学者最常遇到的一个困惑是：", {
        type: "strong",
        text: "为什么我明明把文件写进了 `.gitignore`，修改它时 Git 依然会提示改动并准备提交？"
      }]
    }, {
      kind: "paragraph",
      content: ["这是因为 `.gitignore` 规则只对", {
        type: "strong",
        text: "从未被 Git 记录过的全新文件"
      }, "生效。如果某个文件在此前已经被提交过，Git 就已经与它建立了跟踪关系；之后单纯在 `.gitignore` 里补上规则，只要该文件的内容发生变化，Git 依然会如实报告修改，并允许提交。"]
    }, {
      kind: "paragraph",
      content: ["遇到这种情况，直接对 Agent 说：“`.env.local` 已经被加进 `.gitignore` 了，帮我停止跟踪这个文件，但保留本地磁盘上的文件，不要删除它。”"]
    }, {
      kind: "paragraph",
      content: ["Agent 底层执行的正是 `git rm --cached` 命令——它只把文件从 Git 暂存区和跟踪列表中移除，本地文件完好无损。提交这次变动后，后续对该文件的修改就不会再出现在待提交列表里了。"]
    }, {
      kind: "paragraph",
      content: ["如果敏感密钥此前已经不小心提交并推送到了公开仓库，光加忽略规则或删文件是不够的；必须第一时间到对应服务商后台撤销或重置密钥，避免安全风险。"]
    }]
  }, {
    id: "agent-diff-prompt",
    title: "怎样让 AI 自检改动并配置忽略规则",
    content: [{
      kind: "paragraph",
      content: ["在让 AI 协助开发时，我们可以把“检查差异”与“核对忽略规则”作为明确要求写入指令中。AI 能够熟练运行状态检查命令，并根据技术栈补齐配置。"]
    }, {
      kind: "paragraph",
      content: ["当我们向 AI 索取改动报告时，应要求它说明比较范围、文件和关键行为变化，行数只能辅助判断；在初始化项目或添加新工具库时，也可以直接让 AI 检查 .gitignore 是否已经包含对应的构建目录。"]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "chat-flow",
          title: "向 AI 下达审查改动与忽略配置指令",
          caption: "示例对话：同时检查差异范围、跟踪状态和忽略规则。",
          messages: [{
            role: "user",
            text: "检查未暂存和已暂存的改动，只应涉及导航栏。确认登录链接仍可用，再检查 .env.local 是否已被跟踪、是否命中忽略规则。"
          }, {
            role: "agent",
            text: "示例结果：未暂存的 Navbar.tsx 为 +2/-1，/login 链接保留；暂存区没有改动。ls-files 未列出 .env.local，check-ignore 显示它命中 .env*。链接点击尚未实测，需完成后再提交。"
          }]
        }
      }
    }, {
      kind: "paragraph",
      content: ["把这些要求作为固定规范，能够有效减少 AI 自由发挥带来的副作用，让每一次版本记录都干净可查。"]
    }]
  }, {
    id: "diff-summary",
    title: "本章总结：先审查后提交，把好安全边界",
    content: [{
      kind: "paragraph",
      content: ["在这一章中，我们学习了", {
        type: "strong",
        text: "使用 Diff 审查代码变动"
      }, "的方法，理解了", {
        type: "strong",
        text: ".gitignore 过滤无用与敏感文件"
      }, "的机制，并掌握了", {
        type: "strong",
        text: "如何让 AI 自检改动"
      }, "。审查工作区与暂存区，并核对文件跟踪状态，才能判断本次提交会包含什么。在下一章中，我们会探讨 Git 最具特色的能力：分支机制与 HEAD 指针。"]
    }],
    variant: "summary"
  }]
};
export {};
export default n;
