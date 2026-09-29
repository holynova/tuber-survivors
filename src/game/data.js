// ============ 游戏数值与内容数据 ============

export const TIER_NAMES = ['普通', '精良', '史诗', '传说'];
export const TIER_COLORS = ['#c9d6e4', '#6bffb0', '#b06bff', '#ffd257'];
export const TIER_MULT = [1, 1.4, 1.85, 2.4];

// ---------------- 角色 ----------------
export const CHARACTERS = [
  {
    id: 'buck',
    name: '巴克·铁壁',
    role: '重装坦克',
    accent: '#6bffb0',
    color: 0x6bffb0,
    body: 'heavy',
    base: {
      maxHP: 200, damageMult: 0.85, meleeMult: 1, rangedMult: 1, elemMult: 1,
      attackSpeedMult: 0.95, moveSpeedMult: 0.88, critChance: 0.03, armor: 8,
      dodge: 0, pickupMult: 1, lifesteal: 0, knockbackMult: 1.5,
    },
    passive: { id: 'thorns', name: '荆棘震荡', desc: '每承受 6 次伤害, 释放反伤冲击波 (25 伤害 + 强击退)' },
    weapon: 'orbit_blades',
    bars: { 生命: 1, 伤害: 0.55, 攻速: 0.5, 移速: 0.4 },
    blurb: '最厚的血, 最硬的甲。贴脸转圈, 敌人自己弹开。',
  },
  {
    id: 'vera',
    name: '薇拉·疾风',
    role: '闪避速射',
    accent: '#ffd257',
    color: 0xffd257,
    body: 'slim',
    base: {
      maxHP: 78, damageMult: 0.95, meleeMult: 1, rangedMult: 1.1, elemMult: 1,
      attackSpeedMult: 1.12, moveSpeedMult: 1.4, critChance: 0.06, armor: 1,
      dodge: 0.15, pickupMult: 1.1, lifesteal: 0, knockbackMult: 0.8,
    },
    passive: { id: 'afterimage', name: '残影', desc: '冲刺后 3 秒内的首次攻击必定暴击 (×2.2)' },
    weapon: 'smg',
    bars: { 生命: 0.3, 伤害: 0.6, 攻速: 0.75, 移速: 1 },
    blurb: '玻璃大炮的优雅版本: 跑得飞快, 永远别被打中。',
  },
  {
    id: 'karl',
    name: '卡尔·炮手',
    role: '远程压制',
    accent: '#4de8ff',
    color: 0x4de8ff,
    body: 'ranged',
    base: {
      maxHP: 95, damageMult: 1, meleeMult: 0.55, rangedMult: 1.45, elemMult: 1,
      attackSpeedMult: 1.05, moveSpeedMult: 1, critChance: 0.05, armor: 2,
      dodge: 0.05, pickupMult: 1, lifesteal: 0, knockbackMult: 1.2,
    },
    passive: { id: 'suppression', name: '火力压制', desc: '同一目标每被命中一次 +12% 伤害 (最多 5 层, 换目标清空)' },
    weapon: 'shotgun',
    bars: { 生命: 0.4, 伤害: 0.9, 攻速: 0.6, 移速: 0.55 },
    blurb: '远程伤害 +45%, 近战 -45%。保持距离是你的生存法则。',
  },
  {
    id: 'grosh',
    name: '格罗什·狂战',
    role: '近战吸血',
    accent: '#ff4d6d',
    color: 0xff4d6d,
    body: 'brute',
    base: {
      maxHP: 135, damageMult: 1, meleeMult: 1.45, rangedMult: 0.8, elemMult: 1,
      attackSpeedMult: 0.95, moveSpeedMult: 1.02, critChance: 0.05, armor: 3,
      dodge: 0, pickupMult: 1, lifesteal: 0.02, knockbackMult: 1.6,
    },
    passive: { id: 'bloodrage', name: '血怒', desc: '生命低于 50% 时: 伤害 +60%, 吸血 +15%' },
    weapon: 'cleaver',
    bars: { 生命: 0.7, 伤害: 0.95, 攻速: 0.45, 移速: 0.6 },
    blurb: '一斧一大片。越残血越恐怖, 敌人的血就是你的药。',
  },
  {
    id: 'tina',
    name: '缇娜·工匠',
    role: '炮塔阵地',
    accent: '#ff8a3d',
    color: 0xff8a3d,
    body: 'engineer',
    base: {
      maxHP: 105, damageMult: 0.9, meleeMult: 1, rangedMult: 1, elemMult: 1,
      attackSpeedMult: 1, moveSpeedMult: 1, critChance: 0.04, armor: 3,
      dodge: 0.05, pickupMult: 1.2, lifesteal: 0, knockbackMult: 1,
    },
    passive: { id: 'engineer', name: '机械随从', desc: '开局自带 1 座哨戒炮塔, 炮塔伤害 +60%, 场上最多 2 座' },
    weapon: 'turret',
    bars: { 生命: 0.5, 伤害: 0.5, 攻速: 0.55, 移速: 0.55 },
    blurb: '让炮台替你打工。放置、后撤、看戏, 布阵才是正经事。',
  },
  {
    id: 'meryl',
    name: '梅琳·奥术',
    role: '元素法师',
    accent: '#b06bff',
    color: 0xb06bff,
    body: 'mage',
    base: {
      maxHP: 70, damageMult: 1, meleeMult: 0.9, rangedMult: 1, elemMult: 1.5,
      attackSpeedMult: 1.02, moveSpeedMult: 1.06, critChance: 0.1, armor: 0,
      dodge: 0.08, pickupMult: 1.15, lifesteal: 0, knockbackMult: 0.9,
    },
    passive: { id: 'capacitor', name: '过载电容', desc: '电系链跳 +2, 元素命中 15% 概率眩晕目标 0.6 秒' },
    weapon: 'chain',
    bars: { 生命: 0.25, 伤害: 0.85, 攻速: 0.6, 移速: 0.65 },
    blurb: '脆皮但毁天灭地。一道电弧串起整片战场。',
  },
];

