import { h } from './ui/h.js';
import { getLogs, getActiveGateLogIds } from '../lib/storage.js';
import { byDay, byHour, byReason, streaks, summary, logStatus } from '../lib/stats.js';
import { reasonText } from '../lib/reasons.js';
import { formatDuration, dayKey } from '../lib/time.js';
import { t, isEn, toggleLang, onLangChange } from '../lib/i18n.js';

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, text) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
};

function barChart(data, { height = 180, labelEvery = 1, highlight } = {}) {
  const W = 820, H = height, padL = 28, padB = 22, padT = 14;
  const max = Math.max(1, ...data.map((d) => d.count));
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img' });
  const ticks = Math.min(max, 4);
  for (let i = 0; i <= ticks; i++) {
    const v = Math.round((max * i) / ticks);
    const y = H - padB - ((H - padB - padT) * v) / max;
    svg.append(s('line', { x1: padL, x2: W, y1: y, y2: y, class: 'grid' }), s('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end' }, String(v)));
  }
  const bw = (W - padL) / data.length;
  data.forEach((d, i) => {
    const bh = ((H - padB - padT) * d.count) / max;
    const x = padL + i * bw + bw * 0.15;
    const rect = s('rect', { x, y: H - padB - bh, width: bw * 0.7, height: Math.max(bh, 0), rx: 2, class: 'bar' + (highlight && highlight(d) ? ' today' : '') });
    rect.append(s('title', {}, `${d.label}: ${d.count}`));
    svg.append(rect);
    if (d.count) svg.append(s('text', { x: x + bw * 0.35, y: H - padB - bh - 3, 'text-anchor': 'middle', class: 'val' }, String(d.count)));
    if (i % labelEvery === 0) svg.append(s('text', { x: x + bw * 0.35, y: H - 6, 'text-anchor': 'middle' }, d.label));
  });
  return svg;
}

function hBarChart(data) {
  const W = 820, row = 30, H = data.length * row + 6, padL = 88;
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((a, d) => a + d.count, 0) || 1;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img' });
  data.forEach((d, i) => {
    const y = i * row + 4;
    const w = ((W - padL - 104) * d.count) / max;
    const lbl = d.key ? reasonText(d.key) : t('未选择', 'Unlogged');
    svg.append(s('text', { x: padL - 10, y: y + 17, 'text-anchor': 'end' }, lbl));
    svg.append(s('rect', { x: padL, y, width: Math.max(w, 0), height: row - 10, rx: 3, class: 'bar' }));
    svg.append(s('text', { x: padL + w + 8, y: y + 17, class: 'val' }, t(`${d.count} 次 (${Math.round((d.count / total) * 100)}%)`, `${d.count} (${Math.round((d.count / total) * 100)}%)`)));
  });
  return svg;
}

function kindBadge(l) {
  if (l.kind === 'steam') return h('span', { class: 'tag amber' }, '🎮 Steam');
  if (l.kind === 'keyword') return h('span', { class: 'tag' }, t('🔍 搜索词', '🔍 Search'));
  return h('span', { class: 'tag' }, t('🌐 网站', '🌐 Site'));
}

document.getElementById('langBtn').addEventListener('click', toggleLang);
onLangChange(() => init());

