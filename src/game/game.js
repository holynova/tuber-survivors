import * as THREE from 'three';
import { Engine, ARENA } from '../core/engine.js';
import { Input } from '../core/input.js';
import { AudioKit } from '../core/audio.js';
import { ParticleSystem, DebrisSystem } from '../core/particles.js';
import { Rings, Bolts, Beams, Decals, DamageNumbers, ScreenShake } from '../core/effects.js';
import { Emitter, SpatialHash, clamp, rand, dist2, dist, weightedPick, chance } from '../core/utils.js';
import { Stats } from './stats.js';
import { Player } from './player.js';
import { EnemySystem } from './enemies.js';
import { ProjectileSystem } from './projectiles.js';
import { WeaponSystem, MAX_WEAPONS } from './weapons.js';
import { PickupSystem } from './pickups.js';
import { WaveDirector } from './waves.js';
import { UI } from './ui.js';
import { WEAPONS, TIER_NAMES, TIER_COLORS, ITEMS, UPGRADES, TIER_MULT, CHARACTERS } from './data.js';

export class Game {
  constructor(canvas, opts = {}) {
    this.events = new Emitter();
    this.engine = new Engine(canvas, { quality: opts.quality || 'high' });
    this.scene = this.engine.scene;
    this.camera = this.engine.camera;
    this.arenaLimit = ARENA - 1;

    this.input = new Input();
    this.audio = new AudioKit();

    this.particles = new ParticleSystem(this.scene, { max: 3600, blending: THREE.AdditiveBlending });
    this.smoke = new ParticleSystem(this.scene, { max: 900, blending: THREE.NormalBlending });
    this.debris = new DebrisSystem(this.scene);
    this.rings = new Rings(this.scene);
    this.bolts = new Bolts(this.scene);
    this.beams = new Beams(this.scene);
    this.decals = new Decals(this.scene);
    this.shakeFx = new ScreenShake();
    this.dmgNums = new DamageNumbers(document.getElementById('dmg-layer'), this.camera, this.engine.renderer);

    this.enemyHash = new SpatialHash(4);
    this._nearTmp = [];

    this.projectiles = new ProjectileSystem(this);
    this.enemies = new EnemySystem(this);
    this.weapons = new WeaponSystem(this);
    this.pickups = new PickupSystem(this);
    this.director = new WaveDirector(this);
    this.ui = new UI(this);

    this.state = 'title';
    this.tick = 0;
    this.elapsed = 0;
    this.timeScale = 1;
    this.hitstop = 0;
    this.sellMode = false;
    this.pendingLevels = 0;
    this._offers = [];
    this._rerolls = 0;
    this._ambientT = 0;
    this._ghosts = [];
    this._ghostPool = [];
    this._ghostGeo = new THREE.CapsuleGeometry(0.4, 0.9, 3, 7);
    this._dustColor = 0x4de8ff;

    this._bindKeys();
    this.ui.show('title');
    this._setupGhosts();
  }

  _bindKeys() {
    this.input.onKeyDown = (code) => {
      if (code === 'KeyM') {
        const m = this.audio.toggleMute();
        this.ui.toast(m ? '已静音' : '音效开启');
      }
      if (code === 'Escape') {
        if (this.state === 'playing') this.togglePause(true);
        else if (this.state === 'paused') this.togglePause(false);
        else if (this.state === 'help') this.ui.show('title');
      }
    };
  }