// ---------------- 武器 ----------------
export const WEAPONS = {
  pistol: {
    id: 'pistol', name: '铆钉手枪', kind: 'ranged', icon: '🔫', color: '#4de8ff', hex: 0x4de8ff,
    desc: '高速单发直弹, 冷却极短, 稳定输出的万金油。',
    damage: 12, cooldown: 0.22, projSpeed: 40, range: 10, pierce: 0, knockback: 2.2,
    tierDesc: ['标准膛线', '+40% 伤害', '+85% 伤害 & 穿透 1', '+140% 伤害 & 穿透 2'],
  },
  shotgun: {
    id: 'shotgun', name: '散射霰弹枪', kind: 'ranged', icon: '💥', color: '#ff8a3d', hex: 0xff8a3d,
    desc: '一次喷出 6 颗弹丸, 近距离爆发与强力击退。',
    damage: 8, cooldown: 1.0, projSpeed: 32, range: 7.5, count: 6, spread: 0.62, knockback: 7, pierce: 0,
    tierDesc: ['鹿弹', '7 弹丸 +40% 伤', '8 弹丸 +85% 伤', '10 弹丸 +140% 伤 & 穿透'],
  },
  smg: {
    id: 'smg', name: '蜂群冲锋枪', kind: 'ranged', icon: '🐝', color: '#ffd257', hex: 0xffd257,
    desc: '极高射速伴随弹道散布, 弹幕压制专家。',
    damage: 5, cooldown: 0.11, projSpeed: 44, range: 11, spread: 0.16, knockback: 1.2, pierce: 0,
    tierDesc: ['制式弹匣', '+40% 伤害', '+85% 伤害 & +15% 射速', '+140% 伤害 & +30% 射速'],
  },
  cleaver: {
    id: 'cleaver', name: '屠夫巨斧', kind: 'melee', icon: '⚔️', color: '#ff4d6d', hex: 0xff4d6d,
    desc: '身前 120° 巨幅挥砍, 一击扫开整群敌人。',
    damage: 34, cooldown: 0.9, arc: 2.1, radius: 3.6, knockback: 9, pierce: 99,
    tierDesc: ['生锈斧刃', '+40% 伤害 & +10% 范围', '+85% 伤害 & +20% 范围', '+140% 伤害 & +35% 范围'],
  },
  orbit_blades: {
    id: 'orbit_blades', name: '环刃', kind: 'orbit', icon: '🌀', color: '#6bffb0', hex: 0x6bffb0,
    desc: '常驻旋转刀刃绕身切割, 碰到即伤, 走位即输出。',
    damage: 14, cooldown: 0.35, blades: 3, radius: 2.3, spin: 2.5, knockback: 2.5,
    tierDesc: ['3 片刀刃', '4 片刀刃 +40% 伤', '5 片刀刃 +85% 伤', '6 片刀刃 +140% 伤 & 加速'],
  },
  mortar: {
    id: 'mortar', name: '迫击炮', kind: 'elem', icon: '🚀', color: '#ff8a3d', hex: 0xff8a3d,
    desc: '抛物线落地延迟爆炸, 范围伤害 + 地面灼烧。',
    damage: 40, cooldown: 2.2, aoe: 3.2, projSpeed: 16, range: 9, knockback: 6, burn: 6,
    tierDesc: ['高爆弹', '+40% 伤 & +10% 爆炸半径', '+85% 伤 & +20% 半径', '+140% 伤 & +35% 半径'],
  },
  chain: {
    id: 'chain', name: '电弧线圈', kind: 'elem', icon: '⚡', color: '#9fe8ff', hex: 0x9fe8ff,
    desc: '瞬发闪电命中后链式跳跃多个目标。',
    damage: 16, cooldown: 0.85, jumps: 3, range: 9, knockback: 1.5,
    tierDesc: ['3 跳电弧', '+40% 伤害 / 4 跳', '+85% 伤害 / 5 跳', '+140% 伤害 / 6 跳 & 眩晕'],
  },
  beam: {
    id: 'beam', name: '棱镜光束', kind: 'elem', icon: '🔷', color: '#b06bff', hex: 0xb06bff,
    desc: '贯穿整条直线的持续灼烧光束, 无视前排直击后排。',
    damage: 30, cooldown: 0.5, length: 15, width: 0.5, knockback: 0.5,
    tierDesc: ['聚焦光束', '+40% 伤害 & +15% 长度', '+85% 伤害 & +30% 长度', '+140% 伤害 & +50% 长度'],
  },
  turret: {
    id: 'turret', name: '哨戒炮塔', kind: 'deploy', icon: '🔧', color: '#ff8a3d', hex: 0xff8a3d,
    desc: '在原地部署自动索敌炮塔, 持续 9 秒并可叠加。',
    damage: 10, cooldown: 2.4, turretCd: 0.45, range: 8.5, duration: 9, knockback: 1,
    tierDesc: ['单管炮塔', '+40% 伤害 & +25% 持续', '+85% 伤害 & +50% 持续', '+140% 伤害 & 双联装'],
  },
};
export const WEAPON_IDS = Object.keys(WEAPONS);

