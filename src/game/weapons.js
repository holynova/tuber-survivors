import * as THREE from 'three';
import { WEAPONS, TIER_MULT, TIER_NAMES, TIER_COLORS } from './data.js';
import { dist, dist2, clamp, rand } from '../core/utils.js';
import { spawnModel, WEAPON_MODEL } from '../assets/models.js';

export const MAX_WEAPONS = 6;

const stdMat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.3, flatShading: true, ...opts });

// ---------- 挥砍扇形特效 ----------
class Swings {
  constructor(scene, max = 14) {
    this.pool = []; this.active = [];
    for (let i = 0; i < max; i++) {
      const geo = new THREE.RingGeometry(0.42, 1, 40, 1, -0.5, 1);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.frustumCulled = false;
      scene.add(m);
      this.pool.push(m);
    }
  }
  spawn(x, z, facing, { radius = 3.6, arc = 2.1, color = 0xffffff, life = 0.3, opacity = 1 } = {}) {
    const m = this.pool.pop();
    if (!m) return;
    m.visible = true;
    m.geometry.dispose();
    m.geometry = new THREE.RingGeometry(0.42, 1, 40, 1, -arc / 2, arc);
    m.position.set(x, 0.7, z);
    m.rotation.z = facing - Math.PI / 2;
    m.material.color.setHex(color);
    m.scale.set(radius * 0.3, radius * 0.3, 1);
    m.userData = { t: 0, life, radius, opacity };
    this.active.push(m);
  }
  update(dt) {
    for (let i = 0; i < this.active.length; i++) {
      const m = this.active[i];
      const u = m.userData;
      u.t += dt;
      const k = u.t / u.life;
      const e = 1 - Math.pow(1 - k, 2.4);
      const s = u.radius * (0.32 + 0.68 * e);
      m.scale.set(s, s, 1);
      m.rotation.z += dt * 1.2;
      m.material.opacity = u.opacity * (1 - k) * 0.95;
      if (k >= 1) {
        m.visible = false;
        this.active.splice(i, 1);
        this.pool.push(m);
        i--;
      }
    }
  }
}

