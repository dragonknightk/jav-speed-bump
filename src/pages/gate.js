import { h } from './ui/h.js';
import * as sudoku from './ui/sudoku-ui.js';
import * as nonogram from './ui/nonogram-ui.js';
import * as arithmetic from './ui/arithmetic-ui.js';
import * as twentyfour from './ui/twentyfour-ui.js';
import { computeDifficulty, paramsFor } from '../lib/difficulty.js';
import { isSteamDomain, isSteamDownloadUrl } from '../lib/blocklist.js';
import { getLogs, addLog, updateLog, applyRemovalNow, getSettings } from '../lib/storage.js';
import { makeRng } from '../puzzles/rng.js';
import { urgePhaseLabel, urgeSvg } from '../lib/urge.js';
import { t, isEn, toggleLang, onLangChange } from '../lib/i18n.js';

const TYPES = { sudoku, nonogram, arithmetic, twentyfour };
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
let step = 0;
let destroy = () => {};
let finished = false;
let lastResetNotice = false;

function renderHeaderSub() {
  if (mode === 'unlock') {
    $('headline').textContent = t('🚧 解锁前需完成三组挑战', '🚧 Complete 3 Stages to Unlock');
    if (!pendingItem) return;
    if (pendingItem.type === 'steam') {
      $('sub').textContent = t(
        '完成后将立即关闭「Steam 封锁」 · 也可直接关闭本页等待 24 小时自动生效',
        'Finish to disable Steam protection immediately, or wait for the 24h cooldown',
      );
    } else {
      const typeName = pendingItem.type === 'domain' ? t('网站', 'site') : t('关键词', 'keyword');
      $('sub').textContent = t(
        `完成后将立即移除${typeName}「${pendingItem.value}」 · 也可直接关闭本页等待 24 小时自动生效`,
        `Finish to remove ${typeName} "${pendingItem.value}" immediately, or wait for the 24h cooldown`,
      );
    }
    return;
  }

  $('headline').textContent = t('🚧 色情减速带', '🚧 JAV Speed Bump');
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
  $('timerLabel').textContent = t('已专注', 'Focused');
  $('langBtn').textContent = isEn() ? '中文' : 'EN';
  $('urgeTitle').textContent = t('冲动消退曲线', 'Urge Wave Curve');
  $('urgeStart').textContent = t('0 分钟', '0 min');
  $('urgePeak').textContent = t('浪峰 (7 分钟)', 'Peak (7m)');
  $('urgeEnd').textContent = t('15 分钟', '15 min');

  const rules = [
    ['🧠', t('唤醒前额叶理性', 'Engage Prefrontal Cortex'), t('连续完成三组逻辑推理题，用算力接管当前冲动', 'Complete 3 logic puzzles in a row to cool down the urge')],
    ['🔄', t('切屏或最小化即重置', 'Reset on Tab Switch'), t('离开本页会自动更换新题组，倒计时不中断', 'Leaving or minimizing this tab resets the current puzzles while timer continues')],
    ['🛡️', t('随时可主动离开', 'Close Anytime to Win'), t('直接关闭当前标签页，同样计入一次「战胜冲动」', 'Closing this tab right now also counts as overcoming an urge')],
  ];
  $('rulesCard').replaceChildren(
    h('div', { class: 'rules-title' }, t('关卡机制', 'Gate Rules')),
    ...rules.map(([ico, title, desc]) =>
      h('div', { class: 'rule-item' },
        h('span', { class: 'rule-ico' }, ico),
        h('div', {}, h('b', {}, title), h('span', {}, desc)))),
  );
  renderHeaderSub();
  if (lastResetNotice) {
    $('notice').replaceChildren(h('div', { class: 'notice' }, t(
      '由于刚才离开页面，系统自动更换了题目，且倒计时并未暂停',
      'Puzzles were reset because you left the page (timer kept running)',
    )));
  }
}

function pickTypes() {
  const rng = makeRng();
  return rng.shuffle(Object.keys(TYPES)).slice(0, 3);
}

