// 数学 / 随机 / 空间哈希 等工具
export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const chance = (p) => Math.random() < p;
export const dist2 = (ax, az, bx, bz) => {
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz;
};
export const dist = (ax, az, bx, bz) => Math.sqrt(dist2(ax, az, bx, bz));

// 加权随机: entries = [{w, ...}]
export function weightedPick(entries) {
  let total = 0;
  for (const e of entries) total += e.w;
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.w;
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

// 简易种子随机(备用)
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 空间哈希(XZ 平面)
export class SpatialHash {
  constructor(cell = 4) {
    this.cell = cell;
    this.map = new Map();
  }
  clear() { this.map.clear(); }
  _key(cx, cz) { return cx * 100003 + cz; }
  insert(obj) {
    const cx = Math.floor(obj.x / this.cell), cz = Math.floor(obj.z / this.cell);
    const k = this._key(cx, cz);
    let bucket = this.map.get(k);
    if (!bucket) { bucket = []; this.map.set(k, bucket); }
    bucket.push(obj);
    obj._hashCell = k;
  }
  query(x, z, radius, out = []) {
    out.length = 0;
    const c = this.cell;
    const minCx = Math.floor((x - radius) / c), maxCx = Math.floor((x + radius) / c);
    const minCz = Math.floor((z - radius) / c), maxCz = Math.floor((z + radius) / c);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const bucket = this.map.get(this._key(cx, cz));
        if (bucket) for (let i = 0; i < bucket.length; i++) out.push(bucket[i]);
      }
    }
    return out;
  }
}

// 简单对象池
export class Pool {
  constructor(factory, reset, size = 32) {
    this.factory = factory; this.reset = reset;
    this.free = [];
    for (let i = 0; i < size; i++) this.free.push(factory());
  }
  get(...args) {
    const o = this.free.length ? this.free.pop() : this.factory();
    if (this.reset) this.reset(o, ...args);
    return o;
  }
  put(o) { this.free.push(o); }
}

// 简易事件总线
export class Emitter {
  constructor() { this.map = new Map(); }
  on(ev, fn) {
    if (!this.map.has(ev)) this.map.set(ev, new Set());
    this.map.get(ev).add(fn);
    return () => this.map.get(ev)?.delete(fn);
  }
  emit(ev, ...args) {
    const set = this.map.get(ev);
    if (set) for (const fn of [...set]) fn(...args);
  }
}
