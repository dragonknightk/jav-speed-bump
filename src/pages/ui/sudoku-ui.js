import { h, flash } from './h.js';
import { t, onLangChange } from '../../lib/i18n.js';
import { generateSudoku, conflicts, SIZE } from '../../puzzles/sudoku.js';

export const getTitle = () => t('6×6 数独', '6×6 Sudoku');
export const title = '6×6 数独';
export const getRule = () => t(
  '每行、每列、每个 2×3 粗线宫内，数字 1–6 各出现一次',
  'Fill every row, column, and 2×3 box with numbers 1–6 without repeats',
);
export const getKeys = () => [
  [t('点击空白格', 'Click Cell'), t('输入数字 1–6', 'Type 1–6')],
  [t('方向键', 'Arrow Keys'), t('切换相邻格子', 'Move focus')],
  ['Backspace', t('清除当前格', 'Clear cell')],
];

export function mount(root, params, onDone) {
  const { puzzle, solution } = generateSudoku(params);
  const values = puzzle.slice();
  const inputs = [];
  const msg = h('div', { class: 'msg' });
  const grid = h('div', { class: 'sudoku' });
  let msgState = '';
  let finished = false;
  let doneTimer = null;

  for (let i = 0; i < SIZE * SIZE; i++) {
    const r = Math.floor(i / SIZE), c = i % SIZE;
    const cls = [puzzle[i] ? 'given' : '', c === 2 ? 'c2' : '', r === 1 || r === 3 ? 'r1' : ''].join(' ');
    const inp = h('input', { class: cls, inputmode: 'numeric', 'aria-label': `R${r + 1}C${c + 1}` });
    if (puzzle[i]) { inp.value = puzzle[i]; inp.readOnly = true; inp.tabIndex = -1; }
    const applyValue = () => {
      if (finished) return;
      const v = inp.value.replace(/[^1-6]/g, '').slice(-1);
      inp.value = v;
      values[i] = v ? Number(v) : 0;
      refresh();
    };
    inp.addEventListener('input', (e) => {
      if (e.isComposing) return;
      applyValue();
    });
    inp.addEventListener('compositionend', applyValue);
    inp.addEventListener('keydown', (e) => {
      const moves = { ArrowUp: -SIZE, ArrowDown: SIZE, ArrowLeft: -1, ArrowRight: 1 };
      if (moves[e.key] !== undefined) {
        e.preventDefault();
        let j = i;
        do { j = (j + moves[e.key] + SIZE * SIZE) % (SIZE * SIZE); } while (puzzle[j] && j !== i);
        inputs[j].focus();
      }
    });
    inputs.push(inp);
    grid.append(inp);
  }

  function updateMsgText() {
    if (msgState === 'ok') {
      msg.textContent = t('✓ 解题完成', '✓ Completed');
    } else if (msgState === 'err') {
      msg.textContent = t('尚未正确填完，标红位置存在重复数字', 'Not solved yet—highlighted cells have duplicate numbers');
    } else {
      msg.textContent = '';
    }
  }

  function refresh() {
    if (finished) return;
    const bad = new Set(conflicts(values));
    inputs.forEach((inp, i) => inp.classList.toggle('bad', bad.has(i) && !puzzle[i]));
    if (values.every((v) => v)) {
      if (values.every((v, i) => v === solution[i])) {
        finished = true;
        inputs.forEach((x) => { x.disabled = true; });
        msg.className = 'msg ok';
        msgState = 'ok';
        updateMsgText();
        doneTimer = setTimeout(onDone, 500);
      } else {
        msg.className = 'msg err';
        msgState = 'err';
        updateMsgText();
        flash(grid);
      }
    } else {
      msgState = '';
      updateMsgText();
    }
  }

  const offLang = onLangChange(() => updateMsgText());
  root.append(h('div', { class: 'puzzle' }, grid, msg));
  const focusTimer = setTimeout(() => { if (!finished) inputs.find((x, i) => !puzzle[i])?.focus(); }, 50);
  return () => {
    offLang();
    clearTimeout(doneTimer);
    clearTimeout(focusTimer);
  };
}
