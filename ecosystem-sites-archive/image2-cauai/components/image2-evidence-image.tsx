"use client";
import { useState } from 'react';
type Props = { src: string; label: string; sourceUrl?: string; onPreview?: (src: string) => void; eager?: boolean };
export function Image2EvidenceImage({ src, label, sourceUrl, onPreview, eager }: Props) {
  const [failed, setFailed] = useState(false); const [attempt, setAttempt] = useState(0);
  const retrySrc = attempt ? src + (src.includes('?') ? '&' : '?') + 'retry=' + attempt : src;
  return <figure className="case-evidence-figure">
    <button type="button" className="case-evidence-preview" aria-label={'放大' + label} onClick={() => onPreview ? onPreview(retrySrc) : window.open(retrySrc, "_blank", "noopener,noreferrer")}>
      {!failed && <img key={retrySrc} src={retrySrc} alt={label} loading={eager ? "eager" : "lazy"} onError={() => setFailed(true)} />}
      {failed && <span className="case-image-fallback">图片加载失败，提示词仍可用</span>}
    </button>
    <figcaption>{label} · <button type="button" onClick={() => { setFailed(false); setAttempt(Date.now()); }}>重新加载图片</button>{sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer">查看来源</a>}</figcaption>
  </figure>;
}