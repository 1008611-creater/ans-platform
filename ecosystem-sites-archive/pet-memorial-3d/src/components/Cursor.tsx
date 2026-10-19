import { useEffect, useRef } from 'react'

import { useSite } from '../site/context'

const GROW_SELECTOR = 'a, button, [data-cursor="grow"]'

/**
 * 自绘光标。只精确指针设备启用，触屏与「减少动效」下完全不接管，
 * 系统光标保持原样。
 */
export function Cursor() {
  const { finePointer, reducedMotion } = useSite()
  const active = finePointer && !reducedMotion
  const dotRef = useRef<HTMLSpanElement>(null)
  const ringRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    if (!active || !dot || !ring) return

    const root = document.documentElement
    root.dataset.cursor = 'custom'

    let px = window.innerWidth / 2
    let py = window.innerHeight / 2
    let rx = px
    let ry = py
    let grow = false
    let shown = false
    let raf = 0

    const onMove = (event: PointerEvent) => {
      px = event.clientX
      py = event.clientY
      if (!shown) {
        shown = true
        rx = px
        ry = py
        dot.dataset.visible = 'true'
        ring.dataset.visible = 'true'
      }
    }

    const onOver = (event: PointerEvent) => {
      const target = event.target
      grow = target instanceof Element && target.closest(GROW_SELECTOR) !== null
    }

    const onLeave = () => {
      shown = false
      dot.dataset.visible = 'false'
      ring.dataset.visible = 'false'
    }

    const tick = () => {
      rx += (px - rx) * 0.16
      ry += (py - ry) * 0.16
      dot.style.transform = `translate3d(${px}px, ${py}px, 0)`
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
      ring.dataset.grow = grow ? 'true' : 'false'
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerover', onOver, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
      delete root.dataset.cursor
    }
  }, [active])

  if (!active) return null

  return (
    <div className="cursor" aria-hidden="true">
      <span className="cursor__dot" ref={dotRef} data-visible="false" />
      <span className="cursor__ring" ref={ringRef} data-visible="false" data-grow="false" />
    </div>
  )
}
