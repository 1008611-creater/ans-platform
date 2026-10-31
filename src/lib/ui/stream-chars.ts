/** 流式打字：每个新字 90ms 从 blur(6px) 晕开，相邻字错开 30ms。 */
export const STREAM_STAGGER_MS = 30;
/** 一次到达很长的回复时，错开时间封顶，避免最后的字要等十几秒。 */
export const STREAM_MAX_DELAY_MS = 1200;

type HastNode = { type: string; tagName?: string; value?: string; children?: HastNode[]; properties?: Record<string, unknown> };

/** 按「字」切分：中文逐字，英文逐个字母，空白保持原样。 */
export function streamDelay(index: number) {
  return Math.min(index * STREAM_STAGGER_MS, STREAM_MAX_DELAY_MS);
}

/**
 * rehype 插件：把正文文字拆成逐字 span，代码块不拆。
 * 只在新到达的回复上启用；历史消息直接显示。
 */
export function rehypeStreamChars() {
  return (tree: HastNode) => {
    let index = 0;
    const visit = (node: HastNode) => {
      if (!node.children || node.tagName === "code" || node.tagName === "pre") return;
      node.children = node.children.flatMap((child): HastNode[] => {
        if (child.type !== "text" || !child.value) { visit(child); return [child]; }
        return Array.from(child.value).map((char) => /\s/.test(char)
          ? { type: "text", value: char }
          : { type: "element", tagName: "span", properties: { className: ["ans-stream-char"], style: `animation-delay:${streamDelay(index++)}ms` }, children: [{ type: "text", value: char }] });
      });
    };
    visit(tree);
  };
}
