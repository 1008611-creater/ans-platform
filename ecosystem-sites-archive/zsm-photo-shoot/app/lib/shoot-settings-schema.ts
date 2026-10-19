import {z} from 'zod';
import {PLACES} from '@/runtime/destinations.mjs';
import {STORIES} from '@/runtime/stories.mjs';
const text=(max:number)=>z.string().trim().max(max);
const story=z.object({id:z.string().max(40).refine(id=>STORIES.some(s=>s.id===id)),version:z.literal(1),energy:z.enum(['chill','playful','wild']),camera:z.enum(['candid','flash','editorial']),relationship:z.enum(['friends','i-care','it-cares'])}).strict();
export const shootSettingsSchema=z.object({story:story.optional(),placeId:z.string().max(40).refine(id=>PLACES.some(p=>p.id===id)).optional(),play:z.enum(['frog','companion','solo']).optional(),characterId:z.string().max(40).optional(),title:text(60).min(1),direction:z.enum(['coast','oldtown','alpine']),format:z.enum(['portrait','landscape','square']),outfit:text(300).min(1),idea:text(500),locked:z.array(z.enum(['人物身份','服装','色调与光线'])).min(1).max(3),allowedChanges:z.array(z.enum(['场景','动作','镜头距离'])).min(1).max(3),shotNotes:z.partialRecord(z.enum(['cover','place','portrait','motion','pause','detail']),text(240))}).strict();
