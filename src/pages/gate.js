import { h } from './ui/h.js';
import * as sudoku from './ui/sudoku-ui.js';
import * as nonogram from './ui/nonogram-ui.js';
import * as arithmetic from './ui/arithmetic-ui.js';
import * as twentyfour from './ui/twentyfour-ui.js';
import { computeDifficulty, paramsFor, bonusLevelFor, UNLOCK_MIN_LEVEL } from '../lib/difficulty.js';
import { isSteamDomain, isSteamDownloadUrl } from '../lib/blocklist.js';
import { getLogs, addLog, updateLog, applyRemovalNow, getSettings, markGateTabActive, clearGateTabActive } from '../lib/storage.js';
import { makeRng } from '../puzzles/rng.js';
import { urgePhaseLabel, urgeSvg } from '../lib/urge.js';
import { t, isEn, toggleLang, onLangChange } from '../lib/i18n.js';

const TYPES = { sudoku, nonogram, arithmetic, twentyfour };
const BONUS_CHANCE = 0.7;
const RESET_TOAST_MS = 7000;
const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(location.search);
const mode = params.get('mode') === 'unlock' ? 'unlock' : 'trigger';
let target = location.hash.slice(1) || '';
if (/^https?%3A/i.test(target)) { try { target = decodeURIComponent(target); } catch { /* ignore */ } }
let targetHost = '';
try { targetHost = new URL(target).hostname; } catch { /* ignore */ }

let startTs = Date.now();
let logEntry = null;
let pendingItem = null;
let currentKind = 'domain';
let currentMatch = '';
let isSteamDl = false;
let level = 1;
let order = [];
let bonusType = null;
let hasBonus = false;
let inBonus = false;
let step = 0;
let destroy = () => {};
let finished = false;
let initialized = false;
let currentTabId = null;
let resetToastPending = false;
let resetToastVisible = false;
let resetToastTimer = null;
let resetToastFadeTimer = null;

function renderHeaderSub() {
  $('headline').textContent = t('🚧 色情减速带', '🚧 JAV Speed Bump');
  if (mode === 'unlock') {
    if (!pendingItem) return;
    if (pendingItem.type === 'steam') {
      $('sub').textContent = t(
        '🔓 正在关闭 Steam 封锁 · 关闭后等待 24 小时自动生效',
        '🔓 Disabling Steam Protection · Or wait for the 24h cooldown',
      );
    } else {
      const typeName = pendingItem.type === 'domain' ? t('网站', 'site') : t('关键词', 'keyword');
      $('sub').textContent = t(
        `🔓 正在解除屏蔽 · ${pendingItem.value} · 关闭后等待 24 小时自动生效`,
        `🔓 Unlocking ${typeName} "${pendingItem.value}" · Or wait for the 24h cooldown`,
      );
    }
    return;
  }

  if (currentKind === 'steam') {
    if (isSteamDl || currentMatch === 'Steam Client Download') {
      $('sub').textContent = t(
        '🎮 已拦截 Steam 客户端下载 · 先完成三组逻辑题冷静一下',
        '🎮 Steam Client Download Intercepted · Take 10 minutes to cool down',
      );
    } else {
      $('sub').textContent = t(
        `🎮 已触发 Steam 封锁 · ${targetHost || currentMatch}`,
        `🎮 Steam Protection Triggered · ${targetHost || currentMatch}`,
      );
    }
  } else if (currentKind === 'keyword') {
    $('sub').textContent = t(
      `🔍 已拦截敏感搜索 · 命中关键词「${currentMatch}」`,
      `🔍 Search Intercepted · Keyword "${currentMatch}"`,
    );
  } else {
    $('sub').textContent = t(
      `🛑 已拦截访问 · ${targetHost || '受限目标网址'}`,
      `🛑 Access Intercepted · ${targetHost || 'Blocked URL'}`,
    );
  }
}

