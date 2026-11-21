import { h } from './ui/h.js';
import {
  DEFAULT_DOMAINS, DEFAULT_KEYWORDS, ALL_DEFAULT_DOMAINS,
  validateDomainInput, normalizeKeyword,
} from '../lib/blocklist.js';
import { getSettings, addItem, setSteamMode, requestRemoval, cancelRemoval, applyDueRemovals } from '../lib/storage.js';
import { formatDuration } from '../lib/time.js';
import { detectLockOs, buildLockBat, buildLockMobileConfig } from '../lib/lock-script.js';
import { t, isEn, toggleLang, onLangChange } from '../lib/i18n.js';

const $ = (id) => document.getElementById(id);

let settings;
let showDomainDrawer = false;
let showKwDrawer = false;
const detectedOs = detectLockOs();
let activeLockOs = detectedOs;

function groupLabel(g) {
  const map = {
    custom: t('我添加的网站', 'My Custom Sites'),
    jav: t('内置规则 · JAV 站点', 'Built-in · JAV Sites'),
    hentai: t('内置规则 · 动漫 / 本子', 'Built-in · Hentai / Doujin'),
    mainstream: t('内置规则 · 综合成人站点', 'Built-in · Mainstream Adult Sites'),
    tld: t('内置规则 · 成人专用顶级域', 'Built-in · Adult TLDs'),
  };
  return map[g] || g;
}

function applyStaticI18n() {
  document.title = t('防护设置 · 色情减速带', 'Settings · JAV Speed Bump');
  $('langBtn').textContent = isEn() ? '中文' : 'EN';
  $('pageTitle').textContent = t('🚧 色情减速带 · 防护设置', '🚧 JAV Speed Bump · Settings');
  $('pageSub').textContent = t(
    '新增防护立即生效 · 解除任何防护均需等待 24 小时冷静期，或当场完成三组难题',
    'Adding protection takes effect immediately · Removing any protection requires a 24h cooldown or solving 3 puzzles',
  );
  $('statsBtn').textContent = t('📊 数据统计', '📊 Statistics');
  $('pendingTitle').textContent = t('⏳ 冷静期解锁队列', '⏳ Cooldown Queue');
  $('pendingBadge').textContent = t('倒计时期间防护依然有效', 'Protection remains active during countdown');

  $('domainTitle').textContent = t('🌐 屏蔽网站', '🌐 Blocked Websites');
  $('domainDesc').innerHTML = t(
    '输入主域名即可（如 <code>example.com</code>），子域名会自动一并拦截。',
    'Enter a root domain (e.g. <code>example.com</code>); all subdomains are covered automatically.',
  );
  $('domainInput').placeholder = t('输入要屏蔽的域名，如 example.com', 'Enter domain, e.g. example.com');
  $('domainAdd').textContent = t('添加网站', 'Add Site');
  $('domainFilter').placeholder = t('搜索已生效的网站规则...', 'Search blocked domains...');

  $('kwTitle').textContent = t('🔍 搜索关键词拦截', '🔍 Blocked Search Keywords');
  $('kwDesc').textContent = t(
    '在主流搜索引擎与视频社交平台搜索时触发；多个词用空格分隔表示同时出现。',
    'Intercepts matching searches across major search engines and video platforms. Space-separated words match together.',
  );
  $('kwInput').placeholder = t('输入要拦截的搜索关键词', 'Enter search keyword to block');
  $('kwAdd').textContent = t('添加关键词', 'Add Keyword');
  $('kwFilter').placeholder = t('搜索已生效的关键词规则...', 'Search blocked keywords...');

  $('steamTitle').textContent = t('🎮 屏蔽 Steam', '🎮 Steam Protection');

  $('lockTitle').textContent = t('🔒 防卸载保护', '🔒 Anti-Uninstall Lock');
  $('downloadLock').textContent = t('📥 下载防卸载上锁工具', '📥 Download Lock Tool');
  $('lockDesc').textContent = t(
    '开启后，浏览器扩展管理页中的「停用」与「移除」按钮将变灰锁定。',
    'Locks the "Disable" and "Remove" buttons on the browser extensions page so you cannot remove the extension on impulse.',
  );
  renderLock();
}

