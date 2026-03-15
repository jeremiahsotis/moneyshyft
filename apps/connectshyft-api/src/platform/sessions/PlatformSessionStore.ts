import db from '../../config/knex';
import {
  PlatformSessionStore as SharedPlatformSessionStore,
  type SessionRecord,
} from '../../../../../libs/platform/dist/sessions/PlatformSessionStore';

export type { SessionRecord } from '../../../../../libs/platform/dist/sessions/PlatformSessionStore';

export default new SharedPlatformSessionStore(db);
