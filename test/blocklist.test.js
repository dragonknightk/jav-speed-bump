import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyUrl, matchDomain, matchKeyword, searchQueryOf, normalizeDomain,
  effectiveLists, ALL_DEFAULT_DOMAINS, DEFAULT_DOMAINS, DEFAULT_KEYWORDS,
  STEAM_DOMAINS, STEAM_KEYWORDS, isSteamDomain, isSteamDownloadUrl,
} from '../src/lib/blocklist.js';

const NEW_DOMAINS = [
  'vikacg.com', 'rou.video', 'cangku.moe', 'cagame.net', 'rdz4.xyz',
  'rou.pub', 'rouvb1.xyz', 'rouman5.com', 'roum29.xyz', 'static.ckslb.com',
];

const lists = effectiveLists({});

test('默认名单没有重复、格式正确', () => {
  assert.equal(new Set(ALL_DEFAULT_DOMAINS).size, ALL_DEFAULT_DOMAINS.length);
  for (const d of ALL_DEFAULT_DOMAINS) assert.equal(normalizeDomain(d), d);
  assert.ok(ALL_DEFAULT_DOMAINS.length > 100);
});

test('域名匹配含子域名，不误伤相似域名', () => {
  assert.equal(matchDomain('www.pornhub.com', lists.domains), 'pornhub.com');
  assert.equal(matchDomain('cn.pornhub.com', lists.domains), 'pornhub.com');
  assert.equal(matchDomain('foo.xxx', lists.domains), 'xxx');
  assert.equal(matchDomain('notpornhub.com.cn', lists.domains), null);
  assert.equal(matchDomain('github.com', lists.domains), null);
});

test('normalizeDomain', () => {
  assert.equal(normalizeDomain('https://www.Example.com/path?q=1'), 'example.com');
  assert.equal(normalizeDomain('*.foo.org'), 'foo.org');
  assert.equal(normalizeDomain('  bar.net:8080 '), 'bar.net');
});

test('搜索词提取', () => {
  assert.equal(searchQueryOf('https://www.google.com/search?q=hello+world'), 'hello world');
  assert.equal(searchQueryOf('https://www.baidu.com/s?wd=%E7%95%AA%E5%8F%B7'), '番号');
  assert.equal(searchQueryOf('https://cn.bing.com/search?q=test'), 'test');
  assert.equal(searchQueryOf('https://www.google.com.hk/search?q=a'), 'a');
  assert.equal(searchQueryOf('https://example.com/?q=porn'), null);
});

test('关键词：整词匹配，不误伤 java / javascript', () => {
  assert.equal(matchKeyword('jav 推荐', DEFAULT_KEYWORDS), 'jav');
  assert.equal(matchKeyword('JAV', DEFAULT_KEYWORDS), 'jav');
  assert.equal(matchKeyword('java tutorial', DEFAULT_KEYWORDS), null);
  assert.equal(matchKeyword('javascript closure', DEFAULT_KEYWORDS), null);
  assert.equal(matchKeyword('今天的天气', DEFAULT_KEYWORDS), null);
  assert.equal(matchKeyword('最新番号', DEFAULT_KEYWORDS), '番号');
  assert.equal(matchKeyword('本子', ['本子 汉化']), null);
  assert.equal(matchKeyword('汉化 本子', ['本子 汉化']), '本子 汉化');
  assert.equal(matchKeyword('ＪＡＶ', DEFAULT_KEYWORDS), 'jav'); // 全角
});

test('classifyUrl 综合', () => {
  assert.equal(classifyUrl('https://missav.com/dm1/xxx', lists).kind, 'domain');
  assert.equal(classifyUrl('https://www.google.com/search?q=nhentai', lists).kind, 'keyword');
  assert.equal(classifyUrl('https://www.baidu.com/s?wd=av%E5%A5%B3%E4%BC%98', lists).kind, 'keyword');
  assert.equal(classifyUrl('https://some-new-porn-site.net/', lists).kind, 'keyword'); // 域名里带 porn
  assert.equal(classifyUrl('https://www.google.com/search?q=java+stream', lists), null);
  assert.equal(classifyUrl('https://developer.mozilla.org/javascript', lists), null);
  assert.equal(classifyUrl('chrome://extensions', lists), null);
  assert.equal(classifyUrl('not a url', lists), null);
});

test('effectiveLists 应用自定义与移除', () => {
  const l = effectiveLists({ customDomains: ['foo.com'], removedDomains: ['pornhub.com'], removedKeywords: ['jav'], customKeywords: ['abc'] });
  assert.ok(l.domains.includes('foo.com'));
  assert.ok(!l.domains.includes('pornhub.com'));
  assert.ok(!l.keywords.includes('jav'));
  assert.ok(l.keywords.includes('abc'));
});

test('新增默认域名在对应分组里，且子域名命中、相似域名不误伤', () => {
  const hentai = new Set(DEFAULT_DOMAINS.hentai);
  const mainstream = new Set(DEFAULT_DOMAINS.mainstream);
  for (const d of ['vikacg.com', 'cangku.moe', 'cagame.net']) assert.ok(hentai.has(d), d);
  for (const d of ['rou.video', 'rou.pub', 'rouvb1.xyz', 'rouman5.com', 'roum29.xyz', 'rdz4.xyz', 'static.ckslb.com']) assert.ok(mainstream.has(d), d);
  assert.equal(new Set(ALL_DEFAULT_DOMAINS).size, ALL_DEFAULT_DOMAINS.length);
  for (const d of NEW_DOMAINS) {
    assert.ok(ALL_DEFAULT_DOMAINS.includes(d));
    assert.equal(matchDomain(d, lists.domains), d);
    assert.equal(matchDomain(`www.${d}`, lists.domains), d);
    assert.equal(matchDomain(`cdn.${d}`, lists.domains), d);
    assert.equal(classifyUrl(`https://${d}/watch`, lists).kind, 'domain');
    assert.equal(matchDomain(`not${d}`, lists.domains), null);
  }
  assert.equal(matchDomain('ckslb.com', lists.domains), null);
  assert.equal(matchDomain('rou.video.example', lists.domains), null);
  assert.equal(classifyUrl('https://www.google.com/search?q=static+site', lists), null);
  assert.equal(classifyUrl('https://www.google.com/search?q=static.ckslb.com', lists)?.match, 'static.ckslb.com');
});

