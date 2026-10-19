import { ScenePlanSchema, type ScenePlan } from "./director-agent";

export const DIRECTOR_PROJECT_PATH = "/cozyclay/director-project.cclayproject";
export const DIRECTOR_PROJECT_LIMIT = 128 * 1024;

function prop(name: string, renderer: "cube" | "plane" | "cylinder" | "cone", x: number, z: number, scaleX: number, scaleY: number, scaleZ: number, y = 0) {
  // Native live-context IDs are ASCII; display names may be Chinese.
  const id = `prop-${Array.from(name).map((character) => character.codePointAt(0)!.toString(16)).join("-")}`;
  return { id, name, renderer, x, y, z, rot: 0, rotX: 0, rotZ: 0, scaleX, scaleY, scaleZ,
    color: "#c2c6c8", parent: null, footprint: { width: renderer === "plane" ? 2 : 1, depth: renderer === "plane" ? 2 : 1 }, height: renderer === "plane" ? 0 : 1 };
}

/** Native CozyClay v4 projects, not a second renderer. No references, URLs or executable payload. */
export function createCozyClayProject(source: ScenePlan, executionId: string) {
  const plan = ScenePlanSchema.parse(source);
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(executionId)) throw new Error("执行标识无效。");
  if (plan.camera.aspectRatio === "3:4") throw new Error("当前 CozyClay 原生版本不支持 3:4，请选择 9:16 或 16:9。");
  const points = [...plan.characters.flatMap((actor) => actor.position), ...plan.camera.position, ...plan.camera.target];
  if (points.some((value) => !Number.isFinite(value) || Math.abs(value) > 40)) throw new Error("场景坐标超出安全范围。");
  const [x, y, z] = plan.camera.position;
  const [tx, ty, tz] = plan.camera.target;
  if (Math.hypot(tx - x, ty - y, tz - z) < 0.1) throw new Error("摄影机不能与目标点重合。");
  const framing = { pos: { x, y, z }, yaw: Math.atan2(x - tx, z - tz), pitch: Math.atan2(ty - y, Math.max(Math.hypot(tx - x, tz - z), 1e-6)), fovDeg: plan.camera.fov };
  const objects = [prop("地面", "plane", 0, 0, 8, 1, 8)];
  if (plan.scene.presetId === "coast") {
    objects.push(prop("海面占位", "plane", 0, -7, 8, 1, 4, 0.015), prop("岸边岩石左", "cube", -3, -2.5, 1.4, 0.7, 1.2), prop("岸边岩石右", "cube", 3.5, -4, 2, 1.2, 1.5));
  } else if (plan.scene.presetId === "oldtown") {
    for (const side of [-1, 1]) for (let index = 0; index < 3; index++) {
      objects.push(prop(`街巷建筑${side}-${index}`, "cube", side * 3.4, -2 - index * 3, 2.2, 3.2 + index * 0.5, 2));
    }
  } else {
    for (const [index, px, pz] of [[0, -3, -3], [1, 3, -5], [2, -4, -7], [3, 4.5, -9]]) {
      objects.push(prop(`树干${index}`, "cylinder", px, pz, 0.25, 1.8, 0.25), prop(`树冠${index}`, "cone", px, pz, 1.8, 2.3, 1.8, 1.1));
    }
  }
  const sceneId = `director-${executionId}`;
  const shotTitle = `${plan.scene.title} · ${executionId}`;
  const characters = plan.characters.map((actor, index) => ({
    id: `character-${index + 1}`, model: index % 2 ? "x-bot-tpose" : "y-bot-tpose",
    x: actor.position[0], y: actor.position[1], z: actor.position[2], rot: actor.rotationY * 180 / Math.PI,
    hidden: false, tint: "#e2e5e6", identityImage: null, scale: 1,
    subject: `${actor.role}；姿势意图：${actor.pose}（当前仅放置站姿代理，尚未实现此动作）`,
    pose: { id: "default", label: "站姿代理", prompt: "standing relaxed with arms hanging naturally at their sides",
      bones: { lArm: [1.5632, 0.1164, -0.2889], rArm: [1.5632, -0.1164, 0.2889], lForeArm: [-0.0076, 0.0003, -0.0874], rForeArm: [-0.0076, -0.0003, 0.0874] } },
    layer: { waypoints: [], promptClips: [] }, motionRef: null,
  }));
  const project = {
    app: "cozyclay", kind: "project", version: 4, name: `${plan.scene.title} · 构图预演`,
    scenes: { version: 4, activeSceneId: sceneId, scenes: [{
      id: sceneId, name: plan.scene.title, objects,
      shotDocument: { version: 4, frameCount: 96, waypoints: [], shots: [{ id: `shot-${executionId}`, name: shotTitle,
        startFrame: 0, endFrame: 95, camera: { mode: "keys" }, cameraKeys: [{ id: `key-${executionId}`, frame: 0, framing }] }] },
      stage: { characters, environment: `${plan.scene.title}概念布景，非真实地点还原`, style: "灰白模仅用于构图预演，不是最终成片风格",
        hasEnvSheet: false, hasCharSheet: false, environmentImage: null, shotAspect: plan.camera.aspectRatio,
        sensorId: "fullFrame", cameraPresetId: null, keyLight: { x: -4, y: 8, z: plan.scene.presetId === "coast" ? -4 : 4, intensity: 1.1, warmth: 0.3 } },
    }] },
    workspace: null, poseLibrary: [], workflow: { version: 1, nodes: [], edges: [] }, resources: { assets: [], motions: [] },
  };
  const serialized = JSON.stringify(project);
  if (new TextEncoder().encode(serialized).length > DIRECTOR_PROJECT_LIMIT) throw new Error("项目数据超过本地安全上限。");
  return { project, serialized, shotTitle, plan: structuredClone(plan), executionId };
}

export type PreparedDirectorProject = ReturnType<typeof createCozyClayProject>;

/** Check native capture metadata before attributing pixels to an execution. Does not prove aesthetic quality. */
export function captureMatchesProject(meta: unknown, prepared: PreparedDirectorProject): boolean {
  if (!meta || typeof meta !== "object") return false;
  const value = meta as Record<string, unknown>;
  return value.shotTitle === prepared.shotTitle && value.aspect === prepared.plan.camera.aspectRatio
    && Array.isArray(value.cast) && value.cast.length === prepared.plan.characters.length;
}
