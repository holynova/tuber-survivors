import * as THREE from 'three';
import { CHARACTERS } from './data.js';
import { clamp, lerp } from '../core/utils.js';
import { spawnCharacter } from '../assets/models.js';

const mat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.15, flatShading: true, ...opts });

// 构建角色差异化外观
function buildBody(ch) {
  const g = new THREE.Group();
  const c = ch.color;
  const dark = new THREE.Color(c).multiplyScalar(0.55).getHex();
  const geo = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  switch (ch.body) {
    case 'heavy': {
      const body = geo(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.74, 1.15, 8), mat(c)));
      body.position.y = 0.78;
      const head = geo(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), mat(dark)));
      head.position.y = 1.55;
      for (const s of [-1, 1]) {
        const pad = geo(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.55), mat(0x2b3a4d)));
        pad.position.set(s * 0.72, 1.22, 0);
        g.add(pad);
      }
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.1), new THREE.MeshBasicMaterial({ color: 0x6bffb0 }));
      visor.position.set(0, 1.6, 0.3);
      g.add(body, head, visor);
      break;
    }
    case 'slim': {
      const body = geo(new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.7, 3, 8), mat(c)));
      body.position.y = 0.86;
      const head = geo(new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), mat(dark)));
      head.position.y = 1.62;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.1), new THREE.MeshBasicMaterial({ color: 0xffd257 }));
      visor.position.set(0, 1.66, 0.3);
      const fin = geo(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 5), mat(0x2b3a4d)));
      fin.position.set(0, 2.0, -0.1);
      fin.rotation.x = -0.5;
      g.add(body, head, visor, fin);
      break;
    }
    case 'ranged': {
      const body = geo(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 1.1, 7), mat(c)));
      body.position.y = 0.8;
      const head = geo(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.46, 0.5), mat(dark)));
      head.position.y = 1.58;
      const tank = geo(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 6), mat(0x2b3a4d)));
      tank.position.set(0, 1.05, -0.48);
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 6), new THREE.MeshBasicMaterial({ color: 0x4de8ff }));
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0.3, 1.35, 0.3);
      g.add(body, head, tank, scope);
      break;
    }
    case 'brute': {
      const body = geo(new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 0), mat(c)));
      body.position.y = 0.92;
      body.scale.set(1.15, 1, 1.05);
      const head = geo(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), mat(dark)));
      head.position.y = 1.66;
      for (const s of [-1, 1]) {
        const horn = geo(new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 5), mat(0xf2f2f2)));
        horn.position.set(s * 0.3, 1.95, 0);
        horn.rotation.z = s * -0.4;
        g.add(horn);
      }
      const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.08), new THREE.MeshBasicMaterial({ color: 0xffd257 }));
      eyes.position.set(0, 1.7, 0.26);
      g.add(body, head, eyes);
      break;
    }
    case 'engineer': {
      const body = geo(new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.75), mat(c)));
      body.position.y = 0.85;
      const head = geo(new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), mat(dark)));
      head.position.y = 1.6;
      const ant = geo(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 5), mat(0x2b3a4d)));
      ant.position.set(0.2, 2.0, 0);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff8a3d }));
      bulb.position.set(0.2, 2.3, 0);
      const gear = geo(new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.08, 6, 8), mat(0x2b3a4d)));
      gear.position.set(-0.5, 1.1, 0.24);
      gear.rotation.y = Math.PI / 2;
      g.add(body, head, ant, bulb, gear);
      break;
    }
    case 'mage':
    default: {
      const body = geo(new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.5, 7), mat(c)));
      body.position.y = 0.75;
      const head = geo(new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), mat(dark)));
      head.position.y = 1.6;
      const hat = geo(new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 7), mat(0x2b3a4d)));
      hat.position.y = 2.1;
      hat.rotation.z = 0.18;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xb06bff }));
      star.position.set(0.2, 2.5, 0);
      const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.06), new THREE.MeshBasicMaterial({ color: 0xd8c6ff }));
      eyes.position.set(0, 1.62, 0.3);
      g.add(body, head, hat, star, eyes);
      break;
    }
  }
  return g;
}

