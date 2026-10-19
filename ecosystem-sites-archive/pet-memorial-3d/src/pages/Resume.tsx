import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'

import {
  RESUME_EDUCATION,
  RESUME_FOOTNOTE,
  RESUME_HIGHLIGHTS,
  RESUME_INTRO,
  RESUME_PROJECTS,
  RESUME_SKILLS,
  RESUME_TARGET,
} from '../content/resume'
import { PROFILE } from '../content/site'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSite } from '../site/context'

const EXPO_OUT = [0.16, 1, 0.3, 1] as const

/**
 * 简历页。
 *
 * 这一页刻意不做滚动揭示动效：它的用途是被快速扫读和打印，
 * 内容必须在任何时刻都处于可见状态（打印时 IntersectionObserver 不一定触发）。
 * 动效只保留首屏进入的一次位移。
 */
export function Resume() {
  const { reducedMotion } = useSite()
  useDocumentTitle('简历')

  const dur = reducedMotion ? 0 : 0.55
  const rise = (delay = 0) => ({
    initial: { opacity: 0, y: reducedMotion ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: dur, ease: EXPO_OUT, delay: reducedMotion ? 0 : delay },
  })

  return (
    <main className="resume" id="main">
      <PrintHead />

      <header className="page-head shell resume__head">
        <motion.p className="label page-head__tag" {...rise(0)}>
          简历
        </motion.p>
        <motion.h1 className="page-head__title" {...rise(0.04)}>
          {PROFILE.name}
          <span className="resume__name-en serif-em">{PROFILE.nameEn}</span>
        </motion.h1>
        <motion.p className="page-head__lead resume__role" {...rise(0.08)}>
          求职意向：<span className="mark">{RESUME_TARGET.role}</span>
          <span className="resume__avail">{RESUME_TARGET.availability}</span>
        </motion.p>
        <motion.dl className="page-head__facts resume__facts" {...rise(0.12)}>
          <div>
            <dt className="label">现居</dt>
            <dd>{PROFILE.location}</dd>
          </div>
          <div>
            <dt className="label">邮箱</dt>
            <dd>
              <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
            </dd>
          </div>
          <div>
            <dt className="label">电话</dt>
            <dd>
              <a href={`tel:${PROFILE.phone}`}>{PROFILE.phone}</a>
            </dd>
          </div>
          <div>
            <dt className="label">GitHub</dt>
            <dd>
              <a href={PROFILE.github} target="_blank" rel="noreferrer">
                {PROFILE.githubHandle}
              </a>
            </dd>
          </div>
        </motion.dl>
      </header>

      <div className="resume__actions shell">
        <button type="button" className="btn btn--solid" onClick={() => window.print()}>
          导出 PDF
        </button>
        <CopyEmail />
        <a className="btn" href={PROFILE.legacyResume} target="_blank" rel="noreferrer">
          旧版在线简历
        </a>
        <Link className="btn" to="/">
          查看作品集
        </Link>
        <p className="label resume__hint">
          导出时在打印面板里选「另存为 PDF」，页面已按 A4 排好版
        </p>
      </div>

      <Section tag="成果" title="四条可以核对的量化结果">
        <ul className="resume__figures">
          {RESUME_HIGHLIGHTS.map((item) => (
            <li className="resume__figure" key={item.label}>
              <p className="resume__figure-value">
                <span
                  className={
                    item.figure.length > 5
                      ? 'resume__figure-num resume__figure-num--long'
                      : 'resume__figure-num'
                  }
                >
                  {item.figure}
                </span>
                <span className="resume__figure-unit">{item.unit}</span>
              </p>
              <p className="resume__figure-label">{item.label}</p>
              <p className="label resume__figure-note">{item.note}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tag="简介" title="我在做的事">
        <p className="resume__intro">{RESUME_INTRO}</p>
        <p className="label resume__basis">{RESUME_TARGET.basis}</p>
      </Section>

      <Section tag="经历" title="核心项目经历">
        <ol className="resume__entries">
          {RESUME_PROJECTS.map((entry) => (
            <li className="resume__entry" key={entry.index}>
              <div className="resume__entry-head">
                <span className="label resume__entry-num">{entry.index}</span>
                <div className="resume__entry-title-wrap">
                  <h3 className="resume__entry-title">
                    {entry.title}
                    {entry.titleEn && (
                      <span className="serif-em resume__entry-en">{entry.titleEn}</span>
                    )}
                  </h3>
                  <p className="resume__entry-meta">
                    <span>{entry.role}</span>
                    <span className="resume__dot" aria-hidden="true">
                      ·
                    </span>
                    <span className="label">{entry.period}</span>
                  </p>
                </div>
              </div>
              <p className="label resume__entry-stack">{entry.stack}</p>
              <ul className="resume__bullets">
                {entry.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Section>

      <Section tag="能力" title="专业能力">
        <div className="resume__skills">
          {RESUME_SKILLS.map((skill) => (
            <article className="resume__skill" key={skill.title}>
              <h3 className="resume__skill-title">{skill.title}</h3>
              <p className="label resume__skill-keywords">{skill.keywords.join(' / ')}</p>
              <ul className="resume__bullets">
                {skill.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section tag="背景" title="教育背景">
        <div className="resume__edu">
          <p className="resume__edu-school">
            {RESUME_EDUCATION.school}
            <span className="label resume__edu-meta">
              {RESUME_EDUCATION.major} · {RESUME_EDUCATION.degree} · {RESUME_EDUCATION.period}
            </span>
          </p>
          <p className="resume__edu-status">{RESUME_EDUCATION.status}</p>
        </div>
      </Section>

      <footer className="resume__foot shell">
        <p className="label">{RESUME_FOOTNOTE}</p>
        <p className="label">
          {PROFILE.name} · {PROFILE.nameEn} · {PROFILE.year}
        </p>
      </footer>
    </main>
  )
}

/** 打印专用页眉。屏幕上隐藏，避免与上面的正式标题重复。 */
function PrintHead() {
  return (
    <header className="resume__print" aria-hidden="true">
      <p className="resume__print-name">
        {PROFILE.name}
        <span>{PROFILE.nameEn}</span>
      </p>
      <p className="resume__print-role">
        {PROFILE.role} · 求职意向：{RESUME_TARGET.role} · {RESUME_TARGET.availability}
      </p>
      <p className="resume__print-contact">
        {PROFILE.location} · {PROFILE.phone} · {PROFILE.email} · {PROFILE.legacyResume}
      </p>
    </header>
  )
}

function Section({
  tag,
  title,
  children,
}: {
  tag: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="resume__section shell">
      <h2 className="section-head">
        <span className="label section-head__tag">{tag}</span>
        <span className="section-head__line">{title}</span>
      </h2>
      {children}
    </section>
  )
}

/** 复制邮箱。失败时给真实提示，不做「已复制」的假成功。 */
function CopyEmail() {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle')
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email)
      setState('done')
    } catch {
      setState('failed')
    }
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 2200)
  }, [])

  return (
    <button type="button" className="btn" onClick={copy}>
      {state === 'done' ? '邮箱已复制' : state === 'failed' ? '复制失败，请手动选中' : '复制邮箱'}
    </button>
  )
}
