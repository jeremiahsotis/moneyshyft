#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const sourceDirectory = path.join(projectRoot, 'shared/database/migrations');
const outputDirectory = path.join(__dirname, '..', 'dist/shared/database/migrations');

function requireTypeScript() {
  try {
    // eslint-disable-next-line global-require
    return require('typescript');
  } catch (error) {
    const candidate = path.join(__dirname, '..', 'node_modules/typescript');
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(candidate);
  }
}

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

function transpileMigrationFile(ts, fileName) {
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

function main() {
  const ts = requireTypeScript();
  ensureDirectory(outputDirectory);
  clearDirectory(outputDirectory);

  const migrationFiles = listMigrationFiles(sourceDirectory);
  migrationFiles.forEach((fileName) => transpileMigrationFile(ts, fileName));

  console.log(
    `Packaged ${migrationFiles.length} shared migrations into ${path.relative(projectRoot, outputDirectory)}`
  );
}

main();
