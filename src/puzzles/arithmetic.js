// 心算：10 道题，任何一道答错，整组重来。
import { makeRng } from './rng.js';

export const COUNT = 10;

function make(rng, kind) {
  switch (kind) {
    case 'mul1': { // 两位数 × 一位数，如 47×8
      const a = rng.int(13, 99), b = rng.int(3, 9);
      return { text: `${a} × ${b}`, answer: a * b };
    }
    case 'mul2': { // 两位数 × 十几，如 47×13
      const a = rng.int(12, 49), b = rng.int(11, 19);
      return { text: `${a} × ${b}`, answer: a * b };
    }
    case 'mul3': { // 三位数 × 一位数
      const a = rng.int(102, 499), b = rng.int(3, 9);
      return { text: `${a} × ${b}`, answer: a * b };
    }
    case 'sub': { // 三位数 − 三位数，保证有借位，如 326−189
      for (;;) {
        const a = rng.int(201, 999), b = rng.int(101, a - 11);
        if (a % 10 < b % 10) return { text: `${a} − ${b}`, answer: a - b };
      }
    }
    case 'add': { // 三位数 + 三位数，有进位
      for (;;) {
        const a = rng.int(105, 899), b = rng.int(105, 899);
        if ((a % 10) + (b % 10) >= 10) return { text: `${a} + ${b}`, answer: a + b };
      }
    }
    case 'div': { // 整除，如 672÷8
      const b = rng.int(3, 9), q = rng.int(14, 99);
      return { text: `${b * q} ÷ ${b}`, answer: q };
    }
    case 'mix': { // 两步运算，如 23×4+57
      const a = rng.int(12, 39), b = rng.int(3, 9), c = rng.int(11, Math.min(99, a * b - 12));
      return rng.next() < 0.5
        ? { text: `${a} × ${b} + ${c}`, answer: a * b + c }
        : { text: `${a} × ${b} − ${c}`, answer: a * b - c };
    }
    default: throw new Error('unknown kind ' + kind);
  }
}

export function kindsFor(level) {
  const lv = Math.max(1, Math.min(5, Math.round(level)));
  if (lv === 1) return ['mul1', 'sub', 'add', 'div', 'mul1', 'sub', 'mul3', 'div', 'sub', 'mix'];
  if (lv === 2) return ['mul2', 'mul1', 'sub', 'add', 'div', 'mul3', 'div', 'sub', 'mix', 'mix'];
  if (lv === 3) return ['mul2', 'mul2', 'sub', 'div', 'mul3', 'mix', 'mix', 'mul1', 'div', 'sub'];
  if (lv === 4) return ['mul2', 'mul2', 'mul2', 'sub', 'div', 'mul3', 'mix', 'mix', 'div', 'sub'];
  return ['mul2', 'mul2', 'mul2', 'mul2', 'mul3', 'div', 'div', 'mix', 'mix', 'mix'];
}

export function generateArithmetic({ level = 1, seed } = {}) {
  const rng = makeRng(seed);
  return rng.shuffle(kindsFor(level)).map((k) => ({ kind: k, ...make(rng, k) }));
}

export function checkAnswer(problem, input) {
  const s = String(input).trim().replace(/[−–—]/g, '-');
  if (!/^-?\d+$/.test(s)) return false;
  return Number(s) === problem.answer;
}
