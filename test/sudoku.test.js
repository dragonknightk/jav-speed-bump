import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSudoku, countSolutions, isValidSolution, solve, conflicts } from '../src/puzzles/sudoku.js';

test('生成的数独：答案合法、题目与答案一致、唯一解', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const givens = 10 + (seed % 9);
    const { puzzle, solution, givens: g } = generateSudoku({ givens, seed });
    assert.ok(isValidSolution(solution), `seed ${seed} 答案不合法`);
    puzzle.forEach((v, i) => { if (v) assert.equal(v, solution[i]); });
    assert.equal(puzzle.filter(Boolean).length, g);
    assert.ok(g <= givens + 3, `seed ${seed}: 目标 ${givens} 实际 ${g}`);
    assert.equal(countSolutions(puzzle, 3), 1, `seed ${seed} 不是唯一解`);
    assert.deepEqual(solve(puzzle), solution);
  }
});

test('同一个种子生成相同题目，不同种子不同', () => {
  assert.deepEqual(generateSudoku({ seed: 42 }), generateSudoku({ seed: 42 }));
  assert.notDeepEqual(generateSudoku({ seed: 1 }).puzzle, generateSudoku({ seed: 2 }).puzzle);
});

test('isValidSolution / conflicts 能识别错误', () => {
  const { solution } = generateSudoku({ seed: 7 });
  const bad = solution.slice();
  [bad[0], bad[1]] = [bad[1], bad[0]];
  assert.equal(isValidSolution(bad), false);
  const partial = new Array(36).fill(0);
  partial[0] = 3; partial[5] = 3; // 同一行
  assert.deepEqual(conflicts(partial).sort((a, b) => a - b), [0, 5]);
  partial[5] = 0; partial[7] = 3; // 同一宫（第二行第二列）
  assert.deepEqual(conflicts(partial).sort((a, b) => a - b), [0, 7]);
});

test('空盘有多解', () => {
  assert.equal(countSolutions(new Array(36).fill(0), 2), 2);
});
