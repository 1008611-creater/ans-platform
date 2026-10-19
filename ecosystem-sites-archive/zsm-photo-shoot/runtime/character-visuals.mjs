import { CHARACTER_ARTWORK } from './character-artwork.mjs';
// Visual facts apply to these exact reviewed originals, never to a name alone.
export const VISUAL_PROFILE_VERSION = '2026-10-08.1';
const profiles = {
 naiwa: '奶蛙造型锁定：奶油黄色圆滑竖椭圆身体、超大黑眼与浅黄绿细眼缘、细小闭嘴弧线微笑、短胳膊和短腿。保持原眼距与身体比例，表面为参考中的光滑哑光CG材质；不能改成毛绒玩具、人偶服，不加绒毛、缝线、腮红、舌头或大张嘴。',
 nailong: '奶龙造型锁定：圆润黄色恐龙，大头与圆身体，奶油色肚皮，短四肢、棕色爪尖和粉色掌垫。大圆眼为绿色虹膜、黑色瞳孔与细白眼缘，保留参考张开的椭圆嘴与头身比例；不凭印象加额头尖刺，不改为奶蛙的黑眼。表面保留参考光滑柔和的CG材质。',
 miaocuijiao: '妙脆角猫造型锁定：圆胖灰棕虎斑猫，白色口鼻、胸口与爪子，大圆深色眼睛、粉鼻和白色胡须。两只耳尖为金色三角玉米脆片，保留参考凹凸颗粒。保留自然短毛与猫科四足结构，不能改成光滑三角抱枕、毛绒玩具或人形猫；不能新增手臂、手掌、手指或凭空替换花纹。'
};
export function characterVisualProfile(characterId, reference) {
 const artwork=CHARACTER_ARTWORK[characterId];
 return reference?.builtin===true && artwork && reference.sha256===artwork.sha256 ? profiles[characterId]||'' : '';
}
export function projectCharacterVisual(project) {
 const refs=project.referenceFacts||project.references||[];
 const ref=refs.find(r=>r.id===project.companionId && r.role==='companion');
 return characterVisualProfile(project.settings.characterId||'naiwa',ref);
}
