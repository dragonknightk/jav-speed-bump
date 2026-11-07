// 轻量级中英双语切换模块（默认跟随浏览器语言，支持无刷新原地切换）

const STORAGE_KEY = 'jsb-lang';
const listeners = new Set();

export function getLang() {
  try {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch { /* ignore */ }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }
  return 'zh';
}

export function isEn() {
  return getLang() === 'en';
}

export function setLang(lang) {
  const next = lang === 'en' ? 'en' : 'zh';
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, next);
    if (typeof document !== 'undefined') document.documentElement.lang = next === 'en' ? 'en' : 'zh-CN';
  } catch { /* ignore */ }
  for (const fn of listeners) {
    try { fn(next); } catch { /* ignore */ }
  }
  return next;
}

export function toggleLang() {
  const next = isEn() ? 'zh' : 'en';
  return setLang(next);
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(zh, en) {
  return isEn() ? en : zh;
}
