import { createHash, webcrypto } from "node:crypto";
import { stableWorkflowInput } from "@/domain/workflows/recipes";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { MarketWorkflowRun } from "@/components/marketplace/workflow-run";
import { resumeWebsiteInputSchema } from "@/contracts/resume-website";
import { RESUME_WEBSITE_EXAMPLE, renderResumeWebsite } from "@/domain/projects/resume-website";
const m=vi.hoisted(()=>({request:vi.fn()}));
vi.mock("next-intl",()=>({useTranslations:()=>(key:string)=>key}));
vi.mock("@/components/marketplace/account-boundary",()=>({useMarketActorId:()=>"owner",useMarketRequest:()=>m.request}));
const details={recipe:"resume-website-v1" as const,variables:[],estimatedCost:2,version:1};
const copy={summary:"Reviewed introduction",projects:RESUME_WEBSITE_EXAMPLE.projects.map(()=>({description:"Reviewed project"}))};
const artifact=(name=RESUME_WEBSITE_EXAMPLE.fullName)=>({kind:"resume-website",mediaType:"text/html",content:renderResumeWebsite({...RESUME_WEBSITE_EXAMPLE,fullName:name},copy)});
beforeEach(()=>{vi.clearAllMocks();sessionStorage.clear();vi.stubGlobal("crypto",webcrypto);m.request.mockResolvedValue({runs:[]});});afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("invalidates cost acknowledgement when the parent editor changes its personal facts",async()=>{
 const view=render(<MarketWorkflowRun listingId="resume" version={1} details={details} profileInput={RESUME_WEBSITE_EXAMPLE}/>);
 await screen.findByText("noRuns");fireEvent.click(screen.getByRole("checkbox"));expect(screen.getByRole("button",{name:"confirmRun"})).toBeEnabled();
 view.rerender(<MarketWorkflowRun listingId="resume" version={1} details={details} profileInput={{...RESUME_WEBSITE_EXAMPLE,about:"New personal facts"}}/>);
 expect(screen.getByRole("checkbox")).not.toBeChecked();expect(screen.getByRole("button",{name:"confirmRun"})).toBeDisabled();
 fireEvent.submit(screen.getByRole("checkbox").closest("form")!);expect(m.request.mock.calls.filter(x=>x[1]==="POST")).toHaveLength(0);
});
it.each([true,false])("only adopts explicitly selected copy for a matching personal profile (%s)",async matching=>{
 const apply=vi.fn();m.request.mockResolvedValue({runs:[{id:"run",status:"SUCCEEDED",inputFingerprint:createHash("sha256").update(stableWorkflowInput({profile:RESUME_WEBSITE_EXAMPLE})).digest("hex"),costPoints:2,output:artifact(matching?undefined:"Different creator"),error:null,createdAt:"2026-10-13T00:00:00Z"}]});
 render(<MarketWorkflowRun listingId="resume" version={1} details={details} profileInput={RESUME_WEBSITE_EXAMPLE} onUseCopy={apply}/>);
 const button=await screen.findByRole("button",{name:"applyCopy"});expect(apply).not.toHaveBeenCalled();fireEvent.click(button);
 if(matching)await waitFor(()=>expect(apply).toHaveBeenCalledWith(copy));else{expect(await screen.findByRole("alert")).toHaveTextContent("copyMismatch");expect(apply).not.toHaveBeenCalled();}
 expect(m.request.mock.calls.filter(x=>x[1]==="POST")).toHaveLength(0);
});

it("rejects copy generated for older facts even when the name and project titles match",async()=>{
 const apply=vi.fn();m.request.mockResolvedValue({runs:[{id:"old",status:"SUCCEEDED",inputFingerprint:createHash("sha256").update(stableWorkflowInput({profile:RESUME_WEBSITE_EXAMPLE})).digest("hex"),costPoints:2,output:artifact(),error:null,createdAt:"2026-10-13T00:00:00Z"}]});
 render(<MarketWorkflowRun listingId="resume" version={1} details={details} profileInput={{...RESUME_WEBSITE_EXAMPLE,about:"Updated experience"}} onUseCopy={apply}/>);
 fireEvent.click(await screen.findByRole("button",{name:"applyCopy"}));
 expect(await screen.findByRole("alert")).toHaveTextContent("copyMismatch");expect(apply).not.toHaveBeenCalled();
});