// ---------------- 商店道具 ----------------
export const ITEMS = [
  { id: 'boots', name: '动力靴', icon: '👟', color: '#4de8ff', desc: '移动速度 +12%', stats: { moveSpeedMult: 0.12 }, cost: [24, 40, 62] },
  { id: 'scope', name: '战术瞄准镜', icon: '🎯', color: '#ffd257', desc: '暴击率 +7%', stats: { critChance: 0.07 }, cost: [26, 44, 68] },
  { id: 'adrenal', name: '肾上腺素', icon: '💉', color: '#ff4d6d', desc: '攻击速度 +10%', stats: { attackSpeedMult: 0.1 }, cost: [28, 46, 70] },
  { id: 'plate', name: '复合装甲', icon: '🛡️', color: '#c9d6e4', desc: '护甲 +4', stats: { armor: 4 }, cost: [24, 40, 60] },
  { id: 'magnet', name: '超导磁石', icon: '🧲', color: '#b06bff', desc: '拾取范围 +45%', stats: { pickupMult: 0.45 }, cost: [18, 30, 46] },
  { id: 'vampirism', name: '血棘指环', icon: '🩸', color: '#ff4d6d', desc: '吸血 +3%', stats: { lifesteal: 0.03 }, cost: [32, 52, 80] },
  { id: 'glycerin', name: '硝化甘油', icon: '🧨', color: '#ff8a3d', desc: '爆炸与范围伤害 +20%', stats: { aoeMult: 0.2 }, cost: [26, 44, 66] },
  { id: 'core', name: '超频核心', icon: '⚡', color: '#9fe8ff', desc: '全部伤害 +8%', stats: { damageMult: 0.08 }, cost: [34, 56, 86] },
  { id: 'blade', name: '磨刀石', icon: '🔪', color: '#ff4d6d', desc: '近战伤害 +15%', stats: { meleeMult: 0.15 }, cost: [24, 40, 62] },
  { id: 'powder', name: '速燃火药', icon: '🔥', color: '#ff8a3d', desc: '远程伤害 +15%', stats: { rangedMult: 0.15 }, cost: [24, 40, 62] },
  { id: 'crystal', name: '奥术水晶', icon: '🔮', color: '#b06bff', desc: '元素伤害 +18%', stats: { elemMult: 0.18 }, cost: [26, 44, 68] },
  { id: 'heart', name: '生命晶体', icon: '❤️', color: '#6bffb0', desc: '生命上限 +25 并回复 25', stats: { maxHP: 25, heal: 25 }, cost: [22, 36, 56] },
  { id: 'lens', name: '分裂棱镜', icon: '💠', color: '#4de8ff', desc: '暴击伤害 +40%', stats: { critMult: 0.4 }, cost: [30, 50, 76] },
  { id: 'spring', name: '缓冲弹簧', icon: '🌀', color: '#6bffb0', desc: '闪避 +5%', stats: { dodge: 0.05 }, cost: [30, 50, 76] },
  { id: 'horn', name: '震波号角', icon: '📯', color: '#ffd257', desc: '击退强度 +30%', stats: { knockbackMult: 0.3 }, cost: [16, 26, 40] },
  { id: 'scope2', name: '鹰眼义眼', icon: '👁️', color: '#4de8ff', desc: '射程 +12%, 暴击 +3%', stats: { rangeMult: 0.12, critChance: 0.03 }, cost: [28, 46, 72] },
];

