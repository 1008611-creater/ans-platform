import type { SceneDocument } from "./contracts";

export const demoScenes = [
  { id: "coast", name: "海边日落", place: "海岸氛围概念场景", mood: "海风与落日", color: "#e98a61", icon: "◉" },
  { id: "oldtown", name: "石巷漫游", place: "老城氛围概念场景", mood: "慢一点也没关系", color: "#b9b8a0", icon: "⌂" },
  { id: "alpine", name: "山间来信", place: "山野氛围概念场景", mood: "把绿意穿在身上", color: "#829481", icon: "⌁" },
] as const;

export const starterScene: SceneDocument = {
  schemaVersion: "1.1.0", id: "demo-coast-sunset", title: "海边日落 · 双人旅行写真",
  provenance: { kind: "demo", label: "程序生成的概念场景，非真实地点还原", precision: "氛围示意，无地理精度", license: "项目自绘基础几何；非真实地图数据" },
  location: { label: "海岸氛围概念场景（非真实地点）" }, aspectRatio: "9:16",
  actors: [
    { id: "actor-a", label: "人物 A", position: [-0.48, 0, 0.18], heightOffset: 0, rotationY: -0.14, pose: "回眸", outfit: "奶油白针织" },
    { id: "actor-b", label: "人物 B", position: [0.42, 0, 0], heightOffset: 0, rotationY: 0.26, pose: "并肩", outfit: "海盐蓝衬衫" },
  ],
  shots: [
    { id: "shot-1", title: "沿着海风走", durationSec: 4, camera: { position: [3.8, 2.3, 5.2], target: [0, 1, 0], fov: 40 }, shotScale: "双人中景", cameraAngle: "平视", action: "并肩慢走", movement: "缓慢推进", lighting: "柔和逆光", composition: "人物落在画面下三分之一，顶部留白", notes: "留出天空做封面标题" },
    { id: "shot-2", title: "回头的瞬间", durationSec: 3, camera: { position: [3, 1.7, 4.2], target: [-0.35, 1.2, 0], fov: 34 }, shotScale: "半身近景", cameraAngle: "略低机位", action: "一人回眸，另一人看向远方", movement: "轻微环绕", lighting: "侧后方暖光", composition: "人物偏画面右侧，保留海面层次", notes: "抓拍感，自然松弛" },
    { id: "shot-3", title: "一起看日落", durationSec: 5, camera: { position: [4.5, 1.6, 6], target: [0, 0.9, 0], fov: 48 }, shotScale: "双人全身", cameraAngle: "平视", action: "牵手停下，一起看向夕阳", movement: "固定镜头", lighting: "暖色轮廓光", composition: "9:16 竖幅全身，地平线置于上三分之一", notes: "注意人物脚下留安全边距" },
  ],
};
export const demoOutfits = ["奶油白针织", "海盐蓝衬衫", "复古红裙", "轻户外机能"];
export const demoPoses = ["回眸", "并肩", "牵手", "自然站姿", "走路抓拍"];
