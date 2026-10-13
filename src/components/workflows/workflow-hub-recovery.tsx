"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { WorkflowHubCommand,WorkflowHubSlug } from "@/contracts/workflow-hubs";
export interface HubRecovery{hubSlug:WorkflowHubSlug|"";reason:string;basisVersionId:string|null;pending:WorkflowHubCommand|null}
let actor:string|null=null;const values=new Map<string,HubRecovery>();
export function syncHubActor(value:string|null){if(value!==actor||!value)values.clear();actor=value;}
export const isHubActor=(id:string)=>actor===id;
export function readHubRecovery(id:string,slug:string){return actor===id?values.get(JSON.stringify([id,slug])):undefined;}
export function writeHubRecovery(id:string,slug:string,value:HubRecovery){if(actor===id)values.set(JSON.stringify([id,slug]),value);}
export function WorkflowHubSessionBoundary(){const{data,status}=useSession();useEffect(()=>{if(status!=="loading")syncHubActor(status==="authenticated"?data?.user?.id??null:null);},[data?.user?.id,status]);return null;}
