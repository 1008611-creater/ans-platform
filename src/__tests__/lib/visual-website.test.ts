import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DEFAULT_APPEARANCE, visualWebsiteSchema, visualWebsiteDraftSchema } from "@/contracts/visual-website";
import { RESUME_WEBSITE_EXAMPLE } from "@/domain/projects/resume-website";
import { renderVisualWebsite } from "@/lib/projects/visual-website";
import { createVisualTour } from "@/lib/projects/visual-tour";
import { VISUAL_SCENE_SCRIPT } from "@/domain/projects/visual-scene";
const profile = structuredClone(RESUME_WEBSITE_EXAMPLE);
describe("independent interactive portfolio export", () => {
 it("contains all four readable sections and an executable self-contained renderer", () => {
  const html = renderVisualWebsite(profile, { ...DEFAULT_APPEARANCE, avatar: "clay" });
  const dom = new DOMParser().parseFromString(html,"text/html");
  expect(dom.querySelectorAll("[data-panel]")).toHaveLength(4);
  expect(dom.querySelectorAll("[data-stop]")).toHaveLength(4);
  expect(dom.querySelectorAll("canvas")).toHaveLength(1);
  expect(dom.querySelectorAll("script[src],link[href],img[src],iframe")).toHaveLength(0);
  expect(()=>new Function(VISUAL_SCENE_SCRIPT)).not.toThrow();
  expect(html).toContain("prefers-reduced-motion");
 });
 it("keeps malicious user text as text without adding executable nodes", () => {
  const attack = '</section><script>alert("private")</script>';
  const html = renderVisualWebsite({...profile,fullName:attack,about:attack,projects:[{name:attack,role:attack,description:attack,url:"javascript:alert(1)"}],contactUrl:"data:text/html,<script>alert(1)</script>"}, { ...DEFAULT_APPEARANCE, avatar: "clay" });
  const dom = new DOMParser().parseFromString(html,"text/html");
  expect(dom.querySelectorAll("script")).toHaveLength(2);
  expect(dom.querySelector("h1")?.textContent).toContain(attack);
  expect(dom.querySelector("a[href^='javascript:'],a[href^='data:']")).toBeNull();
 });
 it("escapes editable node titles in navigation as well as content",()=>{
  const tour=createVisualTour(profile),attack='</button><script>alert(1)</script><img src=x onerror=alert(1)>';
  tour.nodes[0].title=attack;
  const dom=new DOMParser().parseFromString(renderVisualWebsite(profile,{...DEFAULT_APPEARANCE,tour}),"text/html");
  expect(dom.querySelectorAll("img,script")).toHaveLength(3);
  expect(dom.querySelectorAll("img")).toHaveLength(0);
  expect(dom.querySelector('[data-stop="1"]')?.textContent).toContain(attack);
 });
 it("validates imported editable documents and refuses executable URLs and unexpected fields", () => {
  const doc={format:"ans-visual-website",version:1,profile,appearance:DEFAULT_APPEARANCE};
  expect(visualWebsiteSchema.safeParse(doc).success).toBe(true);
  expect(visualWebsiteSchema.safeParse({...doc,profile:{...profile,contactUrl:"javascript:alert(1)"}}).success).toBe(false);
  expect(visualWebsiteSchema.safeParse({...doc,appearance:{...DEFAULT_APPEARANCE,script:"evil"}}).success).toBe(false);
  expect(visualWebsiteSchema.safeParse({...doc,appearance:{...DEFAULT_APPEARANCE,stops:[]}}).success).toBe(false);
 });
 it("preserves unfinished facts in editable files while requiring completed output", () => {
  const draft = {format:"ans-visual-website",version:1,profile:{...profile,fullName:"",headline:"",about:"",projects:[{name:"",role:"",description:"",url:""}]},appearance:DEFAULT_APPEARANCE};
  expect(visualWebsiteDraftSchema.safeParse(draft).success).toBe(true);
  expect(visualWebsiteSchema.safeParse(draft).success).toBe(false);
  expect(visualWebsiteDraftSchema.safeParse({...draft,profile:{...draft.profile,contactUrl:"javascript:alert(1)"}}).success).toBe(false);
  expect(visualWebsiteDraftSchema.safeParse({...draft,profile:{...draft.profile,fullName:"x".repeat(81)}}).success).toBe(false);
 });
 it("allows incomplete editable links without accepting executable schemes",()=>{
  const doc={format:"ans-visual-website",version:1,profile,appearance:{...DEFAULT_APPEARANCE,tour:createVisualTour(profile)}};
  for(const url of ["https://","example.",""])expect(visualWebsiteDraftSchema.safeParse({...doc,profile:{...profile,contactUrl:url}}).success).toBe(true);
  for(const url of ["javascript:alert(1)","java\nscript:alert(1)","data:text/html,evil","vbscript:evil"]){
   const tour=structuredClone(doc.appearance.tour);tour.nodes[0].url=url;
   expect(visualWebsiteDraftSchema.safeParse({...doc,appearance:{...doc.appearance,tour}}).success).toBe(false);
  }
 });
 it("packages the detailed GLB and every runtime module into a standalone export",()=>{
  const vendor="public/mascot/3d/vendor/";
  const assets={core:readFileSync(vendor+"three.core.js","utf8"),module:readFileSync(vendor+"three.module.js","utf8"),utility:readFileSync(vendor+"BufferGeometryUtils.js","utf8"),loader:readFileSync(vendor+"GLTFLoader.js","utf8"),scene:readFileSync("public/visual-portfolio/scene.mjs","utf8"),model:readFileSync("public/visual-portfolio/reference/banner.glb").toString("base64")};
  const html=renderVisualWebsite({...profile,fullName:'</script><img src=x onerror="alert(1)">'},DEFAULT_APPEARANCE,0,assets);
  const dom=new DOMParser().parseFromString(html,"text/html");
  expect(dom.querySelectorAll("script[src],link[href],img[src],iframe")).toHaveLength(0);
  expect(dom.querySelectorAll("script")).toHaveLength(3);
  expect(JSON.parse(dom.getElementById("site-config")!.textContent!).modelUrl).toMatch(/^data:model\/gltf-binary;base64,/);
  expect(JSON.parse(dom.querySelector('script[type="importmap"]')!.textContent!).imports.three).toMatch(/^data:text\/javascript;base64,/);
  expect(html).not.toContain('/mascot/3d/vendor/GLTFLoader.js');
  expect(dom.querySelector("h1")?.textContent).toContain('</script><img');
 });
 it("applies configured initial camera, background and palette to the downloaded page", () => {
  const dom=new DOMParser().parseFromString(renderVisualWebsite(profile,{...DEFAULT_APPEARANCE,background:"light",palette:"lavender"},2),"text/html");
  expect(dom.body.className).toBe("light");
  expect(dom.querySelector('[data-stop="2"]')?.getAttribute("aria-pressed")).toBe("true");
  expect(JSON.parse(dom.getElementById("site-config")!.textContent!)).toMatchObject({initialStop:2,palette:"lavender"});
 });
});
