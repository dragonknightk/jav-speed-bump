// 自适应难度：0（最简单）~ 5（最难），基础值 1。
import { dayKey } from './time.js';

export const BASE_LEVEL = 1;
const DAY = 24 * 3600 * 1000;

/**
 * @param {Array<{ts:number, completed?:boolean, puzzleMs?:number}>} logs 触发记录（不含本次）
 * @param {number} now
 */
export function computeDifficulty(logs, now = Date.now()) {
  const triggers = logs.filter((l) => l && l.ts <= now).sort((a, b) => a.ts - b.ts);
  const today = dayKey(now);
  const todayCount = triggers.filter((l) => dayKey(l.ts) === today).length;
  const last = triggers[triggers.length - 1];
  const daysSinceLast = last ? (now - last.ts) / DAY : Infinity;

  let level = BASE_LEVEL;
  const reasons = [];
  // 好几天没触发：稍微放松
  if (last && daysSinceLast >= 7) { level -= 1; reasons.push('一周以上没有触发, 难度降低'); }
  else if (last && daysSinceLast >= 3) { level -= 0.5; reasons.push('3 天以上没有触发, 难度略降'); }
  // 同一天多次触发：一次比一次难
  if (todayCount > 0) {
    const inc = Math.min(todayCount * 0.75, 2.5);
    level += inc;
    reasons.push(`今天第 ${todayCount + 1} 次, 难度 +${inc}`);
  }
  // 按最近完成速度微调，让三组题的总时长落在大约 10–12 分钟
  const recent = triggers.filter((l) => l.completed && l.puzzleMs > 0).slice(-5);
  if (recent.length >= 3) {
    const avgMin = recent.reduce((s, l) => s + l.puzzleMs, 0) / recent.length / 60000;
    if (avgMin < 8) { level += 0.5; reasons.push('最近做得很快, 难度 +0.5'); }
    else if (avgMin > 14) { level -= 0.5; reasons.push('最近用时偏长, 难度 −0.5'); }
  }
  level = Math.max(0, Math.min(5, level));
  return { level, todayCount, daysSinceLast, reasons };
}

/** 把难度换算成各类题目的参数 */
export function paramsFor(level) {
  return {
    sudoku: { givens: Math.round(18 - level * 1.4) }, // 等级 1 约 17 个已知数，等级 5 约 11 个
    nonogram: { size: level < 2 ? 8 : 10, density: level < 2 ? 0.6 : 0.58 },
    arithmetic: { level },
    twentyfour: { level },
  };
}
