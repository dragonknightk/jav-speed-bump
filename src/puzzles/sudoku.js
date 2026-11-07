// 6×6 数独：宫格为 2 行 × 3 列。生成唯一解题目。
import { makeRng } from './rng.js';

export const SIZE = 6;
export const BOX_R = 2;
export const BOX_C = 3;

const idx = (r, c) => r * SIZE + c;

export function candidates(grid, r, c) {
  const used = new Set();
  for (let i = 0; i < SIZE; i++) {
    used.add(grid[idx(r, i)]);
    used.add(grid[idx(i, c)]);
  }
  const br = Math.floor(r / BOX_R) * BOX_R;
  const bc = Math.floor(c / BOX_C) * BOX_C;
  for (let i = 0; i < BOX_R; i++) for (let j = 0; j < BOX_C; j++) used.add(grid[idx(br + i, bc + j)]);
  const out = [];
  for (let v = 1; v <= SIZE; v++) if (!used.has(v)) out.push(v);
  return out;
}

// 统计解的个数（最多数到 limit），0 表示空格
export function countSolutions(grid, limit = 2) {
  const g = grid.slice();
  let count = 0;
  const solve = () => {
    if (count >= limit) return;
    // 选候选数最少的空格
    let best = -1, bestCands = null;
    for (let i = 0; i < g.length; i++) {
      if (g[i] !== 0) continue;
      const cands = candidates(g, Math.floor(i / SIZE), i % SIZE);
      if (cands.length === 0) return;
      if (!bestCands || cands.length < bestCands.length) { best = i; bestCands = cands; }
      if (cands.length === 1) break;
    }
    if (best === -1) { count++; return; }
    for (const v of bestCands) {
      g[best] = v;
      solve();
      if (count >= limit) break;
    }
    g[best] = 0;
  };
  solve();
  return count;
}

export function solve(grid) {
  const g = grid.slice();
  const rec = () => {
    const i = g.indexOf(0);
    if (i === -1) return true;
    for (const v of candidates(g, Math.floor(i / SIZE), i % SIZE)) {
      g[i] = v;
      if (rec()) return true;
    }
    g[i] = 0;
    return false;
  };
  return rec() ? g : null;
}

function fullGrid(rng) {
  const g = new Array(SIZE * SIZE).fill(0);
  const rec = () => {
    const i = g.indexOf(0);
    if (i === -1) return true;
    for (const v of rng.shuffle(candidates(g, Math.floor(i / SIZE), i % SIZE))) {
      g[i] = v;
      if (rec()) return true;
    }
    g[i] = 0;
    return false;
  };
  rec();
  return g;
}

// 检查一个填满的盘面是否合法
export function isValidSolution(grid) {
  if (grid.length !== SIZE * SIZE) return false;
  const ok = (vals) => vals.slice().sort().join('') === '123456';
  for (let r = 0; r < SIZE; r++) {
    if (!ok(grid.slice(r * SIZE, r * SIZE + SIZE))) return false;
  }
  for (let c = 0; c < SIZE; c++) {
    const col = [];
    for (let r = 0; r < SIZE; r++) col.push(grid[idx(r, c)]);
    if (!ok(col)) return false;
  }
  for (let br = 0; br < SIZE; br += BOX_R) for (let bc = 0; bc < SIZE; bc += BOX_C) {
    const box = [];
    for (let i = 0; i < BOX_R; i++) for (let j = 0; j < BOX_C; j++) box.push(grid[idx(br + i, bc + j)]);
    if (!ok(box)) return false;
  }
  return true;
}

// 返回与已填数字冲突的格子下标
export function conflicts(grid) {
  const bad = new Set();
  for (let i = 0; i < grid.length; i++) {
    const v = grid[i];
    if (!v) continue;
    const r = Math.floor(i / SIZE), c = i % SIZE;
    for (let j = 0; j < grid.length; j++) {
      if (j === i || grid[j] !== v) continue;
      const r2 = Math.floor(j / SIZE), c2 = j % SIZE;
      const sameBox = Math.floor(r / BOX_R) === Math.floor(r2 / BOX_R) && Math.floor(c / BOX_C) === Math.floor(c2 / BOX_C);
      if (r === r2 || c === c2 || sameBox) { bad.add(i); bad.add(j); }
    }
  }
  return [...bad];
}

/**
 * 生成题目。givens 越少越难（6×6 唯一解下限约 8 个，这里取 10–18）。
 * @returns {{puzzle:number[], solution:number[], givens:number}}
 */
export function generateSudoku({ givens = 14, seed } = {}) {
  const rng = makeRng(seed);
  const target = Math.max(10, Math.min(24, Math.round(givens)));
  let best = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    const solution = fullGrid(rng);
    const puzzle = solution.slice();
    let filled = SIZE * SIZE;
    for (const i of rng.shuffle([...Array(SIZE * SIZE).keys()])) {
      if (filled <= target) break;
      const keep = puzzle[i];
      puzzle[i] = 0;
      if (countSolutions(puzzle, 2) !== 1) puzzle[i] = keep;
      else filled--;
    }
    if (!best || filled < best.givens) best = { puzzle, solution, givens: filled };
    if (filled <= target) break;
  }
  return best;
}
