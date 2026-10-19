import { useSite } from '../site/context'

/** 右下角声音开关。默认关闭，开启的是入场时那层持续低频。 */
export function SoundToggle() {
  const { soundOn, toggleSound } = useSite()

  return (
    <button
      type="button"
      className="sound"
      aria-pressed={soundOn}
      onClick={toggleSound}
    >
      <span className="sound__bars" data-on={soundOn} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="sr-only">{soundOn ? '关闭声音' : '开启声音'}</span>
      <span className="sound__word" aria-hidden="true">
        {soundOn ? 'SOUND ON' : 'MUTED'}
      </span>
    </button>
  )
}
