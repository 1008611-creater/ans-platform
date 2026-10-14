import sharp from "sharp";
import { FOUR_VIEW_ORDER, FOUR_VIEW_SIZES, type FourViewInput } from "@/contracts/four-view";
import { VisualPortfolioError } from "./errors";
/** User-authorized quadrant cropping only: never resize, trim, recolor or redraw. */
export async function cropFourViewGrid(bytes:Uint8Array,ratio:FourViewInput["aspectRatio"]) {
 if(!bytes.length||bytes.length>40_000_000)throw new VisualPortfolioError("GRID_TOO_LARGE",413);
 const image=sharp(bytes,{limitInputPixels:17_000_000});
 let meta;try{meta=await image.metadata();}catch{throw new VisualPortfolioError("INVALID_IMAGE",400);}
 const [width,height]=FOUR_VIEW_SIZES[ratio];
 if(meta.width!==width||meta.height!==height||(meta.pages??1)!==1||!["png","jpeg","webp"].includes(meta.format??"")||(meta.orientation??1)!==1)throw new VisualPortfolioError("GRID_DIMENSIONS_INVALID",422);
 const views=await Promise.all(FOUR_VIEW_ORDER.map(async(name,index)=>({name,bytes:await image.clone().extract({left:index%2*(width/2),top:Math.floor(index/2)*(height/2),width:width/2,height:height/2}).png().toBuffer()})));
 if(views.some(view=>view.bytes.length>20_000_000))throw new VisualPortfolioError("GRID_TOO_LARGE",413);
 return views;
}
