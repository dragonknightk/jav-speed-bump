import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineClue, cluesOf, solveLine, logicSolve, matchesClues, generateNonogram } from '../src/puzzles/nonogram.js';

test('lineClue 计算正确', () => {
  assert.deepEqual(lineClue([0, 0, 0]), [0]);
  assert.deepEqual(lineClue([1, 1, 0, 1, 0, 0, 1, 1, 1]), [2, 1, 3]);
  assert.deepEqual(lineClue([1, 1, 1, 1]), [4]);
  assert.deepEqual(lineClue([0, 1, 0, 1]), [1, 1]);
});

test('cluesOf 行列提示', () => {
  const g = [[1, 0, 1], [1, 1, 1], [0, 0, 1]];
  assert.deepEqual(cluesOf(g).rows, [[1, 1], [3], [1]]);
  assert.deepEqual(cluesOf(g).cols, [[2], [1], [3]]);
});

test('solveLine 基本推理', () => {
  assert.deepEqual(solveLine([3], [-1, -1, -1, -1]), [-1, 1, 1, -1]);
  assert.deepEqual(solveLine([1, 1], [-1, -1, -1]), [1, 0, 1]);
  assert.deepEqual(solveLine([0], [-1, -1]), [0, 0]);
  assert.equal(solveLine([3], [-1, 0, -1, -1]), null); // 放不下
  assert.deepEqual(solveLine([2], [-1, 0, -1, -1]), [0, 0, 1, 1]);
  assert.equal(solveLine([4], [-1, -1, -1]), null);
});

test('生成的数织：提示与答案一致、可纯逻辑解出且解唯一', () => {
  for (const size of [10, 11, 12]) {
    for (let seed = 1; seed <= 20; seed++) {
      const p = generateNonogram({ size, seed });
      assert.equal(p.rows.length, size);
      assert.equal(p.cols.length, size);
      const c = cluesOf(p.solution);
      assert.deepEqual(c.rows, p.rows);
      assert.deepEqual(c.cols, p.cols);
      const res = logicSolve(p);
      assert.ok(res.solved);
      assert.deepEqual(res.grid, p.solution);
      assert.ok(matchesClues(p.solution, p));
      // 每行每列至少一个黑格
      assert.ok(p.rows.every((r) => r[0] > 0) && p.cols.every((r) => r[0] > 0));
    }
  }
});

test('matchesClues 拒绝错误盘面', () => {
  const p = generateNonogram({ size: 8, seed: 3 });
  const g = p.solution.map((r) => r.slice());
  g[0][0] = 1 - g[0][0];
  assert.equal(matchesClues(g, p), false);
});