async function load() {
  await applyDueRemovals();
  settings = await getSettings();
  render();
}

function isPending(type, v) {
  const norm = type === 'keyword' ? normalizeKeyword(v) : v;
  return settings.pendingRemovals.find((p) => {
    if (p.type !== type) return false;
    if (type === 'steam') return true;
    return type === 'keyword' ? normalizeKeyword(p.value) === norm : p.value === norm;
  });
}

function itemRow(type, v) {
  const p = isPending(type, v);
  return h('div', { class: 'item' },
    h('span', { class: 'v' }, type === 'domain' && DEFAULT_DOMAINS.tld.includes(v) ? `*.${v}` : v),
    p
      ? h('span', { class: 'tag amber' }, t(`${formatDuration(p.effectiveAt - Date.now())}后移除`, `Removes in ${formatDuration(p.effectiveAt - Date.now())}`))
      : h('button', { class: 'danger', onclick: () => askRemove(type, v) }, t('移除', 'Remove')));
}

function renderDomains() {
  const q = $('domainFilter').value.trim().toLowerCase();
  const removed = new Set(settings.removedDomains);
  const custom = settings.customDomains.filter((d) => !removed.has(d) && !ALL_DEFAULT_DOMAINS.includes(d));
  let total = custom.length;
  for (const list of Object.values(DEFAULT_DOMAINS)) {
    for (const d of list) if (!removed.has(d)) total++;
  }

  $('domainCountLabel').textContent = t(
    `已生效网站规则 (${total})`,
    `Active Website Rules (${total})`,
  );
  $('domainToggleBtn').textContent = showDomainDrawer
    ? t('收起规则库', 'Hide Rules')
    : t('查看规则库', 'View Rules');
  $('domainDrawerBody').hidden = !showDomainDrawer;

  if (!showDomainDrawer) return;

  const groups = [['custom', custom], ...Object.entries(DEFAULT_DOMAINS)];
  const out = [];
  for (const [g, list] of groups) {
    const items = list.filter((d) => !removed.has(d) && (!q || d.includes(q)));
    if (!items.length) continue;
    out.push(
      h('div', { class: 'group' }, `${groupLabel(g)} (${items.length})`),
      ...items.map((d) => itemRow('domain', d)),
    );
  }
  if (!out.length) {
    out.push(h('div', { class: 'item muted small' }, t('没有匹配的网站规则', 'No matching domain rules')));
  }
  $('domainList').replaceChildren(...out);
}

function renderKeywords() {
  const q = $('kwFilter').value.trim().toLowerCase();
  const removed = new Set(settings.removedKeywords.map(normalizeKeyword).filter(Boolean));
  const defSet = new Set(DEFAULT_KEYWORDS);
  const custom = [...new Set(settings.customKeywords.map(normalizeKeyword).filter(Boolean))]
    .filter((k) => !removed.has(k) && !defSet.has(k));
  const defs = DEFAULT_KEYWORDS.filter((k) => !removed.has(k));
  const total = custom.length + defs.length;

  $('kwCountLabel').textContent = t(
    `已生效关键词规则 (${total})`,
    `Active Keyword Rules (${total})`,
  );
  $('kwToggleBtn').textContent = showKwDrawer
    ? t('收起规则库', 'Hide Rules')
    : t('查看规则库', 'View Rules');
  $('kwDrawerBody').hidden = !showKwDrawer;

  if (!showKwDrawer) return;

  const matchedCustom = custom.filter((k) => !q || k.toLowerCase().includes(q));
  const matchedDefs = defs.filter((k) => !q || k.toLowerCase().includes(q));
  const out = [];

  if (matchedCustom.length) {
    out.push(
      h('div', { class: 'group' }, `${t('我添加的关键词', 'My Custom Keywords')} (${matchedCustom.length})`),
      ...matchedCustom.map((k) => itemRow('keyword', k)),
    );
  }
  if (matchedDefs.length) {
    out.push(
      h('div', { class: 'group' }, `${t('内置规则 · 敏感搜索词', 'Built-in · Keywords')} (${matchedDefs.length})`),
      ...matchedDefs.map((k) => itemRow('keyword', k)),
    );
  }
  if (!out.length) {
    out.push(h('div', { class: 'item muted small' }, t('没有匹配的关键词规则', 'No matching keyword rules')));
  }
  $('kwList').replaceChildren(...out);
}

