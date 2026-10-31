import { streamDelay } from "./stream-chars";

/**
 * 纯文本流式显示：每个字 90ms 从 blur(6px) 晕开到清晰，相邻字错开 30ms。
 * 按位置做 key，文字变长时已出现的字复用原节点、不会重播动画，只有新字晕开。
 */
export function StreamText({ text }: { text: string }) {
  return <>
    {Array.from(text).map((char, index) => /\s/.test(char)
      ? char
      : <span key={index} className="ans-stream-char" style={{ animationDelay: `${streamDelay(index)}ms` }}>{char}</span>)}
  </>;
}
