import { isEn } from './i18n.js';

// 冲动曲线: 一轮 15 分钟, 第 7 分钟到高峰. 时间单位: 分钟
export const WAVE_MIN = 15;
export const PEAK_MIN = 7;

/** 某一时刻冲动的相对强度，0 到 1 */
export function urgeLevel(min) {
  return Math.exp(-(((min - PEAK_MIN) / 3.4) ** 2));
}

/** 卡片右上角的阶段（保留固定中文返回值以兼容单元测试） */
export function urgePhase(min) {
  if (min < 6) return '上升';
  if (min < 8) return '高峰';
  if (min < WAVE_MIN) return '回落';
  return '平复';
}

export function urgePhaseLabel(min, en = isEn()) {
  if (!en) return urgePhase(min);
  if (min < 6) return 'Rising';
  if (min < 8) return 'Peak';
  if (min < WAVE_MIN) return 'Subsiding';
  return 'Calm';
}

// 流光和脉冲的周期 (毫秒). 每秒重画一次 SVG, 用负的 animation-delay 接上相位, 动画不会跳
export const FLOW_MS = 1600;
export const PULSE_MS = 900;

/**
 * 画曲线用的 SVG 字符串. 纯字符串, 不加载任何外部资源
 * @param {number} min 已经过去的分钟数
 * @param {number} clock 当前时间戳, 用来接上动画相位
 */
export function urgeSvg(min, clock = 0, W = 320, H = 130) {
  const top = 14, base = H - 4, amp = base - top;
  const now = Math.min(Math.max(min, 0), WAVE_MIN);
  const X = (t) => (t / WAVE_MIN) * W;
  const Y = (t) => base - urgeLevel(t) * amp;
  const pts = [];
  for (let i = 0; i <= 150; i++) pts.push((i / 150) * WAVE_MIN);
  const path = (ts) => ts.map((t, i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(t).toFixed(1)}`).join(' ');
  const past = pts.filter((t) => t < now).concat(now);
  const fut = [now].concat(pts.filter((t) => t > now));
  const nx = X(now).toFixed(1), ny = Y(now).toFixed(1);
  const px = X(PEAK_MIN).toFixed(1);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="冲动曲线, ${urgePhase(min)}">
  <defs>
    <linearGradient id="ug" x1="0" x2="1"><stop offset="0" stop-color="#c98a00"/><stop offset="1" stop-color="#ffd24d"/></linearGradient>
    <linearGradient id="ua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5b301" stop-opacity=".26"/><stop offset="1" stop-color="#f5b301" stop-opacity="0"/></linearGradient>
    <filter id="uglow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
  </defs>
  <line x1="0" x2="${W}" y1="${base}" y2="${base}" stroke="rgba(255,255,255,.08)"/>
  <line x1="${px}" x2="${px}" y1="${Y(PEAK_MIN).toFixed(1)}" y2="${base}" stroke="rgba(255,255,255,.16)" stroke-dasharray="2 4"/>
  <path d="${path(past)} L${nx} ${base} L0 ${base} Z" fill="url(#ua)"/>
  <path d="${path(fut)}" fill="none" stroke="rgba(245,179,1,.4)" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round"/>
  <path d="${path(past)}" fill="none" stroke="url(#ug)" stroke-width="6" opacity=".5" filter="url(#uglow)"/>
  <path d="${path(past)}" fill="none" stroke="url(#ug)" stroke-width="2.5" stroke-linecap="round"/>
  <path class="urge-flow" style="animation-delay:-${clock % FLOW_MS}ms" d="${path(pts)}" fill="none" stroke="#fff6d6" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="6 94"/>
  <circle class="urge-ring" style="animation-delay:-${clock % PULSE_MS}ms" cx="${nx}" cy="${ny}" r="12" fill="rgba(245,179,1,.25)"/>
  <circle class="urge-dot" style="animation-delay:-${clock % PULSE_MS}ms" cx="${nx}" cy="${ny}" r="5.5" fill="#fff6d6" stroke="#f5b301" stroke-width="2"/>
</svg>`;
}
