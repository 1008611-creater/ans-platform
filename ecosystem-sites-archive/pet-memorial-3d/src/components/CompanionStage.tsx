import { useState } from 'react'

import { ACCESSORIES, PET_ACTIONS, PROFILE } from '../content/site'
import { useSite } from '../site/context'
import { MalamuteCanvas3D } from './MalamuteCanvas3D'

const MOMENTS_CAPTIONS = [
  '昨晚又梦到你跑过来把小黄球放在我脚边。定制了你的 3D 手办放在床头，手机碰一下底座你就在屏幕里冲我摇尾巴，原来你一直都在。🐾✨',
  '跨时空再摸摸你的大脑袋。眉间两团小白斑、胸前的小银链，还有你冲我笑时吐出的小粉舌头，一点都没变。🤍',
  '虽然你去了汪星，但用生前的 5 张照片把你留在了手心和手机桌面里。想你的时候，随时都能叫你的名字。🐕',
]

export function CompanionStage() {
  const {
    activeAction,
    setActiveAction,
    activeAccessories,
    toggleAccessory,
    skeletonVisible,
    bubbleMessage,
    setBubbleMessage,
    ballTriggerCount,
    triggerYellowBall,
    soundOn,
    setView,
  } = useSite()

  const [whisperInput, setWhisperInput] = useState('')
  const [mobilePreview, setMobilePreview] = useState(false)
  const [momentsModalOpen, setMomentsModalOpen] = useState(false)
  const [selectedCaptionIdx, setSelectedCaptionIdx] = useState(0)
  const [copiedToast, setCopiedToast] = useState(false)
  const [pwaToast, setPwaToast] = useState(false)

  const handleWhisperSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = whisperInput.trim()
    if (!text) return
    setWhisperInput('')
    if (text.includes('球') || text.includes('玩')) {
      triggerYellowBall()
      setBubbleMessage(`听到你说「${text}」，我把草地上的小黄球叼过来陪你玩啦！`)
    } else if (text.includes('爪') || text.includes('握')) {
      setActiveAction('paw')
      setBubbleMessage(`听到你说「${text}」，给你我最蓬松的大白爪爪！`)
    } else if (text.includes('跑') || text.includes('风')) {
      setActiveAction('run')
      setBubbleMessage(`「${text}」——看我像在草坪上一样迎风奔跑给你看！`)
    } else if (text.includes('睡') || text.includes('晚安')) {
      setActiveAction('rest')
      setBubbleMessage(`晚安呀，我就静静趴在你的桌角守着你。`)
    } else {
      setActiveAction('tilt')
      setBubbleMessage(`（歪着脑袋认真听你说「${text}」，琥珀色的眼睛亮晶晶地望着你）我都记在心里啦。`)
    }
  }

  const handleCopyMomentsCaption = () => {
    navigator.clipboard?.writeText(MOMENTS_CAPTIONS[selectedCaptionIdx]).catch(() => {})
    setCopiedToast(true)
    setTimeout(() => setCopiedToast(false), 2200)
  }

  return (
    <section
      className={`sanctuary ${mobilePreview ? 'sanctuary--mobile' : ''}`}
      aria-label="大宝贝 3D 陪伴空间"
    >
      {/* 顶部模式与赠品体验切换条：直击「3D打印手办 + 手机口袋桌宠 + 朋友圈AI合照」商业闭环 */}
      <div className="sanctuary__gift-bar">
        <button
          type="button"
          className="sanctuary__gift-btn"
          data-active={mobilePreview}
          onClick={() => setMobilePreview(!mobilePreview)}
        >
          <span>📱 {mobilePreview ? '退出手机竖屏预览' : '手机口袋桌宠（赠品 1）'}</span>
        </button>

        <button
          type="button"
          className="sanctuary__gift-btn"
          onClick={() => setMomentsModalOpen(true)}
        >
          <span>📸 朋友圈 AI 合照（赠品 2）</span>
        </button>

        <button
          type="button"
          className="sanctuary__gift-btn sanctuary__gift-btn--accent"
          onClick={() => setView('pipeline')}
        >
          <span>🖨️ 3D 打印手办工坊（主品 STL）</span>
        </button>
      </div>

      {/* 核心舞台（支持全画幅模式 & 9:16 手机竖屏口袋桌宠真机模拟） */}
      <div className={mobilePreview ? 'sanctuary__phone-shell' : 'sanctuary__full-shell'}>
        {mobilePreview && (
          <div className="sanctuary__phone-statusbar">
            <span className="sanctuary__nfc-tag">NFC 手办底座已感应 · 手机桌宠陪伴中</span>
            <button
              type="button"
              className="sanctuary__pwa-btn"
              onClick={() => {
                setPwaToast(true)
                setTimeout(() => setPwaToast(false), 2800)
              }}
            >
              {pwaToast ? '✓ 已生成桌面快捷图标' : '+ 添加到手机主屏幕'}
            </button>
          </div>
        )}

        <div className="sanctuary__canvas">
          <MalamuteCanvas3D
            mode="stage"
            activeAction={activeAction}
            activeAccessories={activeAccessories}
            skeletonVisible={skeletonVisible}
            ballTriggerCount={ballTriggerCount}
            soundOn={soundOn}
            onPetInteract={(_zone, reactionAction, msg) => {
              setActiveAction(reactionAction)
              setBubbleMessage(msg)
            }}
          />
        </div>

        {/* 左上角极简温暖题签 */}
        <div className="sanctuary__header">
          <h2 className="sanctuary__name">{PROFILE.name}</h2>
          <p className="sanctuary__hint">
            {mobilePreview
              ? '手指轻点它的头顶、大白爪或后背，随时在手机里摸摸它'
              : '直接点击它的头顶、大白爪或后背，就能摸摸它'}
          </p>
        </div>

        {/* 宠物轻声回应气泡 */}
        <div className="sanctuary__whisper-bubble" role="status" aria-live="polite">
          <p className="sanctuary__whisper-text">“{bubbleMessage}”</p>
        </div>

        {/* 底部极简悬浮胶囊交互坞 */}
        <div className="sanctuary__dock">
          <div className="sanctuary__actions" role="listbox" aria-label="和它互动">
            {PET_ACTIONS.map((item) => {
              const isSelected = activeAction === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className="sanctuary__pill"
                  data-active={isSelected}
                  onClick={() => {
                    if (item.id === 'ball') triggerYellowBall()
                    else setActiveAction(item.id)
                  }}
                >
                  {item.shortLabel}
                </button>
              )
            })}
          </div>

          <div className="sanctuary__subbar">
            <div className="sanctuary__keepsakes" aria-label="记忆装扮">
              {ACCESSORIES.map((acc) => {
                const equipped = activeAccessories.includes(acc.id)
                return (
                  <button
                    key={acc.id}
                    type="button"
                    className="sanctuary__chip"
                    data-equipped={equipped}
                    title={acc.originNote}
                    onClick={() => toggleAccessory(acc.id)}
                  >
                    <span className="sanctuary__chip-icon" aria-hidden="true">
                      {acc.icon}
                    </span>
                    <span>{acc.shortLabel}</span>
                  </button>
                )
              })}
            </div>

            <form className="sanctuary__talk" onSubmit={handleWhisperSubmit}>
              <input
                type="text"
                className="sanctuary__input"
                placeholder="跟它说句话吧…"
                value={whisperInput}
                onChange={(e) => setWhisperInput(e.target.value)}
              />
              <button type="submit" className="sanctuary__send">
                轻唤
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 赠品 2：AI 跨时空合照 · 发朋友圈拍立得纪念卡弹窗 */}
      {momentsModalOpen && (
        <div
          className="moments-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="跨时空 AI 合照 · 朋友圈纪念卡"
          onClick={() => setMomentsModalOpen(false)}
        >
          <div className="moments-modal" onClick={(e) => e.stopPropagation()}>
            <div className="moments-modal__top">
              <div>
                <span className="moments-modal__badge">数字赠品 · 朋友圈裂变抓手</span>
                <h3 className="moments-modal__title">跨时空跨时空重逢合照</h3>
              </div>
              <button
                type="button"
                className="moments-modal__close"
                onClick={() => setMomentsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="moments-modal__body">
              {/* 拍立得相纸卡片 */}
              <div className="polaroid-card">
                <div className="polaroid-card__img-wrap">
                  <img
                    src="./renders/moments_reunion_photo.png"
                    alt="主人轻抚大宝贝脸颊的夕阳跨时空合照"
                  />
                </div>
                <div className="polaroid-card__caption">
                  <strong>永远在风里奔跑的大狗狗</strong>
                  <span>“你伸手摸我脸颊的时候，我还是最爱冲你笑”</span>
                </div>
              </div>

              {/* 右侧：朋友圈一键配文与下载 */}
              <div className="moments-modal__controls">
                <p className="moments-modal__desc">
                  基于生前真容特征（双白椭圆眉斑、琥珀色瞳孔、胸前纯白长毛与银链圆环）生成的治愈重逢照。随 3D 打印手办免费附赠，方便主人保存发朋友圈留念：
                </p>

                <div className="moments-modal__captions">
                  <span className="moments-modal__subhead">选择朋友圈配文（点击切换）：</span>
                  {MOMENTS_CAPTIONS.map((cap, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="moments-caption-option"
                      data-selected={selectedCaptionIdx === idx}
                      onClick={() => setSelectedCaptionIdx(idx)}
                    >
                      {cap}
                    </button>
                  ))}
                </div>

                <div className="moments-modal__btns">
                  <a
                    href="./renders/moments_reunion_photo.png"
                    download="宠物-跨时空重逢合照.png"
                    className="moments-btn moments-btn--primary"
                  >
                    保存高清合照到手机相册
                  </a>
                  <button
                    type="button"
                    className="moments-btn"
                    onClick={handleCopyMomentsCaption}
                  >
                    {copiedToast ? '✓ 已复制朋友圈文案' : '复制朋友圈文案'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
