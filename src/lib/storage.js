// chrome.storage.local 封装（仅在扩展环境中使用）
import {
  ALL_DEFAULT_DOMAINS, DEFAULT_KEYWORDS, effectiveLists,
  normalizeDomain, isValidDomain, normalizeKeyword, normalizeSteamMode,
} from './blocklist.js';

export const REMOVAL_DELAY_MS = 24 * 3600 * 1000;
const MAX_LOGS = 5000;
const GATE_TABS_KEY = 'activeGateTabs';

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
const memoryLocks = new Map();

function withLock(name, fn) {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(`jsb:${name}`, fn);
  }
  const prev = memoryLocks.get(name) || Promise.resolve();
  const next = prev.then(fn, fn);
  memoryLocks.set(name, next.catch(() => {}));
  return next;
}

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

export function addLog(entry) {
  return withLock('logs', async () => {
    const logs = await getLogs();
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const full = { id, ts: Date.now(), completed: false, puzzleMs: null, reason: null, ...entry };
    logs.push(full);
    await area().set({ logs: logs.slice(-MAX_LOGS) });
    return full;
  });
}

export function updateLog(id, patch) {
  return withLock('logs', async () => {
    const logs = await getLogs();
    const i = logs.findIndex((l) => l.id === id);
    if (i === -1) return null;
    logs[i] = { ...logs[i], ...patch };
    await area().set({ logs });
    return logs[i];
  });
}

// ---------- 活跃解题页登记（chrome.storage.session，会话结束自动清空） ----------
export async function markGateTabActive(tabId, logId) {
  if (tabId === undefined || tabId === null || !logId || !chrome.storage?.session) return;
  await withLock('active-tabs', async () => {
    const data = await chrome.storage.session.get(GATE_TABS_KEY);
    const map = { ...(data[GATE_TABS_KEY] || {}), [String(tabId)]: logId };
    await chrome.storage.session.set({ [GATE_TABS_KEY]: map });
  });
}

export async function clearGateTabActive(tabId) {
  if (tabId === undefined || tabId === null || !chrome.storage?.session) return;
  await withLock('active-tabs', async () => {
    const data = await chrome.storage.session.get(GATE_TABS_KEY);
    const map = { ...(data[GATE_TABS_KEY] || {}) };
    if (!(String(tabId) in map)) return;
    delete map[String(tabId)];
    await chrome.storage.session.set({ [GATE_TABS_KEY]: map });
  });
}

export async function getActiveGateLogIds() {
  const ids = new Set();
  if (!chrome.storage?.session || !chrome.tabs?.query) return ids;
  const [data, tabs] = await Promise.all([
    chrome.storage.session.get(GATE_TABS_KEY),
    chrome.tabs.query({ url: chrome.runtime.getURL('src/pages/gate.html*') }),
  ]);
  const map = data[GATE_TABS_KEY] || {};
  const liveIds = new Set(tabs.map((t) => String(t.id)));
  for (const [tid, logId] of Object.entries(map)) {
    if (liveIds.has(tid) && logId) ids.add(logId);
  }
  return ids;
}

// ---------- Steam 专项封锁模式切换（开启或升级立即生效） ----------
export function setSteamMode(mode) {
  return withLock('settings', async () => {
    const s = await getSettings();
    s.steamMode = mode === 'download' || mode === 'full' ? mode : 'off';
    s.blockSteam = s.steamMode !== 'off';
    s.pendingRemovals = s.pendingRemovals.filter((p) => p.type !== 'steam');
    await saveSettings(s);
    return s;
  });
}

export function enableSteam(mode = 'full') {
  return setSteamMode(mode);
}

// ---------- 名单增删与冷静期移除 ----------
export function addItem(type, raw) {
  return withLock('settings', async () => {
    const s = await getSettings();
    const value = type === 'domain' ? normalizeDomain(raw) : normalizeKeyword(raw);
    if (!value || (type === 'domain' && !isValidDomain(value))) return { ok: false, error: 'invalid' };
    const customKey = type === 'domain' ? 'customDomains' : 'customKeywords';
    const removedKey = type === 'domain' ? 'removedDomains' : 'removedKeywords';
    const norm = type === 'domain' ? (v) => v : normalizeKeyword;
    s[removedKey] = s[removedKey].filter((v) => norm(v) !== value);
    s.pendingRemovals = s.pendingRemovals.filter((p) => !(p.type === type && norm(p.value) === value));
    if (!s[customKey].some((v) => norm(v) === value)) s[customKey].push(value);
    await saveSettings(s);
    return { ok: true, value };
  });
}

export function requestRemoval(type, value) {
  return withLock('settings', async () => {
    const s = await getSettings();
    const normValue = type === 'keyword' ? normalizeKeyword(value) : value;
    const matchVal = (v) => (type === 'keyword' ? normalizeKeyword(v) === normValue : v === normValue);
    const existing = s.pendingRemovals.find((p) => p.type === type && (type === 'steam' || matchVal(p.value)));
    if (existing) return existing;
    const now = Date.now();
    const p = {
      id: `rm-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      value: normValue,
      requestedAt: now,
      effectiveAt: now + REMOVAL_DELAY_MS,
    };
    s.pendingRemovals.push(p);
    await saveSettings(s);
    return p;
  });
}

export function cancelRemoval(id) {
  return withLock('settings', async () => {
    const s = await getSettings();
    s.pendingRemovals = s.pendingRemovals.filter((p) => p.id !== id);
    await saveSettings(s);
  });
}

function applyRemovalTo(s, p) {
  if (p.type === 'steam') {
    // 无论此前是仅拦下载还是全面封锁，冷静期结束或做完题后直接一步回到关闭模式
    s.steamMode = 'off';
    s.blockSteam = false;
  } else if (p.type === 'domain') {
    s.customDomains = s.customDomains.filter((v) => v !== p.value);
    if (ALL_DEFAULT_DOMAINS.includes(p.value) && !s.removedDomains.includes(p.value)) {
      s.removedDomains.push(p.value);
    }
  } else {
    const norm = normalizeKeyword(p.value);
    s.customKeywords = s.customKeywords.filter((v) => normalizeKeyword(v) !== norm);
    if (DEFAULT_KEYWORDS.includes(norm) && !s.removedKeywords.some((v) => normalizeKeyword(v) === norm)) {
      s.removedKeywords.push(norm);
    }
  }
  s.pendingRemovals = s.pendingRemovals.filter((x) => x.id !== p.id);
}

/** 做完三组题目后立即执行某个待移除项 */
export function applyRemovalNow(id) {
  return withLock('settings', async () => {
    const s = await getSettings();
    const p = s.pendingRemovals.find((x) => x.id === id);
    if (!p) return false;
    applyRemovalTo(s, p);
    await saveSettings(s);
    return p;
  });
}

/** 执行所有已到期的移除 */
export function applyDueRemovals(now = Date.now()) {
  return withLock('settings', async () => {
    const s = await getSettings();
    const due = s.pendingRemovals.filter((p) => p.effectiveAt <= now);
    if (!due.length) return 0;
    for (const p of due) applyRemovalTo(s, p);
    await saveSettings(s);
    return due.length;
  });
}
