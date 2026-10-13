// Pixel comparison of two screenshot sets.
//
//   node compare.mjs <baseline-label> <current-label>
//
// Prints one line per image with the number of differing pixels and writes
// diff images to _shots/diff-<baseline>-<current>/ for the ones that differ.
// Exit code 1 when anything differs.

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [a, b] = process.argv.slice(2);
if (!a || !b) {
  console.error('usage: node compare.mjs <baseline-label> <current-label>');
  process.exit(1);
}
const dirA = path.join(ROOT, '_shots', a);
const dirB = path.join(ROOT, '_shots', b);
const outDir = path.join(ROOT, '_shots', `diff-${a}-${b}`);
await mkdir(outDir, { recursive: true });

function padTo(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height, fill: true });
  out.data.fill(255);
  PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
  return out;
}

const filesA = (await readdir(dirA)).filter((f) => f.endsWith('.png')).sort();
const filesB = new Set((await readdir(dirB)).filter((f) => f.endsWith('.png')));
let failures = 0;
const rows = [];

for (const file of filesA) {
  if (!filesB.has(file)) {
    rows.push([file, 'missing in current']);
    failures += 1;
    continue;
  }
  const imgA = PNG.sync.read(await readFile(path.join(dirA, file)));
  const imgB = PNG.sync.read(await readFile(path.join(dirB, file)));
  const width = Math.max(imgA.width, imgB.width);
  const height = Math.max(imgA.height, imgB.height);
  const pa = padTo(imgA, width, height);
  const pb = padTo(imgB, width, height);
  const diff = new PNG({ width, height });
  const n = pixelmatch(pa.data, pb.data, diff.data, width, height, { threshold: 0.1 });
  const size = imgA.height === imgB.height ? '' : ` height ${imgA.height} → ${imgB.height}`;
  if (n > 0) {
    failures += 1;
    await writeFile(path.join(outDir, file), PNG.sync.write(diff));
    rows.push([file, `${n} px${size}`]);
  } else {
    rows.push([file, 'same']);
  }
}
for (const f of filesB) if (!filesA.includes(f)) rows.push([f, 'new in current']);

const w = Math.max(...rows.map((r) => r[0].length));
for (const [file, status] of rows) console.log(`${file.padEnd(w)}  ${status}`);
console.log(`\n${failures} of ${filesA.length} differ. Diff images: ${path.relative(ROOT, outDir)}/`);
process.exit(failures ? 1 : 0);
