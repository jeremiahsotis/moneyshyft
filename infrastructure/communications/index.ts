import type { TelephonyProviderAdapter } from '../../domains/communication'
import { createTelnyxAdapter } from './telnyx'

export const resolveTelephonyProviderAdapter = (
  providerKey: string,
): TelephonyProviderAdapter | null => {
  if (providerKey === 'telnyx') {
    return createTelnyxAdapter()
  }

  return null
}
