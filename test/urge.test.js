import { test } from 'node:test';
import assert from 'node:assert/strict';
import { urgeLevel, urgePhase, urgeSvg, formatUrgeTime, PEAK_MIN, WAVE_MIN } from '../src/lib/urge.js';

test('曲线在高峰最高，两头接近 0', () => {
  assert.equal(urgeLevel(PEAK_MIN), 1);
  assert.ok(urgeLevel(0) < 0.05);
  assert.ok(urgeLevel(WAVE_MIN) < 0.05);
  assert.ok(urgeLevel(5) < urgeLevel(6));
  assert.ok(urgeLevel(9) > urgeLevel(10));
});

test('阶段跟着时间变', () => {
  assert.equal(urgePhase(1), '上升');
  assert.equal(urgePhase(5.9), '上升');
  assert.equal(urgePhase(7), '高峰');
  assert.equal(urgePhase(10), '回落');
  assert.equal(urgePhase(15), '平复');
  assert.equal(urgePhase(20), '平复');
});

test('流光和脉冲按时钟接上相位', () => {
  const svg = urgeSvg(6, 1000);
  assert.ok(svg.includes('class="urge-flow" style="animation-delay:-1000ms"'));
  assert.ok(svg.includes('class="urge-dot" style="animation-delay:-100ms"'));
});

test('SVG 不引用外部资源且时间标签随圆点渲染', () => {
  assert.equal(formatUrgeTime(0), '00:00');
  assert.equal(formatUrgeTime(4 + 14 / 60), '04:14');
  assert.equal(formatUrgeTime(18.5), '18:30');
  for (const m of [0, 4 + 14 / 60, 6, 7, 12, 30]) {
    const svg = urgeSvg(m, Date.now());
    assert.ok(svg.startsWith('<svg'));
    assert.ok(!/https?:|href=/.test(svg.replace('http://www.w3.org', '')));
    assert.ok(!svg.includes('NaN'));
    assert.ok(svg.includes(formatUrgeTime(m)));
  }
});
