import { useRef, useState } from 'react'

import { ACCESSORIES, PET_ACTIONS, type PetActionId } from '../content/site'
import { useSite } from '../site/context'
import { MalamuteCanvas3D } from './MalamuteCanvas3D'

const QUICK_PET_ACTIONS: Array<{ id: PetActionId; label: string }> = [
  { id: 'idle', label: '守望' },
  { id: 'walk', label: '漫步' },
  { id: 'tilt', label: '歪头' },
  { id: 'paw', label: '握手' },
  { id: 'ball', label: '黄球' },
  { id: 'rest', label: '安眠' },
]

export function DesktopPetWidget() {
  const {
    entered,
    desktopPetOpen,
    setDesktopPetOpen,
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

  const [pos, setPos] = useState<{ right: number; bottom: number }>({ right: 24, bottom: 68 })
  const [sizeMode, setSizeMode] = useState<'compact' | 'normal' | 'large'>('normal')
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; origRight: number; origBottom: number }>({
    dragging: false,
    startX: 0,
    startY: 0,
    origRight: 24,
    origBottom: 68,
  })

  if (!entered || !desktopPetOpen) return null

  const onHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origRight: pos.right,
      origBottom: pos.bottom,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const nextRight = Math.max(12, Math.min(window.innerWidth - 260, dragRef.current.origRight - dx))
    const nextBottom = Math.max(12, Math.min(window.innerHeight - 280, dragRef.current.origBottom - dy))
    setPos({ right: nextRight, bottom: nextBottom })
  }

  const onHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.dragging = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const cycleNextAccessory = () => {
    const ids = ACCESSORIES.map((a) => a.id)
    const nextIdx = Math.floor(Math.random() * ids.length)
    toggleAccessory(ids[nextIdx])
  }

  /** 弹出独立置顶桌面小窗（让主人切换到其它工作软件时也能留在桌面一角陪伴） */
  const openStandalonePetWindow = () => {
    const url = `${window.location.origin}${window.location.pathname}?pet=standalone`
    window.open(
      url,
      'EternalMalamuteDesktopPet',
      'width=360,height=480,menubar=no,toolbar=no,location=no,status=no,resizable=yes',
    )
  }

  return (
    <aside
      className={`desktop-pet desktop-pet--${sizeMode}`}
      style={{ right: `${pos.right}px`, bottom: `${pos.bottom}px` }}
      aria-label="桌面常驻 3D 纪念桌宠"
    >
      <div
        className="desktop-pet__bar"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
      >
        <div className="desktop-pet__title-wrap">
          <span className="desktop-pet__pulse" />
          <span className="label">在桌角陪你</span>
        </div>
        <div className="desktop-pet__bar-btns">
          <button
            type="button"
            className="desktop-pet__icon-btn label"
            title="切换桌宠尺寸"
            onClick={() =>
              setSizeMode((m) => (m === 'compact' ? 'normal' : m === 'normal' ? 'large' : 'compact'))
            }
          >
            {sizeMode === 'compact' ? '放大' : sizeMode === 'normal' ? '大窗' : '精简'}
          </button>
          <button
            type="button"
            className="desktop-pet__icon-btn label"
            title="弹出独立桌面小窗，方便切换其它软件时常驻陪伴"
            onClick={openStandalonePetWindow}
          >
            独立小窗 ↗
          </button>
          <button
            type="button"
            className="desktop-pet__icon-btn label"
            title="收起桌宠"
            onClick={() => setDesktopPetOpen(false)}
          >
            ×
          </button>
        </div>
      </div>

      <div className="desktop-pet__bubble">
        <p>{bubbleMessage}</p>
      </div>

      <div className="desktop-pet__canvas-wrap">
        <MalamuteCanvas3D
          mode="widget"
          activeAction={activeAction}
          activeAccessories={activeAccessories}
          ballTriggerCount={ballTriggerCount}
          soundOn={soundOn}
          onPetInteract={(_zone, reactionAction, msg) => {
            setActiveAction(reactionAction)
            setBubbleMessage(msg)
          }}
        />
      </div>

      <div className="desktop-pet__dock">
        <div className="desktop-pet__actions">
          {QUICK_PET_ACTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="desktop-pet__act-btn label"
              data-active={activeAction === item.id}
              onClick={() => {
                if (item.id === 'ball') triggerYellowBall()
                else {
                  setActiveAction(item.id)
                  const spec = PET_ACTIONS.find((a) => a.id === item.id)
                  if (spec) setBubbleMessage(spec.bubbleText)
                }
              }}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className="desktop-pet__act-btn label"
            title="随机叠穿/切换记忆装扮"
            onClick={cycleNextAccessory}
          >
            ✦ 换装
          </button>
        </div>
      </div>
    </aside>
  )
}
