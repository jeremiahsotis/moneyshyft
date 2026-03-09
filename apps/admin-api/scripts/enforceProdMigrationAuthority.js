if (process.env.NODE_ENV !== 'production') {
  throw new Error('admin-api production migration command requires NODE_ENV=production');
}

console.log('admin-api production migration authority check passed');
