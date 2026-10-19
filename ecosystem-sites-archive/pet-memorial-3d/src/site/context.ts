import { createContext, useContext } from 'react'
import type { AccessoryId, PetActionId } from '../content/site'

export type ViewMode = 'companion' | 'spiral' | 'index' | 'pipeline'

export type SiteState = {
  /** 是否已经通过入场门。未通过时内容不可交互。 */
  entered: boolean
  enter: (withSound: boolean) => void
  soundOn: boolean
  toggleSound: () => void
  view: ViewMode
  setView: (view: ViewMode) => void
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  reducedMotion: boolean
  finePointer: boolean
  /** 3D 永生宠物骨骼动作与装扮全局状态（主舞台与桌宠实时共享） */
  activeAction: PetActionId
  setActiveAction: (action: PetActionId) => void
  activeAccessories: AccessoryId[]
  toggleAccessory: (id: AccessoryId) => void
  clearAccessories: () => void
  desktopPetOpen: boolean
  setDesktopPetOpen: (open: boolean) => void
  skeletonVisible: boolean
  setSkeletonVisible: (visible: boolean) => void
  bubbleMessage: string
  setBubbleMessage: (msg: string) => void
  ballTriggerCount: number
  triggerYellowBall: () => void
}

export const SiteContext = createContext<SiteState | null>(null)

export function useSite(): SiteState {
  const value = useContext(SiteContext)
  if (!value) throw new Error('useSite 必须在 SiteProvider 内使用')
  return value
}
