import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ============ 模型资产清单 ============
// fit: 'h' = 按目标高度归一, 其余按最长边归一 (s)
// yaw: 归一化后绕 Y 轴的修正角
// center: true = 模型居中到原点 (否则底面贴 y=0)
// align: true = 把模型最长轴旋到 +Z (武器朝前), flip = 再绕 Y 转 180°
export const MANIFEST = {
  // ---- 玩家角色 (目标身高) ----
  char_buck: { file: 'char_buck', fit: 'h', s: 1.9, skinned: true },
  char_vera: { file: 'char_vera', fit: 'h', s: 1.85, skinned: true },
  char_karl: { file: 'char_karl', fit: 'h', s: 1.8, skinned: true },
  char_grosh: { file: 'char_grosh', fit: 'h', s: 1.7, skinned: true },
  char_tina: { file: 'char_tina', fit: 'h', s: 1.8, skinned: true },
  char_meryl: { file: 'char_meryl', fit: 'h', s: 1.8, skinned: true },

  // ---- 敌人 (烘焙成世界坐标尺寸, yaw 直接烘进几何) ----
  enemy_mite: { file: 'enemy_mite', h: 0.75, yaw: 0 },
  enemy_brute: { file: 'enemy_brute', h: 1.85, yaw: 0 },
  enemy_spitter: { file: 'enemy_spitter', h: 1.4, yaw: 0 },
  enemy_charger: { file: 'enemy_charger', h: 1.3, yaw: Math.PI },
  enemy_bomber: { file: 'enemy_bomber', h: 1.15, yaw: 0 },
  boss_brood: { file: 'boss_brood', h: 3.7, yaw: 0 },
  boss_tyrant: { file: 'boss_tyrant', h: 4.4, yaw: 0 },

  // ---- 武器 (最长边目标长度) ----
  w_pistol: { file: 'w_pistol', s: 0.55, center: true, align: true },
  w_shotgun: { file: 'w_shotgun', s: 0.8, center: true, align: true },
  w_smg: { file: 'w_smg', s: 0.62, center: true, align: true, flip: true },
  w_cleaver: { file: 'w_cleaver', s: 0.9, center: true, align: true },
  w_blade: { file: 'w_blade', s: 0.5, center: true, align: true },
  w_mortar: { file: 'w_mortar', s: 0.85, center: true, align: true },
  w_chain: { file: 'w_chain', s: 0.7, center: true, align: true },
  w_beam: { file: 'w_beam', s: 0.7, center: true, align: true },
  w_turret: { file: 'w_turret', s: 0.95 },

  // ---- 场地道具 ----
  prop_container: { file: 'prop_container', s: 2.6 },
  prop_container_w: { file: 'prop_container_w', s: 2.9 },
  prop_pipe: { file: 'prop_pipe', s: 1.7 },
  prop_rail: { file: 'prop_rail', s: 3.6 },
  prop_rocks: { file: 'prop_rocks', s: 2.3 },
  prop_barrier: { file: 'prop_barrier', s: 3.0 },
  prop_pillar: { file: 'prop_pillar', fit: 'h', s: 3.6 },
  prop_computer: { file: 'prop_computer', s: 1.7 },
  prop_barrels: { file: 'prop_barrels', s: 1.5 },
  prop_barrel: { file: 'prop_barrel', s: 1.1 },
  prop_dish: { file: 'prop_dish', s: 2.4 },
  prop_gate: { file: 'prop_gate', s: 6.4 },
};

export const CHAR_MODEL = (id) => `char_${id}`;
export const ENEMY_MODEL = { mite: 'enemy_mite', brute: 'enemy_brute', spitter: 'enemy_spitter', charger: 'enemy_charger', bomber: 'enemy_bomber', brood: 'boss_brood', tyrant: 'boss_tyrant' };
export const WEAPON_MODEL = { pistol: 'w_pistol', shotgun: 'w_shotgun', smg: 'w_smg', cleaver: 'w_cleaver', orbit_blades: 'w_blade', mortar: 'w_mortar', chain: 'w_chain', beam: 'w_beam', turret: 'w_turret' };

