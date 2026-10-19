import { Link } from 'react-router-dom'
import { motion } from 'motion/react'

import { CAPABILITIES, EDUCATION, PROFILE, WORK_SURFACE, PROJECTS } from '../content/site'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSite } from '../site/context'

const EXPO_OUT = [0.16, 1, 0.3, 1] as const

export function About() {
  const { reducedMotion } = useSite()
  useDocumentTitle('关于')
  const rise = (delay = 0) => ({
    initial: { opacity: 0, y: reducedMotion ? 0 : 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-12% 0px -12% 0px' },
    transition: { duration: reducedMotion ? 0 : 0.6, ease: EXPO_OUT, delay: reducedMotion ? 0 : delay },
  })

  return (
    <main className="about" id="main">
      <header className="page-head shell">
        <motion.p className="label page-head__tag" {...rise(0)}>
          关于
        </motion.p>
        <motion.h1 className="page-head__title" {...rise(0.05)}>
          <span className="hl-line">
            <span className="hl-phrase">我在做的事情，</span>
          </span>
          <span className="hl-line">
            <span className="hl-phrase">是把</span>
            <span className="hl-phrase mark">复杂</span>
            <span className="hl-phrase">收成</span>
          </span>
          <span className="hl-line">
            <span className="hl-phrase">一条</span>
            <span className="hl-phrase">能落地的主线</span>
          </span>
        </motion.h1>
        <motion.p className="page-head__lead" {...rise(0.1)}>
          {PROFILE.intro}
        </motion.p>
        <motion.dl className="page-head__facts" {...rise(0.14)}>
          <div>
            <dt className="label">现居</dt>
            <dd>{PROFILE.location}</dd>
          </div>
          <div>
            <dt className="label">状态</dt>
            <dd>{PROFILE.available}</dd>
          </div>
          <div>
            <dt className="label">方向</dt>
            <dd>{PROFILE.role}</dd>
          </div>
        </motion.dl>
      </header>

      <section className="about__section shell" aria-label="可以做的事">
        <motion.h2 className="section-head" {...rise(0)}>
          <span className="label section-head__tag">能力</span>
          <span className="section-head__line">三件我反复做过的事</span>
        </motion.h2>
        <ol className="about__cap">
          {CAPABILITIES.map((item, i) => (
            <motion.li className="about__cap-item" key={item.index} {...rise(0.05 * i)}>
              <span className="label about__cap-num">{item.index}</span>
              <div className="about__cap-main">
                <h3 className="about__cap-title">{item.title}</h3>
                <p className="about__cap-body">{item.body}</p>
                <p className="label about__cap-src">{item.evidence}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="about__section shell" aria-label="工作方式">
        <motion.h2 className="section-head" {...rise(0)}>
          <span className="label section-head__tag">方式</span>
          <span className="section-head__line">我通常怎么推进一段工作</span>
        </motion.h2>
        <div className="about__surface">
          {WORK_SURFACE.map((item, i) => (
            <motion.article className="about__surface-item" key={item.title} {...rise(0.05 * i)}>
              <h3 className="about__surface-title">{item.title}</h3>
              <p className="about__surface-body">{item.body}</p>
              <ul className="about__tags">
                {item.tags.map((tag) => (
                  <li className="about__tag" key={tag}>
                    {tag}
                  </li>
                ))}
              </ul>
              <p className="label about__surface-src">落在：{item.sources.join(' / ')}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="about__section shell" aria-label="教育背景">
        <motion.h2 className="section-head" {...rise(0)}>
          <span className="label section-head__tag">背景</span>
          <span className="section-head__line">{EDUCATION.school}</span>
        </motion.h2>
        <motion.div className="about__edu" {...rise(0.04)}>
          <p className="about__edu-major">
            {EDUCATION.major}
            <span className="label about__edu-degree">
              {EDUCATION.degree} · {EDUCATION.period}
            </span>
          </p>
          <p className="about__edu-body">{EDUCATION.body}</p>
          <ul className="about__tags">
            {EDUCATION.courses.map((course) => (
              <li className="about__tag" key={course}>
                {course}
              </li>
            ))}
          </ul>
        </motion.div>
      </section>

      <section className="about__section shell" aria-label="案例索引">
        <motion.h2 className="section-head" {...rise(0)}>
          <span className="label section-head__tag">案例</span>
          <span className="section-head__line">四件可以细看的事</span>
        </motion.h2>
        <ul className="about__list">
          {PROJECTS.map((project) => (
            <li key={project.slug}>
              <Link className="about__row" to={`/work/${project.slug}`}>
                <span className="label about__row-num">{project.index}</span>
                <span className="about__row-title">{project.title}</span>
                <span className="label about__row-kick">{project.kicker}</span>
                <span className="about__row-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="about__cta shell">
        <motion.div className="about__cta-inner" {...rise(0)}>
          <p className="label">下一步</p>
          <h2 className="about__cta-title">
            <span className="hl-line">
              <span className="hl-phrase">想聊聊天，</span>
            </span>
            <span className="hl-line">
              <span className="hl-phrase">或者直接看</span>
              <span className="hl-phrase mark">手上的东西</span>
            </span>
          </h2>
          <div className="about__cta-actions">
            <Link className="btn btn--solid" to="/contact">
              获取联系方式
            </Link>
            <a className="btn" href={PROFILE.legacyResume} target="_blank" rel="noreferrer">
              旧版在线简历
            </a>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