function renderUrge(ms) {
  const min = ms / 60000;
  $('urgePhase').textContent = urgePhaseLabel(min);
  $('urgeSvg').innerHTML = urgeSvg(min, Date.now());
}

function renderSteps() {
  $('steps').replaceChildren(...order.map((k, i) => {
    const label = TYPES[k].getTitle ? TYPES[k].getTitle() : TYPES[k].title;
    return h('div', { class: 'step' + (i < step ? ' done' : i === step ? ' active' : '') },
      t(`${i < step ? '✓ ' : ''}第 ${i + 1} 组 · ${label}`, `${i < step ? '✓ ' : ''}Stage ${i + 1} · ${label}`));
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
  $('ptitle').textContent = mod.getTitle ? mod.getTitle() : mod.title;
  renderIntro(mod);
  $('plevel').textContent = t(`难度 ${level.toFixed(1)} / 5`, `Level ${level.toFixed(1)} / 5`);
  renderSteps();
}

function mountStep() {
  destroy();
  const mod = TYPES[order[step]];
  refreshCurrentStepChrome();
  const stage = $('stage');
  stage.replaceChildren();
  const p = paramsFor(level)[order[step]];
  destroy = mod.mount(stage, p, () => {
    step++;
    renderSteps();
    if (step >= order.length) done();
    else mountStep();
  }) || (() => {});
}

function restart(isLeaveReset = false) {
  if (finished) return;
  order = pickTypes();
  step = 0;
  lastResetNotice = isLeaveReset;
  if (isLeaveReset) {
    $('notice').replaceChildren(h('div', { class: 'notice' }, t(
      '由于刚才离开页面，系统自动更换了题目，且倒计时并未暂停',
      'Puzzles were reset because you left the page (timer kept running)',
    )));
  }
  mountStep();
}

async function done() {
  finished = true;
  destroy();
  const puzzleMs = Date.now() - startTs;
  if (mode === 'unlock') {
    const pid = params.get('pid');
    const p = await applyRemovalNow(pid);
    const unlockedLabel = p ? (p.type === 'steam' ? 'Steam' : p.value) : '';
    location.replace(chrome.runtime.getURL(`src/pages/options.html?unlocked=${encodeURIComponent(unlockedLabel)}`));
    return;
  }
  if (logEntry) await updateLog(logEntry.id, { completed: true, puzzleMs });
  sessionStorage.removeItem(sessionKey());
  const q = new URLSearchParams({
    log: logEntry?.id || '',
    kind: logEntry?.kind || 'domain',
    host: targetHost || '',
  });
  location.replace(chrome.runtime.getURL(`src/pages/blocked.html?${q}`));
}

function sessionKey() { return 'jsb-log:' + target; }

function tick() {
  const ms = Date.now() - startTs;
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
  $('timer').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  if (mode === 'trigger') renderUrge(ms);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && !finished) {
    restart(true);
  }
});

$('langBtn').addEventListener('click', toggleLang);
onLangChange(() => {
  applyStaticI18n();
  refreshCurrentStepChrome();
  if (mode === 'trigger') renderUrge(Date.now() - startTs);
});

async function init() {
  const [logs, settings] = await Promise.all([getLogs(), getSettings()]);
  const diff = computeDifficulty(logs.filter((l) => !l.unlock));
  level = diff.level;

  if (mode === 'unlock') {
    pendingItem = settings.pendingRemovals.find((x) => x.id === params.get('pid'));
    if (!pendingItem) { location.replace(chrome.runtime.getURL('src/pages/options.html')); return; }
    $('urge').hidden = true;
    level = Math.max(level, 2.5);
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
  }
  applyStaticI18n();
  restart(false);
  if (logEntry) updateLog(logEntry.id, { puzzles: order });
  tick();
  setInterval(tick, 1000);
}

init().catch((e) => {
  console.error(e);
  $('stage').textContent = 'Error: ' + e.message;
});