test('用户移除过的默认域名不会重新生效', () => {
  const l = effectiveLists({ removedDomains: ['vikacg.com'], customDomains: ['keep.example'] });
  assert.ok(!l.domains.includes('vikacg.com'));
  assert.ok(l.domains.includes('rou.video'));
  assert.ok(l.domains.includes('keep.example'));
});

test('搜索词里出现被屏蔽网站名也拦截', () => {
  const lists = { domains: ALL_DEFAULT_DOMAINS, keywords: DEFAULT_KEYWORDS };
  assert.equal(classifyUrl('https://www.google.com/search?q=nhentai+best', lists)?.kind, 'keyword');
  assert.equal(classifyUrl('https://www.bing.com/search?q=missav.com', lists)?.kind, 'keyword');
  assert.equal(classifyUrl('https://www.google.com/search?q=python+tutorial', lists), null);
});

test('Steam 分级防护：默认关闭 / 仅拦截客户端下载 (download) / 全面封锁 (full)', () => {
  // 1. 默认关闭 ('off')
  assert.equal(lists.steamMode, 'off');
  assert.equal(lists.blockSteam, false);
  assert.equal(classifyUrl('https://store.steampowered.com/', lists), null);
  assert.equal(classifyUrl('https://store.steampowered.com/about/', lists), null);
  assert.equal(classifyUrl('https://cdn.fastly.steamstatic.com/client/installer/SteamSetup.exe', lists), null);
  assert.equal(classifyUrl('https://www.google.com/search?q=steam', lists), null);

  // 2. 轻量档 ('download')：仅拦截客户端下载页与安装包直链，不拦搜索、商店与社区
  const dlLists = effectiveLists({ steamMode: 'download' });
  assert.equal(dlLists.steamMode, 'download');
  assert.equal(dlLists.blockSteam, true);

  // 搜索与正常浏览放行
  assert.equal(classifyUrl('https://www.google.com/search?q=steam+download', dlLists), null);
  assert.equal(classifyUrl('https://www.baidu.com/s?wd=steam', dlLists), null);
  assert.equal(classifyUrl('https://store.steampowered.com/', dlLists), null);
  assert.equal(classifyUrl('https://store.steampowered.com/app/1091500/Cyberpunk_2077/', dlLists), null);
  assert.equal(classifyUrl('https://steamcommunity.com/discussions/', dlLists), null);

  // 客户端下载页与安装包直链精准拦截
  assert.ok(isSteamDownloadUrl('https://store.steampowered.com/about'));
  assert.ok(isSteamDownloadUrl('https://store.steampowered.com/about/'));
  assert.ok(isSteamDownloadUrl('https://cdn.fastly.steamstatic.com/client/installer/SteamSetup.exe'));
  assert.ok(!isSteamDownloadUrl('https://store.steampowered.com/app/1091500/'));

  const rAbout = classifyUrl('https://store.steampowered.com/about/', dlLists);
  assert.equal(rAbout?.kind, 'steam');
  assert.equal(rAbout?.match, 'Steam Client Download');

  const rInstaller = classifyUrl('https://cdn.fastly.steamstatic.com/client/installer/SteamSetup.exe', dlLists);
  assert.equal(rInstaller?.kind, 'steam');
  assert.equal(rInstaller?.match, 'Steam Client Download');

  // 3. 严格档 ('full')：全面拦截 Steam 域名、安装包与搜索词（同时兼容旧字段 blockSteam: true）
  const steamLists = effectiveLists({ steamMode: 'full' });
  assert.equal(steamLists.steamMode, 'full');
  assert.equal(steamLists.blockSteam, true);
  assert.equal(effectiveLists({ blockSteam: true }).steamMode, 'full');

  for (const sd of STEAM_DOMAINS) {
    assert.ok(steamLists.domains.includes(sd), sd);
    assert.ok(isSteamDomain(sd));
    assert.ok(isSteamDomain(`sub.${sd}`));
  }
  assert.ok(STEAM_KEYWORDS.includes('steam'));

  const rStore = classifyUrl('https://store.steampowered.com/', steamLists);
  assert.equal(rStore?.kind, 'steam');
  assert.equal(rStore?.match, 'steampowered.com');

  const rCdn = classifyUrl('https://cdn.fastly.steamstatic.com/client/installer/SteamSetup.exe', steamLists);
  assert.equal(rCdn?.kind, 'steam');
  assert.equal(rCdn?.match, 'steamstatic.com');

  const rComm = classifyUrl('https://steamcommunity.com/app/12345', steamLists);
  assert.equal(rComm?.kind, 'steam');

  const rGoogle = classifyUrl('https://www.google.com/search?q=steam+download', steamLists);
  assert.equal(rGoogle?.kind, 'steam');
  assert.equal(rGoogle?.match, 'steam');

  const rBaidu = classifyUrl('https://www.baidu.com/s?wd=' + encodeURIComponent('steam下载'), steamLists);
  assert.equal(rBaidu?.kind, 'steam');

  // 不误伤 stream 等词
  assert.equal(classifyUrl('https://www.google.com/search?q=java+stream', steamLists), null);
});
