// @vitest-environment node
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { FOUR_VIEW_SIZES } from "@/contracts/four-view";
import { cropFourViewGrid } from "@/server/visual-portfolio/four-view-crop";
import { fourViewConfig } from "@/server/visual-portfolio/four-view-jobs";
const original={...process.env};afterEach(()=>{process.env={...original};});
describe("four-view images and readiness",()=>{
 it("uses exact ratios within the documented dimension limits",()=>{for(const [ratio,[w,h]]of Object.entries(FOUR_VIEW_SIZES)){const [a,b]=ratio.split(":").map(Number);expect(w/h).toBe(a/b);expect(w%16+h%16).toBe(0);expect(Math.max(w,h)).toBeLessThanOrEqual(3840);expect(w*h).toBeLessThanOrEqual(8294400);}});
 it("cuts quadrant pixels without rescaling or changing their order",async()=>{
  const colors=["red","green","blue","yellow"];
  const tiles=await Promise.all(colors.map(background=>sharp({create:{width:1440,height:1440,channels:3,background}}).png().toBuffer()));
  const grid=await sharp({create:{width:2880,height:2880,channels:3,background:"black"}}).composite(tiles.map((input,i)=>({input,left:i%2*1440,top:Math.floor(i/2)*1440}))).png().toBuffer();
  const views=await cropFourViewGrid(grid,"1:1");expect(views.map(v=>v.name)).toEqual(["front","back","left","right"]);
  for(const [i,view]of views.entries()){expect(await sharp(view.bytes).metadata()).toMatchObject({width:1440,height:1440});const actual=await sharp(view.bytes).ensureAlpha().raw().toBuffer(),expected=await sharp(tiles[i]).ensureAlpha().raw().toBuffer();expect(actual.equals(expected)).toBe(true);}
 });
 it("refuses incorrect sizes instead of silently stretching a paid output",async()=>{
  const grid=await sharp({create:{width:3840,height:2880,channels:3,background:"gray"}}).png().toBuffer();await expect(cropFourViewGrid(grid,"16:9")).rejects.toThrow("GRID_DIMENSIONS_INVALID");
 });
 it("requires explicit provider verification and a supported pinned model",()=>{
  Object.assign(process.env,{ANS_FOUR_VIEW_ENABLED:"true",ANS_VISUAL_STORAGE_MODE:"local",ANS_VISUAL_WORKER_KEY:"w".repeat(32)});
  expect(fourViewConfig().available).toBe(false);process.env.ANS_FOUR_VIEW_API_CONFIRMED="true";expect(fourViewConfig()).toMatchObject({available:true,costPoints:5,model:"gpt-image-2.5-sunburst-c",channel:"openlux"});process.env.ANS_FOUR_VIEW_MODEL="unknown";expect(fourViewConfig().available).toBe(false);
 });
});