function renderSteam() {
  const panel = $('steamPanel');
  const badge = $('steamBadge');
  const actions = $('steamActions');
  const modesEl = $('steamModes');
  const p = isPending('steam');
  const mode = settings.steamMode || 'off';
  const active = mode !== 'off';

  panel.classList.toggle('active', active);

  if (mode === 'full') {
    badge.className = 'tag green';
    badge.textContent = t('已开启 · 全面封锁', 'Active · Full Block');
  } else if (mode === 'download') {
    badge.className = 'tag green';
    badge.textContent = t('已开启 · 仅拦截客户端下载', 'Active · Block Download Only');
  } else {
    badge.className = 'tag';
    badge.textContent = t('未启用', 'Off');
  }

  actions.replaceChildren();
  if (active) {
    if (p) {
      actions.append(
        h('span', { class: 'tag amber' }, t(
          `${formatDuration(p.effectiveAt - Date.now())}后关闭`,
          `Turns off in ${formatDuration(p.effectiveAt - Date.now())}`,
        )),
        h('button', {
          class: 'primary',
          onclick: async () => { await cancelRemoval(p.id); await load(); },
        }, t('取消关闭，继续保持', 'Keep Protected')),
      );
    } else {
      actions.append(
        h('button', {
          class: 'danger',
          onclick: () => askRemove('steam', 'Steam'),
        }, t('申请关闭 Steam 封锁', 'Turn Off Steam Protection')),
      );
    }
  }

  const dlBox = h('div', { class: 'mode-box' + (mode === 'download' ? ' current' : '') },
    h('div', {},
      h('div', { class: 'mode-hd' },
        h('b', {}, t('🟡 轻量级 · 仅拦截客户端下载', '🟡 Light · Block Client Download Only')),
        mode === 'download'
          ? h('span', { class: 'tag green' }, t('✓ 当前生效', '✓ Active'))
          : (mode === 'off'
            ? h('button', {
              class: 'primary',
              onclick: async () => { await setSteamMode('download'); await load(); },
            }, t('开启此档位', 'Enable'))
            : null)),
      h('p', { class: 'mode-desc' }, t(
        '正常搜索 Steam、正常逛商店与社区；仅在点进客户端安装页或下载安装包时触发解题减速带，防止卸载客户端后冲动重装。',
        'Allows searching Steam and browsing store/community normally; only intercepts the Steam client download page and installers.',
      ))),
  );

  const fullBox = h('div', { class: 'mode-box' + (mode === 'full' ? ' current' : '') },
    h('div', {},
      h('div', { class: 'mode-hd' },
        h('b', {}, t('🔴 严格级 · 全面封锁 Steam', '🔴 Strict · Block Entire Steam')),
        mode === 'full'
          ? h('span', { class: 'tag green' }, t('✓ 当前生效', '✓ Active'))
          : h('button', {
            class: mode === 'download' ? 'primary' : '',
            onclick: async () => { await setSteamMode('full'); await load(); },
          }, mode === 'download' ? t('升级为全面封锁', 'Upgrade to Full Block') : t('开启此档位', 'Enable'))),
      h('p', { class: 'mode-desc' }, t(
        '全面拦截 Steam 商店、社区、客户端下载节点，以及各大搜索引擎中的 Steam 相关搜索词。',
        'Blocks all Steam store pages, community forums, download servers, and Steam search queries.',
      ))),
  );

  modesEl.replaceChildren(dlBox, fullBox);
}

