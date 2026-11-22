// 自适应难度：基于 24 小时半衰期指数衰减热度的 1–5 整数档位。
export const BASE_LEVEL = 1;
export const MAX_LEVEL = 5;
export const UNLOCK_MIN_LEVEL = 2;
export const HALF_LIFE_MS = 24 * 3600 * 1000;

/**
 * 每次历史触发贡献 1.0 初始热度，每过 24 小时余温减半；总热度四舍五入后映射为 1–5 整数档。
 * @param {Array<{ts:number}>} logs 触发记录（不含本次）
 * @param {number} now
 */
export function computeDifficulty(logs, now = Date.now()) {
  const triggers = logs.filter((l) => l && typeof l.ts === 'number' && l.ts <= now);
  const heat = triggers.reduce((sum, l) => sum + 0.5 ** ((now - l.ts) / HALF_LIFE_MS), 0);
  const level = Math.max(BASE_LEVEL, Math.min(MAX_LEVEL, Math.round(heat) + 1));
  return { level, heat };
}

/** 终局第 4 题难度：较主线下降两档，最低不低于 Lv 1 */
export function bonusLevelFor(level) {
  return Math.max(BASE_LEVEL, Math.min(MAX_LEVEL, Math.round(level) - 2));
}

const LEVEL_PARAMS = {
  1: { sudoku: { givens: 15 }, nonogram: { size: 8, density: 0.58 }, arithmetic: { level: 1 }, twentyfour: { level: 1 } },
  2: { sudoku: { givens: 14 }, nonogram: { size: 8, density: 0.55 }, arithmetic: { level: 2 }, twentyfour: { level: 2 } },
  3: { sudoku: { givens: 13 }, nonogram: { size: 9, density: 0.58 }, arithmetic: { level: 3 }, twentyfour: { level: 3 } },
  4: { sudoku: { givens: 11 }, nonogram: { size: 9, density: 0.55 }, arithmetic: { level: 4 }, twentyfour: { level: 4 } },
  5: { sudoku: { givens: 10 }, nonogram: { size: 10, density: 0.58 }, arithmetic: { level: 5 }, twentyfour: { level: 5 } },
};

/** 把 1–5 整数难度换算成各类题目的参数 */
export function paramsFor(level) {
  const lv = Math.max(BASE_LEVEL, Math.min(MAX_LEVEL, Math.round(level)));
  const p = LEVEL_PARAMS[lv];
  return {
    sudoku: { ...p.sudoku },
    nonogram: { ...p.nonogram },
    arithmetic: { ...p.arithmetic },
    twentyfour: { ...p.twentyfour },
  };
}
