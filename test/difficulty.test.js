import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDifficulty, bonusLevelFor, paramsFor,
  BASE_LEVEL, MAX_LEVEL, UNLOCK_MIN_LEVEL, HALF_LIFE_MS,
} from '../src/lib/difficulty.js';

const HOUR = 3600000, DAY = HALF_LIFE_MS;
const now = new Date(2026, 10, 2, 20, 0, 0).getTime();

test('没有记录时为 Lv 1 基础难度', () => {
  const r = computeDifficulty([], now);
  assert.equal(r.level, BASE_LEVEL);
  assert.equal(r.heat, 0);
  assert.equal(UNLOCK_MIN_LEVEL, 2);
});

test('短时间多次触发平滑递增至 Lv 5 封顶，无死区', () => {
  const logs = [];
  const levels = [];
  for (let i = 0; i < 6; i++) {
    levels.push(computeDifficulty(logs, now).level);
    logs.push({ ts: now - (6 - i) * 60000 });
  }
  assert.deepEqual(levels, [1, 2, 3, 4, 5, 5]);
  assert.equal(Math.max(...levels), MAX_LEVEL);
});

test('跨午夜 00:00 不暴跌（消除自然日硬清零漏洞）', () => {
  const afterMidnight = new Date(2026, 10, 3, 0, 2, 0).getTime();
  const logs = [
    { ts: afterMidnight - 30 * 60000 }, // 23:32
    { ts: afterMidnight - 15 * 60000 }, // 23:47
    { ts: afterMidnight - 7 * 60000 },  // 23:55
  ];
  assert.equal(computeDifficulty(logs, afterMidnight).level, 4);
});

test('24 小时半衰期自然冷却：克制越久热度越低', () => {
  // 25 小时前仅触发 1 次 -> 余温 < 0.5 -> 回落 Lv 1
  assert.equal(computeDifficulty([{ ts: now - 25 * HOUR }], now).level, 1);
  // 3 天前连触 3 次 -> 余温约 0.37 -> 回落 Lv 1
  const threeDaysAgo = [0, 1, 2].map((i) => ({ ts: now - 3 * DAY - i * 600000 }));
  assert.equal(computeDifficulty(threeDaysAgo, now).level, 1);
  // 每天固定触发 1 次 -> 稳态收敛在 1.0 (Lv 2)，不会无限膨胀
  const daily = [1, 2, 3, 4, 5, 6].map((d) => ({ ts: now - d * DAY }));
  const r = computeDifficulty(daily, now);
  assert.ok(r.heat > 0.95 && r.heat < 1.0);
  assert.equal(r.level, 2);
});

test('终局第 4 题难度为 max(level - 2, 1)', () => {
  assert.equal(bonusLevelFor(1), 1);
  assert.equal(bonusLevelFor(2), 1);
  assert.equal(bonusLevelFor(3), 1);
  assert.equal(bonusLevelFor(4), 2);
  assert.equal(bonusLevelFor(5), 3);
});

test('paramsFor 1–5 整数阶梯单调递进', () => {
  assert.equal(paramsFor(1).sudoku.givens, 15);
  assert.equal(paramsFor(1).nonogram.size, 8);
  assert.equal(paramsFor(2).nonogram.size, 8);
  assert.equal(paramsFor(3).nonogram.size, 9);
  assert.equal(paramsFor(4).nonogram.size, 9);
  assert.equal(paramsFor(5).sudoku.givens, 10);
  assert.equal(paramsFor(5).nonogram.size, 10);
  for (let lv = 1; lv < 5; lv++) {
    assert.ok(paramsFor(lv).sudoku.givens > paramsFor(lv + 1).sudoku.givens);
    assert.ok(paramsFor(lv).nonogram.size <= paramsFor(lv + 1).nonogram.size);
  }
});
