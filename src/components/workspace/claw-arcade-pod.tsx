"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  ARCADE_PRIZES,
  ARCADE_TOKEN_COST_POINTS,
  CNY_PER_POINT,
  POINTS_PER_USD,
  QUEST_ARCADE_EVENT,
  QUEST_ARCADE_SERVER_CREDITED_EVENT,
  QUEST_DEFINITIONS,
  USD_PER_POINT,
  advanceAndClaimQuest,
  buyArcadeTokensWithPoints,
  drawArcadePrize,
  isQuestClaimedToday,
  loadQuestArcadeState,
  saveQuestArcadeState,
  type ArcadePrize,
  type ArcadeServerCreditedDetail,
  type PrizeRarity,
  type QuestArcadeState,
  type QuestCategory,
  type QuestDefinition,
} from "@/domain/mascot/quest-arcade";
import { SANCTUARY_EVENT_NAME, loadSanctuaryState } from "@/domain/mascot/sanctuary";

import {
  CAPSULE_PALETTE,
  INITIAL_CAPSULES,
  TRIPO_GLB_ASSETS,
  fetchAndParseGlbAsset,
  glbMeshCache,
  parseGlbBinaryMesh,
  renderGlbAngleSprite,
  type CapsuleItem,
  type ParsedGlbMesh,
  type ParsedGlbTriangle,
  type TripoGlbAssetId,
  type TripoGlbAssetMeta,
} from "./claw-arcade-glb";

export {
  TRIPO_GLB_ASSETS,
  parseGlbBinaryMesh,
  type ParsedGlbMesh,
  type ParsedGlbTriangle,
  type TripoGlbAssetId,
  type TripoGlbAssetMeta,
};

