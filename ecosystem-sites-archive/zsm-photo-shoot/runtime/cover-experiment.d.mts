export const COVER_EXPERIMENT: Readonly<{
 id:string;
 parentResultId:string;
 applicability:string;
 inputContract:string[];
 outputContract:{model:string;quality:string;size:string;n:number;automaticRetries:number};
 failureCriteria:string[];
 validation:{successfulSamplesPerFactor:number;independentReproductionVerified:boolean;humanApprovalVerified:boolean;productionPromoted:boolean;record:string};
 factors:Record<string,{label:string;instruction:string}>;
}>;
export function compileCoverExperiment(factor:string):string;
export function diagnosticHeaders(headers:Headers):Record<string,string>;
export function diagnosticError(error:unknown):{errorType?:string|null;errorCode?:string|null;errorMessageSignals?:string[];errorMessageLength?:number};