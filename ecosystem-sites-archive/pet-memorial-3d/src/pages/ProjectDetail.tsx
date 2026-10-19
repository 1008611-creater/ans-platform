import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'

import { getNeighbours, getProject } from '../content/site'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSite } from '../site/context'

const EXPO_OUT = [0.16, 1, 0.3, 1] as const

export function ProjectDetail() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const project = getProject(slug)
  const { reducedMotion, setActiveAction, toggleAccessory, activeAccessories, setView } = useSite()
  useDocumentTitle(project ? `${project.title} · 生前记忆` : '未找到')
  const dur = reducedMotion ? 0 : 0.55

  if (!project) return <Navigate to="/not-found" replace />

  const { prev, next } = getNeighbours(project.slug)
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: reducedMotion ? 0 : 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: dur, ease: EXPO_OUT, delay: dur ? delay : 0 },
  })

  const handleReenactIn3D = () => {
    if (project.defaultAction) setActiveAction(project.defaultAction)
    if (project.defaultAccessory && !activeAccessories.includes(project.defaultAccessory)) {
      toggleAccessory(project.defaultAccessory)
    }
    setView('companion')
    navigate('/')
  }

  return (
    <main className="detail" id="main">
      <article>
        <header className="detail__head shell">
          <motion.div className="detail__crumbs" {...rise(0)}>
            <Link to="/" className="label detail__crumb">
              ← 返回相册
            </Link>
            <span className="label detail__crumb-sep" aria-hidden="true">
              /
            </span>
            <span className="label">{project.period}</span>
          </motion.div>

          <motion.h1 className="detail__title" {...rise(0.06)}>
            {project.title}
            <span className="detail__title-en serif-em">{project.titleEn}</span>
          </motion.h1>

          <motion.p className="detail__lead" {...rise(0.1)}>
            {project.lead}
          </motion.p>

          <motion.div style={{ marginTop: '22px' }} {...rise(0.14)}>
            <button type="button" className="gate__btn gate__btn--primary" onClick={handleReenactIn3D}>
              去 3D 空间陪它重温这一刻 →
            </button>
          </motion.div>
        </header>

        <motion.figure className="detail__hero shell" {...rise(0.05)}>
          <img
            src={project.media[0].src}
            alt={project.media[0].caption}
            fetchPriority="high"
            decoding="async"
          />
          <figcaption className="label">{project.media[0].caption}</figcaption>
        </motion.figure>

        {project.media.length > 1 && (
          <section className="detail__gallery shell" aria-label="更多照片">
            {project.media.slice(1).map((item) => (
              <motion.figure className="detail__shot" key={item.src} data-wide="true" {...rise(0.03)}>
                <img src={item.src} alt={item.caption} loading="lazy" decoding="async" />
                <figcaption className="label">{item.caption}</figcaption>
              </motion.figure>
            ))}
          </section>
        )}

        <nav className="detail__nav shell" aria-label="相邻记忆">
          <Link className="detail__nav-item" to={`/work/${prev.slug}`}>
            <span className="label">← 上一张记忆</span>
            <span className="detail__nav-title">{prev.title}</span>
          </Link>
          <Link className="detail__nav-item detail__nav-item--next" to={`/work/${next.slug}`}>
            <span className="label">下一张记忆 →</span>
            <span className="detail__nav-title">{next.title}</span>
          </Link>
        </nav>
      </article>
    </main>
  )
}
