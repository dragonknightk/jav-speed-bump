import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byDay, byHour, byReason, streaks, summary } from '../src/lib/stats.js';

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
  assert.equal(s.walkedAway, 1);
  assert.equal(s.avgPuzzleMin, 8);
});
