# WebGL / Three.js 长毛宠物实时毛发与物理眼神着色配方

## 1. Kajiya-Kay 各向异性发丝切向高光 + 暖金次表面边缘光

```ts
export function enhanceFurMaterialWithKajiyaKay(baseMat: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  const mat = baseMat.clone()
  mat.roughness = 0.82
  mat.metalness = 0.0
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `
      #include <lights_fragment_end>
      vec3 viewDirFur = normalize(vViewPosition);
      vec3 normFur = normalize(normal);
      vec3 strandTangent = normalize(cross(normFur, vec3(1.0, 0.2, 0.0)));
      vec3 halfVecFur = normalize(vec3(0.45, 0.72, 0.52) + viewDirFur);
      float dotTH = clamp(dot(strandTangent, halfVecFur), -1.0, 1.0);
      float sinTH = sqrt(max(0.0, 1.0 - dotTH * dotTH));
      float kajiyaSpec = pow(sinTH, 36.0) * 0.16;
      float furRim = pow(1.0 - max(dot(normFur, viewDirFur), 0.0), 3.2) * 0.24;
      reflectedLight.directSpecular += vec3(1.0, 0.95, 0.88) * kajiyaSpec;
      reflectedLight.indirectDiffuse += vec3(1.0, 0.88, 0.72) * furRim;
      `,
    )
  }
  mat.customProgramCacheKey = () => 'ans-kajiya-fur-v1'
  return mat
}
```

## 2. Skinned Shell Fur 多层体积毛发壳层实例化

将主蒙皮网格克隆为 2～3 层沿法向外扩 `2.4mm ~ 4.8mm` 的半透明高频噪声镂空毛尖壳层，并共享同一个 `THREE.Skeleton`：

```ts
for (const [layerRatio, offsetMeters] of [
  [0.45, 0.0024],
  [0.85, 0.0048],
] as const) {
  const shellMat = createFurShellMaterial(coatTexture, layerRatio, offsetMeters)
  const shellMesh = new THREE.SkinnedMesh(baseSkinned.geometry, shellMat)
  shellMesh.bind(baseSkinned.skeleton, baseSkinned.bindMatrix)
  shellMesh.frustumCulled = false
  baseSkinned.parent?.add(shellMesh)
}
```

## 3. 眼角膜清漆高光与湿润鼻头材质替换

```ts
if (stdMat.name === 'Malamute_Cornea_Eyes') {
  mesh.material = new THREE.MeshPhysicalMaterial({
    map: stdMat.map,
    roughness: 0.05,
    metalness: 0.0,
    ior: 1.48,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.5,
  })
} else if (stdMat.name === 'Malamute_Wet_Nose') {
  mesh.material = new THREE.MeshPhysicalMaterial({
    map: stdMat.map,
    roughness: 0.16,
    metalness: 0.0,
    clearcoat: 0.78,
    clearcoatRoughness: 0.14,
  })
}
```
