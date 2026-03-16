#!/usr/bin/env node
const path = require('path');
const { packageSharedMigrations } = require('../../../libs/db/scripts/packageSharedMigrations.js');

const outputDirectory = path.join(__dirname, '..', 'dist', 'shared', 'database', 'migrations');
const sourceDirectory = path.resolve(__dirname, '../../../shared/database/migrations');

const result = packageSharedMigrations({
  outputDirectory,
  sourceDirectory,
  typescriptModuleBase: path.join(__dirname, '..'),
});

console.log(
  `Packaged ${result.migrationCount} shared migrations into ${path.relative(process.cwd(), outputDirectory)}`
);
