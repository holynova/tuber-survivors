import * as THREE from 'three';

// ---------- 冲击波圆环 ----------
export class Rings {
  constructor(scene, { max = 40 } = {}) {
    this.pool = [];
    this.active = [];
    const geo = new THREE.RingGeometry(0.86, 1, 64);
    for (let i = 0; i < max; i++) {
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
  spawn(x, z, { color = 0xffffff, maxR = 4, life = 0.5, y = 0.12, startR = 0.3, opacity = 1 } = {}) {
    const m = this.pool.pop();
    if (!m) return;
    m.visible = true;
    m.position.set(x, y, z);
    m.material.color.setHex(color);
    m.userData = { t: 0, life, maxR, startR, opacity };
    this.active.push(m);
  }
  update(dt) {
    for (let i = 0; i < this.active.length; i++) {
      const m = this.active[i];
      const u = m.userData;
      u.t += dt;
      const k = Math.min(1, u.t / u.life);
      const e = 1 - Math.pow(1 - k, 3);
      const r = u.startR + (u.maxR - u.startR) * e;
      m.scale.set(r, r, r);
      m.material.opacity = u.opacity * (1 - k);
      if (k >= 1) {
        m.visible = false;
        this.active.splice(i, 1);
        this.pool.push(m);
        i--;
      }
    }
  }
}

// ---------- 闪电链 ----------
export class Bolts {
  constructor(scene, { max = 28 } = {}) {
    this.pool = [];
    this.active = [];
    for (let i = 0; i < max; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 3), 3).setUsage(THREE.DynamicDrawUsage));
      const mat = new THREE.LineBasicMaterial({
        color: 0x9fe8ff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      line.visible = false;
      line.userData = { pos: geo.attributes.position, t: 0, life: 0.22, seed: 0 };
      scene.add(line);
      this.pool.push(line);
    }
  }
  strike(ax, ay, az, bx, by, bz, { color = 0x9fe8ff, life = 0.22, jag = 0.5, segs = 14 } = {}) {
    const line = this.pool.pop();
    if (!line) return;
    line.visible = true;
    line.material.color.setHex(color);
    const attr = line.userData.pos;
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.hypot(dx, dy, dz) || 1;
    // 垂直基
    let px = -dz, py = 0, pz = dx;
    const pl = Math.hypot(px, pz) || 1;
    px /= pl; pz /= pl;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const amp = jag * Math.sin(Math.PI * t);
      const j = (Math.random() * 2 - 1) * amp;
      const j2 = (Math.random() * 2 - 1) * amp * 0.7;
      attr.setXYZ(i, ax + dx * t + px * j, ay + dy * t + j2, az + dz * t + pz * j);
    }
    attr.needsUpdate = true;
    line.geometry.setDrawRange(0, segs + 1);
    line.userData.t = 0;
    line.userData.life = life;
    this.active.push(line);
  }
  update(dt) {
    for (let i = 0; i < this.active.length; i++) {
      const l = this.active[i];
      l.userData.t += dt;
      const k = l.userData.t / l.userData.life;
      l.material.opacity = Math.max(0, 1 - k) * (0.65 + 0.35 * Math.random());
      if (k >= 1) {
        l.visible = false;
        this.active.splice(i, 1);
        this.pool.push(l);
        i--;
      }
    }
  }
}

// ---------- 激光束 ----------
export class Beams {
  constructor(scene, { max = 10 } = {}) {
    this.pool = [];
    this.active = [];
    const geo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < max; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const core = new THREE.Mesh(geo, mat);
      const haloMat = mat.clone();
      haloMat.opacity = 0;
      const halo = new THREE.Mesh(geo, haloMat);
      const g = new THREE.Group();
      g.add(halo); g.add(core);
      g.visible = false;
      g.frustumCulled = false;
      scene.add(g);
      this.pool.push({ g, core, halo });
    }
  }
  // 持续光束: 每帧 refresh, 或单次闪现
  spawn(ax, az, bx, bz, { color = 0xffffff, width = 0.3, y = 0.8, life = 0.16, glow = 0.9 } = {}) {
    const b = this.pool.pop();
    if (!b) return;
    b.g.visible = true;
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz) || 0.001;
    b.g.position.set((ax + bx) / 2, y, (az + bz) / 2);
    b.g.rotation.y = -Math.atan2(dz, dx);
    b.core.scale.set(len, width, width);
    b.core.material.color.setHex(color);
    b.core.material.opacity = 1;
    b.halo.scale.set(len, width * 2.1, width * 2.1);
    b.halo.material.color.setHex(color);
    b.halo.material.opacity = 0.16 * glow;
    b.g.userData = { t: 0, life };
    this.active.push(b);
    return b;
  }
  update(dt) {
    for (let i = 0; i < this.active.length; i++) {
      const b = this.active[i];
      b.g.userData.t += dt;
      const k = b.g.userData.t / b.g.userData.life;
      const f = Math.max(0, 1 - k);
      b.core.material.opacity = f;
      b.halo.material.opacity = 0.16 * f;
      if (k >= 1) {
        b.g.visible = false;
        this.active.splice(i, 1);
        this.pool.push(b);
        i--;
      }
    }
  }
}

