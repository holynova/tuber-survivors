import { ENEMIES, BOSSES, waveDuration, waveHpMult, waveDmgMult, waveBudget } from './data.js';
import { rand, dist2, clamp } from '../core/utils.js';

const COSTS = { mite: 1, brute: 2.4, spitter: 2.2, charger: 2.6, bomber: 2.4 };
const BOSS_WAVES = { 5: 'brood', 10: 'brood', 15: 'brood', 20: 'tyrant' };

export class WaveDirector {
  constructor(game) {
    this.game = game;
    this.wave = 0;
    this.timeLeft = 0;
    this.duration = 0;
    this.budgetLeft = 0;
    this.spawnTimer = 0;
    this.active = false;
    this.bossSpawned = false;
    this.choices = [];
  }

  startWave(n) {
    this.wave = n;
    this.duration = waveDuration(n);
    this.timeLeft = this.duration;
    this.budgetLeft = waveBudget(n);
    this.spawnTimer = 0.4;
    this.active = true;
    this.bossSpawned = false;
    this.choices = Object.values(ENEMIES)
      .filter((d) => d.spawnFrom <= n)
      .map((d) => ({ def: d, w: d.weight * (d.spawnFrom === n ? 1.6 : 1) }));
    this.hpMult = waveHpMult(n);
    this.dmgMult = waveDmgMult(n);

    const g = this.game;
    g.onWaveStart(n);
    g.audio.waveStart();

    if (BOSS_WAVES[n]) this._spawnBoss(BOSS_WAVES[n]);
  }

  _spawnBoss(id) {
    const def = BOSSES[id];
    const g = this.game;
    const p = g.player;
    const a = Math.atan2(-p.x, -p.z) + rand(-0.5, 0.5);
    const R = g.arenaLimit - 4;
    const x = clamp(Math.sin(a) * R, -R, R);
    const z = clamp(Math.cos(a) * R, -R, R);
    const hpMult = this.hpMult * (1 + (this.wave - 5) * 0.12);
    const e = g.enemies.spawn(def.id, x, z, { hpMult, dmgMult: this.dmgMult, sizeMul: 1 });
    this.bossSpawned = true;
    g.audio.boss();
    g.shake(1);
    g.rings.spawn(x, z, { color: def.color, maxR: 14, life: 1.1, opacity: 1 });
    g.particles.burst(x, 1, z, { count: 60, colors: [def.color, def.accent, 0xffffff], speed: 16, size: 1, life: 1, dy: 5, gravity: -10 });
    g.ui.banner(`⚠ ${def.name} 登场 ⚠`, true);
    return e;
  }

  update(dt) {
    if (!this.active) return;
    const g = this.game;

    // 波次倒计时
    this.timeLeft -= dt;
    const bossAlive = g.enemies.list.some((e) => e.active && e.isBoss);
    if (this.timeLeft <= 0) {
      if (this.wave >= 20 && bossAlive) {
        this.timeLeft = 0; // 终局: 等待 Boss 被击杀
      } else if (!bossAlive) {
        this.timeLeft = 0;
        this.active = false;
        g.onWaveComplete(this.wave);
        return;
      } else {
        this.timeLeft = 0;
      }
    }

    // 刷新节奏: 随波次加快
    this.spawnTimer -= dt;
    const interval = Math.max(0.16, 0.85 - this.wave * 0.035);
    const cap = Math.min(110, 26 + this.wave * 4.5);
    if (this.spawnTimer <= 0 && this.budgetLeft > 0) {
      this.spawnTimer = interval * rand(0.6, 1.4);
      if (g.enemies.count() < cap) this._spawnOne();
    }
  }

  _spawnOne() {
    const g = this.game;
    const p = g.player;
    // 选择类型
    const affordable = this.choices.filter((c) => COSTS[c.def.id] <= this.budgetLeft || this.budgetLeft > 3);
    const pool = affordable.length ? affordable : this.choices;
    let total = 0;
    for (const c of pool) total += c.w;
    let r = Math.random() * total;
    let chosen = pool[0];
    for (const c of pool) { r -= c.w; if (r <= 0) { chosen = c; break; } }
    const def = chosen.def;
    const cost = COSTS[def.id];
    if (this.budgetLeft < cost) return;
    this.budgetLeft -= cost;

    // 生成位置: 玩家外围环带, 限制在场内
    const L = g.arenaLimit - 1.5;
    let x = 0, z = 0;
    for (let tries = 0; tries < 8; tries++) {
      const a = rand(0, Math.PI * 2);
      const d = rand(15, 24);
      x = p.x + Math.sin(a) * d;
      z = p.z + Math.cos(a) * d;
      if (Math.abs(x) < L && Math.abs(z) < L) break;
      x = clamp(x, -L, L); z = clamp(z, -L, L);
    }
    // 避免叠在其他敌人身上
    for (let tries = 0; tries < 5; tries++) {
      let ok = true;
      for (const e of g.enemies.list) {
        if (dist2(x, z, e.x, e.z) < 2.5) { ok = false; break; }
      }
      if (ok) break;
      x = clamp(x + rand(-3, 3), -L, L);
      z = clamp(z + rand(-3, 3), -L, L);
    }

    const isElite = this.wave >= 8 && Math.random() < Math.min(0.28, this.wave * 0.02);
    g.enemies.spawn(def.id, x, z, {
      hpMult: this.hpMult * (isElite ? 2.6 : 1),
      dmgMult: this.dmgMult * (isElite ? 1.35 : 1),
      sizeMul: isElite ? 1.32 : 1,
      silent: true,
    });
    if (isElite) {
      g.rings.spawn(x, z, { color: 0xffd257, maxR: 3, life: 0.5, y: 0.1 });
      g.particles.burst(x, 0.4, z, { count: 8, colors: [0xffd257, 0xffffff], speed: 5, size: 0.5, life: 0.5, dy: 1.6 });
    }
  }

  stop() {
    this.active = false;
  }
}
