import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import type { Project } from '../content/site'
import { useSite } from '../site/context'

type Props = { projects: Project[] }

type Frame = { spin: number; radius: number; perspective: number }

/*
 * 卡片中心的屏幕位置 = 三维坐标经 perspective 投影：
 *   X = r·sinθ, Y = -r·TILT·cosθ, Z = r·cosθ - 0.74r
 *   屏幕偏移 = (X, Y) · P / (P - Z)
 * 轨道环按同一个式子采样成路径，所以它必然穿过每张卡的中心。
 * 环是空间里固定的一圈，只有半径或透视变化时才需要重算。
 */
function orbitPath(radius: number, perspective: number, width: number, height: number): string {
  const cx = width / 2
  const cy = height / 2
  const back = radius * 0.74
  const steps = 96
  let d = ''
  for (let i = 0; i <= steps; i += 1) {
    const theta = (i / steps) * Math.PI * 2
    const z = Math.cos(theta) * radius - back
    const scale = perspective / (perspective - z)
    const x = cx + Math.sin(theta) * radius * scale
    const y = cy - Math.cos(theta) * radius * TILT * scale
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }
  return `${d}Z`
}

type Sim = {
  spin: number
  target: number
  velocity: number
  dragging: boolean
  lastX: number
  lastY: number
  lastTime: number
  lastInput: number
  snapped: boolean
}

const IDLE_DELAY = 3400
const IDLE_SPEED = 7.5

/*
 * 环面相对水平面的倾斜系数。卡片与轨道环共用这个值，
 * 否则环会从卡片中间穿过去，看起来像两条不相干的图形。
 */
const TILT = 0.24

/**
 * 把一张卡按当前自转角摆到三维空间里。
 * 位置由脚本逐帧写入，不走 React 渲染：这是这里唯一能稳住 60fps 的写法。
 */
function placeCard(el: HTMLElement, index: number, count: number, frame: Frame): number {
  const angle = frame.spin + (index * 360) / count
  const theta = (angle * Math.PI) / 180
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  const x = sin * frame.radius
  /*
   * 圆心整体沿视线后移，让最靠前的卡片停在小幅放大的位置。
   * 不后移的话正面那张会被放大到 1.5 倍，直接盖住下方读数区。
   */
  const z = cos * frame.radius - frame.radius * 0.74
  const y = -cos * frame.radius * TILT
  const depth = (cos + 1) / 2

  /*
   * 只做平移的话每张卡都正对观众，看起来是一条横排而不是一圈。
   * 卡片要沿环面转过去，环的纵深才成立；但转满角度侧卡会被压成一条线，
   * 所以只转六成，既看得出朝向，又留得住画面。
   */
  const turnY = sin * 58
  const turnX = -cos * 4

  el.style.transform =
    `translate3d(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px), ${z.toFixed(2)}px)` +
    ` rotateY(${turnY.toFixed(2)}deg) rotateX(${turnX.toFixed(2)}deg)`
  /*
   * 远近靠明暗拉开，但背面那张不压到全透明：它现在是环的最低点，
   * 留一点轮廓反而是纵深证据；压成 0 会让人以为环少了一张卡。
   */
  el.style.opacity = (0.18 + Math.pow(depth, 1.3) * 0.82).toFixed(3)
  el.style.setProperty('--depth', depth.toFixed(3))
  el.style.zIndex = String(Math.round(z + 2000))
  el.style.pointerEvents = depth < 0.28 ? 'none' : 'auto'
  el.dataset.front = depth > 0.9 ? 'true' : 'false'
  return depth
}

function shortestTurns(current: number, index: number, step: number): number {
  return Math.round((current + index * step) / 360)
}

