export type PhoneSource = 'user_entered' | 'imported' | 'system_generated'

export type PhoneValidationStatus = 'valid' | 'invalid' | 'needs_review'

export type PhoneUsageType = 'mobile' | 'landline' | 'unknown'

export type PhoneNormalizationContext = {
  defaultCountry: string
  defaultAreaCode?: string
  source?: PhoneSource
}

export type CanonicalPhoneIdentity = {
  rawInput: string
  normalizedE164: string
  displayNational: string
  countryCode: string
  nationalNumber: string
  extension?: string
  validationStatus: PhoneValidationStatus
  source: PhoneSource
  usageType: PhoneUsageType
  sharedPhoneFlag: boolean
  smsCapable: boolean | null
  voiceCapable: boolean | null
}

export type PhoneNormalizationError = {
  code:
    | 'PHONE_EMPTY'
    | 'PHONE_INVALID_FORMAT'
    | 'PHONE_DEFAULT_AREA_CODE_REQUIRED'
    | 'PHONE_DEFAULT_AREA_CODE_INVALID'
  message: string
}

export type PhoneNormalizationResult =
  | {
    ok: true
    phone: CanonicalPhoneIdentity
  }
  | {
    ok: false
    error: PhoneNormalizationError
  }

type PhoneNormalizationFailure = Extract<PhoneNormalizationResult, { ok: false }>

export type PhoneChannel = 'sms' | 'voice'

export type PhoneChannelValidationResult =
  | {
    ok: true
  }
  | {
    ok: false
    reason: string
  }

const REMOVABLE_PHONE_CHARS_PATTERN = /[\s().-]/g
const INVALID_PHONE_CHAR_PATTERN = /[A-Za-z]/
const E164_PHONE_PATTERN = /^\+[1-9]\d{1,14}$/
const TEN_DIGIT_PATTERN = /^\d{10}$/
const ELEVEN_DIGIT_US_PATTERN = /^1\d{10}$/
const SEVEN_DIGIT_PATTERN = /^\d{7}$/
const THREE_DIGIT_PATTERN = /^\d{3}$/

const DEFAULT_COUNTRY = 'US'
const DEFAULT_SOURCE: PhoneSource = 'user_entered'

const buildError = (
  code: PhoneNormalizationError['code'],
  message: string,
): PhoneNormalizationFailure => ({
  ok: false,
  error: {
    code,
    message,
  },
})

const normalizeContext = (
  context: Partial<PhoneNormalizationContext> = {},
): PhoneNormalizationContext => ({
  defaultCountry: context.defaultCountry?.trim() || DEFAULT_COUNTRY,
  defaultAreaCode: context.defaultAreaCode?.trim() || undefined,
  source: context.source || DEFAULT_SOURCE,
})

const formatUsNationalDisplay = (nationalNumber: string): string =>
  `(${nationalNumber.slice(0, 3)}) ${nationalNumber.slice(3, 6)}-${nationalNumber.slice(6)}`

const resolveUsNationalNumber = (
  input: string,
  context: PhoneNormalizationContext,
): PhoneNormalizationFailure | { ok: true; nationalNumber: string } => {
  if (!input) {
    return buildError('PHONE_EMPTY', 'Provide a phone number.')
  }

  if (INVALID_PHONE_CHAR_PATTERN.test(input)) {
    return buildError('PHONE_INVALID_FORMAT', 'Provide a valid phone number.')
  }

  const compact = input.replace(REMOVABLE_PHONE_CHARS_PATTERN, '')
  if (!compact) {
    return buildError('PHONE_EMPTY', 'Provide a phone number.')
  }

  if (!/^\+?\d+$/.test(compact)) {
    return buildError('PHONE_INVALID_FORMAT', 'Provide a valid phone number.')
  }

  if (compact.startsWith('+')) {
    if (!E164_PHONE_PATTERN.test(compact)) {
      return buildError('PHONE_INVALID_FORMAT', 'Provide a valid phone number.')
    }

    if (!compact.startsWith('+1') || compact.length !== 12) {
      return buildError('PHONE_INVALID_FORMAT', 'Provide a valid phone number.')
    }

    return {
      ok: true,
      nationalNumber: compact.slice(2),
    }
  }

  if (TEN_DIGIT_PATTERN.test(compact)) {
    return {
      ok: true,
      nationalNumber: compact,
    }
  }

  if (ELEVEN_DIGIT_US_PATTERN.test(compact)) {
    return {
      ok: true,
      nationalNumber: compact.slice(1),
    }
  }

  if (SEVEN_DIGIT_PATTERN.test(compact)) {
    if (!context.defaultAreaCode) {
      return buildError(
        'PHONE_DEFAULT_AREA_CODE_REQUIRED',
        'A default area code is required for seven-digit phone numbers.',
      )
    }

    if (!THREE_DIGIT_PATTERN.test(context.defaultAreaCode)) {
      return buildError(
        'PHONE_DEFAULT_AREA_CODE_INVALID',
        'Default area code must be exactly three digits.',
      )
    }

    return {
      ok: true,
      nationalNumber: `${context.defaultAreaCode}${compact}`,
    }
  }

  return buildError('PHONE_INVALID_FORMAT', 'Provide a valid phone number.')
}

