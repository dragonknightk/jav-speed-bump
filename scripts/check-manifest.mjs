// 静态检查 manifest.json 与 _locales：JSON 合法、字段长度符合商店规范、引用的文件都存在
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { ROOT, readManifest } from './files.mjs';

const m = readManifest();
const errors = [];
const need = (p, from = 'manifest') => { if (!existsSync(join(ROOT, p))) errors.push(`${from}: 缺少文件 ${p}`); };
if (m.manifest_version !== 3) errors.push('manifest_version 必须是 3');
if (!/^\d+(\.\d+){0,3}$/.test(m.version)) errors.push('version 格式不对');
Object.values(m.icons || {}).forEach((p) => need(p));
Object.values(m.action?.default_icon || {}).forEach((p) => need(p));
need(m.background.service_worker);
need(m.action.default_popup);
need(m.options_page);
m.web_accessible_resources.forEach((w) => w.resources.forEach((p) => need(p)));

// 检查 _locales 语言包长度限制（Chrome Web Store 硬性要求：extName <= 45, extShortName <= 12, extDesc <= 132）
const localesDir = join(ROOT, '_locales');
if (existsSync(localesDir)) {
  for (const loc of readdirSync(localesDir)) {
    const p = join(localesDir, loc, 'messages.json');
    if (!existsSync(p)) continue;
    const msg = JSON.parse(readFileSync(p, 'utf8'));
    const nameLen = (msg.extName?.message || '').length;
    const shortLen = (msg.extShortName?.message || '').length;
    const descLen = (msg.extDesc?.message || '').length;
    if (!nameLen || nameLen > 45) errors.push(`_locales/${loc}: extName 长度 (${nameLen}) 必须为 1..45`);
    if (!shortLen || shortLen > 12) errors.push(`_locales/${loc}: extShortName 长度 (${shortLen}) 必须为 1..12`);
    if (!descLen || descLen > 132) errors.push(`_locales/${loc}: extDesc 长度 (${descLen}) 必须为 1..132`);
  }
}

// 检查 HTML 引用和 JS import
const seen = new Set();
const checkFile = (rel) => {
  if (seen.has(rel)) return; seen.add(rel);
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) { errors.push(`缺少文件 ${rel}`); return; }
  const src = readFileSync(abs, 'utf8');
  const refs = rel.endsWith('.html')
    ? [...src.matchAll(/(?:src|href)="([^"#?:]+\.(?:js|css|png))"/g)].map((x) => x[1])
    : [...src.matchAll(/(?:import|from)\s*['"](\.[^'"]+)['"]/g)].map((x) => x[1]);
  for (const r of refs) checkFile(join(dirname(rel), r).split('\\').join('/'));
};
['src/pages/gate.html', 'src/pages/blocked.html', 'src/pages/options.html', 'src/pages/stats.html', 'src/pages/popup.html', m.background.service_worker].forEach(checkFile);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`✓ manifest.json 与 _locales 检查通过（检查了 ${seen.size} 个页面/脚本）`);
