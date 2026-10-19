import type {ShootSettings} from './shoot-contract';
export function draftChanged(local:ShootSettings,base:ShootSettings){return JSON.stringify(local)!==JSON.stringify(base);}
// Keep only fields actually changed in this window; untouched remote fields stay current.
export function mergeDraft(base:ShootSettings,local:ShootSettings,remote:ShootSettings):ShootSettings {
 const merged={...remote};
 for(const key of Object.keys(local) as (keyof ShootSettings)[])if(JSON.stringify(local[key])!==JSON.stringify(base[key]))Object.assign(merged,{[key]:local[key]});
 const shotNotes={...remote.shotNotes};
 for(const shot of [...new Set([...Object.keys(base.shotNotes),...Object.keys(local.shotNotes)])] as (keyof ShootSettings['shotNotes'])[]){
  if(local.shotNotes[shot]!==base.shotNotes[shot]){if(local.shotNotes[shot]===undefined)delete shotNotes[shot];else shotNotes[shot]=local.shotNotes[shot];}
 }
 merged.shotNotes=shotNotes;
 if(base.story&&!local.story)delete merged.story;
 return merged;
}

