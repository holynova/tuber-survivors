// 程序化音效 (WebAudio, 无外部资源)
export class AudioKit {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._noise = null;
    this._last = new Map();
  }
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp);
    comp.connect(this.ctx.destination);
    // 噪声源
    const len = this.ctx.sampleRate * 1.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noise = buf;
  }
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }
  _throttle(key, ms) {
    const now = performance.now();
    const last = this._last.get(key) || 0;
    if (now - last < ms) return true;
    this._last.set(key, now);
    return false;
  }
  tone({ freq = 440, end = null, type = 'square', dur = 0.1, vol = 0.3, delay = 0, curve = 'exp' }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (end) osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    else g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  noise({ dur = 0.2, vol = 0.3, freq = 1200, q = 1, delay = 0, type = 'lowpass' }) {
    if (!this.ctx || this.muted || !this._noise) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  // ---- 语义化音效 ----
  shoot(kind) {
    if (!this.ctx) return;
    switch (kind) {
      case 'pistol': this.tone({ freq: 900, end: 300, type: 'square', dur: 0.07, vol: 0.16 }); break;
      case 'smg': if (this._throttle('smg', 60)) return; this.tone({ freq: 760, end: 420, type: 'sawtooth', dur: 0.05, vol: 0.1 }); break;
      case 'shotgun':
        this.noise({ dur: 0.22, vol: 0.34, freq: 900, q: 0.8 });
        this.tone({ freq: 240, end: 70, type: 'square', dur: 0.16, vol: 0.22 }); break;
      case 'melee': this.noise({ dur: 0.16, vol: 0.2, freq: 2400, q: 2, type: 'bandpass' }); break;
      case 'rocket': this.noise({ dur: 0.3, vol: 0.24, freq: 600 }); this.tone({ freq: 420, end: 160, type: 'sawtooth', dur: 0.22, vol: 0.12 }); break;
      case 'chain':
        this.tone({ freq: 1800, end: 300, type: 'sawtooth', dur: 0.18, vol: 0.13 });
        this.noise({ dur: 0.14, vol: 0.16, freq: 3800, q: 3, type: 'highpass' }); break;
      case 'beam': if (this._throttle('beam', 140)) return; this.tone({ freq: 1200, end: 1600, type: 'sine', dur: 0.1, vol: 0.08 }); break;
      case 'turret': this.tone({ freq: 640, end: 380, type: 'triangle', dur: 0.06, vol: 0.12 }); break;
      case 'orbit': if (this._throttle('orbit', 120)) return; this.noise({ dur: 0.1, vol: 0.1, freq: 3000, q: 4, type: 'bandpass' }); break;
    }
  }
  hit(crit = false) {
    if (!this.ctx || this._throttle('hit', 45)) return;
    this.tone({ freq: crit ? 760 : 520, end: crit ? 220 : 180, type: 'square', dur: crit ? 0.1 : 0.05, vol: crit ? 0.2 : 0.11 });
    this.noise({ dur: 0.05, vol: 0.1, freq: 2600, q: 1.5, type: 'bandpass' });
  }
  kill() {
    if (!this.ctx || this._throttle('kill', 70)) return;
    this.noise({ dur: 0.24, vol: 0.2, freq: 700 });
    this.tone({ freq: 320, end: 90, type: 'triangle', dur: 0.18, vol: 0.14 });
  }
  explode() {
    if (!this.ctx) return;
    this.noise({ dur: 0.55, vol: 0.4, freq: 500, q: 0.6 });
    this.tone({ freq: 140, end: 40, type: 'sine', dur: 0.5, vol: 0.35 });
  }
  pickup() {
    if (!this.ctx || this._throttle('pick', 60)) return;
    this.tone({ freq: 880 + Math.random() * 180, end: 1500, type: 'sine', dur: 0.08, vol: 0.09 });
  }
  levelup() {
    if (!this.ctx) return;
    [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.22, vol: 0.16, delay: i * 0.07 }));
  }
  dash() {
    if (!this.ctx) return;
    this.noise({ dur: 0.2, vol: 0.16, freq: 1800, q: 1, type: 'bandpass' });
    this.tone({ freq: 640, end: 180, type: 'sine', dur: 0.16, vol: 0.1 });
  }
  hurt() {
    if (!this.ctx) return;
    this.tone({ freq: 300, end: 90, type: 'sawtooth', dur: 0.2, vol: 0.24 });
    this.noise({ dur: 0.14, vol: 0.16, freq: 800 });
  }
  ui() { this.tone({ freq: 660, end: 880, type: 'triangle', dur: 0.08, vol: 0.12 }); }
  buy() { this.tone({ freq: 700, end: 1200, type: 'triangle', dur: 0.1, vol: 0.14 }); this.tone({ freq: 1050, end: 1600, type: 'sine', dur: 0.12, vol: 0.1, delay: 0.06 }); }
  waveStart() {
    if (!this.ctx) return;
    this.tone({ freq: 220, end: 440, type: 'sawtooth', dur: 0.3, vol: 0.14 });
    this.tone({ freq: 330, end: 660, type: 'square', dur: 0.3, vol: 0.08, delay: 0.1 });
  }
  boss() {
    if (!this.ctx) return;
    [110, 104, 98].forEach((f, i) => this.tone({ freq: f, end: f * 0.8, type: 'sawtooth', dur: 0.7, vol: 0.24, delay: i * 0.24 }));
    this.noise({ dur: 0.9, vol: 0.2, freq: 300, q: 0.5, delay: 0.1 });
  }
  win() {
    if (!this.ctx) return;
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.4, vol: 0.18, delay: i * 0.12 }));
  }
  lose() {
    if (!this.ctx) return;
    [392, 349, 294, 196].forEach((f, i) => this.tone({ freq: f, type: 'sawtooth', dur: 0.5, vol: 0.16, delay: i * 0.2 }));
  }
}
