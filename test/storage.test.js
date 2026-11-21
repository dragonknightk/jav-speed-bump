import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addLog, getLogs, addItem, requestRemoval, applyRemovalNow,
  getSettings, markGateTabActive, clearGateTabActive, getActiveGateLogIds,
} from '../src/lib/storage.js';

function createMockArea() {
  const store = {};
  return {
    async get(key) {
      await new Promise((r) => setTimeout(r, 5));
      if (typeof key === 'string') return { [key]: store[key] === undefined ? undefined : structuredClone(store[key]) };
      return structuredClone(store);
    },
    async set(obj) {
      await new Promise((r) => setTimeout(r, 5));
      for (const [k, v] of Object.entries(obj)) store[k] = structuredClone(v);
    },
  };
}

function setupChromeMock(liveTabs = []) {
  globalThis.chrome = {
    storage: {
      local: createMockArea(),
      session: createMockArea(),
    },
    runtime: {
      getURL: (p) => `chrome-extension://test-ext/${p}`,
    },
    tabs: {
      async query() { return liveTabs; },
    },
  };
}

test('并发 addLog 不丢记录', async () => {
  setupChromeMock();
  await Promise.all([
    addLog({ domain: 'a.com', kind: 'domain', match: 'a.com', level: 1 }),
    addLog({ domain: 'b.com', kind: 'domain', match: 'b.com', level: 1 }),
    addLog({ domain: 'c.com', kind: 'domain', match: 'c.com', level: 1 }),
  ]);
  const logs = await getLogs();
  assert.equal(logs.length, 3);
  assert.deepEqual(logs.map((l) => l.domain).sort(), ['a.com', 'b.com', 'c.com']);
});

test('addItem 校验域名与归一化关键词，移除自定义项不污染 removed 列表', async () => {
  setupChromeMock();
  assert.equal((await addItem('domain', 'com')).ok, false);
  assert.equal((await addItem('domain', '-bad.com')).ok, false);
  assert.equal((await addItem('domain', 'https://www.CustomSite.org/x')).value, 'customsite.org');

  assert.equal((await addItem('keyword', '  My   Tag ')).value, 'my tag');
  assert.equal((await addItem('keyword', 'MY TAG')).value, 'my tag');
  let s = await getSettings();
  assert.deepEqual(s.customKeywords, ['my tag']);

  const pCustom = await requestRemoval('domain', 'customsite.org');
  await applyRemovalNow(pCustom.id);
  const pDefault = await requestRemoval('domain', 'pornhub.com');
  await applyRemovalNow(pDefault.id);

  s = await getSettings();
  assert.ok(!s.customDomains.includes('customsite.org'));
  assert.ok(!s.removedDomains.includes('customsite.org'));
  assert.ok(s.removedDomains.includes('pornhub.com'));
});

test('活跃解题页登记与存活标签页交集精确过滤', async () => {
  const liveTabs = [{ id: 101 }];
  setupChromeMock(liveTabs);
  await markGateTabActive(101, 'log-1');
  await markGateTabActive(102, 'log-2'); // 102 已不在存活标签中
  let active = await getActiveGateLogIds();
  assert.deepEqual([...active], ['log-1']);

  await clearGateTabActive(101);
  active = await getActiveGateLogIds();
  assert.deepEqual([...active], []);
});