async function init() {
  document.title = t('数据统计 · 色情减速带', 'Statistics · JAV Speed Bump');
  document.getElementById('langBtn').textContent = isEn() ? '中文' : 'EN';
  document.getElementById('pageTitle').textContent = t('📊 数据统计与复盘', '📊 Statistics & Review');
  document.getElementById('optLink').textContent = t('⚙️ 防护设置', '⚙️ Settings');
  document.getElementById('dailyTitle').textContent = t('近 30 天触发趋势', 'Last 30 Days Triggers');
  document.getElementById('dailySub').textContent = t('柱体越低越平稳 · 绿色柱代表今日', 'Lower bars mean calmer days · Green bar indicates today');
  document.getElementById('hourlyTitle').textContent = t('高发时段分布（24 小时）', 'Triggers by Hour of Day (0–23h)');
  document.getElementById('hourlySub').textContent = t('柱体较高的时段为冲动易发期，可提前安排运动或外出', 'Taller bars show peak urge hours—plan offline activities ahead');
  document.getElementById('reasonTitle').textContent = t('触发诱因占比', 'Triggers by Reason');
  document.getElementById('recentTitle').textContent = t('近期拦截明细', 'Recent Activity');
  document.getElementById('recentSub').textContent = t('最近 20 条触发记录', 'Latest 20 records');

  const [logsAll, activeIds, { installedAt }] = await Promise.all([
    getLogs(),
    getActiveGateLogIds().catch(() => new Set()),
    chrome.storage.local.get('installedAt'),
  ]);
  const logs = logsAll.filter((l) => !l.unlock);
  const now = Date.now();
  let since = installedAt;
  if (!since) { since = logs[0]?.ts ?? now; await chrome.storage.local.set({ installedAt: since }); }
  const st = streaks(logs, now, since);
  const sm = summary(logs, now, activeIds);
  const card = (label, n, cls = '') => h('div', { class: 'stat' }, h('div', { class: 'label' }, label), h('div', { class: 'n ' + cls }, n));

  const heroSub = (sm.walkedAway || sm.inProgress)
    ? t(
      `包含 ${sm.completed} 次完成题组、${sm.walkedAway} 次中途主动离开${sm.inProgress ? `（${sm.inProgress} 次进行中）` : ''}`,
      `Includes ${sm.completed} completed, ${sm.walkedAway} early exits${sm.inProgress ? ` (${sm.inProgress} in progress)` : ''}`,
    )
    : t('每次被拦截或中途主动关页离开均计入克制成果', 'Every interception or early tab closure counts as a win');

  document.getElementById('cards').replaceChildren(
    h('div', { class: 'stat hero' },
      h('div', { class: 'label' }, t('🛡️ 累计战胜冲动', '🛡️ Urges Overcome')),
      h('div', { class: 'n' }, t(`${sm.total} 次`, `${sm.total}`)),
      h('div', { class: 'hero-sub' }, heroSub)),
    card(t('当前连续未触发', 'Current Clean Streak'), formatDuration(st.current), 'green'),
    card(t('历史最长间隔', 'Longest Streak'), formatDuration(st.longest)),
    card(t('今日 / 近 7 天', 'Today / Last 7 Days'), t(`${sm.today} / ${sm.week} 次`, `${sm.today} / ${sm.week}`)),
    card(t('平均解题用时', 'Avg Puzzle Time'), sm.avgPuzzleMin > 0 ? t(`${sm.avgPuzzleMin.toFixed(1)} 分钟`, `${sm.avgPuzzleMin.toFixed(1)} min`) : '-'),
  );

  const today = dayKey(now);
  document.getElementById('daily').replaceChildren(barChart(byDay(logs, 30, now), { labelEvery: 3, highlight: (d) => d.key === today }));
  document.getElementById('hourly').replaceChildren(barChart(byHour(logs), { height: 160, labelEvery: 1 }));
  const reviewedCount = logs.filter((l) => l.completed || Boolean(l.reason)).length;
  document.getElementById('reasons').replaceChildren(hBarChart(byReason(logs, { reviewedOnly: true })));
  document.getElementById('reasonNote').textContent = sm.walkedAway
    ? t(
      `基于 ${reviewedCount} 次复盘记录（另有 ${sm.walkedAway} 次中途直接离开未进入复盘）`,
      `Based on ${reviewedCount} reviewed records (${sm.walkedAway} walked away before review)`,
    )
    : t(`共 ${reviewedCount} 次复盘记录`, `${reviewedCount} reviewed records`);

  const formatRowDuration = (l) => {
    const status = logStatus(l, now, activeIds);
    if (status === 'completed') {
      return l.puzzleMs
        ? t(`${(l.puzzleMs / 60000).toFixed(1)} 分钟`, `${(l.puzzleMs / 60000).toFixed(1)} min`)
        : t('已完成', 'Completed');
    }
    if (status === 'in_progress') return t('进行中', 'In progress');
    return t('中途离开', 'Walked away');
  };

  const recent = [...logs].sort((a, b) => b.ts - a.ts).slice(0, 20);
  document.getElementById('recent').replaceChildren(
    h('tr', {},
      h('th', {}, t('触发时间', 'Time')),
      h('th', {}, t('类型', 'Type')),
      h('th', {}, t('拦截目标', 'Target')),
      h('th', {}, t('触发诱因', 'Reason')),
      h('th', {}, t('解题用时', 'Duration'))),
    ...(recent.length ? recent.map((l) => h('tr', {},
      h('td', {}, new Date(l.ts).toLocaleString(isEn() ? 'en-US' : 'zh-CN', { hour12: false })),
      h('td', {}, kindBadge(l)),
      h('td', {}, l.domain + (l.kind === 'keyword' || (l.kind === 'steam' && l.match && l.match !== l.domain) ? ` (${l.match})` : '')),
      h('td', {}, reasonText(l.reason)),
      h('td', {}, formatRowDuration(l))))
      : [h('tr', {}, h('td', { colspan: 5, class: 'muted' }, t('暂无触发记录', 'No records yet')))]));
}

init();
