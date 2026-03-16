if (process.env.NODE_ENV !== 'production') {
  throw new Error('admin-api production migration command requires NODE_ENV=production');
}

console.warn(
  [
    'admin-api is operating as the transitional production migration runner.',
    'Canonical production execution is migrating to apps/migration-runner once governance preconditions are cleared.'
  ].join(' ')
);
