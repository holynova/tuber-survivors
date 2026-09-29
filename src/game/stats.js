import { CHARACTERS } from './data.js';

const DEFAULTS = {
  maxHP: 0,
  damageMult: 1, meleeMult: 1, rangedMult: 1, elemMult: 1,
  attackSpeedMult: 1, moveSpeedMult: 1,
  critChance: 0.05, critMult: 2,
  armor: 0, dodge: 0,
  pickupMult: 1, lifesteal: 0, knockbackMult: 1,
  aoeMult: 1, rangeMult: 1,
};

export const BASE_MOVE_SPEED = 7.8;

// 玩家属性: 角色基础 + 一次性加成(道具/升级) 叠加
export class Stats {
  constructor(charId) {
    const ch = CHARACTERS.find((c) => c.id === charId) || CHARACTERS[0];
    this.character = ch;
    this.flat = {};        // 加法项
    this.mult = {};        // 乘法项 (叠加在基础之上)
    for (const [k, v] of Object.entries(ch.base)) {
      if (k.endsWith('Mult')) this.mult[k] = (this.mult[k] ?? 1) * v;
      else this.flat[k] = (this.flat[k] ?? 0) + v;
    }
    this._cache = null;
  }

  apply(stats) {
    for (const [k, v] of Object.entries(stats)) {
      if (k === 'heal') continue;
      if (k.endsWith('Mult')) this.mult[k] = (this.mult[k] ?? 1) * (1 + v);
      else this.flat[k] = (this.flat[k] ?? 0) + v;
    }
    this._cache = null;
  }

  get(k) {
    if (!this._cache) this._build();
    return this._cache[k];
  }

  _build() {
    const c = {};
    for (const [k, v] of Object.entries(DEFAULTS)) {
      c[k] = v * (this.mult[k] ?? 1) + (this.flat[k] ?? 0);
    }
    c.moveSpeed = BASE_MOVE_SPEED * c.moveSpeedMult;
    c.dodge = Math.min(0.45, c.dodge);
    c.critChance = Math.min(0.85, c.critChance);
    c.armor = Math.max(0, c.armor);
    c.maxHP = Math.max(1, c.maxHP);
    this._cache = c;
  }

  healBonus(stats) { return stats.heal ?? 0; }
}
