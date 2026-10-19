import type { ShootSettings, ShootProject, ShotId } from '../app/lib/shoot-contract';
export const MODEL:string;
export const RECIPE:{id:string;version:string;validation:string;people:number;failures:string[]};
export const DIRECTIONS:Record<ShootSettings['direction'],{name:string;scene:string;light:string;palette:string}>;
export const FORMATS:Record<ShootSettings['format'],{label:string;size:string;width:number;height:number}>;
export const SHOTS:{id:ShotId;name:string;lens:string;description:string;intent:string}[];
export function defaultSettings():ShootSettings;
export function compileShot(project:ShootProject,shotId:ShotId,revisionNote?:string):string;

export function assertCreativeText(settings:ShootSettings,note?:string):void;

export function destinationSettings(placeId?:string,play?:'frog'|'companion'|'solo',characterId?:string):ShootSettings;
export function recipeFor(settings:ShootSettings):typeof RECIPE;

export function storySettings(id:import('../app/lib/shoot-contract').StorySettings['id'],selection?:Partial<Pick<ShootSettings,'placeId'|'characterId'|'story'>>):ShootSettings;
