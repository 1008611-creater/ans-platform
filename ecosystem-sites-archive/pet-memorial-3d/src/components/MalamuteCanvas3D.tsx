import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

import type { AccessoryId, PetActionId } from '../content/site'
import { playPetBarkSound, playChimeSound } from '../lib/ambient'

type Props = {
  mode: 'stage' | 'widget'
  activeAction: PetActionId
  activeAccessories: AccessoryId[]
  skeletonVisible?: boolean
  ballTriggerCount?: number
  soundOn?: boolean
  onPetInteract?: (zone: 'head' | 'paw' | 'body', reactionAction: PetActionId, msg: string) => void
}

const ACTION_TO_CLIP: Record<PetActionId, string> = {
  idle: 'Idle_Breathe',
  walk: 'Walk_Trot',
  run: 'Run_Bound',
  tilt: 'Head_Tilt',
  paw: 'Shake_Paw',
  bow: 'Play_Bow',
  ball: 'Run_Bound',
  rest: 'Rest_Watch',
}

/**
 * 为长毛阿拉斯加皮毛材质注入 Kajiya-Kay 各向异性发丝高光 + 暖金次表面边缘散射 Shader
 */
function enhanceFurMaterialWithKajiyaKay(baseMat: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  const mat = baseMat.clone()
  mat.roughness = 0.82
  mat.metalness = 0.0
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `
      #include <lights_fragment_end>
      // Kajiya-Kay strand tangent highlight & warm rim scattering for plush double-coat fur
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
  mat.customProgramCacheKey = () => 'malamute-kajiya-fur-v2'
  return mat
}

/**
 * 构建外层体积感毛发壳层 (Shell Fur Instancing，参考 GitHub Auxemite/Fur_rendering 与 Blender 纤维卡工艺)
 */
function createFurShellMaterial(
  baseMap: THREE.Texture | null,
  layerRatio: number,
  shellOffsetMeters: number,
): THREE.MeshStandardMaterial {
  const shellMat = new THREE.MeshStandardMaterial({
    map: baseMap,
    roughness: 0.9,
    metalness: 0.0,
    transparent: true,
    alphaTest: 0.15,
    depthWrite: false,
  })
  shellMat.onBeforeCompile = (shader) => {
    shader.uniforms.uShellOffset = { value: shellOffsetMeters }
    shader.uniforms.uLayerRatio = { value: layerRatio }
    shader.vertexShader =
      `
      uniform float uShellOffset;
      varying vec3 vFurLocalPos;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vFurLocalPos = position;
        // Extrude fur shell only along coat (skip nose/eyes/paws)
        float coatMask = smoothstep(0.08, 0.26, position.z) * (1.0 - smoothstep(0.38, 0.46, position.x));
        transformed += normalize(objectNormal) * (uShellOffset * coatMask);
        `,
      )
    shader.fragmentShader =
      `
      uniform float uLayerRatio;
      varying vec3 vFurLocalPos;
      float furHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      ` +
      shader.fragmentShader.replace(
        '#include <alphatest_fragment>',
        `
        vec2 strandGrid = floor(vFurLocalPos.xy * 260.0 + vFurLocalPos.yz * 190.0);
        float strandSeed = furHash(strandGrid);
        float tipThreshold = mix(0.25, 0.86, uLayerRatio);
        if (strandSeed < tipThreshold) discard;
        diffuseColor.a = (1.0 - uLayerRatio * 0.68) * 0.72;
        #include <alphatest_fragment>
        `,
      )
  }
  shellMat.customProgramCacheKey = () => `malamute-shell-fur-${layerRatio.toFixed(2)}`
  return shellMat
}

export function MalamuteCanvas3D({
  mode,
  activeAction,
  activeAccessories,
  skeletonVisible = false,
  ballTriggerCount = 0,
  soundOn = false,
  onPetInteract,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [heartBursts, setHeartBursts] = useState<Array<{ id: number; x: number; y: number; text: string }>>([])

  const actionRef = useRef<PetActionId>(activeAction)
  const accessoriesRef = useRef<AccessoryId[]>(activeAccessories)
  const skeletonRef = useRef<boolean>(skeletonVisible)
  const soundRef = useRef<boolean>(soundOn)
  const ballTriggerRef = useRef<number>(ballTriggerCount)
  const onInteractRef = useRef(onPetInteract)

  useEffect(() => {
    actionRef.current = activeAction
  }, [activeAction])

  useEffect(() => {
    accessoriesRef.current = activeAccessories
  }, [activeAccessories])

  useEffect(() => {
    skeletonRef.current = skeletonVisible
  }, [skeletonVisible])

  useEffect(() => {
    soundRef.current = soundOn
  }, [soundOn])

  useEffect(() => {
    onInteractRef.current = onPetInteract
  }, [onPetInteract])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const isWidget = mode === 'widget'
    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(
      isWidget ? 33 : 35,
      (container.clientWidth || 320) / (container.clientHeight || 320),
      0.05,
      30,
    )
    if (isWidget) {
      camera.position.set(0.0, 0.56, 1.78)
    } else {
      camera.position.set(0.0, 0.58, 2.08)
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth || 320, container.clientHeight || 320)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.18
    renderer.shadowMap.enabled = !isWidget
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.target.set(0, isWidget ? 0.44 : 0.36, 0)
    controls.minDistance = isWidget ? 1.1 : 1.05
    controls.maxDistance = isWidget ? 2.6 : 3.5
    controls.maxPolarAngle = Math.PI * 0.52
    controls.minPolarAngle = Math.PI * 0.14
    controls.enablePan = false

    // ---- 电影级三点式暖色棚拍布光 ----
    const hemiLight = new THREE.HemisphereLight(0xfff9f0, 0x28231e, 1.5)
    scene.add(hemiLight)

    const keyLight = new THREE.DirectionalLight(0xfff6ea, 2.2)
    keyLight.position.set(1.8, 2.8, 2.2)
    if (!isWidget) {
      keyLight.castShadow = true
      keyLight.shadow.mapSize.set(1024, 1024)
      keyLight.shadow.camera.near = 0.5
      keyLight.shadow.camera.far = 8
      const d = 1.1
      keyLight.shadow.camera.left = -d
      keyLight.shadow.camera.right = d
      keyLight.shadow.camera.top = d
      keyLight.shadow.camera.bottom = -d
      keyLight.shadow.bias = -0.0004
      keyLight.shadow.normalBias = 0.015
    }
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0xffb86c, 1.45)
    rimLight.position.set(-2.0, 1.9, -1.5)
    scene.add(rimLight)

    const eyeCatchLight = new THREE.PointLight(0xffffff, 0.95, 4)
    eyeCatchLight.position.set(0.35, 0.76, 1.45)
    scene.add(eyeCatchLight)

    // ---- 舞台旋转根组：将面向 +X 的狗狗旋转为面向观众左前方 3/4 黄金角度 ----
    const stageGroup = new THREE.Group()
    stageGroup.rotation.y = -Math.PI * 0.34
    scene.add(stageGroup)

    // ---- 舞台地面柔和接触阴影与发丝金环 ----
    let floorRing: THREE.LineLoop | null = null
    if (!isWidget) {
      const shadowGeo = new THREE.CircleGeometry(0.82, 64)
      const shadowMat = new THREE.MeshStandardMaterial({
        color: 0x141312,
        roughness: 0.94,
        metalness: 0.02,
        transparent: true,
        opacity: 0.72,
      })
      const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat)
      shadowDisc.rotation.x = -Math.PI / 2
      shadowDisc.position.y = 0.001
      shadowDisc.receiveShadow = true
      stageGroup.add(shadowDisc)

      const ringPts: THREE.Vector3[] = []
      for (let i = 0; i < 96; i += 1) {
        const a = (i / 96) * Math.PI * 2
        ringPts.push(new THREE.Vector3(Math.cos(a) * 0.74, 0.004, Math.sin(a) * 0.74))
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts)
      const ringMat = new THREE.LineBasicMaterial({
        color: 0xe8a855,
        transparent: true,
        opacity: 0.3,
      })
      floorRing = new THREE.LineLoop(ringGeo, ringMat)
      stageGroup.add(floorRing)
    }

    // ---- 环绕记忆萤火粒子 ----
    const particleCount = isWidget ? 24 : 56
    const pPositions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i += 1) {
      const r = 0.35 + Math.random() * 0.52
      const theta = Math.random() * Math.PI * 2
      pPositions[i * 3] = Math.cos(theta) * r
      pPositions[i * 3 + 1] = 0.08 + Math.random() * 0.88
      pPositions[i * 3 + 2] = Math.sin(theta) * r
    }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3))
    const pMat = new THREE.PointsMaterial({
      color: 0xf5c376,
      size: isWidget ? 0.02 : 0.017,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const fireflies = new THREE.Points(pGeo, pMat)
    stageGroup.add(fireflies)

    // ---- 照片 1 同款：3D 亮黄色互动小黄球 ----
    const ballGroup = new THREE.Group()
    const ballGeo = new THREE.SphereGeometry(0.05, 28, 28)
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xdcf02a,
      emissive: 0x5c6800,
      emissiveIntensity: 0.25,
      roughness: 0.52,
      metalness: 0.04,
    })
    const ballMesh = new THREE.Mesh(ballGeo, ballMat)
    ballMesh.castShadow = !isWidget
    ballGroup.add(ballMesh)
    const seamGeo = new THREE.TorusGeometry(0.0505, 0.0022, 8, 40)
    const seamMat = new THREE.MeshBasicMaterial({ color: 0xfefefe })
    const seamMesh = new THREE.Mesh(seamGeo, seamMat)
    seamMesh.rotation.y = Math.PI / 4
    ballGroup.add(seamMesh)
    ballGroup.position.set(0.36, 0.05, -0.14)
    stageGroup.add(ballGroup)

    // ---- 额外 2 件可选骨骼锚定饰品（crown 纪念皇冠、wings 星河光翼） ----
    const extraAccRoot = new THREE.Group()
    scene.add(extraAccRoot)

    const crownGroup = new THREE.Group()
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xf7d070,
      emissive: 0x6e4806,
      emissiveIntensity: 0.28,
      metalness: 0.85,
      roughness: 0.2,
      side: THREE.DoubleSide,
    })
    crownGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.038, 0.036, 16, 1, true), crownMat))
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.028, 8), crownMat)
      spike.position.set(Math.cos(a) * 0.042, 0.03, Math.sin(a) * 0.042)
      crownGroup.add(spike)
    }
    extraAccRoot.add(crownGroup)

    const wingsGroup = new THREE.Group()
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xffe4a8,
      emissive: 0xd98a2b,
      emissiveIntensity: 0.42,
      transparent: true,
      opacity: 0.62,
      roughness: 0.25,
      side: THREE.DoubleSide,
    })
    const leftWing = new THREE.Group()
    const rightWing = new THREE.Group()
    for (let f = 0; f < 3; f += 1) {
      const featherGeo = new THREE.ConeGeometry(0.038 - f * 0.006, 0.22 - f * 0.03, 5)
      const lf = new THREE.Mesh(featherGeo, wingMat)
      lf.position.set(-f * 0.03, 0.07 - f * 0.018, -0.13 - f * 0.025)
      lf.rotation.x = -0.65 - f * 0.15
      lf.rotation.z = 0.28 + f * 0.12
      lf.scale.set(0.32, 1, 1)
      leftWing.add(lf)

      const rf = new THREE.Mesh(featherGeo, wingMat)
      rf.position.set(-f * 0.03, 0.07 - f * 0.018, 0.13 + f * 0.025)
      rf.rotation.x = 0.65 + f * 0.15
      rf.rotation.z = 0.28 + f * 0.12
      rf.scale.set(0.32, 1, 1)
      rightWing.add(rf)
    }
    wingsGroup.add(leftWing)
    wingsGroup.add(rightWing)
    extraAccRoot.add(wingsGroup)

    // ---- 加载 Blender MCP 精修版 malamute_pro.glb（含修复的 36 骨骼 + 4 分区 PBR + 5 形态键 + 7 条 NLA 动作 + 4 件 Blender 蒙皮配饰） ----
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)

    let mixer: THREE.AnimationMixer | null = null
    const clipActions = new Map<string, THREE.AnimationAction>()
    let currentClipName = ''
    let skeletonHelper: THREE.SkeletonHelper | null = null
    let dogModel: THREE.Object3D | null = null
    const bodyMorphMeshes: THREE.Mesh[] = []
    const morphDict = new Map<string, number>()
    const blenderAccMap = new Map<AccessoryId, THREE.Object3D>()
    const boneByName = new Map<string, THREE.Object3D>()

    const switchAnimationClip = (targetAct: PetActionId) => {
      if (!mixer || clipActions.size === 0) return
      const desiredName = ACTION_TO_CLIP[targetAct] || 'Idle_Breathe'
      const nextAction = clipActions.get(desiredName) || clipActions.values().next().value
      if (!nextAction) return
      if (currentClipName === desiredName) {
        nextAction.timeScale = targetAct === 'ball' ? 1.35 : 1.0
        return
      }
      const prevAction = clipActions.get(currentClipName)
      nextAction.reset()
      nextAction.enabled = true
      nextAction.setEffectiveWeight(1)
      nextAction.timeScale = targetAct === 'ball' ? 1.35 : 1.0
      nextAction.play()
      if (prevAction && prevAction !== nextAction) {
        prevAction.crossFadeTo(nextAction, 0.35, false)
      }
      currentClipName = desiredName
    }

    loader.load(
      './models/malamute_pro.glb',
      (gltf) => {
        const root = gltf.scene
        dogModel = root

        let primarySkinnedMesh: THREE.SkinnedMesh | null = null
        let coatTexture: THREE.Texture | null = null

        root.traverse((obj) => {
          if (obj.name) {
            boneByName.set(obj.name, obj)
          }
          if (obj.name === 'Acc_StarTag') blenderAccMap.set('star-tag', obj)
          if (obj.name === 'Acc_PinkWindmill') blenderAccMap.set('windmill', obj)
          if (obj.name === 'Acc_WarmHalo') blenderAccMap.set('halo', obj)
          if (obj.name === 'Acc_RedBandana') blenderAccMap.set('bandana', obj)

          const mesh = obj as THREE.Mesh
          if (mesh.isMesh) {
            mesh.castShadow = !isWidget
            mesh.receiveShadow = !isWidget

            if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
              bodyMorphMeshes.push(mesh)
              for (const [k, idx] of Object.entries(mesh.morphTargetDictionary)) {
                morphDict.set(k, idx)
              }
            }

            const stdMat = mesh.material as THREE.MeshStandardMaterial
            if (stdMat && stdMat.name === 'Malamute_Coat_Fur') {
              coatTexture = stdMat.map
              mesh.material = enhanceFurMaterialWithKajiyaKay(stdMat)
              if ((mesh as THREE.SkinnedMesh).isSkinnedMesh && !primarySkinnedMesh) {
                primarySkinnedMesh = mesh as THREE.SkinnedMesh
              }
            } else if (stdMat && stdMat.name === 'Malamute_Cornea_Eyes') {
              mesh.material = new THREE.MeshPhysicalMaterial({
                map: stdMat.map,
                roughness: 0.05,
                metalness: 0.0,
                ior: 1.48,
                clearcoat: 1.0,
                clearcoatRoughness: 0.04,
                envMapIntensity: 1.5,
              })
            } else if (stdMat && stdMat.name === 'Malamute_Wet_Nose') {
              mesh.material = new THREE.MeshPhysicalMaterial({
                map: stdMat.map,
                roughness: 0.16,
                metalness: 0.0,
                clearcoat: 0.78,
                clearcoatRoughness: 0.14,
              })
            } else if (stdMat && stdMat.name === 'Malamute_Silver_Collar') {
              stdMat.metalness = 0.88
              stdMat.roughness = 0.2
            }
          }
        })

        // 为主毛发网格叠加 2 层轻量级实时体积毛发壳层 (Shell Fur Instancing)
        if (primarySkinnedMesh && coatTexture && !isWidget) {
          const baseSkinned = primarySkinnedMesh as THREE.SkinnedMesh
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
        }

        stageGroup.add(root)

        skeletonHelper = new THREE.SkeletonHelper(root)
        const skelMat = skeletonHelper.material as THREE.LineBasicMaterial
        skelMat.color.setHex(0xff6a3d)
        skelMat.linewidth = 2
        skeletonHelper.visible = skeletonRef.current
        scene.add(skeletonHelper)

        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(root)
          for (const clip of gltf.animations) {
            const act = mixer.clipAction(clip)
            clipActions.set(clip.name, act)
          }
          switchAnimationClip(actionRef.current)
        }

        setLoading(false)
      },
      (progress) => {
        if (progress.total > 0) {
          setLoadProgress(Math.min(99, Math.round((progress.loaded / progress.total) * 100)))
        }
      },
      (err) => {
        console.error('Failed to load malamute_pro.glb:', err)
        setLoading(false)
      },
    )

    // ---- 点击模型部位触发互动（摸头 -> 歪头杀，点前爪 -> 握手，点后背 -> 欢快邀玩） ----
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let downX = 0
    let downY = 0

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX
      downY = e.clientY
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!dogModel) return
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY)
      if (dist > 6) return

      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObject(dogModel, true)
      if (hits.length === 0) return

      const hitPoint = hits[0].point.clone()
      stageGroup.worldToLocal(hitPoint)

      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top

      if (hitPoint.y > 0.56 && hitPoint.x > 0.12) {
        if (soundRef.current) playPetBarkSound()
        setHeartBursts((prev) => [
          ...prev.slice(-4),
          { id: Date.now() + Math.random(), x: screenX, y: screenY, text: '♥ 歪头蹭蹭你' },
        ])
        onInteractRef.current?.(
          'head',
          'tilt',
          '（眯起琥珀色眼睛歪头蹭你的手心）你摸摸我的头，我就像回到那片阳光草坪啦！',
        )
      } else if (hitPoint.y < 0.36 && hitPoint.x > 0.02) {
        if (soundRef.current) playChimeSound()
        setHeartBursts((prev) => [
          ...prev.slice(-4),
          { id: Date.now() + Math.random(), x: screenX, y: screenY, text: '🐾 递给你大白爪' },
        ])
        onInteractRef.current?.(
          'paw',
          'paw',
          '（抬起蓬松的雪白前爪放到你手心）拉钩盖章，我永远是你的大狗狗！',
        )
      } else {
        if (soundRef.current) playChimeSound()
        setHeartBursts((prev) => [
          ...prev.slice(-4),
          { id: Date.now() + Math.random(), x: screenX, y: screenY, text: '✦ 欢快摇尾巴' },
        ])
        onInteractRef.current?.(
          'body',
          'bow',
          '（蓬松大尾巴摇成小风扇）再拍拍我的背，我们一起去追风车和小黄球吧！',
        )
      }
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerup', onPointerUp)

    const onResize = () => {
      if (!container) return
      const w = Math.max(container.clientWidth, 120)
      const h = Math.max(container.clientHeight, 120)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(container)

    const ballSim = {
      active: false,
      t: 0,
      lastTrigger: ballTriggerRef.current,
    }

    let raf = 0
    let prevTime = performance.now()
    let elapsed = 0
    let lastAct: PetActionId = actionRef.current

    const headWorldPos = new THREE.Vector3()
    const midBackWorldPos = new THREE.Vector3()
    const stageQuat = new THREE.Quaternion()

    const setMorphWeight = (name: string, weight: number) => {
      const idx = morphDict.get(name)
      if (idx === undefined) return
      const clamped = Math.max(0, Math.min(1, weight))
      for (const m of bodyMorphMeshes) {
        if (m.morphTargetInfluences && idx < m.morphTargetInfluences.length) {
          m.morphTargetInfluences[idx] = clamped
        }
      }
    }

    const tick = (now: number) => {
      const dt = Math.min((now - prevTime) / 1000, 0.05)
      prevTime = now
      elapsed += dt

      const act = actionRef.current
      const accs = accessoriesRef.current

      if (act !== lastAct) {
        lastAct = act
        switchAnimationClip(act)
      }

      if (skeletonHelper) {
        skeletonHelper.visible = skeletonRef.current
      }

      if (ballTriggerRef.current !== ballSim.lastTrigger) {
        ballSim.lastTrigger = ballTriggerRef.current
        ballSim.active = true
        ballSim.t = 0
        if (soundRef.current) playChimeSound()
      }

      if (mixer) {
        mixer.update(dt)
      }

      // ---- 驱动 Blender 5 大真实面部与呼吸形态键 (Shape Keys) ----
      if (bodyMorphMeshes.length > 0) {
        // 1. 温柔自然眨眼周期（每 3.8 秒快速眨眼一次，静眠态半闭眼）
        const blinkCycle = elapsed % 3.8
        const autoBlink = blinkCycle < 0.18 ? Math.sin((blinkCycle / 0.18) * Math.PI) : 0.0
        setMorphWeight('Eye_Blink', act === 'rest' ? 0.78 : autoBlink)

        // 2. 胸腔与颈圈长毛呼吸起伏
        const breathWave = 0.5 + 0.5 * Math.sin(elapsed * (act === 'run' ? 4.8 : 2.2))
        setMorphWeight('Chest_Breath', breathWave * 0.75)

        // 3. 快乐吐舌微笑喘气 (Smile_Pant)
        const smileBase = act === 'rest' ? 0.1 : act === 'bow' || act === 'run' || act === 'paw' ? 0.85 : 0.45
        const smilePant = smileBase + 0.15 * Math.sin(elapsed * 5.0)
        setMorphWeight('Smile_Pant', smilePant)

        // 4. 警觉立耳倾听 (Ear_Perk)
        const earPerk = act === 'tilt' || act === 'paw' || act === 'ball' ? 0.85 + 0.15 * Math.sin(elapsed * 3.2) : 0.25
        setMorphWeight('Ear_Perk', earPerk)

        // 5. 蓬松羽尾扬起 (Tail_Fluff)
        const tailFluff = act === 'rest' ? 0.1 : act === 'bow' || act === 'run' || act === 'paw' ? 0.9 : 0.5
        setMorphWeight('Tail_Fluff', tailFluff)
      }

      // ---- 切换 Blender 内嵌蒙皮配饰与扩展配饰显隐 ----
      for (const [accId, obj] of blenderAccMap.entries()) {
        obj.visible = accs.includes(accId)
      }

      if (dogModel) {
        dogModel.updateMatrixWorld(true)
        stageGroup.getWorldQuaternion(stageQuat)

        const bHead1 = boneByName.get('tripo::Head_1')
        const bBackMid = boneByName.get('tripo::0_Left_Limb_2')

        crownGroup.visible = accs.includes('crown')
        if (crownGroup.visible && bHead1) {
          bHead1.getWorldPosition(headWorldPos)
          crownGroup.position.copy(headWorldPos).add(new THREE.Vector3(0, 0.16, 0))
          crownGroup.quaternion.copy(stageQuat)
        }

        wingsGroup.visible = accs.includes('wings')
        if (wingsGroup.visible && bBackMid) {
          bBackMid.getWorldPosition(midBackWorldPos)
          wingsGroup.position.copy(midBackWorldPos).add(new THREE.Vector3(0, 0.04, 0))
          wingsGroup.quaternion.copy(stageQuat)
          const flap = Math.sin(elapsed * 3.6) * 0.16
          leftWing.rotation.x = flap
          rightWing.rotation.x = -flap
        }
      }

      // ---- 小黄球弹跳物理 ----
      if (act === 'ball' || ballSim.active) {
        ballSim.t += dt
        const bounceCycle = (elapsed * 2.6) % Math.PI
        const y = 0.05 + Math.abs(Math.sin(bounceCycle)) * 0.22
        const x = 0.36 + Math.sin(elapsed * 1.8) * 0.09
        const z = -0.12 + Math.cos(elapsed * 1.8) * 0.12
        ballGroup.position.set(x, y, z)
        ballMesh.rotation.z += dt * 5.0
        if (ballSim.t > 4.5 && act !== 'ball') {
          ballSim.active = false
        }
      } else {
        ballGroup.position.set(0.36, 0.05, -0.14)
        ballMesh.rotation.z += dt * 0.5
      }

      // ---- 萤火粒子升腾 ----
      const posAttr = pGeo.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < particleCount; i += 1) {
        let py = posAttr.getY(i) + dt * 0.04
        if (py > 0.98) py = 0.06
        posAttr.setY(i, py)
      }
      posAttr.needsUpdate = true
      fireflies.rotation.y = elapsed * 0.07

      if (floorRing) {
        floorRing.rotation.z = elapsed * 0.1
      }

      controls.update()
      renderer.render(scene, camera)
      raf = window.requestAnimationFrame(tick)
    }

    raf = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      controls.dispose()
      renderer.dispose()
    }
  }, [mode])

  useEffect(() => {
    if (heartBursts.length === 0) return
    const timer = window.setTimeout(() => {
      setHeartBursts((prev) => prev.slice(1))
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [heartBursts])

  return (
    <div className={`malamute-canvas malamute-canvas--${mode}`}>
      <div className="malamute-canvas__mount" ref={mountRef} />

      {loading && (
        <div className="malamute-canvas__loading">
          <span className="label">正在唤醒它 ({loadProgress}%)…</span>
        </div>
      )}

      <div className="malamute-canvas__bursts" aria-hidden="true">
        {heartBursts.map((b) => (
          <span
            key={b.id}
            className="malamute-canvas__burst label"
            style={{ left: `${b.x}px`, top: `${b.y}px` }}
          >
            {b.text}
          </span>
        ))}
      </div>
    </div>
  )
}
