import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** 扩展包内容：manifest.json + _locales/ + src/ 下所有文件（排除隐藏文件） */
export function extensionFiles(manifestOverride) {
  const dirs = [join(ROOT, '_locales'), join(ROOT, 'src')];
  const files = dirs.flatMap(walk)
    .map((p) => relative(ROOT, p).split('\\').join('/'))
    .filter((n) => !n.split('/').some((seg) => seg.startsWith('.')))
    .sort();
  const manifest = manifestOverride ?? JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
  return [
    { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2)) },
    ...files.map((n) => ({ name: n, data: readFileSync(join(ROOT, n)) })),
  ];
}

export function readManifest() {
  return JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
}
