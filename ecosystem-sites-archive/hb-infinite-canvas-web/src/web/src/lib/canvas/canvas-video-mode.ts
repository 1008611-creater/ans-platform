import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type VideoGenerationMode } from "@/types/canvas";
import { getGenerationResourceNodes, getGroupResourceNodes } from "./canvas-resource-references";

/**
 * 按实际接入的参考图数量推导真正生效的生成模式。
 *
 * 只在「模式与输入冲突」时才纠正，其余情况尊重用户的选择：
 * - 没有图却选了 keyframe / reference → 退回文生视频（否则提交会缺输入）；
 * - 有图却选了 text → 升级，否则参考图会被整包丢弃，连线白连；
 * - 选了 keyframe 却只有一张图 → 降为全能参考（首尾帧需要两张）。
 * 图片数量够且模式能用时（例如 reference + 3 张图），保持不动。
 */
export function resolveVideoModeForInput(mode: string | undefined, referenceCount: number): VideoGenerationMode {
    const requested = mode === "keyframe" || mode === "reference" ? mode : "text";
    if (referenceCount <= 0) return "text";
    if (requested === "keyframe") return referenceCount >= 2 ? "keyframe" : "reference";
    if (requested === "text") return referenceCount >= 2 ? "keyframe" : "reference";
    return "reference";
}

function isUsableImage(node: CanvasNodeData) {
    return node.type === CanvasNodeType.Image && Boolean(node.metadata?.content);
}

function expandGroupNodes(nodes: CanvasNodeData[], all: CanvasNodeData[]) {
    return nodes.flatMap((node) => (node.type === CanvasNodeType.Group ? getGroupResourceNodes(node.id, all) : [node]));
}

/** 统计连到该节点的可用上游图片数量（组节点会展开成组内成员）。 */
export function countUpstreamImages(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    return expandGroupNodes(getGenerationResourceNodes(nodeId, nodes, connections), nodes).filter(isUsableImage).length;
}

/**
 * 连线变化后，重新推导某个视频节点应有的生成模式。
 * 返回 null 表示节点不是视频节点、或模式无需改动。
 */
export function resolveVideoNodeMode(node: CanvasNodeData, nodes: CanvasNodeData[], connections: CanvasConnection[]): VideoGenerationMode | null {
    if (node.type !== CanvasNodeType.Video) return null;
    const current = node.metadata?.videoMode === "keyframe" || node.metadata?.videoMode === "reference" ? node.metadata.videoMode : "text";
    const next = resolveVideoModeForInput(current, countUpstreamImages(node.id, nodes, connections));
    return next === current ? null : next;
}

/**
 * 连线增删后，把受影响的视频节点的模式同步到与输入匹配的值。
 * 只在真的需要改时才返回新数组，避免无谓的重渲染。
 */
export function applyVideoModeUpdates(nodes: CanvasNodeData[], connections: CanvasConnection[], affectedNodeIds: string[]): CanvasNodeData[] {
    if (!affectedNodeIds.length) return nodes;
    let changed = false;
    const next = nodes.map((node) => {
        if (!affectedNodeIds.includes(node.id)) return node;
        const mode = resolveVideoNodeMode(node, nodes, connections);
        if (!mode) return node;
        changed = true;
        return { ...node, metadata: { ...node.metadata, videoMode: mode } };
    });
    return changed ? next : nodes;
}
