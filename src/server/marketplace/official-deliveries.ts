/**
 * Built-in instant Markdown delivery packages for official ANS Market listings.
 * When a member pays with ANS points for an official listing (or redeems via Little Dino Agent),
 * the order is immediately fulfilled with the complete, copy-paste-ready Markdown toolkit.
 */

export const OFFICIAL_MARKET_DELIVERIES: Record<string, string> = {
  "lab-weekly-git-report-automation": `# 📦 交付包：课题组组会周报与 Git 代码进展一键汇总自动化流

> **状态**：✅ ANS 官方自动秒发（已永久解锁）  
> **适用场景**：理工科 / 农科 / 生物信息 / AI 实验室每周组会汇报、导师进度同步与双链笔记归档。

---

## 1. 一键导出本周 Git 代码提交记录脚本（Bash / Zsh）

在你的代码仓库根目录下运行以下命令，自动提取过去 7 天的 Git Commit 与修改文件统计：

\`\`\`bash
git log --since="7 days ago" --no-merges \\
  --pretty=format:"- [%ad] %s (%h)" --date=short > weekly_commits.txt && \\
git diff --shortstat "@{7 days ago}" HEAD >> weekly_commits.txt && \\
cat weekly_commits.txt
\`\`\`

---

## 2. 导师最爱的「结构化组会周报」System Prompt（直接复制到工作台）

可前往 [ANS 模型工作台 (/workspace/models)](/workspace/models) 选择 \`DeepSeek-V4.1-Flash\` 或 \`GPT-6.1-Sol\`，粘贴以下提示词：

\`\`\`markdown
# Role
你是一位严谨、干练的高校重点实验室科研助理，擅长将零散的实验记录、阅读文献与 Git 代码提交提炼成「结论先行、数据说话」的导师组会周报。

# Input Data
1. 本周代码/实验原始记录：
{{在此粘贴 weekly_commits.txt 或实验本记录}}
2. 本周精读文献笔记：
{{在此粘贴 1~2 篇文献标题与核心方法}}
3. 遇到的卡点或报错：
{{在此粘贴当前 Bug 或实验异常}}

# Output Format（严格按以下结构化 Markdown 输出）
## 一、本周核心进展摘要（3 条以内，量化结果先行）
- **[模块/实验名]**：完成了什么动作 → 取得了什么量化指标变化（如准确率提升 X%、耗时降低 Y%）。

## 二、实验与代码详细复盘
| 任务模块 | 状态 | 关键参数 / 核心改动 | 验证结论 |
| :--- | :--- | :--- | :--- |

## 三、阻塞卡点与排查方案（附需要导师拍板的选项）
- **现象与根因分析**：...
- **备选方案 A / B**：...

## 四、下周排期与里程碑（精确到具体交付物）
1. [周二前] ...
2. [周五前] ...
\`\`\`

---

## 3. 飞书云文档 / Notion 每日科研打卡双链模板

- **每日三问卡片**：
  1. 📌 **今日唯一核心实验/代码任务是什么？**
  2. 📊 **关键产出文件或图表路径（Commit SHA / 数据集版本）？**
  3. ⚠️ **明日第一顺位待解决的阻塞点？**
`,

  "cau-sci-paper-polisher-kit": `# 📦 交付包：中国农大 SCI / 核心期刊论文润色与审稿人回复信全套工具包

> **状态**：✅ ANS 官方自动秒发（已永久解锁）  
> **适用学科**：作物学、植物保护、农业工程、生物信息学、食品科学及 AI 交叉学科。

---

## 1. Nature / 顶刊级 Abstract 结构化精修 Prompt

\`\`\`markdown
# Role
Act as a native English Senior Editor for top-tier agricultural and life science journals (Nature Plants, Plant Biotechnology Journal, Computers and Electronics in Agriculture).

# Task
Polish the following draft Abstract into a high-impact, 200-word structured abstract following the **Background -> Gap & Objective -> Methodology & Quantitative Results -> Broader Significance** framework.
- Eliminate Chinglish and passive-voice bloat.
- Preserve all cultivar names, gene symbols, p-values, and chemical formulas intact.
- Provide:
  1. **Version A (Concise & High-Impact)**
  2. **Version B (Conservative Academic)**
  3. **Sentence-by-Sentence Revision Rationale Table**

# Draft Abstract
{{粘贴你的摘要初稿}}
\`\`\`

---

## 2. 审稿人尖锐质疑（Major Revision）逐条回复信（Rebuttal Letter）生成器

\`\`\`markdown
# Role
你是一位经验丰富的 SCI 通讯作者，擅长撰写礼貌、诚恳且滴水不漏的审稿人回复信（Point-by-Point Response to Reviewers）。

# Input
- 审稿人意见（Reviewer Comment）：{{粘贴审稿人原话}}
- 我们补充的实验/解释数据：{{简述你的补充结果，若无法补实验请说明客观限制}}

# Output Structure
1. **礼貌致谢与核心定调（1~2 句）**：Thank you for this insightful observation...
2. **正面回答与新增证据陈述**：直击问题核心，引用具体图表编号（e.g., Fig. S3, Table 2）与统计显著性指标。
3. **正文修改对照块（Changes in Manuscript）**：
   - *Page X, Line Y (Revised Text)*: "..."
\`\`\`

---

## 3. 投稿前 Cover Letter 与 LaTeX 格式核查清单
- [ ] 所有基因名/物种学名（如 *Zea mays* L., *Arabidopsis thaliana*）均已斜体化
- [ ] 图表分辨率达标（位图 ≥ 300 dpi，组合折线图 ≥ 600 dpi，矢量 PDF/EPS 字体已嵌入）
- [ ] 统计检验均已注明样本量 $n$（Biological Replicates vs. Technical Replicates）与双尾 $P$ 值
`,

  "agri-anova-stats-plot-pack": `# 📦 交付包：农业田间试验方差分析 (ANOVA) 与 R/Python 显著性绘图模板包

> **状态**：✅ ANS 官方自动秒发（已永久解锁）  
> **内含工具**：双因素方差分析 + Tukey HSD 多重比较自动标字母（\`a, b, c\`）完整可运行脚本。

---

## 1. Python 一键方差分析与多重比较显著性汇总表脚本

\`\`\`python
import pandas as pd
import statsmodels.api as sm
from statsmodels.formula.api import ols
from statsmodels.stats.multicomp import pairwise_tukeyhsd

# 1. 读取田间试验数据 (列: Treatment, Block, Yield)
df = pd.read_csv("field_trial.csv")

# 2. 双因素方差分析 (Two-Way ANOVA)
model = ols("Yield ~ C(Treatment) + C(Block)", data=df).fit()
anova_table = sm.stats.anova_lm(model, typ=2)
print("=== ANOVA Table ===")
print(anova_table)

# 3. Tukey HSD 多重比较 (alpha = 0.05)
tukey = pairwise_tukeyhsd(endog=df["Yield"], groups=df["Treatment"], alpha=0.05)
print("\\n=== Tukey HSD Multiple Comparisons ===")
print(tukey.summary())
\`\`\`

---

## 2. R 语言 \`ggplot2 + multcompView\` 顶刊箱线图自动标显著性字母脚本

\`\`\`r
library(ggplot2)
library(multcompView)
library(dplyr)

# 自动计算 ANOVA + Tukey HSD 显著性字母 (a, b, c)
model <- aov(Yield ~ Treatment, data = df)
tukey <- TukeyHSD(model)
letters <- multcompLetters4(model, tukey)$Treatment$Letters

summary_df <- df %>%
  group_by(Treatment) %>%
  summarise(mean = mean(Yield), sd = sd(Yield), max_y = max(Yield)) %>%
  mutate(letter = letters[as.character(Treatment)])

ggplot(df, aes(x = Treatment, y = Yield, fill = Treatment)) +
  geom_boxplot(alpha = 0.75, width = 0.5, outlier.shape = NA) +
  geom_jitter(width = 0.12, size = 1.8, alpha = 0.7) +
  geom_text(data = summary_df, aes(x = Treatment, y = max_y * 1.06, label = letter),
            fontface = "bold", size = 4.5) +
  theme_classic(base_size = 13) +
  labs(x = "Treatment", y = "Grain Yield (t/ha)")
\`\`\`
`,

  "aigc-agri-short-drama-storyboard": `# 📦 交付包：乡村振兴 & 智慧农业微短剧 AI 分镜与 Seedance 视频提示词库

> **状态**：✅ ANS 官方自动秒发（已永久解锁）  
> **适配平台**：直接支持 [CAUAI 无限画布 (https://hb.cauai.fun/)](https://hb.cauai.fun/) 与 [Hypit 创作台 (/workflows/hypit)](/workflows/hypit)。

---

## 1. 黄金前 3 秒「未来玻璃温室」开场运镜 Prompt（中英双语）

- **画面提示词（Image / First Frame）**：
  \`Cinematic wide-angle shot of a futuristic smart glass greenhouse at sunrise at China Agricultural University, golden morning light streaming through mist, autonomous rover scanning emerald tomato vines with holographic NDVI telemetry overlay, ultra-detailed 8k photorealistic, Arri Alexa LF, anamorphic lens flare.\`
- **视频运镜提示词（Seedance / Kling I2V）**：
  \`Smooth FPV drone push-in camera movement gliding along the center aisle of the sunlit greenhouse, leaves gently swaying in micro-breeze, holographic data HUD subtly pulsing, 60fps cinematic motion.\`

---

## 2. 校园科创路演片 6 镜标准分镜表

| 镜号 | 景别与时长 | 画面核心内容 | 运镜指令 | 旁白与音效要点 |
| :--- | :--- | :--- | :--- | :--- |
| **Shot 01** | 大远景 · 3s | 清晨薄雾中的现代化试验田与无人机编队升空 | 航拍俯冲推进 | 低频科技感 Rise 音效 + 痛点提问 |
| **Shot 02** | 特写 · 2.5s | 叶片病斑微距镜头 → AI 视觉检测框瞬间锁定 | 微距缓慢推轨 | 清脆扫描锁定声（Beep） |
| **Shot 03** | 中景 · 3s | 实验室大屏实时跳动多模态诊断曲线与处方图 | 摇臂横移 | 讲解核心算法突破点 |
`,

  "cau-ai-engineer-interview-coach": `# 📦 交付包：AI 工程师与农信交叉岗大厂面试高频真题 & 简历深挖陪练包

> **状态**：✅ ANS 官方自动秒发（已永久解锁）  
> **适用岗位**：AI Agent 工程师、大模型应用研发、智慧农业算法岗、全栈研发实习/校招。

---

## 1. 简历项目「STAR + 技术折中（Trade-off）」重构公式

在面试官问到 **「请介绍一下你简历上这个 AI / 农大项目」** 时，严禁按流水账背功能，请按以下 4 步回答：
1. **业务痛点与硬指标边界（Situation）**：传统方案耗时长/准确率仅 X%，核心瓶颈在于长尾样本与实时性。
2. **为什么不用最简单的方案（Trade-off）**：对比了纯 Prompt、全量微调与「轻量 RAG + Function Calling 状态机」，解释为什么当前架构在成本与可控性上最优。
3. **你亲手解决的最难工程卡点（Action）**：如幻觉拦截、工具幂等重试、并发锁或延迟裁剪。
4. **可验证的量化收益（Result）**：首字延迟从 4.2s 降至 0.9s，端到端任务成功率达 94.6%。

---

## 2. 大厂一面/二面必问 10 大灵魂追问与满分答法
1. **RAG 检索召回率低怎么办？** → 混合检索（BM25 + Dense Embedding）+ 农业专业术语同义词扩展 + Reranker 重排 + 父子文档切片（Parent-Child Chunking）。
2. **Agent 调用工具死循环或参数幻觉怎么防？** → 严格 JSON Schema / Zod 校验 + 最大步数熔断（Max Steps = 3~5）+ 幂等键（Idempotency Key）防重复扣费。
`,

  "nextjs-agri-agent-dashboard-starter": `# 📦 交付包：智慧农业物联网与多模态 Agent 实时监控大屏 Next.js 源码模板

> **状态**：✅ ANS 官方自动秒发（已永久解锁）  
> **技术栈**：Next.js App Router + Tailwind CSS + Glassmorphism 深色大屏组件。

---

## 1. 核心大屏四宫格布局源码骨架（\`AgriDashboardGrid.tsx\`）

\`\`\`tsx
export function AgriDashboardGrid() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <header className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">CAU Smart Agri OS</span>
          <h1 className="text-xl font-black">智慧温室多模态 Agent 实时巡检中枢</h1>
        </div>
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
          ● 12 路传感器在线 · AI 巡检正常
        </span>
      </header>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-sm font-bold text-slate-400">微气候遥测 (温湿度 / 光合有效辐射 PAR)</h2>
          <p className="mt-3 text-3xl font-black text-emerald-400">24.8°C / 68% RH</p>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-sm font-bold text-slate-400">叶片病虫害视觉 Agent 识别率</h2>
          <p className="mt-3 text-3xl font-black text-sky-400">98.4% (早疫病 0 例)</p>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-sm font-bold text-slate-400">水肥一体化自动处方状态</h2>
          <p className="mt-3 text-3xl font-black text-amber-400">EC 2.1 mS/cm · pH 6.2</p>
        </section>
      </div>
    </div>
  );
}
\`\`\`
`,

  "open-pi-agent-rag-toolchain": `# 📦 交付包：Agent 多工具调用循环最小实现（TypeScript）

> **状态**：✅ ANS 官方自动秒发（已永久解锁）  
> **架构亮点**：零臃肿框架依赖、遵循极简 \`think -> tool_call -> observe -> answer\` 循环。

---

## 1. 极简 Agent 工具循环核心实现（TypeScript）

\`\`\`typescript
export interface AgentTool {
  name: string;
  description: string;
  execute: (query: string) => Promise<{ ok: boolean; data: unknown }>;
}

export async function runAgentLoop(
  userPrompt: string,
  tools: Record<string, AgentTool>,
  callModel: (messages: unknown[]) => Promise<{ toolCall?: { name: string; query: string }; text?: string }>
) {
  const history: unknown[] = [{ role: "user", content: userPrompt }];
  for (let step = 0; step < 3; step++) {
    const turn = await callModel(history);
    if (!turn.toolCall) return { reply: turn.text ?? "", steps: step + 1 };
    const tool = tools[turn.toolCall.name];
    const observation = tool
      ? await tool.execute(turn.toolCall.query)
      : { ok: false, data: "TOOL_NOT_FOUND" };
    history.push({ role: "tool", name: turn.toolCall.name, content: JSON.stringify(observation) });
  }
  return { reply: "已达到最大工具调用步数限制。", steps: 3 };
}
\`\`\`
`,

  "agri-hackathon-pitch-deck-pro": `# 📦 交付包：农客松 & 挑战杯国金级商业计划书与 10 页路演 PPT 蓝本

> **状态**：✅ ANS 官方自动秒发（已永久解锁）  
> **适用赛事**：中国农业大学农客松（Agri-Hackathon）、挑战杯、中国国际大学生创新大赛。

---

## 1. 国金级 10 页路演 PPT 黄金逻辑骨架

1. **P1 封面与一句话定位**：项目名称 + 解决什么作物/场景的什么痛点 + 降本增效核心数字。
2. **P2 一线真实痛点与田间调研证据**：用实拍图 + 农户/农企访谈原话证明「真需求」，拒绝凭空臆想。
3. **P3 现有方案局限与我们的核心技术壁垒**：对比传统人工与通用大模型，突出农学专有数据集与轻量化边缘部署。
4. **P4 产品实机演示流程（感知 → 决策 → 执行）**：展示真实 Web 工作台或硬件联动截图。
5. **P5 田间试验/实验室对照数据**：用 R/Python 方差分析显著性图表证明效果。
6. **P6 商业模式与单亩/单棚 ROI 测算表**：农户投入多少元 → 增产或省药多少元 → 回本周期几个月。
7. **P7 已落地试点与合作证明**：校内课题组背书、科技小院或示范基地试用反馈。
8. **P8 竞争格局与知识产权布局**：软著、专利、开源社区影响力。
9. **P9 团队分工与导师顾问团**：农学 + AI 复合背景互补。
10. **P10 未来 6 个月里程碑与融资/算力规划**。

---

## 2. 评委最常追问的 3 大犀利问题标准应答卡
- **Q1：「你们和直接调通用 ChatGPT / DeepSeek 有什么本质区别？」**  
  👉 **标准答法**：通用模型缺乏特定作物的生育期农事约束与本地植保规程，容易给出违规用药建议；我们构建了经过农大植保教材校验的结构化知识图谱与边缘传感器联动系统。
`,

  "cau-agri-smart-greenhouse-agent": `# 📦 交付包：中国农大智慧温室病虫害巡检与环控处方 Agent 全套方案

> **状态**：✅ ANS 官方自动秒发（已永久解锁）  
> **适用场景**：设施农业番茄/黄瓜/草莓温室病虫害早期视觉预警与环控联动。

---

## 1. 多模态叶片诊断 + 环控联调 System Prompt

\`\`\`markdown
你是由中国农业大学智慧农业团队研发的「设施温室植保与环控首席 Agent」。
请根据输入的【叶片异常特征】与【当前棚内温湿度/EC/pH】，输出：
1. 疑似病害/生理性缺素Top-2鉴别诊断及置信度；
2. 未来24小时通风、遮阳与滴灌水肥调控参数；
3. 绿色防控与低毒生物农药推荐清单（严格遵循安全间隔期）。
\`\`\`
`,
};

export function getOfficialDeliveryMarkdown(slug: string, title: string, deliverables: string[] = []): string {
  const preset = OFFICIAL_MARKET_DELIVERIES[slug];
  if (preset) return preset;
  const list = deliverables.map((d, idx) => `${idx + 1}. **${d}**`).join("\n");
  return `# 📦 交付包：${title}\n\n> **状态**：✅ ANS 官方自动秒发（已永久解锁）\n\n## 核心交付清单\n${list || "- 完整工具包与使用指南已解锁"}\n\n可直接前往 [ANS 工作台](/workspace) 或点击页面上方「打开项目」链接立即使用！`;
}