function DinoClaw3DViewport({
  clawX,
  clawZ,
  clawPhase,
  targetedCapsuleId,
  onSelectCapsule,
}: {
  clawX: number;
  clawZ: number;
  clawPhase: "idle" | "dropping" | "grabbing" | "lifting";
  targetedCapsuleId: string;
  onSelectCapsule: (cap: CapsuleItem) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetRef = useRef({ x: clawX, z: clawZ, phase: clawPhase, targetedCapsuleId });
  const meshesRef = useRef<Map<TripoGlbAssetId, ParsedGlbMesh>>(glbMeshCache);
  const screenCapsulesRef = useRef<Array<{ cap: CapsuleItem; sx: number; sy: number; r: number }>>([]);

  useEffect(() => {
    targetRef.current = { x: clawX, z: clawZ, phase: clawPhase, targetedCapsuleId };
  }, [clawX, clawZ, clawPhase, targetedCapsuleId]);

  useEffect(() => {
    for (const meta of TRIPO_GLB_ASSETS) {
      void fetchAndParseGlbAsset(meta).then(mesh => {
        if (mesh) {
          meshesRef.current.set(meta.id, mesh);
        }
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    let disposed = false;
    let rafId = 0;
    let curX = ((targetRef.current.x - 50) / 38) * 1.55;
    let curZ = ((targetRef.current.z - 50) / 38) * 1.1;
    let curDrop = 0;
    let curClose = 0;

    const project3D = (wx: number, wy: number, wz: number, w: number, h: number) => {
      const camY = 1.45;
      const camZ = 4.05;
      const pitch = 0.33;
      const dy = wy - camY;
      const dz = wz - camZ;
      const ry = dy * Math.cos(pitch) - dz * Math.sin(pitch);
      const rz = dy * Math.sin(pitch) + dz * Math.cos(pitch);
      const depth = Math.max(0.8, -rz);
      const fov = Math.min(w, h) * 1.24;
      return {
        sx: w * 0.5 + (wx / depth) * fov,
        sy: h * 0.54 - (ry / depth) * fov,
        scale: fov / depth,
        depth,
      };
    };

    const drawGlbSprite = (
      mesh: ParsedGlbMesh,
      cx: number,
      cy: number,
      cz: number,
      worldSize: number,
      yaw: number,
      w: number,
      h: number,
      alpha = 0.98,
    ) => {
      if (!ctx) return;
      const proj = project3D(cx, cy, cz, w, h);
      const totalSteps = 16;
      const normYaw = ((yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const angleStep = Math.floor((normYaw / (Math.PI * 2)) * totalSteps) % totalSteps;
      const sprite = renderGlbAngleSprite(mesh, angleStep, totalSteps);
      if (!sprite) return;
      const drawDiameter = Math.max(28, proj.scale * worldSize);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        sprite,
        proj.sx - drawDiameter * 0.5,
        proj.sy - drawDiameter * 0.5,
        drawDiameter,
        drawDiameter,
      );
      ctx.restore();
    };

    const renderFrame = (timeMs: number) => {
      if (disposed || !canvasRef.current) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvasRef.current.clientWidth || 380;
      const h = canvasRef.current.clientHeight || 236;
      if (
        canvasRef.current.width !== Math.round(w * dpr) ||
        canvasRef.current.height !== Math.round(h * dpr)
      ) {
        canvasRef.current.width = Math.round(w * dpr);
        canvasRef.current.height = Math.round(h * dpr);
      }
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const t = timeMs * 0.001;
      const targetWorldX = ((targetRef.current.x - 50) / 38) * 1.55;
      const targetWorldZ = ((targetRef.current.z - 50) / 38) * 1.1;
      const phase = targetRef.current.phase;

      curX += (targetWorldX - curX) * 0.15;
      curZ += (targetWorldZ - curZ) * 0.15;
      const desiredDrop =
        phase === "dropping" || phase === "grabbing" ? 1.0 : phase === "lifting" ? 0.32 : 0;
      curDrop += (desiredDrop - curDrop) * 0.16;
      const desiredClose = phase === "grabbing" || phase === "lifting" ? 0.45 : 0;
      curClose += (desiredClose - curClose) * 0.18;

      // 0. Draw Subtle 3D Cabinet Background Silhouette if claw-cabinet.glb is loaded
      const cabinetMesh = meshesRef.current.get("claw-cabinet");
      if (cabinetMesh) {
        drawGlbSprite(cabinetMesh, 0, 0.1, -1.0, 2.8, 0, w, h, 0.2);
      }

      // 1. Draw 3D Perspective Cyber-Agri Floor Grid
      const floorY = -0.68;
      ctx.lineWidth = 1;
      for (let i = -5; i <= 5; i++) {
        const gx = i * 0.36;
        const p1 = project3D(gx, floorY, -1.35, w, h);
        const p2 = project3D(gx, floorY, 1.35, w, h);
        ctx.strokeStyle = i === 0 ? "rgba(52, 211, 153, 0.4)" : "rgba(148, 163, 184, 0.16)";
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      }
      for (let j = -4; j <= 4; j++) {
        const gz = j * 0.33;
        const p1 = project3D(-1.8, floorY, gz, w, h);
        const p2 = project3D(1.8, floorY, gz, w, h);
        ctx.strokeStyle = j === 0 ? "rgba(251, 191, 36, 0.32)" : "rgba(148, 163, 184, 0.16)";
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      }

      // 2. Draw 3D Target Laser Reticle on Floor
      const retCenter = project3D(curX, floorY + 0.02, curZ, w, h);
      const retRadius = Math.max(14, retCenter.scale * (0.28 + Math.sin(t * 4) * 0.025));
      ctx.save();
      ctx.translate(retCenter.sx, retCenter.sy);
      ctx.scale(1, 0.5);
      ctx.strokeStyle = "rgba(251, 191, 36, 0.92)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, retRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 3. Draw 3D Tripo .glb Prize Capsules sorted by depth (back-to-front)
      const sortedCapsules = INITIAL_CAPSULES.map((cap, idx) => {
        const wx = ((cap.x - 50) / 38) * 1.55;
        const wz = ((cap.z - 50) / 38) * 1.1;
        const isGrabbed =
          (phase === "grabbing" || phase === "lifting") &&
          cap.id === targetRef.current.targetedCapsuleId;
        const bob = Math.sin(t * 2.2 + idx * 0.9) * 0.035;
        const wy = isGrabbed ? 0.42 - curDrop * 0.82 : floorY + 0.28 + bob;
        const proj = project3D(wx, wy, wz, w, h);
        return { cap, wx, wy, wz, proj, idx };
      }).sort((a, b) => b.proj.depth - a.proj.depth);

      const nextScreenHits: Array<{ cap: CapsuleItem; sx: number; sy: number; r: number }> = [];

      for (const item of sortedCapsules) {
        const { cap, wx, wy, wz, proj, idx } = item;
        const pal = CAPSULE_PALETTE[cap.rarity];
        const r = Math.max(16, proj.scale * 0.3);
        const isTargeted = cap.id === targetRef.current.targetedCapsuleId;
        nextScreenHits.push({ cap, sx: proj.sx, sy: proj.sy, r: r * 1.25 });

        // Soft glowing pedestal halo beneath each 3D model
        const floorPedestal = project3D(wx, floorY + 0.01, wz, w, h);
        ctx.save();
        ctx.translate(floorPedestal.sx, floorPedestal.sy);
        ctx.scale(1, 0.48);
        ctx.fillStyle = isTargeted ? "rgba(251, 191, 36, 0.34)" : "rgba(16, 185, 129, 0.16)";
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const prizeGlb = meshesRef.current.get(cap.glbId);
        if (prizeGlb) {
          drawGlbSprite(
            prizeGlb,
            wx,
            wy,
            wz,
            isTargeted ? 0.98 : 0.86,
            t * 0.85 + idx * 1.1,
            w,
            h,
            1.0,
          );
        } else {
          const grad = ctx.createRadialGradient(
            proj.sx - r * 0.32,
            proj.sy - r * 0.35,
            r * 0.1,
            proj.sx,
            proj.sy,
            r,
          );
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.35, pal.core);
          grad.addColorStop(0.8, pal.shell);
          grad.addColorStop(1, "rgba(15, 23, 42, 0.92)");

          ctx.save();
          ctx.shadowColor = pal.glow;
          ctx.shadowBlur = 14;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, r * 0.78, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Orbiting 3D Energy Ring around SP / UR / SSR or targeted capsule
        if (cap.rarity === "SP" || cap.rarity === "UR" || cap.rarity === "SSR" || isTargeted) {
          ctx.save();
          ctx.translate(proj.sx, proj.sy);
          ctx.rotate(Math.sin(t * 1.6 + idx) * 0.32);
          ctx.scale(1, 0.42);
          ctx.strokeStyle = isTargeted ? "#fde047" : pal.core;
          ctx.lineWidth = isTargeted ? 2.2 : 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Crisp mini HUD tag below the 3D mesh (never covering the 3D mesh itself)
        const tagY = proj.sy + r * 0.92;
        ctx.save();
        ctx.font = "bold 9px system-ui, -apple-system, sans-serif";
        const label = `${cap.icon} ${cap.shortTag}`;
        const tw = ctx.measureText(label).width + 8;
        ctx.fillStyle = isTargeted ? "rgba(251, 191, 36, 0.95)" : "rgba(15, 23, 42, 0.85)";
        ctx.beginPath();
        ctx.roundRect(proj.sx - tw * 0.5, tagY - 7, tw, 13, 4);
        ctx.fill();
        ctx.fillStyle = isTargeted ? "#020617" : "#f8fafc";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, proj.sx, tagY - 0.5);
        ctx.restore();
      }

      screenCapsulesRef.current = nextScreenHits;

      // 4. Draw 3D Gantry Rail, Telescopic Cable & Tripo claw-arm.glb 3D Mechanical Claw
      const railLeft = project3D(-1.75, 0.94, curZ, w, h);
      const railRight = project3D(1.75, 0.94, curZ, w, h);
      ctx.strokeStyle = "rgba(251, 191, 36, 0.82)";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(railLeft.sx, railLeft.sy);
      ctx.lineTo(railRight.sx, railRight.sy);
      ctx.stroke();

      const carriageProj = project3D(curX, 0.94, curZ, w, h);
      const clawY = 0.64 - curDrop * 0.92;
      const clawHeadProj = project3D(curX, clawY, curZ, w, h);

      // Gantry carriage block
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.roundRect(carriageProj.sx - 12, carriageProj.sy - 4, 24, 8, 4);
      ctx.fill();

      // Vertical laser aim beam from claw to floor
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(251, 191, 36, 0.42)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(clawHeadProj.sx, clawHeadProj.sy);
      ctx.lineTo(retCenter.sx, retCenter.sy);
      ctx.stroke();
      ctx.restore();

      // Steel Cable
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(carriageProj.sx, carriageProj.sy);
      ctx.lineTo(clawHeadProj.sx, clawHeadProj.sy);
      ctx.stroke();

      const clawArmMesh = meshesRef.current.get("claw-arm");
      if (clawArmMesh) {
        drawGlbSprite(clawArmMesh, curX, clawY - 0.16, curZ, 0.98, t * 0.55, w, h, 1.0);
      } else {
        const hubR = Math.max(7, clawHeadProj.scale * 0.12);
        for (let i = 0; i < 3; i++) {
          const angle = t * 0.6 + (i * Math.PI * 2) / 3;
          const spread = (0.24 - curClose * 0.22) * clawHeadProj.scale;
          const elbowX = clawHeadProj.sx + Math.cos(angle) * spread;
          const elbowY = clawHeadProj.sy + hubR * 1.15;
          const tipX = clawHeadProj.sx + Math.cos(angle) * spread * (0.55 - curClose * 0.4);
          const tipY = clawHeadProj.sy + hubR * 2.35;

          ctx.strokeStyle = i === 0 ? "#38bdf8" : "#f8fafc";
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(clawHeadProj.sx, clawHeadProj.sy);
          ctx.lineTo(elbowX, elbowY);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();
        }
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(clawHeadProj.sx, clawHeadProj.sy, hubR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        let bestCap: CapsuleItem | null = null;
        let bestDist = Infinity;
        for (const item of screenCapsulesRef.current) {
          const d = Math.hypot(item.sx - clickX, item.sy - clickY);
          if (d < bestDist) {
            bestDist = d;
            bestCap = item.cap;
          }
        }
        if (bestCap) {
          onSelectCapsule(bestCap);
        }
      }}
      className="absolute inset-0 z-[5] h-full w-full cursor-crosshair"
    />
  );
}

function GlbInteractiveTurntable({
  asset,
  isEn,
}: {
  asset: TripoGlbAssetMeta;
  isEn: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const orbitRef = useRef({ yaw: 0.45, pitch: 0.24, dragging: false, lastX: 0, lastY: 0 });
  const meshRef = useRef<ParsedGlbMesh | null>(glbMeshCache.get(asset.id) ?? null);

  useEffect(() => {
    meshRef.current = glbMeshCache.get(asset.id) ?? null;
    void fetchAndParseGlbAsset(asset).then(m => {
      if (m) meshRef.current = m;
    });
  }, [asset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    let disposed = false;
    let rafId = 0;

    const renderTurntable = () => {
      if (disposed || !canvasRef.current || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvasRef.current.clientWidth || 220;
      const h = canvasRef.current.clientHeight || 176;
      if (
        canvasRef.current.width !== Math.round(w * dpr) ||
        canvasRef.current.height !== Math.round(h * dpr)
      ) {
        canvasRef.current.width = Math.round(w * dpr);
        canvasRef.current.height = Math.round(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      if (autoRotate && !orbitRef.current.dragging) {
        orbitRef.current.yaw += 0.018;
      }

      const yaw = orbitRef.current.yaw;
      const pitch = orbitRef.current.pitch;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      // Draw glowing 3D turntable ring at bottom
      const cx = w * 0.5;
      const cy = h * 0.53;
      const radius = Math.min(w, h) * 0.36;

      ctx.save();
      ctx.translate(cx, cy + radius * 0.72);
      ctx.scale(1, 0.34);
      const baseGrad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius * 1.15);
      baseGrad.addColorStop(0, `rgba(${asset.fallbackRgb[0]}, ${asset.fallbackRgb[1]}, ${asset.fallbackRgb[2]}, 0.38)`);
      baseGrad.addColorStop(0.7, `rgba(${asset.accentRgb[0]}, ${asset.accentRgb[1]}, ${asset.accentRgb[2]}, 0.16)`);
      baseGrad.addColorStop(1, "rgba(15, 23, 42, 0)");
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(${asset.fallbackRgb[0]}, ${asset.fallbackRgb[1]}, ${asset.fallbackRgb[2]}, 0.75)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const mesh = meshRef.current;
      if (mesh && mesh.triangles.length > 0) {
        if (!wireframe && !orbitRef.current.dragging) {
          const totalSteps = 16;
          const normYaw = ((yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const angleStep = Math.floor((normYaw / (Math.PI * 2)) * totalSteps) % totalSteps;
          const sprite = renderGlbAngleSprite(mesh, angleStep, totalSteps);
          if (sprite) {
            const drawSize = Math.min(w, h) * 0.92;
            ctx.drawImage(
              sprite,
              cx - drawSize * 0.5,
              cy - drawSize * 0.5,
              drawSize,
              drawSize,
            );
          }
        } else {
          const projVert = (v: [number, number, number]) => {
            const rx = v[0] * cosY - v[2] * sinY;
            const rz0 = v[0] * sinY + v[2] * cosY;
            const ry = v[1] * cosP - rz0 * sinP;
            const rz = v[1] * sinP + rz0 * cosP;
            const depth = Math.max(1.05, 2.2 - rz);
            const fov = Math.min(w, h) * 1.48;
            return {
              sx: cx + (rx / depth) * fov,
              sy: cy - (ry / depth) * fov,
              depth,
            };
          };

          const tris: Array<{
            p0: { sx: number; sy: number; depth: number };
            p1: { sx: number; sy: number; depth: number };
            p2: { sx: number; sy: number; depth: number };
            avgDepth: number;
            fill: string;
          }> = [];

          for (const tri of mesh.triangles) {
            const rnx = tri.normal[0] * cosY - tri.normal[2] * sinY;
            const rnz0 = tri.normal[0] * sinY + tri.normal[2] * cosY;
            const rny = tri.normal[1] * cosP - rnz0 * sinP;
            const rnz = tri.normal[1] * sinP + rnz0 * cosP;
            if (!wireframe && rnz < -0.55) continue;

            const p0 = projVert(tri.v0);
            const p1 = projVert(tri.v1);
            const p2 = projVert(tri.v2);
            const diff = Math.max(0.56, Math.min(1.42, 0.78 + rnx * 0.34 + rny * 0.44 + rnz * 0.25));
            const spec = Math.pow(Math.max(0, rny * 0.55 + rnz * 0.78), 6) * 46;
            const rim = Math.pow(1 - Math.max(0, Math.abs(rnz)), 2.2) * 28;
            const r = Math.min(255, Math.round(tri.rgb[0] * diff + spec + rim));
            const g = Math.min(255, Math.round(tri.rgb[1] * diff + spec + rim));
            const b = Math.min(255, Math.round(tri.rgb[2] * diff + spec + rim));
            tris.push({
              p0,
              p1,
              p2,
              avgDepth: (p0.depth + p1.depth + p2.depth) / 3,
              fill: `rgb(${r},${g},${b})`,
            });
          }

          tris.sort((a, b) => b.avgDepth - a.avgDepth);
          ctx.lineJoin = "round";
          ctx.lineWidth = wireframe ? 0.65 : 1.15;
          for (const t of tris) {
            ctx.beginPath();
            ctx.moveTo(t.p0.sx, t.p0.sy);
            ctx.lineTo(t.p1.sx, t.p1.sy);
            ctx.lineTo(t.p2.sx, t.p2.sy);
            ctx.closePath();
            if (wireframe) {
              ctx.strokeStyle = `rgba(${asset.fallbackRgb[0]}, ${asset.fallbackRgb[1]}, ${asset.fallbackRgb[2]}, 0.75)`;
              ctx.stroke();
            } else {
              ctx.fillStyle = t.fill;
              ctx.strokeStyle = t.fill;
              ctx.fill();
              ctx.stroke();
            }
          }
        }
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(renderTurntable);
    };

    rafId = window.requestAnimationFrame(renderTurntable);
    return () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [asset, autoRotate, wireframe]);

  return (
    <div className="relative flex h-52 flex-col justify-between overflow-hidden rounded-xl border border-cyan-500/40 bg-slate-950 p-2.5 text-slate-100">
      <div className="relative z-10 flex items-center justify-between text-[10px] font-bold text-cyan-300">
        <span>{isEn ? "3D PBR .GLB TURNTABLE" : "3D .glb 实时旋转检视"}</span>
        <span>
          {asset.vertexCount.toLocaleString()}v · {asset.faceCount.toLocaleString()} tris
        </span>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={e => {
          orbitRef.current.dragging = true;
          orbitRef.current.lastX = e.clientX;
          orbitRef.current.lastY = e.clientY;
        }}
        onPointerMove={e => {
          if (!orbitRef.current.dragging) return;
          const dx = e.clientX - orbitRef.current.lastX;
          const dy = e.clientY - orbitRef.current.lastY;
          orbitRef.current.lastX = e.clientX;
          orbitRef.current.lastY = e.clientY;
          orbitRef.current.yaw += dx * 0.015;
          orbitRef.current.pitch = Math.max(-0.6, Math.min(0.75, orbitRef.current.pitch + dy * 0.012));
        }}
        onPointerUp={() => {
          orbitRef.current.dragging = false;
        }}
        onPointerLeave={() => {
          orbitRef.current.dragging = false;
        }}
        className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
      />

      <div className="relative z-10 flex items-center justify-between gap-1 text-[10px]">
        <span className="text-slate-400">
          {isEn ? "Drag to orbit 360°" : "拖拽旋转 360°"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWireframe(prev => !prev)}
            className="rounded bg-slate-800/90 px-1.5 py-0.5 font-semibold text-cyan-200 hover:bg-slate-700"
          >
            {wireframe ? (isEn ? "Solid" : "实体") : isEn ? "Wireframe" : "线框"}
          </button>
          <button
            type="button"
            onClick={() => setAutoRotate(prev => !prev)}
            className="rounded bg-slate-800/90 px-1.5 py-0.5 font-semibold text-amber-200 hover:bg-slate-700"
          >
            {autoRotate ? (isEn ? "Pause" : "暂停") : isEn ? "Spin" : "自转"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ComputeQuestArcade({
  actorId,
  initialServerPoints,
}: {
  actorId?: string | null;
  initialServerPoints?: number | null;
}) {
  const locale = useLocale();
  const isEn = locale === "en";

  const [state, setState] = useState<QuestArcadeState>(() => loadQuestArcadeState(actorId));
  const [starBeans, setStarBeans] = useState<number>(() => loadSanctuaryState().starBeans);
  const [arcadeMode, setArcadeMode] = useState<"claw" | "roulette" | "glb">("claw");
  const [selectedGlbId, setSelectedGlbId] = useState<TripoGlbAssetId>("claw-cabinet");
  const [activeCategory, setActiveCategory] = useState<QuestCategory>("daily");

  // 3D Claw Machine state
  const [clawX, setClawX] = useState<number>(50);
  const [clawZ, setClawZ] = useState<number>(52);
  const [clawPhase, setClawPhase] = useState<"idle" | "dropping" | "grabbing" | "lifting">("idle");

  // Starlight Roulette state
  const [wheelAngle, setWheelAngle] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);

  // VibeHub 60s immersion timer simulation
  const [vibeTimerRunning, setVibeTimerRunning] = useState<boolean>(false);

  // Prize / Toast banner state
  const [lastWonPrize, setLastWonPrize] = useState<ArcadePrize | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string>("");
  const [serverBalancePoints, setServerBalancePoints] = useState<number | null>(
    typeof initialServerPoints === "number" ? initialServerPoints : null,
  );
  const [lastServerCredit, setLastServerCredit] = useState<ArcadeServerCreditedDetail | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const syncAll = () => {
      setState(loadQuestArcadeState(actorId));
      setStarBeans(loadSanctuaryState().starBeans);
    };
    const onServerCredited = (ev: Event) => {
      const detail = (ev as CustomEvent<ArcadeServerCreditedDetail>).detail;
      if (!detail) return;
      if (detail.errorCode === "QUEST_PREREQUISITE_NOT_MET") {
        setBannerMessage(
          isEn
            ? "📋 Local milestone progress recorded! Complete the verified AgriHackathon / Marketplace submission to credit live API Gateway points."
            : "📋 已记录本地里程碑进度 + 游乐币！完成农客松报名或作品上架真实核验后，对应积分将自动入账 API 网关。",
        );
        return;
      }
      if (detail.errorCode === "ARCADE_TOKENS_EXHAUSTED") {
        setBannerMessage(
          isEn
            ? "ℹ️ Free draw tokens used up! Click [🪙 10 Pts → 1 Token] to exchange points and keep playing for the 1,000-pt Mythic Koi!"
            : "ℹ️ 免费抓娃娃币已用完！可点击【🪙 10积分兑1币】用积分投币继续冲刺 1000 积分锦鲤大奖，或完成右侧打卡彩蛋免费领币！",
        );
        return;
      }
      if (detail.errorCode === "INSUFFICIENT_POINTS") {
        setBannerMessage(
          isEn
            ? "⚠️ Insufficient API Gateway points (10 Pts = 1 Token). Complete the Onboarding Questionnaire (+50 pts) or daily quests first!"
            : "⚠️ 账户可用积分不足（10 积分 = 1 枚抓娃娃币）！请先完成上方破冰问卷（+50分）或右侧打卡任务领积分。",
        );
        return;
      }
      if (typeof detail.balanceAfter === "number" && detail.balanceAfter >= 0) {
        setServerBalancePoints(detail.balanceAfter);
        setLastServerCredit(detail);
        if (detail.awardedPrizeId) {
          const authPrize = ARCADE_PRIZES.find(p => p.id === detail.awardedPrizeId);
          if (authPrize) {
            setLastWonPrize(authPrize);
          }
        }
      }
    };
    window.addEventListener(QUEST_ARCADE_EVENT, syncAll);
    window.addEventListener(SANCTUARY_EVENT_NAME, syncAll);
    window.addEventListener(QUEST_ARCADE_SERVER_CREDITED_EVENT, onServerCredited);
    window.addEventListener("storage", syncAll);

    if (process.env.NODE_ENV !== "test" && typeof fetch === "function") {
      void fetch("/api/compute-benefits/arcade")
        .then(res => (res.ok ? res.json() : null))
        .then((data: { balancePoints?: number } | null) => {
          if (data && typeof data.balancePoints === "number") {
            setServerBalancePoints(data.balancePoints);
          }
        })
        .catch(() => {});
    }

    const timers = timersRef.current;
    return () => {
      window.removeEventListener(QUEST_ARCADE_EVENT, syncAll);
      window.removeEventListener(SANCTUARY_EVENT_NAME, syncAll);
      window.removeEventListener(QUEST_ARCADE_SERVER_CREDITED_EVENT, onServerCredited);
      window.removeEventListener("storage", syncAll);
      timers.forEach(id => window.clearTimeout(id));
    };
  }, [actorId, isEn]);

  useEffect(() => {
    if (!vibeTimerRunning) return;
    const interval = window.setInterval(() => {
      const current = loadQuestArcadeState(actorId);
      const nextSec = Math.min(60, (current.vibehubReadSeconds || 0) + 15);
      const updated: QuestArcadeState = {
        ...current,
        vibehubReadSeconds: nextSec,
        questProgress: {
          ...current.questProgress,
          daily_vibehub_read: nextSec,
        },
      };
      saveQuestArcadeState(updated, actorId);
      setState(updated);
      if (nextSec >= 60) {
        setVibeTimerRunning(false);
        const res = advanceAndClaimQuest("daily_vibehub_read", actorId);
        if (res?.newlyClaimed) {
          setBannerMessage(
            isEn
              ? `🎉 VibeHub 60s Deep Reading completed! Unlocked $${res.quest.unlockUsd} (${res.quest.unlockUsd * POINTS_PER_USD} pts) + 1 Claw Token!`
              : `🎉 VibeHub 60 秒沉浸充电完成！已从金库提取 $${res.quest.unlockUsd}（${res.quest.unlockUsd * POINTS_PER_USD} 积分）+ 1 枚抓娃娃币！`,
          );
        }
      }
    }, 650);
    return () => window.clearInterval(interval);
  }, [vibeTimerRunning, actorId, isEn]);

  function moveClaw(dx: number, dz: number) {
    if (clawPhase !== "idle") return;
    setClawX(prev => Math.max(14, Math.min(86, prev + dx)));
    setClawZ(prev => Math.max(18, Math.min(82, prev + dz)));
  }

  function findNearestCapsule(x: number, z: number): CapsuleItem {
    let best = INITIAL_CAPSULES[0];
    let bestDist = Infinity;
    for (const cap of INITIAL_CAPSULES) {
      const dist = Math.hypot(cap.x - x, cap.z - z);
      if (dist < bestDist) {
        bestDist = dist;
        best = cap;
      }
    }
    return best;
  }

  const isGuest = !actorId || actorId === "guest" || actorId === "guest-preview";

  function handleBuyTokens(count: 1 | 5 = 1) {
    const cost = count * ARCADE_TOKEN_COST_POINTS;
    if (isGuest) {
      const next = { ...state, arcadeTokens: state.arcadeTokens + count };
      saveQuestArcadeState(next, actorId);
      setState(next);
      setBannerMessage(
        isEn
          ? `🪙 [Guest Free Trial] Added +${count} Trial Token(s)! Drop the 3D claw to test your luck — sign in anytime to credit real API points!`
          : `🪙 【访客免费试玩】已补充 +${count} 枚试玩抓娃娃币！快投币下爪体验 3D 机械臂，点击右侧【立即登录入账】即可将积分真实写入账户！`,
      );
      return;
    }
    if (serverBalancePoints !== null && serverBalancePoints < cost) {
      setBannerMessage(
        isEn
          ? `⚠️ Need ${cost} Pts to exchange ${count} Token(s), current balance: ${serverBalancePoints} Pts. Complete Onboarding (+50 pts) or daily quests first!`
          : `⚠️ 兑换 ${count} 枚抓娃娃币需 ${cost} 积分（当前余额 ${serverBalancePoints} 积分），请先完成上方破冰问卷（+50分）或右侧打卡任务！`,
      );
      return;
    }
    const res = buyArcadeTokensWithPoints(count, actorId);
    setState(res.state);
    if (serverBalancePoints !== null) {
      setServerBalancePoints(Math.max(0, serverBalancePoints - res.costPoints));
    }
    setBannerMessage(
      isEn
        ? `🪙 Spent ${res.costPoints} Pts to exchange +${count} Arcade Token(s)! Drop the claw or spin the wheel for the 0.1% 1,000-pt Mythic Koi!`
        : `🪙 已花 ${res.costPoints} 积分兑换 +${count} 枚抓娃娃币！快投币下爪冲击 0.1%【1000 积分 (¥100) 天选锦鲤】大奖！`,
    );
  }

  function handleClawDrop() {
    if (clawPhase !== "idle") return;
    if (state.arcadeTokens < 1) {
      if (isGuest) {
        const refilled = { ...state, arcadeTokens: 3 };
        saveQuestArcadeState(refilled, actorId);
        setState(refilled);
      } else {
        if (serverBalancePoints !== null && serverBalancePoints < ARCADE_TOKEN_COST_POINTS) {
          setBannerMessage(
            isEn
              ? "⚠️ Out of Arcade Tokens and <10 Pts! Complete any daily quest or Dino easter egg on the right to earn free tokens."
              : "⚠️ 抓娃娃币与积分均不足（10 积分可兑 1 币）！完成右侧任意每日任务或小恐龙反常识彩蛋即可免费领币。",
          );
          return;
        }
        const bought = buyArcadeTokensWithPoints(1, actorId);
        setState(bought.state);
        if (serverBalancePoints !== null) {
          setServerBalancePoints(Math.max(0, serverBalancePoints - bought.costPoints));
        }
      }
    }

    setClawPhase("dropping");
    setLastWonPrize(null);

    const t1 = window.setTimeout(() => {
      setClawPhase("grabbing");
    }, 360);

    const t2 = window.setTimeout(() => {
      setClawPhase("lifting");
    }, 760);

    const t3 = window.setTimeout(() => {
      const outcome = drawArcadePrize("claw", actorId);
      setClawPhase("idle");
      if (outcome) {
        setState(outcome.state);
        setLastWonPrize(outcome.prize);
        const pts = outcome.prize.unlockUsd * POINTS_PER_USD;
        const guestHint = isGuest
          ? isEn
            ? " (🔓 Guest Trial: Sign in to credit these points to your live API Gateway account!)"
            : "（🔓 访客试玩中：点击右侧【立即登录入账】即可将抓中的算力积分真实存入账户！）"
          : "";
        setBannerMessage(
          (isEn
            ? `🕹️ Claw Critical Hit! Pulled [${outcome.prize.rarity}] ${outcome.prize.nameEn} · Unlocked $${outcome.prize.unlockUsd} (${pts} pts) + ${outcome.prize.starBeans}🪙!`
            : `🕹️ 机械爪暴击出货！抓中【${outcome.prize.rarity}】${outcome.prize.nameZh} · 已从金库提现 $${outcome.prize.unlockUsd}（${pts} 积分）+ ${outcome.prize.starBeans}🪙！`) + guestHint,
        );
      }
    }, 1150);

    timersRef.current.push(t1, t2, t3);
  }

  function handleRouletteSpin(drawsCount: 1 | 5 = 1) {
    if (isSpinning) return;
    let availableTokens = state.arcadeTokens;
    if (availableTokens < 1) {
      if (isGuest) {
        const refilled = { ...state, arcadeTokens: 5 };
        saveQuestArcadeState(refilled, actorId);
        setState(refilled);
        availableTokens = 5;
      } else {
        if (serverBalancePoints !== null && serverBalancePoints < ARCADE_TOKEN_COST_POINTS) {
          setBannerMessage(
            isEn
              ? "⚠️ Out of Arcade Tokens and <10 Pts! Complete daily quests or Dino easter eggs on the right to earn tokens."
              : "⚠️ 星轨转盘币与积分均不足（10 积分可兑 1 币）！完成右侧每日任务或小恐龙彩蛋即可免费获取。",
          );
          return;
        }
        const bought = buyArcadeTokensWithPoints(1, actorId);
        setState(bought.state);
        availableTokens = bought.state.arcadeTokens;
        if (serverBalancePoints !== null) {
          setServerBalancePoints(Math.max(0, serverBalancePoints - bought.costPoints));
        }
      }
    }
    const actualDraws = Math.min(drawsCount, availableTokens);
    if (actualDraws < 1) return;

    setIsSpinning(true);
    setLastWonPrize(null);
    setWheelAngle(prev => prev + 1080 + Math.floor(Math.random() * 360));

    const t = window.setTimeout(() => {
      let latestOutcome: ReturnType<typeof drawArcadePrize> = null;
      let totalUsd = 0;
      for (let i = 0; i < actualDraws; i++) {
        const res = drawArcadePrize("roulette", actorId);
        if (res) {
          latestOutcome = res;
          totalUsd += res.prize.unlockUsd;
        }
      }
      setIsSpinning(false);
      if (latestOutcome) {
        setState(latestOutcome.state);
        setLastWonPrize(latestOutcome.prize);
        const totalPts = totalUsd * POINTS_PER_USD;
        const guestHint = isGuest
          ? isEn
            ? " (🔓 Guest Trial: Sign in to settle these points into your account!)"
            : "（🔓 访客试玩中：点击右侧【立即登录入账】即可将转出的积分真实入账！）"
          : "";
        setBannerMessage(
          (isEn
            ? `🎡 Starlight Roulette (${actualDraws}x) Complete! Highlight: [${latestOutcome.prize.rarity}] ${latestOutcome.prize.nameEn} · Total Unlocked: $${totalUsd} (${totalPts} pts)!`
            : `🎡 丰收星轨大转盘（${actualDraws} 连抽）出货！最高命中【${latestOutcome.prize.rarity}】${latestOutcome.prize.nameZh} · 累计提现 $${totalUsd}（${totalPts} 积分）！`) + guestHint,
        );
      }
    }, 900);

    timersRef.current.push(t);
  }

  function handleClaimQuest(quest: QuestDefinition) {
    const res = advanceAndClaimQuest(quest.id, actorId);
    if (!res) return;
    setState(res.state);
    if (res.newlyClaimed) {
      const pts = quest.unlockUsd * POINTS_PER_USD;
      const guestHint = isGuest
        ? isEn
          ? " (🔓 Guest Trial: Sign in to permanently bind +credit to your account!)"
          : "（🔓 访客预览打卡成功：点击右侧【立即登录入账】即可将奖励永久写入你的算力账户！）"
        : "";
      setBannerMessage(
        (isEn
          ? `✅ Quest Completed: ${quest.titleEn}! Unlocked $${quest.unlockUsd} (${pts} pts) + ${quest.rewardTokens}🎟️ + ${quest.rewardStarBeans}🪙!`
          : `✅ 任务达成：【${quest.titleZh}】！已从金库解锁 $${quest.unlockUsd}（${pts} 积分）+ ${quest.rewardTokens}🎟️ 抓娃娃币 + ${quest.rewardStarBeans}🪙 星豆！`) + guestHint,
      );
    } else {
      setBannerMessage(
        isEn
          ? `ℹ️ Quest [${quest.titleEn}] has already been claimed for this cycle.`
          : `ℹ️ 【${quest.titleZh}】本周期奖励已入账，快去抓娃娃或探索其他隐藏彩蛋吧！`,
      );
    }
  }

  const deepseekPct = Math.min(100, Math.round((state.deepseekUnlockedUsd / state.deepseekTotalUsd) * 100));
  const flagshipPct = Math.min(100, Math.round((state.flagshipUnlockedUsd / state.flagshipTotalUsd) * 100));
  const filteredQuests = QUEST_DEFINITIONS.filter(q => q.category === activeCategory);
  const unlockedSecretCount = Object.keys(state.secretUnlockedAt).length;
  const targetCapsule = findNearestCapsule(clawX, clawZ);

  return (
    <section
      id="ans-quest-arcade-hub"
      aria-label={isEn ? "Compute Vault, 3D Claw Arcade & Gamified Quest Center" : "算力金库、3D 抓娃娃游乐场与游戏化任务中心"}
      className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-7"
    >
      {/* Top Header & Official Conversion Ratio Badge */}
      <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-2">
          <div className="inline-flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white dark:bg-emerald-500 dark:text-slate-950">
              {isEn ? "🎮 ANS × CAU AGRIHACKATHON ARCADE" : "🎮 ANS × 中国农大农客松 · 算力游乐场"}
            </span>
            <span className="rounded-full border border-emerald-600/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              {isEn
                ? `Official Ratio: 1 Point = ¥${CNY_PER_POINT.toFixed(2)} CNY = $${USD_PER_POINT.toFixed(2)} USD APIC Quota (10 Pts = $1)`
                : `官方计费锚定：1 积分 = ¥${CNY_PER_POINT.toFixed(2)} 元 = $${USD_PER_POINT.toFixed(2)} USD APIC 标称额度（10 积分 = $1）`}
            </span>
            {isGuest && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                {isEn ? "🔓 Guest Free Trial Mode (No Login Required to Play)" : "🔓 访客免登试玩模式（可直接抓娃娃体验，登录即刻入账）"}
              </span>
            )}
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {isEn
              ? "Compute Vault Progressive Unlock · 3D Dino Claw Machine & Quest Center"
              : "算力金库阶梯提现 · 3D 灵龙抓娃娃机 × 反常识彩蛋任务中心"}
          </h2>
        </div>

        {/* Wallet Counters */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2 text-center">
            <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
              {isEn ? "API Gateway Live Points" : "API 网关真实可扣费积分"}
            </div>
            <div
              className="text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-300"
              data-testid="gateway-live-points"
            >
              💳{" "}
              {serverBalancePoints !== null
                ? serverBalancePoints.toLocaleString()
                : Math.round((state.deepseekUnlockedUsd + state.flagshipUnlockedUsd) * POINTS_PER_USD).toLocaleString()}
              {lastServerCredit && !lastServerCredit.duplicate && lastServerCredit.grantedPoints !== 0 ? (
                <span className="ml-1.5 rounded-full bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                  {lastServerCredit.grantedPoints > 0 ? `+${lastServerCredit.grantedPoints}` : lastServerCredit.grantedPoints}
                </span>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2 text-center">
            <div className="text-[11px] font-medium text-amber-900 dark:text-amber-200">
              {isEn ? "Arcade Tokens (10 Pts/Token)" : "游乐场抓娃娃币（10分/币）"}
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <span
                className="text-lg font-black tabular-nums text-amber-700 dark:text-amber-300"
                data-testid="arcade-token-count"
              >
                🎟️ {state.arcadeTokens}
              </span>
              <button
                type="button"
                onClick={() => handleBuyTokens(1)}
                data-testid="arcade-buy-token-1"
                className="rounded-lg bg-amber-500 px-2 py-0.5 text-[10px] font-black text-slate-950 shadow-2xs transition hover:brightness-105"
              >
                {isEn ? "+1 Token (10 Pts)" : "🪙 10积分兑1币"}
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-muted/40 px-3.5 py-2 text-center">
            <div className="text-[11px] font-medium text-muted-foreground">
              {isEn ? "Star Beans" : "灵龙灵感星豆"}
            </div>
            <div className="text-lg font-black tabular-nums text-foreground">🪙 {starBeans}</div>
          </div>
          <div className="rounded-2xl border border-border bg-muted/40 px-3.5 py-2 text-center">
            <div className="text-[11px] font-medium text-muted-foreground">
              {isEn ? "Spend Points in Market" : "市场花积分买工作流"}
            </div>
            <div className="mt-0.5 flex items-center justify-center gap-1.5">
              <span className="text-xs font-bold tabular-nums text-muted-foreground">
                🧊{state.tripoFreeVouchers} 🛠️{state.marketDiscountVouchers}
              </span>
              <Link
                href="/market"
                data-testid="arcade-go-market"
                className="rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white shadow-2xs transition hover:bg-emerald-500 dark:bg-emerald-400 dark:text-slate-950"
              >
                {isEn ? "🛒 Go Market →" : "🛒 去市场花积分 →"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Normal-Distribution (100~150 Pts) + Low-Prob Koi Jackpot Summary & Live Broadcast Ticker */}
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-3.5 py-2 text-xs">
          <div>
            <span className="font-bold text-emerald-800 dark:text-emerald-300">
              📊 {isEn ? "90% Normal Distribution N(125, 10²) · 100–150 Pts/Student" : "正态分布普惠算力 N(125, 10²) · 90% 学生稳拿 100~150 积分"}
            </span>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {isEn
                ? "50 Pts instant onboarding + 50–100 Pts progressive daily check-ins, VibeHub reading & claw pulls ($10–$15 APIC quota)."
                : "破冰问卷立得 50 积分 + 每日打卡/阅读/抓娃娃阶梯提现 50~100 积分（折合 $10~$15 APIC 真实模型额度）。"}
            </p>
          </div>
          <span className="shrink-0 rounded-lg bg-emerald-500/15 px-2 py-1 text-[11px] font-black tabular-nums text-emerald-700 dark:text-emerald-300">
            {deepseekPct}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-2 text-xs">
          <div>
            <span className="font-bold text-amber-800 dark:text-amber-300">
              👑 {isEn ? "Low-Prob Koi Jackpot · 0.1% 1,000 Pts (¥100) + 10-Pull Pity" : "低概率天选锦鲤大奖 · 0.1% 暴击 1000 积分 (¥100) + 十连保底"}
            </span>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {isEn
                ? "Every claw drop is 100% win: 0.1% SP Koi (1,000 Pts), 0.9% UR Dragon Egg (300 Pts), 4% SSR 4090 Cookie (80 Pts)."
                : "每次下爪 100% 必中算力胶囊：0.1% SP 锦鲤(1000分)、0.9% UR 龙蛋(300分)、4% SSR 4090饼干(80分)。"}
            </p>
          </div>
          <span className="shrink-0 rounded-lg bg-amber-500/15 px-2 py-1 text-[11px] font-black tabular-nums text-amber-800 dark:text-amber-300">
            {flagshipPct}%
          </span>
        </div>

        {/* Live Koi & Jackpot Broadcast Ticker + One-Click Brag Card */}
        <div
          data-testid="arcade-jackpot-ticker"
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-emerald-500/10 px-3.5 py-2 text-xs md:col-span-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-slate-950">
              🎉 {isEn ? "LIVE KOI FEED" : "实时欧皇播报"}
            </span>
            <span className="font-medium text-foreground">
              {isEn
                ? "👑 @cau_agr*** hit [SP Mythic Koi +1,000 Pts (¥100)] · 🐉 @lin_b*** pulled [UR Dragon Egg +300 Pts] · 💎 @zhao_*** won [SSR 4090 Cookie +80 Pts]"
                : "👑 @cau_agr*** 抓中【SP 天选锦鲤 +1000积分 (¥100)】 · 🐉 @lin_b*** 转出【UR 紫金龙蛋 +300积分】 · 💎 @zhao_*** 解锁【SSR 4090饼干 +80积分】"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const unlockedPoints = Math.round((state.deepseekUnlockedUsd + state.flagshipUnlockedUsd) * POINTS_PER_USD);
              const prizeLabel = lastWonPrize
                ? `${lastWonPrize.icon} [${lastWonPrize.rarity}] ${isEn ? lastWonPrize.nameEn : lastWonPrize.nameZh}`
                : isEn
                  ? "🎁 100–150 Free Compute Points"
                  : "🎁 100~150 普惠算力积分";
              const shareText = isEn
                ? `【ANS × CAU 3D Compute Arcade Report】I just unlocked ${prizeLabel} (Total ${unlockedPoints} Pts) at ANS! 90% of users get 100–150 free pts + 0.1% shot at 1,000-pt Mythic Koi 👉 https://ans.cauai.fun/workspace/benefits`
                : `【ANS × 中国农大 3D 算力游乐场 · 欧皇战报】我刚在 ANS 灵龙抓娃娃机收获了「${prizeLabel}」（累计已解锁 ${unlockedPoints} 积分）！全站免费领 100~150 积分，更有 0.1% 概率暴击 1000 积分（¥100）神话锦鲤 👉 https://ans.cauai.fun/workspace/benefits`;
              if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                void navigator.clipboard.writeText(shareText).catch(() => {});
              }
              setBannerMessage(
                isEn
                  ? "🏆 Brag report copied to clipboard! Share it with your lab or group chat!"
                  : "🏆 欧皇战报已复制到剪贴板！快发到农大社群/实验室群晒出欧气吧！",
              );
            }}
            className="shrink-0 rounded-xl border border-amber-500/40 bg-background px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-2xs transition hover:bg-amber-500/15 dark:text-amber-300"
          >
            🏆 {isEn ? "Copy Brag Card" : "一键复制欧皇战报"}
          </button>
        </div>
      </div>

      {/* Live Toast / Status Banner */}
      {bannerMessage && (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-foreground sm:text-sm"
        >
          <span>{bannerMessage}</span>
          <div className="flex shrink-0 items-center gap-2">
            {isGuest && (
              <Link
                href="/login?callbackUrl=%2Fworkspace%2Fbenefits"
                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-black text-white shadow-2xs hover:bg-emerald-500"
              >
                {isEn ? "🔐 Sign In to Credit Points →" : "🔐 立即登录入账 →"}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setBannerMessage("")}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              {isEn ? "Dismiss" : "收起"}
            </button>
          </div>
        </div>
      )}

      {/* Main Split Grid: Left = 3D Claw Machine / Starlight Roulette Pod, Right = 4-Tab Gamified Quest Center */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Left Column (5 cols): 3D Claw Machine, Starlight Roulette & 4-View .glb Studio */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-muted/20 p-4 lg:col-span-5">
          <div>
            {/* Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex flex-wrap rounded-xl border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => setArcadeMode("claw")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    arcadeMode === "claw"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isEn ? "🕹️ 3D Dino Claw" : "🕹️ 3D 灵龙抓娃娃机"}
                </button>
                <button
                  type="button"
                  onClick={() => setArcadeMode("roulette")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    arcadeMode === "roulette"
                      ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-400 dark:text-slate-950"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isEn ? "🎡 Starlight Roulette" : "🎡 丰收星轨大转盘"}
                </button>
                <button
                  type="button"
                  data-testid="arcade-mode-glb"
                  onClick={() => setArcadeMode("glb")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    arcadeMode === "glb"
                      ? "bg-cyan-600 text-white shadow-sm dark:bg-cyan-400 dark:text-slate-950"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isEn ? "🧊 4-View + .glb 3D" : "🧊 四视图 + .glb 3D 舱"}
                </button>
              </div>
              <span className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[11px] font-bold text-purple-800 dark:text-purple-200">
                {isEn ? `SSR/UR/SP Pity: ${state.pityCounter}/10` : `十连保底 SSR/UR/SP：${state.pityCounter}/10`}
              </span>
            </div>

            {arcadeMode === "claw" ? (
              /* 3D Cyber-Agri Claw Machine Cabinet */
              <div className="mt-3">
                <div className="relative h-64 w-full overflow-hidden rounded-2xl border-2 border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100 shadow-inner">
                  {/* Top Neon Header */}
                  <div className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/55 px-3 py-1.5 text-[10px] font-bold text-amber-300">
                    <span>
                      {isEn
                        ? "TRIPO v3.1 MULTIVIEW .GLB RIG · 6 MODELS ACTIVE"
                        : "TRIPO v3.1 四视图 .GLB 实装 · 6 大 3D 资产已挂载"}
                    </span>
                    <span className="text-emerald-300">
                      {isEn ? `Locked: ${targetCapsule.labelEn}` : `已瞄准：${targetCapsule.labelZh}`}
                    </span>
                  </div>

                  {/* Pure 3D .glb Canvas Viewport (Cabinet + 7 3D Capsules + 3-Prong 3D Claw Arm) */}
                  <DinoClaw3DViewport
                    clawX={clawX}
                    clawZ={clawZ}
                    clawPhase={clawPhase}
                    targetedCapsuleId={targetCapsule.id}
                    onSelectCapsule={cap => {
                      if (clawPhase === "idle") {
                        setClawX(cap.x);
                        setClawZ(cap.z);
                      }
                    }}
                  />
                </div>

                {/* Quick Target Selector Pills for the 3D Capsules */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1">
                  {INITIAL_CAPSULES.map(cap => {
                    const isTargeted = cap.id === targetCapsule.id;
                    return (
                      <button
                        key={cap.id}
                        type="button"
                        onClick={() => {
                          if (clawPhase === "idle") {
                            setClawX(cap.x);
                            setClawZ(cap.z);
                          }
                        }}
                        className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold transition ${
                          isTargeted
                            ? "border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cap.icon} {cap.shortTag}
                      </button>
                    );
                  })}
                </div>

                {/* Joystick & Drop Claw Controls */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveClaw(-12, 0)}
                      className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      ◀ {isEn ? "Left" : "左移"}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveClaw(12, 0)}
                      className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      {isEn ? "Right" : "右移"} ▶
                    </button>
                    <button
                      type="button"
                      onClick={() => moveClaw(0, -12)}
                      className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      ▲ {isEn ? "Back" : "前推"}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveClaw(0, 12)}
                      className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      ▼ {isEn ? "Front" : "后拉"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleClawDrop}
                    disabled={clawPhase !== "idle"}
                    data-testid="claw-drop-button"
                    className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-black text-slate-950 shadow-sm transition hover:brightness-105 disabled:opacity-50"
                  >
                    {clawPhase === "idle"
                      ? state.arcadeTokens > 0
                        ? isEn
                          ? "🕹️ DROP CLAW (1 Token · 100% Win)"
                          : "🕹️ 投币下爪抓取（耗 1 币 · 100% 必中算力）"
                        : isEn
                          ? "🪙 SPEND 10 PTS & DROP CLAW (100% Win)"
                          : "🪙 花 10 积分投币下爪（100% 必中 · 冲 1000分 锦鲤）"
                      : isEn
                        ? "⚙️ Claw Grabbing Capsule..."
                        : "⚙️ 机械爪正在抓起盲盒胶囊..."}
                  </button>
                </div>
              </div>
            ) : arcadeMode === "roulette" ? (
              /* Starlight Roulette Mode */
              <div className="mt-3">
                <div className="relative flex h-64 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-800 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 p-4 text-slate-100">
                  {/* Top Pointer Needle */}
                  <div className="z-20 -mb-2 flex flex-col items-center">
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-slate-950 shadow">
                      ▼ {isEn ? "WIN POINTER" : "中奖指针"} ▼
                    </span>
                  </div>

                  {/* 5-Sector Conic-Gradient Wheel with Counter-Rotated Upright Badges */}
                  <div
                    className="relative flex h-44 w-44 items-center justify-center rounded-full border-4 border-amber-400/80 shadow-2xl transition-transform duration-700 ease-out"
                    style={{
                      transform: `rotate(${wheelAngle}deg)`,
                      background:
                        "conic-gradient(from -36deg, #9f1239 0deg 72deg, #4c1d95 72deg 144deg, #065f46 144deg 216deg, #78350f 216deg 288deg, #1e3a8a 288deg 360deg)",
                    }}
                  >
                    {ARCADE_PRIZES.map((prize, idx) => {
                      const angle = idx * (360 / ARCADE_PRIZES.length);
                      const rad = (angle - 90) * (Math.PI / 180);
                      const tx = Math.round(Math.cos(rad) * 58);
                      const ty = Math.round(Math.sin(rad) * 58);
                      return (
                        <div
                          key={prize.id}
                          style={{
                            transform: `translate(${tx}px, ${ty}px) rotate(${-wheelAngle}deg)`,
                          }}
                          className="absolute flex flex-col items-center text-center transition-transform duration-700 ease-out"
                        >
                          <span className="text-lg leading-none drop-shadow">{prize.icon}</span>
                          <span className="mt-0.5 rounded bg-slate-950/90 px-1.5 py-0.5 text-[8px] font-black text-amber-200 ring-1 ring-amber-400/40">
                            {prize.rarity} · {Math.round(prize.unlockUsd * POINTS_PER_USD)}分
                          </span>
                        </div>
                      );
                    })}
                    <div className="z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-300 bg-slate-950 text-[11px] font-black text-amber-300 shadow">
                      ANS
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-300">
                    {isEn
                      ? "100% Win Rate · 0.1% Mythic 1,000 Pts Jackpot & 0.9% UR 300 Pts!"
                      : "100% 必中 · 更有 0.1% 天选锦鲤 1000 积分 & 0.9% UR 龙蛋 300 积分大奖！"}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRouletteSpin(1)}
                    disabled={isSpinning}
                    data-testid="roulette-spin-1"
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:brightness-105 disabled:opacity-50 dark:bg-emerald-400 dark:text-slate-950"
                  >
                    {state.arcadeTokens > 0
                      ? isEn
                        ? "🎡 Spin 1x (1 Token)"
                        : "🎡 单抽星轨转盘（耗 1 币）"
                      : isEn
                        ? "🪙 Spend 10 Pts & Spin 1x"
                        : "🪙 花 10 积分单抽转盘"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRouletteSpin(5)}
                    disabled={isSpinning}
                    data-testid="roulette-spin-5"
                    className="rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-3 py-2 text-xs font-black text-white shadow-sm hover:brightness-105 disabled:opacity-50"
                  >
                    {isEn ? "⚡ 5x Burst Spin" : "⚡ 五连暴击转盘（速冲保底）"}
                  </button>
                </div>
              </div>
            ) : (
              /* Tripo Four-View + Native .glb 3D Model Studio */
              (() => {
                const activeGlb =
                  TRIPO_GLB_ASSETS.find(item => item.id === selectedGlbId) ?? TRIPO_GLB_ASSETS[0];
                return (
                  <div className="mt-3 space-y-2.5" data-testid="tripo-glb-studio">
                    {/* 6 Asset Selector Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {TRIPO_GLB_ASSETS.map(asset => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => setSelectedGlbId(asset.id)}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                            selectedGlbId === asset.id
                              ? "border-cyan-600 bg-cyan-500/15 text-cyan-900 dark:border-cyan-400 dark:text-cyan-200"
                              : "border-border bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {asset.icon} {asset.id}.glb
                        </button>
                      ))}
                    </div>

                    {/* Side-by-Side: Left = Native Canvas 3D .glb Turntable, Right = OpenLux 2x2 Four-View Sheet */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <GlbInteractiveTurntable asset={activeGlb} isEn={isEn} />

                      <div className="relative flex h-52 flex-col justify-between overflow-hidden rounded-xl border border-amber-500/40 bg-white p-2 text-slate-900">
                        <div className="flex items-center justify-between rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          <span>{isEn ? "OpenLux 2×2 Four-View" : "OpenLux 2×2 正交四视图"}</span>
                          <span>F/B/L/R</span>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeGlb.sheetUrl}
                          alt={isEn ? activeGlb.nameEn : activeGlb.nameZh}
                          className="mx-auto my-auto h-36 w-36 object-contain"
                        />
                        <div className="text-center text-[10px] font-medium text-slate-500">
                          {isEn ? "Front · Back · Left · Right" : "左上正 · 右上背 · 左下左 · 右下右"}
                        </div>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="rounded-xl border border-border bg-background p-2.5 text-[11px]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-foreground">
                          {activeGlb.icon} {isEn ? activeGlb.nameEn : activeGlb.nameZh}
                        </span>
                        <a
                          href={activeGlb.glbUrl}
                          download={`${activeGlb.id}.glb`}
                          className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-bold text-cyan-800 hover:bg-cyan-500/20 dark:text-cyan-300"
                        >
                          ⬇ {isEn ? `Download ${activeGlb.id}.glb` : `下载 ${activeGlb.id}.glb`}
                        </a>
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        Tripo v3.1 Task: <code>{activeGlb.tripoTaskId.slice(0, 18)}...</code> · SHA256:{" "}
                        <code>{activeGlb.sha256Prefix}</code> · {activeGlb.vertexCount} verts
                      </div>
                      <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground" title={activeGlb.promptZh}>
                        Prompt: {activeGlb.promptZh}
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

            {/* Spend Points Bar: Buy Tokens with Points OR Spend in Marketplace */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-[11px]">
              <span className="font-bold text-foreground">
                {isEn ? "💡 Spend Points:" : "💡 积分怎么花："}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleBuyTokens(1)}
                  className="rounded-lg border border-amber-500/40 bg-background px-2 py-1 font-bold text-amber-800 hover:bg-amber-500/15 dark:text-amber-300"
                >
                  {isEn ? "🪙 10 Pts → +1 Token" : "🪙 10积分兑1币"}
                </button>
                <button
                  type="button"
                  onClick={() => handleBuyTokens(5)}
                  data-testid="arcade-buy-token-5"
                  className="rounded-lg border border-amber-500/40 bg-background px-2 py-1 font-bold text-amber-800 hover:bg-amber-500/15 dark:text-amber-300"
                >
                  {isEn ? "🪙 50 Pts → +5 Tokens" : "🪙 50积分兑5币"}
                </button>
                <Link
                  href="/market"
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 font-bold text-white hover:bg-emerald-500 dark:bg-emerald-400 dark:text-slate-950"
                >
                  {isEn ? "🛒 Spend in Market →" : "🛒 去市场花积分 →"}
                </Link>
              </div>
            </div>
          </div>

          {/* Prize Pool & Latest Pull Card */}
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            {lastWonPrize && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
                <div className="font-black text-amber-800 dark:text-amber-300">
                  {lastWonPrize.icon} [{lastWonPrize.rarity}] {isEn ? lastWonPrize.nameEn : lastWonPrize.nameZh}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {isEn ? lastWonPrize.descEn : lastWonPrize.descZh}
                </div>
              </div>
            )}
            <div className="text-[11px] font-medium text-muted-foreground">
              {isEn
                ? "Jackpot & Capsule Pool: 👑 SP Mythic Koi (1,000 Pts, 0.1%) · 🐉 UR Dragon Egg (300 Pts, 0.9%) · 🔋 SSR 4090 Cookie (80 Pts + 3D Voucher, 4%) · 🌾 SR Golden Wheat (15 Pts, 30%) · 🦖 R Mint Dino (10 Pts, 65%)"
                : "奖池概率公示：👑 SP 天选锦鲤(1000分 ≈ ¥100, 0.1%) · 🐉 UR 紫金龙蛋(300分 ≈ ¥30, 0.9%) · 🔋 SSR 4090饼干(80分+3D券, 4%) · 🌾 SR 黄金麦穗(15分+市场券, 30%) · 🦖 R 薄荷星龙(10分保底, 65%)"}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): 4-Tab Gamified Quest & Counter-Intuitive Easter Egg Center */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-muted/20 p-4 lg:col-span-7">
          <div>
            {/* Category Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    {
                      id: "daily",
                      labelZh: "📅 每日活跃任务",
                      labelEn: "📅 Daily Quests",
                    },
                    {
                      id: "weekly",
                      labelZh: "🛠️ 每周与市场变现",
                      labelEn: "🛠️ Weekly & Market",
                    },
                    {
                      id: "agri",
                      labelZh: "🌾 农客松 M1-M4 (+60分)",
                      labelEn: "🌾 AgriHackathon M1-M4",
                    },
                    {
                      id: "secret",
                      labelZh: `🦖 6大反常识彩蛋 (${unlockedSecretCount}/6)`,
                      labelEn: `🦖 6 Secret Easter Eggs (${unlockedSecretCount}/6)`,
                    },
                  ] as const
                ).map(tabItem => (
                  <button
                    key={tabItem.id}
                    type="button"
                    onClick={() => setActiveCategory(tabItem.id)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                      activeCategory === tabItem.id
                        ? "border-foreground bg-foreground text-background shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isEn ? tabItem.labelEn : tabItem.labelZh}
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                {isEn ? `🔥 Streak: ${state.streakDays} Day(s)` : `🔥 连续备赛打卡：${state.streakDays} 天`}
              </span>
            </div>

            {/* Quest Cards List */}
            <div className="mt-3 space-y-2.5">
              {filteredQuests.map(quest => {
                const claimed = isQuestClaimedToday(state, quest);
                const progress = state.questProgress[quest.id] ?? 0;
                const pts = quest.unlockUsd * POINTS_PER_USD;

                return (
                  <div
                    key={quest.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 transition ${
                      claimed
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-border bg-background hover:border-amber-500/40"
                    }`}
                  >
                    <div className="min-w-[220px] flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg">{quest.icon}</span>
                        <h4 className="text-sm font-bold text-foreground">
                          {isEn ? quest.titleEn : quest.titleZh}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            quest.unlockPool === "flagship"
                              ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                              : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                          }`}
                        >
                          +${quest.unlockUsd} ({pts} {isEn ? "pts" : "积分"})
                        </span>
                        <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:text-purple-200">
                          {quest.rewardTokens > 0 ? `+${quest.rewardTokens}🎟️ ` : ""}+{quest.rewardStarBeans}🪙
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {isEn ? quest.descEn : quest.descZh}
                      </p>
                      {(quest.hintZh || quest.hintEn) && (
                        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                          💡 {isEn ? quest.hintEn : quest.hintZh}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {quest.id === "daily_vibehub_read" && !claimed && (
                        <button
                          type="button"
                          onClick={() => setVibeTimerRunning(true)}
                          disabled={vibeTimerRunning}
                          className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-800 hover:bg-cyan-500/20 dark:text-cyan-200"
                        >
                          {vibeTimerRunning
                            ? `⏱️ ${state.vibehubReadSeconds}s / 60s...`
                            : isEn
                              ? "⚡ Start 60s Timer"
                              : "⚡ 启动 60 秒沉浸计时"}
                        </button>
                      )}

                      {quest.href && (
                        <Link
                          href={quest.href}
                          className="rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                        >
                          {isEn ? "Go →" : "前往 →"}
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => handleClaimQuest(quest)}
                        disabled={claimed}
                        data-testid={`claim-quest-${quest.id}`}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                          claimed
                            ? "cursor-default border border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                            : "bg-emerald-600 text-white shadow-sm hover:brightness-105 dark:bg-emerald-400 dark:text-slate-950"
                        }`}
                      >
                        {claimed
                          ? isEn
                            ? "✓ Unlocked"
                            : "✓ 已解锁入账"
                          : progress > 0 && quest.targetCount > 1
                            ? `${isEn ? "Claim" : "打卡领奖"} (${Math.min(progress, quest.targetCount)}/${quest.targetCount})`
                            : isEn
                              ? "Unlock & Claim"
                              : "一键打卡提现"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Note: Anti-Abuse & Model Scope Protection */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
            <span>
              {isEn
                ? "🛡️ Anti-Abuse Guard: Unlocked welfare points are strictly scoped to their designated models (DeepSeek V4.1 Flash / Flagship Trio) and cannot be transferred."
                : "🛡️ 防薅风控说明：福利金库解锁的积分严格绑定对应模型（DeepSeek V4.1 Flash / 农客松三大旗舰模型），不可跨池混用或转赠提现。"}
            </span>
            <Link
              href="/competitions/agrihackathon"
              className="font-bold text-emerald-700 hover:underline dark:text-emerald-300"
            >
              {isEn ? "View CAU AgriHackathon Hub →" : "前往中国农大农客松赛事大厅 →"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
