import type {DinoAction,DinoSnapshot} from './shoot-dino';
export type GuideReply={text:string;label?:string;action?:DinoAction;targetId?:string;animation:number};
export function guideQuestions(task:DinoSnapshot):string[]{
 if(['failed','recovering','attention','cancelled'].includes(task.phase))return ['下一步做什么','查看生成记录','已有作品怎么保存'];
 if(task.saved)return ['下一步做什么','怎么修改这张','下载原图'];
 if(task.phase==='input')return ['怎么选照片','本人和搭子图怎么放','下一步做什么'];
 if(['confirm','blocked','editing'].includes(task.phase))return ['下一步做什么','怎么选照片','生成开放了吗'];
 return ['下一步做什么','怎么选照片','我的作品'];
}
// Local task guide. User text never leaves this page; no model or generation calls.
export function dinoReply(text:string,task:DinoSnapshot):GuideReply{
 const q=text.trim().slice(0,300);
 if(/失败|错误|502|重试/.test(q)||(/生成记录|费用|价格|收费|多少钱/.test(q)&&['failed','recovering','attention','cancelled'].includes(task.phase)))return {text:task.message,label:task.actionLabel,action:task.action,targetId:task.targetId,animation:2};
 if(/费用|价格|收费|多少钱|生成记录/.test(q))return {text:task.saved?'已有作品可以查看和下载。每张拍摄统一消耗 2 ANS 积分（¥0.20），失败自动退还。':'已接入 ANS 统一算力积分系统，每张拍摄消耗 2 ANS 积分（¥0.20），失败自动退还。',label:task.saved?'查看生成记录':task.actionLabel,action:task.saved?'costs':task.action,targetId:task.saved?'studio-costs':task.targetId,animation:2};
 if(/生成开放|能生成|能开拍|可以生成|进度|多久/.test(q))return {text:task.message,label:task.actionLabel,action:task.action,targetId:task.targetId,animation:2};
 if(/修改|重拍|不太像|不像|换.*背景/.test(q))return task.saved?{text:'在作品页选中那张照片，再写清楚只想改什么。原版会保留；人物与角色是否更像，要对照参考图检查。',label:'去看作品',action:'results',targetId:'studio-progress',animation:2}:{text:'先把参考和想法准备好。照片出来后，可以选一张定向修改，每个版本都会保留。',label:task.actionLabel,action:task.action,targetId:task.targetId,animation:2};
 if(/本人和搭子|角色图|参考.*怎么放/.test(q))return {text:'本人照片放「谁来当主角」，只负责你的长相。角色图放「搭子长这样」，锁定它的造型。地点图放「这里长这样」，负责真实现场。',label:task.phase==='idle'?'去选玩法':'去放参考图',action:task.phase==='idle'?'discover':'edit',targetId:task.phase==='idle'?'studio-discover':'studio-references',animation:2};
 if(/你好|嗨|hello|hi\b/i.test(q))return {text:'嗨！看中哪张，就点「拍同款」。想自己整活，也可以换搭子和地点。',animation:1};
 if(/招手|挥手|打招呼/.test(q))return {text:'在呢！你的拍照搭子已到位。',animation:1};
 if(/想一想|思考/.test(q))return {text:'让我想想，这个搭子放在哪最有反差？',animation:2};
 if(/庆祝|开心|跳舞|好耶/.test(q))return {text:'好耶！今天也要留下一张想发出去的照片。',animation:4};
 if(/拍照|茄子|笑一个/.test(q))return {text:'三、二、一，茄子！准备好了就去看拍摄计划。',label:task.phase==='idle'?'去选个玩法':'看我的计划',action:task.phase==='idle'?'discover':'plan',targetId:task.phase==='idle'?'studio-discover':'studio-plan',animation:3};
 if(/困|睡觉|休息/.test(q))return {text:'眯一小会儿。你点我，我就醒。',animation:5};
 if(/上传|照片怎么|怎么选照片|选.*照片|什么.*照片|参考|像我|本人/.test(q))return {text:'选正面或微侧面的清晰单人照，别遮脸。进入拍摄后，先确认素材使用范围，再点「上传本人照片」。',label:'去准备照片',action:task.phase==='idle'?'discover':'edit',targetId:task.phase==='idle'?'studio-discover':'studio-references',animation:2};
 if(/搭子|角色|地点|模板|玩法|同款|外滩|奶蛙/.test(q))return {text:'先看作品里的组合，喜欢就拍同款。想换角色或地点，展开「自己搭配」。',label:'去挑玩法',action:'discover',targetId:'studio-discover',animation:1};
 if(/保存|下载|作品|历史/.test(q))return {text:task.saved?'已保存的原图在作品页，点下载就能留到自己的设备。':'你的拍摄计划和已完成作品在「我的拍摄」。作品保留30天，记得下载原图。',label:task.saved?'去下载原图':'打开我的拍摄',action:task.saved?'results':'library',targetId:task.saved?'studio-progress':'studio-library',animation:4};
 if(/下一步|怎么开始|怎么用|能做|帮助|引导/.test(q))return {text:task.message,label:task.actionLabel,action:task.action,targetId:task.targetId,animation:1};
 return {text:'我可以帮你挑玩法、准备照片、找作品或看拍摄状态。你可以问「下一步做什么」，也可以把具体创意写进拍摄页。',label:task.actionLabel,action:task.action,targetId:task.targetId,animation:2};
}