function renderLock() {
  const isMac = activeLockOs === 'mac';
  $('lockOsTabs').replaceChildren(
    h('button', {
      class: !isMac ? 'active' : '',
      onclick: () => { activeLockOs = 'win'; renderLock(); },
    }, '🪟 Windows'),
    h('button', {
      class: isMac ? 'active' : '',
      onclick: () => { activeLockOs = 'mac'; renderLock(); },
    }, '🍎 macOS'),
  );

  if (!isMac) {
    $('lockSteps').replaceChildren(
      h('div', { class: 'lock-step' },
        h('b', {}, t('第 1 步 · 点击下载', 'Step 1 · Download')),
        h('span', {}, t('点击右上角「下载防卸载上锁工具」按钮', 'Click "Download Lock Tool" at the top right'))),
      h('div', { class: 'lock-step' },
        h('b', {}, t('第 2 步 · 打开并运行', 'Step 2 · Open & Run')),
        h('span', {}, t('在下载栏点击「打开」，在弹窗中依次点击「运行」→「是」（注：本地生成的脚本未绑定付费商业证书，提示“未知发布者”属正常现象）', 'Click "Open" in your browser download bar, then click "Run" → "Yes" (local script has no commercial certificate, so "Unknown Publisher" is normal)'))),
      h('div', { class: 'lock-step' },
        h('b', {}, t('第 3 步 · 重启生效', 'Step 3 · Restart Browser')),
        h('span', {}, t('完全关闭并重启浏览器，即可完成防卸载锁定', 'Restart Chrome completely to activate the lock'))),
    );
    $('lockUn').textContent = t(
      '如何解除锁定（Windows）：按 Win + I 打开系统「设置 → 应用 → 已安装的应用」，搜索「JAV Speed Bump Policy Lock」点击卸载，重启浏览器即可恢复。',
      'How to unlock (Windows): Open Windows "Settings → Apps → Installed apps", search for "JAV Speed Bump Policy Lock", click Uninstall, and restart Chrome.',
    );
  } else {
    $('lockSteps').replaceChildren(
      h('div', { class: 'lock-step' },
        h('b', {}, t('第 1 步 · 点击下载', 'Step 1 · Download')),
        h('span', {}, t('点击右上角「下载防卸载上锁工具」按钮', 'Click "Download Lock Tool" at the top right'))),
      h('div', { class: 'lock-step' },
        h('b', {}, t('第 2 步 · 打开并安装', 'Step 2 · Open & Install')),
        h('span', {}, t('在下载栏点「打开」，随后进入 Mac「系统设置 → 通用 → 设备管理」，双击 JAV Speed Bump Policy Lock 点击「安装」并验证密码', 'Click "Open" in downloads, then go to macOS "System Settings → General → Device Management", double-click "JAV Speed Bump Policy Lock" to Install'))),
      h('div', { class: 'lock-step' },
        h('b', {}, t('第 3 步 · 重启生效', 'Step 3 · Restart Browser')),
        h('span', {}, t('按 Cmd + Q 完全退出并重新打开浏览器，即可完成防卸载锁定', 'Press Cmd + Q to quit and reopen Chrome to activate the lock'))),
    );
    $('lockUn').textContent = t(
      '如何解除锁定（macOS）：打开 Mac「系统设置 → 通用 → 设备管理」，选中「JAV Speed Bump Policy Lock」点击左下角「-」（移除）并输入密码，重启浏览器即可恢复。',
      'How to unlock (macOS): Open macOS "System Settings → General → Device Management", select "JAV Speed Bump Policy Lock", click "-" to remove, and restart Chrome.',
    );
  }
}

function renderPending() {
  const list = settings.pendingRemovals;
  $('pendingPanel').hidden = !list.length;
  $('pending').replaceChildren(...list.map((p) => {
    const label = p.type === 'steam'
      ? t('🎮 Steam 专项封锁', '🎮 Steam Protection')
      : `${p.type === 'domain' ? t('网站', 'Site') : t('关键词', 'Keyword')}「${p.value}」`;
    const actionVerb = p.type === 'steam' ? t('关闭', 'turn off') : t('移除', 'remove');
    return h('div', { class: 'pending-item' },
      h('div', { class: 'pending-info' },
        h('b', {}, label),
        h('span', { class: 'tag amber' }, t(
          `还剩 ${formatDuration(p.effectiveAt - Date.now())}自动${actionVerb}`,
          `${formatDuration(p.effectiveAt - Date.now())} left to ${actionVerb}`,
        ))),
      h('div', { class: 'pending-btns' },
        h('button', { onclick: () => unlockNow(p) }, t(`现在做题，立即${actionVerb}`, 'Solve Puzzles Now')),
        h('button', {
          class: 'primary',
          onclick: async () => { await cancelRemoval(p.id); await load(); },
        }, t('取消申请，继续封锁', 'Keep Protected'))));
  }));
}