it.each(["leading-name", "trailing-name", "leading-project", "trailing-project"])("adopts paid copy for the same normalized profile (%s)", async variant => {
 const profile = { ...RESUME_WEBSITE_EXAMPLE, fullName: variant === "leading-name" ? `  ${RESUME_WEBSITE_EXAMPLE.fullName}` : variant === "trailing-name" ? `${RESUME_WEBSITE_EXAMPLE.fullName}  ` : RESUME_WEBSITE_EXAMPLE.fullName, projects: RESUME_WEBSITE_EXAMPLE.projects.map((project, index) => ({ ...project, name: index === 0 && variant === "leading-project" ? `  ${project.name}` : index === 0 && variant === "trailing-project" ? `${project.name}  ` : project.name })) };
 const normalized = resumeWebsiteInputSchema.parse(profile), apply = vi.fn();
 m.request.mockResolvedValue({ runs: [{ id: "normalized-run", status: "SUCCEEDED", inputFingerprint: createHash("sha256").update(stableWorkflowInput({ profile: normalized })).digest("hex"), costPoints: 2, output: { kind: "resume-website", mediaType: "text/html", content: renderResumeWebsite(normalized, copy) }, error: null, createdAt: "2026-10-13T00:00:00Z" }] });
 render(<MarketWorkflowRun listingId="resume" version={1} details={details} profileInput={profile} onUseCopy={apply} />);
 fireEvent.click(await screen.findByRole("button", { name: "applyCopy" }));
 await waitFor(() => expect(apply).toHaveBeenCalledExactlyOnceWith(copy));
 expect(screen.queryByRole("alert")).toBeNull();
 expect(m.request.mock.calls.filter(call => call[1] === "POST")).toHaveLength(0);
});

it("rejects an old result if personal facts change while its digest is pending", async () => {
 let releaseDigest: (() => void) | undefined;
 const blocked = new Promise<void>(resolve => { releaseDigest = resolve; });
 const digest = vi.fn(async (algorithm: AlgorithmIdentifier, data: BufferSource) => { await blocked; return webcrypto.subtle.digest(algorithm, data as Parameters<typeof webcrypto.subtle.digest>[1]); });
 vi.stubGlobal("crypto", { subtle: { digest } });
 const apply = vi.fn();
 m.request.mockResolvedValue({ runs: [{ id: "pending-copy", status: "SUCCEEDED", inputFingerprint: createHash("sha256").update(stableWorkflowInput({ profile: RESUME_WEBSITE_EXAMPLE })).digest("hex"), costPoints: 2, output: artifact(), error: null, createdAt: "2026-10-13T00:00:00Z" }] });
 const view = render(<MarketWorkflowRun listingId="resume" version={1} details={details} profileInput={RESUME_WEBSITE_EXAMPLE} onUseCopy={apply} />);
 fireEvent.click(await screen.findByRole("button", { name: "applyCopy" }));
 expect(digest).toHaveBeenCalledTimes(1);
 view.rerender(<MarketWorkflowRun listingId="resume" version={1} details={details} profileInput={{ ...RESUME_WEBSITE_EXAMPLE, about: "New facts entered during digest" }} onUseCopy={apply} />);
 await act(async () => { releaseDigest!(); await blocked; });
 expect(await screen.findByRole("alert")).toHaveTextContent("copyMismatch");
 expect(apply).not.toHaveBeenCalled();
 expect(m.request.mock.calls.filter(call => call[1] === "POST")).toHaveLength(0);
});
