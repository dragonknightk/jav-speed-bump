import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { makeZip, crc32 } from '../scripts/lib/zip.mjs';

test('crc32', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('zip 可被解析', () => {
  const zip = makeZip([{ name: 'a.txt', data: Buffer.from('hello hello hello') }]);
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  const nameLen = zip.readUInt16LE(26), compLen = zip.readUInt32LE(18);
  const data = inflateRawSync(zip.subarray(30 + nameLen, 30 + nameLen + compLen));
  assert.equal(data.toString(), 'hello hello hello');
});

test('构建出两个包: Release 包外层套目录, 商店包 manifest 在根目录', async () => {
  const { execFileSync } = await import('node:child_process');
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('..', import.meta.url));
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root });
  const firstName = (buf) => buf.subarray(30, 30 + buf.readUInt16LE(26)).toString();
  assert.equal(firstName(readFileSync(root + 'dist/jav-speed-bump.zip')), 'jav-speed-bump/manifest.json');
  assert.equal(firstName(readFileSync(root + 'dist/jav-speed-bump-store.zip')), 'manifest.json');
});