function render() {
  renderPending();
  renderDomains();
  renderKeywords();
  renderSteam();
}

function unlockNow(p) {
  location.href = chrome.runtime.getURL(`src/pages/gate.html?mode=unlock&pid=${encodeURIComponent(p.id)}`);
}

function askRemove(type, value) {
  const bg = h('div', { class: 'modal-bg' });
  const close = () => bg.remove();
  const isSteam = type === 'steam';
  const titleText = isSteam
    ? t('确认要关闭「Steam 封锁」？', 'Turn off Steam Protection?')
    : t(`确认要移除「${value}」？`, `Remove "${value}"?`);
  const descText = t(
    '解除防护需等待 24 小时冷静期，或当场完成三组高难度题。如果只是此刻有点无聊，不妨先去喝杯水。',
    'Removing protection requires a 24h cooldown or solving 3 hard puzzles right now. If this is just a passing urge, grab a glass of water first.',
  );
  const waitBtnText = isSteam ? t('24 小时后自动关闭', 'Turn Off in 24 Hours') : t('24 小时后移除', 'Remove in 24 Hours');
  const nowBtnText = isSteam ? t('现在做三组题，立即关闭', 'Solve 3 Puzzles Now') : t('现在做三组题，立即移除', 'Solve 3 Puzzles Now');
  const keepBtnText = t('继续保持防护', 'Keep Protected');

  bg.append(h('div', { class: 'modal' },
    h('h2', { style: 'margin-top:0' }, titleText),
    h('p', { class: 'muted' }, descText),
    h('div', { class: 'row', style: 'margin-top:18px' },
      h('button', { onclick: async () => { await requestRemoval(type, value); close(); await load(); } }, waitBtnText),
      h('button', { onclick: async () => { const p = await requestRemoval(type, value); unlockNow(p); } }, nowBtnText),
      h('span', { class: 'spacer' }),
      h('button', { class: 'primary', onclick: close }, keepBtnText))));
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  document.body.append(bg);
}

async function add(type) {
  const input = type === 'domain' ? $('domainInput') : $('kwInput');
  const msg = type === 'domain' ? $('domainMsg') : $('kwMsg');
  const raw = input.value;
  if (type === 'domain') {
    const check = validateDomainInput(raw);
    if (!check.ok) {
      msg.className = 'msg err';
      msg.textContent = check.reason === 'no_dot'
        ? t(
          '请输入包含后缀的完整域名（如 example.com）；若想按词拦截搜索，请添加到下方「搜索关键词拦截」',
          'Enter a full domain with suffix (e.g. example.com). To block search terms, add them under Blocked Search Keywords below.',
        )
        : t('域名格式不正确，请输入如 example.com 的有效域名', 'Invalid domain format (e.g. example.com)');
      return;
    }
    const d = check.domain;
    if (ALL_DEFAULT_DOMAINS.includes(d) && !settings.removedDomains.includes(d)) {
      msg.className = 'msg ok';
      msg.textContent = t(`✓ 「${d}」已在内置规则库中生效，无需重复添加`, `✓ "${d}" is already active in the built-in rules`);
      input.value = '';
      return;
    }
  } else {
    const k = normalizeKeyword(raw);
    const removedK = new Set(settings.removedKeywords.map(normalizeKeyword).filter(Boolean));
    const customK = new Set(settings.customKeywords.map(normalizeKeyword).filter(Boolean));
    if (k && DEFAULT_KEYWORDS.includes(k) && !removedK.has(k)) {
      msg.className = 'msg ok';
      msg.textContent = t(`✓ 「${k}」已在内置规则库中生效，无需重复添加`, `✓ "${k}" is already active in the built-in rules`);
      input.value = '';
      return;
    }
    if (k && customK.has(k) && !removedK.has(k)) {
      msg.className = 'msg ok';
      msg.textContent = t(`✓ 「${k}」已在自定义规则中生效，无需重复添加`, `✓ "${k}" is already active in your custom rules`);
      input.value = '';
      return;
    }
  }
  const r = await addItem(type, raw);
  msg.className = r.ok ? 'msg ok' : 'msg err';
  msg.textContent = r.ok
    ? t(`✓ 已添加「${r.value}」，防护立即生效`, `✓ Added "${r.value}" (active immediately)`)
    : t('输入内容为空或格式不正确', 'Empty or invalid input');
  if (r.ok) input.value = '';
  await load();
}

