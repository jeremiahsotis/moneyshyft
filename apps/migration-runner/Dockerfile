FROM node:20-alpine

WORKDIR /app

COPY apps/migration-runner/package.json ./package.json
COPY apps/migration-runner/package-lock.json ./package-lock.json

RUN npm ci --omit=dev && npm cache clean --force

COPY apps/migration-runner/knexfile.js ./knexfile.js
COPY apps/migration-runner/scripts ./scripts
COPY libs/db/scripts/packageSharedMigrations.js /libs/db/scripts/packageSharedMigrations.js
COPY shared/database /shared/database

CMD ["npm", "run", "migrate:latest"]
