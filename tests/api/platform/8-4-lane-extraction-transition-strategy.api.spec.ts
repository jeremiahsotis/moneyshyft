import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const repoRoot = process.cwd();

const resolvePath = (...segments: string[]): string => path.join(repoRoot, ...segments);

const pathExists = (...segments: string[]): boolean => fs.existsSync(resolvePath(...segments));
const isDirectory = (...segments: string[]): boolean => {
  try {
    return fs.statSync(resolvePath(...segments)).isDirectory();
  } catch {
    return false;
  }
};

const isSymlink = (...segments: string[]): boolean => {
  try {
    return fs.lstatSync(resolvePath(...segments)).isSymbolicLink();
  } catch {
    return false;
  }
};

test.describe('Story 8.4 atdd - lane extraction transition strategy', () => {
  test('[P0] extracts route and connect lane seams into dedicated app paths with compatibility bridges @P0', () => {
    expect(pathExists('apps', 'routeshyft-api')).toBe(true);
    expect(pathExists('apps', 'routeshyft-web')).toBe(true);
    expect(pathExists('apps', 'connectshyft-api')).toBe(true);
    expect(pathExists('apps', 'connectshyft-web')).toBe(true);

    expect(pathExists('apps', 'routeshyft-api', 'src', 'modules', 'route')).toBe(true);
    expect(pathExists('apps', 'connectshyft-api', 'src', 'modules', 'connectshyft')).toBe(true);
    expect(pathExists('apps', 'connectshyft-web', 'src', 'features', 'connectshyft')).toBe(true);

    expect(isDirectory('apps', 'moneyshyft-api')).toBe(true);
    expect(isDirectory('apps', 'moneyshyft-web')).toBe(true);
    expect(isSymlink('apps', 'moneyshyft-api', 'src')).toBe(true);
    expect(isSymlink('apps', 'moneyshyft-web', 'src')).toBe(true);

    expect(isSymlink('apps', 'routeshyft-api', 'src', 'modules', 'connectshyft')).toBe(true);
    expect(isSymlink('apps', 'routeshyft-api', 'src', 'routes', 'api', 'v1', 'connectshyft.ts')).toBe(true);
    expect(isSymlink('apps', 'routeshyft-web', 'src', 'features', 'connectshyft')).toBe(true);
  });

  test('[P1] workspace and CI descriptors recognize extracted lane app locations @P1', () => {
    const workflow = fs.readFileSync(resolvePath('.github', 'workflows', 'test.yml'), 'utf8');
    const setupAction = fs.readFileSync(resolvePath('.github', 'actions', 'setup-ci-node-playwright', 'action.yml'), 'utf8');
    const routeProject = fs.readFileSync(resolvePath('apps', 'routeshyft-api', 'project.json'), 'utf8');
    const webProject = fs.readFileSync(resolvePath('apps', 'routeshyft-web', 'project.json'), 'utf8');
    const connectApiProject = fs.readFileSync(resolvePath('apps', 'connectshyft-api', 'project.json'), 'utf8');
    const connectWebProject = fs.readFileSync(resolvePath('apps', 'connectshyft-web', 'project.json'), 'utf8');

    expect(workflow.includes('apps/routeshyft-api/package-lock.json')).toBe(true);
    expect(workflow.includes('apps/routeshyft-web/package-lock.json')).toBe(true);

    expect(setupAction.includes('apps/routeshyft-api/package-lock.json')).toBe(true);
    expect(setupAction.includes('apps/routeshyft-web/package-lock.json')).toBe(true);

    expect(routeProject.includes('apps/routeshyft-api/src')).toBe(true);
    expect(webProject.includes('apps/routeshyft-web/src')).toBe(true);
    expect(connectApiProject.includes('lane:connectshyft')).toBe(true);
    expect(connectWebProject.includes('lane:connectshyft')).toBe(true);
  });
});