function applyStaticI18n() {
  document.title = t('色情减速带 · JAV Speed Bump', 'JAV Speed Bump');
  $('langBtn').textContent = isEn() ? '中文' : 'EN';
  $('urgeTitle').textContent = t('冲动消退曲线', 'Urge Wave Curve');
  $('urgeStart').textContent = t('0 分钟', '0 min');
  $('urgePeak').textContent = t('浪峰', 'Peak');
  $('urgeEnd').textContent = t('15 分钟', '15 min');

  const rules = [
    ['🧠', t('专注逻辑解题', 'Focus on puzzles'), t('让冲动自然回落', 'to let the urge fade')],
    ['🔄', t('切屏或最小化', 'Switching or minimizing'), t('将自动重置题组', 'resets the puzzles')],
    ['🛡️', t('随时关闭本页', 'Closing this tab'), t('同样算战胜冲动', 'still counts as a win')],
  ];
  const sep = isEn() ? ' ' : '';
  $('rulesCard').replaceChildren(
    h('div', { class: 'rules-title' }, t('关卡机制', 'Gate Rules')),
    ...rules.map(([ico, p1, p2]) =>
      h('div', { class: 'rule-item' },
        h('span', { class: 'rule-ico' }, ico),
        h('span', { class: 'rule-text' },
          h('span', { class: 'rule-p1' }, p1),
          sep,
          h('span', { class: 'rule-p2' }, p2)))),
  );
  renderHeaderSub();
  renderNotice();
  if (resetToastVisible) renderResetToastEl();
}

function clearResetToast() {
  clearTimeout(resetToastTimer);
  clearTimeout(resetToastFadeTimer);
  resetToastTimer = null;
  resetToastFadeTimer = null;
  resetToastPending = false;
  resetToastVisible = false;
  $('toast').replaceChildren();
}

function hideResetToast() {
  clearTimeout(resetToastTimer);
  resetToastTimer = null;
  const el = $('toast').firstElementChild;
  if (!el) {
    resetToastVisible = false;
    return;
  }
  el.classList.add('leaving');
  clearTimeout(resetToastFadeTimer);
  resetToastFadeTimer = setTimeout(() => {
    resetToastVisible = false;
    $('toast').replaceChildren();
  }, 260);
}

function renderResetToastEl() {
  const el = h('div', { class: 'reset-toast', onclick: () => hideResetToast() },
    h('span', { class: 'toast-ico' }, '🔄'),
    h('span', {}, t('由于刚才离开页面，已自动更换新题组', 'Puzzles were reset because you left the page')));
  $('toast').replaceChildren(el);
}

function showResetToast() {
  clearTimeout(resetToastTimer);
  clearTimeout(resetToastFadeTimer);
  resetToastPending = false;
  resetToastVisible = true;
  renderResetToastEl();
  resetToastTimer = setTimeout(hideResetToast, RESET_TOAST_MS);
}

function renderNotice() {
  if (inBonus) {
    $('notice').replaceChildren(
      h('div', { class: 'bonus-banner' },
        h('div', { class: 'bonus-top' },
          h('div', { class: 'bonus-head' },
            h('span', { class: 'bonus-fire' }, '🔥'),
            h('b', {}, t('太强了，已完成 99%！就差最后一道「终局收官题」', '99% Done! Just One Final Push to Lock In Your Win'))),
          h('span', { class: 'bonus-pct' }, '99%')),
        h('div', { class: 'bonus-bar' }, h('div', { class: 'bonus-bar-fill' })),
        h('div', { class: 'bonus-desc' }, t(
          '最难的三关已经全部拿下，这道压轴题特意放缓了难度——再坚持一下，把最后一丝冲动彻底清零！',
          'You already conquered the toughest three stages. This finale is stepped down—finish this last step to drain the final trace of urge!',
        ))),
    );
    return;
  }
  $('notice').replaceChildren();
}

function pickSession() {
  const rng = makeRng();
  const all = rng.shuffle(Object.keys(TYPES));
  return {
    main: all.slice(0, 3),
    bonus: all[3],
    triggerBonus: rng.next() < BONUS_CHANCE,
  };
}

const narrowQuery = window.matchMedia('(max-width: 1000px)');

