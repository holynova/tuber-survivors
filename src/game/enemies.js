import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ENEMIES, BOSSES, waveHpMult, waveDmgMult } from './data.js';
import { clamp, dist2 } from '../core/utils.js';
import { bakeEnemy, ENEMY_MODEL } from '../assets/models.js';

const M = () => new THREE.Matrix4();

function g(geo, fn) {
  if (fn) fn(geo);
  return geo;
}
const stdMat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.1, flatShading: true, ...opts });

// ---- 敌人外观: 优先用外部模型烘焙, 失败回退程序化部件 ----
function shapeParts(def) {
  const baked = bakeEnemy(ENEMY_MODEL[def.id]);
  if (baked) return [{ geometry: baked.geometry, material: baked.material, baked: true }];
  return proceduralParts(def);
}

// ---- 程序化回退部件 ----
function proceduralParts(def) {
  const c = def.color, a = def.accent;
  const parts = [];
  const add = (geo, color, matOpts) => parts.push({ geometry: geo, material: stdMat(color, matOpts) });

  switch (def.shape) {
    case 'mite': {
      add(g(new THREE.IcosahedronGeometry(0.5, 0), (x) => { x.scale(1, 0.72, 1.15); x.translate(0, 0.4, 0); }), c);
      add(g(new THREE.ConeGeometry(0.15, 0.4, 5), (x) => { x.rotateX(Math.PI / 2); x.translate(0, 0.36, 0.55); }), a, { emissive: a, emissiveIntensity: 0.35 });
      const eyeL = g(new THREE.SphereGeometry(0.075, 6, 5), (x) => x.translate(-0.17, 0.5, 0.4));
      const eyeR = g(new THREE.SphereGeometry(0.075, 6, 5), (x) => x.translate(0.17, 0.5, 0.4));
      add(mergeGeometries([eyeL, eyeR]), 0x0b0b12, { roughness: 0.3 });
      break;
    }
    case 'brute': {
      add(g(new THREE.DodecahedronGeometry(0.82, 0), (x) => { x.scale(1.1, 1, 0.92); x.translate(0, 0.82, 0); }), c);
      const shL = g(new THREE.SphereGeometry(0.3, 7, 5), (x) => x.translate(-0.78, 1.2, 0));
      const shR = g(new THREE.SphereGeometry(0.3, 7, 5), (x) => x.translate(0.78, 1.2, 0));
      add(mergeGeometries([shL, shR]), a, { emissive: a, emissiveIntensity: 0.2 });
      add(g(new THREE.BoxGeometry(0.56, 0.5, 0.56), (x) => x.translate(0, 1.52, 0.16)), 0x3a2b4d);
      add(g(new THREE.BoxGeometry(0.4, 0.1, 0.08), (x) => x.translate(0, 1.56, 0.45)), a, { emissive: a, emissiveIntensity: 1.4 });
      const fL = g(new THREE.BoxGeometry(0.34, 0.4, 0.34), (x) => x.translate(-0.85, 0.4, 0.25));
      const fR = g(new THREE.BoxGeometry(0.34, 0.4, 0.34), (x) => x.translate(0.85, 0.4, 0.25));
      add(mergeGeometries([fL, fR]), 0x2b2b38);
      break;
    }
    case 'spitter': {
      add(g(new THREE.SphereGeometry(0.56, 8, 6), (x) => { x.scale(1, 0.9, 1); x.translate(0, 0.58, 0); }), c);
      add(g(new THREE.CylinderGeometry(0.1, 0.18, 0.6, 6), (x) => x.translate(0, 1.1, 0)), 0x3d7a5a);
      add(g(new THREE.SphereGeometry(0.3, 8, 6), (x) => x.translate(0, 1.45, 0)), a, { emissive: a, emissiveIntensity: 0.9 });
      add(g(new THREE.BoxGeometry(0.3, 0.07, 0.07), (x) => x.translate(0, 0.72, 0.5)), 0x0b0b12);
      break;
    }
    case 'charger': {
      add(g(new THREE.CapsuleGeometry(0.36, 0.6, 3, 7), (x) => { x.rotateX(Math.PI / 2); x.translate(0, 0.55, 0); }), c);
      add(g(new THREE.BoxGeometry(0.5, 0.44, 0.5), (x) => x.translate(0, 0.6, 0.72)), 0x7a4a20);
      const hL = g(new THREE.ConeGeometry(0.12, 0.55, 5), (x) => { x.rotateX(Math.PI / 2.4); x.translate(-0.2, 0.9, 0.78); });
      const hR = g(new THREE.ConeGeometry(0.12, 0.55, 5), (x) => { x.rotateX(Math.PI / 2.4); x.translate(0.2, 0.9, 0.78); });
      add(mergeGeometries([hL, hR]), a, { emissive: a, emissiveIntensity: 0.4 });
      const legFL = g(new THREE.BoxGeometry(0.16, 0.36, 0.16), (x) => x.translate(-0.28, 0.18, 0.4));
      const legFR = g(new THREE.BoxGeometry(0.16, 0.36, 0.16), (x) => x.translate(0.28, 0.18, 0.4));
      const legBL = g(new THREE.BoxGeometry(0.16, 0.36, 0.16), (x) => x.translate(-0.28, 0.18, -0.4));
      const legBR = g(new THREE.BoxGeometry(0.16, 0.36, 0.16), (x) => x.translate(0.28, 0.18, -0.4));
      add(mergeGeometries([legFL, legFR, legBL, legBR]), 0x4a3520);
      break;
    }
    case 'bomber': {
      add(g(new THREE.SphereGeometry(0.52, 9, 7), (x) => x.translate(0, 0.55, 0)), 0x8a7a20);
      add(g(new THREE.SphereGeometry(0.3, 8, 6), (x) => x.translate(0, 0.55, 0.28)), a, { emissive: a, emissiveIntensity: 1.8 });
      const spikes = [];
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const sp = new THREE.ConeGeometry(0.09, 0.3, 4);
        sp.rotateX(-Math.PI / 2);
        sp.rotateY(-ang - Math.PI / 2);
        sp.translate(Math.cos(ang) * 0.5, 0.55 + Math.sin(i) * 0.1, Math.sin(ang) * 0.5);
        spikes.push(sp);
      }
      add(mergeGeometries(spikes), c);
      break;
    }
    case 'boss': {
      add(g(new THREE.DodecahedronGeometry(1.55, 0), (x) => { x.scale(1.05, 1.12, 1); x.translate(0, 1.7, 0); }), c);
      add(g(new THREE.SphereGeometry(0.7, 8, 6), (x) => { x.scale(1, 0.8, 0.9); x.translate(0, 2.85, 0.15); }), 0x2e1f3d);
      add(g(new THREE.BoxGeometry(0.9, 0.2, 0.14), (x) => x.translate(0, 2.9, 0.72)), a, { emissive: a, emissiveIntensity: 2 });
      const crown = [];
      for (let i = 0; i < 5; i++) {
        const cn = new THREE.ConeGeometry(0.2, 0.7, 4);
        const ang = -0.6 + (i / 4) * 1.2;
        cn.translate(Math.sin(ang) * 0.6, 3.4 - Math.abs(ang) * 0.2, Math.cos(ang) * 0.35);
        crown.push(cn);
      }
      add(mergeGeometries(crown), 0xffd257, { emissive: 0xffd257, emissiveIntensity: 0.5 });
      const armL = g(new THREE.CapsuleGeometry(0.3, 0.7, 3, 6), (x) => { x.rotateZ(0.5); x.translate(-1.5, 1.6, 0); });
      const armR = g(new THREE.CapsuleGeometry(0.3, 0.7, 3, 6), (x) => { x.rotateZ(-0.5); x.translate(1.5, 1.6, 0); });
      add(mergeGeometries([armL, armR]), a, { emissive: a, emissiveIntensity: 0.25 });
      break;
    }
  }
  return parts;
}

