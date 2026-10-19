"use client";

import { useState } from "react";
import { planDirectorScene, type ScenePlan } from "@/app/lib/director-agent";
import styles from "./director-agent.module.css";

type Props = { busy: boolean; onApply: (plan: ScenePlan) => void };

export default function DirectorAgentPanel({ busy, onApply }: Props) {
  const [brief, setBrief] = useState("两个人在海边日落合影，人物清楚，竖幅");
  const [ratio, setRatio] = useState<"9:16" | "16:9">("9:16");
  const [count, setCount] = useState(2);
  const [plans, setPlans] = useState<ScenePlan[]>([]);
  const [error, setError] = useState("");
  const [basedOn, setBasedOn] = useState("");
  const current = JSON.stringify([brief, ratio, count]);
  const stale = plans.length > 0 && basedOn !== current;
  return <section className={styles.panel} aria-labelledby="director-agent-title">
    <div><span className="eyebrow">BRIEF → COZYCLAY → FRAME</span><h2 id="director-agent-title">说出画面，先搭一场戏</h2>
      <p>先用内置布景、人物站位和摄影机完成构图预演，再在真正的 CozyClay 里调整。</p></div>
    <form onSubmit={(event) => { event.preventDefault(); try { setPlans(planDirectorScene({ brief, peopleCount: count, aspectRatio: ratio }).plans); setBasedOn(current); setError(""); } catch { setError("请输入 3–800 字的场景需求。"); } }}>
      <label className="field"><span>你想拍怎样的画面？</span><textarea className="text-input" required minLength={3} maxLength={800} value={brief} onChange={(event) => setBrief(event.target.value)} /></label>
      <div className={styles.options}><label>人物数量<select className="text-input" value={count} onChange={(event) => setCount(Number(event.target.value))}>{[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value} 人</option>)}</select></label>
        <label>构图画幅<select className="text-input" value={ratio} onChange={(event) => setRatio(event.target.value as typeof ratio)}><option>9:16</option><option>16:9</option></select></label>
        <button type="submit" className="button primary" disabled={busy}>生成三种构图方案</button></div>
    </form>
    <p className="microcopy">规划方式：本地规则，无大模型调用。支持海岸、旧城、山野三套概念布景；复杂语义、服装与拥抱等姿势尚未执行。当前原生画幅不含 3:4。描述不会发往服务器。</p>
    {error && <p role="alert">{error}</p>}
    {stale && <p role="status">需求已变化，请重新生成方案后再应用。</p>}
    <div className={styles.plans}>{plans.map((plan, index) => <article key={plan.id}><span>方案 {index + 1}</span><h3>{plan.scene.title} · {plan.camera.shotScale}</h3>
      <p>{plan.characters.length} 人 · {plan.camera.angle} · {plan.camera.aspectRatio}</p><p>{plan.rationale}</p>
      <button type="button" className="button secondary" disabled={busy || stale} onClick={() => onApply(plan)}>在 CozyClay 搭建方案 {index + 1}</button>
    </article>)}</div>
  </section>;
}
