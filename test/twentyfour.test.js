import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve24, isSolvable, generate24, evaluate, check24 } from '../src/puzzles/twentyfour.js';

test('已知有解/无解的组合', () => {
  assert.ok(isSolvable([4, 6, 1, 1]));
  assert.ok(isSolvable([3, 3, 8, 8])); // 8 ÷ (3 − 8 ÷ 3)
  assert.ok(isSolvable([1, 5, 5, 5])); // 5 × (5 − 1 ÷ 5)
  assert.equal(isSolvable([1, 1, 1, 1]), false);
  assert.equal(isSolvable([1, 1, 1, 2]), false);
  assert.equal(isSolvable([13, 13, 13, 13]), false);
  assert.ok(solve24([3, 3, 8, 8]).needsFraction);
  assert.equal(solve24([4, 6, 1, 1]).needsFraction, false);
});

test('求解器给出的每个解法都能被校验器接受', () => {
  for (const nums of [[3, 3, 8, 8], [1, 5, 5, 5], [2, 3, 4, 6], [10, 10, 4, 4]]) {
    const { solutions } = solve24(nums);
    assert.ok(solutions.length > 0);
    for (const s of solutions) assert.ok(check24(nums, s).ok, `${nums}: ${s}`);
  }
});

test('生成的题目全部有解，且示例答案正确', () => {
  for (const level of [0, 1, 2, 3, 4, 5]) {
    for (let seed = 1; seed <= 15; seed++) {
      const sets = generate24({ level, seed });
      assert.ok(sets.length >= 3);
      for (const s of sets) {
        assert.equal(s.nums.length, 4);
        assert.ok(s.nums.every((n) => n >= 1 && n <= (level < 1.5 ? 10 : 13)));
        assert.ok(isSolvable(s.nums));
        assert.ok(check24(s.nums, s.example).ok);
        if (level < 3) assert.equal(s.needsFraction, false);
      }
    }
  }
});

test('表达式求值使用精确分数', () => {
  assert.deepEqual(evaluate('8/(3-8/3)').value, { n: 24, d: 1 });
  assert.deepEqual(evaluate('1/3').value, { n: 1, d: 3 });
  assert.deepEqual(evaluate('（8−4）×6').value, { n: 24, d: 1 });
  assert.deepEqual(evaluate('2+3*4').value, { n: 14, d: 1 });
});

test('check24 拒绝错误答案', () => {
  assert.ok(check24([4, 6, 1, 1], '4*6*1*1').ok);
  assert.equal(check24([4, 6, 1, 1], '4*6').ok, false); // 少用
  assert.equal(check24([4, 6, 1, 1], '4*6*1*1*1').ok, false); // 多用
  assert.equal(check24([4, 6, 1, 1], '24').ok, false);
  assert.equal(check24([4, 6, 1, 1], '4+6+1+1').ok, false);
  assert.equal(check24([4, 6, 1, 1], '4*6*(1').ok, false);
  assert.equal(check24([4, 6, 1, 1], 'alert(1)').ok, false);
  assert.equal(check24([3, 3, 8, 8], '8/(3-3)*8').ok, false);
  assert.ok(check24([3, 3, 8, 8], '8 ÷ (3 − 8 ÷ 3)').ok);
  // 支持一元负号
  assert.ok(check24([3, 9, 4, 1], '(-3 + 9) * 4 * 1').ok);
  assert.ok(check24([3, 9, 4, 1], '-(3 - 9) * 4 * 1').ok);
});

test('generate24 exclude 能避开已有牌组', () => {
  const first = generate24({ level: 2, rounds: 3, seed: 10 });
  const exclude = first.map((s) => s.nums.slice().sort((a, b) => a - b).join(','));
  const next = generate24({ level: 2, rounds: 2, seed: 10, exclude });
  assert.equal(next.length, 2);
  for (const s of next) {
    const k = s.nums.slice().sort((a, b) => a - b).join(',');
    assert.ok(!exclude.includes(k));
  }
});
