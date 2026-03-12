import type { TelephonyProviderAdapter } from '../../domains/communication'

type TelephonyProviderModule = {
  createTelephonyProviderAdapter?: () => TelephonyProviderAdapter
}

const loadProviderModule = (providerKey: string): TelephonyProviderModule | null => {
  try {
    return require(`./${providerKey}`) as TelephonyProviderModule
  } catch (error) {
    if (
      error
      && typeof error === 'object'
      && 'code' in error
      && error.code === 'MODULE_NOT_FOUND'
      && 'message' in error
      && typeof error.message === 'string'
      && error.message.includes(`'./${providerKey}'`)
    ) {
      return null
    }

    throw error
  }
}

export const resolveTelephonyProviderAdapter = (
  providerKey: string,
): TelephonyProviderAdapter | null => {
  const providerModule = loadProviderModule(providerKey)
  if (!providerModule || typeof providerModule.createTelephonyProviderAdapter !== 'function') {
    return null
  }

  return providerModule.createTelephonyProviderAdapter()
}
