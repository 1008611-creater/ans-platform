import { COPY } from './companion-copy.mjs?v=single5';
/** One character: the site's existing avatar owns animation and voice. */
export function installCompanion(w = window, sourceFrame = null) {
  const d = w.document, key = Symbol.for('ans.mascot.companion.v1');
  if (w[key]) return w[key];
  const language = d.documentElement.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  const words = COPY[language], reduced = w.matchMedia('(prefers-reduced-motion: reduce)');
  const link = d.createElement('link'); link.rel = 'stylesheet';
  link.href = '/mascot/3d/companion-widget.css?v=single-20261011-5'; d.head.append(link);
  const bubble = d.createElement('aside'); bubble.className = 'ans-companion-panel';
  bubble.id = 'ans-companion-panel'; bubble.hidden = true; bubble.setAttribute('aria-label',words.name);
  const name = d.createElement('span'); name.className = 'ans-companion-name'; name.textContent = words.name;
  const close = d.createElement('button'); close.className = 'ans-companion-close'; close.type = 'button';
  close.textContent = '\u00d7'; close.setAttribute('aria-label',words.close);
  const text = d.createElement('p'); text.className = 'ans-companion-line'; text.setAttribute('role','status'); text.setAttribute('aria-live','polite');
  bubble.append(name,close,text); d.body.append(bubble);
  let opened = false, ready = false, voiceBusy = false, timer = null, lastLine = null;
  const frame = () => sourceFrame?.isConnected ? sourceFrame : d.querySelector('.ans-dino-canvas');
  const send = data => frame()?.contentWindow?.postMessage({type:'ans-dino',...data},w.location.origin);
  const align = () => {
    const box = d.querySelector('.ans-dino-trigger')?.getBoundingClientRect();
    if (!box || !opened) return;
    bubble.style.bottom = Math.max(20,w.innerHeight-box.top+14)+'px';
    bubble.style.right = Math.max(12,w.innerWidth-box.right)+'px';
  };
  const clearTimer = () => {w.clearTimeout(timer); timer=null;};
  function schedule() {
    clearTimer();
    if (opened && !d.hidden) timer=w.setTimeout(()=>say(false),42000+Math.random()*28000);
  }
  function pickLine(first) {
    const path = w.location.pathname;
    if (first) {
      if (path.startsWith('/explore')) return words.discoverGreeting;
      if (path.startsWith('/workflows')) return words.workflowGreeting;
      return words.greeting;
    }
    const lines=words.chatter.filter(line=>line!==lastLine);
    return lines[Math.floor(Math.random()*lines.length)];
  }
  function say(first) {
    if (!opened || d.hidden) return;
    if (!ready || voiceBusy) {schedule();return;}
    lastLine=pickLine(first); text.textContent=lastLine; send({event:'speak',text:lastLine}); schedule();
  }
  function sync() {send({event:'visibility',visible:!d.hidden});send({event:'autoplay',enabled:!reduced.matches});}
  function setOpen(value) {
    opened=value; bubble.hidden=!value; d.documentElement.classList.toggle('ans-companion-open',value);
    const trigger=d.querySelector('.ans-dino-trigger');
    trigger?.setAttribute('aria-expanded',String(value)); trigger?.setAttribute('aria-controls',bubble.id);
    trigger?.setAttribute('aria-label',value?words.close:words.open);
    sync();
    if (value) {
      text.textContent=words.greeting; align();
      try {frame()?.contentWindow?.__ANS_DINO__?.activateAudio?.();} catch { /* Renderer may still be loading. */ }
      send({event:'gesture',gesture:'hello'}); say(true);
    } else {clearTimer();send({event:'stop-speech'});voiceBusy=false;}
  }
  const onClick=e=>{if(!e.target.closest?.('.ans-dino-trigger'))return;e.preventDefault();e.stopImmediatePropagation();setOpen(!opened);};
  const onKey=e=>{if(opened && e.key==='Escape'){e.preventDefault();setOpen(false);d.querySelector('.ans-dino-trigger')?.focus({preventScroll:true});}};
  const receive=e=>{
    if(e.origin!==w.location.origin || e.source!==frame()?.contentWindow)return;
    const data=e.data;
    if(data?.type==='ans-dino-ready'){ready=true;sync();if(opened){send({event:'gesture',gesture:'hello'});say(true);}}
    if(data?.type==='ans-dino-error'){ready=false;voiceBusy=false;clearTimer();}
    if(data?.type==='ans-dino-voice'){
      voiceBusy=data.state==='loading'||data.state==='playing';
      bubble.classList.toggle('is-speaking',data.state==='playing');
      if(data.state==='playing' && data.text)text.textContent=data.text;
    }
  };
  const visibility=()=>{sync();if(d.hidden){clearTimer();send({event:'stop-speech'});}else if(opened)schedule();};
  const motion=()=>sync(); close.addEventListener('click',()=>setOpen(false));
  d.addEventListener('click',onClick,true);d.addEventListener('keydown',onKey);d.addEventListener('visibilitychange',visibility);
  w.addEventListener('message',receive);w.addEventListener('resize',align);reduced.addEventListener('change',motion);
  // Next may install this module before its existing avatar iframe has loaded.
  try {ready=Boolean(frame()?.contentWindow?.__ANS_DINO__?.snapshot().ready);}catch { /* Wait for ready. */ }
  if(ready)sync();
  const api={open:()=>setOpen(true),close:()=>setOpen(false),dispose:()=>{
    clearTimer();send({event:'stop-speech'});bubble.remove();link.remove();
    d.removeEventListener('click',onClick,true);d.removeEventListener('keydown',onKey);d.removeEventListener('visibilitychange',visibility);
    w.removeEventListener('message',receive);w.removeEventListener('resize',align);reduced.removeEventListener('change',motion);
    d.documentElement.classList.remove('ans-companion-open');delete w[key];
  }};
  w[key]=api;return api;
}
if(window===window.parent)installCompanion(window);