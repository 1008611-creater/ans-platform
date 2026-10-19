import { useSyncExternalStore } from 'react'

/**
 * 动效与光标策略都依赖这两个环境查询。
 * 用 useSyncExternalStore 而不是 useState + useEffect，是为了避免首帧读到错误值导致闪烁。
 */

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'
const FINE_QUERY = '(hover: hover) and (pointer: fine)'

function makeSubscribe(query: string) {
  return (onChange: () => void) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }
}

function makeRead(query: string) {
  return () => window.matchMedia(query).matches
}

const subscribeReduce = makeSubscribe(REDUCE_QUERY)
const subscribeFine = makeSubscribe(FINE_QUERY)
const readReduce = makeRead(REDUCE_QUERY)
const readFine = makeRead(FINE_QUERY)

const serverFalse = () => false

/** 用户是否要求减少动效。为真时站点退出所有装饰性动画。 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduce, readReduce, serverFalse)
}

/** 是否为精确指针设备（鼠标 / 触控板）。触屏不接管光标，也不显示悬停预览。 */
export function useFinePointer(): boolean {
  return useSyncExternalStore(subscribeFine, readFine, serverFalse)
}
