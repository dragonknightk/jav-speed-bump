import { h, flash } from './h.js';
import { t, onLangChange } from '../../lib/i18n.js';
import { generateArithmetic, checkAnswer, COUNT } from '../../puzzles/arithmetic.js';

export const getTitle = () => t('心算', 'Mental Math');
export const title = '心算';
export const getRule = () => t(
  `连续答对 ${COUNT} 道口算题即可过关`,
  `Answer ${COUNT} mental math problems in a row without mistakes`,
);
export const getKeys = () => [
  [t('答错惩罚', 'Mistake Rule'), t('进度清零并更换整组新题', 'Resets progress with a new set')],
  ['Enter', t('快速提交答案', 'Submit answer')],
];

export function mount(root, params, onDone) {
  let problems, k;
  let lastWrong = null;
  let msgState = '';
  let finished = false;
  let doneTimer = null;
  const q = h('div', { class: 'arith-q' });
  const bar = h('div', { class: 'progress' });
  const input = h('input', { inputmode: 'numeric', autocomplete: 'off', placeholder: t('输入结果', 'Answer') });
  const msg = h('div', { class: 'msg' });
  const submit = h('button', { class: 'primary', onclick: () => answer() }, t('提交答案', 'Submit'));

  function updateMsgText() {
    if (msgState === 'ok') {
      msg.textContent = t(`✓ 已完成第 ${k} / ${COUNT} 题`, `✓ Solved ${k} / ${COUNT}`);
    } else if (msgState === 'err' && lastWrong) {
      msg.textContent = t(
        `✗ ${lastWrong.text} = ${lastWrong.answer}，本组已重新开始`,
        `✗ ${lastWrong.text} = ${lastWrong.answer} — Resetting this round`,
      );
    }
  }

  function reset() {
    problems = generateArithmetic(params);
    k = 0;
    render();
  }
  function render() {
    bar.replaceChildren(...problems.map((_, i) => h('span', { class: i < k ? 'done' : '' })));
    q.textContent = `${problems[k].text} = ?`;
    input.value = '';
    input.focus();
  }
  function answer() {
    if (finished) return;
    if (!input.value.trim()) return;
    const p = problems[k];
    if (checkAnswer(p, input.value)) {
      k++;
      msg.className = 'msg ok';
      msgState = 'ok';
      updateMsgText();
      if (k === COUNT) {
        finished = true;
        q.textContent = t('全部答对', 'All Correct');
        input.disabled = true;
        submit.disabled = true;
        doneTimer = setTimeout(onDone, 500);
        return;
      }
      render();
    } else {
      msg.className = 'msg err';
      lastWrong = p;
      msgState = 'err';
      updateMsgText();
      flash(q);
      reset();
    }
  }

  const offLang = onLangChange(() => {
    input.placeholder = t('输入结果', 'Answer');
    submit.textContent = t('提交答案', 'Submit');
    if (k === COUNT) q.textContent = t('全部答对', 'All Correct');
    updateMsgText();
  });

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') answer(); });
  root.append(h('div', { class: 'puzzle arith' }, bar, q, h('div', { class: 'row' }, input, submit), msg));
  reset();
  return () => {
    offLang();
    clearTimeout(doneTimer);
  };
}
