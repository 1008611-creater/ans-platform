import type {StudioStore} from './store.mjs';
import type {ShootProject,ShootReadiness} from '../app/lib/shoot-contract';
export function projectReadiness(store:StudioStore,owner:string,project:ShootProject,env?:Record<string,string|undefined>):ShootReadiness;
