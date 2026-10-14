import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { MarketWorkflowRun } from "@/components/marketplace/workflow-run";
import { RESUME_WEBSITE_EXAMPLE, renderResumeWebsite } from "@/domain/projects/resume-website";
const m=vi.hoisted(()=>({request:vi.fn()}));
vi.mock("next-intl",()=>({useTranslations:()=>(key:string)=>key}));
vi.mock("@/components/marketplace/account-boundary",()=>({useMarketActorId:()=>"owner",useMarketRequest:()=>m.request}));
const details={recipe:"resume-website-v1" as const,variables:[],estimatedCost:2,version:1};
const copy={summary:"Reviewed introduction",projects:RESUME_WEBSITE_EXAMPLE.projects.map(()=>({description:"Reviewed project"}))};
const artifact=(name=RESUME_WEBSITE_EXAMPLE.fullName)=>({kind:"resume-website",mediaType:"text/html",content:renderResumeWebsite({...RESUME_WEBSITE_EXAMPLE,fullName:name},copy)});
beforeEach(()=>{vi.clearAllMocks();sessionStorage.clear();m.request.mockResolvedValue({runs:[]});});afterEach(cleanup);
it("invalidates cost acknowledgement when the parent editor changes its personal facts",async()=>{
 const view=render(<MarketWorkflowRun listingId="resume" version={1} details={details} profileInput={RESUME_WEBSITE_EXAMPLE}/>);
 await screen.findByText("noRuns");fireEvent.click(screen.getByRole("checkbox"));expect(screen.getByRole("button",{name:"confirmRun"})).toBeEnabled();
 view.rerender(<MarketWorkflowRun listingId="resume" version={1} details={details} profileInput={{...RESUME_WEBSITE_EXAMPLE,about:"New personal facts"}}/>);
 expect(screen.getByRole("checkbox")).not.toBeChecked();expect(screen.getByRole("button",{name:"confirmRun"})).toBeDisabled();
 fireEvent.submit(screen.getByRole("checkbox").closest("form")!);expect(m.request.mock.calls.filter(x=>x[1]==="POST")).toHaveLength(0);
});
it.each([true,false])("only adopts explicitly selected copy for a matching personal profile (%s)",async matching=>{
 const apply=vi.fn();m.request.mockResolvedValue({runs:[{id:"run",status:"SUCCEEDED",costPoints:2,output:artifact(matching?undefined:"Different creator"),error:null,createdAt:"2026-10-13T00:00:00Z"}]});
 render(<MarketWorkflowRun listingId="resume" version={1} details={details} profileInput={RESUME_WEBSITE_EXAMPLE} onUseCopy={apply}/>);
 const button=await screen.findByRole("button",{name:"applyCopy"});expect(apply).not.toHaveBeenCalled();fireEvent.click(button);
 if(matching)await waitFor(()=>expect(apply).toHaveBeenCalledWith(copy));else{expect(await screen.findByRole("alert")).toHaveTextContent("copyMismatch");expect(apply).not.toHaveBeenCalled();}
 expect(m.request.mock.calls.filter(x=>x[1]==="POST")).toHaveLength(0);
});
