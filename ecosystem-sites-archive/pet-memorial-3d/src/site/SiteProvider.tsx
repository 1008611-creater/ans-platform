import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { PET_ACTIONS, type AccessoryId, type PetActionId } from '../content/site'
import { disposeAmbient, startAmbient, stopAmbient } from '../lib/ambient'
import { useFinePointer, useReducedMotion } from '../hooks/useReducedMotion'
import { SiteContext, type SiteState, type ViewMode } from './context'

export function SiteProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion()
  const finePointer = useFinePointer()
  const [entered, setEntered] = useState(true)
  const [soundOn, setSoundOn] = useState(false)
  const [view, setViewState] = useState<ViewMode>('companion')
  const [menuOpen, setMenuOpen] = useState(false)

  const [activeAction, setActiveActionState] = useState<PetActionId>('idle')
  const [activeAccessories, setActiveAccessories] = useState<AccessoryId[]>(['star-tag', 'halo'])
  const [desktopPetOpen, setDesktopPetOpen] = useState<boolean>(false)
  const [skeletonVisible, setSkeletonVisible] = useState<boolean>(false)
  const [bubbleMessage, setBubbleMessage] = useState<string>(PET_ACTIONS[0].bubbleText)
  const [ballTriggerCount, setBallTriggerCount] = useState<number>(0)

  const setView = useCallback((nextView: ViewMode) => {
    setViewState(nextView)
    setDesktopPetOpen(nextView !== 'companion')
  }, [])

  const enter = useCallback((withSound: boolean) => {
    setEntered(true)
    if (withSound) setSoundOn(true)
  }, [])

  const toggleSound = useCallback(() => setSoundOn((on) => !on), [])

  const setActiveAction = useCallback((action: PetActionId) => {
    setActiveActionState(action)
    const spec = PET_ACTIONS.find((a) => a.id === action)
    if (spec) setBubbleMessage(spec.bubbleText)
    if (action === 'ball') {
      setBallTriggerCount((c) => c + 1)
    }
  }, [])

  const toggleAccessory = useCallback((id: AccessoryId) => {
    setActiveAccessories((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }, [])

  const clearAccessories = useCallback(() => {
    setActiveAccessories([])
  }, [])

  const triggerYellowBall = useCallback(() => {
    setActiveActionState('ball')
    const spec = PET_ACTIONS.find((a) => a.id === 'ball')
    if (spec) setBubbleMessage(spec.bubbleText)
    setBallTriggerCount((c) => c + 1)
  }, [])

  useEffect(() => {
    if (soundOn) startAmbient()
    else stopAmbient()
  }, [soundOn])

  useEffect(() => disposeAmbient, [])

  useEffect(() => {
    const locked = !entered || menuOpen
    document.documentElement.dataset.scroll = locked ? 'locked' : 'free'
    return () => {
      document.documentElement.dataset.scroll = 'free'
    }
  }, [entered, menuOpen])

  const value = useMemo<SiteState>(
    () => ({
      entered,
      enter,
      soundOn,
      toggleSound,
      view,
      setView,
      menuOpen,
      setMenuOpen,
      reducedMotion,
      finePointer,
      activeAction,
      setActiveAction,
      activeAccessories,
      toggleAccessory,
      clearAccessories,
      desktopPetOpen,
      setDesktopPetOpen,
      skeletonVisible,
      setSkeletonVisible,
      bubbleMessage,
      setBubbleMessage,
      ballTriggerCount,
      triggerYellowBall,
    }),
    [
      entered,
      enter,
      soundOn,
      toggleSound,
      view,
      menuOpen,
      reducedMotion,
      finePointer,
      activeAction,
      setActiveAction,
      activeAccessories,
      toggleAccessory,
      clearAccessories,
      desktopPetOpen,
      skeletonVisible,
      bubbleMessage,
      ballTriggerCount,
      triggerYellowBall,
    ],
  )

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}
