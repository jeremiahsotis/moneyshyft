import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const workspaceRoot = process.cwd();
const argv = process.argv.slice(2);

function walkForProjectConfigs(rootDir) {
  const queue = [rootDir];
  const projectFiles = [];

  while (queue.length > 0) {
    const currentDir = queue.pop();
    if (!currentDir) {
      continue;
    }

    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === '.nx' || entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name === 'project.json') {
        projectFiles.push(fullPath);
      }
    }
  }

  return projectFiles;
}

function loadProjects() {
  const projects = new Map();

  for (const projectFile of walkForProjectConfigs(workspaceRoot)) {
    const config = JSON.parse(readFileSync(projectFile, 'utf8'));
    if (typeof config.name === 'string') {
      projects.set(config.name, {
        root: path.dirname(projectFile),
        config,
      });
    }
  }

  return projects;
}

function runShellCommand(command, cwd) {
  const shellPath = process.env.SHELL || '/bin/bash';
  const child = spawn(shellPath, ['-lc', command], {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

function delegateToNx() {
  const nxBin = path.join(workspaceRoot, 'node_modules', '.bin', 'nx');
  const child = spawn(nxBin, argv, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

function tryRunProjectTarget(projectName, targetName) {
  const projects = loadProjects();
  const project = projects.get(projectName);
  const target = project?.config?.targets?.[targetName];

  if (project && target?.executor === 'nx:run-commands' && typeof target?.options?.command === 'string') {
    const cwd = target.options.cwd
      ? path.resolve(workspaceRoot, target.options.cwd)
      : workspaceRoot;
    runShellCommand(target.options.command, cwd);
    return true;
  }

  return false;
}

if (argv[0] === 'run' && typeof argv[1] === 'string' && argv[1].includes(':')) {
  const [projectName, targetName] = argv[1].split(':');

  if (!tryRunProjectTarget(projectName, targetName)) {
    delegateToNx();
  }
} else if (argv[0] === 'run' && typeof argv[1] === 'string') {
  if (!tryRunProjectTarget(argv[1], 'run')) {
    delegateToNx();
  }
} else {
  delegateToNx();
}
