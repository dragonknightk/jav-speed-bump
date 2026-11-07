import { isEn } from './i18n.js';

export const REASONS = [
  { key: 'bored', label: '无聊空虚', labelEn: 'Boredom', icon: '😐' },
  { key: 'stress', label: '焦虑压力', labelEn: 'Stress', icon: '😣' },
  { key: 'lonely', label: '深夜孤独', labelEn: 'Loneliness', icon: '🌙' },
  { key: 'tired', label: '身心疲惫', labelEn: 'Fatigue', icon: '😴' },
  { key: 'waiting', label: '碎片等待', labelEn: 'Waiting', icon: '⏳' },
  { key: 'other', label: '其他原因', labelEn: 'Other', icon: '❔' },
];
export const REASON_LABEL = Object.fromEntries(REASONS.map((r) => [r.key, r.label]));
export const REASON_LABEL_EN = Object.fromEntries(REASONS.map((r) => [r.key, r.labelEn]));

export function reasonText(key, en = isEn()) {
  if (!key) return '-';
  return (en ? REASON_LABEL_EN[key] : REASON_LABEL[key]) || '-';
}

const ALTS = [
  {
    icon: '🚶',
    title: '起身走动两分钟',
    titleEn: 'Walk around for 2 minutes',
    detail: '离开电脑座位，去窗边或走廊活动一下身体',
    detailEn: 'Step away from your desk and stretch by the window or hallway',
    for: ['bored', 'waiting', 'stress', 'tired'],
  },
  {
    icon: '💧',
    title: '去倒一杯温水',
    titleEn: 'Drink a glass of water',
    detail: '慢慢喝完一整杯水，把注意力拉回身体感知',
    detailEn: 'Drink a full glass slowly and focus on physical sensations',
    for: ['*'],
  },
  {
    icon: '💪',
    title: '做 15 个俯卧撑或深蹲',
    titleEn: 'Do 15 push-ups or squats',
    detail: '让心率主动升高，快速代谢掉焦躁感',
    detailEn: 'Raise your heart rate to burn off restless energy',
    for: ['bored', 'stress', 'other'],
  },
  {
    icon: '🫁',
    title: '进行三轮 4-7-8 深呼吸',
    titleEn: 'Three rounds of 4-7-8 breathing',
    detail: '吸气 4 秒 · 屏息 7 秒 · 缓慢呼气 8 秒',
    detailEn: 'Inhale 4s · Hold 7s · Exhale slowly for 8s',
    for: ['stress', 'lonely', 'other'],
  },
  {
    icon: '📞',
    title: '给朋友或家人发条消息',
    titleEn: 'Message a friend or family member',
    detail: '随便聊两句近况，打破独处时的封闭感',
    detailEn: 'Say hello and break the feeling of isolation',
    for: ['lonely'],
  },
  {
    icon: '🛏️',
    title: '合上电脑直接休息',
    titleEn: 'Close the laptop and rest',
    detail: '今天已经够累了，去洗漱躺下睡一觉',
    detailEn: 'You are tired enough today—brush up and get some sleep',
    for: ['tired'],
  },
  {
    icon: '🚿',
    title: '去洗一把冷水脸',
    titleEn: 'Splash cold water on your face',
    detail: '或者冲个热水澡，用体感温度切换大脑状态',
    detailEn: 'Or take a quick shower to reset your nervous system',
    for: ['tired', 'stress', 'bored'],
  },
  {
    icon: '📝',
    title: '写下此刻手头的正事',
    titleEn: 'Write down your next 15-min task',
    detail: '在纸上列出接下来 15 分钟能推进的一件小事',
    detailEn: 'Pick one small concrete task you can finish right now',
    for: ['stress', 'waiting', 'other'],
  },
  {
    icon: '📖',
    title: '翻开纸质书读 5 页',
    titleEn: 'Read 5 pages of a physical book',
    detail: '视线离开电子屏幕，让眼睛和前额叶放松下来',
    detailEn: 'Look away from screens and let your eyes relax',
    for: ['bored', 'waiting', 'lonely'],
  },
  {
    icon: '🧹',
    title: '花五分钟整理桌面',
    titleEn: 'Tidy your desk for 5 minutes',
    detail: '把桌上的水杯、线材和杂物归位，恢复秩序感',
    detailEn: 'Clear cups, cables, and clutter to restore a sense of order',
    for: ['bored', 'waiting', 'stress'],
  },
  {
    icon: '🌳',
    title: '下楼吹吹风转一圈',
    titleEn: 'Step outside for fresh air',
    detail: '离开房间走十分钟再回来',
    detailEn: 'Leave your room for a 10-minute walk before coming back',
    for: ['lonely', 'bored', 'stress'],
  },
];

export function pickAlternatives(reason, n = 3) {
  const pool = ALTS.filter((a) => a.for.includes('*') || !reason || a.for.includes(reason));
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr.slice(0, n);
}
