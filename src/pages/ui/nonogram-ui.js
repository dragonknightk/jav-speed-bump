import { h } from './h.js';
import { t, onLangChange } from '../../lib/i18n.js';
import { generateNonogram, matchesClues, lineClue } from '../../puzzles/nonogram.js';

export const getTitle = () => t('数织', 'Nonogram');
export const title = '数织';
export const getRule = () => t(
  '行列数字代表连续涂黑的格数，多组数字之间至少空一格',
  'Numbers show lengths of consecutive filled blocks in each row/column (at least 1 empty cell between blocks)',
);
export const getKeys = () => [
  [t('左键', 'Left Click'), t('涂黑格子', 'Fill cell')],
  [t('右键 / Shift+左键', 'Right / Shift+Click'), t('标记空白 ×', 'Mark empty ×')],
];

export function mount(root, params, onDone) {
  const puz = generateNonogram(params);
  const n = puz.size;
  const state = Array.from({ length: n }, () => new Array(n).fill(0));
  const cells = [];
  let painting = null;
  let finished = false;
  let doneTimer = null;
  const table = h('table', { class: 'nono' });
  const head = h('tr', {}, h('td'));
  const colEls = puz.cols.map((cl) => {
    const td = h('td', { class: 'cc' }, ...cl.flatMap((v, i) => (i ? [h('br'), String(v)] : [String(v)])));
    head.append(td);
    return td;
  });
  table.append(head);
  const rowEls = [];
  for (let r = 0; r < n; r++) {
    const tr = h('tr');
    const rc = h('td', { class: 'rc', text: puz.rows[r].join('  ') });
    rowEls.push(rc);
    tr.append(rc);
    cells.push([]);
    for (let c = 0; c < n; c++) {
      const cls = ['cell', c % 5 === 4 && c !== n - 1 ? 'b5' : '', r % 5 === 4 && r !== n - 1 ? 'r5' : ''].join(' ');
      const td = h('td', { class: cls });
      td.addEventListener('mousedown', (e) => {
        if (finished || (e.button !== 0 && e.button !== 2)) return;
        e.preventDefault();
        const mark = e.button === 2 || e.shiftKey ? 2 : 1;
        painting = state[r][c] === mark ? 0 : mark;
        set(r, c, painting);
      });
      td.addEventListener('mouseenter', (e) => {
        if (painting === null) return;
        if (e.buttons === 0) { onUp(); return; }
        set(r, c, painting);
      });
      td.addEventListener('contextmenu', (e) => e.preventDefault());
      cells[r].push(td);
      tr.append(td);
    }
    table.append(tr);
  }
  const onUp = () => { if (painting !== null) { painting = null; check(); } };
  window.addEventListener('mouseup', onUp);
  window.addEventListener('blur', onUp);

  function set(r, c, v) {
    if (finished) return;
    state[r][c] = v;
    cells[r][c].classList.toggle('on', v === 1);
    cells[r][c].classList.toggle('x', v === 2);
    const eq = (a, b) => a.join() === b.join();
    rowEls[r].classList.toggle('ok', eq(lineClue(state[r].map((x) => x === 1)), puz.rows[r]));
    colEls[c].classList.toggle('ok', eq(lineClue(state.map((row) => row[c] === 1)), puz.cols[c]));
  }
  const msg = h('div', { class: 'msg' });
  function check() {
    if (finished) return;
    if (matchesClues(state.map((row) => row.map((x) => (x === 1 ? 1 : 0))), puz)) {
      finished = true;
      clear.disabled = true;
      msg.className = 'msg ok';
      msg.textContent = t('✓ 解题完成', '✓ Completed');
      doneTimer = setTimeout(onDone, 600);
    }
  }
  const clear = h('button', {
    onclick: () => { if (finished) return; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) set(r, c, 0); },
  }, t('清空棋盘重填', 'Clear Board'));

  const offLang = onLangChange(() => {
    clear.textContent = t('清空棋盘重填', 'Clear Board');
    if (finished) msg.textContent = t('✓ 解题完成', '✓ Completed');
  });

  root.append(h('div', { class: 'puzzle' }, h('div', { class: 'nono-wrap' }, table), msg, clear));
  return () => {
    offLang();
    clearTimeout(doneTimer);
    window.removeEventListener('mouseup', onUp);
    window.removeEventListener('blur', onUp);
  };
}