const buildCanonicalPhoneIdentity = (
  rawInput: string,
  nationalNumber: string,
  context: PhoneNormalizationContext,
): CanonicalPhoneIdentity => ({
  rawInput,
  normalizedE164: `+1${nationalNumber}`,
  displayNational: formatUsNationalDisplay(nationalNumber),
  countryCode: '1',
  nationalNumber,
  validationStatus: 'valid',
  source: context.source || DEFAULT_SOURCE,
  usageType: 'unknown',
  sharedPhoneFlag: false,
  smsCapable: null,
  voiceCapable: null,
})

const resolveCanonicalIdentity = (
  input: string,
  context: Partial<PhoneNormalizationContext> = {},
): PhoneNormalizationResult => {
  const normalizedContext = normalizeContext(context)
  const trimmedInput = input.trim()
  const resolved = resolveUsNationalNumber(trimmedInput, normalizedContext)
  if (!resolved.ok) {
    return resolved
  }

  return {
    ok: true,
    phone: buildCanonicalPhoneIdentity(trimmedInput, resolved.nationalNumber, normalizedContext),
  }
}

const resolveNormalizedValue = (
  phone: CanonicalPhoneIdentity | string,
): string | null => {
  if (typeof phone === 'string') {
    const normalized = phone.trim()
    return E164_PHONE_PATTERN.test(normalized) ? normalized : null
  }

  return phone.normalizedE164
}

export function parsePhone(
  input: string,
  context: Partial<PhoneNormalizationContext> = {},
): PhoneNormalizationResult {
  return resolveCanonicalIdentity(input, context)
}

export function normalizePhone(
  input: string,
  context: Partial<PhoneNormalizationContext> = {},
): PhoneNormalizationResult {
  return resolveCanonicalIdentity(input, context)
}

export function formatDisplayPhone(
  phone: CanonicalPhoneIdentity | string,
  _locale: string,
): string {
  if (typeof phone !== 'string') {
    return phone.displayNational
  }

  const normalized = resolveNormalizedValue(phone)
  if (!normalized || !normalized.startsWith('+1') || normalized.length !== 12) {
    return phone
  }

  return formatUsNationalDisplay(normalized.slice(2))
}

export function validatePhoneForChannel(
  phone: CanonicalPhoneIdentity | string,
  channel: PhoneChannel,
): PhoneChannelValidationResult {
  const normalized = resolveNormalizedValue(phone)
  if (!normalized) {
    return {
      ok: false,
      reason: 'Phone identity must be canonical before channel validation.',
    }
  }

  if (!['sms', 'voice'].includes(channel)) {
    return {
      ok: false,
      reason: 'Unsupported channel.',
    }
  }

  return { ok: true }
}

export function comparePhoneIdentity(
  left: CanonicalPhoneIdentity | string,
  right: CanonicalPhoneIdentity | string,
): boolean {
  const leftValue = resolveNormalizedValue(left)
  const rightValue = resolveNormalizedValue(right)

  if (!leftValue || !rightValue) {
    return false
  }

  return leftValue === rightValue
}