// ---------------- 升级词条 (3 选 1) ----------------
export const UPGRADES = [
  { id: 'hp', name: '生命强化', icon: '❤️', color: '#6bffb0', desc: '生命上限 +20 并回复 20', stats: { maxHP: 20, heal: 20 }, w: 10 },
  { id: 'dmg', name: '火力全开', icon: '⚔️', color: '#ff4d6d', desc: '全部伤害 +10%', stats: { damageMult: 0.1 }, w: 10 },
  { id: 'spd', name: '疾风步', icon: '👟', color: '#4de8ff', desc: '移动速度 +8%', stats: { moveSpeedMult: 0.08 }, w: 8 },
  { id: 'as', name: '急速射击', icon: '⚡', color: '#ffd257', desc: '攻击速度 +8%', stats: { attackSpeedMult: 0.08 }, w: 8 },
  { id: 'crit', name: '致命一击', icon: '🎯', color: '#ffd257', desc: '暴击率 +5%', stats: { critChance: 0.05 }, w: 7 },
  { id: 'armor', name: '硬化表皮', icon: '🛡️', color: '#c9d6e4', desc: '护甲 +3', stats: { armor: 3 }, w: 7 },
  { id: 'dodge', name: '幻影闪避', icon: '🌀', color: '#6bffb0', desc: '闪避 +4%', stats: { dodge: 0.04 }, w: 6 },
  { id: 'pick', name: '强效磁力', icon: '🧲', color: '#b06bff', desc: '拾取范围 +30%', stats: { pickupMult: 0.3 }, w: 6 },
  { id: 'leech', name: '汲取', icon: '🩸', color: '#ff4d6d', desc: '吸血 +2%', stats: { lifesteal: 0.02 }, w: 5 },
  { id: 'elem', name: '元素共鸣', icon: '🔮', color: '#b06bff', desc: '元素伤害 +12%', stats: { elemMult: 0.12 }, w: 5 },
  { id: 'melee', name: '臂力训练', icon: '🪓', color: '#ff8a3d', desc: '近战伤害 +12%', stats: { meleeMult: 0.12 }, w: 5 },
  { id: 'ranged', name: '精密枪管', icon: '🔫', color: '#4de8ff', desc: '远程伤害 +12%', stats: { rangedMult: 0.12 }, w: 5 },
];

