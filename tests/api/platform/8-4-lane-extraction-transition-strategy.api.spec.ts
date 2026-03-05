import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';

const repoRoot = process.cwd();

const resolvePath = (...segments: string[]): string => path.join(repoRoot, ...segments);

const pathExists = (...segments: string[]): boolean => fs.existsSync(resolvePath(...segments));
const resolveRealPath = (...segments: string[]): string => fs.realpathSync(resolvePath(...segments));
const fileDigest = (...segments: string[]): string => createHash('sha256')
  .update(fs.readFileSync(resolvePath(...segments)))
  .digest('hex');
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
  test('[P0] extracts route and connect lane seams into dedicated app paths without legacy compatibility roots @P0', () => {
    expect(pathExists('apps', 'routeshyft-api')).toBe(true);
    expect(pathExists('apps', 'routeshyft-web')).toBe(true);
    expect(pathExists('apps', 'connectshyft-api')).toBe(true);
    expect(pathExists('apps', 'connectshyft-web')).toBe(true);

    expect(pathExists('apps', 'routeshyft-api', 'src', 'modules', 'route')).toBe(true);
    expect(pathExists('apps', 'connectshyft-api', 'src', 'modules', 'connectshyft')).toBe(true);
    expect(pathExists('apps', 'connectshyft-web', 'src', 'features', 'connectshyft')).toBe(true);

    expect(pathExists('apps', 'moneyshyft-api')).toBe(false);
    expect(pathExists('apps', 'moneyshyft-web')).toBe(false);
    expect(pathExists('src')).toBe(false);
    expect(pathExists('frontend')).toBe(false);

    expect(isSymlink('apps', 'routeshyft-api', 'src', 'modules', 'connectshyft')).toBe(true);
    expect(isSymlink('apps', 'routeshyft-api', 'src', 'routes', 'api', 'v1', 'connectshyft.ts')).toBe(true);
    expect(isSymlink('apps', 'routeshyft-web', 'src', 'features', 'connectshyft')).toBe(true);
  });

  test('[P0] transitional host bridges preserve runtime module identity and route registration @P0', () => {
    const registerRoutes = fs.readFileSync(
      resolvePath('apps', 'routeshyft-api', 'src', 'api', 'registerRoutes.ts'),
      'utf8',
    );
    expect(registerRoutes.includes("{ path: '/api/v1/connectshyft', modulePath: '../routes/api/v1/connectshyft' }")).toBe(true);

    expect(
      resolveRealPath('apps', 'routeshyft-api', 'src', 'routes', 'api', 'v1', 'connectshyft.ts'),
    ).toBe(
      resolveRealPath('apps', 'connectshyft-api', 'src', 'routes', 'api', 'v1', 'connectshyft.ts'),
    );
    expect(
      fileDigest('apps', 'routeshyft-api', 'src', 'routes', 'api', 'v1', 'connectshyft.ts'),
    ).toBe(
      fileDigest('apps', 'connectshyft-api', 'src', 'routes', 'api', 'v1', 'connectshyft.ts'),
    );

    expect(
      resolveRealPath('apps', 'routeshyft-web', 'src', 'features', 'connectshyft', 'threads.ts'),
    ).toBe(
      resolveRealPath('apps', 'connectshyft-web', 'src', 'features', 'connectshyft', 'threads.ts'),
    );
    expect(
      fileDigest('apps', 'routeshyft-web', 'src', 'features', 'connectshyft', 'threads.ts'),
    ).toBe(
      fileDigest('apps', 'connectshyft-web', 'src', 'features', 'connectshyft', 'threads.ts'),
    );
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
