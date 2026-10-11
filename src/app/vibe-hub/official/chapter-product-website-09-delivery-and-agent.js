// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

let i = {
  id: "09-delivery-and-agent",
  order: 9,
  shortTitle: "走查与 AI",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/product-website-chapter-12-agent-request-v3.webp",
      alt: "小人和猫按清单走查页面并向 AI Agent 描述迭代需求",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/product-website-chapter-12-list-v2.webp",
      alt: "小人和猫检查走查清单与 AI 提示词",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["acceptance-criteria", "vibe-coding", "ai-agent"],
  title: "上线走查与 AI 协作迭代",
  intro: "页面制作完毕后，需要在不同设备上进行走查验证。后续借助 AI Agent 迭代页面时，按组件拆分需求并明确约束条件，可以减少回归问题。本章整理了上线走查清单与 AI 协作建议。",
  sections: [{
    id: "five-minute-acceptance",
    title: "上线走查清单",
    content: [{
      kind: "paragraph",
      content: ["对于产品官网或 MVP 来说，在上线前不需要编写复杂的自动化测试脚本，最实用的是一份明确的", {
        type: "term",
        termId: "acceptance-criteria",
        label: "验收标准"
      }, "（Acceptance Criteria）。在浏览器中逐项走查，可以发现大部分排版与交互问题："]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "首屏与核心行动"
      }, "：主标题是否准确说明产品价值？主要 CTA 按钮是否明显？点击后是否跳转到对应区域或示例？"], [{
        type: "strong",
        text: "移动端显示"
      }, "：将浏览器宽度调整为 390px，检查是否存在横向滚动条；抽屉菜单能否正常打开，点击链接后能否自动收起并平滑滚动？"], [{
        type: "strong",
        text: "表单与提示"
      }, "：未输入邮箱或格式错误时，输入框下方是否显示错误提示？重新输入时提示是否消失？提交后是否有加载状态和明确的结果展示？"], [{
        type: "strong",
        text: "文本与排版"
      }, "：检查页面中是否存在未替换的占位文本，长文本是否正常折行。"]]
    }, {
      kind: "paragraph",
      content: ["走查通过后，页面即可安排上线发布。"]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "checklist",
          title: "5 分钟上线走查清单",
          caption: "把「页面看起来正常」换成任何人都能照着重复检查的客观项目。",
          heading: "核心功能与体验上线自检项",
          steps: [{
            label: "首屏与主行动",
            text: "3 秒内能否看清产品价值；主要 CTA 按钮样式高亮且点击链接正确跳转"
          }, {
            label: "手机适配与抽屉",
            text: "手机窄屏（390px）下单列垂直展示，抽屉菜单能正常开闭，没有横向滚动条"
          }, {
            label: "表单校验与反馈",
            text: "邮箱输错在下方显红字；提交时按钮显示加载中，成功后原地展示反馈卡片"
          }, {
            label: "占位与细节排查",
            text: "全站链接点击有效，卡片文字自然断行撑开，无遗留的测试占位符"
          }]
        }
      }
    }]
  }, {
    id: "modular-vibe-coding",
    title: "模块化与单次修改范围",
    content: [{
      kind: "paragraph",
      content: ["在借助 ", {
        type: "term",
        termId: "ai-agent",
        label: "AI Agent"
      }, " 进行 ", {
        type: "term",
        termId: "vibe-coding",
        label: "Vibe Coding"
      }, " 时，如果一次性提出过多修改要求，AI 容易顾此失彼，影响其他已经调好的模块。"]
    }, {
      kind: "paragraph",
      content: ["建议按模块拆分需求，每次聚焦一个具体问题："]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "限定单次修改范围"
      }, "：“只修改首屏组件，把按钮文案改为‘查看完整示例’，不要改动导航栏和其他模块。”"], [{
        type: "strong",
        text: "指明复用已有规则"
      }, "：“使用已有的设计令牌（Design Tokens），保持现有的间距与圆角变量，不要添加写死的像素值。”"], [{
        type: "strong",
        text: "说明改动预期与自测点"
      }, "：“修改后请在移动端自测一下有无折行或溢出。”"]]
    }, {
      kind: "paragraph",
      content: ["通过明确修改范围、样式约束和验证预期，可以提高 AI 修改代码的准确度。"]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "chat-flow",
          title: "向 AI 下达精准局部修改指令",
          caption: "指定组件范围并要求保留已有设计变量，AI 返回修改文件与检查结果。",
          messages: [{
            role: "user",
            text: "只修改首屏组件：将主按钮文案改为「免费体验」，次要入口收进顶部导航。使用已有的设计变量，不要改动其他组件。"
          }, {
            role: "agent",
            text: "已完成首屏调整：主按钮已更新，导航栏已补进入口。本次修改仅涉及 Hero.tsx 与 Navbar.tsx，桌面端与手机端均已检查，无样式错位。"
          }, {
            role: "user",
            text: "在浏览器中测试点击正常，确认这一版修改。"
          }]
        }
      }
    }]
  }, {
    id: "human-in-the-loop",
    title: "人在回路（Human-in-the-loop）",
    content: [{
      kind: "paragraph",
      content: ["AI Agent 能够快速编写和调整代码，但在界面细节、文案语感以及实际操作体验上，仍需要人工在浏览器中进行最终把关。这种由人主导判断、AI 负责执行的协作方式，被称为", {
        type: "term",
        termId: "human-in-the-loop",
        label: "人在回路"
      }, "（Human in the loop）。"]
    }, {
      kind: "paragraph",
      content: ["保持清晰的模块分工，结合小步迭代与人工验证，可以持续维护一个结构清晰、体验稳定的产品官网。"]
    }]
  }, {
    id: "summarize-course-delivery",
    title: "全课总结",
    content: [{
      kind: "paragraph",
      content: ["通过这门课程，我们梳理了产品官网从结构规划到上线交付的完整过程："]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "页面结构与视觉规则（第 1–2 章）"
      }, "：明确前端职责边界，规划单页滚动结构，建立统一的字阶与设计令牌；"], [{
        type: "strong",
        text: "首屏文案与内容排版（第 3–5 章）"
      }, "：说明产品定位与核心行动，用卡片、列表与网格组织功能，补充真实证据与定价；"], [{
        type: "strong",
        text: "排版细节与移动适配（第 6–8 章）"
      }, "：规范内边距与外间距，添加控件交互状态，处理移动端单列重排与抽屉导航；"], [{
        type: "strong",
        text: "走查验收与 AI 协作（第 9 章）"
      }, "：对照清单走查页面，并通过明确范围和约束的方式与 AI 协作迭代。"]]
    }],
    variant: "summary"
  }]
};
export {};
export default i;