// ---------- 武器模型 ----------
function buildModel(defId, tier, colorHex) {
  const g = new THREE.Group();

  // 优先使用外部模型 (失败回退程序化)
  const spawned = spawnModel(WEAPON_MODEL[defId]);
  if (spawned) {
    g.add(spawned);
    if (tier > 0) {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06 + tier * 0.02), new THREE.MeshBasicMaterial({ color: TIER_COLORS[tier] }));
      gem.position.set(0.1, 0.28, 0);
      g.add(gem);
    }
    return g;
  }

  const accent = new THREE.MeshBasicMaterial({ color: colorHex });
  const body = stdMat(0x2c3648);
  const metal = stdMat(0x9fb2c9, { metalness: 0.7, roughness: 0.3 });
  const add = (m) => { m.castShadow = true; g.add(m); return m; };

  switch (defId) {
    case 'pistol': {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.5), body)).position.set(0, 0, 0.1);
      const barrel = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 6), metal));
      barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.05, 0.42);
      const led = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), accent));
      led.position.set(0, 0.14, 0.18);
      break;
    }
    case 'shotgun': {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.55), stdMat(0x4a3324))).position.set(0, 0, 0.1);
      for (const s of [-0.06, 0.06]) {
        const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), metal));
        b.rotation.x = Math.PI / 2; b.position.set(s, 0.06, 0.5);
      }
      const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 10), accent));
      ring.position.set(0, 0.06, 0.78);
      break;
    }
    case 'smg': {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.62), body)).position.set(0, 0, 0.12);
      const mag = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.14), metal));
      mag.position.set(0, -0.2, 0.12);
      const led = add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.2), accent));
      led.position.set(0, 0.12, 0.24);
      break;
    }
    case 'cleaver': {
      const handle = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 6), stdMat(0x5a3b22)));
      handle.rotation.x = Math.PI / 2.2;
      const blade = add(new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.85, 4), stdMat(0xc9d6e4, { metalness: 0.85, roughness: 0.2 })));
      blade.rotation.x = -Math.PI / 2.4; blade.position.set(0, 0.35, 0.5); blade.scale.set(1, 1, 0.35);
      const edge = add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.7), accent));
      edge.position.set(0.14, 0.5, 0.55); edge.rotation.x = -Math.PI / 2.4;
      break;
    }
    case 'mortar': {
      const tube = add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.7, 7), stdMat(0x3d4a33)));
      tube.rotation.x = -Math.PI / 3.4; tube.position.set(0, 0.1, 0);
      const rim = add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 6, 12), accent));
      rim.rotation.x = -Math.PI / 3.4 + Math.PI / 2; rim.position.set(0, 0.38, 0.26);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.3), metal)).position.set(0, -0.16, -0.1);
      break;
    }
    case 'chain': {
      const rod = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.6, 6), body));
      for (let i = 0; i < 3; i++) {
        const coil = add(new THREE.Mesh(new THREE.TorusGeometry(0.12 + i * 0.04, 0.03, 6, 12), accent));
        coil.position.y = 0.1 + i * 0.16; coil.rotation.x = Math.PI / 2;
      }
      const tip = add(new THREE.Mesh(new THREE.OctahedronGeometry(0.09), accent));
      tip.position.y = 0.62;
      break;
    }
    case 'beam': {
      const core = add(new THREE.Mesh(new THREE.OctahedronGeometry(0.22), accent));
      core.position.y = 0.25;
      const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 6, 14), metal));
      ring.position.y = 0.25; ring.rotation.y = Math.PI / 2;
      const base = add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.2, 6), body));
      base.position.y = 0;
      g.userData.spinPart = core;
      break;
    }
    case 'turret':
      return null; // 部署型, 无手持模型
    case 'orbit_blades':
      return null; // 刀刃独立渲染
    default: {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.5), body));
    }
  }
  // 稀有度发光点缀
  if (tier > 0) {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06 + tier * 0.02), new THREE.MeshBasicMaterial({ color: TIER_COLORS[tier] }));
    gem.position.set(0.1, 0.2, 0);
    g.add(gem);
  }
  g.scale.setScalar(1);
  return g;
}

// ---------- 炮塔 ----------
const TURRET = {
  geoBase: null, geoHead: null, geoBarrel: null,
  mats: [],
};
function turretParts() {
  if (!TURRET.geoBase) {
    TURRET.geoBase = new THREE.CylinderGeometry(0.36, 0.46, 0.3, 6);
    TURRET.geoHead = new THREE.BoxGeometry(0.5, 0.34, 0.55);
    TURRET.geoBarrel = new THREE.CylinderGeometry(0.07, 0.07, 0.62, 6);
  }
  return TURRET;
}

