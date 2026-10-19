import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'

import { PROFILE } from '../content/site'
import { useSite } from '../site/context'

const EXPO_OUT = [0.16, 1, 0.3, 1] as const

/**
 * 纪念馆入场门。默认静音，声音由主人主动选择。
 */
export function EntryGate() {
  const { enter, reducedMotion } = useSite()
  const primaryRef = useRef<HTMLButtonElement>(null)
  const dur = reducedMotion ? 0 : 0.9

  useEffect(() => {
    primaryRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') enter(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enter])

  return (
    <motion.section
      className="gate"
      role="dialog"
      aria-modal="true"
      aria-label="进入数字永生纪念馆"
      exit={{ y: '-101%' }}
      transition={{ duration: dur, ease: EXPO_OUT }}
    >
      <div className="gate__inner shell">
        <header className="gate__top">
          <span className="label">
            {PROFILE.name} / {PROFILE.nameEn}
          </span>
          <span className="label">{PROFILE.breed}</span>
        </header>

        <div className="gate__mid">
          <motion.p
            className="label gate__eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur ? 0.6 : 0, ease: EXPO_OUT, delay: dur ? 0.1 : 0 }}
          >
            {PROFILE.role} · IMAGE 2.5 + TRIPO H3.1 + 36 BONES
          </motion.p>

          <motion.h1
            className="gate__title"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur ? 0.9 : 0, ease: EXPO_OUT, delay: dur ? 0.18 : 0 }}
          >
            <span className="hl-line">
              <span className="hl-phrase">有些告别</span>
              <span className="hl-phrase">不是终点，</span>
            </span>
            <span className="hl-line">
              <span className="hl-phrase">它只是换了</span>
              <span className="hl-phrase mark">一种方式陪你</span>
            </span>
          </motion.h1>

          <motion.p
            className="gate__lead"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur ? 0.9 : 0, ease: EXPO_OUT, delay: dur ? 0.28 : 0 }}
          >
            {PROFILE.intro}
          </motion.p>
        </div>

        <motion.footer
          className="gate__foot"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur ? 0.9 : 0, ease: EXPO_OUT, delay: dur ? 0.38 : 0 }}
        >
          <div className="gate__actions">
            <button
              ref={primaryRef}
              type="button"
              className="gate__btn gate__btn--primary"
              onClick={() => enter(true)}
            >
              带声音与轻哼进入
            </button>
            <button type="button" className="gate__btn" onClick={() => enter(false)}>
              静默陪伴进入
            </button>
          </div>

          <div className="gate__meta">
            <span className="label">{PROFILE.collar}</span>
            <span className="label">{PROFILE.eyes}</span>
          </div>
        </motion.footer>
      </div>
    </motion.section>
  )
}