// ---------- 地面焦痕 ----------
export class Decals {
  constructor(scene, { max = 40 } = {}) {
    this.pool = [];
    this.active = [];
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(0.55, 'rgba(20,10,5,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(cv);
    for (let i = 0; i < max; i++) {
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      scene.add(m);
      this.pool.push(m);
    }
  }
  spawn(x, z, { radius = 3, life = 6, opacity = 0.75 } = {}) {
    const m = this.pool.pop();
    if (!m) return;
    m.visible = true;
    m.position.set(x, 0.04 + Math.random() * 0.005, z);
    m.rotation.z = Math.random() * Math.PI;
    m.scale.set(radius * 2, radius * 2, 1);
    m.userData = { t: 0, life, opacity };
    this.active.push(m);
  }
  update(dt) {
    for (let i = 0; i < this.active.length; i++) {
      const m = this.active[i];
      m.userData.t += dt;
      const k = m.userData.t / m.userData.life;
      m.material.opacity = m.userData.opacity * Math.min(1, k * 8) * (1 - k);
      if (k >= 1) {
        m.visible = false;
        this.active.splice(i, 1);
        this.pool.push(m);
        i--;
      }
    }
  }
}

// ---------- 漂浮伤害数字 (DOM) ----------
export class DamageNumbers {
  constructor(layer, camera, renderer) {
    this.layer = layer;
    this.camera = camera;
    this.renderer = renderer;
    this.pool = [];
    this.active = [];
    this._v = new THREE.Vector3();
    this.budgetPerFrame = 10;
  }
  spawn(x, y, z, text, cls = '', scale = 1) {
    let el = this.pool.pop();
    if (!el) {
      el = document.createElement('div');
      el.className = 'dmg-num';
      this.layer.appendChild(el);
    }
    el.className = 'dmg-num ' + cls;
    el.textContent = text;
    el.style.opacity = '1';
    el.style.display = 'block';
    const life = cls.includes('crit') ? 1.0 : 0.75;
    this.active.push({ el, x, y, z, t: 0, life, rise: 46 + Math.random() * 18, drift: (Math.random() - 0.5) * 40, scale });
  }
  update(dt) {
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    for (let i = 0; i < this.active.length; i++) {
      const d = this.active[i];
      d.t += dt;
      const k = d.t / d.life;
      if (k >= 1) {
        d.el.style.display = 'none';
        this.active.splice(i, 1);
        this.pool.push(d.el);
        i--;
        continue;
      }
      this._v.set(d.x, d.y, d.z).project(this.camera);
      if (this._v.z > 1) { d.el.style.display = 'none'; continue; }
      d.el.style.display = 'block';
      const sx = (this._v.x * 0.5 + 0.5) * w;
      const sy = (-this._v.y * 0.5 + 0.5) * h - d.rise * k;
      const s = d.scale * (1 + 0.25 * Math.max(0, 1 - k * 5));
      d.el.style.transform = `translate(-50%,-50%) translate(${sx + d.drift * k}px, ${sy}px) scale(${s})`;
      d.el.style.opacity = String(k < 0.7 ? 1 : (1 - k) / 0.3);
    }
  }
}

// ---------- 屏幕震动 ----------
export class ScreenShake {
  constructor() {
    this.power = 0;
    this.decay = 6;
    this.offset = new THREE.Vector3();
    this.rotZ = 0;
  }
  add(p) { this.power = Math.min(1.4, this.power + p); }
  update(dt) {
    if (this.power > 0.001) {
      this.offset.set(
        (Math.random() * 2 - 1) * this.power * 0.55,
        (Math.random() * 2 - 1) * this.power * 0.4,
        (Math.random() * 2 - 1) * this.power * 0.35,
      );
      this.rotZ = (Math.random() * 2 - 1) * this.power * 0.02;
      this.power = Math.max(0, this.power - dt * this.decay * (0.5 + this.power));
    } else {
      this.offset.set(0, 0, 0);
      this.rotZ = 0;
    }
  }
}
