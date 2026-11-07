// 数织（Nonogram）：随机生成，并保证仅靠逐行逻辑推理即可解出（因此解唯一）。
import { makeRng } from './rng.js';

export function lineClue(line) {
  const out = [];
  let run = 0;
  for (const v of line) {
    if (v) run++;
    else if (run) { out.push(run); run = 0; }
  }
  if (run) out.push(run);
  return out.length ? out : [0];
}

export function cluesOf(grid) {
  const h = grid.length, w = grid[0].length;
  const rows = grid.map(lineClue);
  const cols = [];
  for (let c = 0; c < w; c++) cols.push(lineClue(grid.map((row) => row[c])));
  return { rows, cols, width: w, height: h };
}

// 单行求解：known 中 1=涂黑, 0=空白, -1=未知。返回推出的新行，矛盾返回 null。
export function solveLine(clue, known) {
  const n = known.length;
  const blocks = clue.length === 1 && clue[0] === 0 ? [] : clue;
  const canBlack = new Array(n).fill(false);
  const canWhite = new Array(n).fill(false);
  const memo = new Map();
  // 能否从位置 pos 开始放置 blocks[b..]
  const fits = (b, pos) => {
    const key = b * (n + 2) + pos;
    if (memo.has(key)) return memo.get(key);
    let res = false;
    if (b === blocks.length) {
      res = true;
      for (let i = pos; i < n; i++) if (known[i] === 1) { res = false; break; }
      if (res) for (let i = pos; i < n; i++) canWhite[i] = true;
    } else {
      const len = blocks[b];
      for (let start = pos; start + len <= n; start++) {
        // start 之前（pos..start-1）都必须可以是白
        let ok = true;
        for (let i = pos; i < start; i++) if (known[i] === 1) { ok = false; break; }
        if (!ok) break; // 再往后只会更糟
        for (let i = start; i < start + len; i++) if (known[i] === 0) { ok = false; break; }
        if (!ok) continue;
        const end = start + len;
        if (end < n && known[end] === 1) continue;
        const nextPos = end < n ? end + 1 : end;
        if (fits(b + 1, nextPos)) {
          res = true;
          for (let i = pos; i < start; i++) canWhite[i] = true;
          for (let i = start; i < end; i++) canBlack[i] = true;
          if (end < n) canWhite[end] = true;
        }
      }
    }
    memo.set(key, res);
    return res;
  };
  if (!fits(0, 0)) return null;
  return known.map((v, i) => {
    if (canBlack[i] && !canWhite[i]) return 1;
    if (canWhite[i] && !canBlack[i]) return 0;
    if (!canBlack[i] && !canWhite[i]) return null;
    return -1;
  });
}

// 逐行逻辑求解；返回 {solved, grid}
export function logicSolve({ rows, cols }) {
  const h = rows.length, w = cols.length;
  const g = Array.from({ length: h }, () => new Array(w).fill(-1));
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < h; r++) {
      const res = solveLine(rows[r], g[r]);
      if (!res || res.includes(null)) return { solved: false, grid: g, contradiction: true };
      for (let c = 0; c < w; c++) if (res[c] !== g[r][c]) { g[r][c] = res[c]; changed = true; }
    }
    for (let c = 0; c < w; c++) {
      const col = g.map((row) => row[c]);
      const res = solveLine(cols[c], col);
      if (!res || res.includes(null)) return { solved: false, grid: g, contradiction: true };
      for (let r = 0; r < h; r++) if (res[r] !== g[r][c]) { g[r][c] = res[r]; changed = true; }
    }
  }
  const solved = g.every((row) => row.every((v) => v !== -1));
  return { solved, grid: g };
}

// 用户的盘面（true/1 = 涂黑）是否满足全部提示
export function matchesClues(grid, { rows, cols }) {
  const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const g = grid.map((row) => row.map((v) => (v === 1 || v === true ? 1 : 0)));
  const c = cluesOf(g);
  return c.rows.every((cl, i) => eq(cl, rows[i])) && c.cols.every((cl, i) => eq(cl, cols[i]));
}

/**
 * @param {{size?:number, density?:number, seed?:number}} opts
 */
export function generateNonogram({ size = 8, density = 0.58, seed } = {}) {
  const rng = makeRng(seed);
  for (let attempt = 0; attempt < 500; attempt++) {
    const grid = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => (rng.next() < density ? 1 : 0)));
    // 避免整行/整列全空，题目更有意思
    const clues = cluesOf(grid);
    if (clues.rows.some((c) => c[0] === 0) || clues.cols.some((c) => c[0] === 0)) continue;
    const res = logicSolve(clues);
    if (res.solved) return { ...clues, solution: grid, size };
  }
  throw new Error('nonogram generation failed');
}