// ============ 加载 ============
const templates = new Map(); // id -> { scene, animations, center, size, maxDim }
const bakeCache = new Map();
let loader = null;

function template(id) { return templates.get(id) || null; }
export function hasModel(id) { return templates.has(id); }

export async function loadAssets(onProgress) {
  loader = new GLTFLoader();
  const entries = Object.entries(MANIFEST);
  let done = 0;
  await Promise.all(entries.map(([id, e]) => new Promise((resolve) => {
    loader.load(`models/${e.file}.glb`, (gltf) => {
      try {
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3());
        templates.set(id, {
          scene: gltf.scene,
          animations: gltf.animations || [],
          center: box.getCenter(new THREE.Vector3()),
          min: box.min.clone(),
          size,
          maxDim: Math.max(size.x, size.y, size.z) || 1,
        });
      } catch (err) {
        console.warn('[assets] register failed', id, err);
      }
      onProgress?.(++done, entries.length, id);
      resolve();
    }, undefined, (err) => {
      console.warn('[assets] load failed', id, err);
      onProgress?.(++done, entries.length, id);
      resolve();
    });
  })));
}

// ============ 静态模型生成 (武器/道具) ============
export function spawnModel(id) {
  const t = template(id);
  if (!t) return null;
  const e = MANIFEST[id];
  const inner = t.scene.clone(true);
  const f = (e.fit === 'h' ? e.s / t.size.y : e.s / t.maxDim) || 1;
  inner.scale.setScalar(f);
  inner.position.set(
    -t.center.x * f,
    -(e.center ? t.center.y : t.min.y) * f,
    -t.center.z * f,
  );
  inner.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  const outer = new THREE.Group();
  outer.rotation.y = (e.yaw || 0) + (e.flip ? Math.PI : 0);
  if (e.align) {
    const s = t.size;
    const pivot = new THREE.Group();
    if (s.x >= s.y && s.x >= s.z) pivot.rotation.y = -Math.PI / 2;
    else if (s.y >= s.x && s.y >= s.z) pivot.rotation.x = Math.PI / 2;
    pivot.add(inner);
    outer.add(pivot);
  } else {
    outer.add(inner);
  }
  return outer;
}

// ============ 玩家角色 (蒙皮 + idle 动画) ============
// 贴图平均亮度: 深色角色在暗场地上会糊成剪影, 低于阈值就补一点自发光
const avgCache = new WeakMap();
function texAverage(img) {
  if (!img) return null;
  if (avgCache.has(img)) return avgCache.get(img);
  if (img.complete === false || !img.width) return null; // 贴图尚未解码, 下次再算
  let col = null;
  try {
    const c = document.createElement('canvas');
    c.width = 48; c.height = 48;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, 48, 48);
    const d = ctx.getImageData(0, 0, 48, 48).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
    }
    if (n) col = new THREE.Color(r / n / 255, g / n / 255, b / n / 255).convertSRGBToLinear();
  } catch { col = null; }
  avgCache.set(img, col);
  return col;
}

function liftDark(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    const out = list.map((m) => {
      if (!m || !m.color || !m.emissive || m.emissive.getHex() !== 0) return m;
      const avg = texAverage(m.map && m.map.image);
      const base = avg || m.color;
      const lum = 0.299 * base.r + 0.587 * base.g + 0.114 * base.b;
      if (lum >= 0.3) return m;
      const c = m.clone();
      c.emissive.copy(base).multiplyScalar(0.5);
      return c;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
}

// 按网格几何 (绑定姿态) 的世界包围盒把模型底面压到 y=0
function groundToZero(root) {
  root.updateMatrixWorld(true);
  const bb = new THREE.Box3();
  bb.makeEmpty();
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const g = o.geometry.boundingBox;
    bb.expandByPoint(v.copy(g.min).applyMatrix4(o.matrixWorld));
    bb.expandByPoint(v.copy(g.max).applyMatrix4(o.matrixWorld));
  });
  if (isFinite(bb.min.y)) root.position.y -= bb.min.y;
}

