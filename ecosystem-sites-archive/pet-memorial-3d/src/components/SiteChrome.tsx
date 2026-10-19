import { Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'

import { PROFILE } from '../content/site'
import { useSite, type ViewMode } from '../site/context'
import { RotatingBadge } from './RotatingBadge'
import { SoundToggle } from './SoundToggle'

const VIEWS: Array<{ id: ViewMode; label: string; hint: string }> = [
  { id: 'companion', label: '陪它玩', hint: '在 3D 空间或手机竖屏桌宠里摸摸它的头、和它拉钩或生成朋友圈合照' },
  { id: 'spiral', label: '记忆相册', hint: '以 3D 环绕画廊重温它生前的 5 张真实照片' },
  { id: 'index', label: '时光目录', hint: '按篇章翻看它留下的每一个温暖瞬间' },
  { id: 'pipeline', label: '3D打印与赠品', hint: '查看 FDM / 光固化 SLA 手办打样、下载防水 STL 切片模型与配套赠品方案' },
]

export function SiteChrome() {
  const { view, setView, setMenuOpen, menuOpen, entered, desktopPetOpen, setDesktopPetOpen } =
    useSite()
  const { pathname } = useLocation()
  const onHome = pathname === '/'

  return (
    <>
      <header className="chrome" data-ready={entered} data-menu-open={menuOpen}>
        <div className="chrome__bar">
          <Link to="/" className="chrome__brand" onClick={() => setView('companion')}>
            <span className="chrome__brand-cn">{PROFILE.name}</span>
            <span className="chrome__brand-tag label">{PROFILE.role}</span>
          </Link>

          <div className="chrome__center">
            {onHome ? (
              <div className="switch" role="group" aria-label="视图切换">
                {VIEWS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="switch__btn"
                    aria-pressed={view === item.id}
                    title={item.hint}
                    onClick={() => setView(item.id)}
                  >
                    {view === item.id && (
                      <motion.span
                        className="switch__pill"
                        layoutId="view-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                      />
                    )}
                    <span className="switch__label">{item.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <Link to="/" className="chrome__back">
                <span aria-hidden="true">←</span> 返回陪它
              </Link>
            )}
          </div>

          <div className="chrome__right-actions">
            <button
              type="button"
              className="chrome__pet-toggle label"
              data-active={desktopPetOpen}
              onClick={() => setDesktopPetOpen(!desktopPetOpen)}
            >
              <span className="chrome__pet-dot" aria-hidden="true" />
              {desktopPetOpen ? '桌宠陪伴中' : '领养到桌面'}
            </button>

            <button
              type="button"
              className="chrome__menu"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="chrome__menu-dot" aria-hidden="true" />
              更多
            </button>
          </div>
        </div>
      </header>

      {onHome && entered && view === 'spiral' && <RotatingBadge />}
      <SoundToggle />
    </>
  )
}
