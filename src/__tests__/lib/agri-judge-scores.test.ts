// @vitest-environment node
import { beforeEach,describe,it,expect,vi } from "vitest";
import { executeAgriJudgeScoreCommand } from "@/server/competitions/agrihackathon/reviews";
const m=vi.hoisted(()=>({tx:{$queryRaw:vi.fn(),$executeRaw:vi.fn(),auditLog:{create:vi.fn()}},scope:vi.fn(),assert:vi.fn(),freeze:vi.fn()}));
vi.mock("@/lib/db",()=>({db:{$transaction:(fn:(tx:unknown)=>unknown)=>fn(m.tx)}}));
vi.mock("@/server/competitions/agrihackathon/workspace",()=>({lockAgriWorkspace:async(_tx:unknown,actorId:string)=>({actorId,workspace:{competitionId:"edition",enabled:true}}),requireAgriScope:(...args:unknown[])=>m.scope(...args),assertAgriAuthorityCurrent:(...args:unknown[])=>m.assert(...args),agriDatabaseClock:async()=>new Date("2030-01-03T00:00:00Z")}));
vi.mock("@/server/competitions/agrihackathon/submissions",()=>({projectAgriStageFreeze:(...args:unknown[])=>m.freeze(...args)}));
let frozen:string|null,self:boolean,panel:string[],existing:Array<{judgeId:string}>,prior:{id:string;requestHash:string}|null;
const command=()=>({action:"recordScore",submissionId:"submission",idempotencyKey:crypto.randomUUID(),dimensions:{innovation:90,technical:80,completeness:70,problem:60,fit:50}});
beforeEach(()=>{vi.clearAllMocks();frozen="submission";self=false;panel=["j1","j2","j3"];existing=[];prior=null;m.scope.mockResolvedValue({expiresAt:null});m.freeze.mockImplementation(async()=>({frozenSubmissionId:frozen}));m.tx.$queryRaw.mockImplementation(async(parts:TemplateStringsArray)=>{const sql=parts.join("?");
 if(sql.includes("FROM agri_stage_submissions s JOIN"))return [{id:"submission",competitionId:"edition",entryStageId:"stage",teamCompetitionId:"entry",teamId:"team",artifactVersionId:"version",sequence:1}];
 if(sql.includes("FROM agri_entry_stages WHERE"))return [{id:"stage",stage:"PRELIMINARY",currentSubmissionId:"submission",frozenSubmissionId:frozen}];
 if(sql.includes("FROM agri_ranking_publications"))return [{id:"panel",action:"PANEL",snapshot:{judgeIds:panel}}];
 if(sql.includes("AS blocked"))return [{blocked:self}];
 if(sql.includes("FROM agri_judge_scores"))return sql.includes('"idempotencyKey"=')?(prior?[prior]:[]):existing;
 throw new Error("Unexpected judge query: "+sql);
 });m.tx.$executeRaw.mockImplementation(async(_parts:TemplateStringsArray,...values:unknown[])=>{prior={id:String(values[0]),requestHash:String(values[7])};existing.push({judgeId:String(values[5])});return 1;});});
describe("immutable exact-version judge ballots",()=>{
 it("records only the current session judge and exact frozen submission, with a final scope recheck",async()=>{const input=command();const receipt=await executeAgriJudgeScoreCommand("j1",input);expect(receipt.duplicate).toBe(false);const insert=m.tx.$executeRaw.mock.calls[0];expect(insert[5]).toBe("PRELIMINARY");expect(insert[6]).toBe("j1");expect(JSON.parse(insert[7])).toEqual(input.dimensions);expect(m.assert).toHaveBeenCalled();expect(m.tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({actorId:"j1",action:"AGRI_RECORD_SCORE"})}));});
 it("replays the identical command once and rejects another ballot from that judge",async()=>{const input=command();const first=await executeAgriJudgeScoreCommand("j1",input);expect(await executeAgriJudgeScoreCommand("j1",input)).toMatchObject({scoreId:first.scoreId,duplicate:true});prior=null;await expect(executeAgriJudgeScoreCommand("j1",command())).rejects.toMatchObject({code:"AGRI_SCORE_ALREADY_RECORDED"});expect(m.tx.$executeRaw).toHaveBeenCalledTimes(1);});
 it("does not treat the same key with different scores as a replay",async()=>{const input=command();await executeAgriJudgeScoreCommand("j1",input);await expect(executeAgriJudgeScoreCommand("j1",{...input,dimensions:{...input.dimensions,fit:100}})).rejects.toMatchObject({code:"AGRI_IDEMPOTENCY_CONFLICT"});});
 it("rejects early or non-panel judges and self-team ballots",async()=>{frozen=null;await expect(executeAgriJudgeScoreCommand("j1",command())).rejects.toMatchObject({code:"AGRI_SCORE_FROZEN_SUBMISSION_REQUIRED"});frozen="submission";await expect(executeAgriJudgeScoreCommand("outsider",command())).rejects.toMatchObject({code:"AGRI_SCORE_PANEL_MEMBERSHIP_REQUIRED"});self=true;await expect(executeAgriJudgeScoreCommand("j1",command())).rejects.toMatchObject({code:"AGRI_SCORE_INDEPENDENT_JUDGE_REQUIRED"});expect(m.tx.$executeRaw).not.toHaveBeenCalled();});
 it("never accepts an extra judge beyond the required panel",async()=>{existing=[{judgeId:"other-1"},{judgeId:"other-2"},{judgeId:"other-3"}];await expect(executeAgriJudgeScoreCommand("j1",command())).rejects.toMatchObject({code:"AGRI_SCORE_JUDGES_COMPLETE"});expect(m.tx.$executeRaw).not.toHaveBeenCalled();});
});
