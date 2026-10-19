import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import type { Project } from '../content/site'
import { useSite } from '../site/context'

type Props = { projects: Project[] }

/**
 * 文字索引视图。每行只放项目名，元信息与预览图随悬停出现。
 * 触屏没有悬停，改为常显预览并把整行做成大点击区。
 */
export function IndexList({ projects }: Props) {
  const { finePointer, reducedMotion } = useSite()
  const [hovered, setHovered] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const preview = projects.find((project) => project.slug === hovered) ?? null

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!finePointer || reducedMotion) return
    const node = previewRef.current
    if (!node) return
    node.style.transform = `translate3d(${event.clientX + 28}px, ${event.clientY - 110}px, 0)`
  }

  return (
    <div className="index" onPointerMove={onMove}>
      <ol className="index__list">
        {projects.map((project) => (
          <li key={project.slug} className="index__row">
            <Link
              to={`/work/${project.slug}`}
              className="index__link"
              data-active={hovered === project.slug}
              onPointerEnter={() => setHovered(project.slug)}
              onPointerLeave={() => setHovered((current) => (current === project.slug ? null : current))}
              onFocus={() => setHovered(project.slug)}
              onBlur={() => setHovered((current) => (current === project.slug ? null : current))}
            >
              <span className="label index__num">{project.index}</span>
              <span className="index__name">
                <span className="index__name-cn">{project.title}</span>
                <span className="index__name-en serif-em">{project.titleEn}</span>
              </span>
              <span className="index__meta">
                <span className="label index__kick">{project.kicker}</span>
                <span className="label index__period">{project.period}</span>
              </span>
              <span className="index__peek" aria-hidden="true">
                <img src={project.media[0].src} alt="" loading="lazy" decoding="async" />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {finePointer && !reducedMotion && (
        <div className="index__preview" ref={previewRef} data-on={preview !== null} aria-hidden="true">
          {preview && <img src={preview.media[0].src} alt="" decoding="async" />}
        </div>
      )}
    </div>
  )
}
