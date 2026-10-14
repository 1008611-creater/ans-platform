import {act,cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {NextIntlClientProvider} from "next-intl";
import {afterEach,describe,expect,it,vi} from "vitest";
import messages from "../../../messages/visual-generation/en.json";
import {VisualModelPreview} from "@/components/projects/visual-model-preview";
vi.mock("next-intl",async original=>await original<typeof import("next-intl")>());
const mocked=vi.hoisted(()=>({request:vi.fn()}));
vi.mock("@/components/marketplace/account-boundary",()=>({useMarketRequest:()=>mocked.request}));
const asset={id:"442be0b3-ddea-4bf7-a340-94490b67fb35",sha256:"a".repeat(64),size:100};
function viewerMessage(source:Window|null){const event=new Event("message");Object.defineProperties(event,{source:{value:source},data:{value:{channel:"ans-visual-scene",type:"failed"}}});return event;}
function mount(){return render(<NextIntlClientProvider locale="en" messages={{visualGeneration:messages}}><VisualModelPreview asset={asset} onClose={vi.fn()}/></NextIntlClientProvider>);}
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.clearAllMocks();});
describe("isolated generated model preview",()=>{
 it("only accepts viewer failures from its own frame and supports retry",async()=>{
  const listen=vi.spyOn(window,"addEventListener");
  mocked.request.mockResolvedValue({url:"/api/visual-model-assets/fixture/file?token=synthetic"});mount();
  const frame=await screen.findByTitle(messages.preview) as HTMLIFrameElement;
  const doc=new DOMParser().parseFromString(frame.srcdoc,"text/html");
  expect(JSON.parse(doc.getElementById("site-config")!.textContent!).tour.fitModel).toBe(true);
  expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
  await waitFor(()=>expect(listen.mock.calls.some(call=>call[0]==="message")).toBe(true));
  fireEvent(window,viewerMessage(window));
  expect(frame).toBeInTheDocument();
  const receiver=listen.mock.calls.find(call=>call[0]==="message")![1] as (event:Event)=>void;
  act(()=>receiver(viewerMessage(frame.contentWindow)));
  await screen.findByText(messages.previewFailed);expect(screen.queryByTitle(messages.preview)).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:messages.refreshPreview}));
  await waitFor(()=>expect(mocked.request).toHaveBeenCalledTimes(2));await screen.findByTitle(messages.preview);
 });
 it("refuses a private model access URL on another origin",async()=>{
  mocked.request.mockResolvedValue({url:"https://untrusted.example.invalid/model.glb"});mount();
  await screen.findByText(messages.previewFailed);expect(screen.queryByTitle(messages.preview)).toBeNull();
 });
});
