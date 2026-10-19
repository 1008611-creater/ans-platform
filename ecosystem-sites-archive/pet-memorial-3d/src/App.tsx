import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'

import { Cursor } from './components/Cursor'
import { DesktopPetWidget } from './components/DesktopPetWidget'
import { EntryGate } from './components/EntryGate'
import { GridOverlay } from './components/GridOverlay'
import { MalamuteCanvas3D } from './components/MalamuteCanvas3D'
import { MenuPanel } from './components/MenuPanel'
import { SiteChrome } from './components/SiteChrome'
import { ACCESSORIES, PET_ACTIONS, type PetActionId } from './content/site'
import { About } from './pages/About'
import { Contact } from './pages/Contact'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { ProjectDetail } from './pages/ProjectDetail'
import { Resume } from './pages/Resume'
import { useSite } from './site/context'

function ScrollReset() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

/** 独立桌面小窗模式（?pet=standalone），专供弹出置顶桌宠或 Electron 透明桌宠使用 */
function StandaloneDesktopPetView() {
  const {
    activeAction,
    setActiveAction,
    activeAccessories,
    toggleAccessory,
    ballTriggerCount,
    triggerYellowBall,
    bubbleMessage,
    setBubbleMessage,
    soundOn,
  } = useSite()

  return (
    <div className="standalone-pet">
      <header className="standalone-pet__header">
        <span className="label">桌面常驻陪伴</span>
        <span className="label">摸摸头或握握爪</span>
      </header>
      <div className="standalone-pet__bubble">{bubbleMessage}</div>
      <div className="standalone-pet__canvas">
        <MalamuteCanvas3D
          mode="widget"
          activeAction={activeAction}
          activeAccessories={activeAccessories}
          ballTriggerCount={ballTriggerCount}
          soundOn={soundOn}
          onPetInteract={(_zone, act, msg) => {
            setActiveAction(act)
            setBubbleMessage(msg)
          }}
        />
      </div>
      <footer className="standalone-pet__footer">
        {(['idle', 'walk', 'run', 'tilt', 'paw', 'bow', 'ball', 'rest'] as PetActionId[]).map((id) => {
          const spec = PET_ACTIONS.find((a) => a.id === id)
          return (
            <button
              key={id}
              type="button"
              className="desktop-pet__act-btn label"
              data-active={activeAction === id}
              onClick={() => {
                if (id === 'ball') triggerYellowBall()
                else setActiveAction(id)
              }}
            >
              {spec?.name.slice(0, 2) ?? id}
            </button>
          )
        })}
        <button
          type="button"
          className="desktop-pet__act-btn label"
          onClick={() => {
            const ids = ACCESSORIES.map((a) => a.id)
            toggleAccessory(ids[Math.floor(Math.random() * ids.length)])
          }}
        >
          ✦ 换装
        </button>
      </footer>
    </div>
  )
}

export default function App() {
  const { entered, enter, menuOpen, view } = useSite()
  const location = useLocation()

  const isStandalonePet =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('pet') === 'standalone'

  const skipGate = location.pathname !== '/' || isStandalonePet
  const showContent = entered || skipGate

  useEffect(() => {
    if (skipGate && !entered) enter(false)
  }, [skipGate, entered, enter])

  if (isStandalonePet) {
    return <StandaloneDesktopPetView />
  }

  return (
    <>
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>

      <GridOverlay />
      <ScrollReset />

      <div className="site" data-entered={showContent}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/work/:slug" element={<ProjectDetail />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/not-found" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </div>

      {showContent && <SiteChrome />}
      {showContent && <DesktopPetWidget />}

      <AnimatePresence>{menuOpen && <MenuPanel />}</AnimatePresence>
      <AnimatePresence>{!showContent && <EntryGate />}</AnimatePresence>
      <Cursor />
    </>
  )
}
