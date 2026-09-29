// 键盘/输入
export class Input {
  constructor(target = window) {
    this.keys = new Set();
    this.pressed = new Set();
    this.onKeyDown = null;

    target.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.code;
      this.keys.add(k);
      this.pressed.add(k);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
      this.onKeyDown?.(k, e);
    });
    target.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }
  down(code) { return this.keys.has(code); }
  consume(code) {
    if (this.pressed.has(code)) { this.pressed.delete(code); return true; }
    return false;
  }
  endFrame() { this.pressed.clear(); }
  // 移动向量 (x, z)
  moveVector(out = { x: 0, z: 0 }) {
    let x = 0, z = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) z -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) z += 1;
    if (x || z) {
      const inv = 1 / Math.hypot(x, z);
      x *= inv; z *= inv;
    }
    out.x = x; out.z = z;
    return out;
  }
}
