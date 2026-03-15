#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function clearDirectory(directory) {
  if (!fs.existsSync(directory)) {
    return;
  }

  for (const entry of fs.readdirSync(directory)) {
    fs.rmSync(path.join(directory, entry), { force: true, recursive: true });
  }
}

function listMigrationFiles(directory) {
  if (!fs.existsSync(directory)) {
    throw new Error(`Shared migration source directory not found: ${directory}`);
  }

  return fs
    .readdirSync(directory)
    .filter((fileName) => /\.(ts|js)$/.test(fileName))
    .sort();
}

function requireTypeScript(moduleBase) {
  const candidateBases = [moduleBase, process.cwd()].filter(Boolean);

  for (const base of candidateBases) {
    const packageJsonPath = path.join(base, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }

    try {
      return createRequire(packageJsonPath)('typescript');
    } catch (error) {
      // Try the next candidate.
    }
  }

  try {
    return require('typescript');
  } catch (error) {
    throw new Error(
      [
        'Unable to resolve the TypeScript compiler for shared migration packaging.',
        'Set --typescript-module-base to an app directory with a local typescript dependency.'
      ].join(' ')
    );
  }
}

function transpileMigrationFile(ts, sourceDirectory, outputDirectory, fileName) {
  const sourcePath = path.join(sourceDirectory, fileName);
  const sourceText = fs.readFileSync(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
    },
    fileName: sourcePath,
  });

  const outputFileName = fileName.replace(/\.(ts|js)$/, '.js');
  fs.writeFileSync(path.join(outputDirectory, outputFileName), transpiled.outputText, 'utf8');
}

function packageSharedMigrations(options) {
  const projectRoot =
    options.projectRoot || path.resolve(__dirname, '..', '..', '..');
  const sourceDirectory =
    options.sourceDirectory || path.join(projectRoot, 'shared', 'database', 'migrations');
  const outputDirectory = options.outputDirectory;
  const typescriptModuleBase = options.typescriptModuleBase || process.cwd();

  if (!outputDirectory) {
    throw new Error('outputDirectory is required for shared migration packaging');
  }

  const ts = requireTypeScript(typescriptModuleBase);
  ensureDirectory(outputDirectory);
  clearDirectory(outputDirectory);

  const migrationFiles = listMigrationFiles(sourceDirectory);
  migrationFiles.forEach((fileName) =>
    transpileMigrationFile(ts, sourceDirectory, outputDirectory, fileName)
  );

  return {
    migrationCount: migrationFiles.length,
    outputDirectory,
    sourceDirectory,
  };
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--output' && next) {
      parsed.outputDirectory = next;
      index += 1;
      continue;
    }

    if (arg === '--source' && next) {
      parsed.sourceDirectory = next;
      index += 1;
      continue;
    }

    if (arg === '--typescript-module-base' && next) {
      parsed.typescriptModuleBase = next;
      index += 1;
      continue;
    }
  }

  return parsed;
}

function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const result = packageSharedMigrations(options);

  console.log(
    `Packaged ${result.migrationCount} shared migrations into ${path.relative(process.cwd(), result.outputDirectory)}`
  );
}

if (require.main === module) {
  runCli();
}

module.exports = {
  packageSharedMigrations,
  runCli,
};
