// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

let n = {
  id: "03-branch-and-head",
  order: 3,
  shortTitle: "分支隔离",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/git-workflow-chapter-03-overview-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-03-overview-en-v1.webp",
      alt: "分支指针移动与 HEAD 切换机制",
      altEn: "Branch pointer movements and HEAD cursor switching",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/git-workflow-chapter-03-list-v1.webp",
      srcEn: "/vibe-hub/source/assets/git-workflow-chapter-03-list-en-v1.webp",
      alt: "分支指针与提交历史示意图",
      altEn: "Branch pointers and commit history diagram",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["branch", "vibe-coding"],
  title: "创建分支与隔离开发",
  intro: "学习使用分支把新功能的探索与主线代码隔离开来。在独立分支上让 AI 开发与验证，确保实验性改动不会影响原本稳定运行的代码。",
  sections: [{
    id: "branch-pointer",
    title: "分支不是文件夹拷贝，而是活动指针",
    content: [{
      kind: "paragraph",
      content: ["在很多人的直觉中，开辟一个新分支就像是在电脑里把整个工程文件夹完整复制了一遍。如果真的这样实现，项目的体积很快就会膨胀几十倍，在不同文件夹之间同步代码也会变得非常繁琐。"]
    }, {
      kind: "paragraph",
      content: ["在 Git 的底层实现中，", {
        type: "term",
        termId: "branch",
        label: "分支"
      }, " 本质上只是一个指向特定 Commit 的可移动 ", {
        type: "term",
        termId: "pointer",
        label: "指针"
      }, "。创建新分支并不需要复制任何文件，它仅仅是在当前的提交节点上贴了一个新的活动标签，所有分支共同存放在同一个项目仓库中。"]
    }, {
      kind: "paragraph",
      content: ["当我们在某个分支上持续产生新的提交时，该分支指针会自动向前移动，指向最新生成的快照。而其他分支的指针则保持在原来的位置，互不影响。创建分支非常轻量，切换分支时 Git 会更新工作区中的对应文件。如果从主干切出新功能分支后，主干又单独提交了修复，两条分支就会各自向前演进，形成不同的提交节点。"]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "git-branch-graph",
          title: "同一个起点，两个分支各自新增提交",
          caption: "每个分支名指向该行最后一个提交；通常 HEAD 指向当前分支名。这里仅表示已提交的历史。",
          baseCommit: {
            hash: "c7d8e9f",
            msg: "登录稳定版"
          },
          mainBranch: {
            name: "main",
            commits: [{
              hash: "d2e3f4a",
              msg: "结算超时改为 5 秒"
            }]
          },
          featureBranch: {
            name: "feature/cart",
            commits: [{
              hash: "e4f5a6b",
              msg: "实现购物车抽屉"
            }, {
              hash: "f7a8b9c",
              msg: "结算超时改为 8 秒"
            }],
            isHead: !0
          },
          headDesc: "HEAD → feature/cart → f7a8b9c。在这里创建提交会移动 feature/cart；未提交改动不属于这条历史链。"
        }
      }
    }]
  }, {
    id: "head-movement",
    title: "HEAD 是当前检出位置的坐标",
    content: [{
      kind: "paragraph",
      content: ["既然仓库中可以同时存在多个分支指针，Git 又是如何知道我们当前正在哪一个分支上工作呢？答案是 `HEAD` 这一特殊 ", {
        type: "term",
        termId: "pointer",
        label: "指针"
      }, "。"]
    }, {
      kind: "paragraph",
      content: ["`HEAD` 是 Git 内部的一个特殊引用，相当于指示我们当前所在位置的坐标。通常情况下，`HEAD` 指向我们当前所在的本地分支名，例如 `main` 或 `feature/cart`。"]
    }, {
      kind: "paragraph",
      content: ["当我们执行切换分支的操作时，Git 会做两件事：首先让 `HEAD` 改为指向目标分支的指针；接着，Git 会按目标版本更新需要变化的已跟踪文件与暂存区。初学者在切换分支后，常会发现编辑器里的代码文件突然变了，甚至某些刚写的文件不见了；这并不是代码被误删了，而是 Git 正在同一个文件夹里展示目标分支所保存的版本，切回原分支后便会完整复原。"]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "git-branch-graph",
          title: "执行 git switch main 时 HEAD 的移动与工作区重载",
          caption: "前提：工作区和暂存区干净。切换分支后，按目标快照更新已跟踪文件；两个分支的提交都保留。",
          baseCommit: {
            hash: "c7d8e9f",
            msg: "登录稳定版"
          },
          mainBranch: {
            name: "main",
            commits: [{
              hash: "d2e3f4a",
              msg: "结算超时改为 5 秒"
            }],
            isHead: !0
          },
          featureBranch: {
            name: "feature/cart",
            commits: [{
              hash: "e4f5a6b",
              msg: "实现购物车抽屉"
            }, {
              hash: "f7a8b9c",
              msg: "结算超时改为 8 秒"
            }]
          },
          headDesc: "HEAD → main → d2e3f4a。这个干净工作区中，结算超时由 8 秒变成 5 秒；有未提交改动时必须另行检查。"
        }
      }
    }, {
      kind: "paragraph",
      content: ["切换分支前，建议先运行 `git status` 确认工作区是干净的。", {
        type: "strong",
        text: "未提交的改动不一定会阻止切换，也不会自动归属于某个分支。"
      }, " 如果不会覆盖目标分支的内容，Git 可能会把这些半成品修改直接带到新分支上，造成改动混淆；如果会发生覆盖，Git 通常会报错并拒绝切换。因此在切换分支前，要么把已验证的代码提交，要么按第六章介绍的方法临时存放，避免带着未提交的改动随意切换。"]
    }, {
      kind: "paragraph",
      content: ["你可以直接对 Agent 说：“基于当前的 main 分支，新建一个名为 feature/cart 的分支并切换过去，然后开始写购物车功能。”"]
    }, {
      kind: "paragraph",
      content: ["Agent 底层执行的正是 `git switch -c feature/cart`（`-c` 代表创建并切换）；后续想切回主线，只要说“切回 main 分支”，对应的是 `git switch main`。你可以随时询问 Agent“当前所在的分支”，或者查看编辑器底部状态栏，确认当前所在的分支名。"]
    }]
  }, {
    id: "agent-branch-prompt",
    title: "怎样让 AI 在独立分支上尝试新功能",
    content: [{
      kind: "paragraph",
      content: ["借助 AI 探索新功能与 ", {
        type: "term",
        termId: "vibe-coding",
        label: "Vibe Coding"
      }, " 时，我们往往会产生很多试验性的想法，例如尝试一种全新的设计风格、重构底层数据结构，或者引入新的组件库。这些尝试不一定每次都能成功。"]
    }, {
      kind: "paragraph",
      content: ["如果我们直接在 `main` 主分支上让 AI 大幅修改，一旦效果不理想，想要完全恢复就会变得很麻烦。规范的做法是：每次尝试新想法之前，都要求 AI 先从最新的基线拉出一个专用的独立分支。"]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "chat-flow",
          title: "要求 AI 在独立分支上尝试新功能",
          caption: "示例对话：先确认起点与未提交状态，再创建购物车分支。",
          messages: [{
            role: "user",
            text: "先检查分支和未提交改动；如果 main 是已确认的干净起点，就新建 feature/cart，购物车实验都在这里提交。如果有其他任务的改动，先说明，别自动丢弃。"
          }, {
            role: "agent",
            text: "示例结果：创建前 main 位于 c7d8e9f，status 无改动；git switch -c feature/cart 成功，branch --show-current 输出 feature/cart。此时两个分支仍指向同一提交。"
          }]
        }
      }
    }, {
      kind: "paragraph",
      content: ["在 feature/cart 上提交，不会自动移动 main 的分支指针；但同一工作区里的未提交文件仍可能跟着切换走。实验不满意时，先处理这些文件，再决定是否保留分支上的提交。", {
        type: "strong",
        text: "删除分支只是删除引用，不是撤销工作区改动。"
      }, " 不确定是否还要代码时，先保留分支，按第六章明确恢复范围。"]
    }]
  }, {
    id: "branch-summary",
    title: "本章总结：用轻量分支隔离修改风险",
    content: [{
      kind: "paragraph",
      content: ["在这一章中，我们理解了", {
        type: "strong",
        text: "分支作为可移动指针的底层机制"
      }, "，理清了", {
        type: "strong",
        text: "HEAD 指针控制工作区还原的原理"
      }, "，并掌握了", {
        type: "strong",
        text: "如何要求 AI 在独立分支上开展试验"
      }, "。学会使用分支来隔离开发风险，是我们从随意修改走向工程化协作的关键一步。在下一章中，我们会学习当分支功能验证完成后，如何将代码合并回主干，以及如何处理代码冲突。"]
    }],
    variant: "summary"
  }]
};
export {};
export default n;
