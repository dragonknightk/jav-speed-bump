// chrome.storage.local 封装（仅在扩展环境中使用）
import { effectiveLists, normalizeDomain, normalizeSteamMode } from './blocklist.js';

export const REMOVAL_DELAY_MS = 24 * 3600 * 1000;
const MAX_LOGS = 5000;

const DEFAULT_SETTINGS = {
  steamMode: 'off', // 'off' | 'download' | 'full'
  blockSteam: false,
  customDomains: [],
  customKeywords: [],
  removedDomains: [],
  removedKeywords: [],
  pendingRemovals: [], // {id, type:'domain'|'keyword'|'steam', value, requestedAt, effectiveAt}
};

const area = () => chrome.storage.local;

export async function getSettings() {
  const { settings } = await area().get('settings');
  const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  merged.steamMode = normalizeSteamMode(merged);
  merged.blockSteam = merged.steamMode !== 'off';
  return merged;
}

export async function saveSettings(settings) {
  await area().set({ settings });
}

export async function getLists() {
  return effectiveLists(await getSettings());
}

export async function getLogs() {
  const { logs } = await area().get('logs');
  return Array.isArray(logs) ? logs : [];
}

export async function addLog(entry) {
  const logs = await getLogs();
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const full = { id, ts: Date.now(), completed: false, puzzleMs: null, reason: null, ...entry };
  logs.push(full);
  await area().set({ logs: logs.slice(-MAX_LOGS) });
  return full;
}

export async function updateLog(id, patch) {
  const logs = await getLogs();
  const i = logs.findIndex((l) => l.id === id);
  if (i === -1) return null;
  logs[i] = { ...logs[i], ...patch };
  await area().set({ logs });
  return logs[i];
}

// ---------- Steam 专项封锁模式切换（开启或升级立即生效） ----------
export async function setSteamMode(mode) {
  const s = await getSettings();
  s.steamMode = mode === 'download' || mode === 'full' ? mode : 'off';
  s.blockSteam = s.steamMode !== 'off';
  s.pendingRemovals = s.pendingRemovals.filter((p) => p.type !== 'steam');
  await saveSettings(s);
  return s;
}

export async function enableSteam(mode = 'full') {
  return setSteamMode(mode);
}

// ---------- 名单增删与冷静期移除 ----------
export async function addItem(type, raw) {
  const s = await getSettings();
  const value = type === 'domain' ? normalizeDomain(raw) : String(raw).trim();
  if (!value) return { ok: false, error: 'invalid' };
  const customKey = type === 'domain' ? 'customDomains' : 'customKeywords';
  const removedKey = type === 'domain' ? 'removedDomains' : 'removedKeywords';
  s[removedKey] = s[removedKey].filter((v) => v !== value);
  s.pendingRemovals = s.pendingRemovals.filter((p) => !(p.type === type && p.value === value));
  if (!s[customKey].includes(value)) s[customKey].push(value);
  await saveSettings(s);
  return { ok: true, value };
}

export async function requestRemoval(type, value) {
  const s = await getSettings();
  const existing = s.pendingRemovals.find((p) => p.type === type && (type === 'steam' || p.value === value));
  if (existing) return existing;
  const now = Date.now();
  const p = { id: `rm-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`, type, value, requestedAt: now, effectiveAt: now + REMOVAL_DELAY_MS };
  s.pendingRemovals.push(p);
  await saveSettings(s);
  return p;
}

export async function cancelRemoval(id) {
  const s = await getSettings();
  s.pendingRemovals = s.pendingRemovals.filter((p) => p.id !== id);
  await saveSettings(s);
}

function applyRemovalTo(s, p) {
  if (p.type === 'steam') {
    // 无论此前是仅拦下载还是全面封锁，冷静期结束或做完题后直接一步回到关闭模式
    s.steamMode = 'off';
    s.blockSteam = false;
  } else {
    const customKey = p.type === 'domain' ? 'customDomains' : 'customKeywords';
    const removedKey = p.type === 'domain' ? 'removedDomains' : 'removedKeywords';
    s[customKey] = s[customKey].filter((v) => v !== p.value);
    if (!s[removedKey].includes(p.value)) s[removedKey].push(p.value);
  }
  s.pendingRemovals = s.pendingRemovals.filter((x) => x.id !== p.id);
}

/** 做完三组题目后立即执行某个待移除项 */
export async function applyRemovalNow(id) {
  const s = await getSettings();
  const p = s.pendingRemovals.find((x) => x.id === id);
  if (!p) return false;
  applyRemovalTo(s, p);
  await saveSettings(s);
  return p;
}

/** 执行所有已到期的移除 */
export async function applyDueRemovals(now = Date.now()) {
  const s = await getSettings();
  const due = s.pendingRemovals.filter((p) => p.effectiveAt <= now);
  if (!due.length) return 0;
  for (const p of due) applyRemovalTo(s, p);
  await saveSettings(s);
  return due.length;
}
