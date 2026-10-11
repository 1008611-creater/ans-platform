// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

let i = {
  id: "07-form-and-interaction",
  order: 7,
  shortTitle: "交互与表单",
  header: {
    visual: {
      kind: "image",
      src: "/vibe-hub/source/assets/product-website-chapter-09-form-v5.webp",
      alt: "小人和猫演示按钮交互与候补名单表单提交",
      width: 1536,
      height: 1024
    },
    listVisual: {
      src: "/vibe-hub/source/assets/product-website-chapter-09-list-v4.webp",
      alt: "小人和猫一起测试按钮状态与表单校验",
      width: 640,
      height: 640
    }
  },
  coreTerms: ["hover", "form", "label", "data-validation"],
  title: "按钮交互与候补表单",
  intro: "控件的操作反馈和表单交互直接影响用户的填写体验。本章介绍鼠标悬停、键盘聚焦与按下状态的处理，以及候补表单的字段设置、输入校验与结果展示。",
  sections: [{
    id: "control-interaction-states",
    title: "鼠标悬停（Hover）与即时反馈",
    content: [{
      kind: "paragraph",
      content: ["当鼠标滑过按钮或链接时，背景颜色加深或出现下划线，这种即时状态称为 ", {
        type: "term",
        termId: "hover",
        label: "Hover"
      }, "（悬停）。"]
    }, {
      kind: "paragraph",
      content: ["悬停反馈的作用是提示用户当前元素可以点击。如果可点击按钮在鼠标移入后没有任何变化，用户容易误以为界面没有响应；相反，如果普通文本随意添加悬停效果，则容易造成误导。"]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "对 AI 这样说"
      }, "：“为页面上的所有主要按钮和文字链接添加 Hover 悬停效果：按钮背景轻微加深，文字链接浮现下划线，配合 150ms 的平滑过渡，不要产生突兀的位移跳动。”"]]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "before-after",
          title: "鼠标放上去，链接要让人看出能点",
          caption: "左边是没做悬停的链接，和普通文字混在一起；右边加上颜色和下划线的变化。",
          agentSay: "链接鼠标悬停时变色并出现下划线，默认状态也保留可识别的样式",
          before: {
            label: "没做 Hover \xb7 和正文混在一起",
            card: {
              title: "查看完整示例",
              text: "和旁边的文字长得一样，鼠标放上去也没任何变化",
              tone: "problem"
            }
          },
          after: {
            label: "加上 Hover \xb7 一眼看出能点",
            note: "默认状态就有颜色和下划线，Hover 只是把变化再放大一点。",
            card: {
              title: "查看完整示例",
              text: "颜色变成品牌色，出现下划线",
              annotation: "Hover 只负责补充反馈",
              tone: "fixed"
            }
          }
        }
      }
    }]
  }, {
    id: "keyboard-and-press-states",
    title: "键盘聚焦（Focus）与按下状态（Active）",
    content: [{
      kind: "paragraph",
      content: ["除了鼠标悬停，控件还需要支持两种交互状态："]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "聚焦状态（Focus）"
      }, "：使用键盘 Tab 键导航时，被选中的按钮或输入框周围会出现高亮外轮廓。这是无障碍浏览与键盘操作的重要指引，应避免直接使用 `outline: none` 将轮廓移除。"], [{
        type: "strong",
        text: "按下状态（Active）"
      }, "：鼠标或手指按住按钮的瞬间，按钮呈现轻微的按下反馈（如轻微缩放或颜色加深），提示用户操作已被触发。"]]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "对 AI 这样说"
      }, "：“确保键盘使用 Tab 键导航时，当前聚焦的按钮和输入框有清晰可见的高亮外轮廓（Focus ring）；按钮在被按住时添加轻微的按下反馈（Active: scale 0.98），提供明确的操作提示。”"]]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "control-states",
          title: "同一个按钮的四种状态",
          caption: "用鼠标和键盘各走一遍，四种状态都正确，反馈才算齐全。",
          control: "加入候补名单",
          states: [{
            state: "default",
            label: "默认",
            note: "页面刚加载时的样子"
          }, {
            state: "hover",
            label: "Hover",
            note: "鼠标放上去 \xb7 换个颜色"
          }, {
            state: "focus",
            label: "Focus",
            note: "按 Tab 停在这里 \xb7 出现外轮廓"
          }, {
            state: "active",
            label: "Active",
            note: "按下去的一瞬 \xb7 微微下沉"
          }]
        }
      }
    }]
  }, {
    id: "minimal-form-and-labels",
    title: "候补表单与标签关联",
    content: [{
      kind: "paragraph",
      content: ["在产品正式上线前，页面通常提供邮箱登记功能，这需要使用", {
        type: "term",
        termId: "form",
        label: "表单"
      }, "（Form）。"]
    }, {
      kind: "paragraph",
      content: ["表单字段越少，用户填写的成本越低。初版候补表单建议保持克制，只保留两个字段：必填的邮箱，以及选填的简要留言。"]
    }, {
      kind: "paragraph",
      content: ["每个输入框上方应保留清晰的", {
        type: "term",
        termId: "label",
        label: "标签"
      }, "（Label）。避免仅用输入框内的占位提示（Placeholder）代替标签，因为用户输入文字后占位提示会消失，容易混淆输入项。"]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "对 AI 这样说"
      }, "：“在页面中下部设计一个轻量的‘加入候补名单’表单，只保留必填的邮箱和选填的补充说明两个字段。每个输入框上方保留常驻的文字标签，点击标签文字能自动聚焦到对应的输入框。”"]]
    }, {
      kind: "block",
      block: {
        kind: "visual",
        visual: {
          kind: "form-states",
          title: "「加入候补名单」表单的三种时刻",
          caption: "错误写在邮箱旁边，内容不清空；提交后结果出现在表单原来的位置。",
          fieldLabel: "邮箱",
          states: [{
            state: "default",
            label: "填写时",
            note: "标签和输入框都看得清，占位提示写示例格式"
          }, {
            state: "error",
            label: "写错了",
            note: "红字出现在输入框正下方，已填的内容保留",
            value: "user#example.com",
            message: "邮箱格式好像不对，检查一下 @ 和后缀"
          }, {
            state: "success",
            label: "提交成功",
            note: "成功提示替换表单，就在原来的位置，不用滚动找",
            message: "已加入候补名单，有消息第一时间告诉你"
          }]
        }
      }
    }]
  }, {
    id: "validation-and-feedback",
    title: "表单数据校验与提交结果",
    content: [{
      kind: "paragraph",
      content: ["用户点击提交时，表单需要完成校验与反馈："]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "数据校验"
      }, "：使用", {
        type: "term",
        termId: "data-validation",
        label: "数据校验"
      }, "（Validation）拦截格式不合规的输入。如果邮箱格式不正确，在输入框下方显示明确的错误提示，并将边框标红；用户重新修改输入时，错误提示应自动消失，且不应清空用户已输入的内容。"], [{
        type: "strong",
        text: "提交结果"
      }, "：展示提交后的明确", {
        type: "term",
        termId: "result",
        label: "结果"
      }, "（Result）。点击提交后，按钮变为加载状态并暂时禁用，防止重复点击。接口响应后，在表单原位置展示提交成功的提示信息，页面无需刷新，也不跳回顶部。"]]
    }, {
      kind: "list",
      items: [[{
        type: "strong",
        text: "对 AI 这样说"
      }, "：“为候补表单添加前端校验：邮箱为空或格式不合规时，在输入框下方显示红色错误提示；点击提交后按钮变为禁用加载状态；提交成功后原地显示‘已加入候补名单’提示卡片，保留用户当前浏览位置。”"]]
    }]
  }, {
    id: "summarize-form-and-interaction",
    title: "本章总结",
    content: [{
      kind: "paragraph",
      content: ["本章介绍了按钮与链接在 Hover、Focus 和 Active 状态下的反馈处理，梳理了表单字段与标签的对应关系，并实现了输入校验与原地结果展示。下一章，我们将处理移动端适配与抽屉导航。"]
    }],
    variant: "summary"
  }]
};
export {};
export default i;
