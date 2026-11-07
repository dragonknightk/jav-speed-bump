// 默认屏蔽名单与匹配逻辑（纯函数，后台脚本和测试共用）

export const DEFAULT_DOMAINS = {
  jav: [
    'javlibrary.com', 'javbus.com', 'javdb.com', 'javdb.io', 'missav.com', 'missav.ws', 'missav.ai',
    'jable.tv', 'supjav.com', 'javhd.com', 'javmost.com', 'jav.guru', '7mmtv.sx', '7mmtv.tv',
    'avgle.com', 'netflav.com', 'javhub.net', 'javtiful.com', 'javhdporn.net', 'javct.net',
    'javfree.me', 'sukebei.nyaa.si', 'r18.com', 'r18.dev', 'dmm.co.jp', 'onejav.com', '141jav.com',
    'javtrailers.com', 'javmenu.com', 'avjoy.me', 'njav.tv', 'njavtv.com', 'javgg.net', 'javsee.com',
    'fc2ppvdb.com', 'avple.tv', 'javplayer.me', 'highporn.net', 'javbangers.com', 'javynow.com',
    'mgstage.com', 'caribbeancom.com', '1pondo.tv', 'heyzo.com', 'tokyo-hot.com', '10musume.com',
  ],
  hentai: [
    'nhentai.net', 'nhentai.to', 'nhentai.xxx', 'e-hentai.org', 'exhentai.org', 'hanime.tv',
    'hanime1.me', 'hentaihaven.xxx', 'hentai.tv', 'hitomi.la', 'rule34.xxx', 'rule34.paheal.net',
    'rule34video.com', 'gelbooru.com', 'yande.re', 'konachan.com', 'sankakucomplex.com',
    'chan.sankakucomplex.com', 'hentai2read.com', 'tsumino.com', 'simply-hentai.com', '18comic.vip',
    '18comic.org', 'jmcomic.me', 'wnacg.com', 'wnacg.org', 'iwara.tv', 'kemono.su', 'kemono.cr',
    'kemono.party', 'coomer.su', 'f95zone.to', 'dlsite.com', 'luscious.net', 'hentaigasm.com',
    'hentaimama.io', '3hentai.net', 'pururin.to', 'multporn.net', 'hentai-foundry.com', 'hentaifox.com',
    'imhentai.xxx', 'asmhentai.com', 'hentai20.io', 'muchohentai.com', 'ohentai.org', 'hentaicity.com',
    'nozomi.la', 'zerochan.net', 'danbooru.donmai.us', 'xbooru.com', 'nijie.info', 'erogamescape.dyndns.org',
    'vikacg.com', 'cangku.moe', 'cagame.net',
  ],
  mainstream: [
    'pornhub.com', 'pornhubpremium.com', 'xvideos.com', 'xvideos.red', 'xnxx.com', 'xhamster.com',
    'xhamster.desi', 'redtube.com', 'youporn.com', 'tube8.com', 'spankbang.com', 'eporner.com',
    'beeg.com', 'tnaflix.com', 'porn.com', 'youjizz.com', 'motherless.com', 'txxx.com', 'hqporner.com',
    'porntrex.com', 'chaturbate.com', 'stripchat.com', 'bongacams.com', 'onlyfans.com', 'fansly.com',
    'livejasmin.com', 'cam4.com', 'myfreecams.com', 'brazzers.com', 'thisvid.com', 'porn300.com',
    'xxxbunker.com', 'drtuber.com', 'sunporno.com', 'fuq.com', 'pornone.com', 'tubegalore.com',
    'ixxx.com', 'porndig.com', 'cliphunter.com', 'heavy-r.com', 'xfreehd.com', 'pornpics.com',
    'imagefap.com', 'manyvids.com', 'clips4sale.com', 'realitykings.com', 'naughtyamerica.com',
    'bangbros.com', 'mofos.com', 'metart.com', 'sxyprn.com', 'perfectgirls.net', 'noodlemagazine.com',
    '91porn.com', 't66y.com', 'sehuatang.net', 'sehuatang.org', 'xchina.co', 'hsex.men',
    'rou.video', 'rou.pub', 'rouvb1.xyz', 'rouman5.com', 'roum29.xyz', 'rdz4.xyz', 'static.ckslb.com',
  ],
  // 整个顶级域
  tld: ['xxx', 'porn', 'sex', 'adult'],
};

export const ALL_DEFAULT_DOMAINS = [...new Set(Object.values(DEFAULT_DOMAINS).flat())];

// Steam 独立封锁模块：支持两档粒度（download: 仅客户端下载与安装页; full: 全站域名 + 搜索词）
export const STEAM_DOMAINS = [
  'steampowered.com',
  'steamcommunity.com',
  'steamstatic.com',
  'steamusercontent.com',
  'steamcdn-a.akamaihd.net',
  's.team',
  'valvesoftware.com',
  'steamgames.com',
  'steamdeck.com',
];

