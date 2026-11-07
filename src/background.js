// 后台 Service Worker：维护 declarativeNetRequest 规则 + 兜底拦截（关键词搜索、Steam 下载/搜索、SPA 跳转）
import { classifyUrl, matchDomain, STEAM_DOMAINS } from './lib/blocklist.js';
import { getLists, applyDueRemovals } from './lib/storage.js';

const RULE_ID_DOMAINS = 1;
const RULE_ID_STEAM_ABOUT = 2;
const RULE_ID_STEAM_INSTALLER = 3;
const GATE = 'src/pages/gate.html';
let lists = null;
const lastRedirect = new Map(); // tabId -> { url, ts }，防止同一地址被多个事件重复跳转

async function loadLists() {
  lists = await getLists();
  return lists;
}

async function syncRules() {
  const { domains, steamMode } = await loadLists();
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const redirectTarget = `chrome-extension://${chrome.runtime.id}/${GATE}#\\0`;
  const addRules = [];

  if (domains.length) {
    addRules.push({
      id: RULE_ID_DOMAINS,
      priority: 1,
      action: { type: 'redirect', redirect: { regexSubstitution: redirectTarget } },
      condition: {
        regexFilter: '^https?://.*',
        requestDomains: domains,
        resourceTypes: ['main_frame'],
      },
    });
  }

  if (steamMode === 'download') {
    addRules.push(
      {
        id: RULE_ID_STEAM_ABOUT,
        priority: 2,
        action: { type: 'redirect', redirect: { regexSubstitution: redirectTarget } },
        condition: {
          regexFilter: '^https?://(store\\.)?steampowered\\.com/about([/?#].*|$)',
          requestDomains: ['steampowered.com'],
          resourceTypes: ['main_frame'],
        },
      },
      {
        id: RULE_ID_STEAM_INSTALLER,
        priority: 2,
        action: { type: 'redirect', redirect: { regexSubstitution: redirectTarget } },
        condition: {
          regexFilter: '^https?://[^/]+/(.*client/installer/.*|.*(SteamSetup\\.exe|steam\\.dmg|steam_latest\\.deb|steam\\.apk)([?#].*|$))',
          requestDomains: STEAM_DOMAINS,
          resourceTypes: ['main_frame'],
        },
      },
    );
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules,
  });
}

function gateUrl(url, verdict) {
  const q = new URLSearchParams({ kind: verdict.kind, m: verdict.match });
  return chrome.runtime.getURL(`${GATE}?${q}`) + '#' + url;
}

async function maybeRedirect(tabId, url, { nonDnrOnly = false } = {}) {
  if (!url || !/^https?:/.test(url)) return;
  if (!lists) await loadLists();
  const verdict = classifyUrl(url, lists);
  if (!verdict) return;
  if (nonDnrOnly && matchDomain(verdict.domain, lists.domains)) return; // 域名本身已在 DNR 规则中，交由 DNR 重定向
  const now = Date.now();
  const prev = lastRedirect.get(tabId);
  if (prev && prev.url === url && now - prev.ts < 1500) return;
  lastRedirect.set(tabId, { url, ts: now });
  try { await chrome.tabs.update(tabId, { url: gateUrl(url, verdict) }); } catch { /* 标签页可能已关闭 */ }
}

// ---- 导航监听（必须在顶层同步注册） ----
chrome.webNavigation.onBeforeNavigate.addListener((d) => {
  if (d.frameId === 0) maybeRedirect(d.tabId, d.url, { nonDnrOnly: true });
});
chrome.webNavigation.onCommitted.addListener((d) => {
  if (d.frameId === 0) maybeRedirect(d.tabId, d.url);
});
chrome.webNavigation.onHistoryStateUpdated.addListener((d) => {
  if (d.frameId === 0) maybeRedirect(d.tabId, d.url);
});
chrome.webNavigation.onReferenceFragmentUpdated.addListener((d) => {
  if (d.frameId === 0) maybeRedirect(d.tabId, d.url);
});
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.url) maybeRedirect(tabId, info.url);
});
chrome.tabs.onRemoved.addListener((tabId) => lastRedirect.delete(tabId));

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.settings) syncRules().catch(console.error);
});

chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name === 'pending-removals') await applyDueRemovals();
});

async function init() {
  await chrome.alarms.create('pending-removals', { periodInMinutes: 10 });
  await applyDueRemovals();
  await syncRules();
  // 已经打开的标签页也检查一遍
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) if (t.id !== undefined && t.url) maybeRedirect(t.id, t.url);
}

chrome.runtime.onInstalled.addListener((details) => {
  init().catch(console.error);
  chrome.storage.local.get('installedAt').then(({ installedAt }) => {
    if (!installedAt) chrome.storage.local.set({ installedAt: Date.now() });
  });
  if (details.reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/options.html?welcome=1') });
});
chrome.runtime.onStartup.addListener(() => init().catch(console.error));
loadLists().catch(console.error);