// 敌人实例渲染器(每类型 InstancedMesh * 部件)
class TypeRenderer {
  constructor(scene, def, capacity) {
    this.def = def;
    this.capacity = capacity;
    const parts = shapeParts(def);
    this.baseScale = parts[0]?.baked ? 1 : def.radius * 1.05;
    this.parts = parts.map((p) => {
      const im = new THREE.InstancedMesh(p.geometry, p.material, capacity);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.castShadow = true;
      im.receiveShadow = false;
      im.frustumCulled = false;
      im.count = 0;
      im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3).fill(1), 3);
      im.instanceColor.setUsage(THREE.DynamicDrawUsage);
      scene.add(im);
      return im;
    });
    this._m = M();
    this._mb = M();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._v = new THREE.Vector3();
    this._s = new THREE.Vector3();
  }
  begin() { this.n = 0; }
  write(e, t) {
    if (this.n >= this.capacity) return;
    const i = this.n++;
    const spawnK = e.spawnK;
    const breathe = 1 + Math.sin(t * 4 + e.phase) * 0.025;
    const sc = spawnK * this.baseScale * (e.sizeMul || 1);
    this._e.set(0, e.facing, 0);
    this._q.setFromEuler(this._e);
    this._v.set(e.x, e.y, e.z);
    this._s.set(sc * breathe, sc * (2 - breathe), sc);
    this._mb.compose(this._v, this._q, this._s);
    const flash = e.flash;
    for (const part of this.parts) {
      part.setMatrixAt(i, this._mb);
      const f = 1 + flash * 2.4;
      part.instanceColor.setXYZ(i, f, f * (1 - flash * 0.25), f * (1 - flash * 0.35));
    }
    this._idx = i;
  }
  end() {
    for (const part of this.parts) {
      part.count = this.n;
      part.instanceMatrix.needsUpdate = true;
      part.instanceColor.needsUpdate = true;
    }
  }
}

