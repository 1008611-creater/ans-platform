import { motion } from 'motion/react'

import { CONTACT_NOTES, PROFILE, PROJECTS } from '../content/site'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSite } from '../site/context'

const EXPO_OUT = [0.16, 1, 0.3, 1] as const

export function Contact() {
  const { reducedMotion } = useSite()
  useDocumentTitle('联系')
  const rise = (delay = 0) => ({
    initial: { opacity: 0, y: reducedMotion ? 0 : 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-12% 0px -12% 0px' },
    transition: { duration: reducedMotion ? 0 : 0.6, ease: EXPO_OUT, delay: reducedMotion ? 0 : delay },
  })

  return (
    <main className="contact" id="main">
      <header className="page-head shell">
        <motion.p className="label page-head__tag" {...rise(0)}>
          联系
        </motion.p>
        <motion.h1 className="page-head__title" {...rise(0.05)}>
          <span className="hl-line">
            <span className="hl-phrase">有具体的事，</span>
          </span>
          <span className="hl-line">
            <span className="hl-phrase">我们</span>
            <span className="hl-phrase mark">直接聊</span>
          </span>
        </motion.h1>
        <motion.p className="page-head__lead" {...rise(0.1)}>
          目前{PROFILE.available}。岗位匹配、项目合作与作品细节都可以直接来信，我通常当天回复。
        </motion.p>
      </header>

      <section className="contact__main shell" aria-label="联系方式">
        <motion.a className="contact__primary" href={`mailto:${PROFILE.email}`} {...rise(0.04)}>
          <span className="label">邮箱</span>
          <span className="contact__value">{PROFILE.email}</span>
          <span className="contact__arrow" aria-hidden="true">
            →
          </span>
        </motion.a>

        <motion.a
          className="contact__primary"
          href={`tel:${PROFILE.phone}`}
          {...rise(0.08)}
        >
          <span className="label">电话</span>
          <span className="contact__value">{PROFILE.phone}</span>
          <span className="contact__arrow" aria-hidden="true">
            →
          </span>
        </motion.a>

        <motion.a
          className="contact__primary"
          href={PROFILE.github}
          target="_blank"
          rel="noreferrer"
          {...rise(0.12)}
        >
          <span className="label">GitHub</span>
          <span className="contact__value">{PROFILE.githubHandle}</span>
          <span className="contact__arrow" aria-hidden="true">
            →
          </span>
        </motion.a>

        <motion.a
          className="contact__primary"
          href={PROFILE.legacyResume}
          target="_blank"
          rel="noreferrer"
          {...rise(0.16)}
        >
          <span className="label">旧版在线简历</span>
          <span className="contact__value">resume.lsb0713.online</span>
          <span className="contact__arrow" aria-hidden="true">
            →
          </span>
        </motion.a>
      </section>

      <section className="contact__side shell" aria-label="沟通前可以先告诉我">
        <motion.div className="contact__notes" {...rise(0)}>
          <p className="label">来信时，如果你方便，可以顺带说一下</p>
          <ul>
            {CONTACT_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </motion.div>
        <motion.div className="contact__notes" {...rise(0.06)}>
          <p className="label">可以直接对应的案例</p>
          <ul>
            {PROJECTS.map((project) => (
              <li key={project.slug}>
                {project.index} {project.title}
              </li>
            ))}
          </ul>
          <p className="label contact__foot-note">
            {PROFILE.name} · {PROFILE.nameEn} · {PROFILE.year}
          </p>
        </motion.div>
      </section>
    </main>
  )
}