  _setupGhosts() {
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(
        this._ghostGeo,
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }),
      );
      m.visible = false;
      this.scene.add(m);
      this._ghostPool.push(m);
    }
  }

  spawnGhost(x, z, facing, color) {
    const m = this._ghostPool.pop();
    if (!m) return;
    m.visible = true;
    m.material.color.setHex(color);
    m.material.opacity = 0.42;
    m.position.set(x, 0.85, z);
    m.rotation.y = facing;
    this._ghosts.push({ m, life: 0.32, max: 0.32 });
  }

  // ================= 运行控制 =================
  startRun(charId) {
    this.stats = new Stats(charId);
    this.player = new Player(this, charId);
    this.crystals = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = 7;
    this.kills = 0;
    this.damageTaken = 0;
    this.damageDealt = 0;
    this.wave = 0;
    this.runTime = 0;
    this.pendingLevels = 0;
    this.sellMode = false;
    this._rerolls = 0;

    this.enemies.list.length = 0;
    this.projectiles.clear();
    this.pickups.clear();
    this.weapons.clear();

    const ch = this.player.ch;
    this.weapons.add(ch.weapon, 0);
    if (ch.passive.id === 'engineer') {
      // 立即部署一座
      const w = this.weapons.list[0];
      w.cd = 0.01;
    }

    this.ui.showHUD();
    this.ui.refreshWeapons();
    this.state = 'playing';
    this.director.stop();
    this.startWave(1);
  }

  startWave(n) {
    this.wave = n;
    this.director.startWave(n);
    if (this.pendingLevels > 0 && this.state === 'playing') this.showLevelUp();
    const isBoss = [5, 10, 15, 20].includes(n);
    this.ui.banner(isBoss ? `第 ${n} 波 — BOSS` : `第 ${n} 波`, isBoss);
    if (this.player) {
      // 波次开场特效
      const p = this.player;
      this.rings.spawn(p.x, p.z, { color: 0x4de8ff, maxR: 4.5, life: 0.55, opacity: 0.5 });
      this.particles.burst(p.x, 0.5, p.z, { count: 30, colors: [0x4de8ff, 0xffffff], speed: 12, size: 0.6, life: 0.7, dy: 3, gravity: -6 });
    }
  }

  onWaveStart() { /* HUD 已刷新 */ }

  onWaveComplete(wave) {
    this.audio.ui();
    this.openShop();   // 先切到商店状态, 避免清场拾取触发升级界面
    this.clearEnemies();
  }

  // 波次结束: 敌人消散
  clearEnemies() {
    for (const e of this.enemies.list) {
      if (!e.active) continue;
      e.active = false;
      this.particles.burst(e.x, 0.7, e.z, {
        count: 8, colors: [e.def.color, 0xffffff], speed: 5, size: 0.5, life: 0.5, dy: 2, gravity: -3,
      });
      this.rings.spawn(e.x, e.z, { color: e.def.accent, maxR: e.radius * 2.4, life: 0.3, opacity: 0.7 });
    }
    this.enemies.list.length = 0;
    this.projectiles.clear();
    this.pickups.gems.slice().forEach((g) => {
      this.collectCrystal(g);
      const i = this.pickups.gems.indexOf(g);
      if (i >= 0) this.pickups.gems.splice(i, 1);
    });
  }

  startNextWave() {
    if (this.state !== 'shop') return;
    this.ui.show('hud');
    this.state = 'playing';
    this.sellMode = false;
    this.startWave(this.wave + 1);
  }

  openShop() {
    this.state = 'shop';
    this.sellMode = false;
    this._rerolls = 0;
    this._generateOffers();
    this.ui.showShop(this.shopData());
  }

  shopData() {
    return {
      coins: this.crystals,
      rerollCost: this._rerollCost(),
      usedSlots: this.weapons.count,
      nextWave: this.wave + 1,
      offers: this._offers,
      weapons: this.weapons.list,
      sellMode: this.sellMode,
    };
  }

  _rerollCost() { return 8 + this._rerolls * 7; }

  _generateOffers() {
    const offers = [];
    for (let i = 0; i < 4; i++) {
      const wantWeapon = this.weapons.count < MAX_WEAPONS && chance(this.weapons.count === 0 ? 1 : 0.42);
      if (wantWeapon) {
        const defId = Object.keys(WEAPONS)[(Math.random() * Object.keys(WEAPONS).length) | 0];
        const tier = this._rollTier(0.55);
        const def = WEAPONS[defId];
        offers.push({
          kind: 'weapon', tier, defId,
          name: def.name, icon: def.icon, color: TIER_COLORS[tier],
          desc: `${def.desc}<br><span style="color:${TIER_COLORS[tier]}">${def.tierDesc[tier]}</span>`,
          cost: Math.round(24 + tier * 22 + this.wave * 1.6),
          sold: false,
        });
      } else {
        const item = ITEMS[(Math.random() * ITEMS.length) | 0];
        const tier = this._rollTier(0.6);
        offers.push({
          kind: 'item', tier, itemId: item.id,
          name: item.name, icon: item.icon, color: item.color || TIER_COLORS[tier],
          desc: item.desc, cost: Math.round(item.cost[tier] ?? item.cost[0]),
          sold: false,
        });
      }
    }
    this._offers = offers;
  }

  _rollTier(luck = 0.5) {
    const l = this.stats?.get('luck') ?? 0;
    const r = Math.random() - luck * 0.1 - l;
    if (r > 0.86) return 3;
    if (r > 0.6) return 2;
    if (r > 0.3) return 1;
    return 0;
  }

  buyOffer(idx) {
    const offer = this._offers[idx];
    if (!offer || offer.sold) return;
    if (this.crystals < offer.cost) { this.ui.toast('晶体不足'); return; }
    if (offer.kind === 'weapon' && this.weapons.count >= MAX_WEAPONS) {
      this.ui.toast('武器槽已满 (6/6)');
      return;
    }
    this.crystals -= offer.cost;
    offer.sold = true;
    this.audio.buy();
    if (offer.kind === 'weapon') {
      this.weapons.add(offer.defId, offer.tier);
      this.ui.toast(`获得 ${TIER_NAMES[offer.tier]} ${offer.name}`);
    } else {
      const item = ITEMS.find((i) => i.id === offer.itemId);
      this.applyItem(item.stats, item.name);
    }
    this.ui.showShop(this.shopData());
  }

  rerollShop() {
    if (this.crystals < this._rerollCost()) { this.ui.toast('晶体不足'); return; }
    this.crystals -= this._rerollCost();
    this._rerolls++;
    this.audio.ui();
    this._generateOffers();
    this.ui.showShop(this.shopData());
  }

  toggleSellMode() {
    this.sellMode = !this.sellMode;
    this.audio.ui();
    this.ui.showShop(this.shopData());
  }

  sellValue(w) {
    return Math.round((18 + w.tier * 20) * 0.6);
  }

  sellWeapon(idx) {
    const w = this.weapons.list[idx];
    if (!w || !this.sellMode) return;
    const v = this.sellValue(w);
    this.crystals += v;
    this.weapons.removeAt(idx);
    this.audio.buy();
    this.ui.toast(`出售 ${w.def.name} +${v} ◆`);
    if (!this.weapons.count && this._offers.every((o) => o.kind !== 'weapon')) this._generateOffers();
    this.ui.showShop(this.shopData());
  }

  applyItem(stats, name) {
    if (stats.maxHP) {
      this.stats.apply({ maxHP: stats.maxHP });
      this.player.setMaxHP(this.stats.get('maxHP'));
      this.player.heal(stats.heal || stats.maxHP);
    } else {
      this.stats.apply(stats);
      if (stats.heal) this.player.heal(stats.heal);
      // 动态属性同步
      this.player.setMaxHP(this.stats.get('maxHP'));
    }
    this.ui.toast(`获得道具: ${name}`);
    this.ui.refreshWeapons();
  }

  // ================= 升级 =================
  collectCrystal(gem) {
    this.crystals += gem.amount;
    this.audio.pickup();
    this.xp += gem.value;
    this.particles.burst(this.player.x, 1, this.player.z, { count: 5, colors: [gem.color, 0xffffff], speed: 4, size: 0.4, life: 0.3, dy: 1.5 });
    let guard = 0;
    while (this.xp >= this.xpNext && guard++ < 10) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = 7 + (this.level - 1) * 6;
      this.pendingLevels++;
    }
    if (this.pendingLevels > 0 && this.state === 'playing') this.showLevelUp();
  }

  showLevelUp() {
    this.state = 'levelup';
    this.audio.levelup();
    // 角色脚下光柱
    const p = this.player;
    this.rings.spawn(p.x, p.z, { color: p.ch.color, maxR: 5, life: 0.8, opacity: 1 });
    this.particles.burst(p.x, 0.4, p.z, { count: 40, colors: [p.ch.color, 0xffffff, 0xffd257], speed: 11, size: 0.7, life: 0.9, dy: 5, gravity: -4 });
    for (let i = 0; i < 30; i++) {
      const a = rand(0, Math.PI * 2);
      this.particles.emit({
        x: p.x + Math.cos(a) * rand(0.3, 1.4), y: 0.2, z: p.z + Math.sin(a) * rand(0.3, 1.4),
        vx: 0, vy: rand(5, 11), vz: 0, color: chance(0.5) ? p.ch.color : 0xffffff,
        life: rand(0.5, 1), size: 0.5, sizeEnd: 0.05, drag: 1.4, gravity: 3,
      });
    }

    const choices = this._rollUpgrades(3);
    this.ui.showLevelUp(choices, (c) => this.takeUpgrade(c));
  }

  _rollUpgrades(n) {
    const entries = UPGRADES.map((u) => ({ u, w: u.w }));
    const out = [];
    const used = new Set();
    for (let i = 0; i < n; i++) {
      const pool = entries.filter((e) => !used.has(e.u.id));
      if (!pool.length) break;
      const pick = weightedPick(pool);
      used.add(pick.u.id);
      const rarityIdx = this._rollTier(0.5);
      const mult = [1, 1.35, 1.75, 2.2][rarityIdx];
      const scaled = {};
      for (const [k, v] of Object.entries(pick.u.stats)) {
        scaled[k] = k === 'heal' ? Math.round(v * mult) : v * mult;
      }
      out.push({
        ...pick.u,
        rarity: `${TIER_NAMES[rarityIdx]}强化`,
        color: rarityIdx > 0 ? TIER_COLORS[rarityIdx] : pick.u.color,
        stats: scaled,
        desc: this._scaleDesc(pick.u.desc, mult),
      });
    }
    return out;
  }

  _scaleDesc(desc, mult) {
    if (mult === 1) return desc;
    return desc.replace(/(\d+(\.\d+)?%?)/g, (m) => {
      const num = parseFloat(m);
      if (m.includes('%')) return `${Math.round(num * mult)}%`;
      return `${Math.round(num * mult)}`;
    });
  }

  takeUpgrade(c) {
    if (c.stats.maxHP) {
      this.stats.apply({ maxHP: c.stats.maxHP });
      this.player.setMaxHP(this.stats.get('maxHP'));
      if (c.stats.heal) this.player.heal(c.stats.heal);
    } else {
      this.stats.apply(c.stats);
      if (c.stats.heal) this.player.heal(c.stats.heal);
      this.player.setMaxHP(this.stats.get('maxHP'));
    }
    this.pendingLevels--;
    if (this.pendingLevels > 0) {
      setTimeout(() => this.showLevelUp(), 60);
    } else {
      this.ui.show('hud');
      this.state = 'playing';
    }
    this.ui.refreshWeapons();
  }

  // ================= 战斗 =================
  rollDamage(base, kind) {
    const st = this.stats;
    let mult = st.get('damageMult');
    if (kind === 'melee') mult *= st.get('meleeMult');
    else if (kind === 'ranged') mult *= st.get('rangedMult');
    else if (kind === 'elem') mult *= st.get('elemMult');

    const p = this.player;
    // 格罗什: 血怒
    if (p.ch.passive.id === 'bloodrage' && p.hp < p.maxHp() * 0.5) mult *= 1.6;

    let crit = chance(st.get('critChance'));
    if (p.ch.passive.id === 'afterimage' && p.consumeAfterimage()) crit = true;
    const dmg = base * mult * (crit ? st.get('critMult') : 1);
    return { dmg: Math.max(1, dmg), crit };
  }

  hitEnemy(e, dmg, opts = {}) {
    if (!e || !e.active) return;
    let amount = dmg;
    // 卡尔: 火力压制
    const src = opts.source;
    if (this.player.ch.passive.id === 'suppression' && src) {
      if (e.lastSupOwner === this.player.ch.id) {
        e.suppression = Math.min(5, (e.suppression || 0) + 1);
      } else {
        e.suppression = 1;
        e.lastSupOwner = this.player.ch.id;
      }
      amount *= 1 + 0.12 * e.suppression;
    }
    // 梅琳: 眩晕
    if (opts.stun) e.stun = Math.max(e.stun, opts.stun);

    amount = Math.min(amount, e.hp + 1);
    this.enemies.damage(e, amount, { kb: opts.kb || 0, dirx: opts.dirx || 0, dirz: opts.dirz || 0 });
    this.damageDealt += amount;

    // 吸血
    const ls = this.stats.get('lifesteal');
    if (ls > 0 && this.player.alive) this.player.heal(amount * ls);

    // 飘字
    const crit = opts.crit;
    const cls = crit ? 'crit' : '';
    if (crit || chance(0.35)) {
      this.floatText(e.x, e.radius + 0.9, e.z, `${Math.round(amount)}`, cls);
    }
    if (chance(0.12)) this.audio.hit(crit);

    if (opts.burnDps) this.enemies.applyBurn(e, opts.burnDps, opts.burnTime || 3);
  }

  impactFx(x, y, z, color, vx = 0, vz = 0) {
    const len = Math.hypot(vx, vz) || 1;
    this.particles.burst(x, y, z, {
      count: 7, colors: [color, 0xffffff, 0xffd257],
      speed: 7, size: 0.45, life: 0.3,
      dx: -vx / len, dy: 0.3, dz: -vz / len, spread: 0.7, drag: 4,
    });
    if (chance(0.25)) this.rings.spawn(x, z, { color, maxR: 1.2, life: 0.25, y: y, opacity: 0.7 });
  }

  explode(x, z, { radius = 3, damage = 0, color = 0xff8a3d, source = null, fromEnemy = false, burnDps = 0, burnTime = 0 } = {}) {
    const g = this;
    const R = radius * this.stats.get('aoeMult');
    this.audio.explode();
    this.shake(0.55 + R * 0.06);
    this.rings.spawn(x, z, { color, maxR: R * 1.4, life: 0.5, opacity: 1 });
    this.rings.spawn(x, z, { color: 0xffffff, maxR: R * 0.8, life: 0.3, opacity: 0.9 });
    this.particles.burst(x, 0.6, z, { count: 34 + R * 5, colors: [color, 0xffffff, 0xffd257], speed: 10 + R * 3, size: 0.9, life: 0.7, dy: 4, gravity: -8, drag: 1.6 });
    for (let i = 0; i < 16; i++) {
      this.smoke.burst(x, 0.7, z, { count: 1, colors: [0x3a3a44, 0x22242c], speed: 4, size: 1.6, sizeEnd: 3.4, life: 1.4, dy: 2.6, spread: 1, drag: 1.2, alpha: 0.55 });
    }
    this.debris.spawn(x, 0.4, z, { color, count: 12, speed: 12, size: 0.24, life: 1.2 });
    this.decals.spawn(x, z, { radius: R * 0.9, life: 7, opacity: 0.55 });

    if (fromEnemy) {
      const p = this.player;
      if (dist2(x, z, p.x, p.z) < (R + p.radius) ** 2) {
        p.takeDamage(damage, { fromX: x, fromZ: z });
      }
      // 爆炸也伤害其他敌人(自爆虫友伤)
      for (const e of this.enemies.list) {
        if (!e.active || e.def.bomber) continue;
        if (dist2(x, z, e.x, e.z) < R * R) this.hitEnemy(e, damage * 0.5, { kb: 6, dirx: e.x - x, dirz: e.z - z, source });
      }
    } else {
      for (const e of this.enemies.list) {
        if (!e.active) continue;
        const d2 = dist2(x, z, e.x, e.z);
        const rr = R + e.radius;
        if (d2 < rr * rr) {
          this.hitEnemy(e, damage, {
            kb: 7, dirx: e.x - x, dirz: e.z - z, crit: false, source, kind: 'elem',
            burnDps, burnTime,
          });
        }
      }
    }
  }

  // Boss 踏地: 对玩家范围伤害
  damageRing(x, z, r, dmg) {
    const p = this.player;
    if (p.alive && dist2(x, z, p.x, p.z) < r * r) p.takeDamage(dmg, { fromX: x, fromZ: z });
  }

  thornBurst(p) {
    this.rings.spawn(p.x, p.z, { color: 0x6bffb0, maxR: 6, life: 0.5, opacity: 1 });
    this.particles.burst(p.x, 0.5, p.z, { count: 30, colors: [0x6bffb0, 0xffffff], speed: 12, size: 0.6, life: 0.6, dy: 2 });
    this.audio.shoot('chain');
    this.shake(0.3);
    for (const e of this.enemies.enemiesInRadius(p.x, p.z, 6)) {
      this.hitEnemy(e, 25, { kb: 14, dirx: e.x - p.x, dirz: e.z - p.z, kind: 'melee' });
    }
  }

  spawnEnemyShot(e, target, def) {
    const lead = 0.35;
    const tx = target.x + target.vx * lead;
    const tz = target.z + target.vz * lead;
    const a = Math.atan2(tx - e.x, tz - e.z);
    const sp = def.projSpeed || 11;
    this.projectiles.fire({
      x: e.x, y: 1.1, z: e.z,
      vx: Math.sin(a) * sp, vz: Math.cos(a) * sp,
      damage: e.dmg, radius: 0.35, life: 3, color: def.accent,
      owner: 'enemy', kind: 'spit', trail: 0.4, source: e,
    });
    this.particles.burst(e.x, 1.1, e.z, { count: 5, colors: [def.accent], speed: 4, size: 0.4, life: 0.25, dx: Math.sin(a), dz: Math.cos(a), dy: 0.2, spread: 0.6 });
    this.audio.shoot('pistol');
  }

  spawnEnemyShotDir(x, y, z, dx, dz, { speed = 10, damage = 10, color = 0xff5032 } = {}) {
    this.projectiles.fire({
      x, y, z, vx: dx * speed, vz: dz * speed,
      damage, radius: 0.4, life: 4, color, owner: 'enemy', kind: 'orb', trail: 0.3,
    });
  }

  onEnemyKilled(e) {
    this.kills++;
    if (e.isBoss) {
      if (e.def.final) {
        this.victory();
      } else {
        this.ui.toast(`击杀了 ${e.def.name}!`);
        this.shake(0.6);
      }
    }
  }

  onPlayerHurt(dmg, fromX, fromZ) {
    this.damageTaken += dmg;
    this.shake(0.5);
    this.hitstop = Math.max(this.hitstop, 0.05);
    this.audio.hurt();
    this.floatText(this.player.x, 2.1, this.player.z, `-${dmg}`, 'player-hurt');
    this.particles.burst(this.player.x, 1.1, this.player.z, { count: 14, colors: [0xff4d6d, 0xffffff], speed: 8, size: 0.55, life: 0.5, dy: 2 });
    if (fromX != null) {
      const a = Math.atan2(this.player.x - fromX, this.player.z - fromZ);
      this.rings.spawn(this.player.x, this.player.z, { color: 0xff4d6d, maxR: 2.6, life: 0.35, y: 0.7 });
    }
    if (this.player.hp <= 0) this.onPlayerDeath();
  }

  onPlayerDeath() {
    if (this.state === 'over') return;
    const p = this.player;
    p.alive = false;
    this.audio.lose();
    this.shake(1.2);
    this.particles.burst(p.x, 1, p.z, { count: 70, colors: [p.ch.color, 0xff4d6d, 0xffffff], speed: 15, size: 0.9, life: 1.1, dy: 5, gravity: -10 });
    this.debris.spawn(p.x, 0.8, p.z, { color: p.ch.color, count: 24, speed: 12, size: 0.3, life: 1.6 });
    this.rings.spawn(p.x, p.z, { color: 0xff4d6d, maxR: 12, life: 1, opacity: 1 });
    setTimeout(() => this.showOver(false), 900);
  }

  victory() {
    if (this.state === 'over') return;
    this.audio.win();
    this.player.alive = true;
    this.state = 'over';
    const p = this.player;
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.particles.burst(p.x + rand(-8, 8), 1, p.z + rand(-8, 8), {
          count: 50, colors: [0xffd257, 0x6bffb0, 0x4de8ff, 0xffffff],
          speed: 14, size: 0.9, life: 1.4, dy: 7, gravity: -6,
        });
      }, i * 220);
    }
    this.ui.banner('胜利!', false);
    setTimeout(() => this.showOver(true), 1600);
  }

  showOver(win) {
    this.state = 'over';
    this.director.stop();
    const mins = Math.floor(this.runTime / 60);
    const secs = Math.floor(this.runTime % 60);
    this.ui.showOver(win, {
      '到达波次': `${this.wave}`,
      '击杀数': `${this.kills}`,
      '等级': `Lv ${this.level}`,
      '总伤害': `${Math.round(this.damageDealt)}`,
      '承受伤害': `${Math.round(this.damageTaken)}`,
      '用时': `${mins}分${String(secs).padStart(2, '0')}秒`,
      '剩余晶体': `${this.crystals}`,
      '角色': this.player.ch.name,
    });
  }

  abandonRun() {
    this.director.stop();
    this.state = 'title';
    this.ui.show('title');
  }

  togglePause(on) {
    if (on && this.state === 'playing') {
      this.state = 'paused';
      this.ui.show('pause');
    } else if (!on && this.state === 'paused') {
      this.state = 'playing';
      this.ui.show('hud');
    }
  }

  shake(power) {
    this.shakeFx.add(power);
  }

  floatText(x, y, z, text, cls) {
    this.dmgNums.spawn(x, y, z, text, cls);
  }

  // ================= 主循环 =================
  frame(dtReal) {
    const dtRaw = Math.min(0.05, dtReal);
    this.tick++;

    // 命中顿帧
    let dt = dtRaw;
    if (this.hitstop > 0) {
      this.hitstop -= dtRaw;
      dt = dtRaw * 0.12;
    }

    this.shakeFx.update(dtRaw);
    this.rings.update(dtRaw);
    this.bolts.update(dtRaw);
    this.beams.update(dtRaw);
    this.decals.update(dtRaw);
    this.weapons.swings.update(dtRaw);

    const simActive = this.state === 'playing';
    if (simActive) {
      this.elapsed += dt;
      this.runTime += dt;
      this.player.update(dt, this.input);
      this.enemies.update(dt);
      this.weapons.update(dt);
      this.projectiles.update(dt);
      this.pickups.update(dt);
      this.director.update(dt);
      this.ui.updateHUD();
    } else if (this.state === 'title' || this.state === 'select' || this.state === 'help') {
      this.elapsed += dtRaw;
      this._attract(dtRaw);
    } else {
      this.elapsed += dtRaw * 0.25;
    }

    // 视觉层始终更新
    this.particles.update(dtRaw);
    this.smoke.update(dtRaw);
    this.debris.update(dtRaw);
    this._updateGhosts(dtRaw);
    this._ambient(dtRaw);
    this.dmgNums.update(dtRaw);

    // 相机
    if (this.player && (simActive || this.state === 'levelup' || this.state === 'shop' || this.state === 'paused' || this.state === 'over')) {
      this.engine.follow(this.player, { x: this.player.vx, z: this.player.vz }, dtRaw, this.shakeFx);
    } else {
      this._orbitCamera(dtRaw);
    }

    this.engine.render(dtRaw, this.elapsed);
    this.input.endFrame();
  }

  _updateGhosts(dt) {
    for (let i = 0; i < this._ghosts.length; i++) {
      const g = this._ghosts[i];
      g.life -= dt;
      g.m.material.opacity = Math.max(0, (g.life / g.max) * 0.42);
      g.m.position.y -= dt * 0.6;
      if (g.life <= 0) {
        g.m.visible = false;
        this._ghostPool.push(g.m);
        this._ghosts.splice(i, 1);
        i--;
      }
    }
  }

  _ambient(dt) {
    this._ambientT -= dt;
    if (this._ambientT > 0) return;
    this._ambientT = 0.12;
    const L = this.arenaLimit;
    const x = rand(-L, L), z = rand(-L, L);
    this.particles.emit({
      x, y: rand(0.5, 6), z,
      vx: rand(-0.4, 0.4), vy: rand(0.2, 0.7), vz: rand(-0.4, 0.4),
      color: chance(0.75) ? 0x4de8ff : 0xb06bff,
      life: rand(2, 4.5), size: rand(0.2, 0.4), sizeEnd: 0.02, drag: 1.02, alpha: 0.5,
    });
  }

  _attract(dt) {
    // 标题界面: 空场漂浮微粒
    if (!this._attractT || (this._attractT -= dt) <= 0) {
      this._attractT = 0.4;
      const a = rand(0, Math.PI * 2), r = rand(4, 20);
      this.particles.burst(Math.cos(a) * r, 1, Math.sin(a) * r, {
        count: 4, colors: [0x4de8ff, 0xb06bff, 0x6bffb0], speed: 2.5, size: 0.5, life: 1.4, dy: 2.5, spread: 1, drag: 1.4,
      });
    }
  }

  _orbitCamera(dt) {
    const t = this.elapsed * 0.12;
    const r = 30;
    const cam = this.engine.camera;
    const tx = Math.cos(t) * 6;
    const tz = Math.sin(t) * 6;
    cam.position.set(tx + Math.cos(t) * r, 24, tz + Math.sin(t) * r);
    cam.lookAt(0, 1, 0);
  }

  // 调试接口
  debugState() {
    return {
      state: this.state,
      wave: this.wave,
      hp: this.player?.hp,
      maxHP: this.player?.maxHp(),
      kills: this.kills,
      level: this.level,
      crystals: this.crystals,
      enemies: this.enemies.count(),
      weapons: this.weapons.list.map((w) => `${w.defId}:${w.tier}`),
      timeLeft: this.director.timeLeft,
      particles: this.particles.count,
    };
  }
}
