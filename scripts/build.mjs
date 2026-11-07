// 生成两个包:
// dist/jav-speed-bump.zip        外层套一层 jav-speed-bump/ 目录, 发到 Release, 解压后直接"加载已解压的扩展程序"
// dist/jav-speed-bump-store.zip  manifest.json 在根目录, 只用来上传 Chrome 应用商店
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, extensionFiles, readManifest } from './files.mjs';
import { makeZip } from './lib/zip.mjs';

const manifest = readManifest();
const files = extensionFiles(manifest);
mkdirSync(join(ROOT, 'dist'), { recursive: true });
const outputs = [
  ['jav-speed-bump.zip', files.map((f) => ({ ...f, name: `jav-speed-bump/${f.name}` }))],
  ['jav-speed-bump-store.zip', files],
];
for (const [name, entries] of outputs) {
  const out = join(ROOT, 'dist', name);
  const zip = makeZip(entries);
  writeFileSync(out, zip);
  console.log(`✓ ${out} (${files.length} 个文件, ${(zip.length / 1024).toFixed(1)} KB, v${manifest.version})`);
}
