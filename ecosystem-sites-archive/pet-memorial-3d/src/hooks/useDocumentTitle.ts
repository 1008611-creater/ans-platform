import { useEffect } from 'react'

import { PROFILE } from '../content/site'

/** 路由级标题。没有它，前进后退历史里全是同一个名字。 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${PROFILE.name}` : `${PROFILE.name} · ${PROFILE.role}`
  }, [title])
}
