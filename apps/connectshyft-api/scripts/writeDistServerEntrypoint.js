const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const compiledEntrypoint = path.join(distDir, 'apps', 'connectshyft-api', 'src', 'server.js');
const bootstrapEntrypoint = path.join(distDir, 'server.js');

if (!fs.existsSync(compiledEntrypoint)) {
  throw new Error(`Compiled server entrypoint not found at ${compiledEntrypoint}`);
}

fs.writeFileSync(
  bootstrapEntrypoint,
  `'use strict';\nrequire('./apps/connectshyft-api/src/server.js');\n`,
  'utf8',
);