function renderUrge(ms) {
  const min = ms / 60000;
  $('urgePhase').textContent = urgePhaseLabel(min);
  const box = $('urgeSvg');
  const W = Math.max(220, Math.round(box.clientWidth || (narrowQuery.matches ? 420 : 276)));
  const H = narrowQuery.matches ? 78 : 118;
  box.innerHTML = urgeSvg(min, Date.now(), W, H);
}

function renderSteps() {
  $('steps').replaceChildren(...order.map((k, i) => {
    const label = TYPES[k].getTitle ? TYPES[k].getTitle() : TYPES[k].title;
    const isBonusStep = i === 3;
    const cls = 'step'
      + (i < step ? ' done' : i === step ? ' active' : '')
      + (isBonusStep ? ' bonus' : '');
    const text = isBonusStep
      ? t(`${i < step ? '✓ ' : '★ '}最后一道 · ${label}`, `${i < step ? '✓ ' : '★ '}Final · ${label}`)
      : t(`${i < step ? '✓ ' : ''}第 ${i + 1} 组 · ${label}`, `${i < step ? '✓ ' : ''}Stage ${i + 1} · ${label}`);
    return h('div', { class: cls }, text);
  }));
}

function renderIntro(mod) {
  const ruleText = mod.getRule ? mod.getRule() : mod.rule;
  const keysList = mod.getKeys ? mod.getKeys() : mod.keys;
  const ruleLine = h('div', { class: 'intro-rule' },
    h('kbd', {}, t('目标', 'Goal')),
    h('span', {}, ruleText));
  const keysLine = h('div', { class: 'intro-keys' },
    ...keysList.map(([k, v]) => h('span', { class: 'key-item' }, h('kbd', {}, k), h('span', {}, v))));
  $('pintro').replaceChildren(ruleLine, keysLine);
}

function refreshCurrentStepChrome() {
  if (!order.length || step >= order.length) return;
  const mod = TYPES[order[step]];
  const activeLevel = inBonus ? bonusLevelFor(level) : level;
  $('ptitle').textContent = mod.getTitle ? mod.getTitle() : mod.title;
  renderIntro(mod);
  const levelEl = $('plevel');
  levelEl.className = inBonus ? 'tag amber bonus-tag' : 'tag amber';
  levelEl.textContent = inBonus
    ? t(`★ 终局收官 · 难度 ${activeLevel} / 5`, `★ Final Step · Level ${activeLevel} / 5`)
    : t(`难度 ${activeLevel} / 5`, `Level ${activeLevel} / 5`);
  const panel = document.querySelector('.puzzle-panel');
  if (panel) panel.classList.toggle('bonus-mode', inBonus);
  renderSteps();
}

function mountStep() {
  destroy();
  const mod = TYPES[order[step]];
  const activeLevel = inBonus ? bonusLevelFor(level) : level;
  refreshCurrentStepChrome();
  const stage = $('stage');
  stage.replaceChildren();
  const p = paramsFor(activeLevel)[order[step]];
  destroy = mod.mount(stage, p, () => {
    step++;
    if (step === 3 && hasBonus && !inBonus && bonusType) {
      inBonus = true;
      clearResetToast();
      order = [...order, bonusType];
      renderNotice();
      if (logEntry) updateLog(logEntry.id, { puzzles: order, bonus: true }).catch(console.error);
      mountStep();
      return;
    }
    renderSteps();
    if (step >= order.length) done();
    else mountStep();
  }) || (() => {});
}

function restart(isLeaveReset = false) {
  if (finished) return;
  const session = pickSession();
  order = session.main;
  bonusType = session.bonus;
  hasBonus = session.triggerBonus;
  inBonus = false;
  step = 0;
  clearResetToast();
  if (isLeaveReset) {
    if (document.visibilityState === 'visible') showResetToast();
    else resetToastPending = true;
  }
  renderNotice();
  mountStep();
  if (logEntry) updateLog(logEntry.id, { puzzles: order, bonus: false }).catch(console.error);
}

