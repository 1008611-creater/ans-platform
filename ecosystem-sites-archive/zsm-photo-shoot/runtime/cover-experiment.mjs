// Operator experiment only. No public recipe or generation capability is changed.
export const COVER_EXPERIMENT = Object.freeze({
 id: 'caibao-bund-controlled-v1',
 parentResultId: '4826e98b-7d69-407a-92d6-5991b492c51e',
 applicability: 'Local revision of this approved-source Caibao + Naiwa + Bund cover only; not validated for other identities, poses or locations.',
 inputContract: ['identity-original-bytes','previous-cover-original-bytes','character-original-bytes','location-original-bytes'],
 outputContract: {model:'gpt-image-2.5-sunburst',quality:'high',size:'1024x1536',n:1,automaticRetries:0},
 failureCriteria: ['identity drift outside requested edit','character no longer matches reference','unrequested framing or pose changes','floating feet or missing contact shadow','material still fuzzy after material edit','implausible scene light','wrong image dimensions','unknown upstream status'],
 validation: {successfulSamplesPerFactor:1,independentReproductionVerified:false,humanApprovalVerified:false,productionPromoted:false,record:'.scratch/delivery-evidence/controlled-v1-evaluation.json'},
 factors: {
  material: {label:'仅改奶蛙表面材质', instruction:'Change ONLY the yellow surface material of the character in image 2. Replace the visible fine fuzz with a continuous, clean, smooth matte CGI surface matching image 3. Broad soft diffuse gradients and subtle continuous highlights, with no individual fibers, velvet, felt, cloth weave, seams, stippling or grain on its yellow skin. Preserve the existing silhouette, eye size and spacing, olive eye rims, small closed smile, hands and pose exactly. Do not make it shiny plastic or a stuffed toy. Preserve the existing lighting direction and colors; this is a material substitution only.'},
  shape: {label:'仅改奶蛙造型比例', instruction:'Change ONLY the geometric proportions of the yellow character in image 2 to match image 3. Match its continuous oval head-and-body silhouette, ratio of head width to body height, big black eye proportions, pale yellow-green eye rims, eye spacing, thin closed curved smile, short arms and short separate legs. Image 3 is the exact character geometry authority. Preserve the pose and V-sign gesture from image 2, subject placement and apparent height. Preserve the yellow surface material and lighting of image 2 unchanged; do not correct its fuzz in this experiment. No tongue, teeth, blush, brows or horns. Do not change the human.'},
  identity: {label:'仅改蔡宝面部相似度', instruction:'Change ONLY the human facial identity inside the existing head outline of image 2, using image 1 as the sole identity authority. Match the original eye shape and relaxed eyelids, eye spacing, brow shape, nose, naturally full cheeks, mouth and chin without beautification or slimming. Keep the same head position, gaze, facial expression, hair outline and body from image 2. Preserve the existing skin exposure and scene illumination. Do not sharpen skin artificially or invent exaggerated pores. Do not change the character, its material or geometry, the background, clothes, hands or camera.'},
  light: {label:'仅改现场光影融合', instruction:'Change ONLY the incident light, shading and contact shadows of the two foreground subjects in image 2. Match the blue-hour Bund environment in that same image: soft cool skylight from above, modest warm spill from the visible streetlamp on the left, faint river and city light reflected from the right. Keep plausible falloff, natural skin color, detail in the black shirt, and gentle shared occlusion at the human hand touching the character and at their contact with the ground. Preserve the background exposure and skyline pixels as closely as possible. Preserve all facial identity, anatomy, poses, geometry and surface materials, including the existing character texture. No added flash, beauty light, studio rim light, glow or dramatic relighting.'}
 }
});
export function compileCoverExperiment(factor) {
 const selected=COVER_EXPERIMENT.factors[factor]; if(!selected)throw Error('UNKNOWN_FACTOR');
 return [
  'Intent: Edit image 2, the existing single vertical Bund cover photo. This is one controlled local edit to the supplied photograph, not a new composition.',
  'Subject: Exactly one photographed human (Caibao) and one yellow Naiwa CGI character. Input order and responsibilities: image 1 identifies the human ONLY; image 2 is the photograph being edited and locks all existing content; image 3 defines the character ONLY; image 4 supplies Bund landmark geometry ONLY. Do not import background, captions, speech bubbles, playback icons or poses from reference images 1, 3 or 4.',
  'Composition: Preserve the framing, camera position, perspective, skyline layout, railing, river, subject placement, clothing and gestures from image 2. Single photograph, portrait 2:3, exactly 1024 x 1536.',
  'Text: No added text, captions, speech bubbles, labels, UI or watermark.',
  'Style: Preserve the photographic medium of image 2 and the contrast between a photographed human and an animated CGI character integrated in that scene. '+selected.instruction,
  'Constraints: Edit only the specified variable. Preserve every other visible attribute from image 2, including unaffected identity, geometry, surface material and illumination. No extra people or characters, no collage, no redesigned location. Deliver one edited photo, not a before/after comparison.'
 ].join('\n\n');
}
const allowedHeaders=['x-request-id','request-id','x-correlation-id','cf-ray','retry-after','server'];
export function diagnosticHeaders(headers) {
 return Object.fromEntries(allowedHeaders.map(k=>[k,headers.get(k)]).filter(([,v])=>v&&/^[a-zA-Z0-9_.:/ ,;-]{1,180}$/.test(v)));
}
export function diagnosticError(error) {
 if(!error)return {};
 const message=typeof error.message==='string'?error.message:'';
 const signals=['upstream','timeout','timed out','overload','capacity','unavailable','connection','gateway','rate limit','internal','502','503','504','quota','balance','invalid','unsupported'].filter(s=>message.toLowerCase().includes(s));
 const tag=v=>typeof v==='string'&&/^[a-zA-Z0-9_.-]{1,100}$/.test(v)?v:null;
 // Never persist free-form upstream messages: they can echo credentials or input data.
 return {errorType:tag(error.type),errorCode:tag(error.code),errorMessageSignals:signals,errorMessageLength:message.length};
}