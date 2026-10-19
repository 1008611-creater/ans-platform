import {describe,it,expect} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {COVER_EXPERIMENT,compileCoverExperiment,diagnosticError,diagnosticHeaders} from '../../../runtime/cover-experiment.mjs';
import {StudioStore} from '../../../runtime/store.mjs';
import {executeJob} from '../../../runtime/provider.mjs';
describe('controlled cover experiments (no network)',()=>{
 it('changes only one instruction block and keeps four reference responsibilities',()=>{
  const prompts=Object.keys(COVER_EXPERIMENT.factors).map(compileCoverExperiment);
  const blocks=prompts.map(p=>p.split('\n\n'));
  for(const b of blocks){expect(b).toHaveLength(6);expect(b[1]).toContain('image 1 identifies the human ONLY');expect(b[1]).toContain('image 2 is the photograph being edited');expect(b[2]).toContain('1024 x 1536');}
  for(let i=0;i<6;i++)if(i!==4)expect(new Set(blocks.map(b=>b[i])).size).toBe(1);
  expect(()=>compileCoverExperiment('all')).toThrow('UNKNOWN_FACTOR');
 });
 it('retains diagnostic IDs while discarding cookies and free-form error secrets',()=>{
  const h=diagnosticHeaders(new Headers({'x-request-id':'req-123','set-cookie':'session=secret','authorization':'Bearer hidden','server':'nginx'}));
  expect(h).toEqual({'x-request-id':'req-123',server:'nginx'});
  const e=diagnosticError({type:'upstream_error',code:null,message:'502 upstream timeout Bearer secret portrait data:image/png;base64,SENSITIVE'});
  expect(e.errorMessageSignals).toEqual(['upstream','timeout','502']);expect(JSON.stringify(e)).not.toMatch(/secret|portrait|SENSITIVE|Bearer/);
 });
 it('records the actual experimental prompt hash and preserves unknown submission without retry',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'cover-experiment-')),db=new StudioStore(dir);
  try {
   const p=db.create('owner');const png=await sharp({create:{width:128,height:128,channels:3,background:'#777777'}}).png().toBuffer();db.addReference('owner',p.id,'identity',png,{contentType:'image/png',width:128,height:128},true);
   const job=db.enqueue('owner',p.id,'single-variable-test','cover');let calls=0;
   const prompt=compileCoverExperiment('material');
   await executeJob(db,job,async({onSubmit}:{onSubmit:()=>void})=>{calls++;onSubmit();throw Error('UPSTREAM_UNCERTAIN');},{STUDIO_DAILY_REQUEST_LIMIT:'10'},{compile:()=>prompt});
   expect(calls).toBe(1);expect(db.getJob(job.id)!.status).toBe('recoverable');
   const attempt=db.costs('owner',p.id)[0];expect(attempt.status).toBe('unknown');expect(attempt.cost).toBe(null);expect(attempt).toHaveProperty('promptHash',createHash('sha256').update(prompt).digest('hex'));
   expect(db.get('owner',p.id).results).toHaveLength(0);
  }finally{db.close();rmSync(dir,{recursive:true,force:true});}
 });
});