import { characterFor, characterName } from './characters.mjs';
// Versioned editorial recipes. These are concepts, not verified output samples or canonical IP lore.
export const STORY_VERSION=1;
export const STORIES=[
 {id:'dinner-crasher',title:'订了两位，来了一位显眼包',short:'今晚谁买单',tag:'饭搭子失控现场',line:'你负责优雅，它负责盯着最后一口甜品。',placeId:'mercato',characterId:'feidudu',places:['mercato','celavi'],color:'#ffe175',beats:['正式入席','餐厅亮相','它先盯上了','最后一口','假装没看见','和好收工'],hook:'一顿很正式的晚餐，和一个不太正式的旅伴。'},
 {id:'scene-stealer',title:'我在拍大片，它在抢镜',short:'谁才是主角',tag:'地标抢镜事件',line:'前一张还挺正常，后一张主角已经换人。',placeId:'bund',characterId:'naiwa',places:["bund", "hongya", "shibuya", "paris", "forbidden-city", "west-lake", "canton-tower", "victoria-harbour", "st-pauls", "dotonbori", "fushimi-inari", "bukchon", "brooklyn-bridge", "tower-bridge", "sydney-opera", "marina-bay"],color:'#e4ef8d',beats:['正常营业','地点交代','突然入镜','反客为主','换我营业','认真合影'],hook:'同一个地点，六次关于谁站在镜头前的拉扯。'},
 {id:'slow-travel',title:'我赶行程，它原地放空',short:'旅伴慢半拍',tag:'旅行搭子掉线',line:'计划逛完整座城，结果在路边陪它发了半天呆。',placeId:'shibuya',characterId:'miaocuijiao',places:["bund", "hongya", "shibuya", "paris", "forbidden-city", "west-lake", "canton-tower", "victoria-harbour", "st-pauls", "dotonbori", "fushimi-inari", "bukchon", "brooklyn-bridge", "tower-bridge", "sydney-opera", "marina-bay"],color:'#d9e7f5',beats:['准备出发','城市很忙','旅伴掉线','我也不走了','慢一点也好','今天就这样'],hook:'从急着出发，到发现陪它待着也不错。'},
{"id": "tourist-director", "title": "我在打卡，它在指挥", "short": "搭子当导演", "tag": "假装很懂摄影", "line": "你站好，它指挥。最后发现它自己才想上镜。", "placeId": "tower-bridge", "characterId": "nailong", "places": ["bund", "hongya", "shibuya", "paris", "forbidden-city", "west-lake", "canton-tower", "victoria-harbour", "st-pauls", "dotonbori", "fushimi-inari", "bukchon", "brooklyn-bridge", "tower-bridge", "sydney-opera", "marina-bay"], "color": "#f1dcbb", "beats": ["到此一游", "先看全景", "导演上线", "位置互换", "轮到我拍", "一起收工"], "actions": ["真人面向镜头，角色在身旁像认真观察机位，双方完整露脸", "广角交代真实地标与安全步道，双方全身入镜，地标结构完整", "真人中近景，角色在肩旁歪头观察，像指导表情，不遮脸", "真人略退半步忍笑，角色在画面侧前方摆出认真姿态", "真人占据视觉中心看镜头，角色侧身配合，彼此注视形成幽默", "真人与角色并肩自然合影，用同一地点与光线收尾"], "hook": "你站好，它指挥。最后发现它自己才想上镜。"},
{"id": "wrong-platform", "title": "我等旅伴，它等开饭", "short": "约会不在状态", "tag": "各有各的期待", "line": "同一个约定地点，两位主角想的是两件事。", "placeId": "mercato", "characterId": "nailong", "places": ["mercato", "celavi"], "color": "#f0e1c9", "beats": ["准时赴约", "坐在这里", "目光跑偏", "我也看见了", "终于同步", "愉快散场"], "actions": ["真人和角色共坐餐桌，真人看镜头，角色向桌面看，双方露脸", "广角交代参考餐厅内装，双方共桌，家具与真实参考一致", "真人中近景忍笑，角色在侧边注视桌面甜品，不遮挡真人", "真人也看向桌面，角色前倾关注甜品，只用身体和视线不拿餐具", "真人和角色一起看向镜头，桌面甜品在画面下方", "真人与角色并肩合影，暖色餐厅现场光保持一致"], "hook": "同一个约定地点，两位主角想的是两件事。"},
{"id": "main-character", "title": "今天，它是我的保镖", "short": "带搭子炸街", "tag": "气场反差", "line": "看起来谁都不敢惹，其实一个比一个可爱。", "placeId": "shibuya", "characterId": "feidudu", "places": ["bund", "hongya", "shibuya", "paris", "forbidden-city", "west-lake", "canton-tower", "victoria-harbour", "st-pauls", "dotonbori", "fushimi-inari", "bukchon", "brooklyn-bridge", "tower-bridge", "sydney-opera", "marina-bay"], "color": "#dedcf1", "beats": ["认真出场", "城市开场", "忍住别笑", "一起炸街", "破功一秒", "今日封面"], "actions": ["真人面对镜头站立，角色在身旁故作严肃，双方完整露脸", "广角交代真实街区，真人与角色在安全人行区域，并肩停留", "真人面部中近景，神情认真但嘴角带笑，角色不遮挡面部", "真人与角色并肩自然行走，双方全身入镜，地标仍然可辨", "真人忍笑看向角色，角色姿态过分认真，保持同一服装与现场", "真人与角色轻松面向镜头，像朋友留下的一张炸街合影"], "hook": "看起来谁都不敢惹，其实一个比一个可爱。"},
{"id": "postcard", "title": "这张明信片，有点离谱", "short": "寄一张合影", "tag": "正经景点不正经搭子", "line": "背景很经典，主角组合很不经典。", "placeId": "paris", "characterId": "chiikawa", "places": ["bund", "hongya", "shibuya", "paris", "forbidden-city", "west-lake", "canton-tower", "victoria-harbour", "st-pauls", "dotonbori", "fushimi-inari", "bukchon", "brooklyn-bridge", "tower-bridge", "sydney-opera", "marina-bay"], "color": "#d9e9e1", "beats": ["明信片封面", "风景交代", "小小旅伴", "凑近一点", "看向远方", "留张纪念"], "actions": ["真人和角色并肩面向镜头，经典地标明显，像旅游明信片封面", "广角交代指定地标完整结构，双方位于一侧安全人行区域", "真人中近景，角色在肩旁完整露脸，表情拘谨而可爱", "真人稍弯腰靠近角色，与角色视线平齐，双方五官完整", "真人与角色自然并肩看向地标，保留侧脸与同一光线", "双方回头看镜头，保留指定地标与同一次拍摄的服装"], "hook": "背景很经典，主角组合很不经典。"},
{"id": "lost-guide", "title": "我查攻略，它带错路", "short": "旅行导航失灵", "tag": "嘴硬小导游", "line": "走得很自信，目的地完全没想好。", "placeId": "hongya", "characterId": "usagi", "places": ["bund", "hongya", "shibuya", "paris", "forbidden-city", "west-lake", "canton-tower", "victoria-harbour", "st-pauls", "dotonbori", "fushimi-inari", "bukchon", "brooklyn-bridge", "tower-bridge", "sydney-opera", "marina-bay"], "color": "#edd5ce", "beats": ["自信出发", "我们在哪", "再看一眼", "跟我来吧", "原地商量", "先拍再说"], "actions": ["真人与角色站在安全步道，角色朝一侧看像自信带路，双方露脸", "广角交代指定地点，真人观察地标，角色身体朝另一方向", "真人面部中近景疑惑又忍笑，角色在侧边保持参考外形", "真人与角色自然前行，角色略在前方，双方全身入镜", "真人和角色停步对视，像重新商量方向，不增添文字地图", "真人与角色面对镜头合影，像决定先留下纪念"], "hook": "走得很自信，目的地完全没想好。"},
{"id": "dinner-cover", "title": "今晚穿得很认真，搭子没有", "short": "晚餐反差大片", "tag": "正经约饭", "line": "服装很认真，旁边的小家伙让照片破功。", "placeId": "celavi", "characterId": "maltese", "places": ["mercato", "celavi"], "color": "#dfe3c8", "beats": ["晚餐封面", "餐厅全景", "忍笑近景", "同桌默契", "看看窗外", "饭后合影"], "actions": ["真人在参考餐厅座位面向镜头，角色在旁边认真入镜，双方完整露脸", "广角交代指定餐厅实景，双方共桌，保持真实参考布局", "真人中近景忍笑，角色在侧边好奇看着真人", "真人身体稍朝角色转，角色贴近一侧回应，不遮脸不拟人拿餐具", "真人与角色共同看向参考中的窗景或室内空间，保留侧脸", "真人与角色轻松合影，像吃完晚餐的一张朋友抓拍"], "hook": "服装很认真，旁边的小家伙让照片破功。"}
];
export const ENERGIES=[
 {id:'chill',label:'乖乖合影',hint:'表情有戏，动作收着',prompt:'以微表情、视线和轻微姿态表现剧情；不做大幅度动作，保持安静的幽默'},
 {id:'playful',label:'偷偷抢镜',hint:'有互动，也有反差',prompt:'采用清晰但自然的身体互动；真人和角色的反应形成反差，保持朋友抓拍的可信度'},
 {id:'wild',label:'彻底放飞',hint:'动作更大，主角还是你',prompt:'放大当前剧情的姿态与表情反差，动作夸张但符合角色身体结构；真人脸部清晰、肢体完整，不腾空、不制造危险行为'}
];
export const CAMERAS=[
 {id:'candid',label:'朋友抓拍',hint:'自然、松弛、像偶遇',prompt:'自然环境光，轻微不对称的朋友抓拍构图，保留真实皮肤与空间层次'},
 {id:'flash',label:'夜晚直闪',hint:'一闪，有点派对味',prompt:'同一地点夜晚环境，温暖直闪照亮面部，背景适度压暗但地标仍可辨，统一全组六张的夜间白平衡'},
 {id:'editorial',label:'认真大片',hint:'构图讲究，故事照旧',prompt:'同一时间段的克制杂志摄影，明确主次和留白，自然肤色，统一光线方向与色彩'}
];
export const RELATIONSHIPS=[
 {id:'friends',label:'损友搭子',prompt:'彼此平等的旅伴关系，通过对视、忍笑与默契回应对方'},
 {id:'i-care',label:'我照顾它',prompt:'真人是照顾者，角色动作后真人温柔关注或耐心等候，不改变当前剧情的核心事件'},
 {id:'it-cares',label:'它照顾我',prompt:'角色以注视、陪伴与关切姿态回应真人，真人可以放心放松，不改变当前剧情的核心事件'}
];
const PERSONAS={
 naiwa:['笑场担当','用忍不住的笑意回应现场','双臂外展，歪头摆出故作认真的拍照姿态'],
 nailong:['看到吃的就认真','目光被眼前的食物或小物吸引，表情好奇','探身观察但不遮住真人脸部'],
 niulai:['笨拙但热心','认真观察真人反应，神情诚恳','微微前倾，像努力跟上真人的节奏'],
 feidudu:['理直气壮的显眼包','神情笃定，仿佛自己才是被邀请的主角','挺起身体面对镜头，姿态过分认真'],
 miaocuijiao:['慢半拍发呆选手','保持圆睁的无辜眼神，安静停在原位','遵循猫的四肢结构待在身旁，不拟人持握物品'],
 doubao:['你的私藏版本','依据参考角色的面部结构自然回应','仅使用参考身体能够完成的姿势，不猜测物种与四肢'],
 chiikawa:['小小的陪伴','轻轻抬头看真人，显得有些拘谨','靠近真人身旁，姿态小心但愿意参与'],
 hachiware:['认真捧场','兴奋地看向真人，给予积极回应','身体朝向真人，像认真听旅行计划'],
 usagi:['突然出现的旅伴','用夸张的惊喜表情回应','突然从画面一侧探身入镜，耳朵完整且不遮挡真人'],
 maltese:['贴贴陪伴','向真人靠近，神情轻松','单个参考角色自然贴近真人身旁，不额外添加另一只狗'],
 xuewang:['过分热情的合影搭子','面向镜头给出热情的欢迎表情','保留参考中的冠形与披风，身形不挤压真人'],
 pepe:['淡定旁观','用若有所思的表情看着真人','姿态松弛，像已经看透了整个行程'],
 custom:['你的私藏搭子','表情严格遵循参考外观，自然回应真人','姿态与参考身体结构一致，不增添手脚']
};
export function personaFor(s){const p=PERSONAS[s.characterId||'naiwa']||PERSONAS.custom;return {label:p[0],reaction:p[1],gesture:p[2]};}
export function storyFor(s){return STORIES.find(x=>x.id===s.story?.id);}
export function storyOptions(id){if(!STORIES.some(s=>s.id===id))throw Error('INVALID_STORY');return {id,version:STORY_VERSION,energy:'playful',camera:'candid',relationship:'friends'};}
export function assertStory(s){
 if(!s.story)return;
 const p=storyFor(s),o=s.story;
 if(!p||o.version!==STORY_VERSION||!['frog','companion'].includes(s.play)||!p.places.includes(s.placeId))throw Error('INVALID_STORY');
 if(!ENERGIES.some(x=>x.id===o.energy)||!CAMERAS.some(x=>x.id===o.camera)||!RELATIONSHIPS.some(x=>x.id===o.relationship))throw Error('INVALID_STORY');
 // The daytime-only Paris location contract must not silently become a night shoot.
 if(s.placeId==='paris'&&o.camera==='flash')throw Error('STORY_LIGHT_CONFLICT');
}
export function adaptStory(s,placeId,play){
 if(!s.story||!['frog','companion'].includes(play))return undefined;
 const current=storyFor(s),next=current?.places.includes(placeId)?current:STORIES.find(x=>x.places.includes(placeId));
 return next?{...s.story,id:next.id,camera:placeId==='paris'&&s.story.camera==='flash'?'candid':s.story.camera}:undefined;
}
export function storyShots(s,shots){
 const story=storyFor(s);if(!story)return shots;assertStory(s);
 const c=characterName(s),p=personaFor(s);
 const actions=story.actions|| (story.id==='dinner-crasher'?[
 '真人和角色在同一张餐桌旁，真人端正坐着，角色略向镜头靠近；双方脸部完整可见',
 '环境全景交代该餐厅参考中的真实布局，真人与角色共桌，明确可辨的空间关系',
 '桌面同一份甜品在画面下方，真人忍笑，角色注视甜品；不让餐具遮挡面部',
 '真人将甜品小碟移近角色，角色仅以视线和身体前倾回应，不要求角色拿餐具',
 '桌面出现一张无文字的结账托盘，真人与角色各自看向一侧，表情形成默契的尴尬',
 '结账托盘不再出现，真人与角色轻松并肩认真合影，餐厅灯光与服装保持前面镜头的一致'
 ]:story.id==='scene-stealer'?[
 '真人正常面向镜头摆姿势，角色规矩站在旁边，指定地标清晰可辨',
 '广角镜头交代真实地点，真人与角色在安全人行空间停留，地标结构完整',
 '真人面部中近景，角色从肩旁探出，完整展示角色头部但不遮挡真人五官',
 '角色稍微站到前景，真人在旁边忍笑或摊手，双方全身与脸部清晰，地标仍可辨',
 '真人重新占据视觉中心，角色在侧后方配合看向真人，不挡脸，不增加其他人物',
 '真人与角色并肩看向镜头，结束抢镜，留下一张自然认真、双方露脸的合影'
 ]:[
 '真人准备出发，身体朝向前进方向，角色在身旁停留，形成轻微节奏差',
 '广角交代指定城市地点与安全人行区域，真人向前方看，角色安静停在身边',
 '真人蹲下或弯腰看向停住的角色，双方脸部可辨，神情从疑惑转为忍笑',
 '真人也停下脚步，在安全步道旁与角色对视，不坐在车道或不适合坐卧的位置',
 '真人放松下来，与角色并肩看同一处风景，姿势不再急促，构图从容',
 '真人回头看镜头，角色仍安静陪在身旁，用一张松弛合影结束同一次旅行'
 ]);
 return shots.map((shot,i)=>{const description=actions[i]+'。'+c+'：'+(i===3?p.gesture:p.reaction)+'。';return {...shot,name:story.beats[i],intent:['先留下你们的封面','交代这次真实的目的地','让表情讲故事','你们之间发生了什么','这一刻有点不一样','给这一天一个结尾'][i],description,promptDescription:description+ENERGIES.find(x=>x.id===s.story.energy).prompt+'。'+RELATIONSHIPS.find(x=>x.id===s.story.relationship).prompt+'。'};});
}
export function storyLight(s,original){if(!s.story)return original;return s.story.camera==='flash'?'夜晚，同一地点现场环境光与温暖直闪；六张统一夜间光线':original;}
export function storyStyle(s){if(!s.story)return '';assertStory(s);return CAMERAS.find(x=>x.id===s.story.camera).prompt+'；角色表现：'+personaFor(s).label+'。';}
export const QUICK_EDITS=[
 {id:'face',label:'别挡我的脸',note:'仅调整角色的位置，完整露出真人五官；保留真人身份、服装、地点、光线与画幅。'},
 {id:'closer',label:'搭子靠近一点',note:'仅缩短真人与角色之间的距离，双方自然靠近但不重叠、不遮脸；保留其他内容。'},
 {id:'place',label:'地点更明显',note:'保留人物与角色身份及服装，稍微放宽取景，让指定地点的标志更清晰；不替换建筑，不改变画幅。'},
 {id:'natural',label:'像朋友抓拍',note:'仅放松真人与角色的僵硬姿态，保持自然神情；人物身份、服装、场景、光线与画幅不变。'}
];
// Only public catalog keys are shareable. No free text, private IDs, photographs or session values.
export function storyLink(s,base){
 assertStory(s);if(!s.story||!characterFor(s)||s.characterId==='custom')throw Error('STORY_NOT_SHAREABLE');
 const url=new URL(base);url.search='';url.hash='';
 const fields={view:'intro',story:s.story.id,sv:String(s.story.version),character:s.characterId||'naiwa',place:s.placeId,energy:s.story.energy,camera:s.story.camera,relationship:s.story.relationship};
 for(const [k,v] of Object.entries(fields))url.searchParams.set(k,v);
 return url.toString();
}
export function readStoryLink(href){
 const url=new URL(href);if(!url.searchParams.has('story'))return {status:'none'};
 const q=url.searchParams,o={id:q.get('story'),version:Number(q.get('sv')),energy:q.get('energy'),camera:q.get('camera'),relationship:q.get('relationship')};
 const selection={placeId:q.get('place'),play:'companion',characterId:q.get('character'),story:o};
 try{assertStory(selection);if(!selection.characterId||!characterFor(selection)||selection.characterId==='custom')throw Error();return {status:'valid',selection};}catch{return {status:'invalid'};}
}
