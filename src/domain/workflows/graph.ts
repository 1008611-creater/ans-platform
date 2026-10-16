import type {
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowValidationIssue,
  WorkflowValidationResult,
} from "@/contracts/workflow";

function addEdge(adjacency: Map<string, Set<string>>, edge: WorkflowEdge) {
  const targets = adjacency.get(edge.from) ?? new Set<string>();
  targets.add(edge.to);
  adjacency.set(edge.from, targets);
}

export function validateWorkflow(
  definition: WorkflowDefinition,
): WorkflowValidationResult {
  const issues: WorkflowValidationIssue[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const adjacency = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();

  if (definition.nodes.length > definition.maxNodes) {
    issues.push({
      code: "node_limit",
      message: `Workflow contains ${definition.nodes.length} nodes; maximum is ${definition.maxNodes}.`,
      path: "nodes",
    });
  }

  for (const node of definition.nodes) {
    if (nodeIds.has(node.id)) {
      issues.push({
        code: "duplicate_node",
        message: `Node id '${node.id}' is duplicated.`,
        path: `nodes.${node.id}`,
      });
    }
    nodeIds.add(node.id);
    indegree.set(node.id, 0);
  }

  for (const edge of definition.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({
        code: "duplicate_edge",
        message: `Edge id '${edge.id}' is duplicated.`,
        path: `edges.${edge.id}`,
      });
      continue;
    }
    edgeIds.add(edge.id);

    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      issues.push({
        code: "unknown_node",
        message: `Edge '${edge.id}' references a node that does not exist.`,
        path: `edges.${edge.id}`,
      });
      continue;
    }
    if (edge.from === edge.to) {
      issues.push({
        code: "self_reference",
        message: `Node '${edge.from}' cannot reference itself.`,
        path: `edges.${edge.id}`,
      });
      continue;
    }

    addEdge(adjacency, edge);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }

  const queue = [...indegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([id]) => id)
    .sort();
  const executionOrder: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    executionOrder.push(current);
    for (const target of adjacency.get(current) ?? []) {
      const nextDegree = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, nextDegree);
      if (nextDegree === 0) {
        queue.push(target);
        queue.sort();
      }
    }
  }

  if (executionOrder.length !== nodeIds.size) {
    issues.push({
      code: "cycle",
      message: "Workflow contains a cycle and cannot be executed safely.",
      path: "edges",
    });
  }

  if (definition.experience) {
    const seenStages = new Set<string>();
    const assignments = new Map<string, number>();
    const issue = (message: string) => issues.push({ code: "invalid_experience", message, path: "experience.stages" });
    definition.experience.stages.forEach((stage, index) => {
      if (seenStages.has(stage.id)) issue(`Stage '${stage.id}' is duplicated.`);
      seenStages.add(stage.id);
      for (const id of stage.nodeIds) {
        if (!nodeIds.has(id)) issue(`Stage '${stage.id}' references unknown node '${id}'.`);
        if (assignments.has(id)) issue(`Node '${id}' belongs to more than one stage.`);
        assignments.set(id, index);
      }
    });
    for (const id of nodeIds) if (!assignments.has(id)) issue(`Node '${id}' must belong to a stage.`);
    for (const edge of definition.edges) {
      const from = assignments.get(edge.from), to = assignments.get(edge.to);
      if (from !== undefined && to !== undefined && from > to) issue(`Stage order contradicts edge '${edge.id}'.`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    executionOrder: issues.some((issue) => issue.code === "cycle")
      ? []
      : executionOrder,
  };
}
