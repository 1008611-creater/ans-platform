import { describe, expect, it } from "vitest";
import { agriTaskCommandSchema } from "@/contracts/agri-tasks";
import { agriReferenceQuerySchema } from "@/contracts/agri-task-references";
const base = {action:"attachReference",taskId:"t",expectedRevision:1,idempotencyKey:"fbcc9e98-c354-4145-801f-5da8df3f1d4d",target:{submissionId:"s",issueId:null}};
describe("reference commands",()=>{
 it("requires exact target, owner task CAS and UUID without trusting foreign actor",()=>{expect(agriTaskCommandSchema.safeParse(base).success).toBe(true);for(const patch of [{ownerId:"other"},{expectedRevision:0},{target:{submissionId:"s",issueId:"i",competitionId:"c"}},{target:{submissionId:"",issueId:null}},{target:{submissionId:"s"}}])expect(agriTaskCommandSchema.safeParse({...base,...patch}).success).toBe(false);});
 it("uses one exact Demo identity and rejects mixed detail targets",()=>{
  expect(agriTaskCommandSchema.parse({...base,target:{submissionId:"s",issueId:null,demoCheckId:"demo"}}).action).toBe("attachReference");
  expect(agriTaskCommandSchema.safeParse({...base,target:{submissionId:"s",issueId:"issue",demoCheckId:"demo"}}).success).toBe(false);
  expect(agriTaskCommandSchema.safeParse({...base,target:{submissionId:"s",issueId:null,demoCheckId:""}}).success).toBe(false);
 });
 it("removal uses reference identity, not mutable submission metadata",()=>{expect(agriTaskCommandSchema.safeParse({action:"detachReference",taskId:"t",expectedRevision:2,idempotencyKey:base.idempotencyKey,referenceId:"r"}).success).toBe(true);expect(agriTaskCommandSchema.safeParse({action:"detachReference",taskId:"t",expectedRevision:2,idempotencyKey:base.idempotencyKey,referenceId:"r",submissionId:"s"}).success).toBe(false);});
 it("limits search data and preserves staff/team scope",()=>{expect(agriReferenceQuerySchema.parse({q:"  Team  "})).toEqual({scope:"team",q:"Team"});expect(agriReferenceQuerySchema.safeParse({q:"x".repeat(121)}).success).toBe(false);expect(agriReferenceQuerySchema.safeParse({scope:"everyone"}).success).toBe(false);});
});
