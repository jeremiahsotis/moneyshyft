import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const knownLibs = new Set(['auth', 'db', 'http', 'platform', 'ui-shell']);
const requestedLibs = process.argv.slice(2);
const libs = requestedLibs.length > 0 ? requestedLibs : Array.from(knownLibs);

const invalid = libs.filter((lib) => !knownLibs.has(lib));
if (invalid.length > 0) {
  console.error(`Unknown shared lib target(s): ${invalid.join(', ')}`);
  process.exit(1);
}

const tscCandidates = [
  path.join(repoRoot, 'node_modules', '.bin', 'tsc'),
  path.join(repoRoot, 'apps', 'moneyshyft-api', 'node_modules', '.bin', 'tsc'),
  path.join(repoRoot, 'apps', 'admin-api', 'node_modules', '.bin', 'tsc'),
  path.join(repoRoot, 'apps', 'moneyshyft-web', 'node_modules', '.bin', 'tsc'),
];

const tscPath = tscCandidates.find((candidate) => existsSync(candidate));
if (!tscPath) {
  console.error('Unable to find a TypeScript compiler for shared lib builds.');
  process.exit(1);
}

for (const lib of libs) {
  const tsconfigPath = path.join(repoRoot, 'libs', lib, 'tsconfig.json');
  const result = spawnSync(tscPath, ['-p', tsconfigPath], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