export class EnemySystem {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.list = [];
    this.pool = [];
    this.renderers = new Map();
    this.capacities = { mite: 260, brute: 90, spitter: 90, charger: 70, bomber: 70, boss: 6 };
    for (const def of Object.values(ENEMIES)) this._renderer(def.id);
    for (const def of Object.values(BOSSES)) this._renderer(def.id, def);
    this._tmp = new THREE.Vector3();
    this._mb = M();
  }

  _renderer(id, defOverride) {
    const def = defOverride || ENEMIES[id];
    const r = new TypeRenderer(this.scene, def, this.capacities[id] || 64);
    this.renderers.set(id, r);
    return r;
  }

  _alloc() {
    return this.pool.pop() || {
      active: false, type: '', def: null, x: 0, z: 0, y: 0, vx: 0, vz: 0,
      hp: 1, maxHp: 1, radius: 0.5, size: 1, sizeMul: 1, facing: 0, phase: Math.random() * 10,
      flash: 0, spawnK: 0, state: 'seek', timer: 0, shootCd: 0, contactCd: 0,
      stun: 0, burn: 0, burnDps: 0, burnTick: 0, boss: false,
      suppression: 0, lastTarget: null, dmg: 10, speed: 4,
      summonCd: 4, skillCd: 3, dashT: 0, dashX: 0, dashZ: 0, isBoss: false,
    };
  }

  spawn(typeId, x, z, { hpMult = 1, dmgMult = 1, sizeMul = 1, silent = false } = {}) {
    const def = ENEMIES[typeId] || BOSSES[typeId];
    if (!def) return null;
    const e = this._alloc();
    e.active = true;
    e.type = typeId;
    e.def = def;
    e.x = x; e.z = z; e.y = 0;
    e.vx = 0; e.vz = 0;
    e.maxHp = def.hp * hpMult;
    e.hp = e.maxHp;
    e.radius = def.radius;
    e.size = def.radius * 1.05 * sizeMul;
    e.sizeMul = sizeMul;
    e.dmg = def.dmg * dmgMult;
    e.speed = def.speed * (0.92 + Math.random() * 0.18);
    e.facing = Math.atan2(this.game.player.x - x, this.game.player.z - z);
    e.flash = 0; e.spawnK = 0.01;
    e.state = 'seek'; e.timer = 0;
    e.shootCd = (def.shootCd || 2) * (0.6 + Math.random() * 0.7);
    e.contactCd = 0; e.stun = 0; e.burn = 0; e.burnDps = 0;
    e.suppression = 0; e.lastTarget = null;
    e.hpMult = hpMult; e.dmgMult = dmgMult;
    e.boss = !!def.boss; e.isBoss = !!def.boss;
    e.summonCd = 5; e.skillCd = 4.5;
    e.dashT = 0; e.y = 0;
    this.list.push(e);

    if (!silent) {
      const r = def.radius;
      this.game.particles.burst(x, 0.3, z, { count: 10, colors: [def.color, def.accent], speed: 5, size: 0.5, life: 0.5, dy: 1.5, gravity: -4 });
      this.game.rings.spawn(x, z, { color: def.accent, maxR: r * 3, life: 0.4, opacity: 0.8 });
    }
    return e;
  }

  count() { return this.list.length; }

  update(dt) {
    const g = this.game;
    const p = g.player;
    const list = this.list;
    const hash = g.enemyHash;
    hash.clear();
    for (const e of list) hash.insert(e);

    const near = g._nearTmp || (g._nearTmp = []);
    const t = g.elapsed;

    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      e.spawnK = Math.min(1, e.spawnK + dt * 3.2);
      e.flash = Math.max(0, e.flash - dt * 5);
      e.contactCd = Math.max(0, e.contactCd - dt);
      e.stun = Math.max(0, e.stun - dt);

      // 灼烧
      if (e.burn > 0) {
        e.burn -= dt;
        e.burnTick -= dt;
        if (e.burnTick <= 0) {
          e.burnTick = 0.35;
          this.damage(e, e.burnDps * 0.35, { silent: true, source: 'burn' });
          g.particles.burst(e.x, 0.6, e.z, { count: 2, colors: [0xff8a3d, 0xffd257], speed: 2, size: 0.4, life: 0.4, dy: 2, gravity: 2 });
          if (!e.active) { list.splice(i, 1); i--; continue; }
        }
      }

      if (e.stun <= 0) this._ai(e, dt, p, t, hash, near);

      // 边界
      const L = g.arenaLimit - e.radius;
      e.x = clamp(e.x, -L, L);
      e.z = clamp(e.z, -L, L);

      // 接触伤害
      const dp = dist2(e.x, e.z, p.x, p.z);
      const rr = (e.radius + p.radius) * (e.isBoss ? 1.05 : 1);
      if (e.active && p.alive && dp < rr * rr && e.contactCd <= 0 && p.invuln <= 0) {
        e.contactCd = 0.7;
        const dmg = e.dmg;
        const d = Math.sqrt(dp) || 1;
        p.takeDamage(dmg, { fromX: e.x, fromZ: e.z });
        // 击退敌人
        e.vx += ((e.x - p.x) / d) * 6;
        e.vz += ((e.z - p.z) / d) * 6;
      }

      e.y = e.isBoss ? 0 : Math.max(0, Math.sin(t * 8 + e.phase) * 0.06) * e.spawnK;
    }

    // 分离力(第二遍, 用 hash)
    for (const e of list) {
      if (e.stun > 0 && !e.isBoss) continue;
      hash.query(e.x, e.z, 2.4, near);
      for (const o of near) {
        if (o === e) continue;
        const minD = (e.radius + o.radius) * 0.95;
        const dx = e.x - o.x, dz = e.z - o.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < minD * minD && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          const push = ((minD - d) / minD) * 12 * dt * (o.isBoss ? 2 : 1);
          e.x += (dx / d) * push;
          e.z += (dz / d) * push;
        }
      }
    }

    // 渲染写入
    for (const r of this.renderers.values()) r.begin();
    for (const e of list) {
      const r = this.renderers.get(e.type);
      if (r) r.write(e, t);
    }
    for (const r of this.renderers.values()) r.end();

    // 清理死亡
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i].active) list.splice(i, 1);
    }
  }

  _ai(e, dt, p, t, hash, near) {
    const def = e.def;
    const dx = p.x - e.x, dz = p.z - e.z;
    const d = Math.hypot(dx, dz) || 0.001;
    const nx = dx / d, nz = dz / d;

    if (e.dashT > 0) {
      // 冲锋中
      e.dashT -= dt;
      e.x += e.dashX * dt;
      e.z += e.dashZ * dt;
      e.facing = Math.atan2(e.dashX, e.dashZ);
      this.game.particles.burst(e.x, 0.4, e.z, { count: 1, colors: [e.def.accent], speed: 1.5, size: 0.5, life: 0.3, dy: 1, spread: 1 });
      e.vx = e.dashX; e.vz = e.dashZ;
      return;
    }

    if (e.state === 'telegraph') {
      e.timer -= dt;
      if (Math.random() < 0.5) this.game.particles.burst(e.x, 0.3, e.z, { count: 2, colors: [0xffb04d, 0xffffff], speed: 3, size: 0.45, life: 0.3, dy: 1.5 });
      if (e.timer <= 0) {
        e.state = 'seek';
        e.dashT = def.dashTime || 0.55;
        e.dashX = nx * (def.dashSpeed || 16);
        e.dashZ = nz * (def.dashSpeed || 16);
        this.game.audio.shoot('melee');
        this.game.rings.spawn(e.x, e.z, { color: 0xffb04d, maxR: 2.5, life: 0.3 });
      }
      e.vx *= 0.8; e.vz *= 0.8;
      this._applyVel(e, dt);
      e.facing = Math.atan2(nx, nz);
      return;
    }

    let mx = nx, mz = nz;
    let speed = e.speed;

    if (def.ranged) {
      const keep = def.keepDist || 9;
      if (d < keep * 0.72) { mx = -nx; mz = -nz; speed *= 1.1; }
      else if (d < keep * 1.15) {
        // 侧绕
        mx = -nz; mz = nx;
        speed *= 0.75;
      }
      e.shootCd -= dt;
      if (e.shootCd <= 0 && d < 16) {
        e.shootCd = def.shootCd;
        this.game.spawnEnemyShot(e, p, def);
      }
    } else if (def.charger) {
      if (d < 9 && e.state === 'seek' && e.timer <= 0) {
        e.state = 'telegraph';
        e.timer = def.telegraph;
        e.facing = Math.atan2(nx, nz);
      }
      e.timer = Math.min(e.timer, e.state === 'telegraph' ? e.timer : 0);
      if (e.state === 'seek' && d < 9) speed *= 0.35;
    } else if (def.bomber) {
      const blast = def.blastRadius || 3;
      if (d < blast * 0.95) {
        this.game.explode(e.x, e.z, { radius: blast, damage: e.dmg, color: 0xffe14d, fromEnemy: true });
        this._killRaw(e, false);
        return;
      }
      speed *= 1 + Math.sin(t * 6 + e.phase) * 0.15;
    } else if (e.boss) {
      this._bossAI(e, dt, p, d, nx, nz, t);
    }

    // 追击 + 分离
    const k = 1 - Math.pow(0.02, dt);
    e.vx += (mx * speed - e.vx) * k;
    e.vz += (mz * speed - e.vz) * k;
    e.x += e.vx * dt;
    e.z += e.vz * dt;
    e.vx *= Math.pow(0.45, dt);
    e.vz *= Math.pow(0.45, dt);
    const moving = Math.hypot(e.vx, e.vz);
    if (moving > 0.35) e.facing = Math.atan2(e.vx, e.vz);
    else if (d < 14) e.facing = Math.atan2(nx, nz);
  }

  _applyVel(e, dt) {
    e.x += e.vx * dt;
    e.z += e.vz * dt;
    e.vx *= Math.pow(0.02, dt);
    e.vz *= Math.pow(0.02, dt);
  }

  _bossAI(e, dt, p, d, nx, nz, t) {
    e.skillCd -= dt;
    e.summonCd -= dt;
    const g = this.game;
    if (e.skillCd <= 0) {
      e.skillCd = e.def.final ? 3.2 : 4.6;
      const skills = e.def.skills;
      const skill = skills[(Math.random() * skills.length) | 0];
      if (skill === 'stomp') {
        g.rings.spawn(e.x, e.z, { color: e.def.accent, maxR: 7.5, life: 0.65, opacity: 1 });
        g.particles.burst(e.x, 0.4, e.z, { count: 44, colors: [e.def.color, e.def.accent, 0xffffff], speed: 14, size: 0.7, life: 0.7, dy: 2.4, gravity: -8 });
        g.audio.explode();
        g.shake(0.7);
        const R = 7.5;
        if (dist2(e.x, e.z, p.x, p.z) < R * R) p.takeDamage(e.dmg, { fromX: e.x, fromZ: e.z });
        // 环形冲击伤害(弹开)
        g.damageRing(e.x, e.z, R, e.dmg * 0.8, e);
      } else if (skill === 'charge') {
        e.state = 'telegraph';
        e.timer = 0.85;
      } else if (skill === 'summon') {
        const n = e.def.final ? 8 : 5;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const sx = e.x + Math.cos(a) * (e.radius + 1.6);
          const sz = e.z + Math.sin(a) * (e.radius + 1.6);
          this.spawn('mite', sx, sz, { hpMult: e.hpMult || 1, dmgMult: e.dmgMult || 1, sizeMul: 0.9 });
        }
        g.particles.burst(e.x, 1.4, e.z, { count: 26, colors: [e.def.accent, 0xffffff], speed: 8, size: 0.6, life: 0.6 });
        g.audio.boss();
      } else if (skill === 'barrage') {
        const n = 18;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + t;
          g.spawnEnemyShotDir(e.x, 1.4, e.z, Math.cos(a), Math.sin(a), { speed: 10, damage: e.dmg * 0.7, color: 0xff5032 });
        }
        g.audio.explode();
        g.shake(0.4);
      }
    }
    if (e.summonCd <= 0 && this.list.length < 90) {
      e.summonCd = 8;
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        this.spawn('mite', e.x + Math.cos(a) * 3, e.z + Math.sin(a) * 3, {});
      }
    }
  }

  // 伤害
  damage(e, amount, { kb = 0, dirx = 0, dirz = 0, flash = true, silent = false, source } = {}) {
    if (!e || !e.active) return 0;
    e.hp -= amount;
    if (flash) e.flash = 1;
    if (kb > 0) {
      const l = Math.hypot(dirx, dirz) || 1;
      e.vx += (dirx / l) * kb / (e.def.mass || 1);
      e.vz += (dirz / l) * kb / (e.def.mass || 1);
    }
    if (e.hp <= 0) this._killRaw(e, true, source);
    return amount;
  }

  applyBurn(e, dps, dur) {
    if (!e.active) return;
    e.burn = Math.max(e.burn, dur);
    e.burnDps = Math.max(e.burnDps, dps);
  }

  _killRaw(e, drop = true, source) {
    if (!e.active) return;
    e.active = false;
    const g = this.game;
    const def = e.def;
    g.particles.burst(e.x, 0.7, e.z, {
      count: e.isBoss ? 70 : 18, colors: [def.color, def.accent, 0xffffff],
      speed: e.isBoss ? 16 : 9, size: e.isBoss ? 1.1 : 0.6, life: e.isBoss ? 1 : 0.6, dy: 3, gravity: -9,
    });
    g.debris.spawn(e.x, 0.5, e.z, { color: def.color, count: e.isBoss ? 34 : 8, size: e.isBoss ? 0.5 : 0.2, speed: 10, life: e.isBoss ? 1.8 : 1.1 });
    g.rings.spawn(e.x, e.z, { color: def.accent, maxR: e.isBoss ? 9 : 2.6, life: e.isBoss ? 0.9 : 0.42, opacity: 0.95 });
    g.audio.kill();
    if (e.isBoss) { g.shake(1.1); g.audio.explode(); }

    // 自爆虫
    if (def.bomber) {
      g.explode(e.x, e.z, { radius: def.blastRadius, damage: def.dmg * (e.hpMult || 1), color: 0xffe14d, fromEnemy: true });
    }
    if (drop) {
      g.pickups.dropCrystal(e.x, e.z, def.xp, def.accent);
      if (Math.random() < 0.06) g.pickups.dropHeart(e.x, e.z);
    }
    g.onEnemyKilled(e, source);
  }

  // 随机找一个存活敌人
  nearestEnemy(x, z, maxR = 12) {
    let best = null, bestD = maxR * maxR;
    for (const e of this.list) {
      if (!e.active) continue;
      const d = dist2(x, z, e.x, e.z);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  enemiesInLine(x1, z1, x2, z2, halfWidth) {
    // 线段附近敌人
    const out = [];
    const dx = x2 - x1, dz = z2 - z1;
    const len2 = dx * dx + dz * dz || 1;
    for (const e of this.list) {
      if (!e.active) continue;
      let t = ((e.x - x1) * dx + (e.z - z1) * dz) / len2;
      t = clamp(t, 0, 1);
      const px = x1 + dx * t, pz = z1 + dz * t;
      const d2 = (e.x - px) ** 2 + (e.z - pz) ** 2;
      if (d2 < (halfWidth + e.radius) ** 2) out.push(e);
    }
    return out;
  }

  enemiesInRadius(x, z, r) {
    const out = [];
    const r2 = r * r;
    for (const e of this.list) {
      if (!e.active) continue;
      if (dist2(x, z, e.x, e.z) < r2 + e.radius * e.radius) out.push(e);
    }
    return out;
  }
}
