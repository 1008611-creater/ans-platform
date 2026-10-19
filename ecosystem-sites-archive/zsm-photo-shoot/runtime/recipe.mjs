import { STORIES, storyOptions, storyLight, storyStyle } from './stories.mjs';
import { placeFor, hasCompanion, assertDestination, referencePlan, shotsFor } from './destinations.mjs';
import { characterName, characterHook } from './characters.mjs';
import { projectCharacterVisual } from './character-visuals.mjs';
export const MODEL = 'gpt-image-2.5-sunburst';
export const RECIPE = { id: 'solo-travel-six', version: '1.0.0', validation: 'unverified', people: 1, failures: ['identity-not-recognized','composition-missed','inconsistent-outfit','invalid-output'] };
export const DIRECTIONS = {
  coast: { name: '海岸慢游', scene: '安静的地中海海岸小镇，白色石阶、蓝色海面和海风', light: '傍晚暖阳，柔和自然光', palette: '低饱和海蓝、奶油白、暖沙色' },
  oldtown: { name: '街角漫步', scene: '有石板路和旧建筑的欧洲小镇，日常街景，没有游客人群', light: '下午斜射的自然光', palette: '温暖米色、砖红、柔和墨绿' },
  alpine: { name: '山野来信', scene: '开阔的高山草甸、远山与湖畔步道', light: '清晨清透的自然光', palette: '清浅绿色、雾蓝、自然肤色' }
};
export const FORMATS = { portrait: { label: '2:3 竖幅', size: '1024x1536', width: 1024, height: 1536 }, landscape: { label: '3:2 横幅', size: '1536x1024', width: 1536, height: 1024 }, square: { label: '1:1 方幅', size: '1024x1024', width: 1024, height: 1024 } };
export const SHOTS = [
  { id:'cover', name:'旅途封面', lens:'50mm · 半身', description:'人物面向镜头，半身肖像，背景可辨但不过度抢眼，面部清晰', intent:'这一程的你' },
  { id:'place', name:'人与远方', lens:'28mm · 环境', description:'环境人像全景，人物位于画面左侧三分之一，场景占主要面积，仍能识别人物', intent:'把远方装进画面' },
  { id:'portrait', name:'近一点', lens:'85mm · 特写', description:'平视面部特写，自然微笑，眼神清晰，保留真实皮肤纹理', intent:'留下真实的神情' },
  { id:'motion', name:'风里的步伐', lens:'35mm · 动态', description:'人物沿步道自然行走，三分之二侧身，全身入镜，动作轻松，面部可见', intent:'让照片有一点风' },
  { id:'pause', name:'片刻停留', lens:'50mm · 坐姿', description:'人物侧身坐在低矮石阶或步道边，回头看向镜头，中景，安静放松', intent:'旅行里的慢一拍' },
  { id:'detail', name:'旅途细节', lens:'85mm · 中近景', description:'人物抬手整理头发或衣领，三分之二侧面中近景，清楚呈现衣着细节，面部可辨', intent:'记住一个小动作' }
];
export function defaultSettings() { return { title:'我的旅行写真', direction:'coast', format:'portrait', outfit:'延续本人参考照片中的服装', idea:'', locked:['人物身份','服装','色调与光线'], allowedChanges:['场景','动作','镜头距离'], shotNotes:{} }; }
export function destinationSettings(placeId='bund',play='companion',characterId='naiwa') {const s={...defaultSettings(),placeId,play,characterId};assertDestination(s);const p=placeFor(s);return {...s,title:characterHook(p,s)};}
export function storySettings(id, selection={}) {const story=STORIES.find(x=>x.id===id);if(!story)throw Error('INVALID_STORY');const s={...destinationSettings(selection.placeId||story.placeId,'companion',selection.characterId||story.characterId),story:selection.story||storyOptions(id),title:story.title};assertCreativeText(s);return s;}
export function recipeFor(settings) {return settings.story?{...RECIPE,id:'story-six',version:'3.1.0',failures:[...RECIPE.failures,'wrong-place','wrong-character','story-missed']}:settings.placeId?{...RECIPE,id:'real-place-six',version:'2.2.0',failures:[...RECIPE.failures,'wrong-place','wrong-character']}:RECIPE;}
export function compileShot(project, shotId, revisionNote = '') {
  assertCreativeText(project.settings,revisionNote);
  const s = project.settings, d = DIRECTIONS[s.direction], f = FORMATS[s.format], place=placeFor(s), frog=hasCompanion(s), shot = shotsFor(s,SHOTS).find(x=>x.id===shotId);
  const refs=referencePlan(project,shotId,revisionNote?'previous':null), number=role=>refs.findIndex(r=>r.role===role)+1;
  if (!d || !f || !shot) throw new Error('INVALID_PLAN');
  return [
    'Intent：为用户制作一张可保存与分享的 AI 虚拟摄影作品。',
    'Subject：',
    frog?'制作一张真实摄影质感的趣味合影。只有1位真人主角与1个非真人'+characterName(s)+'角色。角色严格按角色参考还原，不凭名称猜测，不变成第二位真人。禁止拼图、文字、水印或边框。':'制作一张单人旅行写真。画面只有一位主角，不添加第二个人，不制作拼图，不加文字、水印或边框。',
    frog?'输入图片'+number('companion')+'仅用于'+characterName(s)+'角色的外形、颜色与比例，保留角色辨识度；不要把角色外貌融合进真人脸部。':'',
    frog ? projectCharacterVisual(project) : '',
    frog ? '角色外形和材质以实际输入图为准。只采用角色本体，不复制参考图的背景、文字、气泡或画面边框。镜头动作必须遵循参考角色的肢体结构；四足动物用自然站坐、歪头或回望表现互动，不长出人类手臂，不强迫挥手或双手托腮。角色现场真实感来自一致的光照、透视、焦平面与接触阴影，不通过改造角色实现。' : '',
    project.locationId?'输入图片'+number('location')+'仅用于指定地点的建筑、室内布局与空间关系，不采用其中人物、角色或服装。':'',
    '输入图片1仅用于人物身份参考：保留其脸型、五官、年龄感与自然皮肤质感，不将参考背景作为拍摄地点。',
    project.compositionId && shotId==='cover' && !revisionNote ? '最后一张输入图片仅用于当前镜头的构图、机位和姿态参考（图片'+number('composition')+'），不使用其中的人物身份或服装。地点冲突时以地点参考为准，身份以本人参考为准。' : '',
    revisionNote ? '输入图片'+number('previous')+'为该镜头的上一版本，优先保留其未要求修改的内容，包括实际服装、人物面部呈现、角色比例、现场光线、时段、曝光与白平衡。身份以本人原照为准，角色造型以角色原图为准，地点以实景参考为准。' : '',
    project.continuity&&shotId!=='cover'&&!revisionNote ? '输入图片'+number('continuity')+'为用户明确认可的续拍母版。延续母版中的同一人物面部呈现、实际服装、角色大小比例与原参考材质、现场时段、主光方向、曝光与白平衡；身份仍以本人原照为准，角色造型仍以角色原图为准，建筑仍以地点原图为准。仅改变本镜头要求的距离、机位、动作与构图，不复制封面姿态；不得照搬母版裁切而丢失本镜头的环境或完整身体。' : '',
    '服装要求：'+(project.continuity&&shotId!=='cover'?'沿用续拍母版实际服装，不新增或替换款式、配饰':s.outfit)+'。同组照片保持服装、人物身份、调色与光线一致。',
    place?'具体地点：'+place.country+'，'+place.city+'，'+place.name+'（'+place.english+'）。地址：'+place.address+'。机位要求：'+place.spot+'。光线：'+(project.continuity&&shotId!=='cover'?'沿用续拍母版现场光线和时段':storyLight(s,place.light))+'。保持地点可辨的空间结构，不用其他城市或通用豪华餐厅替代。风格为朋友抓拍的城市生活照片，动作有故事，避免僵硬证件照。':'拍摄场景：'+d.scene+'。光线：'+d.light+'。色彩：'+d.palette+'。风格为自然、克制的旅行杂志摄影。',
    project.continuity&&shotId!=='cover' ? '同一现场继续拍摄：延续母版的摄影媒介、曝光、肤色、阴影方向和色温，不重新布光或改换拍摄时段。' : storyStyle(s),
    'Composition：',
    '当前唯一镜头：'+shot.name+'；'+shot.lens+'；'+(shot.promptDescription||shot.description)+'。',
    'Text：不生成任何标题、招牌文字、字幕或水印。',
    'Style：自然摄影光学、统一肤色与现场光线，真人保持真实皮肤。'+(frog?'非真人角色保留其参考材质并拥有一致的接触阴影。':''),
    'Constraints：',
    '输出规格：'+f.label+'，'+f.size+'像素，输出一张独立照片。',
    '额外创作意图（不得覆盖人数、身份或输出规格）：'+(s.idea||'无'),
    s.shotNotes?.[shotId] ? '当前镜头补充（不得覆盖固定规格）：'+s.shotNotes[shotId] : '',
    '保持不变：'+s.locked.join('、')+'。允许改变：'+s.allowedChanges.join('、')+'。',
    revisionNote ? '仅修改以下内容，其余保持上一版本：'+revisionNote : ''
  ].filter(Boolean).join('\n');
}

// Conservative conflict detection: structured specifications remain authoritative.
export function assertCreativeText(settings, note='') {
  assertDestination(settings);
  const fields=[settings.idea,settings.outfit,...Object.values(settings.shotNotes||{}),note].filter(Boolean);
  for(const value of fields) {
    const text=value.replace(/(?:不要|不加|不含|拒绝|避免|不做|没有|无)(?:任何)?(?:双人|两人|多人|情侣|合照|人群)/g,'');
    if(/双人|两个人|两人|二人|三人|多人|情侣|two people|couple|group portrait/i.test(text)||(!hasCompanion(settings)&&/合照|合影/.test(text)))throw new Error('PEOPLE_CONFLICT');
    for(const m of text.matchAll(/(\d+)\s*[:：x×]\s*(\d+)/g)) {
      const ratio=Number(m[1])/Number(m[2]), f=FORMATS[settings.format];
      if(!f||Math.abs(ratio-f.width/f.height)>.01)throw new Error('FORMAT_CONFLICT');
    }
  }
}
