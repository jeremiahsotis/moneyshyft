const closeCachedModuleMethod = async (
  modulePath: string,
  methodName: 'destroy' | 'end',
): Promise<void> => {
  try {
    const resolvedPath = require.resolve(modulePath);
    const cachedModule = require.cache[resolvedPath];
    if (!cachedModule) {
      return;
    }

    const exportedModule = cachedModule.exports?.default ?? cachedModule.exports;
    const cleanupMethod = exportedModule?.[methodName];
    if (typeof cleanupMethod === 'function') {
      await cleanupMethod.call(exportedModule);
    }
  } catch (_error) {
    // Best-effort cleanup: no-op when the module is not loaded or already closed.
  }
};

afterAll(async () => {
  await closeCachedModuleMethod('../config/knex', 'destroy');
  await closeCachedModuleMethod('../config/database', 'end');
});
