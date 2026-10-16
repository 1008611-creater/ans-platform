import { describe, expect, it } from "vitest";
import { agriSubmissionWallListing } from "@/domain/competitions/agri-wall-sync";
import type { AgriStageSubmissionContent } from "@/contracts/agri-submissions";
const content: AgriStageSubmissionContent = {
  projectId: "private-project", artifactVersionId: "private-version", summary: "Public project summary",
  repository: { url: "https://github.com/example/project", ref: { kind: "TAG", value: "private-ref" } },
  demoUrl: "https://example.invalid/demo", materials: { schemaVersion: 1, items: [{key:"notes",kind:"TEXT",text:"PRIVATE_MATERIAL"}] },
};
const copy = { stage: "Preliminary", summary: (s:string)=>s, description:(s:string)=>`Project: ${s}`, license:"Public preview; authors retain rights.", deliverable:"Public project preview" };
const build = (c=content) => agriSubmissionWallListing({slug:"agri-test",title:"Project title",content:c,copy});
describe("consented submission public projection",()=>{
 it("publishes only the submitted summary and stable links as a free event resource",()=>{
  const listing=build(); expect(listing).toMatchObject({category:"competition",subcategory:"agri-wall",priceMinor:0,fulfillment:"resource",computeIncluded:false,githubUrl:content.repository!.url,usageUrl:content.demoUrl});
  const serialized=JSON.stringify(listing);for(const value of ["PRIVATE_MATERIAL","private-project","private-version","private-ref"])expect(serialized).not.toContain(value);
  expect(listing.execution).toBeUndefined();expect(listing.pricingTiers).toBeUndefined();
 });
 it("omits signed or credential-bearing links instead of exposing tokens",()=>{
  const listing=build({...content,repository:{url:"https://user:token@example.invalid/repo",ref:null},demoUrl:"https://example.invalid/demo?token=secret"});
  expect(listing.githubUrl).toBeUndefined();expect(listing.sourceUrl).toBeUndefined();expect(listing.usageUrl).toBeUndefined();expect(JSON.stringify(listing)).not.toContain("secret");
 });
 it("keeps an existing public cover and supports a non-GitHub repository",()=>{
  const listing=agriSubmissionWallListing({slug:"agri-test",title:"Project title",copy,content:{...content,repository:{url:"https://gitlab.com/example/project",ref:null}},existing:{coverUrl:"https://example.invalid/cover.png"}});
  expect(listing.sourceUrl).toBe("https://gitlab.com/example/project");expect(listing.coverUrl).toBe("https://example.invalid/cover.png");expect(listing.githubUrl).toBeUndefined();
 });
});