export class Player {
  constructor(game, charId) {
    this.game = game;
    this.charId = charId;
    this.ch = CHARACTERS.find((c) => c.id === charId);
    this.stats = game.stats;

    this.x = 0; this.z = 0;
    this.vx = 0; this.vz = 0;
    this.facing = 0;
    this.radius = 0.55;
    this.hp = this.stats.get('maxHP');
    this.maxHP = this.stats.get('maxHP');

    this.invuln = 0;       // 无敌帧
    this.hurtFlash = 0;
    this.dashCd = 0;
    this.dashTime = 0;
    this.dashDir = { x: 0, z: 1 };
    this.buffAfterimage = 0; // 薇拉被动
    this.hitTaken = 0;        // 巴克被动
    this.alive = true;

    this.group = new THREE.Group();
    const spawned = spawnCharacter(charId);
    if (spawned) {
      this.body = spawned.group;
      this.mixer = spawned.mixer;
    } else {
      this.body = buildBody(this.ch); // 模型缺失时的程序化回退
    }
    this.group.add(this.body);
    this.weaponMount = new THREE.Group();
    this.weaponMount.position.set(0, 1.15, 0);
    this.group.add(this.weaponMount);

    // 角色补光: 深色模型 (buck/vera) 在暗场地上也清晰可辨
    const fill = new THREE.PointLight(0xfff2dc, 2.4, 5.5, 2);
    fill.position.set(0, 1.6, 0.75);
    this.group.add(fill);

    // 脚下光环
    this.aura = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.78, 32),
      new THREE.MeshBasicMaterial({ color: this.ch.color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.aura.rotation.x = -Math.PI / 2;
    this.aura.position.y = 0.06;
    this.group.add(this.aura);

    game.scene.add(this.group);
    game.audio.ensure();
  }

  get moveDir() { return this._md ??= { x: 0, z: 1 }; }

  maxHp() { return this.stats.get('maxHP'); }

  update(dt, input) {
    const st = this.stats;
    const mv = input.moveVector(this.moveDir);

    // 冲刺
    this.dashCd = Math.max(0, this.dashCd - dt);
    if (input.consume('Space') && this.dashCd <= 0 && this.alive) {
      const d = this.dashDir;
      d.x = mv.x || Math.sin(this.facing);
      d.z = mv.z || Math.cos(this.facing);
      this.dashTime = 0.26;
      this.dashCd = 1.4;
      this.invuln = Math.max(this.invuln, 0.34);
      this.buffAfterimage = 3;
      this.game.audio.dash();
      const g = this.game.particles;
      g.burst(this.x, 0.35, this.z, { count: 16, colors: [this.ch.color, 0xffffff], speed: 7, size: 0.5, life: 0.4, dy: 0.4, spread: 0.9 });
      this.game.rings.spawn(this.x, this.z, { color: this.ch.color, maxR: 2.4, life: 0.42, opacity: 0.7 });
    }

    let speed = st.get('moveSpeed');
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      speed *= 3.1;
      this.vx = this.dashDir.x * speed;
      this.vz = this.dashDir.z * speed;
      // 冲刺尘土
      this.game.particles.burst(this.x, 0.2, this.z, { count: 2, colors: [0x8ba3bd, 0xffffff], speed: 2.5, size: 0.42, life: 0.35, dy: 0.5, gravity: -2 });
      // 残影
      if (Math.random() < 0.6) this.game.spawnGhost(this.x, this.z, this.facing, this.ch.color);
    } else {
      const tx = mv.x * speed, tz = mv.z * speed;
      const k = 1 - Math.pow(0.0005, dt);
      this.vx = lerp(this.vx, tx, k);
      this.vz = lerp(this.vz, tz, k);
    }

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // 场地边界
    const L = this.game.arenaLimit - this.radius;
    this.x = clamp(this.x, -L, L);
    this.z = clamp(this.z, -L, L);

    // 模型跟随逻辑坐标
    this.group.position.set(this.x, 0, this.z);

    // 朝向
    const moving = Math.hypot(this.vx, this.vz);
    if (moving > 0.6) this.facing = Math.atan2(this.vx, this.vz);

    // 动画
    this.mixer?.update(dt);
    const t = performance.now() / 1000;
    const bob = Math.min(1, moving / 6);
    this.body.position.y = Math.sin(t * 12) * 0.07 * bob;
    this.body.rotation.z = Math.sin(t * 12) * 0.06 * bob;
    this.group.rotation.y = lerp(this.group.rotation.y, this.facing, 1 - Math.pow(0.001, dt));
    this.aura.rotation.z += dt * 0.8;
    this.aura.material.opacity = 0.35 + 0.2 * Math.sin(t * 3);

    // 计时器
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 4);
    this.buffAfterimage = Math.max(0, this.buffAfterimage - dt);
    if (this.alive) {
      const regen = 0;
      if (regen) this.heal(regen * dt, false);
    }

    // 受击白闪
    const f = this.hurtFlash;
    this.body.traverse((o) => {
      if (o.isMesh && o.material && o.material.emissive) {
        o.material.emissive.setRGB(f * 1.4, f * 0.3, f * 0.3);
      }
    });

    // 被动: 残影脚下高亮
    if (this.buffAfterimage > 0 && this.game.tick % 4 === 0) {
      this.game.particles.emit({
        x: this.x + (Math.random() - 0.5) * 0.5, y: 0.1, z: this.z + (Math.random() - 0.5) * 0.5,
        vx: 0, vy: 1.6, vz: 0, color: 0xffd257, life: 0.5, size: 0.34, sizeEnd: 0.05, drag: 2,
      });
    }
  }

  // 伤害计算
  takeDamage(raw, { fromX = null, fromZ = null } = {}) {
    if (!this.alive || this.invuln > 0) return 0;
    const dodge = this.stats.get('dodge');
    if (Math.random() < dodge) {
      this.game.floatText(this.x, 1.9, this.z, '闪避', 'heal');
      this.invuln = 0.35;
      return 0;
    }
    const armor = this.stats.get('armor');
    let dmg = raw * (100 / (100 + armor * 7));
    dmg = Math.max(1, Math.round(dmg));
    this.hp -= dmg;
    this.invuln = 0.55;
    this.hurtFlash = 1;
    this.game.onPlayerHurt(dmg, fromX, fromZ);

    // 巴克: 荆棘震荡
    this.hitTaken++;
    if (this.ch.passive.id === 'thorns' && this.hitTaken % 6 === 0) {
      this.game.thornBurst(this);
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
    return dmg;
  }

  heal(v) {
    if (!this.alive) return;
    const before = this.hp;
    this.hp = Math.min(this.maxHp(), this.hp + v);
    const gained = this.hp - before;
    if (gained > 0.5) this.game.floatText(this.x, 1.9, this.z, `+${Math.round(gained)}`, 'heal');
  }

  setMaxHP(v) {
    this.maxHP = Math.max(1, v);
    this.hp = Math.min(this.hp, this.maxHP);
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.game.onPlayerDeath();
  }

  // 消耗薇拉被动
  consumeAfterimage() {
    if (this.buffAfterimage > 0) {
      this.buffAfterimage = 0;
      return true;
    }
    return false;
  }
}
