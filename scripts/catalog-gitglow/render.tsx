import fs from 'node:fs';
import path from 'node:path';

import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import sharp from 'sharp';
import {setCover} from './runtime';
import PerspectiveStack from './templates/PerspectiveStack';
import AngledCanvas from './templates/AngledCanvas';
import FloatingLayers from './templates/FloatingLayers';
import GlowSpotlight from './templates/GlowSpotlight';
import MinimalSlate from './templates/MinimalSlate';
import SplitGradient from './templates/SplitGradient';
interface CoverInput {slug:string;template:string;titleMain:string;titleAccent:string;themeColor:string;theme:string;category:string;label:string;image:string|null;imageSecondary:string|null;sourceUrl:string;sourceKind:string;summary:string;}
const templates:Record<string,React.ComponentType>={'perspective-stack':PerspectiveStack,'angled-canvas':AngledCanvas,'floating-layers':FloatingLayers,'glow-spotlight':GlowSpotlight,'minimal-slate':MinimalSlate,'split-gradient':SplitGradient};
async function main(){
const inputFile=path.resolve(process.argv[2]);const inputRoot=path.dirname(inputFile);const out=path.resolve(process.argv[3]||'public/catalog/gitglow-v1');
fs.mkdirSync(out,{recursive:true});const htmlDir=path.join(inputRoot,'rendered-html');fs.mkdirSync(htmlDir,{recursive:true});
const jobs:CoverInput[]=JSON.parse(fs.readFileSync(inputFile,'utf8'));
const scriptDir=path.resolve('scripts/catalog-gitglow');
const css=(await postcss([tailwind({base:scriptDir})]).process(fs.readFileSync(path.join(scriptDir,'styles.css'),'utf8'),{from:path.join(scriptDir,'styles.css')})).css;
const localImage=async(file:string|null)=>{
 if(!file)return undefined;
 const normalized=await sharp(path.resolve(inputRoot,file),{animated:false}).resize({width:1600,height:1000,fit:'inside',withoutEnlargement:true}).webp({quality:94}).toBuffer();
 return 'data:image/webp;base64,'+normalized.toString('base64');
};
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const receipts=[];
 for(const job of jobs){
  let image=await localImage(job.image);const imageSecondary=await localImage(job.imageSecondary);
  if(!image && !['niannian-agent','niannian-edit'].includes(job.slug)){
   const repo=job.sourceUrl.replace(/^https:\/\//,'').replace(/\/$/,'');
   const source=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="740"><rect width="1200" height="740" fill="#142328"/><circle cx="1120" cy="100" r="360" fill="${job.themeColor}" opacity=".12"/><g font-family="Microsoft YaHei,Segoe UI,sans-serif"><text x="80" y="100" font-size="23" fill="#b7cabb">PROJECT / ${escape(job.category)}</text><text x="80" y="260" font-size="82" font-weight="700" fill="#edf1e9">${escape(job.titleMain)}</text><text x="80" y="360" font-size="62" font-weight="600" fill="${job.themeColor}">${escape(job.titleAccent)}</text><text x="80" y="490" font-size="26" fill="#c8d9cd">${escape(job.summary.slice(0,35))}</text><text x="80" y="650" font-size="20" fill="${job.themeColor}">${escape(repo)}</text></g></svg>`;
   image='data:image/svg+xml;base64,'+Buffer.from(source).toString('base64');
  }
  setCover({category:job.category,label:job.label,titleMain:job.titleMain,titleAccent:job.titleAccent,themeColor:job.themeColor,image:image||'',imageSecondary:imageSecondary||image||'',icons:[]});
  const Component=templates[job.template];if(!Component)throw new Error('Unknown template '+job.template);
  const isBrand=job.template==='minimal-slate'&&['ollama','reactive-resume','reveal-slides','freecodecamp'].includes(job.slug);
  const long=job.titleMain.length>14?'long-title':'';
  const inner=renderToStaticMarkup(<Component/>);
  const className=`cover ${job.template} ${job.theme==='light'?'light':''} ${isBrand?'brand-asset':''} ${long} ${!job.image?'typography-only':''}`;
  const html=`<!doctype html><html lang="zh"><meta charset="utf-8"><title>${escape(job.titleMain+' '+job.titleAccent)}</title><style>${css}</style><main class="${className}" style="--accent:${job.themeColor}">${inner}</main></html>`;
  fs.writeFileSync(path.join(htmlDir,job.slug+'.html'),html);

  receipts.push({slug:job.slug,htmlFile:job.slug+'.html',template:job.template,stage:'html-generated'});
  console.log(JSON.stringify({slug:job.slug,template:job.template}));
 }
 fs.writeFileSync(path.join(inputRoot,'html-generation.json'),JSON.stringify(receipts,null,2));
 fs.copyFileSync(path.join(scriptDir,'LICENSE.gitglow'),path.join(out,'LICENSE.gitglow'));
 const cards=jobs.map(j=>`<figure><img src="/covers/${j.slug}.webp" alt="${escape(j.titleMain)}"><figcaption>${escape(j.titleMain+' '+j.titleAccent)} · ${j.template}</figcaption></figure>`).join('');
 fs.writeFileSync(path.join(inputRoot,'review.html'),`<!doctype html><html lang="zh"><meta charset="utf-8"><title>ANS GitGlow 封面审查</title><style>body{background:#edf0e7;color:#263b31;font-family:system-ui;margin:32px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}figure{margin:0}img{width:100%;border-radius:18px;box-shadow:0 6px 18px #203a3110}figcaption{padding:10px 0;font-size:12px}@media(max-width:600px){body{margin:16px}.grid{grid-template-columns:1fr}}</style><h1>ANS · 项目封面</h1><div class="grid">${cards}</div></html>`);

}
main().catch(error=>{console.error(error);process.exitCode=1;});


