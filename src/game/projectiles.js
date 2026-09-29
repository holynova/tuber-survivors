import * as THREE from 'three';
import { dist2, clamp } from '../core/utils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export class ProjectileSystem {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.pool = [];

    // 拖尾弹(长条)
    this.bulletMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.16, 0.16, 1),
      new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
      360,
    );
    this.bulletMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(360 * 3), 3);
    this.bulletMesh.frustumCulled = false;
    this.bulletMesh.count = 0;
    game.scene.add(this.bulletMesh);

    // 弹体(球)
    this.orbMesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.5, 0),
      new THREE.MeshBasicMaterial(),
      240,
    );
    this.orbMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(240 * 3), 3);
    this.orbMesh.frustumCulled = false;
    this.orbMesh.count = 0;
    game.scene.add(this.orbMesh);
  }

  _alloc() {
    return this.pool.pop() || {
      active: false, kind: 'bullet', x: 0, y: 1, z: 0, vx: 0, vz: 0, vy: 0,
      damage: 0, radius: 0.3, life: 2, pierce: 0, kb: 0, color: 0xffffff,
      hit: new Set(), arc: false, tx: 0, tz: 0, grav: 0, trail: 0, source: null,
      explodeR: 0, burnDps: 0, burnTime: 0, stun: 0, owner: 'player', radiusY: 0.2,
    };
  }

  fire(o) {
    const p = this._alloc();
    Object.assign(p, {
      active: true, kind: o.kind || 'bullet',
      x: o.x, y: o.y ?? 1, z: o.z,
      vx: o.vx || 0, vz: o.vz || 0, vy: o.vy || 0,
      damage: o.damage, radius: o.radius ?? 0.3,
      life: o.life ?? 2.4, pierce: o.pierce ?? 0, kb: o.kb ?? 0,
      color: o.color ?? 0xffffff, arc: !!o.arc, tx: o.tx ?? 0, tz: o.tz ?? 0,
      grav: o.grav ?? 0, trail: o.trail ?? 0, source: o.source || null,
      explodeR: o.explodeR || 0, burnDps: o.burnDps || 0, burnTime: o.burnTime || 0,
      stun: o.stun || 0, owner: o.owner || 'player', hit: o.hit || new Set(),
      crit: !!o.crit, spin: Math.random() * 6,
    });
    this.list.push(p);
    return p;
  }

  update(dt) {
    const g = this.game;
    const p = g.player;
    const list = this.list;
    const t = g.elapsed;

    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      b.life -= dt;
      if (b.life <= 0) { this._retire(i, b); i--; continue; }

      // 抛物线(迫击炮)
      if (b.arc) {
        b.x += b.vx * dt;
        b.z += b.vz * dt;
        b.vy -= 26 * dt;
        b.y += b.vy * dt;
        const arrived = dist2(b.x, b.z, b.tx, b.tz) < 0.35;
        if (arrived || b.y <= 0.15) {
          g.explode(b.x, b.z, { radius: b.explodeR, damage: b.damage, color: b.color, source: b.source, burnDps: b.burnDps, burnTime: b.burnTime });
          this._retire(i, b); i--;
        }
        continue;
      }

      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.spin += dt * 10;

      // 拖尾
      if (b.trail > 0) {
        if (Math.random() < b.trail) {
          g.particles.emit({
            x: b.x, y: b.y, z: b.z,
            vx: -b.vx * 0.06, vy: 0.2, vz: -b.vz * 0.06,
            color: b.color, life: 0.32, size: 0.42, sizeEnd: 0.04, drag: 3, alpha: 0.9,
          });
        }
      }

      const L = g.arenaLimit - 0.2;
      if (Math.abs(b.x) > L || Math.abs(b.z) > L) {
        // 撞墙
        g.particles.burst(b.x, b.y, b.z, { count: 5, colors: [b.color, 0xffffff], speed: 5, size: 0.4, life: 0.3, spread: 0.8 });
        this._retire(i, b); i--;
        continue;
      }

      if (b.owner === 'player') {
        // 命中敌人
        const enemies = g.enemies.list;
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (!e.active || b.hit.has(e)) continue;
          const rr = e.radius + b.radius;
          if (dist2(b.x, b.z, e.x, e.z) < rr * rr) {
            b.hit.add(e);
            g.hitEnemy(e, b.damage, {
              kb: b.kb, dirx: b.vx, dirz: b.vz, crit: b.crit,
              source: b.source, burnDps: b.burnDps, burnTime: b.burnTime,
              stun: b.stun, kind: b.kind,
            });
            g.impactFx(b.x, b.y, b.z, b.color, b.vx, b.vz);
            if (b.pierce > 0) {
              b.pierce--;
              b.damage *= 0.85;
            } else {
              this._retire(i, b); i--;
            }
            break;
          }
        }
      } else {
        // 敌方弹幕 → 玩家
        if (p.alive) {
          const rr = p.radius + b.radius;
          if (dist2(b.x, b.z, p.x, p.z) < rr * rr && p.invuln <= 0) {
            const dmg = p.takeDamage(b.damage, { fromX: b.x, fromZ: b.z });
            if (dmg > 0 || p.invuln > 0) {
              g.particles.burst(b.x, 0.9, b.z, { count: 8, colors: [b.color, 0xffffff], speed: 6, size: 0.45, life: 0.4 });
              this._retire(i, b); i--;
            }
          }
        }
      }
    }

    this._write();
  }

  _retire(i, b) {
    b.active = false;
    this.list.splice(i, 1);
    this.pool.push(b);
  }

  _write() {
    let nb = 0, no = 0;
    for (const b of this.list) {
      if (b.kind === 'mortar' || b.kind === 'spit' || b.kind === 'orb') {
        if (no >= 240) continue;
        _e.set(b.spin, b.spin * 0.7, 0);
        _q.setFromEuler(_e);
        _v.set(b.x, b.y, b.z);
        const s = b.radius * 2.2;
        _s.set(s, s, s);
        _m.compose(_v, _q, _s);
        this.orbMesh.setMatrixAt(no, _m);
        _c.setHex(b.color);
        this.orbMesh.setColorAt(no, _c);
        no++;
      } else {
        if (nb >= 360) continue;
        const ang = Math.atan2(b.vx, b.vz);
        _e.set(0, ang, 0);
        _q.setFromEuler(_e);
        _v.set(b.x, b.y, b.z);
        _s.set(1, 1, 2.6);
        _m.compose(_v, _q, _s);
        this.bulletMesh.setMatrixAt(nb, _m);
        _c.setHex(b.color);
        this.bulletMesh.setColorAt(nb, _c);
        nb++;
      }
    }
    this.bulletMesh.count = nb;
    this.orbMesh.count = no;
    if (nb) { this.bulletMesh.instanceMatrix.needsUpdate = true; this.bulletMesh.instanceColor.needsUpdate = true; }
    if (no) { this.orbMesh.instanceMatrix.needsUpdate = true; this.orbMesh.instanceColor.needsUpdate = true; }
  }

  clear() {
    for (const b of this.list) this.pool.push(b);
    this.list.length = 0;
    this.bulletMesh.count = 0;
    this.orbMesh.count = 0;
  }
}
