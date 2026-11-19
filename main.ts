// Vice Cover — the make.fun gta6-cover-art-01 hand-in program.
// Node 22+, standard library only, no network access. It copies the static
// app/ and the maker's screenshots/ from beside this file into the output
// directory (/output in the grader, MAKEFUN_OUTPUT_DIR elsewhere) and writes
// dossier.json with the kit's vendored library, using the scorer's own caps
// so the program fails exactly where the scorer would refuse the entry.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const SCREENSHOT_MAX_BYTES = 262144;

/** Copy one repository folder into the output directory, when it exists. */
function handIn(folder: string): void {
  const from = join(repoDir, folder);
  if (!existsSync(from)) return;
  cpSync(from, join(outputDir, folder), { recursive: true });
}

/** Fail early, with a plain reason, on deliverables the scorer would refuse. */
function validate(): void {
  const index = join(repoDir, 'app', 'index.html');
  if (!existsSync(index)) throw new Error('app/index.html is missing: the app is a directory of static files');
  const shotsDir = join(repoDir, 'screenshots');
  const shots = existsSync(shotsDir)
    ? readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort()
    : [];
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`screenshots/ holds ${shots.length} images: the gate wants 3 or 4`);
  }
  for (const name of shots) {
    const file = join(shotsDir, name);
    const st = statSync(file);
    if (!st.isFile()) throw new Error(`screenshots/${name}: not a regular file`);
    if (st.size > SCREENSHOT_MAX_BYTES) throw new Error(`screenshots/${name}: ${st.size} bytes, over the ${SCREENSHOT_MAX_BYTES} allowed`);
    const head = readFileSync(file).subarray(0, 8);
    if (!head.subarray(0, 8).equals(PNG_MAGIC) && !head.subarray(0, 3).equals(JPEG_MAGIC)) {
      throw new Error(`screenshots/${name}: neither a whole PNG nor a JPEG`);
    }
  }
}

/** Count what was handed in, against the platform's own output caps. */
function outputSummary(): string {
  let entries = 0;
  let bytes = 0;
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      entries++;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else bytes += statSync(p).size;
    }
  };
  walk(outputDir);
  if (entries > 1000) throw new Error(`/output holds ${entries} entries, over the 1000 allowed`);
  if (bytes > 64 * 1024 * 1024) throw new Error(`/output holds ${bytes} bytes, over the 64 MiB allowed`);
  return `${entries} entries, ${bytes} bytes`;
}

validate();
mkdirSync(outputDir, { recursive: true });
handIn('app');
handIn('screenshots');

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: SCREENSHOT_MAX_BYTES },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`Vice Cover handed in to ${outputDir} (${outputSummary()}; dossier ${dossier.length} bytes)`);