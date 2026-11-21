// 24 点：四个数，每个用且只用一次，+ − × ÷ 和括号，算出 24。只出有解的题。
import { makeRng } from './rng.js';

const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
export function frac(n, d = 1) {
  if (d === 0) return null;
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
const add = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => frac(a.n * b.n, a.d * b.d);
const div = (a, b) => (b.n === 0 ? null : frac(a.n * b.d, a.d * b.n));
const isInt = (x) => x.d === 1;

/**
 * 枚举所有解法。返回 {solutions: string[], needsFraction: boolean}
 * needsFraction：所有解法都必须经过分数中间结果（通常更难，如 3 3 8 8）。
 */
export function solve24(nums, target = 24) {
  const found = new Set();
  let intSolution = false;
  const rec = (items) => {
    if (items.length === 1) {
      const v = items[0].v;
      if (v.n === target * v.d) {
        found.add(items[0].e);
        if (!items[0].frac) intSolution = true;
      }
      return;
    }
    for (let i = 0; i < items.length; i++) for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const a = items[i], b = items[j];
      const rest = items.filter((_, k) => k !== i && k !== j);
      const ops = [];
      if (i < j) { ops.push(['+', add(a.v, b.v)]); ops.push(['×', mul(a.v, b.v)]); }
      ops.push(['−', sub(a.v, b.v)]);
      ops.push(['÷', div(a.v, b.v)]);
      for (const [op, v] of ops) {
        if (!v) continue;
        const f = a.frac || b.frac || !isInt(v);
        rec([...rest, { v, e: `(${a.e} ${op} ${b.e})`, frac: f }]);
      }
    }
  };
  rec(nums.map((x) => ({ v: frac(x), e: String(x), frac: false })));
  const solutions = [...found].map((s) => s.replace(/^\((.*)\)$/, '$1'));
  return { solutions, needsFraction: solutions.length > 0 && !intSolution };
}

export function isSolvable(nums) { return solve24(nums).solutions.length > 0; }

/**
 * 生成若干组有解的 24 点。1–5 级：题数 3→4→4→5→5，3 级起解锁分数题，4–5 级逐步偏向难题。
 */
export function generate24({ level = 1, rounds, seed, exclude } = {}) {
  const rng = makeRng(seed);
  const lv = Math.max(1, Math.min(5, Math.round(level)));
  const count = rounds ?? (lv === 1 ? 3 : lv <= 3 ? 4 : 5);
  const maxNum = 13;
  const hardBias = lv >= 5 ? 0.85 : lv >= 4 ? 0.6 : 0;
  const out = [];
  const seen = new Set(exclude || []);
  let guard = 0;
  while (out.length < count && guard++ < 5000) {
    const nums = [0, 0, 0, 0].map(() => rng.int(1, maxNum));
    const key = nums.slice().sort((a, b) => a - b).join(',');
    if (seen.has(key)) continue;
    const { solutions, needsFraction } = solve24(nums);
    if (!solutions.length) continue;
    // 难度：解法越少越难
    const hard = needsFraction || solutions.length <= 4;
    if (hardBias > 0 && !hard && rng.next() < hardBias) continue;
    if (lv < 3 && needsFraction) continue; // 分数题从 3 级开始出现
    seen.add(key);
    out.push({ nums, solutionCount: solutions.length, needsFraction, example: solutions[0] });
  }
  return out;
}

// ---------- 表达式解析（不使用 eval） ----------
export function tokenize(src) {
  const s = src.replace(/\s+/g, '')
    .replace(/[×xX*＊]/g, '*').replace(/[÷/／]/g, '/')
    .replace(/[−–—－]/g, '-').replace(/＋/g, '+')
    .replace(/[（]/g, '(').replace(/[）]/g, ')');
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\d/.test(ch)) {
      let j = i;
      while (j < s.length && /\d/.test(s[j])) j++;
      tokens.push({ t: 'num', v: Number(s.slice(i, j)) });
      i = j;
    } else if ('+-*/()'.includes(ch)) {
      tokens.push({ t: ch });
      i++;
    } else {
      throw new Error(`无法识别的字符: ${ch}`);
    }
  }
  return tokens;
}

export function evaluate(src) {
  const tokens = tokenize(src);
  let p = 0;
  const used = [];
  const peek = () => tokens[p];
  const expr = () => {
    let v = term();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = tokens[p++].t;
      const r = term();
      v = op === '+' ? add(v, r) : sub(v, r);
    }
    return v;
  };
  const term = () => {
    let v = factor();
    while (peek() && (peek().t === '*' || peek().t === '/')) {
      const op = tokens[p++].t;
      const r = factor();
      if (op === '/') {
        if (r.n === 0) throw new Error('不能除以 0');
        v = div(v, r);
      } else v = mul(v, r);
    }
    return v;
  };
  const factor = () => {
    const tk = tokens[p++];
    if (!tk) throw new Error('算式不完整');
    if (tk.t === '-') {
      const v = factor();
      return frac(-v.n, v.d);
    }
    if (tk.t === '+') {
      return factor();
    }
    if (tk.t === 'num') { used.push(tk.v); return frac(tk.v); }
    if (tk.t === '(') {
      const v = expr();
      if (!peek() || peek().t !== ')') throw new Error('括号不匹配');
      p++;
      return v;
    }
    throw new Error('算式格式不对');
  };
  const value = expr();
  if (p !== tokens.length) throw new Error('算式格式不对');
  return { value, used };
}

/** 校验用户答案：必须恰好用到这四个数各一次，且结果等于 24 */
export function check24(nums, src) {
  let res;
  try { res = evaluate(src); } catch (e) { return { ok: false, error: e.message }; }
  const a = res.used.slice().sort((x, y) => x - y).join(',');
  const b = nums.slice().sort((x, y) => x - y).join(',');
  if (a !== b) return { ok: false, error: `要用且只用一次: ${nums.join(', ')}` };
  if (!(res.value.n === 24 && res.value.d === 1)) {
    const shown = res.value.d === 1 ? res.value.n : `${res.value.n}/${res.value.d}`;
    return { ok: false, error: `结果是 ${shown}, 不是 24` };
  }
  return { ok: true };
}