export function SpiralGallery({ projects }: Props) {
  const { reducedMotion, entered, finePointer } = useSite()
  const stageRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<SVGPathElement>(null)
  const ringKey = useRef('')
  const cardsRef = useRef<Array<HTMLAnchorElement | null>>([])
  const sim = useRef<Sim>({
    spin: 0,
    target: 0,
    velocity: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    lastInput: 0,
    snapped: true,
  })
  const activeRef = useRef(0)
  const [active, setActive] = useState(0)
  const hintedRef = useRef(false)
  const [hinted, setHinted] = useState(false)
  const count = projects.length
  const step = 360 / count

  const paint = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const width = stage.clientWidth || 1
    /*
     * 半径按「侧位卡片正好留在画面内」反推：侧卡中心在 ±r，半宽是卡宽的一半。
     * 半径偏大时两侧卡片会被裁掉，看起来像布局出错，而不是一个环形。
     */
    const cardW = cardsRef.current[0]?.offsetWidth ?? 260
    const fit = width / 2 - cardW / 2 - 6
    /*
     * 窄屏上如果还按「侧卡完整留在画面内」反推半径，半径会被压到和卡宽同量级，
     * 四张卡直接叠成一坨。手机改成按屏宽给半径，允许侧卡贴着边缘出去一点：
     * 卡片转过去之后投影会变窄，实际并不会真的被裁掉。
     */
    const radius =
      width < 720
        ? Math.min(width * 0.5, 240)
        : Math.min(Math.max(Math.min(width * 0.34, fit), 96), 520)
    const frame: Frame = {
      spin: sim.current.spin,
      radius,
      /* 透视收紧一点，前后卡片的大小差才拉得开 */
      perspective: Math.min(width * 1.15, 1500),
    }
    const persp = `${Math.round(frame.perspective)}px`
    if (stage.style.perspective !== persp) stage.style.perspective = persp
    /*
     * 轨道环只在半径或透视变化时重算，逐帧改 path 会白白触发一次重排。
     */
    const ring = ringRef.current
    if (ring) {
      const key = `${frame.radius.toFixed(1)}:${frame.perspective.toFixed(0)}:${width}:${stage.clientHeight}`
      if (key !== ringKey.current) {
        ringKey.current = key
        ring.setAttribute(
          'd',
          orbitPath(frame.radius, frame.perspective, width, stage.clientHeight || 1),
        )
      }
    }
    let best = 0
    let bestDepth = -1
    for (let i = 0; i < count; i += 1) {
      const el = cardsRef.current[i]
      if (!el) continue
      const depth = placeCard(el, i, count, frame)
      if (depth > bestDepth) {
        bestDepth = depth
        best = i
      }
    }
    if (best !== activeRef.current) {
      activeRef.current = best
      setActive(best)
    }
  }, [count])

  const focusIndex = useCallback(
    (index: number) => {
      const current = sim.current.target
      sim.current.target = shortestTurns(current, index, step) * 360 - index * step
      sim.current.lastInput = performance.now()
      sim.current.snapped = true
    },
    [step],
  )

  useLayoutEffect(() => {
    paint()
  }, [paint])

  useEffect(() => {
    let raf = 0
    let prev = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(now - prev, 48) / 1000
      prev = now
      const s = sim.current

      if (!s.dragging && entered && !reducedMotion && now - s.lastInput > IDLE_DELAY) {
        s.target += dt * IDLE_SPEED
        s.snapped = false
      }

      if (reducedMotion) {
        s.spin = s.target
      } else {
        const ease = 1 - Math.exp(-dt * 7.5)
        s.spin += (s.target - s.spin) * ease
        if (Math.abs(s.target - s.spin) < 0.01) {
          s.spin = s.target
          s.velocity = 0
        }
      }

      paint()
      raf = window.requestAnimationFrame(tick)
    }

    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [paint, entered, reducedMotion])

  // React 的 onWheel 是被动监听，拦不住页面滚动，只能用原生监听
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const s = sim.current
      s.target += event.deltaY * 0.2
      s.lastInput = performance.now()
      s.snapped = false
      const settle = () => {
        if (performance.now() - s.lastInput < 180 && !s.dragging) {
          window.setTimeout(settle, 120)
          return
        }
        if (!s.dragging) {
          s.target = Math.round(s.target / step) * step
          s.snapped = true
        }
      }
      window.setTimeout(settle, 150)
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [step])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const s = sim.current
    s.dragging = true
    s.lastX = event.clientX
    s.lastY = event.clientY
    s.lastTime = performance.now()
    s.lastInput = s.lastTime
    s.velocity = 0
    s.snapped = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const s = sim.current
    if (!s.dragging) return
    const now = performance.now()
    const dx = event.clientX - s.lastX
    const dy = event.clientY - s.lastY
    const dt = Math.max(now - s.lastTime, 1)
    s.lastX = event.clientX
    s.lastY = event.clientY
    s.lastTime = now
    s.lastInput = now
    const delta = dx * 0.42 - dy * 0.26
    s.target += delta
    s.velocity = (delta / dt) * 1000
    if (!hintedRef.current && Math.abs(delta) > 1.5) {
      hintedRef.current = true
      setHinted(true)
    }
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const s = sim.current
    if (!s.dragging) return
    s.dragging = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const fling = Math.max(Math.min(s.velocity * 0.22, 220), -220)
    s.target = Math.round((s.target + fling) / step) * step
    s.velocity = 0
    s.lastInput = performance.now()
    s.snapped = true
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      focusIndex((activeRef.current + 1) % count)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      focusIndex((activeRef.current - 1 + count) % count)
    }
  }

  const current = projects[active]

  return (
    <div className="spiral" data-hinted={hinted}>
      <div
        className="spiral__stage"
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        data-drag={finePointer ? 'true' : 'false'}
      >
        <svg className="spiral__ring" aria-hidden="true" focusable="false">
          <path ref={ringRef} />
        </svg>
        {projects.map((project, i) => (
          <Link
            key={project.slug}
            to={`/work/${project.slug}`}
            className="card"
            ref={(el) => {
              cardsRef.current[i] = el
            }}
            onClick={(event) => {
              if (activeRef.current !== i) {
                event.preventDefault()
                focusIndex(i)
              }
            }}
            onFocus={() => {
              if (activeRef.current !== i) focusIndex(i)
            }}
          >
            <span className="card__frame">
              <img
                className="card__img"
                src={project.media[0].src}
                alt={project.media[0].caption}
                loading="lazy"
                decoding="async"
              />
              <span className="card__scrim" />
            </span>
            <span className="card__index label" aria-hidden="true">
              {project.index}
            </span>
          </Link>
        ))}
      </div>

      <div className="spiral__readout">
        <div className="spiral__now" key={current.slug}>
          <span className="label">{current.kicker}</span>
          <h2 className="spiral__now-title">{current.title}</h2>
          <p className="spiral__now-summary">{current.summary}</p>
        </div>

        <div className="spiral__controls">
          <Link className="spiral__open" to={`/work/${current.slug}`}>
            查看案例 <span aria-hidden="true">→</span>
          </Link>
          <ul className="spiral__ticks">
            {projects.map((project, i) => (
              <li key={project.slug}>
                <button
                  type="button"
                  className="spiral__tick label"
                  aria-pressed={active === i}
                  aria-label={`切换到${project.title}`}
                  onClick={() => focusIndex(i)}
                >
                  {project.index}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="spiral__hint label" aria-hidden="true">
        {finePointer ? '拖动旋转 · 滚轮翻卷 · 方向键切换' : '左右拖动旋转 · 点击序号切换'}
      </p>
    </div>
  )
}
