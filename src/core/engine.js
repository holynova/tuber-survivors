import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { spawnModel } from '../assets/models.js';

export const ARENA = 33; // 半边长 (66x66)

function gridTexture(size = 512, cells = 8, line = 'rgba(77,232,255,0.55)', bg = '#070b14') {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  if (bg !== 'transparent') {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
  }
  const step = size / cells;
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.shadowColor = line;
  ctx.shadowBlur = 8;
  for (let i = 0; i <= cells; i++) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
  }
  // 斑驳噪点
  ctx.shadowBlur = 0;
  for (let i = 0; i < 900; i++) {
    const a = Math.random() * 0.05;
    ctx.fillStyle = `rgba(120,180,255,${a})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export class Engine {
  constructor(canvas, { quality = 'high' } = {}) {
    this.quality = quality;
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070d);
    this.scene.fog = new THREE.Fog(0x05070d, 42, 96);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 320);
    this.camTarget = new THREE.Vector3(0, 0, 0);
    this.camOffset = new THREE.Vector3(0, 22, 13.5);
    this.lookAhead = new THREE.Vector3();

    this._setupLights();
    this._buildArena();
    this._setupComposer();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0x5f86c9, 0x0a0f1a, 0.75);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(18, 34, 12);
    key.castShadow = this.quality === 'high';
    if (key.castShadow) {
      key.shadow.mapSize.set(1024, 1024);
      const d = 42;
      key.shadow.camera.left = -d; key.shadow.camera.right = d;
      key.shadow.camera.top = d; key.shadow.camera.bottom = -d;
      key.shadow.camera.near = 1; key.shadow.camera.far = 90;
      key.shadow.bias = -0.0012;
      key.shadow.normalBias = 0.03;
    }
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x7a4dff, 0.7);
    rim.position.set(-20, 16, -22);
    this.scene.add(rim);

    const arenaLight = new THREE.PointLight(0x4de8ff, 90, 90, 2);
    arenaLight.position.set(0, 14, 0);
    this.scene.add(arenaLight);
    this.arenaLight = arenaLight;
  }

  _buildArena() {
    const S = ARENA;
    const group = new THREE.Group();
    this.arenaGroup = group;
    this.scene.add(group);

    // 外部深渊地板
    const voidFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x04060b, roughness: 1 }),
    );
    voidFloor.rotation.x = -Math.PI / 2;
    voidFloor.position.y = -0.12;
    voidFloor.receiveShadow = true;
    group.add(voidFloor);

    // 主战场地面 (PBR 金属板贴图, 异步加载)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xaebcd6,
      roughness: 0.82,
      metalness: 0.38,
      emissive: 0x0b2a3d,
      emissiveIntensity: 0.4,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(S * 2, S * 2), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);
    this.floor = floor;

    const tl = new THREE.TextureLoader();
    const prep = (tex, repeat, srgb) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat, repeat);
      tex.anisotropy = 4;
      if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };
    tl.load('textures/floor_diff.jpg', (t) => { floorMat.map = prep(t, 16, true); floorMat.needsUpdate = true; });
    tl.load('textures/floor_nor.jpg', (t) => { floorMat.normalMap = prep(t, 16, false); floorMat.normalScale.set(0.9, 0.9); floorMat.needsUpdate = true; });
    tl.load('textures/floor_rough.jpg', (t) => { floorMat.roughnessMap = prep(t, 16, false); floorMat.needsUpdate = true; });

    // 霓虹网格覆盖层 (发光线条, 保持竞技场视觉标识)
    const gridTex = gridTexture(512, 8, 'rgba(77,232,255,0.5)', 'transparent');
    gridTex.repeat.set(11, 11);
    const gridOverlay = new THREE.Mesh(
      new THREE.PlaneGeometry(S * 2, S * 2),
      new THREE.MeshBasicMaterial({
        map: gridTex, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    gridOverlay.rotation.x = -Math.PI / 2;
    gridOverlay.position.y = 0.02;
    group.add(gridOverlay);
    this.gridOverlay = gridOverlay;

    // 中央徽记
    const emblem = new THREE.Mesh(
      new THREE.RingGeometry(4.8, 5.05, 64),
      new THREE.MeshBasicMaterial({ color: 0x4de8ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    emblem.rotation.x = -Math.PI / 2;
    emblem.position.y = 0.05;
    group.add(emblem);
    this.emblem = emblem;

    // 边界墙 (墙面贴 PBR, 柱体保持纯色)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x131c2c, roughness: 0.5, metalness: 0.7 });
    const wallSurface = wallMat.clone();
    wallSurface.color.setHex(0x9aa8c2);
    tl.load('textures/floor_diff.jpg', (t) => {
      const wt = prep(t, 20, true);
      wt.repeat.set(20, 1);
      wallSurface.map = wt;
      wallSurface.needsUpdate = true;
    });
    tl.load('textures/floor_rough.jpg', (t) => {
      const wt = prep(t, 20, false);
      wt.repeat.set(20, 1);
      wallSurface.roughnessMap = wt;
      wallSurface.needsUpdate = true;
    });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x4de8ff });
    const glowMat2 = new THREE.MeshBasicMaterial({ color: 0xb06bff });
    const wallGeo = new THREE.BoxGeometry(S * 2 + 1.6, 2.6, 1.2);
    const stripGeo = new THREE.BoxGeometry(S * 2 + 1.6, 0.16, 1.3);
    for (let i = 0; i < 4; i++) {
      const wall = new THREE.Mesh(wallGeo, wallSurface);
      const strip = new THREE.Mesh(stripGeo, i % 2 ? glowMat2 : glowMat);
      const angle = (i * Math.PI) / 2;
      wall.position.set(Math.sin(angle) * S, 1.3, Math.cos(angle) * S);
      wall.rotation.y = angle;
      wall.castShadow = false;
      wall.receiveShadow = true;
      strip.position.copy(wall.position);
      strip.position.y = 2.66;
      strip.rotation.y = angle;
      group.add(wall, strip);
    }

    // 角柱(置于场外, 避免遮挡贴墙角色)
    const pillarGeo = new THREE.CylinderGeometry(0.9, 1.2, 4.4, 6);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const p = new THREE.Mesh(pillarGeo, wallMat);
        p.position.set(sx * (S + 1.6), 2.2, sz * (S + 1.6));
        p.castShadow = true;
        group.add(p);
        const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.75), new THREE.MeshBasicMaterial({ color: sx * sz > 0 ? 0x4de8ff : 0xff4d6d }));
        cap.position.set(sx * (S + 1.6), 5.0, sz * (S + 1.6));
        cap.userData.spin = true;
        group.add(cap);
        (this.spinners ??= []).push(cap);
      }
    }

    // 场外装饰道具 (外部 CC0 模型, 不影响玩法)
    const propList = [
      // 北侧 (远离相机): 高大物件
      { id: 'prop_gate', x: 0, z: -S - 2.4, yaw: 0 },
      { id: 'prop_container', x: -10, z: -S - 3.0, yaw: 0.25 },
      { id: 'prop_container_w', x: 10, z: -S - 3.0, yaw: -0.2 },
      { id: 'prop_pillar', x: -15.5, z: -S - 2.6, yaw: 0 },
      { id: 'prop_pillar', x: 15.5, z: -S - 2.6, yaw: 0 },
      { id: 'prop_computer', x: -4.5, z: -S - 3.4, yaw: 0.5 },
      { id: 'prop_barrels', x: 4.5, z: -S - 3.4, yaw: 0 },
      // 东西两侧
      { id: 'prop_dish', x: -S - 4.6, z: -4, yaw: 1.35 },
      { id: 'prop_barrier', x: -S - 3.6, z: 9, yaw: Math.PI / 2 },
      { id: 'prop_pipe', x: -S - 2.8, z: -12, yaw: Math.PI / 2 },
      { id: 'prop_rail', x: S + 2.4, z: -6, yaw: Math.PI / 2 },
      { id: 'prop_rail', x: S + 2.4, z: 6, yaw: Math.PI / 2 },
      { id: 'prop_container', x: S + 3.4, z: -14, yaw: Math.PI / 2 + 0.15 },
      { id: 'prop_barrel', x: S + 2.6, z: 12, yaw: 0 },
      // 南侧 (近相机): 只放矮物件, 遮挡风险低
      { id: 'prop_rocks', x: -12, z: S + 3.0, yaw: 0.4 },
      { id: 'prop_rocks', x: 11, z: S + 3.4, yaw: -0.7 },
      { id: 'prop_barrels', x: 1, z: S + 2.8, yaw: 0.2 },
    ];
    for (const p of propList) {
      const m = spawnModel(p.id);
      if (!m) continue;
      m.position.set(p.x, 0, p.z);
      m.rotation.y = p.yaw || 0;
      group.add(m);
    }
  }

  _setupComposer() {
    if (this.quality !== 'high') { this.composer = null; return; }
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.62, 0.42, 0.72);
    composer.addPass(this.bloom);
    composer.addPass(new OutputPass());
    this.composer = composer;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // 目标跟随 + 震动
  follow(target, vel, dt, shake) {
    this.lookAhead.set(vel.x * 0.26, 0, vel.z * 0.26);
    this.camTarget.lerp(
      new THREE.Vector3(target.x + this.lookAhead.x, 0, target.z + this.lookAhead.z),
      1 - Math.pow(0.0018, dt),
    );
    // 镜头保持在竞技场内, 边缘时角色滑向画面中心
    const lim = ARENA - 9.5;
    this.camTarget.x = Math.max(-lim, Math.min(lim, this.camTarget.x));
    this.camTarget.z = Math.max(-lim, Math.min(lim, this.camTarget.z));
    this.camera.position.copy(this.camTarget).add(this.camOffset).add(shake.offset);
    this.camera.lookAt(this.camTarget.x, 0.8, this.camTarget.z);
    this.camera.rotation.z += shake.rotZ;
  }

  render(dt, elapsed) {
    if (this.spinners) {
      for (const s of this.spinners) { s.rotation.y += dt * 1.2; s.rotation.x += dt * 0.6; s.position.y = 5.0 + Math.sin(elapsed * 2 + s.position.x) * 0.18; }
    }
    if (this.emblem) this.emblem.rotation.z += dt * 0.15;
    if (this.arenaLight) this.arenaLight.intensity = 90 + Math.sin(elapsed * 2.4) * 12;
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  project(v3, out = { x: 0, y: 0 }) {
    const v = v3.clone().project(this.camera);
    out.x = (v.x * 0.5 + 0.5) * window.innerWidth;
    out.y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    return out;
  }
}
