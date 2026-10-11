// Derived from public VibeHub presentation code. Source hashes: src/data/vibehub/interaction-sources.json.
"use client";

let a = {
  id: "product-website",
  title: "从零做一个产品官网",
  description: "这门课程带你从零开始制作一个完整的产品官网，逐步确定目标用户、页面结构、视觉规则、内容布局、表单校验、手机适配以及验收步骤。",
  audience: "适合第一次使用 AI Agent 制作官网，并希望看懂常见术语与说明修改要求的创作者。",
  boundary: "本课程只讲解完成首个版本产品官网所需要的产品、设计、前端和测试知识，并不会展开介绍完整的后端开发与部署配置。",
  teaches: "用产品、设计、前端和测试术语完成并验收一个产品官网",
  unitLabel: "章"
};
let i = {
  id: "git-workflow",
  title: "Git 工作流与版本管理",
  description: "面向初学者的 Git 实战教程。带你掌握工作区与代码提交、代码差异与忽略规则、分支隔离、分支合并与冲突解决、GitHub 远程协作，以及撤销修改的完整工作流。",
  audience: "适合正在借助 AI Agent 进行开发，希望掌握版本保存、看懂代码改动、安全尝试新功能的创作者。",
  boundary: "本课程围绕项目代码文件的记录、比较、合并与远程同步展开，不包含数据库数据备份与线上服务部署。",
  teaches: "使用 Git 完成代码提交、分支隔离、冲突解决与远程协作",
  unitLabel: "章"
};
let r = {
  "product-website": a,
  "git-workflow": i
};
function o(e) {
  return r[e];
}
export { a as GV, o as JF, i as RM };
