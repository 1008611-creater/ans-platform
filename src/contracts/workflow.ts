import { z } from "zod";

export const workflowNodeTypeSchema = z.enum([
  "prompt",
  "template",
  "model",
  "condition",
  "output",
]);

export const workflowNodeSchema = z.object({
  id: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/),
  type: workflowNodeTypeSchema,
  label: z.string().trim().min(1).max(120),
  config: z.record(z.string(), z.unknown()).default({}),
  timeoutMs: z.number().int().min(100).max(120_000).default(30_000),
  maxRetries: z.number().int().min(0).max(3).default(1),
});

export const workflowEdgeSchema = z.object({
  id: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/),
  from: z.string().min(1),
  to: z.string().min(1),
  mapping: z.record(z.string(), z.string()).default({}),
});

export const workflowExperienceSchema = z.object({
  version: z.literal(1),
  output: z.object({
    label: z.string().trim().min(1).max(120),
    format: z.enum(["text", "markdown", "json"]).default("markdown"),
  }).strict(),
  stages: z.array(z.object({
    id: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(240).optional(),
    nodeIds: z.array(z.string().min(1).max(64)).min(1).max(50),
  }).strict()).min(1).max(50),
  sourceProjectSlug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,95}$/).optional(),
}).strict();

export type WorkflowExperience = z.infer<typeof workflowExperienceSchema>;

export const workflowDefinitionSchema = z.object({
  experience: workflowExperienceSchema.optional(),
  recipe: z.literal("resume-website-v1").optional(),
  version: z.literal(1),
  maxNodes: z.number().int().min(1).max(50).default(20),
  nodes: z.array(workflowNodeSchema).min(1).max(50),
  edges: z.array(workflowEdgeSchema).max(200),
});

export const workflowCreateInputSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{2,63}$/),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(240).optional(),
  description: z.string().trim().max(10_000).optional(),
  estimatedCost: z.number().int().min(1).max(200).default(1),
  definition: workflowDefinitionSchema,
});

export type WorkflowCreateInput = z.infer<typeof workflowCreateInputSchema>;

export const workflowVersionInputSchema = z.object({
  definition: workflowDefinitionSchema,
});

export const workflowRunInputSchema = z.object({
  input: z.record(z.string(), z.unknown()).default({}),
  idempotencyKey: z.string().trim().min(8).max(160).optional(),
});

export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type WorkflowNodeType = z.infer<typeof workflowNodeTypeSchema>;
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;

export type WorkflowValidationIssue = {
  code:
    | "duplicate_node"
    | "unknown_node"
    | "duplicate_edge"
    | "self_reference"
    | "cycle"
    | "node_limit"
    | "invalid_experience";
  message: string;
  path?: string;
};

export type WorkflowValidationResult = {
  ok: boolean;
  issues: WorkflowValidationIssue[];
  executionOrder: string[];
};
