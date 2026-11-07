import { h, flash } from './h.js';
import { t, isEn, onLangChange } from '../../lib/i18n.js';
import { generate24, check24 } from '../../puzzles/twentyfour.js';

export const getTitle = () => t('24 点', 'Make 24');
export const title = '24 点';
export const getRule = () => t(
  '将 4 张数字牌各用一次，通过加减乘除与括号凑出 24',
  'Use all 4 numbers exactly once with + − × ÷ and parentheses to make 24',
);
export const getKeys = () => [
  [t('键盘输入', 'Keyboard'), t('支持直接键入算式（可用 * / 代替乘除）', 'Type expression directly (* and / allowed)')],
  [t('鼠标点击', 'Mouse'), t('点击下方数字牌与运算符按钮', 'Click number cards and operator buttons')],
  ['Enter', t('提交算式', 'Submit expression')],
];

function format24Error(rawErr) {
  if (!rawErr || !isEn()) return rawErr || '';
  if (rawErr === '不能除以 0') return 'Cannot divide by 0';
  if (rawErr === '算式不完整') return 'Incomplete expression';
  if (rawErr === '括号不匹配') return 'Mismatched parentheses';
  if (rawErr === '算式格式不对') return 'Invalid expression format';
  const mChar = rawErr.match(/^无法识别的字符:\s*(.+)$/);
  if (mChar) return `Unrecognized character: ${mChar[1]}`;
  const mUse = rawErr.match(/^要用且只用一次:\s*(.+)$/);
  if (mUse) return `Must use each number exactly once: ${mUse[1]}`;
  const mVal = rawErr.match(/^结果是\s*(.+),\s*不是 24$/);
  if (mVal) return `Result is ${mVal[1]}, not 24`;
  return rawErr;
}

export function mount(root, params, onDone) {
  let sets = generate24(params);
  let k = 0;
  let msgState = '';
  let lastRawErr = '';
  const counter = h('div', { class: 'muted' });
  const cards = h('div', { class: 'cards' });
  const input = h('input', {
    class: 'expr',
    autocomplete: 'off',
    placeholder: t('输入算式，例如 (8 − 4) × 6', 'e.g. (8 − 4) × 6'),
  });
  const msg = h('div', { class: 'msg' });
  const ins = (s) => {
    const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
    input.value = input.value.slice(0, a) + s + input.value.slice(b);
    input.focus();
    input.setSelectionRange(a + s.length, a + s.length);
    markUsed();
  };
  const clearBtn = h('button', { onclick: () => { input.value = ''; input.focus(); markUsed(); } }, t('清空', 'Clear'));
  const submitBtn = h('button', { class: 'primary', onclick: () => submit() }, t('提交', 'Submit'));
  const keysBar = h('div', { class: 'keys' },
    ...[['+', ' + '], ['−', ' − '], ['×', ' × '], ['÷', ' ÷ '], ['(', '('], [')', ')']].map(([label, text]) => h('button', { onclick: () => ins(text) }, label)),
    h('button', { onclick: () => { input.value = input.value.replace(/\s*\S\s*$/, ''); input.focus(); markUsed(); } }, '⌫'),
    clearBtn,
    submitBtn,
  );
  const swap = h('button', { class: 'small', onclick: () => {
    const extra = generate24({ ...params, rounds: 2 });
    sets.splice(k, 1, extra[0]);
    sets.push(extra[1]);
    msg.className = 'msg';
    msgState = 'swap';
    msg.textContent = t('已更换当前题目，本组总题数 +1', 'Swapped card set (total rounds +1)');
    render();
  } }, t('换一题（总题数 +1）', 'Swap Hand (+1 Round)'));

  function markUsed() {
    const nums = (input.value.match(/\d+/g) || []).map(Number);
    const pool = nums.slice();
    [...cards.children].forEach((el) => {
      const v = Number(el.dataset.v);
      const j = pool.indexOf(v);
      el.classList.toggle('used', j !== -1);
      if (j !== -1) pool.splice(j, 1);
    });
  }
  function updateCounterText() {
    counter.textContent = t(`当前进度：第 ${k + 1} / ${sets.length} 题`, `Round ${k + 1} / ${sets.length}`);
  }
  function render() {
    updateCounterText();
    cards.replaceChildren(...sets[k].nums.map((v) => h('div', { class: 'card', 'data-v': v, onclick: () => ins(String(v)) }, String(v))));
    input.value = '';
    input.focus();
  }
  function submit() {
    const r = check24(sets[k].nums, input.value);
    if (r.ok) {
      k++;
      msg.className = 'msg ok';
      msgState = 'ok';
      msg.textContent = t('✓ 算式正确', '✓ Correct');
      if (k === sets.length) { input.disabled = true; setTimeout(onDone, 500); return; }
      render();
    } else {
      msg.className = 'msg err';
      msgState = 'err';
      lastRawErr = r.error;
      msg.textContent = format24Error(r.error);
      flash(input);
    }
  }

  const offLang = onLangChange(() => {
    updateCounterText();
    input.placeholder = t('输入算式，例如 (8 − 4) × 6', 'e.g. (8 − 4) × 6');
    clearBtn.textContent = t('清空', 'Clear');
    submitBtn.textContent = t('提交', 'Submit');
    swap.textContent = t('换一题（总题数 +1）', 'Swap Hand (+1 Round)');
    if (msgState === 'ok') msg.textContent = t('✓ 算式正确', '✓ Correct');
    else if (msgState === 'swap') msg.textContent = t('已更换当前题目，本组总题数 +1', 'Swapped card set (total rounds +1)');
    else if (msgState === 'err') msg.textContent = format24Error(lastRawErr);
  });

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  input.addEventListener('input', markUsed);
  root.append(h('div', { class: 'puzzle' }, counter, cards, input, keysBar, msg, h('div', { style: 'margin-top:8px' }, swap)));
  render();
  return () => { offLang(); };
}
