import {describe,it,expect} from 'vitest';
import {dinoReply,guideQuestions} from './shoot-dino-chat';
import {studioDino} from './shoot-dino';
const task=studioDino({screen:'intro',project:null,booting:false,busy:false,dirty:false,hasError:false,enabled:false,missing:[],companion:true});
describe('local creative guide',()=>{
 it('answers the actual photo-selection shortcut with actionable upload guidance',()=>{expect(dinoReply('怎么选照片',task).text).toContain('清晰单人照');});
 it('sends saved-photo download and modification help to results without generating',()=>{const saved={...task,saved:1,phase:'review' as const};expect(dinoReply('下载原图',saved).action).toBe('results');expect(dinoReply('怎么修改这张',saved).action).toBe('results');});
 it('uses recovery questions and preserves uncertainty rather than promising another charge',()=>{const recovering={...task,phase:'recovering' as const};expect(guideQuestions(recovering)).toContain('查看生成记录');expect(dinoReply('查看生成记录',recovering).action).toBe(recovering.action);});
 it('keeps identity and companion reference responsibilities separate',()=>{expect(dinoReply('本人和搭子图怎么放',{...task,phase:'input'}).text).toContain('只负责你的长相');});

 it('routes reference help to the available home flow without creating a project',()=>{expect(dinoReply('怎么上传本人照片',task).action).toBe('discover');});
 it('offers all five gestures without a model or generation action',()=>{expect(['招手','想一想','拍照','庆祝','睡觉'].map(q=>dinoReply(q,task).animation)).toEqual([1,2,3,4,5]);});
 it('never promises unrestricted answers or echoes private input',()=>{const r=dinoReply('PRIVATE_SECRET 怎么把全世界变成我的',task);expect(r.text).not.toContain('PRIVATE_SECRET');expect(r.action).toBe('discover');});
 it('follows actual failed or uncertain status instead of offering retries',()=>{const r=dinoReply('502 重试', {...task,phase:'recovering',message:'先核实记录',action:'costs',actionLabel:'看记录'});expect(r.action).toBe('costs');expect(r.text).toBe('先核实记录');});
 it('separates historical billing help from successful delivery navigation',()=>{const delivered={...task,saved:6,phase:'review' as const,action:'results' as const,targetId:'studio-progress'};expect(dinoReply('查看生成记录',delivered)).toMatchObject({action:'costs',targetId:'studio-costs'});expect(dinoReply('下载原图',delivered)).toMatchObject({action:'results',targetId:'studio-progress'});});

});
