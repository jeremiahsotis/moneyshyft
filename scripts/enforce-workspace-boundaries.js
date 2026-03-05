#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();

const LANE_TAGS = ['lane:routeshyft', 'lane:connectshyft', 'lane:signshyft'];
const SHARED_TAG = 'scope:shared';
const LEGACY_LANE_TAGS = ['lane:moneyshyft'];
const DEPENDENCY_RULES = {
  'lane:routeshyft': ['lane:routeshyft', SHARED_TAG],
  'lane:connectshyft': ['lane:connectshyft', SHARED_TAG],
  'lane:signshyft': ['lane:signshyft', SHARED_TAG],
  'scope:shared': [SHARED_TAG],
};
const SCAN_ROOTS = ['apps', 'tools', 'packages', 'libs'];
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.nx', '.cache']);
const SOURCE_FILE_PATTERN = /\.(ts|tsx|js|jsx|mjs|cjs|vue)$/i;

function run(command) {
  try {
    return childProcess.execSync(command, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (_error) {
    return '';
  }
}

function runLines(command) {
  const output = run(command).trim();
  if (!output) {
    return [];
  }
  return output
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function normalizeRelative(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function listFilesRecursively(relativeDir, matcher) {
  const rootPath = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  const result = [];
  const stack = [rootPath];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      const relative = normalizeRelative(path.relative(repoRoot, absolute));

      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) {
          continue;
        }
        stack.push(absolute);
        continue;
      }

      if (matcher(relative)) {
        result.push(relative);
      }
    }
  }

  return result.sort();
}

function collectProjectJsonFiles() {
  const files = [];
  for (const root of SCAN_ROOTS) {
    files.push(
      ...listFilesRecursively(root, (relative) => relative.endsWith('/project.json') || relative === 'project.json'),
    );
  }
  return Array.from(new Set(files)).sort();
}

function collectSharedPackageDirs() {
  const packagesRoot = path.join(repoRoot, 'packages');
  if (!fs.existsSync(packagesRoot)) {
    return [];
  }
  return fs
    .readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('shared-'))
    .map((entry) => normalizeRelative(path.join('packages', entry.name)))
    .sort();
}

function readJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function toSortedUnique(values) {
  return Array.from(new Set(values)).sort();
}

function stripPackageScope(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }
  if (!name.startsWith('@')) {
    return name;
  }
  const parts = name.split('/');
  return parts.length > 1 ? parts[1] : '';
}

function extractProjectDescriptors(projectFiles, issues) {
  const descriptors = [];

  for (const projectFile of projectFiles) {
    let projectConfig;
    try {
      projectConfig = readJson(projectFile);
    } catch (error) {
      issues.push(`${projectFile}: unable to parse JSON (${error.message})`);
      continue;
    }

    const tags = Array.isArray(projectConfig.tags)
      ? projectConfig.tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0).map((tag) => tag.trim())
      : [];
    const laneTags = tags.filter((tag) => tag.startsWith('lane:'));
    const hasSharedTag = tags.includes(SHARED_TAG);
    const projectRoot = normalizeRelative(path.dirname(projectFile));
    const sourceRoot =
      typeof projectConfig.sourceRoot === 'string' && projectConfig.sourceRoot.trim().length > 0
        ? normalizeRelative(projectConfig.sourceRoot.trim())
        : projectRoot;
    const importIds = new Set();

    if (typeof projectConfig.name === 'string' && projectConfig.name.trim().length > 0) {
      const projectName = projectConfig.name.trim();
      importIds.add(projectName);
      const unscopedProjectName = stripPackageScope(projectName);
      if (unscopedProjectName) {
        importIds.add(unscopedProjectName);
      }
    }

    const packageJsonPath = path.join(repoRoot, projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (typeof packageJson.name === 'string' && packageJson.name.trim().length > 0) {
          const packageName = packageJson.name.trim();
          importIds.add(packageName);
          const unscopedPackageName = stripPackageScope(packageName);
          if (unscopedPackageName) {
            importIds.add(unscopedPackageName);
          }
        }
      } catch (error) {
        issues.push(`${projectRoot}/package.json: unable to parse JSON (${error.message})`);
      }
    }

    const rootBasename = path.basename(projectRoot);
    if (rootBasename) {
      importIds.add(rootBasename);
    }

    descriptors.push({
      projectFile,
      projectRoot,
      sourceRoot,
      tags,
      laneTags,
      hasSharedTag,
      laneTag: laneTags.length === 1 ? laneTags[0] : null,
      importIds: Array.from(importIds),
    });
  }

  return descriptors;
}

