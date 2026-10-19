const LINES = 7

/**
 * 固定的版心网格与极轻的纸面颗粒。
 * 纯装饰，不参与交互，也不进入无障碍树。
 */
export function GridOverlay() {
  return (
    <div className="grid-overlay" aria-hidden="true">
      <div className="grid-overlay__beam">
        {Array.from({ length: LINES }, (_, i) => (
          <span
            key={i}
            className="grid-overlay__line"
            style={{ left: `${(i / (LINES - 1)) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid-overlay__grain" />
    </div>
  )
}
