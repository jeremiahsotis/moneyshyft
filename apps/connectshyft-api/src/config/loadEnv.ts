import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const resolveEnvCandidates = (): string[] => {
  const explicitEnvFile = process.env.CONNECT_API_ENV_FILE || process.env.CONNECTSHYFT_API_ENV_FILE;
  const candidates = [
    explicitEnvFile,
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(__dirname, '..', '.env'),
    path.resolve(__dirname, '..', '.env.local'),
    path.resolve(process.cwd(), 'apps/connectshyft-api/.env'),
    path.resolve(process.cwd(), 'apps/connectshyft-api/.env.local'),
  ].filter((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0);

  return [...new Set(candidates)];
};

const loadEnvFromCandidates = (): void => {
  const loadedPaths: string[] = [];

  for (const envPath of resolveEnvCandidates()) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const result = dotenv.config({
      path: envPath,
      override: false,
    });

    if (!result.error) {
      loadedPaths.push(envPath);
    }
  }

  if (loadedPaths.length > 0) {
    process.env.CONNECTSHYFT_ENV_LOADED_PATHS = loadedPaths.join(path.delimiter);
  }
};

loadEnvFromCandidates();