function gatherChangedFiles() {
  const changed = new Set();

  const add = (items) => {
    for (const item of items) {
      changed.add(normalizeRelative(item));
    }
  };

  const workingTree = runLines('git diff --name-only --diff-filter=AM');
  const staged = runLines('git diff --cached --name-only --diff-filter=AM');
  const untracked = runLines('git ls-files --others --exclude-standard');

  add(workingTree);
  add(staged);
  add(untracked);

  if (changed.size === 0) {
    const baseRef = (process.env.GITHUB_BASE_REF || '').trim();
    if (baseRef && run(`git rev-parse --verify --quiet origin/${baseRef}`)) {
      add(runLines(`git diff --name-only --diff-filter=AM origin/${baseRef}...HEAD`));
    } else if (run('git rev-parse --verify --quiet HEAD~1')) {
      add(runLines('git diff --name-only --diff-filter=AM HEAD~1...HEAD'));
    }
  }

  return Array.from(changed).sort();
}

function extractImportSpecifiers(line) {
  const specifiers = [];
  const pattern = /(?:from\s+['"]([^'"]+)['"])|(?:import\s+['"]([^'"]+)['"])|(?:require\(\s*['"]([^'"]+)['"]\s*\))/g;

  let match = pattern.exec(line);
  while (match) {
    const specifier = match[1] || match[2] || match[3];
    if (specifier) {
      specifiers.push(specifier);
    }
    match = pattern.exec(line);
  }

  return specifiers;
}

function isWorkspaceSourceFile(filePath) {
  if (!SOURCE_FILE_PATTERN.test(filePath)) {
    return false;
  }
  return SCAN_ROOTS.some((root) => filePath === root || filePath.startsWith(`${root}/`));
}

function isDisallowedSharedImport(specifier, sourceFile) {
  const directSharedPathPattern = /packages\/shared-[^/]+\/src(?:\/.*)?$/;
  const directSharedIndexPattern = /packages\/shared-[^/]+\/src\/index(?:\.[a-z0-9]+)?$/i;
  const scopedSharedDeepPattern = /^@[^/]+\/shared-[^/]+\/.+/;
  const unscopedSharedDeepPattern = /^shared-[^/]+\/.+/;

  if (scopedSharedDeepPattern.test(specifier) || unscopedSharedDeepPattern.test(specifier)) {
    return true;
  }

  if (directSharedPathPattern.test(specifier) && !directSharedIndexPattern.test(specifier)) {
    return true;
  }

  if (!specifier.startsWith('.')) {
    return false;
  }

  const sourceAbsolute = path.join(repoRoot, sourceFile);
  const resolved = normalizeRelative(path.relative(repoRoot, path.resolve(path.dirname(sourceAbsolute), specifier)));
  if (directSharedPathPattern.test(resolved) && !directSharedIndexPattern.test(resolved)) {
    return true;
  }

  return false;
}

