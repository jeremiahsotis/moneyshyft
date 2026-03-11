import type { PhoneNormalizationContext, PhoneSource } from '../../../../../domains/communication'

const DEFAULT_COUNTRY = 'US'

const normalizeOptionalEnvValue = (value: string | undefined): string | undefined => {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : undefined
}

export const resolveConnectShyftPhoneNormalizationContext = (
  source: PhoneSource = 'user_entered',
): PhoneNormalizationContext => ({
  defaultCountry: normalizeOptionalEnvValue(process.env.CONNECTSHYFT_PHONE_DEFAULT_COUNTRY) || DEFAULT_COUNTRY,
  defaultAreaCode: normalizeOptionalEnvValue(process.env.CONNECTSHYFT_PHONE_DEFAULT_AREA_CODE),
  source,
})
