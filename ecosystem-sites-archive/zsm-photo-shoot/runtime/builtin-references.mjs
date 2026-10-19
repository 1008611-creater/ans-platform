import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { CHARACTER_ARTWORK } from './character-artwork.mjs';
import { characterKey } from './characters.mjs';
import { placeFor } from './destinations.mjs';
import { StudioError } from './store.mjs';
// Public catalog assets only. Never accept a client URL, path, or hash.
export function builtinReference(settings,role,root=process.cwd()) {
 const artwork=role==='companion'?CHARACTER_ARTWORK[characterKey(settings)]:role==='location'?placeFor(settings):null;
 const path=role==='companion'?artwork?.src:artwork?.photo?'/places/'+artwork.photo:null;
 if(!path||!artwork?.sha256)throw new StudioError('BUILTIN_UNAVAILABLE');
 const publicRoot=resolve(root,'public'),file=resolve(publicRoot,'.'+path);
 if(!file.startsWith(publicRoot+sep))throw new StudioError('BUILTIN_UNAVAILABLE');
 const buffer=readFileSync(file);
 if(createHash('sha256').update(buffer).digest('hex')!==artwork.sha256)throw new StudioError('BUILTIN_CHANGED',409);
 return {buffer,metadata:{builtin:true,source:role==='location'?artwork.photoSource:artwork.source,rights:artwork.rights||'pending'}};
}
