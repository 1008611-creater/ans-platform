import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_APPEARANCE } from "@/contracts/visual-website";
import { RESUME_WEBSITE_EXAMPLE } from "@/domain/projects/resume-website";
const m=vi.hoisted(()=>({ user:{findFirst:vi.fn()},project:{findUnique:vi.fn(),findFirst:vi.fn(),create:vi.fn(),update:vi.fn()},artifact:{findUnique:vi.fn(),create:vi.fn(),update:vi.fn()},artifactVersion:{create:vi.fn()},lock:vi.fn(),read:vi.fn() }));
vi.mock("@/lib/db",()=>({db:{$transaction:async (fn: (tx: unknown)=>unknown)=>fn({...m,$queryRaw:m.lock}),project:{findFirst:m.read}}}));
vi.mock("@/server/projects/service",()=>({ProjectServiceError:class extends Error {constructor(message:string,public code:string,public status:number){super(message);}}}));
import { getVisualWebsite, saveVisualWebsite } from "@/server/projects/visual-website";
const doc={format:"ans-visual-website",version:1,profile:RESUME_WEBSITE_EXAMPLE,appearance:DEFAULT_APPEARANCE};
const input={projectId:"442be0b3-ddea-4bf7-a340-94490b67fb35",expectedVersion:0,document:doc};
beforeEach(()=>{vi.resetAllMocks();m.user.findFirst.mockResolvedValue({id:"owner"});m.project.findUnique.mockResolvedValue({ownerId:"owner",status:"ACTIVE"});m.project.findFirst.mockResolvedValue({id:input.projectId});m.project.create.mockResolvedValue({ownerId:"owner",status:"ACTIVE"});m.artifact.findUnique.mockResolvedValue(null);m.artifact.create.mockResolvedValue({id:"artifact",currentVersion:0});});
describe("free private visual website saves",()=>{
 it("writes manual immutable content without a run and keeps project and artifact private",async()=>{
  m.project.findUnique.mockResolvedValue(null);await expect(saveVisualWebsite("owner",input)).resolves.toMatchObject({version:1});
  expect(m.project.create.mock.calls[0][0].data.visibility).toBe("PRIVATE");expect(m.artifact.create.mock.calls[0][0].data.visibility).toBe("PRIVATE");
  expect(m.artifactVersion.create.mock.calls[0][0].data).toMatchObject({workflowRunId:null,createdById:"owner",version:1,contentJson:doc});
 });
 it("refuses another owner's project before locking or writing",async()=>{
  m.project.findUnique.mockResolvedValue({ownerId:"another",status:"ACTIVE"});await expect(saveVisualWebsite("owner",input)).rejects.toMatchObject({code:"NOT_FOUND"});expect(m.lock).not.toHaveBeenCalled();expect(m.artifactVersion.create).not.toHaveBeenCalled();
 });
 it("rechecks editable state after acquiring the project lock",async()=>{
  m.project.findFirst.mockResolvedValue(null);await expect(saveVisualWebsite("owner",input)).rejects.toMatchObject({code:"PROJECT_ARCHIVED"});expect(m.lock).toHaveBeenCalled();expect(m.artifactVersion.create).not.toHaveBeenCalled();
 });
 it("rejects stale revisions and retains all existing versions",async()=>{
  m.artifact.findUnique.mockResolvedValue({id:"artifact",currentVersion:4,versions:[{factSnapshotHash:"newer"}]});await expect(saveVisualWebsite("owner",input)).rejects.toMatchObject({code:"VERSION_CONFLICT"});expect(m.artifactVersion.create).not.toHaveBeenCalled();expect(m.artifact.update).not.toHaveBeenCalled();
 });
 it("recovers a lost save acknowledgement without creating a duplicate version",async()=>{
  m.artifact.findUnique.mockResolvedValue({id:"artifact",currentVersion:1,versions:[{factSnapshotHash:createHash("sha256").update(JSON.stringify(doc)).digest("hex")}]});await expect(saveVisualWebsite("owner",input)).resolves.toMatchObject({version:1});expect(m.artifactVersion.create).not.toHaveBeenCalled();
 });
 it("refuses deleted or restricted account writes",async()=>{m.user.findFirst.mockResolvedValue(null);await expect(saveVisualWebsite("owner",input)).rejects.toMatchObject({code:"FORBIDDEN"});expect(m.project.create).not.toHaveBeenCalled();});
 it("scopes reads by owner and never grants team access",async()=>{m.read.mockResolvedValue(null);await expect(getVisualWebsite(input.projectId,"owner")).rejects.toMatchObject({code:"NOT_FOUND"});expect(m.read.mock.calls[0][0].where).toEqual({id:input.projectId,ownerId:"owner"});});
});
