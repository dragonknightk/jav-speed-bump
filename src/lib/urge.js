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

/** 格式化已专注时间为 MM:SS */
export function formatUrgeTime(min) {
  const sec = Math.max(0, Math.floor(min * 60 + 1e-6));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 画曲线用的 SVG 字符串. 纯字符串, 不加载任何外部资源
 * @param {number} min 已经过去的分钟数
 * @param {number} clock 当前时间戳, 用来接上动画相位
 * @param {number} W 画布逻辑宽度 (建议传容器实测像素宽, 保证 1:1 清晰度)
 * @param {number} H 画布逻辑高度
 */
export function urgeSvg(min, clock = 0, W = 320, H = 118) {
  const padX = 14;
  const top = 26;
  const base = H - 8;
  const amp = Math.max(24, base - top);
  const innerW = Math.max(80, W - padX * 2);
  const now = Math.min(Math.max(min, 0), WAVE_MIN);
  const X = (t) => padX + (t / WAVE_MIN) * innerW;
  const Y = (t) => base - urgeLevel(t) * amp;
  const pts = [];
  for (let i = 0; i <= 150; i++) pts.push((i / 150) * WAVE_MIN);
  const path = (ts) => ts.map((t, i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(t).toFixed(1)}`).join(' ');
  const past = pts.filter((t) => t < now).concat(now);
  const fut = [now].concat(pts.filter((t) => t > now));
  const nxNum = X(now);
  const nyNum = Y(now);
  const nx = nxNum.toFixed(1);
  const ny = nyNum.toFixed(1);
  const px = X(PEAK_MIN).toFixed(1);
  const py = Y(PEAK_MIN).toFixed(1);

  const timeStr = formatUrgeTime(min);
  const halfTextW = timeStr.length > 5 ? 23 : 19;
  const dXdt = innerW / WAVE_MIN;
  const dYdt = amp * urgeLevel(now) * (2 * (now - PEAK_MIN)) / (3.4 * 3.4);
  const tLen = Math.hypot(dXdt, dYdt) || 1;
  const ux = dYdt / tLen;
  const uy = -dXdt / tLen;
  const tx = Math.min(Math.max(nxNum + ux * (halfTextW + 9), padX + halfTextW - 1), W - padX - halfTextW + 1);
  const tyCenter = Math.max(10, nyNum + uy * 16);
  const textY = (tyCenter + 4).toFixed(1);

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="冲动曲线, ${urgePhase(min)}, ${timeStr}">
  <defs>
    <linearGradient id="ug" x1="0" x2="1"><stop offset="0" stop-color="#c98a00"/><stop offset="1" stop-color="#f7c948"/></linearGradient>
    <linearGradient id="ua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5b301" stop-opacity=".22"/><stop offset="1" stop-color="#f5b301" stop-opacity="0"/></linearGradient>
    <filter id="uglow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3.5"/></filter>
  </defs>
  <line x1="${padX}" x2="${W - padX}" y1="${base}" y2="${base}" stroke="rgba(255,255,255,.08)"/>
  <line x1="${px}" x2="${px}" y1="${py}" y2="${base}" stroke="rgba(255,255,255,.15)" stroke-dasharray="2 4"/>
  <path d="${path(past)} L${nx} ${base} L${padX} ${base} Z" fill="url(#ua)"/>
  <path d="${path(fut)}" fill="none" stroke="rgba(245,179,1,.36)" stroke-width="1.8" stroke-dasharray="1 5.5" stroke-linecap="round"/>
  <path d="${path(past)}" fill="none" stroke="url(#ug)" stroke-width="5.5" opacity=".42" filter="url(#uglow)"/>
  <path d="${path(past)}" fill="none" stroke="url(#ug)" stroke-width="2.2" stroke-linecap="round"/>
  <path class="urge-flow" style="animation-delay:-${clock % FLOW_MS}ms" d="${path(pts)}" fill="none" stroke="#fff6d6" stroke-width="2.6" stroke-linecap="round" pathLength="100" stroke-dasharray="6 94"/>
  <text class="urge-time" x="${tx.toFixed(1)}" y="${textY}" text-anchor="middle" fill="#dfc78c" font-size="11.5" font-weight="600" letter-spacing="0.4" font-family="ui-monospace, 'Cascadia Mono', 'SFMono-Regular', Consolas, monospace">${timeStr}</text>
  <circle class="urge-ring" style="animation-delay:-${clock % PULSE_MS}ms" cx="${nx}" cy="${ny}" r="10" fill="rgba(245,179,1,.22)"/>
  <circle class="urge-dot" style="animation-delay:-${clock % PULSE_MS}ms" cx="${nx}" cy="${ny}" r="4.8" fill="#fff4cf" stroke="#f5b301" stroke-width="1.8"/>
</svg>`;
}
