import { Game } from './game/game.js';
import { loadAssets } from './assets/models.js';

const params = new URLSearchParams(location.search);
const quality = params.get('fx') === 'low' ? 'low' : 'high';
const autoChar = params.get('char');

const loadingLabel = document.getElementById('loading-label');

async function boot() {
  // 预载 3D 模型 (失败自动回退程序化外观)
  await loadAssets((done, total, id) => {
    if (loadingLabel) loadingLabel.textContent = `加载模型 ${done} / ${total} · ${id}`;
  });

  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas, { quality });

  // 调试 / 测试接口
  window.__game = game;
  window.__debug = () => game.debugState();
  window.__god = () => { if (game.player) { game.player.stats.apply({ maxHP: 9999 }); game.player.setMaxHP(game.player.stats.get('maxHP')); game.player.hp = 9999; } };

  // 直接进入指定角色 (便于自动化测试)
  if (autoChar) game.startRun(autoChar);

  // 主循环
  let last = performance.now();
  function frame(now) {
    const dt = (now - last) / 1000;
    last = now;
    try {
      game.frame(dt);
    } catch (err) {
      console.error('[frame error]', err);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // 关闭加载屏
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById('loading')?.classList.add('hidden');
    });
  });

  console.log('%cTUBER SURVIVORS %c ready — window.__game / __debug() / __god()',
    'color:#4de8ff;font-weight:bold', 'color:#8ba3bd');
}

boot().catch((err) => {
  console.error('[boot error]', err);
  if (loadingLabel) loadingLabel.textContent = '加载失败, 刷新重试';
});