export const STEAM_KEYWORDS = [
  'steam',
  'steampowered',
  'steamcommunity',
  'steam下载',
  'steam官网',
  'steam安装',
  'steam客户端',
];

// 搜索关键词（中英日）。ASCII 关键词按"整词"匹配，避免 "java" 误伤 "jav"。
export const DEFAULT_KEYWORDS = [
  'porn', 'pornhub', 'hentai', 'jav', 'xvideos', 'xnxx', 'xhamster', 'nhentai', 'missav', 'jable',
  'hanime', 'rule34', 'onlyfans', 'nsfw', 'r18', 'fc2ppv', 'av女优', 'av女優', 'av在线', '番号',
  '无码', '無碼', '有码', '里番', '裏番', '本子 汉化', '色情', '黄片', '成人视频', '成人影片', '18禁',
  'エロ', 'セックス', 'えろ', '无修正', '無修正', 'av下载', '磁力 番号', '91porn', '草榴', '色花堂',
];

export function normalizeDomain(input) {
  let s = String(input || '').trim().toLowerCase();
  if (!s) return '';
  s = s.replace(/^[a-z]+:\/\//, '').replace(/^\*\./, '').replace(/^www\./, '');
  s = s.split(/[/?#:]/)[0];
  s = s.replace(/\.+$/, '');
  if (!/^[a-z0-9.-]+$/.test(s)) {
    try { s = new URL('http://' + s).hostname; } catch { return ''; }
  }
  return s;
}

export function isValidDomain(d) {
  return /^([a-z0-9-]+\.)*[a-z0-9-]+$/.test(d) && d.length <= 253;
}

/** host 是否命中 domains（含子域名） */
export function matchDomain(host, domains) {
  if (!host) return null;
  host = host.toLowerCase().replace(/\.$/, '');
  for (const d of domains) {
    if (host === d || host.endsWith('.' + d)) return d;
  }
  return null;
}

export function isSteamDomain(host) {
  return Boolean(matchDomain(host, STEAM_DOMAINS));
}

/** 是否为 Steam 客户端安装落地页 (/about) 或安装包下载直链 */
export function isSteamDownloadUrl(url) {
  let u;
  try { u = new URL(url); } catch { return false; }
  if (!/^https?:$/.test(u.protocol)) return false;
  const host = u.hostname.toLowerCase();
  const path = u.pathname.toLowerCase();
  if ((host === 'store.steampowered.com' || host === 'steampowered.com') && /^\/about(\/|$)/.test(path)) {
    return true;
  }
  if (matchDomain(host, STEAM_DOMAINS) && (
    path.includes('/client/installer/') ||
    /\/(steamsetup\.exe|steam\.dmg|steam_latest\.deb|steam\.apk)$/i.test(path)
  )) {
    return true;
  }
  return false;
}

export function normalizeSteamMode(settings = {}) {
  if (settings.steamMode === 'download' || settings.steamMode === 'full' || settings.steamMode === 'off') {
    return settings.steamMode;
  }
  return settings.blockSteam ? 'full' : 'off';
}

const SEARCH_ENGINES = [
  { re: /(^|\.)google\.[a-z.]+$/, params: ['q', 'oq'] },
  { re: /(^|\.)bing\.com$/, params: ['q'] },
  { re: /(^|\.)baidu\.com$/, params: ['wd', 'word', 'kw', 'query'] },
  { re: /(^|\.)sogou\.com$/, params: ['query', 'keyword'] },
  { re: /(^|\.)so\.com$/, params: ['q'] },
  { re: /(^|\.)duckduckgo\.com$/, params: ['q'] },
  { re: /(^|\.)yandex\.[a-z.]+$/, params: ['text'] },
  { re: /(^|\.)search\.yahoo\.(com|co\.jp)$/, params: ['p'] },
  { re: /(^|\.)yahoo\.co\.jp$/, params: ['p'] },
  { re: /(^|\.)(x|twitter)\.com$/, params: ['q'], path: /^\/search/ },
  { re: /(^|\.)bilibili\.com$/, params: ['keyword'] },
  { re: /(^|\.)youtube\.com$/, params: ['search_query'] },
  { re: /(^|\.)reddit\.com$/, params: ['q'] },
];

/** 返回 URL 中的搜索词（若是搜索引擎），否则 null */
export function searchQueryOf(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.toLowerCase();
  const eng = SEARCH_ENGINES.find((e) => e.re.test(host));
  if (!eng) return null;
  if (eng.path && !eng.path.test(u.pathname)) return null;
  const parts = [];
  for (const p of eng.params) {
    const v = u.searchParams.get(p);
    if (v) parts.push(v);
  }
  // 部分站点把搜索词放在 hash 或路径里（如百度移动版、bing 的 SPA）
  if (u.hash.includes('=')) {
    const hp = new URLSearchParams(u.hash.slice(1).replace(/^[^?]*\?/, ''));
    for (const p of eng.params) { const v = hp.get(p); if (v) parts.push(v); }
  }
  return parts.length ? parts.join(' ') : null;
}

const isAscii = (s) => /^[\x00-\x7f]+$/.test(s);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 文本是否命中关键词。多个词用空格分隔的关键词表示"同时出现" */
export function matchKeyword(text, keywords) {
  if (!text) return null;
  const t = text.toLowerCase().normalize('NFKC');
  for (const kw of keywords) {
    const parts = kw.toLowerCase().normalize('NFKC').split(/\s+/).filter(Boolean);
    if (!parts.length) continue;
    const all = parts.every((p) => {
      if (isAscii(p)) return new RegExp(`(^|[^a-z0-9])${escapeRe(p)}($|[^a-z0-9])`).test(t);
      return t.includes(p);
    });
    if (all) return kw;
  }
  return null;
}

/** 主机名里是否带强特征词（只用 ≥4 个字母的 ASCII 关键词，子串匹配） */
export function matchHostKeyword(host, keywords) {
  if (!host) return null;
  const h = host.toLowerCase();
  for (const kw of keywords) {
    const k = kw.toLowerCase();
    if (/^[a-z0-9]{4,}$/.test(k) && h.includes(k)) return kw;
  }
  return null;
}

/** 搜索词里是否直接出现被屏蔽网站的名字（如搜 "nhentai"、"missav.com"） */
export function matchDomainInQuery(query, domains) {
  if (!query) return null;
  const t = query.toLowerCase().normalize('NFKC');
  for (const d of domains) {
    if (!d.includes('.')) continue; // 顶级域条目（xxx 等）跳过
    const label = d.replace(/^www\./, '').split('.')[0];
    const words = [d];
    // static.ckslb.com 这类主机名不要把最左一段当成搜索词，否则会拦下 “static”。
    if (label.length >= 5 && label !== 'static') words.push(label);
    for (const w of words) {
      if (new RegExp(`(^|[^a-z0-9])${escapeRe(w)}($|[^a-z0-9])`).test(t)) return d;
    }
  }
  return null;
}

/**
 * 判断一个 URL 是否应当被拦截。
 * @returns {null | {kind:'domain'|'keyword'|'steam', domain:string, match:string}}
 */
export function classifyUrl(url, { domains = [], keywords = [], steamMode = 'off', blockSteam = false } = {}) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.toLowerCase();
  const mode = steamMode !== 'off' ? steamMode : (blockSteam ? 'full' : 'off');

  if (mode === 'download') {
    if (isSteamDownloadUrl(url)) {
      return { kind: 'steam', domain: host, match: 'Steam Client Download' };
    }
  } else if (mode === 'full') {
    const sd = matchDomain(host, STEAM_DOMAINS);
    if (sd) return { kind: 'steam', domain: host, match: sd };
  }

  const d = matchDomain(host, domains);
  if (d) {
    if (mode === 'full' && STEAM_DOMAINS.includes(d)) return { kind: 'steam', domain: host, match: d };
    return { kind: 'domain', domain: host, match: d };
  }
  const q = searchQueryOf(url);
  if (q) {
    if (mode === 'full') {
      const skw = matchKeyword(q, STEAM_KEYWORDS);
      if (skw) return { kind: 'steam', domain: host, match: skw };
      const sdq = matchDomainInQuery(q, STEAM_DOMAINS);
      if (sdq) return { kind: 'steam', domain: host, match: sdq };
    }
    const kw = matchKeyword(q, keywords);
    if (kw) return { kind: 'keyword', domain: host, match: kw };
    const dq = matchDomainInQuery(q, domains);
    if (dq) return { kind: 'keyword', domain: host, match: dq };
  }
  const hk = matchHostKeyword(host, keywords);
  if (hk) return { kind: 'keyword', domain: host, match: hk };
  return null;
}

/** 当前生效的名单 = (默认 + 自定义) − 已移除，以及独立 Steam 封锁状态 */
export function effectiveLists(settings = {}) {
  const removedD = new Set(settings.removedDomains || []);
  const removedK = new Set(settings.removedKeywords || []);
  const steamMode = normalizeSteamMode(settings);
  const blockSteam = steamMode !== 'off';
  const baseDomains = [...new Set([...ALL_DEFAULT_DOMAINS, ...(settings.customDomains || [])])]
    .filter((d) => !removedD.has(d));
  const domains = steamMode === 'full' ? [...new Set([...baseDomains, ...STEAM_DOMAINS])] : baseDomains;
  const keywords = [...new Set([...DEFAULT_KEYWORDS, ...(settings.customKeywords || [])])]
    .filter((k) => !removedK.has(k));
  return { domains, keywords, steamMode, blockSteam };
}
