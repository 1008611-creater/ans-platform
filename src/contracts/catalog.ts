import { z } from "zod";
import { officialWorkflowIds } from "./projects";
import { RESUME_WEBSITE_WORKFLOW_ID } from "./resume-website";
export const catalogWorkflowIdSchema = z.enum([...officialWorkflowIds, RESUME_WEBSITE_WORKFLOW_ID]);
export type CatalogWorkflowId = z.infer<typeof catalogWorkflowIdSchema>;