function validateProjectTags(projectFiles, issues) {
  for (const descriptor of projectFiles) {
    const { projectFile, tags, laneTags, hasSharedTag } = descriptor;

    if (tags.length === 0) {
      issues.push(`${projectFile}: missing tags[] classification. Add exactly one lane:* tag or scope:shared.`);
      continue;
    }

    if (laneTags.length > 1) {
      issues.push(`${projectFile}: multiple lane tags are not allowed (${laneTags.join(', ')}).`);
    }

    for (const laneTag of laneTags) {
      if (LEGACY_LANE_TAGS.includes(laneTag)) {
        issues.push(
          `${projectFile}: legacy lane tag '${laneTag}' is not allowed. Use one of: ${LANE_TAGS.join(', ')}.`,
        );
      } else if (!LANE_TAGS.includes(laneTag)) {
        issues.push(`${projectFile}: unknown lane tag '${laneTag}'. Allowed lane tags: ${LANE_TAGS.join(', ')}.`);
      }
    }

    const classificationCount = laneTags.length + (hasSharedTag ? 1 : 0);
    if (classificationCount === 0) {
      issues.push(
        `${projectFile}: must include exactly one lane tag (${LANE_TAGS.join(', ')}) or '${SHARED_TAG}' for shared packages.`,
      );
    }
    if (classificationCount > 1) {
      issues.push(`${projectFile}: ambiguous classification. Do not combine lane:* tags with '${SHARED_TAG}'.`);
    }

    if (projectFile.startsWith('packages/shared-') && !hasSharedTag) {
      issues.push(`${projectFile}: shared package projects must include '${SHARED_TAG}'.`);
    }

    if (!projectFile.startsWith('packages/shared-') && hasSharedTag) {
      issues.push(
        `${projectFile}: '${SHARED_TAG}' is only allowed for projects under packages/shared-*; use exactly one lane tag.`,
      );
    }
  }
}

function validateDependencyConstraints(projectFiles, issues) {
  if (projectFiles.length === 0) {
    return;
  }

  const eslintConfigPath = path.join(repoRoot, '.eslintrc.cjs');
  if (!fs.existsSync(eslintConfigPath)) {
    issues.push('.eslintrc.cjs: missing ESLint boundary configuration.');
    return;
  }

  let config;
  try {
    delete require.cache[require.resolve(eslintConfigPath)];
    config = require(eslintConfigPath);
  } catch (error) {
    issues.push(`.eslintrc.cjs: failed to load configuration (${error.message}).`);
    return;
  }

  const overrides = Array.isArray(config.overrides) ? config.overrides : [];
  const boundaryOverride = overrides.find(
    (override) =>
      override &&
      typeof override === 'object' &&
      override.rules &&
      Object.prototype.hasOwnProperty.call(override.rules, '@nx/enforce-module-boundaries'),
  );

  if (!boundaryOverride) {
    issues.push('.eslintrc.cjs: missing @nx/enforce-module-boundaries rule.');
    return;
  }

  const boundaryRule = boundaryOverride.rules['@nx/enforce-module-boundaries'];
  const boundaryOptions =
    Array.isArray(boundaryRule) && boundaryRule.length > 1 && boundaryRule[1] && typeof boundaryRule[1] === 'object'
      ? boundaryRule[1]
      : null;
  const depConstraints = Array.isArray(boundaryOptions?.depConstraints) ? boundaryOptions.depConstraints : [];

  for (const [sourceTag, expectedTargets] of Object.entries(DEPENDENCY_RULES)) {
    const constraint = depConstraints.find((item) => item && item.sourceTag === sourceTag);
    if (!constraint) {
      issues.push(`.eslintrc.cjs: missing depConstraints rule for '${sourceTag}'.`);
      continue;
    }

    const actualTargets = toSortedUnique(
      Array.isArray(constraint.onlyDependOnLibsWithTags) ? constraint.onlyDependOnLibsWithTags : [],
    );
    const expected = toSortedUnique(expectedTargets);
    if (actualTargets.join(',') !== expected.join(',')) {
      issues.push(
        `.eslintrc.cjs: '${sourceTag}' must only depend on [${expected.join(', ')}], found [${actualTargets.join(', ')}].`,
      );
    }
  }

  const legacyConstraint = depConstraints.find((item) => item && item.sourceTag === 'lane:moneyshyft');
  if (legacyConstraint) {
    issues.push(".eslintrc.cjs: remove legacy depConstraints for 'lane:moneyshyft'.");
  }
}

