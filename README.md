# Tuber Survivors

3D 类幸存者动作游戏（Brotato 风格），Three.js + Vite 单页应用。

在竞技场中生存一波又一波的外星敌人：移动自动攻击、拾取晶体升级、波次间进商店买装备，撑过第 20 波终 Boss 即胜利。

## 快速开始

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产出 dist/
npm run preview  # 预览构建产物 (4173)
```

## 操作

| 按键 | 动作 |
| --- | --- |
| WASD / 方向键 | 移动（武器自动索敌攻击） |
| 空格 | 冲刺（短暂无敌，冷却 1.4s） |
| 鼠标点击 | 菜单 / 商店 / 升级选项 |
| 1 / 2 / 3 | 升级三选一快捷键 |
| Esc | 暂停 / 继续 |
| M | 静音 |

## 角色（选人界面或 URL `?char=<id>`）

| id | 角色 | 定位 | 初始武器 |
| --- | --- | --- | --- |
| buck | 巴克·重锤 | 坦克，200 生命 | 环刃 |
| vera | 薇拉·疾射 | 高射速脆皮 | 冲锋枪 |
| karl | 卡尔·爆破 | 范围轰炸 | 霰弹枪 |
| grosh | 格罗什·斩杀 | 高伤害近战 | 巨斧 |
| tina | 蒂娜·工程 | 炮塔流 | 炮塔 |
| meryl | 梅琳·奥术 | 激光/连锁法术 | 电弧线圈 |

## 武器（9 种，均可升到 4 级）

环刃、冲锋枪、霰弹枪、手枪、巨斧、电弧线圈、迫击炮、炮塔、棱镜光束 —— 每把有独立的攻击节奏、弹道与命中特效，详情见 `src/game/data.js`。

## 系统要点

- **波次**：每波时长 `min(45, 20+波数×2)` 秒，难度与敌人数量随波数增长；第 5/10/15 波出 Boss，第 20 波终 Boss（胜利条件）。
- **升级**：拾取晶体涨经验，升级时三选一（攻击/生存/功能属性）。
- **商店**：波次间购买道具与武器、出售、重掷；购买力随波数提升。
- **敌人**：5 种基础敌人 + 2 个 Boss，各有独立形状、AI 与攻击方式（冲撞、射击、自爆、分裂、尖刺）。
- **特效**：UnrealBloom 后期、实例化粒子、伤害飘字（暴击必显）、冲刺残影、爆炸/冲击波/枪口焰、拾取吸附。
- **音频**：WebAudio 合成音效（射击、命中、升级、受伤、爆炸…），无外部素材。

## 调试接口

- `window.__debug()` 返回 `{state, wave, hp, kills, level, crystals, enemies, weapons, timeLeft, particles}`。
- `window.__god()` 开关无敌。
- `window.__game` 完整游戏对象（测试用）。
- URL 参数：`?char=<id>` 直接选定角色，`?fx=low` 关闭 Bloom 与阴影（低配设备）。

## 素材与致谢

3D 模型与贴图全部为 **CC0（公共领域）** 授权，已内置在仓库里（`public/models/`、`public/textures/`），无需额外下载：

- **角色 / 敌人 / Boss 模型**：[Quaternius](https://quaternius.com)（Toon Shooter、Monsters、Creatures 系列）
- **武器 / 场景道具模型**：[Kenney](https://kenney.nl)（Blaster、Blocky Characters、Factory、Graveyard、Mini Arena、Modular Space、Platformer、Space Station、Survival 等素材包）
- **地板 PBR 贴图**：[Poly Haven](https://polyhaven.com) 的 `blue_metal_plate`（diffuse / normal / roughness）
- 音效、UI、粒子特效与全部代码为本项目原创。

## 项目结构

```
src/
  core/     engine(渲染/相机/场地)  input  audio  particles  effects  utils
  game/     main  game(状态机)  data(数值)  player  enemies  weapons
            projectiles  pickups  waves  ui
```

设计文档见 [DESIGN.md](./DESIGN.md)。

## 测试

Playwright 端到端验证（Chrome，viewport 1440×860）：

- 启动 → 移动 → 升级 → 商店 → 波次推进全流程
- 6 角色各自初始武器与血量
- 3 波自动游玩无状态死锁
- 高画质下 60 FPS、0 控制台错误
- 角色模型跟随、边缘视角可见性（像素差分校验）

## 已知限制

- 无存档/无音量滑条；胜利后仅结算面板。
- 平衡以桌面键鼠为准，未做手柄适配。
