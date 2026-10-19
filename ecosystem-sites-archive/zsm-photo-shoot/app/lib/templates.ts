import type { SceneDocument } from "./contracts";

export type StudioTemplate = {
  id: "travel" | "couple" | "outfit";
  version: "1.0.0";
  title: string;
  category: string;
  description: string;
  coverImage: string;
  coverAlt: string;
  sceneId: "coast" | "oldtown" | "alpine";
  aspectRatio: SceneDocument["aspectRatio"];
  source: string;
  license: string;
  shotPreset: string[];
  promptBlocks: string[];
};

export const studioTemplates: StudioTemplate[] = [
  {
    id: "travel", version: "1.0.0", title: "海边日落旅行", category: "旅行写真",
    description: "夕阳海岸、松弛步调与适合封面的竖幅构图。",
    coverImage: "/template-covers/travel-cover.webp", coverAlt: "海边日落旅行写真样片",
    sceneId: "coast", aspectRatio: "9:16",
    source: "项目自绘概念场景与基础几何", license: "项目原创示意素材；非真实地点",
    shotPreset: ["海风并肩", "回眸瞬间", "一起看日落"],
    promptBlocks: ["双人旅行写真，自然互动", "温暖落日、海风、松弛真实", "9:16 竖幅，全身与半身镜头交替，保留封面留白"],
  },
  {
    id: "couple", version: "1.0.0", title: "旧城漫游情侣", category: "情侣写真",
    description: "石巷暖色氛围，适合记录约会中的自然瞬间。",
    coverImage: "/template-covers/couple-cover.webp", coverAlt: "旧城漫游情侣写真样片",
    sceneId: "oldtown", aspectRatio: "3:4",
    source: "项目自绘概念场景与基础几何", license: "项目原创示意素材；非真实地点",
    shotPreset: ["巷口相遇", "并肩散步", "街角合影"],
    promptBlocks: ["情侣约会写真，亲密但自然", "旧城石巷、午后暖光、生活感", "3:4 人像画幅，街巷引导线，人物表情自然"],
  },
  {
    id: "outfit", version: "1.0.0", title: "山野穿搭日记", category: "穿搭灵感",
    description: "柔和山野背景，突出穿搭轮廓与轻户外氛围。",
    coverImage: "/template-covers/outfit-cover.webp", coverAlt: "山野穿搭日记写真样片",
    sceneId: "alpine", aspectRatio: "9:16",
    source: "项目自绘概念场景与基础几何", license: "项目原创示意素材；非真实地点",
    shotPreset: ["全身穿搭", "步行动势", "配饰细节"],
    promptBlocks: ["个人穿搭写真，服装细节清晰", "山野绿意、柔和自然光、轻户外", "9:16 竖幅，先全身再细节，主体完整不裁切"],
  },
];