function validateSharedPackageEntrypoints(sharedPackageDirs, issues) {
  for (const packageDir of sharedPackageDirs) {
    const publicEntrypoint = path.join(repoRoot, packageDir, 'src/index.ts');
    if (!fs.existsSync(publicEntrypoint)) {
      issues.push(
        `${packageDir}: missing public entrypoint src/index.ts. Shared packages must expose a single import boundary.`,
      );
    }
  }
}

function validateDeepImports(issues) {
  let candidateFiles = gatherChangedFiles().filter((file) => isWorkspaceSourceFile(file));
  if (candidateFiles.length === 0) {
    candidateFiles = runLines('git ls-files').filter((file) => isWorkspaceSourceFile(file));
  }

  for (const file of candidateFiles) {
    const absolutePath = path.join(repoRoot, file);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    let content;
    try {
      content = fs.readFileSync(absolutePath, 'utf8');
    } catch (_error) {
      continue;
    }

    const lines = content.split(/\r?\n/g);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const specifiers = extractImportSpecifiers(line);
      for (const specifier of specifiers) {
        if (isDisallowedSharedImport(specifier, file)) {
          issues.push(
            `${file}:${index + 1}: deep/shared boundary import '${specifier}' is forbidden. Import shared packages through the package root and re-export via src/index.ts.`,
          );
        }
      }
    }
  }
}

function buildProjectLookup(projectDescriptors) {
  const byProjectRoot = projectDescriptors
    .slice()
    .sort((left, right) => right.projectRoot.length - left.projectRoot.length);
  const bySourceRoot = projectDescriptors
    .slice()
    .sort((left, right) => right.sourceRoot.length - left.sourceRoot.length);
  const byImportId = new Map();

  for (const descriptor of projectDescriptors) {
    for (const importId of descriptor.importIds) {
      if (!importId) {
        continue;
      }
      const normalizedImportId = importId.trim();
      if (!normalizedImportId) {
        continue;
      }
      const existing = byImportId.get(normalizedImportId) || [];
      existing.push(descriptor);
      byImportId.set(normalizedImportId, existing);
    }
  }

  return { byProjectRoot, bySourceRoot, byImportId };
}

function findOwningProjectForWorkspacePath(relativePath, lookup) {
  const normalizedPath = normalizeRelative(relativePath);
  const isMatch = (candidatePath, rootPath) => candidatePath === rootPath || candidatePath.startsWith(`${rootPath}/`);

  for (const descriptor of lookup.bySourceRoot) {
    if (isMatch(normalizedPath, descriptor.sourceRoot)) {
      return descriptor;
    }
  }

  for (const descriptor of lookup.byProjectRoot) {
    if (isMatch(normalizedPath, descriptor.projectRoot)) {
      return descriptor;
    }
  }

  return null;
}

function resolveWorkspacePathSpecifier(specifier, sourceFile) {
  if (specifier.startsWith('.')) {
    const sourceAbsolute = path.join(repoRoot, sourceFile);
    return normalizeRelative(path.relative(repoRoot, path.resolve(path.dirname(sourceAbsolute), specifier)));
  }

  const normalized = normalizeRelative(specifier.replace(/^\/+/, ''));
  if (SCAN_ROOTS.some((root) => normalized === root || normalized.startsWith(`${root}/`))) {
    return normalized;
  }

  return null;
}

function toImportRoot(specifier) {
  if (!specifier || typeof specifier !== 'string') {
    return '';
  }

  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }

  const [root] = specifier.split('/');
  return root || '';
}

function findProjectForSpecifier(specifier, sourceFile, lookup) {
  const workspacePath = resolveWorkspacePathSpecifier(specifier, sourceFile);
  if (workspacePath) {
    return findOwningProjectForWorkspacePath(workspacePath, lookup);
  }

  const importRoot = toImportRoot(specifier);
  if (!importRoot) {
    return null;
  }

  const directMatches = lookup.byImportId.get(importRoot) || [];
  if (directMatches.length === 1) {
    return directMatches[0];
  }

  const unscoped = stripPackageScope(importRoot);
  if (unscoped) {
    const unscopedMatches = lookup.byImportId.get(unscoped) || [];
    if (unscopedMatches.length === 1) {
      return unscopedMatches[0];
    }
  }

  return null;
}

