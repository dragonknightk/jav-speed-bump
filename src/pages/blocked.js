import { h } from './ui/h.js';
import { isSteamDomain, isSteamDownloadUrl } from '../lib/blocklist.js';
import { getLogs, updateLog } from '../lib/storage.js';
import { REASONS, pickAlternatives } from '../lib/reasons.js';
import { formatDuration } from '../lib/time.js';
import { t, isEn, toggleLang, onLangChange } from '../lib/i18n.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const logId = params.get('log');
const rawTarget = location.hash.slice(1) || '';
let host = params.get('host') || '';
if (!host && rawTarget) {
  try { host = new URL(rawTarget).hostname; } catch { host = rawTarget; }
}

let currentReason = null;
let currentAlts = [];
let logsCache = [];
let entryCache = null;

function renderAlts() {
  if (!currentAlts.length) return;
  $('altPanel').hidden = false;
  $('alts').replaceChildren(...currentAlts.map((a) =>
    h('div', { class: 'alt' },
      h('span', { class: 'ico' }, a.icon),
      h('div', {},
        h('b', {}, isEn() ? a.titleEn : a.title),
        h('span', { class: 'muted small' }, isEn() ? a.detailEn : a.detail)))));
}

function showAlts() {
  currentAlts = pickAlternatives(currentReason, 3);
  renderAlts();
}

function renderPage() {
  document.title = t('访问已终止 · 色情减速带', 'Access Stopped · JAV Speed Bump');
  $('langBtn').textContent = isEn() ? '中文' : 'EN';
  $('askTitle').textContent = t('记录本次触发诱因', 'What Triggered This Urge?');
  $('altTitle').textContent = t('立刻做一件小事切换状态', 'Switch Your State Right Now');
  $('more').textContent = t('🔄 换一批建议', '🔄 More Ideas');
  $('statsLink').textContent = t('📊 查看数据统计', '📊 View Stats');
  $('close').textContent = t('关闭当前标签页', 'Close This Tab');

  const isSteam = params.get('kind') === 'steam' || entryCache?.kind === 'steam' || isSteamDomain(host) || isSteamDownloadUrl(rawTarget);

  if (isSteam) {
    $('headline').textContent = t('🛑 Steam 访问已终止', '🛑 Steam Access Stopped');
    $('what').textContent = t(
      'Steam 专项封锁处于开启状态 · 目标页面或客户端安装包已保持拦截',
      'Steam protection is active · Target page or client installer remains blocked',
    );
  } else {
    $('headline').textContent = t('🛑 访问已终止', '🛑 Access Stopped');
    $('what').textContent = host
      ? t(`${host} 处于封锁名单中 · 目标页面已保持拦截`, `${host} is on your blocklist and remains blocked`)
      : t('目标地址处于封锁名单中 · 页面已保持拦截', 'Target URL is on your blocklist and remains blocked');
  }

  const mins = entryCache?.puzzleMs ? Math.max(1, Math.round(entryCache.puzzleMs / 60000)) : null;
  const before = logsCache
    .filter((l) => !l.unlock && l.id !== logId && l.ts < (entryCache?.ts ?? Date.now()))
    .sort((a, b) => a.ts - b.ts);
  const last = before[before.length - 1];

  $('praise').replaceChildren(
    h('div', { class: 'praise-main' },
      h('span', { class: 'praise-ico' }, '🛡️'),
      h('span', {}, mins
        ? t(`已专注解题 ${mins} 分钟 · 最强烈的一波冲动正在消退`, `You focused on puzzles for ${mins} min · The urge wave is subsiding`)
        : t('已完成全部解题关卡 · 最强烈的一波冲动正在消退', 'Puzzles completed · The strongest urge wave is subsiding'))),
    last
      ? h('span', { class: 'tag green' }, t(
        `距上次触发 ${formatDuration((entryCache?.ts ?? Date.now()) - last.ts)}`,
        `${formatDuration((entryCache?.ts ?? Date.now()) - last.ts)} since last trigger`,
      ))
      : h('span', { class: 'tag green' }, t('已成功克制本次冲动', 'Urge overcome')),
  );

  $('reasons').replaceChildren(...REASONS.map((r) => h('button', {
    class: currentReason === r.key ? 'sel' : '',
    onclick: async (e) => {
      currentReason = r.key;
      [...$('reasons').children].forEach((b) => b.classList.remove('sel'));
      e.currentTarget.classList.add('sel');
      if (logId) await updateLog(logId, { reason: r.key });
      showAlts();
    },
  }, `${r.icon} ${isEn() ? r.labelEn : r.label}`)));

  renderAlts();
}

$('langBtn').addEventListener('click', toggleLang);
onLangChange(renderPage);

async function init() {
  logsCache = await getLogs();
  entryCache = logsCache.find((l) => l.id === logId) || null;
  if (entryCache?.reason) {
    currentReason = entryCache.reason;
    currentAlts = pickAlternatives(currentReason, 3);
  }
  renderPage();

  $('more').addEventListener('click', showAlts);
  $('close').addEventListener('click', async () => {
    const tab = await chrome.tabs.getCurrent();
    if (tab?.id !== undefined) chrome.tabs.remove(tab.id); else window.close();
  });
}

init();
