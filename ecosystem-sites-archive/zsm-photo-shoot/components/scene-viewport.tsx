"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { SceneDocument } from "@/app/lib/contracts";

const palette: Record<string, { sky: number; water: number; land: number; accent: number }> = {
  coast: { sky: 0xf0b890, water: 0x85a9aa, land: 0xb7aa8c, accent: 0xd48666 },
  oldtown: { sky: 0xd6c8ad, water: 0xa8b5aa, land: 0xb9aa91, accent: 0xb37d5f },
  alpine: { sky: 0xbac8b5, water: 0x8ca194, land: 0x8d9c86, accent: 0xc59773 },
};

function material(color: number, roughness = 0.92) {
  return new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
}

function addActor(group: THREE.Group, position: [number, number, number], color: number, yaw: number, heightOffset = 0, pose = "") {
  const actor = new THREE.Group();
  actor.position.set(...position);
  actor.position.y += heightOffset;
  actor.rotation.y = yaw;
  const skin = material(0xd9b99e);
  const clothes = material(color);
  const dark = material(0x524e49);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), skin);
  head.position.y = 1.65;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.42, 3, 7), clothes);
  torso.position.y = 1.12;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 0.22), dark);
  legs.position.y = 0.48;
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.38, 3, 6), clothes);
  arm.position.set(-0.26, 1.13, 0);
  arm.rotation.z = pose === "回眸" ? -0.72 : pose === "牵手" ? -0.48 : -0.2;
  const arm2 = arm.clone();
  arm2.position.x = 0.26;
  arm2.rotation.z = pose === "牵手" ? 0.48 : 0.2;
  actor.add(head, torso, legs, arm, arm2);
  group.add(actor);
}

function buildScene(scene: THREE.Scene, colors: (typeof palette)[string], world: THREE.Group, doc: SceneDocument) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(22, 20), material(colors.land));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.04;
  world.add(ground);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(22, 6), material(colors.water, 0.78));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.015, -7.6);
  world.add(water);

  const grid = new THREE.GridHelper(22, 22, 0x867e70, 0xa59b87);
  grid.position.y = 0.008;
  const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
  gridMaterials.forEach((item) => { (item as THREE.Material).transparent = true; (item as THREE.Material).opacity = 0.28; });
  world.add(grid);

  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 12), new THREE.MeshBasicMaterial({ color: colors.accent }));
  sun.position.set(-5.5, 5.5, -7.2);
  world.add(sun);

  for (let i = 0; i < 9; i++) {
    const height = 1.2 + ((i * 17) % 11) / 10;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.75 + (i % 3) * 0.22, height, 0.62), material(i % 2 ? 0xd0c4ad : 0xc1b59f));
    b.position.set(-7.2 + (i % 5) * 0.9, height / 2, -3.6 - Math.floor(i / 5) * 1.2);
    world.add(b);
  }
  for (let i = 0; i < 5; i++) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.7, 5), material(0x786553));
    trunk.position.set(5.5 + (i % 2) * 0.8, 0.35, -4 + i * 1.5);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + (i % 2) * 0.14, 0), material(0x82917c));
    crown.position.set(trunk.position.x, 1.14, trunk.position.z);
    world.add(trunk, crown);
  }

  doc.actors.forEach((actor, index) => addActor(world, actor.position, actor.outfit.includes("红") ? 0xb8574f : index === 0 ? 0xe9dfce : 0x8296a2, actor.rotationY, actor.heightOffset, actor.pose));
  scene.add(world);
}

export default function SceneViewport({ sceneId, document, shotIndex }: { sceneId: string; document: SceneDocument; shotIndex: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const shot = document.shots[shotIndex];

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    const colors = palette[sceneId] ?? palette.coast;
    scene.background = new THREE.Color(colors.sky);
    scene.fog = new THREE.Fog(colors.sky, 13, 30);
    const camera = new THREE.PerspectiveCamera(shot.camera.fov, 1, 0.1, 100);
    camera.position.set(...shot.camera.position);
    camera.lookAt(...shot.camera.target);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xfff3df, 0x756f62, 2.1));
    const key = new THREE.DirectionalLight(0xffdfbd, 2.6);
    key.position.set(-4, 8, 5);
    key.castShadow = true;
    scene.add(key);
    const world = new THREE.Group();
    buildScene(scene, colors, world, document);

    let width = 1;
    let height = 1;
    const resize = () => {
      width = Math.max(mount.clientWidth, 1);
      height = Math.max(mount.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let dragging = false;
    let lastX = 0;
    let rotation = 0;
    const pointerDown = (event: PointerEvent) => { dragging = true; lastX = event.clientX; renderer.domElement.setPointerCapture(event.pointerId); };
    const pointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      rotation += (event.clientX - lastX) * 0.006;
      lastX = event.clientX;
      world.rotation.y = rotation;
    };
    const pointerUp = () => { dragging = false; };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.position.multiplyScalar(event.deltaY > 0 ? 1.055 : 0.95);
      camera.position.clampLength(3.6, 12);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });
    let frame = 0;
    const render = () => { renderer.render(scene, camera); frame = requestAnimationFrame(render); };
    render();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("wheel", wheel);
      world.traverse((item) => {
        if (item instanceof THREE.Mesh) {
          item.geometry.dispose();
          if (Array.isArray(item.material)) item.material.forEach((m) => m.dispose());
          else item.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [sceneId, document, shot.camera.fov, shot.camera.position, shot.camera.target]);

  return <div className="viewport-canvas" ref={mountRef} role="img" aria-label={`三维概念场景预览：${document.title}，可拖动旋转，滚轮缩放`} />;
}
