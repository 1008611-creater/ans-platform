import { NextResponse } from "next/server";
import pages from "../../../vibe-hub/special-pages.json";
export function GET(){return NextResponse.json({items:pages,total:pages.length});}
