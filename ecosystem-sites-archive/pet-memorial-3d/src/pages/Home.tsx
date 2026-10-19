import { AnimatePresence, motion } from 'motion/react'

import { CompanionStage } from '../components/CompanionStage'
import { IndexList } from '../components/IndexList'
import { PipelineView } from '../components/PipelineView'
import { SpiralGallery } from '../components/SpiralGallery'
import { PROJECTS, PROFILE } from '../content/site'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSite } from '../site/context'

const EXPO_OUT = [0.16, 1, 0.3, 1] as const

export function Home() {
  const { view, reducedMotion, entered } = useSite()
  useDocumentTitle('数字永生纪念馆 · 3D 桌宠陪伴')
  const dur = reducedMotion ? 0 : 0.45

  return (
    <main className="home" id="main" data-view={view}>
      <h1 className="sr-only">
        {PROFILE.name} · {PROFILE.role}
      </h1>

      <div className="home__stage" data-entered={entered} data-view={view}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            className="home__view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur, ease: EXPO_OUT }}
          >
            {view === 'companion' && <CompanionStage />}
            {view === 'spiral' && <SpiralGallery projects={PROJECTS} />}
            {view === 'index' && <IndexList projects={PROJECTS} />}
            {view === 'pipeline' && <PipelineView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  )
}
