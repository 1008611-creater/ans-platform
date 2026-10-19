import type { ShootSettings } from '../app/lib/shoot-contract';
export function builtinReference(s:ShootSettings,role:'companion'|'location',root?:string):{buffer:Buffer;metadata:{builtin:boolean;source:string;rights:string}};
