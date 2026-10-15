import type { WorkflowDefinition, WorkflowExperience } from "@/contracts/workflow";
import { validateWorkflow } from "./graph";

/** Display follows the validated engine graph. No additional execution semantics. */
export function workflowExperience(definition: WorkflowDefinition): WorkflowExperience {
  if (definition.experience) return definition.experience;
  const order = validateWorkflow(definition).executionOrder;
  const nodes = order.map(id => definition.nodes.find(node => node.id === id)!);
  return {
    version: 1,
    output: { label: nodes.at(-1)?.label ?? "Result", format: "text" },
    stages: nodes.map(node => ({ id: node.id, title: node.label, nodeIds: [node.id] })),
  };
}

/** Only the public display subset; never config, prompts or moderation details. */
export function workflowPresentation(definition: WorkflowDefinition) {
  const experience = workflowExperience(definition);
  return {
    output: experience.output,
    stages: experience.stages.map(stage => ({ title: stage.title })),
    nodeCount: definition.nodes.length,
  };
}
export type WorkflowPresentation = ReturnType<typeof workflowPresentation>;