export function spawnCharacter(charId) {
  const id = CHAR_MODEL(charId);
  const t = template(id);
  if (!t) return null;
  const e = MANIFEST[id];
  const inner = skeletonClone(t.scene);
  const f = (e.fit === 'h' ? e.s / t.size.y : e.s / t.maxDim) || 1;
  inner.scale.setScalar(f);
  inner.position.set(-t.center.x * f, -t.min.y * f, -t.center.z * f);
  inner.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  // 按实际 (绑定姿态) 包围盒贴地: 部分模型的 min.y 与加载时记录不一致, 会陷进地面
  groundToZero(inner);
  liftDark(inner);
  setTimeout(() => liftDark(inner), 400); // 贴图异步解码后再补一次
  const outer = new THREE.Group();
  outer.rotation.y = e.yaw || 0;
  outer.add(inner);

  let mixer = null;
  if (t.animations.length) {
    const clip = t.animations.find((a) => /idle/i.test(a.name)) || t.animations[0];
    mixer = new THREE.AnimationMixer(inner);
    const action = mixer.clipAction(clip);
    action.time = Math.random() * (clip.duration || 1);
    action.play();
  }
  return { group: outer, mixer };
}

// ============ 敌人烘焙: 合并成单几何 + 单材质 ============
export function bakeEnemy(modelId) {
  if (bakeCache.has(modelId)) return bakeCache.get(modelId);
  const t = template(modelId);
  const e = MANIFEST[modelId];
  if (!t || !e) return null;

  t.scene.updateMatrixWorld(true);
  const geos = [];
  let map = null;
  t.scene.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    const col = m && m.color ? m.color : new THREE.Color(1, 1, 1);
    if (m && m.map && !map) map = m.map;

    let g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) {
      if (k !== 'position' && k !== 'normal' && k !== 'uv' && k !== 'color') g.deleteAttribute(k);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    const c = new Float32Array(n * 3);
    const existing = g.attributes.color;
    for (let i = 0; i < n; i++) {
      let r = col.r, gr = col.g, b = col.b;
      if (existing) { r *= existing.getX(i); gr *= existing.getY(i); b *= existing.getZ(i); }
      c[i * 3] = r; c[i * 3 + 1] = gr; c[i * 3 + 2] = b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.morphAttributes = {};
    if (g.index) g = g.toNonIndexed();
    geos.push(g);
  });
  if (!geos.length) return null;

  let merged;
  try {
    merged = geos.length > 1 ? mergeGeometries(geos, false) : geos[0];
  } catch (err) {
    console.warn('[assets] merge failed', modelId, err);
    return null;
  }
  if (!merged) return null;

  merged.computeBoundingBox();
  // 注意: BufferGeometry.scale/translate 会就地改写 boundingBox, 必须先把数值取出来
  const src = merged.boundingBox;
  const minY = src.min.y;
  const f = e.h / ((src.max.y - src.min.y) || 1);
  const cx = (src.min.x + src.max.x) / 2;
  const cz = (src.min.z + src.max.z) / 2;
  merged.scale(f, f, f);
  merged.translate(-cx * f, -minY * f, -cz * f);
  if (e.yaw) merged.rotateY(e.yaw);
  merged.computeBoundingBox();
  merged.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    map,
    vertexColors: true,
    roughness: 0.72,
    metalness: 0.06,
  });
  const out = { geometry: merged, material };
  bakeCache.set(modelId, out);
  return out;
}

export function disposeAssets() {
  templates.clear();
  bakeCache.clear();
}
