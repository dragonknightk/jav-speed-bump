import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byDay, byHour, byReason, streaks, summary, logStatus } from '../src/lib/stats.js';

const HOUR = 3600000, DAY = 24 * HOUR;
const now = new Date(2026, 10, 2, 20, 0, 0).getTime();
const logs = [
  { ts: now - 3 * DAY, reason: 'bored', completed: true, puzzleMs: 9 * 60000 },
  { ts: now - 1 * DAY, reason: 'stress', completed: true, puzzleMs: 7 * 60000 },
  { ts: now - 2 * HOUR, reason: 'bored', completed: false },
];

test('byDay / byHour / byReason', () => {
  const d = byDay(logs, 7, now);
  assert.equal(d.length, 7);
  assert.equal(d.reduce((s, x) => s + x.count, 0), 3);
  assert.equal(d[6].count, 1);
  assert.equal(byHour(logs)[18].count, 1);
  const r = byReason(logs);
  assert.equal(r.find((x) => x.key === 'bored').count, 2);
});

test('streaks', () => {
  const s = streaks(logs, now, now - 10 * DAY);
  assert.equal(s.current, 2 * HOUR);
  assert.equal(s.longest, 7 * DAY);
  assert.equal(streaks([], now, now - DAY).current, DAY);
});

test('summary', () => {
  const s = summary(logs, now);
  assert.equal(s.total, 3);
  assert.equal(s.today, 1);
  assert.equal(s.completed, 2);
  assert.equal(s.inProgress, 0);
  assert.equal(s.walkedAway, 1);
  assert.equal(s.avgPuzzleMin, 8);
});

test('实时活跃标签口径：进行中 vs 中途离开 0 延迟区分，诱因复盘不被稀释', () => {
  const mixed = [
    { id: 'a', ts: now - 3 * DAY, reason: 'bored', completed: true, puzzleMs: 6 * 60000 },
    { id: 'b', ts: now - 60000, reason: null, completed: false }, // 1 分钟前刚开且仍在做题
    { id: 'c', ts: now - 30000, reason: null, completed: false }, // 30 秒前开但已关页离开
  ];
  const active = new Set(['b']);
  assert.equal(logStatus(mixed[0], now, active), 'completed');
  assert.equal(logStatus(mixed[1], now, active), 'in_progress');
  assert.equal(logStatus(mixed[2], now, active), 'walked_away');

  const sm = summary(mixed, now, active);
  assert.equal(sm.total, 3);
  assert.equal(sm.completed, 1);
  assert.equal(sm.inProgress, 1);
  assert.equal(sm.walkedAway, 1);
  assert.equal(sm.completed + sm.inProgress + sm.walkedAway, sm.total);

  // reviewedOnly 只计入已完成或已选诱因记录，不被中途离开稀释
  const reviewed = byReason(mixed, { reviewedOnly: true });
  assert.equal(reviewed.find((x) => x.key === 'bored').count, 1);
  assert.equal(reviewed.find((x) => x.key === null).count, 0);
});
