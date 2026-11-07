import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateArithmetic, checkAnswer, COUNT } from '../src/puzzles/arithmetic.js';

function evalText(text) {
  const t = text.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  assert.match(t, /^[\d\s+\-*/]+$/);
  return Function(`return (${t})`)();
}

test('每组 10 题，答案正确且都是整数', () => {
  for (const level of [0, 1, 2, 3, 4, 5]) {
    for (let seed = 1; seed <= 40; seed++) {
      const set = generateArithmetic({ level, seed });
      assert.equal(set.length, COUNT);
      for (const p of set) {
        assert.equal(evalText(p.text), p.answer, p.text);
        assert.ok(Number.isInteger(p.answer));
        assert.ok(p.answer > 0, `${p.text} 结果应为正数`);
      }
    }
  }
});

test('减法有借位、除法整除、范围合理', () => {
  for (let seed = 1; seed <= 200; seed++) {
    for (const p of generateArithmetic({ level: 3, seed })) {
      if (p.kind === 'sub') {
        const [a, b] = p.text.split(' − ').map(Number);
        assert.ok(a >= 200 && a <= 999 && b >= 100);
        assert.ok(a % 10 < b % 10, '要有借位');
      }
      if (p.kind === 'div') {
        const [a, b] = p.text.split(' ÷ ').map(Number);
        assert.equal(a % b, 0);
      }
      if (p.kind === 'mul1') {
        const [a, b] = p.text.split(' × ').map(Number);
        assert.ok(a >= 10 && a <= 99 && b >= 2 && b <= 9);
      }
    }
  }
});

test('初始难度以一位数乘法和两位数加减为主', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const set = generateArithmetic({ level: 1, seed });
    assert.ok(set.filter((p) => p.kind === 'mul0').length >= 4);
    for (const p of set) {
      assert.ok(['mul0', 'add1', 'sub1'].includes(p.kind));
      if (p.kind === 'mul0') {
        const [a, b] = p.text.split(' × ').map(Number);
        assert.ok(a >= 2 && a <= 9 && b >= 2 && b <= 9);
      }
      if (p.kind === 'add1' || p.kind === 'sub1') {
        const [a, b] = p.text.split(/ [+−] /).map(Number);
        assert.ok(a >= 10 && a <= 99 && b >= 10 && b <= 99);
      }
    }
  }
});

test('高难度包含更难的题型', () => {
  const kinds = new Set(generateArithmetic({ level: 5, seed: 1 }).map((p) => p.kind));
  assert.ok(kinds.has('mul2'));
  const easy = new Set(generateArithmetic({ level: 0, seed: 1 }).map((p) => p.kind));
  assert.ok(!easy.has('mul2') && !easy.has('mix'));
});

test('checkAnswer', () => {
  const p = { text: '47 × 8', answer: 376 };
  assert.ok(checkAnswer(p, '376'));
  assert.ok(checkAnswer(p, ' 376 '));
  assert.ok(!checkAnswer(p, '375'));
  assert.ok(!checkAnswer(p, '376.0'));
  assert.ok(!checkAnswer(p, ''));
  assert.ok(checkAnswer({ answer: -5 }, '−5'));
});