$('langBtn').addEventListener('click', toggleLang);
onLangChange(() => {
  applyStaticI18n();
  if (settings) render();
});

$('domainAdd').addEventListener('click', () => add('domain'));
$('kwAdd').addEventListener('click', () => add('keyword'));
$('domainInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') add('domain'); });
$('kwInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') add('keyword'); });

$('domainToggleBtn').addEventListener('click', () => {
  showDomainDrawer = !showDomainDrawer;
  renderDomains();
});
$('kwToggleBtn').addEventListener('click', () => {
  showKwDrawer = !showKwDrawer;
  renderKeywords();
});
$('domainFilter').addEventListener('input', renderDomains);
$('kwFilter').addEventListener('input', renderKeywords);

$('downloadLock').addEventListener('click', () => {
  const isMac = activeLockOs === 'mac';
  const content = isMac ? buildLockMobileConfig() : buildLockBat();
  const mime = isMac ? 'application/x-apple-aspen-config;charset=utf-8' : 'application/x-bat;charset=utf-8';
  const filename = isMac ? 'JAV-Speed-Bump-Lock.mobileconfig' : 'JAV-Speed-Bump-Lock.bat';
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  h('a', { href: url, download: filename }).click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  const notice = $('lockMsg');
  notice.hidden = false;
  notice.textContent = isMac
    ? t(
      '✓ 上锁工具已下载！请在下载栏点「打开」，然后进入 Mac「系统设置 → 通用 → 设备管理」双击安装，最后按 Cmd + Q 重启浏览器生效。',
      '✓ Lock tool downloaded! Click "Open" in downloads, then go to macOS "System Settings → General → Device Management" to install it, and restart Chrome (Cmd + Q).',
    )
    : t(
      '✓ 上锁工具已下载！请点击浏览器右上角下载栏中的「打开」，在系统弹窗中依次点击「运行」→「是」（注：本地生成的脚本未绑定付费商业证书，提示“未知发布者”属正常现象），重启浏览器即可生效。',
      '✓ Lock tool downloaded! Click "Open" in your browser download bar, then click "Run" → "Yes" (local script has no commercial certificate, so "Unknown Publisher" is normal), and restart Chrome.',
    );
});

applyStaticI18n();

const sp = new URLSearchParams(location.search);
if (sp.get('unlocked')) {
  $('banner').replaceChildren(h('div', { class: 'panel msg ok' },
    t(`✓ 已解除封锁：「${sp.get('unlocked')}」`, `✓ Unlocked: "${sp.get('unlocked')}"`)));
}
if (sp.get('welcome')) {
  $('banner').replaceChildren(h('div', { class: 'panel' },
    h('b', {}, t('✓ 色情减速带已就绪 · ', '✓ JAV Speed Bump is active · ')),
    t(
      '默认规则库已开始生效。你可在下方按需开启「屏蔽 Steam」，或下载「防卸载上锁工具」锁定插件。',
      'Default blocklists are now active. You can enable Steam protection or download the Anti-Uninstall Lock tool below.',
    )));
}

chrome.storage.onChanged.addListener((c) => { if (c.settings) load(); });
load();
setInterval(async () => {
  if (!settings?.pendingRemovals.length) return;
  const applied = await applyDueRemovals();
  if (applied > 0) await load();
  else render();
}, 60000);
