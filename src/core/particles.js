import * as THREE from 'three';

// 软圆粒子贴图(程序化)
function makeDotTexture() {
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let DOT_TEX = null;
export function dotTexture() {
  if (!DOT_TEX) DOT_TEX = makeDotTexture();
  return DOT_TEX;
}

const VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (420.0 / max(1.0, -mv.z));
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
precision mediump float;
uniform sampler2D uTex;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 t = texture2D(uTex, gl_PointCoord);
  float a = vAlpha * t.a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
}`;

// CPU 池化粒子系统
export class ParticleSystem {
  constructor(scene, { max = 3000, blending = THREE.AdditiveBlending } = {}) {
    this.max = max;
    this.count = 0;

    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);

    // 模拟数据
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.size0 = new Float32Array(max);
    this.size1 = new Float32Array(max);
    this.col0 = new Float32Array(max * 3);
    this.alpha0 = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.grav = new Float32Array(max);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);

    this.geo = geo;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uTex: { value: dotTexture() } },
      transparent: true,
      depthWrite: false,
      blending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  // 单个粒子
  emit(o) {
    if (this.count >= this.max) return;
    const i = this.count++;
    const p = i * 3;
    this.pos[p] = o.x; this.pos[p + 1] = o.y ?? 0.4; this.pos[p + 2] = o.z;
    this.vel[p] = o.vx || 0; this.vel[p + 1] = o.vy || 0; this.vel[p + 2] = o.vz || 0;
    const c = o.color || 0xffffff;
    const r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
    this.col0[p] = r; this.col0[p + 1] = g; this.col0[p + 2] = b;
    this.life[i] = this.maxLife[i] = o.life ?? 0.6;
    this.size0[i] = o.size ?? 0.5;
    this.size1[i] = o.sizeEnd ?? (o.size ?? 0.5) * 0.25;
    this.alpha0[i] = o.alpha ?? 1;
    this.drag[i] = o.drag ?? 0.6;
    this.grav[i] = o.gravity ?? 0;
  }

  // 锥形爆发
  burst(x, y, z, o) {
    const n = o.count ?? 12;
    const speed = o.speed ?? 8;
    const speedVar = o.speedVar ?? 0.5;
    const dirX = o.dx ?? 0, dirY = o.dy ?? 0, dirZ = o.dz ?? 1;
    const spread = o.spread ?? 1; // 0..1 张角
    const colors = o.colors || [o.color || 0xffffff];
    for (let k = 0; k < n; k++) {
      // 在单位球上采样, 再向方向偏置
      let ox = Math.random() * 2 - 1;
      let oy = Math.random() * 2 - 1;
      let oz = Math.random() * 2 - 1;
      const ol = Math.hypot(ox, oy, oz) || 1;
      ox /= ol; oy /= ol; oz /= ol;
      ox = lerpN(ox, dirX, 1 - spread);
      oy = lerpN(oy, dirY, 1 - spread);
      oz = lerpN(oz, dirZ, 1 - spread);
      const nl = Math.hypot(ox, oy, oz) || 1;
      const sp = speed * (1 - speedVar + Math.random() * speedVar * 2);
      this.emit({
        x, y, z,
        vx: (ox / nl) * sp,
        vy: (oy / nl) * sp,
        vz: (oz / nl) * sp,
        color: colors[(Math.random() * colors.length) | 0],
        life: o.life ?? 0.5,
        size: o.size ?? 0.5,
        sizeEnd: o.sizeEnd,
        alpha: o.alpha,
        drag: o.drag ?? 1.6,
        gravity: o.gravity ?? 0,
      });
    }
  }

  update(dt) {
    for (let i = 0; i < this.count; i++) {
      let l = this.life[i] - dt;
      if (l <= 0) {
        // swap remove
        const last = this.count - 1;
        this._swap(i, last);
        this.count--;
        i--;
        continue;
      }
      this.life[i] = l;
      const p = i * 3;
      const dragF = Math.pow(this.drag[i], dt);
      this.vel[p] *= dragF;
      this.vel[p + 1] = this.vel[p + 1] * dragF + this.grav[i] * dt;
      this.vel[p + 2] *= dragF;
      this.pos[p] += this.vel[p] * dt;
      this.pos[p + 1] += this.vel[p + 1] * dt;
      this.pos[p + 2] += this.vel[p + 2] * dt;

      const t = 1 - l / this.maxLife[i];
      this.size[i] = this.size0[i] + (this.size1[i] - this.size0[i]) * t;
      const fade = Math.min(1, l * 6) * (1 - t * t);
      this.alpha[i] = this.alpha0[i] * fade;
      this.col[p] = this.col0[p];
      this.col[p + 1] = this.col0[p + 1];
      this.col[p + 2] = this.col0[p + 2];
    }
    const geo = this.geo;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aColor.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
    geo.setDrawRange(0, this.count);
  }

  _swap(a, b) {
    if (a === b) return;
    for (let k = 0; k < 3; k++) {
      const pa = a * 3 + k, pb = b * 3 + k;
      swapV(this.pos, pa, pb); swapV(this.col, pa, pb); swapV(this.col0, pa, pb);
      swapV(this.vel, pa, pb);
    }
    swapV(this.size, a, b); swapV(this.alpha, a, b);
    swapV(this.life, a, b); swapV(this.maxLife, a, b);
    swapV(this.size0, a, b); swapV(this.size1, a, b);
    swapV(this.alpha0, a, b); swapV(this.drag, a, b); swapV(this.grav, a, b);
  }
}

function swapV(arr, a, b) {
  const t = arr[a]; arr[a] = arr[b]; arr[b] = t;
}
function lerpN(a, b, t) { return a + (b - a) * t; }

// 碎块(击杀爆裂的实体小方块)
export class DebrisSystem {
  constructor(scene, { max = 220 } = {}) {
    this.max = max;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.1, vertexColors: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);

    this.items = [];
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._v = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._c = new THREE.Color();
  }

  spawn(x, y, z, { color = 0xffffff, count = 8, speed = 9, size = 0.22, life = 1.1, up = 7 } = {}) {
    for (let i = 0; i < count; i++) {
      if (this.items.length >= this.max) this.items.shift();
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.8);
      this.items.push({
        x, y: y + Math.random() * 0.4, z,
        vx: Math.cos(a) * sp, vy: up * (0.5 + Math.random()), vz: Math.sin(a) * sp,
        rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6,
        wx: (Math.random() - 0.5) * 14, wy: (Math.random() - 0.5) * 14, wz: (Math.random() - 0.5) * 14,
        s: size * (0.6 + Math.random() * 0.8),
        life, maxLife: life,
        color,
      });
    }
  }

  update(dt) {
    const items = this.items;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      it.life -= dt;
      if (it.life <= 0) { items.splice(i, 1); i--; continue; }
      it.vy -= 26 * dt;
      it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
      if (it.y < 0.08) { it.y = 0.08; it.vy *= -0.35; it.vx *= 0.7; it.vz *= 0.7; it.wx *= 0.7; it.wz *= 0.7; }
      it.rx += it.wx * dt; it.ry += it.wy * dt; it.rz += it.wz * dt;
    }
    const n = items.length;
    this.mesh.count = n;
    for (let i = 0; i < n; i++) {
      const it = items[i];
      const k = it.life / it.maxLife;
      this._e.set(it.rx, it.ry, it.rz);
      this._q.setFromEuler(this._e);
      const s = it.s * (0.4 + 0.6 * k);
      this._v.set(it.x, it.y, it.z);
      this._s.set(s, s, s);
      this._m.compose(this._v, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
      this._c.setHex(it.color).multiplyScalar(0.35 + 0.65 * k);
      this.mesh.setColorAt(i, this._c);
    }
    if (n) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor.needsUpdate = true;
    }
  }
}
