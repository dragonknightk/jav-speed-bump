import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDifficulty, paramsFor, BASE_LEVEL } from '../src/lib/difficulty.js';

const HOUR = 3600000, DAY = 24 * HOUR;
const now = new Date(2026, 10, 2, 20, 0, 0).getTime(); // 本地时间晚上 8 点

test('没有记录时为基础难度', () => {
  assert.equal(computeDifficulty([], now).level, BASE_LEVEL);
});

test('同一天多次触发，一次比一次难，有上限', () => {
  const levels = [];
  const logs = [];
  for (let i = 0; i < 6; i++) {
    levels.push(computeDifficulty(logs, now).level);
    logs.push({ ts: now - (6 - i) * 60000 });
  }
  for (let i = 1; i < 4; i++) assert.ok(levels[i] > levels[i - 1]);
  assert.ok(Math.max(...levels) <= 5);
});

test('好几天没触发，难度略降', () => {
  const d3 = computeDifficulty([{ ts: now - 4 * DAY }], now).level;
  const d7 = computeDifficulty([{ ts: now - 8 * DAY }], now).level;
  const d1 = computeDifficulty([{ ts: now - 1 * DAY }], now).level;
  assert.equal(d1, BASE_LEVEL);
  assert.ok(d3 < BASE_LEVEL);
  assert.ok(d7 < d3);
  assert.ok(d7 >= BASE_LEVEL - 1);
});

test('最近做得太快会加难度', () => {
  const fast = [1, 2, 3, 4].map((i) => ({ ts: now - i * DAY - HOUR, completed: true, puzzleMs: 3 * 60000 }));
  const slow = fast.map((l) => ({ ...l, puzzleMs: 15 * 60000 }));
  assert.ok(computeDifficulty(fast, now).level > computeDifficulty(slow, now).level);
});

test('paramsFor 单调变化', () => {
  assert.equal(BASE_LEVEL, 1);
  assert.equal(paramsFor(1).sudoku.givens, 17);
  assert.equal(paramsFor(1).nonogram.size, 8);
  assert.ok(paramsFor(0).sudoku.givens > paramsFor(5).sudoku.givens);
  assert.equal(paramsFor(0).nonogram.size, 8);
  assert.equal(paramsFor(4).nonogram.size, 10);
  assert.ok(paramsFor(5).sudoku.givens >= 10);
});
