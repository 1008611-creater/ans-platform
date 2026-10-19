// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

import * as n from "react/jsx-runtime";
import * as i from "react";
import * as f from "../courses/routing";
import * as v from "./detail-actions.js";
import * as I from "./view-transitions.js";
import * as T from "react-dom";
import * as A from "./navigation-motion.js";
let r = {
  zh: {
    "user-voice": "用户原声",
    label: "标签",
    "ai-hallucination": "AI 幻觉",
    result: "结果",
    "test-case": "测试用例",
    cta: "行动号召",
    typography: "排版",
    hero: "首屏主视觉",
    "centered-layout": "居中布局",
    card: "卡片",
    "card-grid-layout": "卡片网格布局",
    "style-bento": "便当盒布局",
    gradient: "渐变",
    shadow: "阴影",
    "backdrop-blur": "背景模糊",
    "border-radius": "圆角",
    space: "间距",
    icon: "图标",
    "social-proof": "社会证明",
    empty: "空状态",
    disabled: "禁用状态",
    focus: "聚焦状态",
    "responsive-design": "响应式设计",
    animation: "动画",
    hover: "悬停状态",
    button: "按钮",
    tooltip: "工具提示",
    input: "输入框",
    form: "表单",
    list: "列表",
    divider: "分割线",
    "sidebar-layout": "侧栏布局",
    "serif-sans": "衬线与非衬线"
  },
  en: {
    "user-voice": "User voice",
    label: "Label",
    "ai-hallucination": "AI hallucination",
    result: "Result",
    "test-case": "Test case",
    cta: "Call to action",
    typography: "Typography",
    hero: "Hero",
    "centered-layout": "Centered layout",
    card: "Card",
    "card-grid-layout": "Card grid layout",
    "style-bento": "Bento layout",
    gradient: "Gradient",
    shadow: "Shadow",
    "backdrop-blur": "Backdrop blur",
    "border-radius": "Border radius",
    space: "Spacing",
    icon: "Icon",
    "social-proof": "Social proof",
    empty: "Empty state",
    disabled: "Disabled state",
    focus: "Focus state",
    "responsive-design": "Responsive design",
    animation: "Animation",
    hover: "Hover",
    button: "Button",
    tooltip: "Tooltip",
    input: "Input",
    form: "Form",
    list: "List",
    divider: "Divider",
    "sidebar-layout": "Sidebar layout",
    "serif-sans": "Serif and sans serif"
  }
};
let o = {
  zh: {
    zh: {
      title: "中文口癖",
      description: "怪动词、单字动作和固定开场、结尾"
    },
    en: {
      title: "英文 AI slop",
      description: "高频抽象词、万能开头和装饰性隐喻"
    },
    ui: {
      title: "页面模板感",
      description: "反复出现的布局、装饰和通用图标"
    },
    ux: {
      title: "不好用的交互",
      description: "同一件事换名字，按钮看着能点却没有结果"
    }
  },
  en: {
    zh: {
      title: "Chinese tells",
      description: "Compressed verbs and scripted response posture"
    },
    en: {
      title: "English AI slop",
      description: "Abstract boosters and universal openings"
    },
    ui: {
      title: "UI defaults",
      description: "Repeated structures, decoration, and generic icons"
    },
    ux: {
      title: "UX shortcuts",
      description: "Copy and interactions that ignore the real task"
    }
  }
};
let s = {
  zh: {
    eyebrow: "AI 味儿图鉴",
    title: "防止 AI 味儿",
    description: "把常见的 AI 口癖、套模板的页面和不好用的交互当成词条来认。每条都给出原句或原页面、正常用法和具体改法。",
    boundary: "单个词、视觉元素或交互问题不能证明作者。判断时要看它是否与其他默认选择成组出现。",
    items: "个表现",
    back: "返回 AI 味图鉴",
    quote: "你可能会说",
    why: "为什么看起来像 AI 默认",
    examples: "常见表现",
    boundaryTitle: "什么时候不算",
    avoid: "应该怎么改",
    prompt: "可以这样告诉 AI Agent",
    related: "相关术语",
    writingVisual: "用户指出以后，回答应该怎么变",
    interfaceVisual: "同一个任务，改前和改后有什么区别",
    before: "AI 默认",
    feedback: "用户指出",
    after: "按任务改",
    copyMarkdown: "复制为 Markdown",
    copied: "已复制",
    prevEntry: "上一个表现",
    nextEntry: "下一个表现",
    copyPrompt: "复制这段要求"
  },
  en: {
    eyebrow: "AI slop field guide",
    title: "Avoid AI Slop",
    description: "Browse recurring writing tells, UI defaults, and UX shortcuts like glossary entries. Each entry includes examples, valid uses, and a concrete revision rule.",
    boundary: "One word, visual choice, or interaction bug cannot prove authorship. Judge repeated defaults in context.",
    items: "patterns",
    back: "Back to AI slop guide",
    quote: "You might say",
    why: "Why it feels generated",
    examples: "Common examples",
    boundaryTitle: "When it can be valid",
    avoid: "How to avoid it",
    prompt: "Tell your AI agent",
    related: "Related terms",
    writingVisual: "How the answer should change after the user objects",
    interfaceVisual: "What changes when the same task is designed deliberately",
    before: "AI default",
    feedback: "User says",
    after: "Task-led",
    copyMarkdown: "Copy as Markdown",
    copied: "Copied",
    prevEntry: "Previous pattern",
    nextEntry: "Next pattern",
    copyPrompt: "Copy this request"
  }
};
let l = {
  "catch-you": {
    request: "Skip the reassurance—I just need help finding what is wrong with this section.",
    quote: "“You are not too sensitive. You are simply clear-eyed. I am right here, and I will hold all of this with you.”",
    better: "“This section has two problems: the opening repeats itself, and the conclusion has no support. I’ll mark both sentences.”",
    tagline: "The response performs understanding and comfort before reviewing the facts.",
    why: "This language fits some counseling contexts. It sounds scripted when applied to slide edits, code review, or routine questions.",
    examples: ["This time, I truly understand.", "You have carried this for too long. Leave the rest to me.", "You do not need to explain. I will hold all of this for you."],
    normal: "The user has clearly expressed distress and the conversation calls for emotional support.",
    avoid: "Confirm the task first. Respond only to feelings the user has actually expressed.",
    prompt: "Confirm my task directly. Do not comfort me or interpret my emotions before reviewing the facts."
  },
  "single-verbs": {
    request: "Just tell me which sentence to change. “Tighten it” and “land it” do not tell me much.",
    quote: "“Tighten the problem, smooth the logic, raise the conclusion, then land it.”",
    better: "“In paragraph two, replace ‘elevate collaboration’ with ‘turn meeting notes into decisions and assigned tasks.’”",
    tagline: "Compressed action verbs omit the object, location, and expected result.",
    why: "The sentence sounds active, but the reader cannot tell which paragraph, file, or interface state should change.",
    examples: ["Catch this point, then expand it.", "Pull the emotion back and raise the force.", "Open the first half, close the second, and land on the human point."],
    normal: "A team shares the exact context and uses the phrase as live shorthand.",
    avoid: "Name the object, editing location, and observable result.",
    prompt: "Do not use compressed editing verbs. State the exact location and completed result."
  },
  "raise-the-theme": {
    request: "It is just a meeting-notes feature. Why are we turning it into a statement about human connection?",
    quote: "“It is not merely a faster way to write meeting notes. In an age accelerated by technology, it helps us rediscover genuine human connection.”",
    better: "“It turns a meeting recording into decisions and action items, reducing manual follow-up.”",
    tagline: "A routine feature receives social, personal, or historical meaning absent from the source.",
    why: "A larger claim needs people, conflict, long-term impact, or evidence. Without them, the conclusion exceeds the facts.",
    examples: ["A to-do list carries our attempt to reimagine order in everyday life.", "This is more than an interface update. It is a gentle answer to the future of work.", "When technology steps back, people can finally become the owners of their time again."],
    normal: "The source includes real people, long-term impact, and enough evidence for the claim.",
    avoid: "Show the evidence behind the interpretation. Otherwise stop at the problem the product solves.",
    prompt: "Do not inflate the theme. Keep the conclusion within the results supported by the source."
  },
  "engineering-posture": {
    request: "Just tell me what changed. Phrases like “hard cut” and “close the loop” do not help.",
    quote: "“I made one hard cut: lock down the logic, close the structure, ship the plan, and form a minimum closed loop.”",
    better: "“I removed the repeated paragraph and connected Save to the existing submit flow. Save and refresh both pass.”",
    tagline: "A forceful engineering tone replaces the actual change, evidence, and verification.",
    why: "Engineering metaphors can be valid. Applied to every task, they communicate posture without telling the reader what changed.",
    examples: ["Add one more cut.", "Build the minimum closed loop.", "This approach is harder and more robust."],
    normal: "The team is discussing a real engineering boundary and the object is already explicit.",
    avoid: "Report what was removed, added, preserved, and tested.",
    prompt: "Replace engineering posture with exact files, fields, states, and test results."
  },
  "user-validation": {
    request: "Please stop telling me I am right. I just want to know whether this idea actually works.",
    quote: "“Your judgment is exactly right, and it reaches the deepest and most essential layer of the issue.”",
    better: "“Your idea is partly right: the hero is too long, but the main problem is repeated content, not word count alone.”",
    tagline: "The response certifies the user as correct or insightful before checking the premise.",
    why: "Unsupported praise can hide a false premise. The user needs a judgment and evidence, not validation.",
    examples: ["That is an exceptionally elegant conclusion.", "Your thinking is already remarkably deep.", "You are already an expert in this field."],
    normal: "The response names the specific claim and provides evidence that supports it.",
    avoid: "State which facts hold and which assumptions need correction.",
    prompt: "Do not rate my insight. Check my premise and explain the conclusion with evidence."
  },
  "not-x-but-y": {
    request: "It is just a product update. Why does it sound like we are redefining the future?",
    quote: "“This is not a simple product update. It is a redefinition of efficiency, collaboration, and the future of work.”",
    better: "“This update separates Save from Publish, reducing accidental publishing.”",
    tagline: "A fixed contrast creates the appearance of insight without a useful distinction.",
    why: "Contrast helps when two concepts are genuinely easy to confuse. Repetition turns every small change into a grand claim.",
    examples: ["Not a feature, but an experience.", "Not a tool, but a partner.", "Not only efficiency, but possibility."],
    normal: "X and Y are easy to confuse and the text explains their boundary.",
    avoid: "Remove the frame and read the remaining claim. If no information is lost, keep the direct sentence.",
    prompt: "Remove the “not X, but Y” frame and state what the feature changes."
  },
  "conclusion-first": {
    request: "This is a simple question. Can you just give me the answer without the long setup?",
    quote: "“Let me put the conclusion first: your instinct is completely right. I will unpack it in three points.”",
    better: "“Yes. This property affects only the current element, not the other cards.”",
    tagline: "A fixed preamble announces the conclusion, structure, and authority before answering.",
    why: "Long answers may need a summary. Repeating “one-line answer,” “bottom line,” and “three points” across routine questions makes every task sound scripted.",
    examples: ["The short answer: yes, and it is absolutely worth doing.", "In one sentence: your direction is completely right.", "First the answer, then I will unpack the underlying logic."],
    normal: "The material is long and readers need the conclusion before deciding whether to continue.",
    avoid: "Answer short questions directly. Let sections emerge from the content instead of announcing a fixed count.",
    prompt: "Answer directly. Do not use “the short answer,” “bottom line,” or “three points” as a standard opening."
  },
  "fragmented-bullets": {
    request: "These ideas belong in a sentence. Why split them into a pile of bullets and numbered fragments?",
    quote: "“Conclusion:\n• Feasible\n• Fast\n• Low risk\n1. Revise\n2. Review\n3. Confirm”",
    better: "“This is feasible. Revise the repeated copy, then check the desktop and mobile pages. Submit only after the layout and interactions work.”",
    tagline: "One connected judgment becomes a stack of tiny fragments, leaving the reader to reconstruct the logic.",
    why: "Lists help with peer options and ordered steps. Generated answers often split continuous reasoning into headings, dashes, bullets, and numbers so that causes, conditions, and contrasts disappear.",
    examples: ["— Context: clear\n— Problems: several\n— Advice: improve", "• Review\n• Enhance\n• Polish", "1. Feasible\n2. Recommended\n3. Worthwhile"],
    normal: "Readers need to scan peer items, a checklist, or steps that must happen in a specific order.",
    avoid: "Use sentences and paragraphs for causes, conditions, and contrasts. Use a list only for real peers or sequence, and name the object and result in each item.",
    prompt: "Do not split continuous reasoning into many short bullets or mix dashes, bullets, and numbers. Use complete sentences unless the content is a true list or sequence."
  },
  "if-you-want": {
    request: "That answers it. You do not need to offer another version every time.",
    quote: "“If you want, I can immediately produce another version.”",
    better: "“I removed the three repeated sentences. The heading and factual content are unchanged.”",
    tagline: "Every answer ends by selling another round of work.",
    why: "When the task is complete, an automatic invitation lengthens the exchange and makes the ending feel scripted.",
    examples: ["I can keep expanding if you want.", "I can also provide three more versions.", "I can help you implement it next."],
    normal: "The task has two real branches and requires a user choice.",
    avoid: "End when the task is complete. Ask one concrete question only when a decision is missing.",
    prompt: "Finish the current task and stop. Do not automatically invite another step."
  },
  "abstract-boosters": {
    request: "This sounds impressive, but I still cannot tell what the product actually does.",
    quote: "“Unlock your potential and elevate the experience.”",
    better: "“Upload a CSV and get a chart plus an editable written summary.”",
    tagline: "Abstract verbs promise improvement without naming an input, output, or workflow.",
    why: "The words can be valid. A cluster of them becomes filler when the reader still cannot tell what the product does.",
    examples: ["Unleash creativity.", "Empower every team.", "Elevate your workflow."],
    normal: "A concrete object, action, and verifiable outcome follow immediately.",
    avoid: "Name what the user provides, what the product does, and what it returns.",
    prompt: "Replace abstract verbs with the actual input, action, and output."
  },
  delve: {
    request: "Can you just get to the point instead of opening with “Let’s delve into…”?",
    quote: "“Let’s delve into this fascinating topic.”",
    better: "“This release adds offline editing and syncs changes when the connection returns.”",
    tagline: "The opening announces analysis before naming the current problem.",
    why: "Delve is normal in formal writing. It becomes a tell when bundled with abstract words such as intricate, realm, and journey.",
    examples: ["Delve into the intricacies.", "Embark on a journey.", "Explore the fascinating realm."],
    normal: "The piece needs a formal register and immediately names a clear subject.",
    avoid: "Begin with the problem, object, or conclusion.",
    prompt: "Start with the subject and conclusion. Do not announce that you will delve into it."
  },
  "landscape-tapestry": {
    request: "What does this actually mean? Please drop the landscape and tapestry metaphors.",
    quote: "“Navigate the intricate tapestry of a changing landscape.”",
    better: "“The product finds repeated issues across support tickets.”",
    tagline: "Scenery and textile metaphors replace the real object being discussed.",
    why: "A metaphor can clarify one relationship. Several metaphors in one sentence make the subject harder to identify.",
    examples: ["the digital landscape", "a rich tapestry of ideas", "the ever-evolving ecosystem"],
    normal: "The whole piece uses one metaphor that materially improves understanding.",
    avoid: "Use the real names of the product, user, data, and action.",
    prompt: "Replace decorative metaphors with the real product, user, data, and action."
  },
  "in-todays-world": {
    request: "Skip the broad opening and tell me what has actually changed.",
    quote: "“In today’s fast-paced, ever-evolving world…”",
    better: "“Remote teams now spend more time reviewing asynchronous updates.”",
    tagline: "A universal era-setting opening can be attached to almost any subject.",
    why: "It does not narrow the problem or add information. The next sentence can usually begin the piece.",
    examples: ["In the digital age…", "In an ever-changing landscape…", "Now more than ever…"],
    normal: "Historical change is the subject and the text provides dates, events, or data.",
    avoid: "Open with the specific change, object, or problem.",
    prompt: "Remove the universal opening and begin with the specific change or problem."
  },
  "centered-hero": {
    request: "Can we show the product first? Right now it is just another big headline with two buttons.",
    quote: "A large heading, two lines of copy, and two buttons are always centered.",
    tagline: "The hero ignores the product task, available evidence, and primary action.",
    why: "A centered hero works for one short claim. Complex products need room for the interface or evidence users must judge first.",
    examples: ["Oversized heading", "Two equal buttons", "Product UI pushed below the fold"],
    normal: "The page has one short claim and one obvious next step.",
    avoid: "Choose the hero around the first thing users need to judge: interface, data, process, or action.",
    prompt: "Arrange the hero around the user’s main task. Do not center a heading and two buttons by default."
  },
  "three-equal-cards": {
    request: "These three things are not equally important. Why do they all get the same card?",
    quote: "Every feature becomes one of three equal cards.",
    tagline: "A neat three-column layout hides real differences in priority and sequence.",
    why: "Three cards work for three peer objects. They fail when a primary task, supporting feature, and evidence become equal.",
    examples: ["Matching icons", "Matching title length", "Matching one-line descriptions"],
    normal: "The three objects are peers and do not require an order.",
    avoid: "Rank the main task and supporting information before assigning space and position.",
    prompt: "These features have different priorities. Do not present them as three equal cards."
  },
  "purple-glow": {
    request: "Why is everything glowing purple? It does not look like our brand.",
    quote: "Dark background, purple gradient, blurred orb, and glowing border appear together.",
    tagline: "Visual effects create generic “tech” atmosphere without a brand or state-related reason.",
    why: "Purple and gradients can be valid. The full bundle becomes generic when it has no relationship to product information.",
    examples: ["Blurred orb", "Glowing border", "Decorative grid background"],
    normal: "The brand uses these colors or the glow communicates a real selected or running state.",
    avoid: "Start with brand assets and product UI. Keep decoration only when it explains content or state.",
    prompt: "Keep brand-backed color and remove gradients, glows, and grids that explain no content or state."
  },
  "rounded-everything": {
    request: "The outer panel already has a boundary. Why are there three more cards inside it?",
    quote: "The page sits in a panel, each section sits in a card, and the card’s heading, copy, and actions get more containers.",
    tagline: "Containers replace content relationships, so more boundaries make the page feel fragmented.",
    why: "A container can identify an independent object or interaction area. Generated interfaces often package every heading, description, and action without deciding which content belongs together.",
    examples: ["Cards nested inside matching cards", "Separate boxes around a heading and its description", "Outlined list items inside an outlined panel", "A pill above every small heading"],
    normal: "The component is independent or interactive and the boundary helps identify it.",
    avoid: "Group with headings, order, and whitespace first. Keep one boundary only for an independent object, interaction area, or state.",
    prompt: "Audit nested containers. Remove inner cards that do not mark an independent object or interaction area, then group with headings, order, and whitespace."
  },
  "divider-everywhere": {
    request: "These items already belong together. Why is there a rule between every two lines?",
    quote: "There is a rule below the heading, another below the description, and more between every item until the page becomes a grid.",
    tagline: "Rules appear without real boundaries, replacing whitespace, headings, and content order.",
    why: "Generated interfaces often translate “clear sections” directly into more lines. When every boundary is visible, users cannot tell which one matters and continuous content loses breathing room.",
    examples: ["A rule below every heading", "Dividers between every sidebar item", "A bordered card with more rules between every row", "A horizontal rule between every two paragraphs"],
    normal: "Dense tables, grouped menus, or adjacent repeated items need a boundary to support scanning.",
    avoid: "Use spacing and heading hierarchy first. Keep one subtle divider only when adjacent objects remain hard to distinguish.",
    prompt: "Remove dividers that do not mark a real group change. Organize with headings and spacing first, then keep a subtle rule only where adjacent content is still unclear."
  },
  "left-border-callouts": {
    request: "These are ordinary descriptions. Why does every block need a colored line on the left?",
    quote: "Headings, descriptions, and advice all become quote-like blocks with a colored left border, as if every sentence were a callout.",
    tagline: "Ordinary content gets a left accent border until quotes, alerts, and body copy look the same.",
    why: "A left border can identify a quote, notice, state, or selection. Generated interfaces often reuse it as decoration on ordinary cards and paragraphs, sometimes with a different color on every block and no stable meaning.",
    examples: ["A colored left border on every feature card", "Ordinary body copy styled as a blockquote", "Blue, purple, and green borders with no state or category meaning", "A top accent and left accent on the same section"],
    normal: "The content is a real quote, alert, or selected state, and the left border carries the same meaning throughout the product.",
    avoid: "Organize ordinary content with headings, type, spacing, and restrained backgrounds. Keep the border only when it consistently communicates a quote, state, or selection.",
    prompt: "Audit every left accent border. Remove decorative borders from ordinary cards and descriptions; keep one consistent treatment only for real quotes, alerts, or selected states."
  },
  "heavy-headline": {
    request: "This heading is huge, heavy, and cramped. Can we make the two lines readable first?",
    quote: "A long heading uses an oversized font, the heaviest weight, and near-solid line height until two or three lines form a dark block.",
    tagline: "Size, weight, and tight line height become strong at the same time, turning a multiline heading into a dark block.",
    why: "Generated designs often translate “impactful” into bigger and heavier type without checking long titles, dense glyphs, or mobile wrapping.",
    examples: ["64px type at weight 900 with tight leading", "Every line of a long title uses the heaviest weight", "Page and section headings carry equal weight", "Mobile wrapping leaves almost no space between lines"],
    normal: "The heading is short, the display face supports heavy weight, and wrapping and readability have been checked on desktop and mobile.",
    avoid: "Check size, weight, line height, and copy length together. Preserve legibility after wrapping before adding visual impact.",
    prompt: "Review heading size, weight, and line height together. Reduce the dark-block effect and verify multiline headings at mobile width."
  },
  "emoji-icons": {
    request: "Can we lose the rockets and sparkles? They make the feature cards look generic.",
    quote: "Every feature card gets a large emoji: \uD83D\uDE80 Fast launch, ✨ AI generation, \uD83D\uDEE1️ Enterprise security.",
    tagline: "Generic emoji replace a deliberate icon system and add a colorful symbol to every heading.",
    why: "Emoji change across operating systems and are hard to align in size, color, and detail. Rockets, sparkles, and shields rarely distinguish the product’s actual features.",
    examples: ["\uD83D\uDE80 Lightning fast", "✨ AI-powered", "\uD83C\uDFAF Precision targeting", "\uD83D\uDEE1️ Secure"],
    normal: "Emoji are part of the brand, or the product serves children, chat, or casual social use.",
    avoid: "Remove the icon when the title is enough. When recognition needs an icon, use one consistent set and match each symbol to the real feature.",
    prompt: "Remove emoji from the feature cards. Use the existing icon library only when an icon helps identify the feature."
  },
  "motion-everywhere": {
    request: "I am just reading the page. Why does every section have to move before it appears?",
    quote: "Headings fade in, cards rise, buttons bounce, and glowing dots pulse as every scroll position triggers another animation.",
    tagline: "Motion explains no state or spatial relationship; it only delays and moves the content.",
    why: "A request for micro-interactions can easily become movement on every element. Each effect looks polished alone, but together they interrupt reading and can make motion-sensitive users uncomfortable.",
    examples: ["Every section fades in on scroll", "Every card lifts on hover", "Buttons and glows pulse forever"],
    normal: "Motion explains a page transition, object origin, or action result, or dynamic storytelling is central to the brand.",
    avoid: "Keep one movement that actually explains something. Show the rest immediately and honor reduced-motion preferences.",
    prompt: "Remove entrance, lift, and pulse animations that explain no state or spatial relationship. Keep necessary motion and test reduced-motion preferences."
  },
  "fake-responsive": {
    request: "The sidebar, table, and buttons are all squeezed into one long mobile page. It is harder to use than desktop.",
    quote: "Three desktop columns become one stack, the sidebar comes first, the primary task moves far down, and the wide table still scrolls sideways.",
    tagline: "Mobile only stacks desktop content instead of reconsidering tasks, navigation, and touch controls.",
    why: "Responsive design is not finished when overflow disappears. The available space and input method change on a small screen; copying desktop order creates a longer page and hides the primary action.",
    examples: ["Sidebar before the main content", "A wide table scaled down", "Desktop toolbar wrapped onto three lines"],
    normal: "The content is a true peer list and its single-column order matches the mobile task.",
    avoid: "Keep the primary mobile task first, collapse secondary navigation, adapt tables, and verify touch targets.",
    prompt: "Do not merely stack the desktop layout. Reorder navigation, content, tables, and actions around the primary mobile task."
  },
  "description-everywhere": {
    request: "These category names are already clear. Why add “Manage your knowledge here” above them?",
    quote: "Workspaces, categories, cards, forms, and buttons all get a paraphrased description full of “here you can” and “helps you.”",
    tagline: "Supporting copy adds no condition, format, or consequence; it only repeats the nearby label or action.",
    why: "Generated interfaces often interpret “make it clear” as “explain every region.” Repeated copy takes space and makes information that actually affects an action harder to find.",
    examples: ["A notes sidebar says “Manage your knowledge here” above its categories", "Recent notes is followed by “View notes you opened recently”", "New page is followed by “Click here to create a new page”", "Team members is followed by “Manage your team members”", "Basic information is followed by “Enter your basic information”"],
    normal: "The copy provides a format, condition, consequence, or an explanation of an unfamiliar concept.",
    avoid: "Delete a sentence if removing it loses no information. Keep only copy that changes a choice, input, or interpretation of the result.",
    prompt: "Remove sidebar, card, and form descriptions that only repeat headings or actions. Keep necessary formats, conditions, consequences, and unfamiliar concepts."
  },
  "naming-drift": {
    request: "This says New, the empty state says Add, and the dialog says Create. Are they the same action?",
    quote: "The sidebar says New note, the empty state says Add page, and the dialog button says Create document even though all three start the same action.",
    tagline: "The same object or action changes names across the interface, so users cannot tell whether it is still the same thing.",
    why: "A generated interface can choose a locally plausible word for each screen without maintaining shared product nouns and verbs. Longer flows drift more easily.",
    examples: ["New, add, and create mean one action", "Save, submit, and finish mean one result", "Delete, remove, and clear have unexplained consequences", "Project, space, and workspace name one object", "Sign-in uses account while settings uses profile for the same object"],
    normal: "Different terms identify different objects, scopes, or consequences, and the interface makes that difference clear.",
    avoid: "Choose one noun and verb for each primary object and action, then reuse them in navigation, buttons, dialogs, messages, and errors.",
    prompt: "Audit the full note-creation flow. Use one object name and one action name instead of switching between New, Add, and Create."
  },
  "inert-controls": {
    request: "Nothing changes when I click this filter. Why make it look functional?",
    quote: "Search, filter, favorite, and export all look complete, but clicking changes no data, state, or page.",
    tagline: "A high-fidelity shell looks finished while its controls have no real result or prototype boundary.",
    why: "Generation tools can complete a familiar interface shell quickly and add common controls by default. Users read those controls as functional and cannot tell whether silence means broken, loading, or never implemented.",
    examples: ["Filtering leaves the list unchanged", "Favorite has no selected state", "Export only shows a fake success toast"],
    normal: "A wireframe or demo clearly states that it is static and participants know the interaction is out of scope.",
    avoid: "Every visible control needs a real result and feedback. Remove, disable with an explanation, or mark unsupported actions as static.",
    prompt: "Audit every control that looks clickable. Implement a real result and feedback, or remove the interactive appearance when the action is unsupported."
  },
  "icon-button-maze": {
    request: "I cannot tell which icon deletes the item, and there is no hover hint on a phone.",
    quote: "Edit, copy, share, archive, and delete are reduced to similar line icons with no visible names.",
    tagline: "Critical actions become pictures users must guess, while touch and assistive technology receive no name.",
    why: "Icons can save space, but many actions have no stable universal symbol. Generated interfaces often use a clean row of icons while omitting visible labels, accessible names, and confirmation for dangerous actions.",
    examples: ["Five unlabeled icons on every table row", "Meaning appears only on hover", "Archive and delete use similar symbols"],
    normal: "The symbol is highly conventional, has an accessible name, and the context prevents ambiguity.",
    avoid: "Name primary actions directly. Give secondary icons visible help and accessible names, and never make dangerous actions a guessing game.",
    prompt: "Audit every icon button. Show text for primary actions, add visible help and accessible names elsewhere, and confirm destructive actions."
  }
};
let d = [{
  id: "catch-you",
  category: "zh",
  title: "稳稳接住",
  name: "Performed Empathy",
  request: "你正常说就行，别再说什么“稳稳接住我”了。",
  quote: "“你不是太敏感，你只是太清醒了。我就在这里，不躲、不藏、不绕，稳稳地接住你。”",
  better: "“我明白。把那段内容发来，我帮你看看哪里不对。”",
  tagline: "把“我明白”说成“稳稳接住你”，意思能猜到，听起来却不像真人日常说话。",
  why: "“接住你、托住情绪”把普通回应换成了现实交流里很少出现的说法。每个词都没错，连起来却很别扭；模型反复这样说，就成了明显的 AI 口癖。",
  examples: ["这一次，我会稳稳地接住你的每一份情绪。", "你的疲惫，我先替你轻轻托住。", "我会陪你把这一段情绪慢慢走完。"],
  normal: "小说、广告或角色台词本来就需要这种非日常表达。",
  avoid: "先写真正想表达的意思，再看真人在当前场景里会不会这样说。普通回应直接说“我明白”“我来看看”就够了。",
  prompt: "把“稳稳接住你、托住你的情绪”这类不自然的说法删掉。保留原意，改成真人在当前场景里会直接说的话。",
  related: ["user-voice"],
  preview: "catch"
}, {
  id: "single-verbs",
  category: "zh",
  title: "单字动作",
  name: "Compressed Verbs",
  request: "你怎么老说收一下、提一层、落回去？正常说话不这么说。",
  quote: "“先把问题收紧，把逻辑顺一下，再把结论往上提一层，最后稳稳落住。”",
  better: "“把第二段缩短，结尾直接写‘自动整理会议结论和待办’。”",
  tagline: "一句话里反复用“提、收、落、顺”，像把普通说法硬改成一串单字动作。",
  why: "这些字本来都是正常动词，AI 却喜欢把它们配给问题、逻辑、情绪和结论。“把情绪收一下、把力量提一层、最后稳稳落住”似懂非懂，真人很少这样密集地说。",
  examples: ["这个点先接一下，再往下铺。", "情绪往回收，力量再往上提。", "前面铺开，后面拢住，最后往人身上落。"],
  normal: "剪辑、排版或表演指导中，这些动作有明确含义，而且团队平时就这样说。",
  avoid: "先按日常说法重写。删掉“提、收、落、顺”以后原意没有变化，就不需要硬加这些动作。",
  prompt: "删掉密集出现的“提、收、落、顺、接”这类单字动作。保留原意，改成真人在当前场景里会直接说的话。",
  related: ["label"],
  preview: "verbs"
}, {
  id: "decorative-quotes",
  category: "zh",
  title: "什么都要加双引号",
  name: "Decorative Quotation Marks",
  request: "这些词本来就是正常意思，为什么都要特意加个引号？",
  quote: "“我们先把‘真实’放回产品里，再让‘用户’重新成为体验的主角。”",
  better: "“先删掉没有来源的评价，再把真实用户反馈放到产品页。”",
  tagline: "普通词也要加上双引号，好像每个词都另有深意。",
  why: "双引号本来用于引用、特殊称谓或反讽。AI 却常给真实、用户、价值、看见、连接这类普通词加引号，硬造一种意味深长的语气，真人很少整段这样写。",
  examples: ["让“价值”真正被“看见”。", "把“人”重新放回“体验”中心。", "这不是“功能”，而是一种“连接”。"],
  normal: "正在引用原话、标出特殊称谓，或上下文确实需要表示反讽。",
  avoid: "删掉引号再读一遍。词义没有变化，就直接写这个词；只有真正的引用、特殊称谓和反讽才保留。",
  prompt: "删掉普通词外面没有作用的双引号。只保留原话引用、特殊称谓和确实需要表达反讽的引号。",
  related: ["typography", "label"],
  preview: "quotes"
}, {
  id: "inflated-metaphors",
  category: "zh",
  title: "动不动就来个夸张比喻",
  name: "Inflated Metaphors",
  request: "就说这个功能解决什么，别又写成灯塔、桥梁、钥匙。",
  quote: "“它不是一款普通工具，而是一座穿越信息迷雾的灯塔，为每一个迷失在效率洪流中的人照亮前路。”",
  better: "“它把散落的会议记录整理成结论和待办。”",
  tagline: "普通功能被写成灯塔、桥梁、钥匙和引擎，句子很大，实际意思很小。",
  why: "比喻本来是帮助人理解陌生关系。AI 却喜欢用灯塔、桥梁、钥匙、翅膀和引擎包装普通功能，有时一句话还混用好几个，读起来夸张又不自然。",
  examples: ["为创作者插上想象的翅膀。", "搭建人与信息之间的桥梁。", "成为团队穿越不确定性的灯塔。"],
  normal: "一个统一的比喻确实能帮助读者理解复杂关系，而且全文没有继续混用其他比喻。",
  avoid: "先写真实对象、动作和结果。比喻没有让关系更好懂，或者只是让句子显得宏大，就直接删掉。",
  prompt: "删掉灯塔、桥梁、钥匙、翅膀、引擎这类夸张比喻。保留原意，直接写清对象、动作和结果。",
  related: ["label", "cta"],
  preview: "metaphor"
}, {
  id: "raise-the-theme",
  category: "zh",
  title: "提升立意",
  name: "Forced Elevation",
  request: "这不就是个会议纪要功能吗？别一下扯到人与人连接那么大。",
  quote: "“它解决的从来不只是会议纪要的效率问题，更是在这个被技术加速的时代，帮我们重新找回人与人之间真实的连接。”",
  better: "“它把会议录音整理成结论和待办，减少会后手动整理。”",
  tagline: "普通功能明明只解决一个小问题，却被写成人生、社会或时代意义。",
  why: "文章可以有立意，但立意需要人物、冲突、长期影响或可验证的变化。没有材料时，拔高只会让结论大于事实。",
  examples: ["一个待办清单，承载的是我们对生活秩序的重新想象。", "这不仅是一次界面升级，更是对未来工作方式的温柔回应。", "当技术退到身后，人终于可以重新成为时间的主人。"],
  normal: "原材料确实提供了长期影响、人物经历和足以支持判断的证据。",
  avoid: "先写出材料和判断之间的关系；材料不足就停在产品实际解决的问题。",
  prompt: "不要提升立意。结尾只保留原材料能够支持的结果，不增加时代、社会或人性意义。",
  related: ["ai-hallucination"],
  preview: "elevate"
}, {
  id: "engineering-posture",
  category: "zh",
  title: "满口砍一刀、收口、闭环",
  name: "Engineering Posture",
  request: "你正常说就行，别一开口就是砍一刀、收口、闭环。",
  quote: "“这版我直接砍一刀：先把逻辑压实，再把结构收口，最后把方案落盘，形成一个最小闭环。”",
  better: "“我把重复的第二段删了，保存按钮也能用了。”",
  tagline: "把普通修改说成“砍一刀、压实、收口、闭环”，像在硬套互联网黑话，听起来很不自然。",
  why: "这些词并非不能用，做互联网和技术工作的人也会偶尔说。AI 的特点是把多个词密集地串在一句话里，不管当前场景是否需要，整段像在模仿某种职场口吻。",
  examples: ["这里再补一刀，整体就更稳了。", "先把逻辑压实，再把表达收口。", "最后落盘，形成一个最小闭环。"],
  normal: "团队平时本来就这样说，而且单个词在当前工作里有明确含义。",
  avoid: "保留真正必要的行业词，其余改成当前场景里最自然的说法，不要为了显得专业把几个黑话连在一起。",
  prompt: "删掉“砍一刀、压实、收口、闭环、落盘”这类密集出现的互联网黑话。保留原意，改成真人在当前场景里会直接说的话。",
  related: ["result", "test-case"],
  preview: "engineering"
}, {
  id: "user-validation",
  category: "zh",
  title: "动不动就夸你抓住本质",
  name: "User Validation",
  request: "我只是问这个想法行不行，别又说我抓住了本质。",
  quote: "“你这个判断非常准确，而且已经触及了问题最本质、最关键的那一层。”",
  better: "“这个想法有一半成立：首屏确实太长，但主要问题是前两段重复，不只是字数多。”",
  tagline: "不管你说什么，都用“非常准确、抓住本质、思考很深”来夸，像固定的捧场话。",
  why: "真人会在有具体理由时肯定某一点，很少每次开口都先给一段高强度夸奖。AI 把它当成通用开场，语气会显得过度热情又不自然。",
  examples: ["你这个判断非常精准。", "你已经抓住最本质的那一层了。", "这个思考非常深，也非常高级。"],
  normal: "对方确实做成了一件事，而且你能具体说出哪一点值得肯定。",
  avoid: "需要肯定时只说具体哪一点；不需要时直接回应内容，不先套一段夸奖。",
  prompt: "删掉“非常准确、抓住本质、思考很深”这类固定捧场话。直接回应我说的内容。",
  related: ["ai-hallucination"],
  preview: "validate"
}, {
  id: "not-x-but-y",
  category: "zh",
  title: "不是 X，而是 Y",
  name: "Forced Contrast",
  request: "直接说这次更新做了什么，别又写成“不是更新，而是重新定义未来”。",
  quote: "“这不是一次简单的产品更新，而是一场关于效率、协作与未来工作方式的重新定义。”",
  better: "“这次更新把保存和发布拆成两个按钮，减少误发布。”",
  tagline: "遇到什么都先写成“不是 X，而是 Y”，像给普通内容套上固定的反转句。",
  why: "真人会在真正纠正误解时这样对比，AI 却把普通介绍也写成反转：不是工具，是伙伴；不是功能，是体验。句子看起来有力度，读多了却都像同一个模板。",
  examples: ["不是功能，是体验。", "不是工具，而是伙伴。", "不只是效率，更是可能性。"],
  normal: "对方确实把 X 误解成 Y，需要用一句对比把两者分开。",
  avoid: "没有真实误解要纠正，就直接说原本想表达的内容，不先制造一个反转。",
  prompt: "删掉反复出现的“不是 X，而是 Y”“不只是 X，更是 Y”。保留原意，改成自然的直接陈述。",
  related: ["typography"],
  preview: "contrast"
}, {
  id: "conclusion-first",
  category: "zh",
  title: "先说结论的套话",
  name: "Scripted Preamble",
  request: "这个问题很简单，直接告诉我答案就行，不用先铺一大段。",
  quote: "“我先把结论放在前面：你的直觉完全正确。下面我用三点把这件事讲透。”",
  better: "“可以。这个属性只影响当前元素，不会改到其他卡片。”",
  tagline: "答案还没出现，先来一句“直接说结论”，再宣布下面要分三点。",
  why: "复杂回答可以先给结论，但普通问题每次都用“一句话总结、直接说结论、分三点讲透”，会让不同任务听起来像同一份脚本。",
  examples: ["我先直接说结论：可以，而且非常值得。", "一句话总结：方向完全正确。", "先给答案，再把底层逻辑拆开讲清楚。"],
  normal: "内容很长，读者确实需要先知道结论，再决定是否继续阅读。",
  avoid: "短问题直接回答。需要分点时，让分点来自内容，不先宣布自己要分几点。",
  prompt: "直接回答问题，不要用“一句话总结、先说结论、下面分三点”作为固定开场。",
  related: ["user-voice", "typography"],
  preview: "conclusion"
}, {
  id: "fragmented-bullets",
  category: "zh",
  title: "每句话都拆成分点",
  name: "Fragmented List Writing",
  request: "这几句话明明能顺着说完，为什么又拆成一堆圆点和编号？",
  quote: "“结论：\n• 能做\n• 速度快\n• 风险低\n1. 先改\n2. 再看\n3. 最后确认”",
  better: "“可以做。先修改重复文案，再检查桌面和手机页面；确认显示与交互都正常后再提交。”",
  tagline: "一个完整判断被拆成许多只有几个字的项目，读者还得自己把逻辑拼回去。",
  why: "列表适合并列选项和操作步骤。AI 却常把连续说明切成标题、短横线、圆点和编号，每项只有几个字，因果、转折和条件都消失，阅读也变得不断起停。",
  examples: ["— 背景：清楚\n— 问题：较多\n— 建议：优化", "• 先梳理\n• 再提升\n• 最后完善", "1. 可以\n2. 推荐\n3. 值得"],
  normal: "需要快速扫读一组并列项、检查清单，或必须按顺序完成的步骤。",
  avoid: "因果、转折和条件用完整句子或段落说清。只有内容真正并列或有先后顺序时才用列表，并在每一项里写清对象和结果。",
  prompt: "不要把连续说明拆成大量短分点，也不要混用短横线、圆点和编号。能用一两段完整句子说清就直接写；只有并列项或步骤才使用列表。",
  related: ["list", "user-voice"],
  preview: "fragmented-bullets"
}, {
  id: "if-you-want",
  category: "zh",
  title: "如果你愿意",
  name: "Automatic Follow-up",
  request: "说完就行了，不用每次最后都问我要不要再来一版。",
  quote: "“如果你愿意，我下一步可以直接给你一版。”",
  better: "“三处重复句子已经删掉，标题和事实内容没有改。”",
  tagline: "事情已经说完了，结尾还要问你要不要再来一版。",
  why: "任务已经回答完时，固定邀约会拖长对话，还让结尾像客服脚本。",
  examples: ["如果你愿意，我可以继续展开。", "需要的话，我还能再给三个版本。", "我也可以直接帮你落地。"],
  normal: "当前任务确实存在两个需要用户选择的分支。",
  avoid: "任务完成就结束。只有缺少关键选择时，才提出一个具体问题。",
  prompt: "完成当前任务后直接结束，不要自动邀请我继续下一步。",
  related: ["cta"],
  preview: "invite"
}, {
  id: "abstract-boosters",
  category: "en",
  title: "Unlock / Elevate",
  name: "Abstract Boosters",
  request: "这段话听着挺厉害，可我还是没看懂产品到底能干什么。",
  quote: "“Unlock your potential and elevate the experience.”",
  better: "“上传 CSV，得到图表和一段可编辑的结论。”",
  tagline: "抽象动词承诺能力和提升，却不说明输入、输出和工作流程。",
  why: "这些词本身没有错。多个抽象动作连续出现，而且用户仍不知道产品做什么时，文案就只剩气氛。",
  examples: ["Unleash creativity.", "Empower every team.", "Elevate your workflow."],
  normal: "后面紧跟具体对象、操作和可验证结果。",
  avoid: "写清用户提供什么，产品处理什么，最后得到什么。",
  prompt: "Replace abstract verbs with the actual input, action, and output.",
  related: ["cta"],
  preview: "abstract"
}, {
  id: "delve",
  category: "en",
  title: "Delve",
  name: "Stock Analysis Verb",
  request: "能不能直接说重点？别每次都从“Let’s delve into…”开始。",
  quote: "“Let’s delve into this fascinating topic.”",
  better: "“这次更新支持离线编辑，恢复网络后会自动同步改动。”",
  tagline: "开头先宣布深入探讨，迟迟不说当前问题是什么。",
  why: "Delve 在正式写作里可以正常使用。它与 intricate、realm、journey 等抽象词成套出现时，更像生成模板。",
  examples: ["Delve into the intricacies.", "Embark on a journey.", "Explore the fascinating realm."],
  normal: "文章确实需要正式语体，而且紧接着给出明确主题和分析对象。",
  avoid: "从问题、对象或结论开始，不介绍自己即将如何写作。",
  prompt: "Start with the subject and conclusion. Do not announce that you will delve into it.",
  related: ["typography"],
  preview: "delve"
}, {
  id: "landscape-tapestry",
  category: "en",
  title: "Landscape / Tapestry",
  name: "Decorative Abstractions",
  request: "这句到底想说什么？别绕什么 landscape、tapestry 了。",
  quote: "“Navigate the intricate tapestry of a changing landscape.”",
  better: "“产品会从客服工单中找出反复出现的问题。”",
  tagline: "用风景、织物和旅程隐喻代替正在讨论的真实对象。",
  why: "隐喻可以帮助理解；一段话连续堆叠多个隐喻时，读者反而更难确认主语和关系。",
  examples: ["the digital landscape", "a rich tapestry of ideas", "the ever-evolving ecosystem"],
  normal: "全文围绕同一个有解释作用的隐喻组织。",
  avoid: "换回产品、用户、页面、数据和动作的真实名称。",
  prompt: "Use the real names of the product, user, data, and action instead of decorative metaphors.",
  related: ["label"],
  preview: "landscape"
}, {
  id: "in-todays-world",
  category: "en",
  title: "In Today’s World",
  name: "Universal Opening",
  request: "前面这句时代背景可以删了，直接说现在到底变了什么。",
  quote: "“In today’s fast-paced, ever-evolving world…”",
  better: "“远程团队现在需要花更多时间检查异步更新。”",
  tagline: "用任何主题都能套用的时代背景开头。",
  why: "这类开头没有缩小问题，也没有提供信息。删除以后，正文通常可以直接开始。",
  examples: ["In the digital age…", "In an ever-changing landscape…", "Now more than ever…"],
  normal: "时代变化本身就是主题，而且后面有时间、事件或数据支撑。",
  avoid: "第一句直接写当前变化、具体对象或读者需要处理的问题。",
  prompt: "Remove the universal opening and begin with the specific change or problem.",
  related: ["user-voice"],
  preview: "opening"
}, {
  id: "centered-hero",
  category: "ui",
  title: "居中大标题",
  name: "Centered Hero Default",
  request: "能不能先把产品界面放出来？现在又是一个大标题加两个按钮。",
  quote: "大标题、两行说明、两个按钮永远居中排列。",
  tagline: "不管产品是什么，都先放一个居中大标题、两行说明和两个按钮。",
  why: "居中首屏适合单一、简短的主张。复杂产品仍套用同一结构时，真实界面和关键操作会被推到首屏以下。",
  examples: ["标题占满首屏", "两个同级按钮", "产品界面只露出一角"],
  normal: "页面只需要传达一个简短主张，用户下一步也非常明确。",
  avoid: "根据用户首先要判断的内容决定首屏：产品界面、数据、流程或操作都可以放在最前面。",
  prompt: "先按用户进入页面后的主要任务安排 Hero，不要默认把标题和两个按钮全部居中。",
  related: ["hero", "centered-layout", "cta"],
  preview: "centered"
}, {
  id: "three-equal-cards",
  category: "ui",
  title: "三张等宽卡片",
  name: "Three-card Default",
  request: "这三个功能明明有主次，为什么都做成一样大的卡片？",
  quote: "所有功能都被压成三个同样大小、同样结构的卖点。",
  tagline: "主要功能和次要功能全做成一样大的卡片，看不出先看什么、先做什么。",
  why: "三张卡适合三个并列对象。主要功能、辅助功能和证据被做成同级时，用户看不出先后关系。",
  examples: ["统一图标", "统一标题长度", "统一一行说明"],
  normal: "三个对象职责并列，信息量接近，用户不需要按顺序完成。",
  avoid: "先标出主要任务和辅助信息，再按重要程度分配面积、位置和细节。",
  prompt: "这三个功能重要程度不同，不要做成等宽卡片。按用户完成任务的顺序重新安排。",
  related: ["card", "card-grid-layout", "style-bento"],
  preview: "three-cards"
}, {
  id: "purple-glow",
  category: "ui",
  title: "蓝紫渐变光球",
  name: "Purple Glow Default",
  request: "怎么又是蓝紫渐变和发光球？这跟我们的品牌没什么关系。",
  quote: "深色背景、蓝紫渐变、模糊光球和发光描边同时出现。",
  tagline: "颜色和光效跟品牌、内容都没关系，只是为了看起来像“科技产品”。",
  why: "紫色、渐变和光效都可以正常使用。它们与产品信息没有关系，而且整套出现时，页面很容易和其他生成站点相似。",
  examples: ["模糊光球", "发光边框", "随机网格背景"],
  normal: "品牌本来使用这些颜色，或光效确实表示选中、运行和能量状态。",
  avoid: "先使用品牌资产和真实界面；装饰效果需要能说明内容或状态。",
  prompt: "保留有品牌依据的颜色，删除与内容和状态无关的渐变光球、发光边框和网格背景。",
  related: ["gradient", "shadow", "backdrop-blur"],
  preview: "glow"
}, {
  id: "rounded-everything",
  category: "ui",
  title: "框里再套框",
  name: "Nested Containers",
  request: "外面已经有一个框了，里面怎么又套了三层卡片？",
  quote: "页面先装进大面板，区块再装进卡片，卡片里的标题、说明和按钮还各有一层边界。",
  tagline: "页面已经有一个大框，里面的标题、说明和按钮又被一层层框起来。",
  why: "边框本来是为了告诉用户“这是一个单独的东西”。AI 常把标题、说明和按钮全都装进框里，结果用户反而看不出哪些内容本来属于同一组。",
  examples: ["卡片里面再套同样的卡片", "标题和说明各有一层浅色框", "整页已经有面板，列表项还重复描边", "每个小标题都装进胶囊标签"],
  normal: "里面确实是一个可以单独查看或操作的东西，边框能帮助用户认出它。",
  avoid: "先用标题、顺序和留白分组。只有内容确实独立，或者需要标出可以操作的范围时，才保留一层边框。",
  prompt: "检查页面里一层套一层的框。删除没有实际作用的内层卡片，改用标题、顺序和留白分组。",
  related: ["card", "space", "border-radius"],
  preview: "rounded"
}, {
  id: "divider-everywhere",
  category: "ui",
  title: "每段都画分割线",
  name: "Divider Everywhere",
  request: "这些内容本来就是一组，为什么每两行之间都要画一条线？",
  quote: "标题下面一条线、说明下面一条线、每个列表项之间再一条线，页面被切成密密麻麻的小格。",
  tagline: "内容本来连在一起，却到处画线，页面被切成一小块一小块。",
  why: "AI 容易把“分区清楚”直接理解成增加线条。线越多，用户越难判断哪些边界重要，连续内容也失去呼吸感。",
  examples: ["每个标题下面都有横线", "侧栏每个分类之间都加线", "卡片已有描边，内部每行继续分隔", "文章每两段之间插入一条线"],
  normal: "密集表格、菜单分组或相邻重复项确实需要边界帮助扫读。",
  avoid: "先用间距和标题层级组织内容。只有相邻对象容易混淆时，才保留一条低对比度分割线。",
  prompt: "删除页面里不表示真实分组变化的分割线。先用标题和间距分区，只在相邻内容仍难区分时保留浅色线。",
  related: ["divider", "space", "typography"],
  preview: "divider-everywhere"
}, {
  id: "left-border-callouts",
  category: "ui",
  title: "左边都要加一条竖线",
  name: "Left-border Callout Default",
  request: "这些都是普通说明，为什么每一块左边都要加一条彩色竖线？",
  quote: "标题、说明和建议都被做成左侧带竖线的引用块，像每句话都需要重点强调。",
  tagline: "普通内容也套上左侧竖线，引用、提醒和正文看起来没有区别。",
  why: "左侧竖线常用来表示引用、提示、状态或选中。AI 容易把它当成通用装饰，给普通卡片和每段说明都加一根，甚至每块换一种颜色，结果边线抢走注意力，却没有稳定含义。",
  examples: ["每张功能卡左侧都有一条彩色竖线", "普通正文套用引用块样式", "蓝、紫、绿竖线没有对应状态或分类", "同一模块同时使用顶部强调线和左侧强调线"],
  normal: "内容确实是引用、告警或选中状态，而且左侧竖线在整套产品里始终表达同一含义。",
  avoid: "普通内容先用标题、字号、留白和局部底色组织。只有竖线能稳定表示引用、状态或选择时才保留，并由同一个组件统一维护。",
  prompt: "检查页面里所有左侧竖线。删除普通卡片和说明文字旁只用于装饰的边线；引用、告警或选中状态确实需要时，统一它的含义和样式。",
  related: ["quote", "alert", "card"],
  preview: "left-border-callouts"
}, {
  id: "heavy-headline",
  category: "ui",
  title: "又大又黑又挤",
  name: "Heavy Headline",
  request: "这个标题又粗又挤，两行字都快贴在一起了，能不能先让它好读一点？",
  quote: "长标题使用超大字号、最重字重和接近单倍的行高，换成两三行后挤成一块黑色。",
  tagline: "标题同时又大、又粗、行距又小，换成两三行以后挤成一团。",
  why: "AI 常把“有冲击力”直接翻译成更大、更粗，却不检查中文笔画密度、长标题换行和手机宽度。",
  examples: ["64px、900 字重配紧行高", "长标题每一行都使用最重字重", "页面标题和模块标题同样粗黑", "手机换行后上下笔画几乎贴住"],
  normal: "标题很短，展示字体适合重字重，而且桌面和手机上的换行与可读性都已检查。",
  avoid: "同时检查字号、字重、行高和标题长度。标题换行后先保证字面清楚，再决定需要多少视觉冲击。",
  prompt: "重新检查这组标题的字号、字重和行高。降低黑块感，并在手机宽度下确认多行标题不拥挤。",
  related: ["typography", "space", "serif-sans"],
  preview: "heavy-headline"
}, {
  id: "emoji-icons",
  category: "ui",
  title: "Emoji 当图标",
  name: "Emoji as Icons",
  request: "这些火箭、星星、盾牌看着太模板了，换成正常一点的图标吧。",
  quote: "每张功能卡都放一个大 Emoji：\uD83D\uDE80 快速启动、✨ 智能生成、\uD83D\uDEE1️ 安全可靠。",
  tagline: "不管功能是什么，都用火箭、星星、盾牌这类 Emoji 凑图标。",
  why: "Emoji 会随系统改变外观，大小、色彩和细节也难以统一。火箭、星星、盾牌被套进任何产品后，通常不能帮助用户区分真实功能。",
  examples: ["\uD83D\uDE80 极速体验", "✨ AI 智能生成", "\uD83C\uDFAF 精准触达", "\uD83D\uDEE1️ 安全可靠"],
  normal: "品牌本来就使用 Emoji，或者页面面向儿童、聊天和轻松社交场景。",
  avoid: "能通过标题理解时直接不用图标；确实需要识别时，选择同一套线性或填充图标，并让图形对应真实功能。",
  prompt: "删除功能卡里的 Emoji。只有图标确实帮助识别功能时，才从现有图标库选择同一风格的图标。",
  related: ["icon", "card", "label"],
  preview: "emoji"
}, {
  id: "motion-everywhere",
  category: "ux",
  title: "每块都要飞进来",
  name: "Motion Everywhere",
  request: "我只是往下看内容，为什么每一块都要晃一下才肯出现？",
  quote: "标题淡入、卡片上浮、按钮弹跳、光点呼吸，滚动到哪里都要先等一段动画。",
  tagline: "每个标题、卡片和按钮都在动，却没有帮助用户看懂页面发生了什么。",
  why: "生成页面很容易把“加点微交互”执行成每个元素都动。单个效果看着精致，整页同时出现时会打断阅读，也可能让对动态敏感的用户不适。",
  examples: ["每个区块滚动淡入", "卡片悬停统一上浮", "按钮和光点持续脉冲"],
  normal: "动效正在说明页面切换、对象来源、操作结果，或者品牌本身以动态叙事为核心。",
  avoid: "先保留一次真正有解释作用的运动；其余内容直接显示，并支持系统的减少动态效果设置。",
  prompt: "删除没有说明状态或空间关系的入场、上浮和脉冲动画。保留必要动效，并检查减少动态效果设置。",
  related: ["animation", "hover"],
  preview: "motion"
}, {
  id: "fake-responsive",
  category: "ux",
  title: "手机端一路堆到底",
  name: "Fake Responsive Layout",
  request: "电脑版的侧栏、表格和按钮全挤成一条长页面，手机上反而更难用了。",
  quote: "桌面三列全部改成单列，侧栏先出现，主任务被推到很下面，宽表格只能横着拖。",
  tagline: "手机上只是把电脑版从上到下堆起来，重要内容反而更难找到。",
  why: "响应式不是让布局“不溢出”就完成。小屏可用空间和操作方式都变了，仍照搬桌面顺序时，页面会更长，关键动作也更难找到。",
  examples: ["侧栏排在正文前面", "宽表格整体缩小", "桌面工具栏挤成两三行"],
  normal: "内容本来就是同级列表，单列顺序与用户在手机上的任务顺序一致。",
  avoid: "先保留手机上的主要任务，再折叠次要导航、改写表格呈现，并检查触控尺寸。",
  prompt: "不要只把桌面布局改成单列。按手机上的主要任务重新安排导航、内容顺序、表格和操作按钮。",
  related: ["responsive-design", "button"],
  preview: "responsive"
}, {
  id: "description-everywhere",
  category: "ux",
  title: "到处补说明",
  name: "Description Everywhere",
  request: "这些分类名已经很清楚了，上面为什么还要再写一段“在这里管理你的知识”？",
  quote: "工作区、分类、卡片、表单和按钮旁都补一段同义说明，页面上到处是“在这里……”和“帮助你……”。",
  tagline: "说明只是把旁边的标题和按钮换个说法，没有增加任何新信息。",
  why: "AI 容易把“界面要清楚”理解成每个区域都要配一段解释。重复文案占用空间，也让真正会影响操作的信息更难被发现。",
  examples: ["笔记侧栏在分类上方写“在这里管理你的知识”", "“最近笔记”下面再写“查看你最近打开的笔记”", "按钮“新建页面”旁补一句“点击这里创建新页面”", "卡片标题“团队成员”下面写“管理你的团队成员”", "表单标题“基本信息”下面写“请填写你的基本信息”"],
  normal: "说明补充了输入格式、适用条件、操作后果，或解释用户不熟悉的概念。",
  avoid: "逐句检查：删掉以后信息没有减少，就直接删除。只保留会影响选择、输入和结果判断的说明。",
  prompt: "删除侧栏、卡片和表单里只重复标题或按钮名称的说明。保留输入格式、条件、后果和陌生概念的必要解释。",
  related: ["sidebar-layout", "label", "space"],
  preview: "sidebar-copy"
}, {
  id: "naming-drift",
  category: "ux",
  title: "同一操作换着叫",
  name: "Naming Drift",
  request: "这里写“新建”，右上角又叫“添加”，打开弹窗以后怎么变成“创建”了？",
  quote: "侧栏写“新建笔记”，空状态写“添加页面”，弹窗主按钮又写“创建文档”，其实都在完成同一个操作。",
  tagline: "同一个对象和操作在不同位置换名字，用户无法确认它们是不是一件事。",
  why: "AI 会按局部语境补一个听起来合理的词，却没有维护整套界面的对象名称和动作名称。流程越长，名称越容易漂移。",
  examples: ["新建、添加、创建指向同一个动作", "保存、提交、完成指向同一个结果", "删除、移除、清空没有说明后果差异", "项目、空间、工作区其实是同一个对象", "登录页叫账号，设置页又改称账户"],
  normal: "不同名称对应不同对象、范围或后果，而且界面能让用户看出差异。",
  avoid: "为主要对象和动作确定一套名称，并在导航、按钮、弹窗、提示和错误信息中复用。",
  prompt: "检查整个创建笔记流程。统一对象名和动作名，不要让“新建、添加、创建”指向同一个操作。",
  related: ["label", "button", "user-voice"],
  preview: "naming-drift"
}, {
  id: "inert-controls",
  category: "ux",
  title: "按钮只是摆设",
  name: "Inert Controls",
  request: "这个筛选点了什么都不变，那为什么还要把它做得像真的一样？",
  quote: "搜索、筛选、收藏和导出都有完整按钮外观，点击以后数据、状态和页面都没有变化。",
  tagline: "按钮看起来能点，点完却没有任何变化，也没说明它还没做好。",
  why: "生成工具擅长快速补齐界面外壳，容易把常见按钮一起画出来。用户会按外观理解它能用，点击无结果时只能猜是坏了、在加载，还是根本没做。",
  examples: ["筛选后列表不变", "收藏按钮没有选中状态", "导出按钮只弹一个假成功提示"],
  normal: "页面已经明确写着“这里只是静态示意，暂时不能点”，用户不会把它当成做好的功能。",
  avoid: "看起来能点就要有结果。暂不支持的按钮就删掉、置灰并说明原因，或写清楚这只是示意图。",
  prompt: "逐个检查页面上看起来能点的按钮。让点击产生真实结果；暂不支持的操作就删除、置灰并说明原因。",
  related: ["button", "result", "disabled"],
  preview: "inert"
}, {
  id: "icon-button-maze",
  category: "ux",
  title: "只放图标，不写名字",
  name: "Icon Button Maze",
  request: "这一排图标我根本不知道哪个是删除，手机上也没法悬停看提示。",
  quote: "编辑、复制、分享、归档和删除都缩成相似的线性图标，没有文字名称。",
  tagline: "编辑、分享、删除都只剩图标，用户只能靠猜。",
  why: "图标能节省空间，但很多动作并没有人人都认识的图形。生成界面喜欢排一排图标显得简洁，却忘了写名称，也没有把删除这种危险操作单独说清。",
  examples: ["表格每行五个无文字图标", "只在悬停时显示作用", "删除与归档使用相似符号"],
  normal: "图标人人都认识，用户也能看到它的名称，而且不会和旁边的操作混淆。",
  avoid: "主要操作直接写名称；其他图标也要让用户看到名称，删除等危险操作还要单独确认。",
  prompt: "检查所有图标按钮。主要操作直接显示文字，其他图标补上用户能看到的名称，并单独确认删除等危险操作。",
  related: ["icon", "tooltip", "label"],
  preview: "icon-maze"
}];
let c = d.map(e => ({
  ...e,
  ...l[e.id],
  title: e.name,
  name: e.title
}));
function h(e) {
  let {
    className: t,
    isEn: a,
    preview: i,
    variant: r
  } = e;
  if ("rounded" === i) return (0, n.jsx)("div", {
    className: t,
    "aria-hidden": "true",
    children: (0, n.jsxs)("div", {
      children: [(0, n.jsx)("span", {
        children: a ? "Project overview" : "项目概览"
      }), (0, n.jsxs)("i", {
        children: [(0, n.jsx)("em", {
          children: a ? "This week" : "本周进度"
        }), (0, n.jsx)("b", {
          children: a ? "8 tasks done" : "已完成 8 项"
        })]
      })]
    })
  });
  if ("divider-everywhere" === i) return (0, n.jsx)("div", {
    className: t,
    "aria-hidden": "true",
    children: (0, n.jsxs)("div", {
      children: [(0, n.jsx)("strong", {
        children: a ? "Notifications" : "通知设置"
      }), (a ? [["Email updates", "On"], ["Product news", "Off"], ["Weekly summary", "On"]] : [["邮件通知", "开启"], ["产品更新", "关闭"], ["每周摘要", "开启"]]).map(e => {
        let [t, a] = e;
        return (0, n.jsxs)("p", {
          children: [(0, n.jsx)("span", {
            children: t
          }), (0, n.jsx)("b", {
            children: a
          })]
        }, t);
      })]
    })
  });
  if ("left-border-callouts" === i) return (0, n.jsxs)("div", {
    className: t,
    "aria-hidden": "true",
    children: [(0, n.jsx)("strong", {
      children: a ? "Release details" : "发布说明"
    }), (0, n.jsx)("div", {
      children: (a ? [["Scope", "Current project only"], ["Sync", "After saving"], ["Release", "Friday at 18:00"]] : [["影响范围", "仅当前项目"], ["同步时间", "保存完成后"], ["发布时间", "周五 18:00"]]).map(e => {
        let [t, a] = e;
        return (0, n.jsxs)("p", {
          children: [(0, n.jsx)("b", {
            children: t
          }), (0, n.jsx)("span", {
            children: a
          })]
        }, t);
      })
    })]
  });
  if ("motion" === i) return (0, n.jsxs)("div", {
    className: t,
    "aria-hidden": "true",
    children: [(0, n.jsx)("span", {
      children: a ? "Read the update" : "查看本周更新"
    }), (0, n.jsx)("i", {}), (0, n.jsx)("i", {}), (0, n.jsx)("i", {})]
  });
  if ("responsive" === i) return (0, n.jsxs)("div", {
    className: t,
    "aria-hidden": "true",
    children: [(0, n.jsx)("div", {
      className: "aif-phone-bar"
    }), (0, n.jsxs)("div", {
      className: "aif-phone-side",
      children: [(0, n.jsx)("i", {}), (0, n.jsx)("i", {}), (0, n.jsx)("i", {})]
    }), (0, n.jsxs)("div", {
      className: "aif-phone-main",
      children: [(0, n.jsx)("strong", {
        children: a ? "Orders" : "订单"
      }), (0, n.jsx)("span", {}), (0, n.jsx)("span", {}), (0, n.jsx)("span", {})]
    }), (0, n.jsx)("b", {
      children: a ? "Review order" : "查看订单"
    })]
  });
  if ("sidebar-copy" === i) return (0, n.jsxs)("div", {
    className: t,
    "aria-hidden": "true",
    children: [(0, n.jsxs)("div", {
      children: [(0, n.jsx)("strong", {
        children: a ? "Workspace" : "工作区"
      }), "bad" === r ? (0, n.jsx)("p", {
        children: a ? "Manage your knowledge and ideas here." : "在这里管理你的知识、灵感和想法。"
      }) : null, (0, n.jsx)("ul", {
        children: (a ? [["Recent notes", "Notes you opened recently"], ["Projects", "Organize notes by project"], ["Archive", "Notes you no longer need"]] : [["最近笔记", "查看你最近打开的笔记"], ["项目", "按照项目整理笔记"], ["归档", "存放暂时不用的笔记"]]).map((e, t) => {
          let [a, i] = e;
          return (0, n.jsxs)("li", {
            className: 0 === t ? "is-current" : void 0,
            children: [(0, n.jsx)("b", {
              children: a
            }), "bad" === r ? (0, n.jsx)("span", {
              children: i
            }) : null]
          }, a);
        })
      })]
    }), (0, n.jsxs)("section", {
      children: [(0, n.jsx)("b", {
        children: a ? "Recent notes" : "最近笔记"
      }), (0, n.jsx)("i", {}), (0, n.jsx)("i", {}), (0, n.jsx)("i", {})]
    })]
  });
  if ("naming-drift" === i) {
    let e = a ? ["Sidebar", "Empty state", "Dialog"] : ["侧栏", "空状态", "弹窗"];
    return (0, n.jsx)("div", {
      className: t,
      "aria-hidden": "true",
      children: ("good" === r ? a ? ["New note", "New note", "New note"] : ["新建笔记", "新建笔记", "新建笔记"] : a ? ["New note", "Add page", "Create document"] : ["新建笔记", "添加页面", "创建文档"]).map((t, a) => (0, n.jsxs)("div", {
        children: [(0, n.jsx)("small", {
          children: e[a]
        }), (0, n.jsx)("b", {
          children: t
        })]
      }, e[a]))
    });
  }
  if ("inert" === i) return (0, n.jsxs)("div", {
    className: t,
    "aria-hidden": "true",
    children: [(0, n.jsxs)("div", {
      children: [(0, n.jsx)("span", {
        children: a ? "All" : "全部"
      }), (0, n.jsx)("span", {
        children: a ? "Pending" : "待处理"
      }), (0, n.jsx)("span", {
        children: a ? "Export" : "导出"
      })]
    }), (0, n.jsx)("p", {
      children: "good" === r ? a ? "2 pending items" : "2 项待处理" : a ? "8 items" : "8 项结果"
    }), (0, n.jsx)("i", {}), (0, n.jsx)("i", {}), (0, n.jsx)("i", {})]
  });
  if ("icon-maze" === i) return (0, n.jsxs)("div", {
    className: t,
    "aria-hidden": "true",
    children: [(0, n.jsx)("p", {
      children: a ? "Project actions" : "项目操作"
    }), (0, n.jsx)("div", {
      children: ("good" === r ? a ? ["Edit", "Share", "Delete"] : ["编辑", "分享", "删除"] : ["✎", "⧉", "↗", "⌁", "\xd7"]).map(e => (0, n.jsx)("span", {
        children: e
      }, e))
    })]
  });
  throw Error("Unhandled interface preview: ".concat(i));
}
function p(e) {
  let {
    className: t,
    isEn: a,
    preview: i,
    variant: r
  } = e;
  if ("centered" === i) return "good" === r ? (0, n.jsxs)("div", {
    className: t,
    "aria-hidden": "true",
    children: [(0, n.jsxs)("div", {
      className: "aif-product-copy",
      children: [(0, n.jsx)("small", {
        children: a ? "MEETING NOTES" : "会议纪要"
      }), (0, n.jsx)("strong", {
        children: a ? "Leave with clear next steps" : "散会后，待办已经分好"
      }), (0, n.jsx)("p", {
        children: a ? "Upload a recording to get decisions and owners." : "上传录音，得到结论、负责人和截止时间。"
      }), (0, n.jsx)("b", {
        children: a ? "Upload recording" : "上传录音"
      })]
    }), (0, n.jsxs)("div", {
      className: "aif-product-screen",
      children: [(0, n.jsx)("span", {}), (0, n.jsx)("i", {}), (0, n.jsx)("i", {}), (0, n.jsx)("i", {})]
    })]
  }) : (0, n.jsxs)("div", {
    className: t,
    "aria-hidden": "true",
    children: [(0, n.jsx)("small", {
      children: a ? "AI POWERED" : "AI 驱动"
    }), (0, n.jsx)("strong", {
      children: a ? "Build the future." : "重新定义未来"
    }), (0, n.jsx)("p", {
      children: a ? "Everything your team needs." : "团队需要的一切，都在这里。"
    }), (0, n.jsxs)("div", {
      children: [(0, n.jsx)("i", {}), (0, n.jsx)("i", {})]
    })]
  });
  if ("three-cards" === i) return (0, n.jsx)("div", {
    className: t,
    "aria-hidden": "true",
    children: [1, 2, 3].map(e => (0, n.jsxs)("i", {
      children: [(0, n.jsx)("b", {}), (0, n.jsx)("span", {}), (0, n.jsx)("span", {})]
    }, e))
  });
  if ("glow" === i) return (0, n.jsxs)("div", {
    className: t,
    "aria-hidden": "true",
    children: [(0, n.jsx)("i", {}), (0, n.jsx)("strong", {
      children: "good" === r ? a ? "Meeting decisions" : "会议结论" : a ? "Next-gen platform" : "下一代智能平台"
    }), (0, n.jsx)("span", {})]
  });
  if ("heavy-headline" === i) return (0, n.jsxs)("div", {
    className: t,
    "aria-hidden": "true",
    children: [(0, n.jsx)("strong", {
      children: a ? (0, n.jsxs)(n.Fragment, {
        children: ["Every meeting", (0, n.jsx)("br", {}), "moves work forward"]
      }) : (0, n.jsxs)(n.Fragment, {
        children: ["让每一次会议", (0, n.jsx)("br", {}), "都推动工作向前"]
      })
    }), (0, n.jsx)("p", {
      children: a ? "Turn recordings into decisions and assigned actions." : "把录音整理成结论、负责人和待办。"
    })]
  });
  if ("emoji" === i) return (0, n.jsx)("div", {
    className: t,
    "aria-hidden": "true",
    children: ("good" === r ? [["01", a ? "IMPORT" : "导入"], ["02", a ? "REVIEW" : "检查"], ["03", a ? "EXPORT" : "导出"]] : [["\uD83D\uDE80", a ? "FAST" : "极速"], ["✨", a ? "SMART" : "智能"], ["\uD83D\uDEE1️", a ? "SAFE" : "安全"]]).map(e => {
      let [t, a] = e;
      return (0, n.jsxs)("i", {
        children: [(0, n.jsx)("b", {
          children: t
        }), (0, n.jsx)("span", {
          children: a
        })]
      }, a);
    })
  });
  throw Error("Unhandled marketing preview: ".concat(i));
}
let u = ["centered", "three-cards", "glow", "heavy-headline", "emoji"];
function m(e) {
  let {
      entry: t,
      locale: a,
      detail: i = !1,
      variant: r = "bad"
    } = e,
    o = "aif-entry-preview aif-preview-".concat(t.preview).concat(i ? " is-detail" : "").concat("good" === r ? " is-good" : ""),
    s = "en" === a;
  if ("zh" === t.category || "en" === t.category) return (0, n.jsxs)("div", {
    className: o,
    "aria-hidden": "true",
    children: [(0, n.jsx)("span", {
      children: t.title
    }), (0, n.jsx)("p", {
      children: t.quote.replace(/[“”"]/g, "")
    }), (0, n.jsx)("i", {})]
  });
  let l = t.preview;
  return u.includes(l) ? (0, n.jsx)(p, {
    className: o,
    isEn: s,
    preview: l,
    variant: r
  }) : (0, n.jsx)(h, {
    className: o,
    isEn: s,
    preview: l,
    variant: r
  });
}
function g(e) {
  let {
    entry: t,
    locale: a,
    onOpen: i
  } = e;
  return (0, n.jsx)("article", {
    className: "card aif-term-card",
    "data-id": t.id,
    children: (0, n.jsxs)("a", {
      href: "#aif-".concat(t.id),
      onClick: e => i(e, t),
      children: [(0, n.jsx)("div", {
        className: "card-head",
        children: (0, n.jsx)("div", {
          className: "card-title-group",
          children: (0, n.jsx)("h3", {
            children: t.title
          })
        })
      }), (0, n.jsx)("div", {
        className: "card-tagline card-quote",
        children: t.request
      }), (0, n.jsx)("div", {
        className: "card-demo",
        children: (0, n.jsx)(m, {
          entry: t,
          locale: a
        })
      })]
    })
  });
}
function y(e) {
  let {
    categories: t,
    categoryOrder: a,
    copy: i,
    entries: r,
    locale: o,
    onOpen: s
  } = e;
  return (0, n.jsx)("div", {
    className: "catalog-page aif-catalog-page",
    children: (0, n.jsxs)("div", {
      className: "catalog-layout",
      children: [(0, n.jsx)("aside", {
        className: "catalog-sidebar",
        children: (0, n.jsx)("nav", {
          className: "cat-chips",
          "aria-label": i.title,
          children: a.map(e => (0, n.jsx)("button", {
            type: "button",
            onClick: () => {
              var t;
              return null == (t = document.getElementById("aif-category-".concat(e))) ? void 0 : t.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
            },
            children: t[e].title
          }, e))
        })
      }), (0, n.jsxs)("div", {
        className: "grid-wrap",
        children: [(0, n.jsxs)("header", {
          className: "aif-catalog-heading",
          children: [(0, n.jsx)("p", {
            children: i.eyebrow
          }), (0, n.jsx)("h1", {
            children: i.title
          }), (0, n.jsx)("div", {
            children: i.description
          }), (0, n.jsx)("small", {
            children: i.boundary
          })]
        }), a.map(e => {
          let a = r.filter(t => t.category === e);
          return (0, n.jsxs)("section", {
            className: "cat-section",
            id: "aif-category-".concat(e),
            children: [(0, n.jsxs)("div", {
              className: "cat-title aif-cat-title",
              children: [(0, n.jsxs)("div", {
                children: [t[e].title, (0, n.jsx)("small", {
                  children: t[e].description
                })]
              }), (0, n.jsxs)("span", {
                children: [a.length, " ", i.items]
              })]
            }), (0, n.jsx)("div", {
              className: "grid",
              children: a.map(e => (0, n.jsx)(g, {
                entry: e,
                locale: o,
                onOpen: s
              }, e.id))
            })]
          }, e);
        })]
      })]
    })
  });
}
function b(e) {
  let {
      copy: t,
      entry: a,
      locale: i
    } = e,
    r = "zh" === a.category || "en" === a.category;
  return (0, n.jsxs)("section", {
    className: "aif-detail-visual".concat("fragmented-bullets" === a.preview ? " aif-detail-visual-fragmented-bullets" : ""),
    children: [(0, n.jsx)("h2", {
      children: r ? t.writingVisual : t.interfaceVisual
    }), r ? (0, n.jsxs)("div", {
      className: "aif-chat-sequence",
      children: [(0, n.jsxs)("div", {
        className: "aif-chat-message is-ai is-before",
        children: [(0, n.jsx)("span", {
          children: t.before
        }), (0, n.jsx)("p", {
          children: a.quote
        })]
      }), (0, n.jsxs)("div", {
        className: "aif-chat-message is-user",
        children: [(0, n.jsx)("span", {
          children: t.feedback
        }), (0, n.jsx)("p", {
          children: a.request
        })]
      }), (0, n.jsxs)("div", {
        className: "aif-chat-message is-ai is-after",
        children: [(0, n.jsx)("span", {
          children: t.after
        }), (0, n.jsx)("p", {
          children: a.better
        })]
      })]
    }) : (0, n.jsxs)("div", {
      className: "aif-interface-comparison",
      children: [(0, n.jsxs)("figure", {
        children: [(0, n.jsx)("figcaption", {
          children: t.before
        }), (0, n.jsx)(m, {
          entry: a,
          locale: i,
          detail: !0
        })]
      }), (0, n.jsxs)("figure", {
        children: [(0, n.jsx)("figcaption", {
          children: t.after
        }), (0, n.jsx)(m, {
          entry: a,
          locale: i,
          detail: !0,
          variant: "good"
        })]
      })]
    })]
  });
}
function w(e) {
  let {
      locale: t
    } = e,
    a = "zh" === t ? {
      subtitle: "让 AI 文案保持真实、平实、完整和易读",
      before: "修改前",
      beforeLine1: "单文件 HTML 的结构：",
      beforeLine2: "简单，但不随意",
      after: "修改后",
      afterLine1: "单文件 HTML",
      afterLine2: "的基本结构"
    } : {
      subtitle: "Keep AI-written copy factual, plain, complete, and readable",
      before: "BEFORE",
      beforeLine1: "Single-file HTML:",
      beforeLine2: "Simple, yet intentional",
      after: "AFTER",
      afterLine1: "The basics of a",
      afterLine2: "single-file HTML page"
    };
  return (0, n.jsxs)("svg", {
    "aria-hidden": "true",
    className: "aif-skill-visual",
    viewBox: "0 0 1200 400",
    xmlns: "http://www.w3.org/2000/svg",
    children: [(0, n.jsx)("rect", {
      width: "1200",
      height: "400",
      rx: "28",
      fill: "#f6f2ea"
    }), (0, n.jsx)("path", {
      d: "M0 319H704",
      stroke: "#d8d0c4"
    }), (0, n.jsx)("path", {
      d: "M704 52V348",
      stroke: "#d8d0c4"
    }), (0, n.jsxs)("g", {
      transform: "translate(60 60)",
      children: [(0, n.jsx)("text", {
        x: "0",
        y: "78",
        fill: "#1f1e1b",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif",
        fontSize: "68",
        fontWeight: "750",
        children: "ans-tone-guard"
      }), (0, n.jsx)("text", {
        x: "2",
        y: "134",
        fill: "#4d4943",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif",
        fontSize: "zh" === t ? "28" : "24",
        children: a.subtitle
      }), (0, n.jsxs)("g", {
        transform: "translate(2 190)",
        children: [(0, n.jsx)("rect", {
          x: "0",
          y: "0",
          width: "110",
          height: "34",
          rx: "17",
          fill: "#1f1e1b"
        }), (0, n.jsx)("text", {
          x: "55",
          y: "23",
          textAnchor: "middle",
          fill: "#f6f2ea",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "15",
          children: "FACTS"
        }), (0, n.jsx)("rect", {
          x: "122",
          y: "0",
          width: "128",
          height: "34",
          rx: "17",
          fill: "#e6ded2"
        }), (0, n.jsx)("text", {
          x: "186",
          y: "23",
          textAnchor: "middle",
          fill: "#4d4943",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "15",
          children: "LANGUAGE"
        }), (0, n.jsx)("rect", {
          x: "262",
          y: "0",
          width: "140",
          height: "34",
          rx: "17",
          fill: "#e6ded2"
        }), (0, n.jsx)("text", {
          x: "332",
          y: "23",
          textAnchor: "middle",
          fill: "#4d4943",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "15",
          children: "STRUCTURE"
        })]
      })]
    }), (0, n.jsxs)("g", {
      transform: "translate(752 64)",
      children: [(0, n.jsx)("text", {
        x: "0",
        y: "30",
        fill: "#8c8175",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif",
        fontSize: "18",
        children: a.before
      }), (0, n.jsx)("text", {
        x: "0",
        y: "70",
        fill: "#6f6860",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif",
        fontSize: "23",
        children: a.beforeLine1
      }), (0, n.jsx)("text", {
        x: "0",
        y: "104",
        fill: "#6f6860",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif",
        fontSize: "23",
        children: a.beforeLine2
      }), (0, n.jsx)("path", {
        d: "M-3 94L248 111",
        stroke: "#e85d3f",
        strokeWidth: "4",
        strokeLinecap: "round"
      }), (0, n.jsx)("path", {
        d: "M0 146H388",
        stroke: "#d8d0c4"
      }), (0, n.jsx)("text", {
        x: "0",
        y: "192",
        fill: "#e85d3f",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif",
        fontSize: "18",
        fontWeight: "650",
        children: a.after
      }), (0, n.jsx)("text", {
        x: "0",
        y: "238",
        fill: "#1f1e1b",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif",
        fontSize: "zh" === t ? "29" : "26",
        fontWeight: "680",
        children: a.afterLine1
      }), (0, n.jsx)("text", {
        x: "0",
        y: "276",
        fill: "#1f1e1b",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif",
        fontSize: "zh" === t ? "29" : "26",
        fontWeight: "680",
        children: a.afterLine2
      })]
    })]
  });
}
function x(e) {
  let {
      locale: t
    } = e,
    a = "zh" === t ? {
      subtitle: "给前端 Agent 使用的产品界面与代码收敛规范",
      line1: "同时检查用户任务、数据状态、界面结构和代码归属。",
      line2: "新实现接管以后，删除旧状态、旧样式和兼容分支。",
      pills: ["任务与信息", "状态与数据", "组件与代码"],
      action: "在 ANS Skill 库查看"
    } : {
      subtitle: "Product interface and code simplification rules for frontend agents",
      line1: "Checks user tasks, data state, interface structure, and code ownership together.",
      line2: "Removes stale state, styles, and compatibility branches after replacement.",
      pills: ["Tasks & info", "State & data", "Components & code"],
      action: "View in ANS Skill Directory"
    };
  return (0, n.jsxs)("svg", {
    "aria-hidden": "true",
    className: "aif-skill-visual",
    viewBox: "0 0 1200 420",
    xmlns: "http://www.w3.org/2000/svg",
    children: [(0, n.jsxs)("defs", {
      children: [(0, n.jsx)("pattern", {
        id: "aif-skill-grid-".concat(t),
        width: "28",
        height: "28",
        patternUnits: "userSpaceOnUse",
        children: (0, n.jsx)("path", {
          d: "M28 0H0V28",
          fill: "none",
          stroke: "#e7e4dc",
          strokeWidth: "1"
        })
      }), (0, n.jsx)("pattern", {
        id: "aif-skill-dots-".concat(t),
        width: "12",
        height: "12",
        patternUnits: "userSpaceOnUse",
        children: (0, n.jsx)("circle", {
          cx: "3",
          cy: "3",
          r: "1.8",
          fill: "#171917",
          opacity: ".22"
        })
      }), (0, n.jsx)("clipPath", {
        id: "aif-skill-bounds-".concat(t),
        children: (0, n.jsx)("rect", {
          x: "10",
          y: "10",
          width: "1180",
          height: "400",
          rx: "28"
        })
      })]
    }), (0, n.jsxs)("g", {
      clipPath: "url(#aif-skill-bounds-".concat(t, ")"),
      children: [(0, n.jsx)("rect", {
        width: "1200",
        height: "420",
        fill: "#fbfaf6"
      }), (0, n.jsx)("rect", {
        width: "1200",
        height: "420",
        fill: "url(#aif-skill-grid-".concat(t, ")"),
        opacity: ".7"
      }), (0, n.jsx)("circle", {
        cx: "110",
        cy: "65",
        r: "210",
        fill: "#fff",
        opacity: ".72"
      }), (0, n.jsxs)("g", {
        fontFamily: "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif",
        children: [(0, n.jsx)("text", {
          x: "66",
          y: "140",
          fill: "#171917",
          fontSize: "58",
          fontWeight: "700",
          letterSpacing: "-2.2",
          children: "ans-code-simplify"
        }), (0, n.jsx)("rect", {
          x: "64",
          y: "164",
          width: "540",
          height: "18",
          rx: "4",
          fill: "#f3c95f",
          opacity: ".9"
        }), (0, n.jsx)("text", {
          x: "66",
          y: "189",
          fill: "#171917",
          fontSize: "zh" === t ? "30" : "26",
          fontWeight: "650",
          children: a.subtitle
        }), (0, n.jsx)("text", {
          x: "66",
          y: "244",
          fill: "#4f534e",
          fontSize: "zh" === t ? "21" : "18",
          children: a.line1
        }), (0, n.jsx)("text", {
          x: "66",
          y: "278",
          fill: "#4f534e",
          fontSize: "zh" === t ? "21" : "18",
          children: a.line2
        }), (0, n.jsx)("g", {
          transform: "translate(66 322)",
          fontSize: "17",
          fontWeight: "620",
          children: a.pills.map((e, t) => (0, n.jsxs)("g", {
            transform: "translate(".concat(162 * t, " 0)"),
            children: [(0, n.jsx)("rect", {
              width: "150",
              height: "38",
              rx: "19",
              fill: "#fff",
              stroke: "#cfcbc1",
              strokeWidth: "1.5"
            }), (0, n.jsx)("text", {
              x: "75",
              y: "25",
              fill: "#343733",
              textAnchor: "middle",
              children: e
            })]
          }, e))
        })]
      }), (0, n.jsx)("rect", {
        x: "728",
        y: "72",
        width: "422",
        height: "290",
        rx: "40",
        fill: "#f3c95f"
      }), (0, n.jsx)("rect", {
        x: "1035",
        y: "88",
        width: "92",
        height: "92",
        rx: "22",
        fill: "url(#aif-skill-dots-".concat(t, ")")
      }), (0, n.jsx)("path", {
        d: "M754 337c74-33 142-36 204-9 53 23 102 24 168 1",
        fill: "none",
        stroke: "#171917",
        strokeWidth: "3",
        strokeLinecap: "round",
        opacity: ".22"
      }), (0, n.jsx)("image", {
        href: "/vibe-hub/source/assets/anti-ai-flavor/oil-frontend-subject.webp",
        x: "690",
        y: "-2",
        width: "474",
        height: "474",
        preserveAspectRatio: "xMidYMid meet"
      }), (0, n.jsxs)("g", {
        fontFamily: "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif",
        children: [(0, n.jsx)("rect", {
          x: "960",
          y: "352",
          width: "182",
          height: "38",
          rx: "19",
          fill: "#171917"
        }), (0, n.jsx)("text", {
          x: "1051",
          y: "377",
          fill: "#fff",
          fontSize: "16",
          fontWeight: "650",
          textAnchor: "middle",
          children: a.action
        })]
      })]
    }), (0, n.jsx)("rect", {
      x: "10",
      y: "10",
      width: "1180",
      height: "400",
      rx: "28",
      fill: "none",
      stroke: "#cac6bc",
      strokeWidth: "2"
    })]
  });
}
function j(e) {
  let {
    locale: t,
    skillId: a
  } = e;
  return "ans-tone-guard" === a ? (0, n.jsx)(w, {
    locale: t
  }) : (0, n.jsx)(x, {
    locale: t
  });
}
let k = {
  "ans-tone-guard": "/vibe-hub/vibehub-skill#ans-skill-matrix",
  "ans-code-simplify": "/vibe-hub/vibehub-skill#ans-skill-matrix"
};
function q(e) {
  let {
      category: t,
      locale: a
    } = e,
    i = "zh" === t || "en" === t ? "ans-tone-guard" : "ans-code-simplify",
    r = "zh" === a ? "在 ANS Skill 库查看 ".concat(i) : "View ".concat(i, " in ANS Skill Directory");
  return (0, n.jsxs)("section", {
    className: "aif-detail-skill-recommendation",
    "aria-labelledby": "aif-recommended-skill-title",
    children: [(0, n.jsx)("h2", {
      className: "section-title",
      id: "aif-recommended-skill-title",
      children: "zh" === a ? "推荐使用的 ANS Skill" : "Recommended ANS Skill"
    }), (0, n.jsx)("a", {
      href: k[i],
      "aria-label": r,
      children: (0, n.jsx)(j, {
        locale: a,
        skillId: i
      })
    })]
  });
}
function N() {
  let [e, t] = (0, i.useState)(!1),
    a = (0, i.useRef)(!0),
    n = (0, i.useRef)(null);
  return (0, i.useEffect)(() => (a.current = !0, () => {
    a.current = !1, null !== n.current && window.clearTimeout(n.current);
  }), []), [e, function (e) {
    navigator.clipboard && navigator.clipboard.writeText(e).then(() => {
      a.current && (t(!0), null !== n.current && window.clearTimeout(n.current), n.current = window.setTimeout(() => t(!1), 1600));
    }, () => {});
  }];
}
function S(e) {
  let {
      copy: t,
      entry: a,
      locale: i,
      next: r,
      onBack: o,
      onNavigate: s,
      prev: l,
      relatedLabels: d
    } = e,
    [c, h] = N(),
    [p, u] = N(),
    m = ["# ".concat(a.title), "", "> ".concat(a.request), "", a.tagline, "", "## ".concat(t.why), "", a.why, "", "## ".concat(t.examples), "", ...a.examples.map(e => "- ".concat(e)), "", "## ".concat(t.boundaryTitle), "", a.normal, "", "## ".concat(t.avoid), "", a.avoid, "", "## ".concat(t.prompt), "", a.prompt].join("\n");
  return (0, n.jsxs)("div", {
    className: "detail aif-detail",
    children: [(0, n.jsxs)("div", {
      className: "detail-topbar",
      children: [(0, n.jsxs)("nav", {
        className: "detail-breadcrumb",
        "aria-label": t.back,
        children: [(0, n.jsx)("button", {
          type: "button",
          className: "detail-back-button",
          onClick: o,
          "aria-label": t.back,
          children: (0, n.jsx)(v.A6, {})
        }), (0, n.jsx)("button", {
          type: "button",
          className: "breadcrumb-link",
          onClick: o,
          children: t.back
        }), (0, n.jsx)("span", {
          className: "breadcrumb-separator",
          "aria-hidden": "true",
          children: "›"
        }), (0, n.jsx)("span", {
          className: "breadcrumb-current",
          "aria-current": "page",
          children: a.title
        })]
      }), (0, n.jsxs)("button", {
        type: "button",
        className: "detail-copy-markdown".concat(c ? " is-copied" : ""),
        onClick: () => h(m),
        "aria-label": t.copyMarkdown,
        "data-locale": i,
        children: [(0, n.jsxs)("span", {
          className: "detail-copy-icon",
          "aria-hidden": "true",
          children: [(0, n.jsx)(v.Td, {
            className: "copy-icon-default"
          }), (0, n.jsx)(v.Sr, {
            className: "copy-icon-success"
          })]
        }), (0, n.jsxs)("span", {
          className: "detail-copy-label",
          "aria-hidden": "true",
          children: [(0, n.jsx)("span", {
            className: "copy-label-default",
            children: t.copyMarkdown
          }), (0, n.jsx)("span", {
            className: "copy-label-success",
            children: t.copied
          })]
        })]
      })]
    }), l && (0, n.jsxs)("button", {
      type: "button",
      className: "float-nav left",
      "aria-label": t.prevEntry,
      title: l.title,
      onClick: () => s(l, "prev"),
      children: [(0, n.jsx)("span", {
        className: "fn-arrow",
        children: "←"
      }), (0, n.jsx)("span", {
        className: "fn-text",
        children: l.title
      })]
    }), r && (0, n.jsxs)("button", {
      type: "button",
      className: "float-nav right",
      "aria-label": t.nextEntry,
      title: r.title,
      onClick: () => s(r, "next"),
      children: [(0, n.jsx)("span", {
        className: "fn-text",
        children: r.title
      }), (0, n.jsx)("span", {
        className: "fn-arrow",
        children: "→"
      })]
    }), (0, n.jsxs)("div", {
      className: "detail-body",
      children: [(0, n.jsxs)("section", {
        className: "detail-hero",
        id: "detail-hero",
        children: [(0, n.jsx)("div", {
          className: "dh-head",
          children: (0, n.jsx)("h1", {
            children: a.title
          })
        }), (0, n.jsxs)("div", {
          className: "dh-quote",
          children: [(0, n.jsx)("span", {
            className: "dh-quote-label",
            children: t.quote
          }), (0, n.jsx)("p", {
            className: "dh-quote-text",
            children: a.request
          })]
        }), (0, n.jsx)("div", {
          className: "dh-tagline",
          children: (0, n.jsx)("strong", {
            className: "dh-summary-lead",
            children: a.tagline
          })
        })]
      }), (0, n.jsx)(b, {
        copy: t,
        entry: a,
        locale: i
      }), (0, n.jsxs)("section", {
        className: "aif-explanation-grid",
        children: [(0, n.jsxs)("div", {
          className: "aif-why",
          children: [(0, n.jsx)("h2", {
            className: "section-title",
            children: t.why
          }), (0, n.jsx)("p", {
            children: a.why
          })]
        }), (0, n.jsxs)("div", {
          className: "aif-revision",
          children: [(0, n.jsx)("h2", {
            className: "section-title",
            children: t.avoid
          }), (0, n.jsx)("p", {
            children: a.avoid
          })]
        })]
      }), (0, n.jsxs)("section", {
        className: "usage-grid aif-boundary-grid",
        children: [(0, n.jsxs)("div", {
          className: "usage-box use",
          children: [(0, n.jsxs)("h3", {
            children: [(0, n.jsx)("span", {
              className: "mark",
              children: (0, n.jsx)(v.Sr, {})
            }), t.boundaryTitle]
          }), (0, n.jsx)("ul", {
            children: (0, n.jsx)("li", {
              className: "usage-text",
              children: a.normal
            })
          })]
        }), (0, n.jsxs)("div", {
          className: "usage-box dont",
          children: [(0, n.jsxs)("h3", {
            children: [(0, n.jsx)("span", {
              className: "mark",
              children: (0, n.jsx)(v.US, {})
            }), t.examples]
          }), (0, n.jsx)("ul", {
            children: a.examples.map(e => (0, n.jsx)("li", {
              className: "usage-text",
              children: e
            }, e))
          })]
        })]
      }), (0, n.jsxs)("section", {
        className: "prompt-section prompt-section-dialogue aif-agent-request",
        children: [(0, n.jsx)("h2", {
          className: "section-title",
          children: t.prompt
        }), (0, n.jsxs)("div", {
          className: "prompt-box prompt-box-dialogue",
          children: [(0, n.jsx)("blockquote", {
            children: (0, n.jsx)("p", {
              children: a.prompt
            })
          }), (0, n.jsx)("button", {
            type: "button",
            className: "prompt-copy",
            "aria-label": p ? t.copied : t.copyPrompt,
            title: p ? t.copied : t.copyPrompt,
            onClick: () => u(a.prompt),
            children: p ? (0, n.jsx)(v.Sr, {}) : (0, n.jsx)(v.Td, {})
          })]
        })]
      }), (0, n.jsx)(q, {
        category: a.category,
        locale: i
      }), (0, n.jsxs)("section", {
        className: "aif-detail-related",
        children: [(0, n.jsx)("h2", {
          className: "section-title",
          children: t.related
        }), (0, n.jsx)("div", {
          children: a.related.map(e => (0, n.jsx)("a", {
            className: "c-ref c-link",
            "data-ref": e,
            href: (0, f.s3)(e, i),
            children: d[e] || e
          }, e))
        })]
      })]
    })]
  });
}
function E(e) {
  var t, a;
  let {
      locale: l
    } = e,
    h = s[l],
    p = o[l],
    u = (0, i.useMemo)(() => "en" === l ? ["en", "ui", "ux"] : ["zh", "ui", "ux"], [l]),
    m = (0, i.useMemo)(() => ("en" === l ? c : d).filter(e => u.includes(e.category)), [u, l]),
    {
      selectedId: g,
      closeEntry: f,
      navigateEntry: v,
      openEntry: b
    } = function (e) {
      let [t, a] = (0, i.useState)(null),
        n = (0, i.useRef)({
          id: null,
          top: 0
        }),
        r = (0, i.useRef)(!1);
      return (0, i.useEffect)(() => {
        let t = () => {
          let t = window.location.hash.replace(/^#aif-/, "");
          a(e.some(e => e.id === t) ? t : null);
        };
        return t(), window.addEventListener("popstate", t), window.addEventListener("hashchange", t), () => {
          window.removeEventListener("popstate", t), window.removeEventListener("hashchange", t);
        };
      }, [e]), {
        selectedId: t,
        openEntry: function (e, t) {
          if (e.preventDefault(), r.current) return;
          let i = e.currentTarget.closest(".aif-term-card");
          if (!i) return;
          n.current = {
            id: t.id,
            top: i.getBoundingClientRect().top
          };
          let o = window.history.state && "object" == typeof window.history.state ? window.history.state : {};
          if (window.history.replaceState({
            ...o,
            aifCatalogPath: window.location.pathname
          }, "", "".concat(window.location.pathname).concat(window.location.search)), window.history.pushState({
            ...o,
            aifDetailId: t.id
          }, "", "#aif-".concat(t.id)), !(0, I.Qo)()) {
            a(t.id), (0, A.qs)();
            return;
          }
          r.current = !0, document.documentElement.dataset.dir = "open", i.classList.add("is-opening"), i.style.viewTransitionName = "morph", (0, I._V)(() => {
            i.style.viewTransitionName = "", (0, T.flushSync)(() => a(t.id)), (0, A.qs)();
            let e = document.getElementById("detail-hero");
            e && (e.style.viewTransitionName = "morph");
            let n = document.querySelector(".aif-detail .detail-body");
            n && (n.style.viewTransitionName = "detail-body-enter");
          }).finished.finally(() => {
            let e = document.getElementById("detail-hero");
            e && (e.style.viewTransitionName = "");
            let t = document.querySelector(".aif-detail .detail-body");
            t && (t.style.viewTransitionName = ""), i.classList.remove("is-opening"), document.documentElement.dataset.dir = "", r.current = !1;
          });
        },
        closeEntry: function (e) {
          if (!e || r.current) return;
          let t = e.id,
            i = n.current,
            o = () => {
              (0, T.flushSync)(() => a(null));
              let e = document.querySelector('.aif-term-card[data-id="'.concat(t, '"]'));
              if (e && i.id === t) {
                let t = e.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({
                  top: Math.max(0, t - i.top),
                  behavior: "instant"
                });
              } else (0, A.qs)();
              return e;
            },
            s = () => {
              i.id === t && window.location.hash === "#aif-".concat(t) ? window.history.back() : window.history.replaceState(window.history.state, "", "".concat(window.location.pathname).concat(window.location.search));
            };
          if (!(0, I.Qo)()) {
            o(), s();
            return;
          }
          r.current = !0;
          let l = document.getElementById("detail-hero");
          l && (l.style.viewTransitionName = "morph", l.offsetWidth), (0, I._V)(() => {
            let e = o();
            e && (e.style.viewTransitionName = "morph");
          }).finished.finally(() => {
            let e = document.querySelector('.aif-term-card[data-id="'.concat(t, '"]'));
            e && (e.style.viewTransitionName = ""), document.documentElement.dataset.dir = "", r.current = !1, s();
          });
        },
        navigateEntry: function (e, t) {
          if (r.current) return;
          if (n.current = {
            id: e.id,
            top: n.current.top
          }, window.history.replaceState({
            ...(window.history.state || {}),
            aifDetailId: e.id
          }, "", "#aif-".concat(e.id)), !(0, I.Qo)()) {
            a(e.id), (0, A.qs)();
            return;
          }
          r.current = !0, document.documentElement.dataset.dir = t;
          let i = document.querySelector(".aif-detail .detail-body");
          i && (i.style.viewTransitionName = "detail-body"), (0, I._V)(() => {
            (0, T.flushSync)(() => a(e.id)), (0, A.qs)();
            let t = document.querySelector(".aif-detail .detail-body");
            t && (t.style.viewTransitionName = "detail-body");
          }).finished.finally(() => {
            let e = document.querySelector(".aif-detail .detail-body");
            e && (e.style.viewTransitionName = ""), document.documentElement.dataset.dir = "", r.current = !1;
          });
        }
      };
    }(m),
    w = (0, i.useMemo)(() => m.find(e => e.id === g) || null, [m, g]),
    x = w ? m.findIndex(e => e.id === w.id) : -1,
    j = x > 0 && null != (t = m[x - 1]) ? t : null,
    k = x >= 0 && x < m.length - 1 && null != (a = m[x + 1]) ? a : null;
  return w ? (0, n.jsx)(S, {
    copy: h,
    entry: w,
    locale: l,
    next: k,
    onBack: () => f(w),
    onNavigate: v,
    prev: j,
    relatedLabels: r[l]
  }) : (0, n.jsx)(y, {
    categories: p,
    categoryOrder: u,
    copy: h,
    entries: m,
    locale: l,
    onOpen: b
  });
}
function C(e) {
  let {
    locale: t
  } = e;
  return (0, n.jsx)(E, {
    locale: t
  });
}
export { C as AntiAiFlavorPage };
