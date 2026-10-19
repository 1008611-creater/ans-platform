// Editorial selection, not a live popularity ranking. Artwork is display-only.
import { CHARACTER_ARTWORK } from './character-artwork.mjs';
export const CHARACTER_CATALOG_VERSION='2026-10-07.2';
export const DISCOVERY_PROJECT={name:'梗档案馆 · Meme Archive',url:'https://github.com/ThySummer14/meme-archive',data:'https://raw.githubusercontent.com/ThySummer14/meme-archive/main/data/memes.json',license:'未声明许可证；仅作发现线索，不复制图库或整库文案',checkedAt:'2026-10-07'};
const archive=DISCOVERY_PROJECT.url;
export const CHARACTERS=[
 {id:'naiwa',name:'奶蛙',aliases:['大笑奶蛙','变异奶龙'],category:'meme',tag:'抽象搭子',line:'行程还没开始，它先笑场。',color:'#eeef80',mark:'蛙',source:'https://www.gcores.com/articles/217077',sourceLabel:'机核 · 奶蛙文化报道',verification:'reported',note:'奶蛙与奶龙分别收录；二创版本以你上传的参考为准。'},
 {id:'nailong',name:'奶龙',aliases:['Nailoong','Nailong'],category:'animation',tag:'吃饭搭子',line:'菜单才翻第一页，它已经饿了。',color:'#ffd75c',mark:'龙',source:'https://www.nailoong.com/ipStar/Nailong/',sourceLabel:'第七印象 · 奶龙官方介绍',verification:'official',note:'第七印象原创动漫角色；不与奶蛙混用。'},
 {id:'niulai',name:'牛来',aliases:['牛牛','牛来了'],category:'meme',tag:'出门搭子',line:'人还在路上，牛已经来了。',color:'#dcbfa8',mark:'牛',source:'https://www.bilibili.com/video/BV1XabQ6VEWS/',sourceLabel:'梗指南 · 牛来是什么梗',verification:'reported',note:'按动画《牛来》的角色条目收录，具体造型与年龄版本由参考图确定。'},
 {id:'feidudu',name:'美团肥嘟嘟',aliases:['美团老鼠','美团袋鼠','胆子真是肥嘟嘟的'],category:'meme',tag:'显眼搭子',line:'这顿吃这么好，胆子挺肥嘟嘟。',color:'#ffe66b',mark:'肥',source:'https://www.digitaling.com/articles/1568839.html',sourceLabel:'数英 · 肥嘟嘟热梗报道',verification:'reported',note:'网络表情包称呼，与美团袋鼠有关；不代表品牌合作。'},
 {id:'miaocuijiao',name:'妙脆角猫',aliases:['妙脆角小猫','三角耳'],category:'meme',tag:'发呆搭子',line:'它在发呆，你在拍人生照片。',color:'#edcbb8',mark:'猫',source:'https://www.cbndata.com/information/295835',sourceLabel:'CBNData · 妙脆角猫报道',verification:'reported',note:'猫咪迷因有多种二创外形；由你的参考图确定所选版本。'},
 {id:'doubao',name:'豆包',aliases:['显眼包','豆包形象'],category:'meme',tag:'版本由你定',line:'今天不问豆包，今天带它出门。',color:'#b9d8fa',mark:'豆',source:archive,sourceLabel:'梗档案馆 · 同名条目线索',verification:'pending',note:'同名资料主要指 AI 助手，不能据此认定你要的角色外形。请上传你指的非真人版本。'},
 {id:'chiikawa',name:'吉伊',aliases:['Chiikawa','吉伊卡哇','小可爱'],category:'cute',tag:'小小搭子',line:'世界很大，今天靠近一点。',color:'#f4dce0',mark:'吉',source:'https://www.chiikawaofficial.com/characters',sourceLabel:'Chiikawa · 官方角色介绍',verification:'official',note:'单独选择吉伊，不默认加入其他角色。'},
 {id:'hachiware',name:'小八',aliases:['Hachiware','八字猫','吉伊卡哇'],category:'cute',tag:'元气搭子',line:'负责陪你，把普通一天过成郊游。',color:'#bad9e8',mark:'八',source:'https://www.chiikawaofficial.com/characters',sourceLabel:'Chiikawa · 官方角色介绍',verification:'official',note:'单独选择 Hachiware，不默认加入其他角色。'},
 {id:'usagi',name:'乌萨奇',aliases:['Usagi','乌拉呀哈','吉伊卡哇'],category:'cute',tag:'撒欢搭子',line:'你负责出片，它负责突然出现。',color:'#f2deb3',mark:'兔',source:'https://www.chiikawaofficial.com/characters',sourceLabel:'Chiikawa · 官方角色介绍',verification:'official',note:'单独选择 Usagi，不默认加入其他角色。'},
 {id:'maltese',name:'线条小狗',aliases:['Maltese','马尔济斯','小白狗'],category:'cute',tag:'贴贴搭子',line:'旅行可以没攻略，不能没贴贴。',color:'#e7e9e0',mark:'狗',source:'https://store.line.me/stickershop/product/33734/zh-Hant',sourceLabel:'Moonlab_studio · LINE 贴图',verification:'official',note:'默认选小白狗，单个角色；具体形象按上传参考。'},
 {id:'xuewang',name:'雪王',aliases:['蜜雪冰城','Snow King'],category:'brand',tag:'快乐搭子',line:'人均快乐，不设最低消费。',color:'#f4c7cf',mark:'雪',source:archive,sourceLabel:'梗档案馆 · 雪王条目',verification:'reported',note:'蜜雪冰城品牌角色资料线索，不代表品牌合作。'},
 {id:'pepe',name:'悲伤蛙',aliases:['Pepe','Pepe the Frog'],category:'meme',tag:'摆烂搭子',line:'你看风景，它看起来不想上班。',color:'#c1d6b1',mark:'呱',source:archive,sourceLabel:'梗档案馆 · Pepe 条目',verification:'reported',note:'与奶蛙分开收录；具体表情与版本按上传参考。'}
].map(c=>({...c,artwork:CHARACTER_ARTWORK[c.id]||null,checkedAt:'2026-10-07',assetStatus:'reference-required'}));
export const CUSTOM_CHARACTER={id:'custom',name:'我的搭子',aliases:[],category:'custom',tag:'自带角色',line:'不在名单里？带上你的私藏。',color:'#e7e6f3',mark:'＋',source:null,sourceLabel:'自带参考',verification:'custom',note:'上传你有权使用的单个非真人角色参考。',checkedAt:'2026-10-07',assetStatus:'reference-required',artwork:null};
export function characterFor(s){return s.characterId==='custom'?CUSTOM_CHARACTER:CHARACTERS.find(c=>c.id===(s.characterId||'naiwa'));}
export function characterKey(s){return s.characterId||'naiwa';}
export function characterName(s){return characterFor(s)?.name||'搭子';}
export function searchCharacters(query='',category='all'){const q=query.trim().toLocaleLowerCase();return CHARACTERS.filter(c=>(category==='all'||c.category===category)&&(!q||[c.name,...c.aliases,c.tag].join(' ').toLocaleLowerCase().includes(q)));}
export function characterHook(place,s){if(s.play==='solo')return place.soloHook;const c=characterFor(s);return c?.id==='naiwa'?place.hook:('带'+(c?.name||'搭子')+'去'+place.name);}
