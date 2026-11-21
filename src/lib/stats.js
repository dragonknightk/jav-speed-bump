import { dayKey } from './time.js';
import { REASONS } from './reasons.js';

const DAY = 86400000;

export function byDay(logs, days = 30, now = Date.now()) {
  const out = [];
  const counts = new Map();
  for (const l of logs) counts.set(dayKey(l.ts), (counts.get(dayKey(l.ts)) || 0) + 1);
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(d.getTime() - i * DAY);
    out.push({ key: k, label: k.slice(5), count: counts.get(k) || 0 });
  }
  return out;
}

export function byHour(logs) {
  const out = Array.from({ length: 24 }, (_, hr) => ({ key: hr, label: String(hr), count: 0 }));
  for (const l of logs) out[new Date(l.ts).getHours()].count++;
  return out;
}

export function byReason(logs, { reviewedOnly = false } = {}) {
  const src = reviewedOnly ? logs.filter((l) => l.completed || Boolean(l.reason)) : logs;
  const out = REASONS.map((r) => ({ key: r.key, label: r.label, count: 0 }));
  let unknown = 0;
  for (const l of src) {
    const r = out.find((x) => x.key === l.reason);
    if (r) r.count++; else unknown++;
  }
  out.push({ key: null, label: '未选择', count: unknown });
  return out;
}

/**
 * 单条拦截记录的当前状态：completed（已完成解题）/ in_progress（解题中）/ walked_away（中途离开）。
 * 传入 activeIds（当前存活的 gate.html 对应 logId 集合）时实时判定；否则回退到 1 小时阈值。
 */
export function logStatus(log, now = Date.now(), activeIds = null) {
  if (log.completed) return 'completed';
  if (activeIds instanceof Set) {
    return activeIds.has(log.id) ? 'in_progress' : 'walked_away';
  }
  return now - log.ts > 3600000 ? 'walked_away' : 'in_progress';
}

/** 当前连续未触发时长 & 最长纪录（毫秒）。since 为开始统计的时间（如安装时间） */
export function streaks(logs, now = Date.now(), since = null) {
  const ts = logs.map((l) => l.ts).sort((a, b) => a - b);
  const start = since ?? ts[0] ?? now;
  const current = ts.length ? now - ts[ts.length - 1] : now - start;
  let longest = current;
  let prev = start;
  for (const t of ts) { longest = Math.max(longest, t - prev); prev = t; }
  return { current, longest };
}

export function summary(logs, now = Date.now(), activeIds = null) {
  const today = dayKey(now);
  const weekAgo = now - 7 * DAY;
  const doneWithMs = logs.filter((l) => l.completed && l.puzzleMs);
  let completed = 0;
  let inProgress = 0;
  let walkedAway = 0;
  for (const l of logs) {
    const st = logStatus(l, now, activeIds);
    if (st === 'completed') completed++;
    else if (st === 'in_progress') inProgress++;
    else walkedAway++;
  }
  return {
    total: logs.length,
    today: logs.filter((l) => dayKey(l.ts) === today).length,
    week: logs.filter((l) => l.ts >= weekAgo).length,
    completed,
    inProgress,
    walkedAway,
    avgPuzzleMin: doneWithMs.length ? doneWithMs.reduce((s, l) => s + l.puzzleMs, 0) / doneWithMs.length / 60000 : 0,
  };
}