export class WeaponSystem {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.uid = 1;
    this.swings = new Swings(game.scene);
    this.orbitBlades = [];
    this.turrets = [];
    this._bladeGeo = new THREE.OctahedronGeometry(0.3, 0);
    this._bladeGeo.scale(0.5, 0.35, 1.6);
    this._tmpAim = new THREE.Vector3();
  }

  get count() { return this.list.length; }

  add(defId, tier = 0) {
    if (this.list.length >= MAX_WEAPONS) return null;
    const def = WEAPONS[defId];
    if (!def) return null;
    const w = {
      uid: this.uid++,
      defId, def, tier,
      cd: rand(0.1, 0.5),
      model: null,
      mountIndex: this.list.length,
      hitMap: new Map(),
      blades: [],
      turrets: [],
      angle: 0,
      flashT: 0,
    };
    this.list.push(w);
    if (def.kind !== 'orbit' && def.kind !== 'deploy') this._mount(w);
    if (def.kind === 'orbit') this._buildBlades(w);
    this.game.ui.refreshWeapons();
    return w;
  }

  removeAt(index) {
    const w = this.list[index];
    if (!w) return null;
    if (w.model) {
      this.game.player.weaponMount.remove(w.model);
      w.model = null;
    }
    for (const b of w.blades) b.visible = false;
    this.list.splice(index, 1);
    this.list.forEach((x, i) => (x.mountIndex = i));
    this._remountAll();
    this.game.ui.refreshWeapons();
    return w;
  }

  _remountAll() {
    for (const w of this.list) {
      if (w.model) this.game.player.weaponMount.remove(w.model);
      w.model = null;
      if (w.def.kind !== 'orbit' && w.def.kind !== 'deploy') this._mount(w);
    }
  }

  _mount(w) {
    const model = buildModel(w.defId, w.tier, w.def.hex);
    if (!model) return;
    w.model = model;
    const i = w.mountIndex;
    // 环绕玩家分布
    const slots = [
      { x: 0.6, y: 0, z: 0.5, flip: false },
      { x: -0.6, y: 0, z: 0.5, flip: true },
      { x: 0.66, y: 0.28, z: -0.1, flip: false },
      { x: -0.66, y: 0.28, z: -0.1, flip: true },
      { x: 0.46, y: -0.3, z: 0.72, flip: false },
      { x: -0.46, y: -0.3, z: 0.72, flip: true },
    ];
    const s = slots[i % slots.length];
    model.position.set(s.x, s.y, s.z);
    model.rotation.y = s.flip ? -0.5 : 0.5;
    if (s.flip) model.scale.x = -1;
    this.game.player.weaponMount.add(model);
  }

  _buildBlades(w) {
    for (let i = 0; i < 6; i++) {
      const inst = spawnModel(WEAPON_MODEL.orbit_blades);
      let m;
      if (inst) {
        m = new THREE.Group();
        const mats = [];
        inst.traverse((o) => {
          if (o.isMesh && o.material && o.material.emissive) {
            o.material = o.material.clone();
            o.material.emissive.setHex(w.def.hex);
            o.material.emissiveIntensity = 1.4;
            mats.push(o.material);
          }
        });
        m.userData.mats = mats;
        m.add(inst);
      } else {
        m = new THREE.Mesh(
          this._bladeGeo,
          new THREE.MeshStandardMaterial({ color: w.def.hex, emissive: w.def.hex, emissiveIntensity: 1.4, metalness: 0.6, roughness: 0.25, flatShading: true }),
        );
        m.castShadow = true;
      }
      m.visible = false;
      m.frustumCulled = false;
      this.game.scene.add(m);
      w.blades.push(m);
    }
  }

  upgrade(w, tier) {
    w.tier = clamp(tier, 0, 3);
    if (w.model) {
      const parent = w.model.parent;
      parent?.remove(w.model);
      w.model = null;
      this._mount(w);
    }
    this.game.ui.refreshWeapons();
  }

  // 攻击节奏
  _cooldown(w) {
    const st = this.game.stats;
    let cd = w.def.cooldown;
    if (w.defId === 'smg' && w.tier >= 2) cd *= w.tier === 3 ? 0.7 : 0.85;
    return cd / st.get('attackSpeedMult');
  }

  update(dt) {
    const g = this.game;
    const p = g.player;
    if (!p.alive) { this._updateTurretsAndBlades(dt); return; }

    for (const w of this.list) {
      w.flashT = Math.max(0, w.flashT - dt * 6);
      const kind = w.def.kind;

      if (kind === 'orbit') { this._updateOrbit(w, dt); continue; }
      if (kind === 'deploy') {
        w.cd -= dt;
        if (w.cd <= 0) {
          w.cd = this._cooldown(w);
          this._deployTurret(w);
        }
        continue;
      }

      w.cd -= dt;
      if (w.cd > 0) continue;

      const range = (w.def.range || 9) * g.stats.get('rangeMult');
      const target = g.enemies.nearestEnemy(p.x, p.z, range);
      if (!target) { w.cd = 0.05; continue; }

      w.cd = this._cooldown(w);
      this._fire(w, target, range);
    }

    this._updateTurretsAndBlades(dt);
  }

  _aimAt(w, target) {
    const p = this.game.player;
    return Math.atan2(target.x - p.x, target.z - p.z);
  }

  _muzzle() {
    const p = this.game.player;
    return {
      x: p.x + Math.sin(p.facing) * 0.7,
      y: 1.05,
      z: p.z + Math.cos(p.facing) * 0.7,
    };
  }

  _fire(w, target, range) {
    const g = this.game;
    const p = g.player;
    const def = w.def;
    const tierMult = TIER_MULT[w.tier];
    const base = def.damage * tierMult;
    const angle = this._aimAt(w, target);
    const mz = this._muzzle();
    const fromX = p.x + Math.sin(angle) * 0.55;
    const fromZ = p.z + Math.cos(angle) * 0.55;

    switch (def.id) {
      case 'pistol': case 'smg': case 'shotgun': {
        const kind = def.id === 'shotgun' ? 'shotgun' : def.id === 'smg' ? 'smg' : 'pistol';
        const count = def.id === 'shotgun'
          ? def.count + (w.tier === 1 ? 1 : w.tier === 2 ? 2 : w.tier === 3 ? 4 : 0)
          : 1;
        const spread = def.spread || 0;
        const roll = g.rollDamage(base, 'ranged');
        for (let i = 0; i < count; i++) {
          const jitter = count > 1 ? (i / (count - 1) - 0.5) * spread + rand(-0.04, 0.04) : rand(-spread, spread);
          const a = angle + jitter;
          const speed = def.projSpeed * rand(0.96, 1.04);
          const pierce = def.pierce + (def.id === 'pistol' && w.tier >= 2 ? w.tier - 1 : 0);
          g.projectiles.fire({
            x: fromX, y: 1.0, z: fromZ,
            vx: Math.sin(a) * speed, vz: Math.cos(a) * speed,
            damage: roll.dmg, crit: roll.crit, radius: 0.3,
            life: range / speed + 0.25, pierce, kb: def.knockback * g.stats.get('knockbackMult'),
            color: def.hex, source: w, kind: 'bullet', trail: def.id === 'smg' ? 0.5 : 0.25,
          });
        }
        // 枪口特效
        g.particles.burst(fromX, 1.0, fromZ, {
          count: def.id === 'shotgun' ? 14 : 6, colors: [def.hex, 0xffffff, 0xffd257],
          speed: def.id === 'shotgun' ? 12 : 7, size: 0.5, life: 0.2, dx: Math.sin(angle), dy: 0.1, dz: Math.cos(angle), spread: 0.7, drag: 4,
        });
        g.rings.spawn(fromX, fromZ, { color: def.hex, maxR: def.id === 'shotgun' ? 1.6 : 0.9, life: 0.2, y: 0.9, opacity: 0.8 });
        g.audio.shoot(kind);
        w.flashT = 1;
        break;
      }
      case 'cleaver': {
        const roll = g.rollDamage(base, 'melee');
        const arc = def.arc + w.tier * 0.12;
        const radius = (def.radius + w.tier * 0.35) * 1;
        this.swings.spawn(p.x, p.z, angle, { radius, arc, color: def.hex, life: 0.32 });
        g.particles.burst(p.x + Math.sin(angle) * radius * 0.6, 0.9, p.z + Math.cos(angle) * radius * 0.6, {
          count: 16, colors: [def.hex, 0xffffff], speed: 10, size: 0.55, life: 0.4,
          dx: Math.cos(angle), dy: 0.3, dz: -Math.sin(angle), spread: 0.55, drag: 3,
        });
        g.audio.shoot('melee');
        g.shake(0.14);
        const hits = g.enemies.list.filter((e) => {
          if (!e.active) return false;
          const dx = e.x - p.x, dz = e.z - p.z;
          const d = Math.hypot(dx, dz);
          if (d > radius + e.radius) return false;
          const ang = Math.atan2(dx, dz);
          let diff = ang - angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          return Math.abs(diff) <= arc / 2;
        });
        for (const e of hits) {
          g.hitEnemy(e, roll.dmg, {
            kb: def.knockback * g.stats.get('knockbackMult'), dirx: e.x - p.x, dirz: e.z - p.z,
            crit: roll.crit, source: w, kind: 'melee',
          });
        }
        break;
      }
      case 'mortar': {
        const roll = g.rollDamage(base, 'elem');
        const aoe = (def.aoe + w.tier * 0.35) * g.stats.get('aoeMult');
        // 预判目标位置
        const lead = 0.55;
        const tx = clamp(target.x + target.vx * lead, -g.arenaLimit + 1, g.arenaLimit - 1);
        const tz = clamp(target.z + target.vz * lead, -g.arenaLimit + 1, g.arenaLimit - 1);
        const flight = 0.85;
        const distTo = dist(p.x, p.z, tx, tz);
        const vx = (tx - p.x) / flight;
        const vz = (tz - p.z) / flight;
        g.projectiles.fire({
          x: p.x, y: 1.4, z: p.z, vx, vz, vy: 10 + distTo * 0.35,
          arc: true, tx, tz, damage: roll.dmg, crit: roll.crit,
          explodeR: aoe, color: def.hex, source: w, kind: 'mortar',
          radius: 0.4, life: 3, trail: 0.6, burnDps: def.burn, burnTime: 3,
        });
        g.particles.burst(p.x, 1.2, p.z, { count: 10, colors: [0xff8a3d, 0xffffff], speed: 6, size: 0.5, life: 0.3, dy: 1.5 });
        g.audio.shoot('rocket');
        w.flashT = 1;
        break;
      }
      case 'chain': {
        const jumps = def.jumps + w.tier + (g.player.ch.passive.id === 'capacitor' ? 2 : 0);
        const roll = g.rollDamage(base, 'elem');
        const stunChance = 0.15 + (w.tier === 3 ? 0.25 : 0);
        let cur = target;
        const hitSet = new Set();
        let px = p.x, py = 1.5, pz = p.z;
        for (let i = 0; i < jumps && cur; i++) {
          g.bolts.strike(px, py, pz, cur.x, cur.y + cur.radius, cur.z, { color: def.hex, life: 0.2, jag: 0.55 });
          g.particles.burst(cur.x, cur.radius + 0.3, cur.z, { count: 10, colors: [def.hex, 0xffffff], speed: 7, size: 0.5, life: 0.35, spread: 1, drag: 3 });
          g.hitEnemy(cur, roll.dmg, { kb: def.knockback, dirx: cur.x - px, dirz: cur.z - pz, crit: roll.crit, source: w, kind: 'elem', stun: Math.random() < stunChance ? 0.6 : 0 });
          hitSet.add(cur);
          px = cur.x; py = cur.radius + 0.3; pz = cur.z;
          cur = this._nextChain(cur, hitSet, 5.5);
        }
        g.audio.shoot('chain');
        w.flashT = 1;
        break;
      }
      case 'beam': {
        const roll = g.rollDamage(base, 'elem');
        const len = (def.length + w.tier * 1.4) * g.stats.get('rangeMult');
        const ex = p.x + Math.sin(angle) * len;
        const ez = p.z + Math.cos(angle) * len;
        g.beams.spawn(p.x, p.z, ex, ez, { color: def.hex, width: 0.14 + w.tier * 0.03, y: 1.0, life: 0.4, glow: 0.7 });
        g.beams.spawn(p.x, p.z, ex, ez, { color: 0xffffff, width: 0.05, y: 1.0, life: 0.16, glow: 0.3 });
        const hits = g.enemies.enemiesInLine(p.x, p.z, ex, ez, def.width + w.tier * 0.06);
        for (const e of hits) {
          g.hitEnemy(e, roll.dmg, { kb: def.knockback, dirx: Math.sin(angle), dirz: Math.cos(angle), crit: roll.crit, source: w, kind: 'elem' });
          g.particles.burst(e.x, e.radius, e.z, { count: 5, colors: [def.hex, 0xffffff], speed: 5, size: 0.45, life: 0.3, spread: 1 });
        }
        g.audio.shoot('beam');
        w.flashT = 1;
        break;
      }
    }
  }

  _nextChain(from, hitSet, range) {
    let best = null, bestD = range * range;
    for (const e of this.game.enemies.list) {
      if (!e.active || hitSet.has(e)) continue;
      const d = dist2(from.x, from.z, e.x, e.z);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  // ---------- 环刃 ----------
  _updateOrbit(w, dt) {
    const g = this.game;
    const p = g.player;
    const def = w.def;
    const blades = def.blades + w.tier;
    const spin = def.spin + w.tier * 0.35;
    const radius = def.radius + w.tier * 0.1;
    const base = g.elapsed * spin + w.uid;
    const roll = g.rollDamage(def.damage * TIER_MULT[w.tier], 'melee');
    w.orbitK = (w.orbitK || 0) + dt;

    for (let i = 0; i < w.blades.length; i++) {
      const m = w.blades[i];
      const active = i < blades;
      m.visible = active;
      if (!active) continue;
      const a = base + (i / blades) * Math.PI * 2;
      const x = p.x + Math.cos(a) * radius;
      const z = p.z + Math.sin(a) * radius;
      m.position.set(x, 0.75 + Math.sin(g.elapsed * 6 + i) * 0.12, z);
      m.rotation.y = -a;
      m.rotation.z = Math.sin(g.elapsed * 8 + i) * 0.3;

      if (Math.random() < 0.35) {
        g.particles.emit({ x, y: 0.75, z, vx: -Math.sin(a) * 2, vy: 0.3, vz: Math.cos(a) * 2, color: def.hex, life: 0.3, size: 0.4, sizeEnd: 0.05, drag: 3 });
      }

      // 接触伤害 (每把刀独立冷却)
      const key = w.uid * 100 + i;
      w.hitMap.set(key, (w.hitMap.get(key) || 0) - dt);
      if (w.hitMap.get(key) <= 0) {
        const near = g.enemies.enemiesInRadius(x, z, 0.75);
        if (near.length) {
          w.hitMap.set(key, def.cooldown);
          for (const e of near) {
            g.hitEnemy(e, roll.dmg, {
              kb: def.knockback * g.stats.get('knockbackMult'), dirx: e.x - p.x, dirz: e.z - p.z,
              crit: roll.crit, source: w, kind: 'melee',
            });
            g.particles.burst(e.x, e.radius, e.z, { count: 6, colors: [def.hex, 0xffffff], speed: 6, size: 0.4, life: 0.3, spread: 1 });
          }
          g.audio.shoot('orbit');
        }
      }
    }
    if (w.hitMap.size > 400) w.hitMap.clear();
  }

  // ---------- 炮塔 ----------
  _deployTurret(w) {
    const g = this.game;
    const p = g.player;
    const maxT = p.ch.passive.id === 'engineer' ? 2 : 1;
    // 回收超限/过期
    this.turrets = this.turrets.filter((t) => t.life > 0);
    const mine = this.turrets.filter((t) => t.w === w);
    if (mine.length >= maxT) {
      const oldest = mine[0];
      oldest.life = 0;
      this._disposeTurret(oldest);
      this.turrets = this.turrets.filter((t) => t !== oldest);
    }
    const group = new THREE.Group();
    const head = new THREE.Group();
    const turretModel = spawnModel(WEAPON_MODEL.turret);
    if (turretModel) {
      head.add(turretModel);
    } else {
      const parts = turretParts();
      const base = new THREE.Mesh(parts.geoBase, stdMat(0x4a5568));
      base.position.y = 0.15;
      base.castShadow = true;
      head.position.y = 0.45;
      const hm = new THREE.Mesh(parts.geoHead, stdMat(0x2c3648));
      hm.castShadow = true;
      const barrel = new THREE.Mesh(parts.geoBarrel, stdMat(0x9fb2c9, { metalness: 0.7 }));
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, 0.42);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshBasicMaterial({ color: w.def.hex }));
      led.position.set(0, 0.2, 0);
      head.userData.led = led;
      head.add(hm, barrel, led);
      group.add(base);
    }
    group.add(head);
    group.position.set(p.x, 0, p.z);
    g.scene.add(group);

    g.rings.spawn(p.x, p.z, { color: w.def.hex, maxR: 2.4, life: 0.4 });
    g.particles.burst(p.x, 0.5, p.z, { count: 14, colors: [w.def.hex, 0xffffff], speed: 6, size: 0.5, life: 0.5, dy: 2 });

    const turret = {
      w, group, head,
      x: p.x, z: p.z, life: w.def.duration * (1 + w.tier * 0.25),
      maxLife: w.def.duration * (1 + w.tier * 0.25),
      cd: 0.3, angle: p.facing, recoil: 0,
    };
    this.turrets.push(turret);
    g.audio.ui();
  }

  _disposeTurret(t) {
    this.game.scene.remove(t.group);
    this.game.particles.burst(t.x, 0.5, t.z, { count: 12, colors: [0x8ba3bd, 0xffffff], speed: 5, size: 0.45, life: 0.4, dy: 1.6 });
  }

  _updateTurretsAndBlades(dt) {
    const g = this.game;
    for (let i = this.turrets.length - 1; i >= 0; i--) {
      const t = this.turrets[i];
      t.life -= dt;
      if (t.life <= 0) {
        this._disposeTurret(t);
        this.turrets.splice(i, 1);
        continue;
      }
      // 闪烁警报
      const warn = t.life < 2 && Math.floor(g.elapsed * 6) % 2 === 0;
      const led = t.head.userData.led;
      if (led) led.material.color.setHex(warn ? 0xff4d6d : t.w.def.hex);

      t.cd -= dt;
      const range = t.w.def.range * g.stats.get('rangeMult');
      const target = g.enemies.nearestEnemy(t.x, t.z, range);
      if (target) {
        const want = Math.atan2(target.x - t.x, target.z - t.z);
        let diff = want - t.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        t.angle += diff * Math.min(1, dt * 9);
        t.head.rotation.y = t.angle;
        if (t.cd <= 0) {
          t.cd = t.w.def.turretCd;
          const roll = g.rollDamage(t.w.def.damage * TIER_MULT[t.w.tier] * (g.player.ch.passive.id === 'engineer' ? 1.6 : 1), 'ranged');
          const bx = t.x + Math.sin(t.angle) * 0.5;
          const bz = t.z + Math.cos(t.angle) * 0.5;
          g.projectiles.fire({
            x: bx, y: 0.6, z: bz,
            vx: Math.sin(t.angle) * 36, vz: Math.cos(t.angle) * 36,
            damage: roll.dmg, crit: roll.crit, radius: 0.3, life: range / 36 + 0.3,
            pierce: t.w.tier >= 3 ? 1 : 0, kb: 2, color: t.w.def.hex, source: t.w, kind: 'bullet', trail: 0.3,
          });
          g.particles.burst(bx, 0.6, bz, { count: 5, colors: [t.w.def.hex, 0xffffff], speed: 6, size: 0.4, life: 0.2, dx: Math.sin(t.angle), dz: Math.cos(t.angle), dy: 0.1, spread: 0.6 });
          g.audio.shoot('turret');
        }
      } else {
        t.angle += dt * 0.8;
        t.head.rotation.y = t.angle;
      }

      // 展开缩放
      const k = Math.min(1, (t.maxLife - t.life) * 6 + 0.2);
      t.group.scale.setScalar(Math.min(1, k) * (t.life < 1 ? Math.max(0.01, t.life) : 1));
    }

    // 环刃需要常驻更新(即便玩家死亡也保留一瞬)
    for (const w of this.list) {
      if (w.def.kind === 'orbit') this._updateOrbitIdle(w);
    }
  }

  _updateOrbitIdle(w) {
    // 玩家死亡时隐藏刀刃
    if (!this.game.player.alive) for (const b of w.blades) b.visible = false;
  }

  refreshModels() {
    this._remountAll();
    for (const w of this.list) {
      if (w.def.kind === 'orbit') {
        // 稀有度颜色更新
        for (const b of w.blades) {
          const mats = b.userData?.mats || (b.material ? [b.material] : []);
          for (const mm of mats) mm.emissiveIntensity = 1.2 + w.tier * 0.5;
        }
      }
    }
  }

  clear() {
    for (const w of this.list) {
      if (w.model) this.game.player.weaponMount.remove(w.model);
      for (const b of w.blades) this.game.scene.remove(b);
    }
    for (const t of this.turrets) this.game.scene.remove(t.group);
    this.list = [];
    this.turrets = [];
    this.uid = 1;
  }
}