async function done() {
  finished = true;
  clearResetToast();
  destroy();
  const puzzleMs = Date.now() - startTs;
  if (mode === 'unlock') {
    const pid = params.get('pid');
    sessionStorage.removeItem(unlockSessionKey(pid));
    const p = await applyRemovalNow(pid);
    const unlockedLabel = p ? (p.type === 'steam' ? 'Steam' : p.value) : '';
    location.replace(chrome.runtime.getURL(`src/pages/options.html?unlocked=${encodeURIComponent(unlockedLabel)}`));
    return;
  }
  if (logEntry) await updateLog(logEntry.id, { completed: true, puzzleMs });
  await clearGateTabActive(currentTabId).catch(() => {});
  sessionStorage.removeItem(sessionKey());
  const q = new URLSearchParams({
    log: logEntry?.id || '',
    kind: logEntry?.kind || 'domain',
    host: targetHost || '',
  });
  location.replace(chrome.runtime.getURL(`src/pages/blocked.html?${q}`));
}

function sessionKey() { return 'jsb-log:' + target; }
function unlockSessionKey(pid) { return 'jsb-unlock:' + pid; }

function tick() {
  renderUrge(Date.now() - startTs);
}

if (typeof ResizeObserver !== 'undefined') {
  let lastW = 0;
  new ResizeObserver(() => {
    if (!initialized) return;
    const w = Math.round($('urgeSvg').clientWidth);
    if (w && w !== lastW) {
      lastW = w;
      renderUrge(Date.now() - startTs);
    }
  }).observe($('urgeSvg'));
}
narrowQuery.addEventListener('change', () => {
  if (initialized) renderUrge(Date.now() - startTs);
});

document.addEventListener('visibilitychange', () => {
  if (!initialized || finished) return;
  if (document.visibilityState === 'hidden') {
    restart(true);
  } else if (document.visibilityState === 'visible' && resetToastPending) {
    showResetToast();
  }
});

$('langBtn').addEventListener('click', toggleLang);
onLangChange(() => {
  applyStaticI18n();
  refreshCurrentStepChrome();
  renderUrge(Date.now() - startTs);
});

async function init() {
  const [logs, settings] = await Promise.all([getLogs(), getSettings()]);
  const diff = computeDifficulty(logs.filter((l) => !l.unlock));
  level = diff.level;

  if (mode === 'unlock') {
    const pid = params.get('pid');
    pendingItem = settings.pendingRemovals.find((x) => x.id === pid);
    if (!pendingItem) { location.replace(chrome.runtime.getURL('src/pages/options.html')); return; }
    const savedTs = Number(sessionStorage.getItem(unlockSessionKey(pid)));
    if (savedTs > 0) startTs = savedTs;
    else sessionStorage.setItem(unlockSessionKey(pid), String(startTs));
    level = Math.max(level, UNLOCK_MIN_LEVEL);
  } else {
    const rawKind = params.get('kind');
    isSteamDl = isSteamDownloadUrl(target);
    currentKind = rawKind === 'steam' || isSteamDl || isSteamDomain(targetHost) ? 'steam' : (rawKind || 'domain');
    currentMatch = params.get('m') || (isSteamDl ? 'Steam Client Download' : targetHost);
    const existingId = sessionStorage.getItem(sessionKey());
    logEntry = existingId ? logs.find((l) => l.id === existingId) : null;
    if (logEntry) startTs = logEntry.ts;
    else {
      logEntry = await addLog({
        domain: targetHost || t('(未知站点)', '(unknown)'),
        kind: currentKind,
        match: currentMatch,
        level,
      });
      sessionStorage.setItem(sessionKey(), logEntry.id);
      startTs = logEntry.ts;
    }
    const tab = await chrome.tabs.getCurrent().catch(() => null);
    currentTabId = tab?.id ?? null;
    if (logEntry) await markGateTabActive(currentTabId, logEntry.id).catch(() => {});
  }
  applyStaticI18n();
  initialized = true;
  restart(false);
  tick();
  setInterval(tick, 1000);
}

init().catch((e) => {
  console.error(e);
  $('stage').textContent = 'Error: ' + e.message;
});
