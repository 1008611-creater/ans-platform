import {describe,it,expect,afterEach,vi} from 'vitest';
import {shootApi,ShootApiError} from './shoot-api';
import {defaultSettings} from '../../runtime/recipe.mjs';
import {draftChanged,mergeDraft} from './shoot-draft';
afterEach(()=>vi.restoreAllMocks());
describe('network outcome distinction without retry',()=>{
 it('lost replies have an uncertain result and perform exactly one fetch',async()=>{const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(new TypeError('offline'));try{await shootApi('/studio-next','projects/test/submissions',{method:'POST',body:'{}'});}catch(error){expect(error).toBeInstanceOf(ShootApiError);expect(error).toMatchObject({code:'NETWORK',uncertain:true});}expect(fetcher).toHaveBeenCalledTimes(1);});
 it('an unreadable success reply is uncertain while a specific rejection is known',async()=>{const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response('proxy html',{status:200})).mockResolvedValueOnce(Response.json({error:'STALE_PLAN',message:'其他窗口已更新'},{status:409}));await expect(shootApi('','one')).rejects.toMatchObject({code:'UNREADABLE',uncertain:true});await expect(shootApi('','two')).rejects.toMatchObject({code:'STALE_PLAN',uncertain:false});expect(fetcher).toHaveBeenCalledTimes(2);});
 it('success is returned without follow-up submission',async()=>{const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({job:{id:'one'}}));expect(await shootApi('','test')).toEqual({job:{id:'one'}});expect(fetcher).toHaveBeenCalledTimes(1);});
});
describe('explicit multi-window draft merging',()=>{
 it('preserves locally edited fields without reverting untouched remote fields',()=>{const base=defaultSettings(),local={...base,title:'my title'},remote={...base,idea:'other window idea',format:'square' as const};const result=mergeDraft(base,local,remote);expect(result).toMatchObject({title:'my title',idea:'other window idea',format:'square'});expect(draftChanged(local,base)).toBe(true);expect(draftChanged(base,base)).toBe(false);});
 it('only explicit merge chooses local text when both windows changed that field',()=>{const base=defaultSettings(),local={...base,idea:'local'},remote={...base,idea:'remote',outfit:'remote outfit'};expect(mergeDraft(base,local,remote)).toMatchObject({idea:'local',outfit:'remote outfit'});expect(remote.idea).toBe('remote');});
 it('merges independently edited shot notes, including an explicit deletion',()=>{const base={...defaultSettings(),shotNotes:{cover:'cover before',place:'place before'}},local={...base,shotNotes:{cover:'cover local'}},remote={...base,shotNotes:{cover:'cover before',place:'place before',detail:'detail remote'}};expect(mergeDraft(base,local,remote).shotNotes).toEqual({cover:'cover local',detail:'detail remote'});expect(remote.shotNotes.place).toBe('place before');});

});
