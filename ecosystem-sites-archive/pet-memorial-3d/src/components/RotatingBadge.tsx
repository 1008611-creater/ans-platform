import { Link } from 'react-router-dom'

import { PROFILE } from '../content/site'

/**
 * 左下角旋转徽章。几何为本站自绘：一个圆环路径 + 沿路径排布的等宽文字。
 * 减少动效时停在固定角度。
 */
export function RotatingBadge() {
  return (
    <Link to="/about" className="badge" aria-label={`关于${PROFILE.name}`}>
      <svg className="badge__ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <defs>
          <path
            id="badge-arc"
            d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0"
            fill="none"
          />
        </defs>
        <text className="badge__text">
          <textPath href="#badge-arc" textLength="231" lengthAdjust="spacing">
            LIU SHUBIN · AI PRODUCT · OPEN TO WORK 2026 ·
          </textPath>
        </text>
      </svg>
      <span className="badge__core" aria-hidden="true">
        ↗
      </span>
    </Link>
  )
}
