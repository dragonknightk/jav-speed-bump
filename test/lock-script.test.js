import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLockBat, buildLockMobileConfig } from '../src/lib/lock-script.js';

const UUID_RE = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;

test('Windows 防卸载脚本覆盖 Chrome / Edge / Brave 且转义合法', () => {
  const bat = buildLockBat();
  assert.ok(bat.includes('HKLM\\SOFTWARE\\Policies\\Google\\Chrome\\ExtensionInstallForcelist'));
  assert.ok(bat.includes('HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge\\ExtensionInstallForcelist'));
  assert.ok(bat.includes('HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave\\ExtensionInstallForcelist'));
  assert.ok(bat.includes('call :lock_browser "%CHROME_LIST%"'));
  assert.ok(bat.includes('call :lock_browser "%EDGE_LIST%"'));
  assert.ok(bat.includes('call :lock_browser "%BRAVE_LIST%"'));
  assert.ok(!bat.includes('^^^|'), '不应产生冗余转义 ^^^|');
  assert.ok(!bat.includes('rmdir /s /q \\"'), 'rmdir 路径不应使用反斜杠转义双引号');
});

test('macOS 描述文件所有 PayloadUUID 均为合法十六进制 UUID', () => {
  const xml = buildLockMobileConfig();
  const uuids = [...xml.matchAll(/<key>PayloadUUID<\/key>\s*<string>([^<]+)<\/string>/g)].map((m) => m[1]);
  assert.equal(uuids.length, 4);
  for (const id of uuids) {
    assert.match(id, UUID_RE, `非法 UUID: ${id}`);
  }
  assert.equal(new Set(uuids).size, uuids.length, 'UUID 不应重复');
});
