import { Link } from 'react-router-dom'

import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function NotFound() {
  useDocumentTitle('页面不存在')

  return (
    <main className="notfound shell" id="main">
      <p className="label">404</p>
      <h1 className="notfound__title">
        <span className="hl-line">
          <span className="hl-phrase">这条路径上</span>
          <span className="hl-phrase">没有内容</span>
        </span>
      </h1>
      <p className="notfound__body">
        链接可能已经调整过。作品都还在，可以直接从首页重新进。
      </p>
      <div className="notfound__actions">
        <Link className="btn btn--solid" to="/">
          回到首页
        </Link>
        <Link className="btn" to="/contact">
          联系方式
        </Link>
      </div>
    </main>
  )
}