function classifyProject(descriptor) {
  if (descriptor.hasSharedTag) {
    return SHARED_TAG;
  }
  if (descriptor.laneTag) {
    return descriptor.laneTag;
  }
  return null;
}

function isAllowedLaneDependency(sourceClass, targetClass) {
  if (!sourceClass || !targetClass) {
    return true;
  }
  if (sourceClass === SHARED_TAG) {
    return targetClass === SHARED_TAG;
  }
  if (targetClass === SHARED_TAG) {
    return true;
  }
  return sourceClass === targetClass;
}

function validateCrossLaneImports(projectDescriptors, issues) {
  if (projectDescriptors.length === 0) {
    return;
  }

  const lookup = buildProjectLookup(projectDescriptors);
  let candidateFiles = gatherChangedFiles().filter((file) => isWorkspaceSourceFile(file));
  if (candidateFiles.length === 0) {
    candidateFiles = runLines('git ls-files').filter((file) => isWorkspaceSourceFile(file));
  }

  for (const file of candidateFiles) {
    const sourceProject = findOwningProjectForWorkspacePath(file, lookup);
    if (!sourceProject) {
      continue;
    }

    const sourceClass = classifyProject(sourceProject);
    const absolutePath = path.join(repoRoot, file);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    let content;
    try {
      content = fs.readFileSync(absolutePath, 'utf8');
    } catch (_error) {
      continue;
    }

    const lines = content.split(/\r?\n/g);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const specifiers = extractImportSpecifiers(line);
      for (const specifier of specifiers) {
        const targetProject = findProjectForSpecifier(specifier, file, lookup);
        if (!targetProject || targetProject.projectFile === sourceProject.projectFile) {
          continue;
        }

        const targetClass = classifyProject(targetProject);
        if (isAllowedLaneDependency(sourceClass, targetClass)) {
          continue;
        }

        issues.push(
          `${file}:${index + 1}: cross-lane import '${specifier}' is forbidden (${sourceClass} -> ${targetClass}). Route cross-lane contracts through packages/shared-* and import from package root APIs.`,
        );
      }
    }
  }
}

function fail(issues) {
  console.error('Workspace boundary guard failed:');
  for (const issue of issues) {
    console.error(`  - ${issue}`);
  }
  console.error('Remediation:');
  console.error(
    `  1. Add exactly one lane tag (${LANE_TAGS.join(', ')}) to each workspace project, or '${SHARED_TAG}' for shared packages.`,
  );
  console.error("  2. Keep lane dependencies isolated to same-lane + scope:shared in .eslintrc.cjs.");
  console.error("  3. Expose shared package APIs via src/index.ts and remove deep imports across package boundaries.");
  process.exit(1);
}

function main() {
  if (!run('git rev-parse --is-inside-work-tree')) {
    console.error('Workspace boundary guard failed: not inside a git repository.');
    process.exit(1);
  }

  const issues = [];
  const projectFiles = collectProjectJsonFiles();
  const projectDescriptors = extractProjectDescriptors(projectFiles, issues);
  const sharedPackageDirs = collectSharedPackageDirs();

  validateProjectTags(projectDescriptors, issues);
  validateDependencyConstraints(projectFiles, issues);
  validateSharedPackageEntrypoints(sharedPackageDirs, issues);
  validateDeepImports(issues);
  validateCrossLaneImports(projectDescriptors, issues);

  if (issues.length > 0) {
    fail(issues);
  }

  console.log(
    `Workspace boundary guard passed (projects=${projectFiles.length}, sharedPackages=${sharedPackageDirs.length})`,
  );
}

main();
