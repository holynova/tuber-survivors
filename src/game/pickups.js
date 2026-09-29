import * as THREE from 'three';
import { dist2, rand } from '../core/utils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export class PickupSystem {
  constructor(game) {
    this.game = game;
    this.gems = [];
    this.hearts = [];
    this.pool = [];
    this.heartPool = [];

    this.gemMesh = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.4, flatShading: true }),
      420,
    );
    this.gemMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(420 * 3), 3);
    this.gemMesh.frustumCulled = false;
    this.gemMesh.castShadow = false;
    this.gemMesh.count = 0;
    game.scene.add(this.gemMesh);

    this.heartMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.3, 8, 6),
      new THREE.MeshStandardMaterial({ emissive: 0xff4d6d, emissiveIntensity: 1.1, roughness: 0.3, flatShading: true }),
      60,
    );
    this.heartMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(60 * 3), 3);
    this.heartMesh.frustumCulled = false;
    this.heartMesh.count = 0;
    game.scene.add(this.heartMesh);
  }

  dropCrystal(x, z, amount = 1, color = 0x4de8ff) {
    if (this.gems.length >= 400) {
      // 溢出: 直接并入最近的一颗
      this._collect(this.gems[0], amount);
      return;
    }
    const g = this.pool.pop() || {};
    const a = rand(0, Math.PI * 2);
    const sp = rand(2, 5.5);
    Object.assign(g, {
      x, z, y: 0.5,
      vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: rand(3.5, 6.5),
      amount, color, life: 0, magnet: false, phase: rand(0, 6.28),
      value: amount, // 可被更大晶体吸收
    });
    this.gems.push(g);
  }

  dropHeart(x, z) {
    if (this.hearts.length >= 50) return;
    const h = this.heartPool.pop() || {};
    const a = rand(0, Math.PI * 2);
    Object.assign(h, { x, z, y: 0.5, vx: Math.cos(a) * 3, vz: Math.sin(a) * 3, vy: 5, phase: rand(0, 6.28) });
    this.hearts.push(h);
  }

  _collect(g, bonus = 0) {
    g.amount += bonus;
    this.game.collectCrystal(g);
  }

  update(dt) {
    const g = this.game;
    const p = g.player;
    const pickupR = 3.2 * g.stats.get('pickupMult');
    const t = g.elapsed;

    // 晶体
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gem = this.gems[i];
      gem.life += dt;
      // 物理弹出
      if (gem.life < 0.5) {
        gem.vy -= 22 * dt;
        gem.x += gem.vx * dt; gem.z += gem.vz * dt; gem.y += gem.vy * dt;
        gem.vx *= Math.pow(0.02, dt); gem.vz *= Math.pow(0.02, dt);
        if (gem.y < 0.3) { gem.y = 0.3; gem.vy *= -0.3; }
      }
      const d2 = dist2(gem.x, gem.z, p.x, p.z);
      const inRange = d2 < pickupR * pickupR;
      if (inRange || gem.magnet) {
        gem.magnet = true;
        const d = Math.sqrt(d2) || 0.001;
        const pull = 26 * (1 - Math.min(1, d / pickupR)) + 12;
        gem.x += ((p.x - gem.x) / d) * pull * dt;
        gem.z += ((p.z - gem.z) / d) * pull * dt;
        gem.y = Math.max(0.35, gem.y - dt * 2);
        // 拖尾
        if (Math.random() < 0.4) {
          g.particles.emit({ x: gem.x, y: gem.y, z: gem.z, vx: 0, vy: 0.5, vz: 0, color: gem.color, life: 0.28, size: 0.32, sizeEnd: 0.02, drag: 3 });
        }
      }
      // 晶体互相吸引合并
      let merged = false;
      for (let j = i - 1; j >= 0; j--) {
        const o = this.gems[j];
        if (dist2(gem.x, gem.z, o.x, o.z) < 0.42) {
          o.amount += gem.amount;
          o.value = o.amount;
          this.gems.splice(i, 1);
          this.pool.push(gem);
          merged = true;
          break;
        }
      }
      if (merged) { i--; continue; }
      if (dist2(gem.x, gem.z, p.x, p.z) < 0.55 && p.alive) {
        this.gems.splice(i, 1);
        this.pool.push(gem);
        this._collect(gem);
        i--;
      }
    }

    // 生命
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i];
      h.life = (h.life || 0) + dt;
      if (h.life < 0.4) {
        h.vy -= 22 * dt;
        h.x += h.vx * dt; h.z += h.vz * dt; h.y += h.vy * dt;
        if (h.y < 0.35) { h.y = 0.35; h.vy *= -0.3; }
      }
      const d2 = dist2(h.x, h.z, p.x, p.z);
      if (d2 < pickupR * pickupR) {
        const d = Math.sqrt(d2) || 0.001;
        h.x += ((p.x - h.x) / d) * 22 * dt;
        h.z += ((p.z - h.z) / d) * 22 * dt;
      }
      if (d2 < 0.6 && p.alive) {
        this.hearts.splice(i, 1);
        this.heartPool.push(h);
        p.heal(9);
        g.audio.pickup();
        g.rings.spawn(p.x, p.z, { color: 0xff4d6d, maxR: 1.8, life: 0.35, y: 0.6 });
      }
    }

    this._write(t);
  }

  _write(t) {
    const gm = this.gemMesh;
    const n = Math.min(this.gems.length, 420);
    for (let i = 0; i < n; i++) {
      const gem = this.gems[i];
      const s = (0.75 + Math.min(0.9, gem.amount * 0.12)) * (gem.magnet ? 1.15 : 1);
      _e.set(t * 2.4 + gem.phase, t * 1.6 + gem.phase, 0);
      _q.setFromEuler(_e);
      _v.set(gem.x, gem.y + Math.sin(t * 4 + gem.phase) * 0.1, gem.z);
      _s.set(s, s * 1.35, s);
      _m.compose(_v, _q, _s);
      gm.setMatrixAt(i, _m);
      _c.setHex(gem.color).multiplyScalar(1.25);
      gm.setColorAt(i, _c);
    }
    gm.count = n;
    if (n) { gm.instanceMatrix.needsUpdate = true; gm.instanceColor.needsUpdate = true; }

    const hm = this.heartMesh;
    const hn = this.hearts.length;
    for (let i = 0; i < hn; i++) {
      const h = this.hearts[i];
      const pulse = 1 + Math.sin(t * 8 + h.phase) * 0.16;
      _e.set(0, t * 2, 0);
      _q.setFromEuler(_e);
      _v.set(h.x, (h.y || 0.4) + Math.sin(t * 5 + h.phase) * 0.08, h.z);
      _s.set(pulse, pulse * 0.9, pulse);
      _m.compose(_v, _q, _s);
      hm.setMatrixAt(i, _m);
      _c.setHex(0xff4d6d).multiplyScalar(1.5);
      hm.setColorAt(i, _c);
    }
    hm.count = hn;
    if (hn) { hm.instanceMatrix.needsUpdate = true; hm.instanceColor.needsUpdate = true; }
  }

  clear() {
    for (const g of this.gems) this.pool.push(g);
    for (const h of this.hearts) this.heartPool.push(h);
    this.gems = [];
    this.hearts = [];
    this.gemMesh.count = 0;
    this.heartMesh.count = 0;
  }
}
