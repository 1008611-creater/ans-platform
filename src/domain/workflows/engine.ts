import {
  workflowDefinitionSchema,
  type WorkflowDefinition,
} from "@/contracts/workflow";
import { validateWorkflow } from "./graph";

export class WorkflowValidationError extends Error {
  constructor(public readonly issues: ReturnType<typeof validateWorkflow>["issues"]) {
    super("Workflow definition is invalid.");
    this.name = "WorkflowValidationError";
  }
}

export function createExecutionPlan(input: unknown) {
  const definition: WorkflowDefinition = workflowDefinitionSchema.parse(input);
  const validation = validateWorkflow(definition);
  if (!validation.ok) {
    throw new WorkflowValidationError(validation.issues);
  }

  const nodesById = new Map(definition.nodes.map((node) => [node.id, node]));
  return {
    definition,
    order: validation.executionOrder,
    nodes: validation.executionOrder.map((id) => nodesById.get(id)! ),
  };
}

