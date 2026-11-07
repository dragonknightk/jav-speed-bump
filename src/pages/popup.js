import { getLogs } from '../lib/storage.js';
import { streaks, summary } from '../lib/stats.js';
import { formatDuration } from '../lib/time.js';
import { t, isEn } from '../lib/i18n.js';

document.documentElement.lang = isEn() ? 'en' : 'zh-CN';

const [logsRaw, { installedAt }] = await Promise.all([
  getLogs(),
  chrome.storage.local.get('installedAt'),
]);
const logs = logsRaw.filter((l) => !l.unlock);
const now = Date.now();
const sm = summary(logs, now);

document.getElementById('title').textContent = t('🚧 累计战胜冲动', '🚧 Urges Overcome');
document.getElementById('wins').textContent = t(`${sm.total} 次`, `${sm.total}`);
document.getElementById('extra').textContent = t(
  `连续未触发 ${formatDuration(streaks(logs, now, installedAt ?? logs[0]?.ts ?? now).current)} · 今日 ${sm.today} 次`,
  `Streak ${formatDuration(streaks(logs, now, installedAt ?? logs[0]?.ts ?? now).current)} · Today ${sm.today}`,
);
document.getElementById('statsBtn').textContent = t('📊 数据统计', '📊 Stats');
document.getElementById('optBtn').textContent = t('⚙️ 防护设置', '⚙️ Settings');
