// Vice Cover hand-in program for make.fun gta6-cover-art-01.
// Node 22+, standard library only, no network, no clock, no randomness: two
// runs over the same repository write byte-identical output. It copies app/
// and screenshots/ into the output directory (/output under the grader,
// MAKEFUN_OUTPUT_DIR elsewhere), checks the scorer's caps up front, and writes
// dossier.json with the kit's vendored buildDossier.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const SHOT_CAP_BYTES = 256 * 1024;
const SHOT_NAME_OK = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/** Recursive copy with plain files only; symlinks are refused. */
function copyTree(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const src = join(from, entry.name);
    const dst = join(to, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`${relative(repoRoot, src)}: symlinks are not allowed`);
    if (entry.isDirectory()) copyTree(src, dst);
    else if (entry.isFile()) copyFileSync(src, dst);
    else throw new Error(`${relative(repoRoot, src)}: not a regular file or directory`);
  }
}

/** PNG size from the IHDR chunk. */
function pngSize(bytes: Buffer): { w: number; h: number } | null {
  if (bytes.length < 24 || bytes.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
}

/** JPEG size by walking markers to the first start-of-frame. */
function jpegSize(bytes: Buffer): { w: number; h: number } | null {
  let p = 2;
  while (p + 9 < bytes.length) {
    if (bytes[p] !== 0xff) { p++; continue; }
    const marker = bytes[p + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { p += 2; continue; }
    const len = bytes.readUInt16BE(p + 2);
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof) return { h: bytes.readUInt16BE(p + 5), w: bytes.readUInt16BE(p + 7) };
    p += 2 + len;
  }
  return null;
}

function checkScreenshots(): string[] {
  const dir = join(repoRoot, 'screenshots');
  if (!existsSync(dir)) throw new Error('screenshots/ is missing: the gate wants 3 or 4 images');
  const names = readdirSync(dir).filter((n) => !n.startsWith('.')).sort();
  if (names.length < 3 || names.length > 4) {
    throw new Error(`screenshots/ holds ${names.length} images; the gate wants 3 or 4`);
  }
  for (const name of names) {
    if (!SHOT_NAME_OK.test(name)) throw new Error(`screenshots/${name}: name outside letters, digits, . _ -`);
    const path = join(dir, name);
    const st = statSync(path);
    if (!st.isFile()) throw new Error(`screenshots/${name}: not a regular file`);
    if (st.size > SHOT_CAP_BYTES) throw new Error(`screenshots/${name}: ${st.size} bytes exceeds the 256 KiB cap`);
    const bytes = readFileSync(path);
    const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!isPng && !isJpeg) throw new Error(`screenshots/${name}: neither a whole PNG nor a JPEG`);
    // whole images only: PNG must close with IEND, JPEG with an EOI marker
    if (isPng && bytes.toString('ascii', bytes.length - 8, bytes.length - 4) !== 'IEND') {
      throw new Error(`screenshots/${name}: truncated PNG (no IEND)`);
    }
    if (isJpeg && !(bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9)) {
      throw new Error(`screenshots/${name}: truncated JPEG (no EOI)`);
    }
    const size = isPng ? pngSize(bytes) : jpegSize(bytes);
    if (!size) throw new Error(`screenshots/${name}: could not read image dimensions`);
    const long = Math.max(size.w, size.h);
    const short = Math.min(size.w, size.h);
    if (long > 1280 || short < 480) {
      throw new Error(`screenshots/${name}: ${size.w}x${size.h} outside the 1280 long / 480 short side caps`);
    }
  }
  return names;
}

function checkApp(): void {
  const index = join(repoRoot, 'app', 'index.html');
  if (!existsSync(index)) throw new Error('app/index.html is missing');
  if (statSync(index).size > 1024 * 1024) throw new Error('app/index.html exceeds 1 MiB');
}

/** Walk the finished output against the platform caps (1000 entries, 64 MiB). */
function auditOutput(): { entries: number; bytes: number } {
  let entries = 0;
  let bytes = 0;
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      entries++;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else bytes += statSync(path).size;
    }
  };
  walk(outDir);
  if (entries > 1000) throw new Error(`output holds ${entries} entries, over the 1000 cap`);
  if (bytes > 64 * 1024 * 1024) throw new Error(`output holds ${bytes} bytes, over the 64 MiB cap`);
  return { entries, bytes };
}

checkApp();
const shotNames = checkScreenshots();

mkdirSync(outDir, { recursive: true });
copyTree(join(repoRoot, 'app'), join(outDir, 'app'));
copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: SHOT_CAP_BYTES },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
});
if (dossier.length > 1.5 * 1024 * 1024) throw new Error(`dossier.json is ${dossier.length} bytes, over the 1.5 MiB cap`);
writeFileSync(join(outDir, 'dossier.json'), dossier);

const audit = auditOutput();
console.log(
  `Vice Cover handed in: ${audit.entries} entries / ${audit.bytes} bytes at ${outDir}; ` +
  `dossier ${dossier.length} bytes; screenshots ${shotNames.join(', ')}`,
);