// ---------------- 敌人 ----------------
export const ENEMIES = {
  mite: {
    id: 'mite', name: '啃食者', shape: 'mite', color: 0xff5d7a, accent: 0xffc0cb,
    hp: 18, dmg: 9, speed: 5.4, radius: 0.5, xp: 1, mass: 1,
    spawnFrom: 1, weight: 10,
  },
  brute: {
    id: 'brute', name: '壮肉', shape: 'brute', color: 0x9b59d0, accent: 0xe0b0ff,
    hp: 72, dmg: 16, speed: 3.1, radius: 0.95, xp: 3, mass: 3.4,
    spawnFrom: 3, weight: 4,
  },
  spitter: {
    id: 'spitter', name: '孢子喷吐者', shape: 'spitter', color: 0x59d98c, accent: 0xc6ffdd,
    hp: 40, dmg: 10, speed: 3.4, radius: 0.62, xp: 3, mass: 1.6, ranged: true,
    keepDist: 9, shootCd: 1.9, projSpeed: 11, spawnFrom: 4, weight: 4,
  },
  charger: {
    id: 'charger', name: '冲锋兽', shape: 'charger', color: 0xffb04d, accent: 0xffe3b3,
    hp: 55, dmg: 24, speed: 3.6, radius: 0.72, xp: 4, mass: 2.4, charger: true,
    telegraph: 0.7, dashSpeed: 17, dashTime: 0.55, spawnFrom: 6, weight: 3.4,
  },
  bomber: {
    id: 'bomber', name: '自爆虫', shape: 'bomber', color: 0xffe14d, accent: 0xfff7b0,
    hp: 30, dmg: 28, speed: 4.4, radius: 0.58, xp: 3, mass: 1.4, bomber: true,
    blastRadius: 3.2, spawnFrom: 8, weight: 3,
  },
};

export const BOSSES = {
  brood: {
    id: 'brood', name: '菌王', shape: 'boss', color: 0xc0397b, accent: 0xff8ac0,
    hp: 850, dmg: 24, speed: 3.3, radius: 1.9, xp: 40, mass: 12,
    boss: true, skills: ['stomp', 'charge', 'summon'],
  },
  tyrant: {
    id: 'tyrant', name: '块茎暴君', shape: 'boss', color: 0xff5032, accent: 0xffd08a,
    hp: 2600, dmg: 30, speed: 3.6, radius: 2.3, xp: 120, mass: 20,
    boss: true, final: true, skills: ['stomp', 'charge', 'summon', 'barrage'],
  },
};

// 波次时长
export function waveDuration(wave) {
  return Math.min(45, 20 + wave * 2);
}
// 敌人数值成长
export function waveHpMult(wave) { return 1 + 0.16 * (wave - 1); }
export function waveDmgMult(wave) { return 1 + 0.085 * (wave - 1); }
// 同屏敌人预算
export function waveBudget(wave) {
  return Math.min(120, Math.round(10 + wave * 5.2 + Math.pow(wave, 1.55)));
}
