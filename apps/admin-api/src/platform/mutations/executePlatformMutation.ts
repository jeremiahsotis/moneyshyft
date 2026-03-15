import type { Knex } from 'knex';
import db from '../../config/knex';
import {
  executePlatformMutation as executeSharedPlatformMutation,
  type ExecutePlatformMutationOptions,
} from '../../../../../libs/platform/dist/mutations/executePlatformMutation';

export type { ExecutePlatformMutationOptions, PlatformMutationEvent } from '../../../../../libs/platform/dist/mutations/executePlatformMutation';

export async function executePlatformMutation<T>(
  options: ExecutePlatformMutationOptions<T>,
  knexClient?: Knex
): Promise<T> {
  return executeSharedPlatformMutation(options, knexClient ?? db);
}
