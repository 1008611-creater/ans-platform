import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'

import { PROFILE, PROJECTS } from '../content/site'
import { useSite, type ViewMode } from '../site/context'

const EXPO_OUT = [0.16, 1, 0.3, 1] as const

const VIEW_ENTRIES: Array<{ mode: ViewMode; label: string; hint: string }> = [
  { mode: 'companion', label: '3D 陪伴舞台', hint: 'Companion Stage' },
  { mode: 'spiral', label: '螺旋记忆画廊', hint: '3D Spiral Gallery' },
  { mode: 'index', label: '巨型记忆索引', hint: 'Memory Index' },
  { mode: 'pipeline', label: '四视图与建模档案', hint: 'Image 2.5 + Tripo Pipeline' },
]

export function MenuPanel() {
  const { reducedMotion, setMenuOpen, setView, setDesktopPetOpen } = useSite()
  const closeRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const dur = reducedMotion ? 0 : 0.62

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  const openedAt = useRef(location.pathname)
  useEffect(() => {
    if (location.pathname !== openedAt.current) setMenuOpen(false)
  }, [location.pathname, setMenuOpen])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setMenuOpen])

  return (
    <motion.div
      className="menu"
      role="dialog"
      aria-modal="true"
      aria-label="纪念馆导航"
      data-menu="open"
      initial={{ opacity: 0, scale: 0.12, borderRadius: 999 }}
      animate={{ opacity: 1, scale: 1, borderRadius: 0 }}
      exit={{ opacity: 0, scale: 0.12, borderRadius: 999 }}
      transition={{ duration: dur, ease: EXPO_OUT }}
      style={{ transformOrigin: 'calc(100% - 46px) 34px' }}
    >
      <div className="menu__inner shell">
        <header className="menu__top">
          <Link to="/" className="menu__brand" onClick={() => setMenuOpen(false)}>
            <span className="menu__brand-cn">{PROFILE.name}</span>
            <span className="label menu__brand-en">{PROFILE.nameEn}</span>
          </Link>
          <button
            ref={closeRef}
            type="button"
            className="menu__close"
            onClick={() => setMenuOpen(false)}
          >
            关闭 <span aria-hidden="true">✕</span>
          </button>
        </header>

        <div className="menu__body">
          <nav className="menu__col menu__col--pages" aria-label="核心视图">
            <p className="label menu__col-title">四大视图与桌宠</p>
            <ul>
              {VIEW_ENTRIES.map((entry, i) => (
                <motion.li
                  key={entry.mode}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: dur ? 0.5 : 0, ease: EXPO_OUT, delay: dur ? 0.14 + i * 0.05 : 0 }}
                >
                  <button
                    type="button"
                    className="menu__page"
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => {
                      setView(entry.mode)
                      setMenuOpen(false)
                      navigate('/')
                    }}
                  >
                    <span className="menu__page-cn">{entry.label}</span>
                    <span className="menu__page-en">{entry.hint}</span>
                  </button>
                </motion.li>
              ))}
              <motion.li
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: dur ? 0.5 : 0, ease: EXPO_OUT, delay: dur ? 0.36 : 0 }}
              >
                <button
                  type="button"
                  className="menu__page"
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => {
                    setDesktopPetOpen(true)
                    setMenuOpen(false)
                  }}
                >
                  <span className="menu__page-cn">召唤纪念桌宠</span>
                  <span className="menu__page-en">Desktop Pet Companion</span>
                </button>
              </motion.li>
            </ul>
          </nav>

          <nav className="menu__col menu__col--work" aria-label="生前记忆篇章">
            <p className="label menu__col-title">记忆篇章 06</p>
            <ul>
              {PROJECTS.map((project, i) => (
                <motion.li
                  key={project.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: dur ? 0.5 : 0, ease: EXPO_OUT, delay: dur ? 0.2 + i * 0.05 : 0 }}
                >
                  <Link
                    to={`/work/${project.slug}`}
                    className="menu__project"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="label menu__project-index">{project.index}</span>
                    <span className="menu__project-main">
                      <span className="menu__project-cn">{project.title}</span>
                      <span className="menu__project-en serif-em">{project.titleEn}</span>
                    </span>
                    <span className="label menu__project-kicker">{project.kicker}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </nav>
        </div>

        <footer className="menu__foot">
          <span className="label">{PROFILE.breed}</span>
          <span className="label">{PROFILE.collar}</span>
          <span className="label">{PROFILE.available}</span>
        </footer>
      </div>
    </motion.div>
  )
}
