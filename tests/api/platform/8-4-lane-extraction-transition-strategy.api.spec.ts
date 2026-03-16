import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const repoRoot = process.cwd();

const resolvePath = (...segments: string[]): string => path.join(repoRoot, ...segments);

const pathExists = (...segments: string[]): boolean => fs.existsSync(resolvePath(...segments));
const resolveRealPath = (...segments: string[]): string => fs.realpathSync(resolvePath(...segments));
const isSymlink = (...segments: string[]): boolean => {
  try {
    return fs.lstatSync(resolvePath(...segments)).isSymbolicLink();
  } catch {
    return false;
  }
};

test.describe('Story 8.4 atdd - lane extraction transition strategy', () => {
  test('[P0] extracts route and connect lane seams into dedicated app paths without legacy compatibility roots @P0', () => {
    expect(pathExists('apps', 'moneyshyft-api')).toBe(true);
    expect(pathExists('apps', 'moneyshyft-web')).toBe(true);
    expect(pathExists('apps', 'connectshyft-api')).toBe(true);
    expect(pathExists('apps', 'connectshyft-web')).toBe(true);

    expect(pathExists('apps', 'moneyshyft-api', 'src', 'modules', 'route')).toBe(true);
    expect(pathExists('apps', 'connectshyft-api', 'src', 'modules', 'connectshyft')).toBe(true);
    expect(pathExists('apps', 'connectshyft-web', 'src', 'features', 'connectshyft')).toBe(true);

    expect(pathExists('apps', 'routeshyft-api')).toBe(false);
    expect(pathExists('apps', 'routeshyft-web')).toBe(false);
    expect(pathExists('src')).toBe(false);
    expect(pathExists('frontend')).toBe(false);

    expect(isSymlink('apps', 'moneyshyft-api', 'src', 'modules', 'connectshyft')).toBe(false);
    expect(isSymlink('apps', 'moneyshyft-api', 'src', 'routes', 'api', 'v1', 'connectshyft.ts')).toBe(false);
    expect(isSymlink('apps', 'moneyshyft-web', 'src', 'features', 'connectshyft')).toBe(false);
  });

  test('[P0] transitional host bridges preserve runtime module identity and route registration @P0', () => {
    const registerRoutes = fs.readFileSync(
      resolvePath('apps', 'moneyshyft-api', 'src', 'api', 'registerRoutes.ts'),
      'utf8',
    );
    const moneyRouteModule = fs.readFileSync(
      resolvePath('apps', 'moneyshyft-api', 'src', 'routes', 'api', 'v1', 'connectshyft.ts'),
      'utf8',
    );
    const connectRouteModule = fs.readFileSync(
      resolvePath('apps', 'connectshyft-api', 'src', 'routes', 'api', 'v1', 'connectshyft.ts'),
      'utf8',
    );
    expect(registerRoutes.includes("{ path: '/api/v1/connectshyft', modulePath: '../routes/api/v1/connectshyft' }")).toBe(false);

    expect(
      isSymlink('apps', 'moneyshyft-api', 'src', 'routes', 'api', 'v1', 'connectshyft.ts'),
    ).toBe(false);
    for (const routeSignature of [
      "router.get('/threads/:threadId'",
      "router.post('/threads/:threadId/claim'",
      "router.post('/threads/:threadId/takeover'",
      "router.post('/threads/:threadId/close'",
      "router.post('/threads/:threadId/call'",
      "router.post('/threads/:threadId/messages'",
    ]) {
      expect(moneyRouteModule.includes(routeSignature)).toBe(true);
      expect(connectRouteModule.includes(routeSignature)).toBe(true);
    }

    expect(
      fs.readFileSync(resolvePath('apps', 'connectshyft-api', 'src', 'app.ts'), 'utf8').includes(
        "app.use('/api/v1/connectshyft', connectShyftRouter);",
      ),
    ).toBe(true);

    expect(
      isSymlink('apps', 'moneyshyft-web', 'src', 'features', 'connectshyft'),
    ).toBe(false);
    expect(
      pathExists('apps', 'moneyshyft-web', 'src', 'features', 'connectshyft', 'threads.ts'),
    ).toBe(false);
    expect(
      pathExists('apps', 'connectshyft-web', 'src', 'features', 'connectshyft', 'threads.ts'),
    ).toBe(true);
  });

  test('[P1] workspace and CI descriptors recognize extracted lane app locations @P1', () => {
    const workflow = fs.readFileSync(resolvePath('.github', 'workflows', 'test.yml'), 'utf8');
    const setupAction = fs.readFileSync(resolvePath('.github', 'actions', 'setup-ci-node-playwright', 'action.yml'), 'utf8');
    const routeProject = fs.readFileSync(resolvePath('apps', 'moneyshyft-api', 'project.json'), 'utf8');
    const webProject = fs.readFileSync(resolvePath('apps', 'moneyshyft-web', 'project.json'), 'utf8');
    const connectApiProject = fs.readFileSync(resolvePath('apps', 'connectshyft-api', 'project.json'), 'utf8');
    const connectWebProject = fs.readFileSync(resolvePath('apps', 'connectshyft-web', 'project.json'), 'utf8');

    expect(workflow.includes('apps/moneyshyft-api/package-lock.json')).toBe(true);
    expect(workflow.includes('apps/connectshyft-web/package-lock.json')).toBe(true);

    expect(setupAction.includes('apps/moneyshyft-api/package-lock.json')).toBe(true);
    expect(setupAction.includes('apps/connectshyft-web/package-lock.json')).toBe(true);

    expect(routeProject.includes('apps/moneyshyft-api/src')).toBe(true);
    expect(webProject.includes('apps/moneyshyft-web/src')).toBe(true);
    expect(connectApiProject.includes('lane:connectshyft')).toBe(true);
    expect(connectWebProject.includes('lane:connectshyft')).toBe(true);
  });
});
