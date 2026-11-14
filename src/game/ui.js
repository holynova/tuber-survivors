import { CHARACTERS, WEAPONS, TIER_NAMES, TIER_COLORS, TIER_MULT, ITEMS } from './data.js';
import { MAX_WEAPONS } from './weapons.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.game = game;
    this.screens = {
      title: $('screen-title'),
      select: $('screen-select'),
      help: $('screen-help'),
      hud: $('hud'),
      levelup: $('screen-levelup'),
      shop: $('screen-shop'),
      pause: $('screen-pause'),
      over: $('screen-over'),
      loading: $('loading'),
    };
    this.dashRing = $('dash-ring');
    this._hudCache = {};
    this._bind();
  }

  _bind() {
    $('btn-start').onclick = () => { this.game.audio.ensure(); this.game.audio.ui(); this.showSelect(); };
    $('btn-help').onclick = () => { this.game.audio.ui(); this.show('help'); };
    $('btn-close-help').onclick = () => { this.game.audio.ui(); this.show(this.game.state === 'title' ? 'title' : 'pause'); };
    $('btn-back-title').onclick = () => { this.game.audio.ui(); this.show('title'); };
    $('btn-resume').onclick = () => { this.game.audio.ui(); this.game.togglePause(false); };
    $('btn-quit').onclick = () => {
      if (!window.confirm('放弃本局？当前进度将丢失。')) return;
      this.game.audio.ui(); this.game.abandonRun();
    };
    $('btn-retry').onclick = () => { this.game.audio.ui(); this.showSelect(); };
    $('btn-to-title').onclick = () => { this.game.audio.ui(); this.show('title'); };
    $('btn-next-wave').onclick = () => { this.game.audio.ui(); this.game.startNextWave(); };
    $('btn-reroll').onclick = () => this.game.rerollShop();
    $('btn-sell-mode').onclick = () => this.game.toggleSellMode();
    this._bindTouch();
  }

  // ---------- 触屏控制 ----------
  _bindTouch() {
    const stick = $('touch-stick');
    const knob = $('touch-knob');
    if (!stick || !knob) return;
    const input = this.game.input;
    const R = 44;
    let id = null;
    const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px, ${dy}px)`; };
    const update = (t) => {
      const r = stick.getBoundingClientRect();
      let dx = t.clientX - (r.left + r.width / 2);
      let dy = t.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
      setKnob(dx, dy);
      input.touchMove.x = dx / R;
      input.touchMove.z = dy / R;
    };
    const reset = () => { id = null; setKnob(0, 0); input.touchMove.x = 0; input.touchMove.z = 0; };
    stick.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      id = t.identifier;
      update(t);
    }, { passive: false });
    stick.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === id) update(t);
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) if (t.identifier === id) reset();
    };
    stick.addEventListener('touchend', end);
    stick.addEventListener('touchcancel', end);
    $('touch-dash').addEventListener('touchstart', (e) => {
      e.preventDefault();
      input.touchDash = true;
    }, { passive: false });
    $('touch-pause').addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.game.audio.ui();
      this.game.togglePause(true);
    }, { passive: false });
  }

  show(name) {
    for (const key of ['title', 'select', 'help', 'levelup', 'shop', 'pause', 'over', 'loading']) {
      this.screens[key]?.classList.add('hidden');
    }
    this.screens.hud.classList.add('hidden');
    if (name === 'hud') this.screens.hud.classList.remove('hidden');
    else if (name) this.screens[name]?.classList.remove('hidden');
    this.current = name;
    const stateMap = { title: 'title', select: 'select', help: 'help' };
    if (stateMap[name]) this.game.state = stateMap[name];
  }

  // ---------- 角色选择 ----------
  showSelect() {
    const grid = $('char-grid');
    grid.innerHTML = '';
    for (const ch of CHARACTERS) {
      const card = document.createElement('div');
      card.className = 'char-card';
      card.style.setProperty('--accent', ch.accent);
      const bars = Object.entries(ch.bars)
        .map(([k, v]) => `
          <div class="stat-row"><b>${k}</b>
            <div class="stat-track"><i style="width:${Math.round(v * 100)}%"></i></div>
          </div>`)
        .join('');
      const wpn = WEAPONS[ch.weapon];
      card.innerHTML = `
        <div class="char-top">
          <div class="char-badge"></div>
          <div>
            <div class="char-name">${ch.name}</div>
            <div class="char-role">${ch.role}</div>
          </div>
        </div>
        <div class="char-stats">
          <div class="stat-row"><b>HP ${ch.base.maxHP}</b><div class="stat-track"><i style="width:${Math.min(100, ch.base.maxHP / 2.2)}%"></i></div></div>
          ${bars}
        </div>
        <div class="char-mods">${this._modLine(ch)}</div>
        <div class="char-passive"><b>${ch.passive.name}</b> — ${ch.passive.desc}</div>
        <div class="char-weapon">起始武器: ${wpn.icon} ${wpn.name}</div>
        <div class="char-passive" style="border-color:rgba(255,255,255,.2);color:#8ba3bd">${ch.blurb}</div>
      `;
      card.onclick = () => { this.game.audio.ensure(); this.game.audio.ui(); this.game.startRun(ch.id); };
      grid.appendChild(card);
    }
    this.show('select');
  }

  // 角色属性倾斜 (与 Stats 叠加规则一致: Mult 为倍率, 暴击显示总计)
  _modLine(ch) {
    const b = ch.base;
    const parts = [];
    const pct = (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
    const mults = [
      ['damageMult', '伤害'], ['meleeMult', '近战'], ['rangedMult', '远程'], ['elemMult', '元素'],
      ['attackSpeedMult', '攻速'], ['moveSpeedMult', '移速'], ['pickupMult', '拾取'], ['knockbackMult', '击退'],
    ];
    for (const [k, label] of mults) {
      if (b[k] != null && Math.abs(b[k] - 1) >= 0.05) parts.push(`${label} ${pct(b[k] - 1)}`);
    }
    parts.push(`暴击 ${Math.round((0.05 + (b.critChance || 0)) * 100)}%`);
    if ((b.dodge || 0) > 0) parts.push(`闪避 ${Math.round(b.dodge * 100)}%`);
    if ((b.armor || 0) > 0) parts.push(`护甲 ${b.armor}`);
    if ((b.lifesteal || 0) > 0) parts.push(`吸血 ${Math.round(b.lifesteal * 100)}%`);
    return parts.join(' / ');
  }

  // ---------- 暂停 (含属性面板) ----------
  showPause() {
    const g = this.game;
    const p = g.player;
    const st = g.stats;
    const rows = [
      ['角色', p.ch.name],
      ['等级', `LV ${g.level}`],
      ['波次', `第 ${g.wave} 波`],
      ['击杀', `${g.kills}`],
      ['晶体', `${g.crystals} ◆`],
      ['生命', `${Math.ceil(p.hp)}/${Math.round(p.maxHp())}`],
      ['伤害', `${Math.round(st.get('damageMult') * 100)}%`],
      ['攻速', `${Math.round(st.get('attackSpeedMult') * 100)}%`],
      ['移速', `${Math.round(st.get('moveSpeedMult') * 100)}%`],
      ['暴击', `${Math.round(st.get('critChance') * 100)}%`],
      ['护甲', `${Math.round(st.get('armor'))}`],
    ];
    const wpns = g.weapons.list.map((w) => `${w.def.icon} ${w.def.name} (${TIER_NAMES[w.tier]})`).join(' / ') || '无';
    $('pause-stats').innerHTML = `
      <div class="pause-grid">${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>
      <div class="pause-weapons">武器：${wpns}</div>`;
    this.show('pause');
  }

  // ---------- HUD ----------
  showHUD() { this.show('hud'); }

  updateHUD() {
    const g = this.game;
    const p = g.player;
    if (!p) return;
    const hpRatio = Math.max(0, p.hp / p.maxHp());
    this._set('hp-fill', `transform:scaleX(${hpRatio.toFixed(3)})`);
    this._setText('hp-text', `${Math.ceil(p.hp)}/${Math.round(p.maxHp())}`);
    const xpRatio = g.xp / g.xpNext;
    this._set('xp-fill', `transform:scaleX(${Math.min(1, xpRatio).toFixed(3)})`);
    this._setText('level-text', `LV ${g.level}`);
    this._setText('hud-crystals', String(g.crystals));
    this._setText('hud-wave', String(g.wave));
    const time = Math.max(0, Math.ceil(g.director.timeLeft));
    this._setText('hud-timer', g.director.active ? String(time) : 'SHOP');
    const ratio = g.director.duration ? g.director.timeLeft / g.director.duration : 0;
    this._set('hud-timer-bar', `transform:scaleX(${Math.max(0, ratio).toFixed(3)})`);

    // 迷你属性
    const st = g.stats;
    const dmg = Math.round(st.get('damageMult') * 100);
    const as = Math.round(st.get('attackSpeedMult') * 100);
    const spd = Math.round(st.get('moveSpeedMult') * 100);
    const crit = Math.round(st.get('critChance') * 100);
    const armor = Math.round(st.get('armor'));
    this._setHTML('hud-stats-mini',
      `<span>伤害 <b>${dmg}%</b></span><span>攻速 <b>${as}%</b></span><span>移速 <b>${spd}%</b></span><span>暴击 <b>${crit}%</b></span><span>护甲 <b>${armor}</b></span>`);

    // 冲刺
    const ready = p.dashCd <= 0;
    const td = $('touch-dash');
    if (this._dashReady !== ready) {
      this._dashReady = ready;
      this.dashRing.classList.toggle('ready', ready);
      this.dashRing.textContent = ready ? '冲刺' : `${p.dashCd.toFixed(1)}s`;
      if (td) { td.classList.toggle('ready', ready); td.textContent = ready ? '冲刺' : `${p.dashCd.toFixed(1)}s`; }
    } else if (!ready) {
      this.dashRing.textContent = `${p.dashCd.toFixed(1)}s`;
      if (td) td.textContent = `${p.dashCd.toFixed(1)}s`;
    }

    // Boss 血条(用波次计时区显示)
    const boss = g.enemies.list.find((e) => e.active && e.isBoss);
    if (boss && this._boss !== boss) {
      this._boss = boss;
      this._setText('hud-timer', boss.def.name);
    }
    if (boss) {
      const r = Math.max(0, boss.hp / boss.maxHp);
      this._set('hud-timer-bar', `transform:scaleX(${r.toFixed(3)})`);
      this._set('hud-timer-bar', `background:linear-gradient(90deg,#ff4d6d,#ff8a3d)`);
      this._setText('hud-timer', `${boss.def.name} ${Math.ceil(boss.hp)}`);
    } else if (this._boss) {
      this._boss = null;
      this._set('hud-timer-bar', `background:linear-gradient(90deg,rgba(77,232,255,.5),rgba(176,107,255,.5))`);
    }
  }

  _set(id, style) {
    if (this._hudCache[id] === style) return;
    this._hudCache[id] = style;
    const el = $(id);
    if (el) el.style.cssText = style;
  }
  _setText(id, text) {
    const key = 't' + id;
    if (this._hudCache[key] === text) return;
    this._hudCache[key] = text;
    const el = $(id);
    if (el) el.textContent = text;
  }
  _setHTML(id, html) {
    const key = 'h' + id;
    if (this._hudCache[key] === html) return;
    this._hudCache[key] = html;
    const el = $(id);
    if (el) el.innerHTML = html;
  }

  refreshWeapons() {
    const g = this.game;
    const wrap = $('hud-weapons');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (const w of g.weapons.list) {
      const chip = document.createElement('div');
      chip.className = 'wpn-chip';
      chip.style.setProperty('--chip', TIER_COLORS[w.tier]);
      chip.innerHTML = `<span class="dot"></span>${w.def.icon} ${w.def.name}<span style="color:${TIER_COLORS[w.tier]};font-size:10px;margin-left:4px">${TIER_NAMES[w.tier]}</span>`;
      wrap.appendChild(chip);
    }
    for (let i = g.weapons.count; i < MAX_WEAPONS; i++) {
      const chip = document.createElement('div');
      chip.className = 'wpn-chip';
      chip.style.opacity = '0.35';
      chip.textContent = '空武器槽';
      wrap.appendChild(chip);
    }
  }

  // ---------- 升级 3 选 1 ----------
  showLevelUp(choices, cb) {
    // 先清掉上一次的监听 (避免多次升级叠加导致一次按键触发多次)
    this._cleanupLevelKey?.();
    const handler = (e) => {
      const idx = { Digit1: 0, Digit2: 1, Digit3: 2 }[e.code];
      if (idx != null && choices[idx]) { cleanup(); cb(choices[idx]); this.game.audio.levelup(); }
    };
    const cleanup = () => window.removeEventListener('keydown', handler);
    window.addEventListener('keydown', handler);
    this._cleanupLevelKey = cleanup;
    const wrap = $('levelup-choices');
    wrap.innerHTML = '';
    choices.forEach((c, i) => {
      const card = document.createElement('div');
      card.className = 'choice-card';
      card.style.setProperty('--card', c.color);
      card.innerHTML = `
        <div class="choice-rarity">${c.rarity || '强化'}</div>
        <div class="choice-icon">${c.icon}</div>
        <div class="choice-name">${c.name}</div>
        <div class="choice-desc">${c.desc}</div>
      `;
      card.onclick = () => { cleanup(); this.game.audio.levelup(); cb(c); };
      wrap.appendChild(card);
      // 键盘快捷键 1/2/3
      card.dataset.idx = i;
    });
    this.show('levelup');
  }

  // ---------- 商店 ----------
  showShop(data) {
    const grid = $('shop-grid');
    grid.innerHTML = '';
    $('shop-coins').textContent = data.coins;
    $('reroll-cost').textContent = data.rerollCost;
    $('slot-count').textContent = `${data.usedSlots}/${MAX_WEAPONS}`;
    $('next-wave-num').textContent = data.nextWave;
    $('btn-reroll').disabled = data.coins < data.rerollCost;

    data.offers.forEach((offer, idx) => {
      const card = document.createElement('div');
      card.className = 'shop-item';
      card.style.setProperty('--card', offer.color);
      if (offer.sold) card.classList.add('sold');
      if (offer.cost > data.coins) card.classList.add('too-expensive');
      const kindLabel = offer.kind === 'weapon' ? `武器 / ${TIER_NAMES[offer.tier]}` : `道具 / ${TIER_NAMES[offer.tier]}`;
      card.innerHTML = `
        <div class="si-top"><span>${kindLabel}</span><span>${offer.kind === 'weapon' ? '⚔' : '✚'}</span></div>
        <div class="si-icon">${offer.icon}</div>
        <div class="si-name">${offer.name}</div>
        <div class="si-desc">${offer.desc}</div>
        <div class="si-price">◆ ${offer.cost}</div>
      `;
      card.onclick = () => this.game.buyOffer(idx);
      grid.appendChild(card);
    });

    // 武器槽
    const slots = $('shop-slots');
    slots.innerHTML = '';
    data.weapons.forEach((w, i) => {
      const el = document.createElement('div');
      el.className = 'slot' + (data.sellMode ? ' sellable' : '');
      el.style.setProperty('--card', TIER_COLORS[w.tier]);
      const dmg = Math.round(w.def.damage * TIER_MULT[w.tier]);
      el.innerHTML = `
        <div class="s-name">${w.def.icon} ${w.def.name}</div>
        <div class="s-tier">${TIER_NAMES[w.tier]} / 伤害 ${dmg}</div>
        <div class="s-dmg">${data.sellMode ? `出售 +${this.game.sellValue(w)} ◆` : w.def.desc.slice(0, 16) + '…'}</div>
      `;
      el.onclick = () => this.game.sellWeapon(i);
      slots.appendChild(el);
    });
    if (!data.weapons.length) {
      slots.innerHTML = '<div style="color:#8ba3bd;font-size:12px">还没有武器</div>';
    }
    $('btn-sell-mode').textContent = data.sellMode ? '退出出售' : '出售武器';
    this.show('shop');
  }

  refreshShop() {
    if (this.current === 'shop') this.game.ui.showShop(this.game.shopData());
  }

  // ---------- 结算 ----------
  showOver(win, stats) {
    $('over-title').textContent = win ? '世界清场!' : '你被淹没了';
    $('over-title').style.color = win ? '#6bffb0' : '#ff4d6d';
    $('over-stats').innerHTML = Object.entries(stats)
      .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`)
      .join('');
    this.show('over');
  }

  banner(text, boss = false) {
    const el = $('wave-banner');
    el.classList.remove('hidden', 'boss');
    if (boss) el.classList.add('boss');
    // 重启动画
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    el.textContent = text;
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => el.classList.add('hidden'), 2300);
  }

  toast(text) {
    const el = $('toast');
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    el.textContent = text;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.add('hidden'), 1800);
  }

  hideOverlays() {
    for (const k of ['levelup', 'shop', 'pause', 'over']) this.screens[k].classList.add('hidden');
  }
}
