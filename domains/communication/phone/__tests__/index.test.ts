import {
  comparePhoneIdentity,
  formatDisplayPhone,
  normalizePhone,
  parsePhone,
  validatePhoneForChannel,
} from '../index';

describe('communication phone domain', () => {
  it('normalizes ten-digit domestic input to canonical e164', () => {
    const result = normalizePhone('2605551212', {
      defaultCountry: 'US',
      source: 'user_entered',
    });

    expect(result).toEqual({
      ok: true,
      phone: expect.objectContaining({
        rawInput: '2605551212',
        normalizedE164: '+12605551212',
        displayNational: '(260) 555-1212',
        countryCode: '1',
        nationalNumber: '2605551212',
        validationStatus: 'valid',
        source: 'user_entered',
        usageType: 'unknown',
        sharedPhoneFlag: false,
        smsCapable: null,
        voiceCapable: null,
      }),
    });
  });

  it('normalizes seven-digit local input when a default area code is supplied', () => {
    const result = normalizePhone('5551212', {
      defaultCountry: 'US',
      defaultAreaCode: '260',
      source: 'imported',
    });

    expect(result).toEqual({
      ok: true,
      phone: expect.objectContaining({
        normalizedE164: '+12605551212',
        displayNational: '(260) 555-1212',
        source: 'imported',
      }),
    });
  });

  it('rejects seven-digit input when the default area code is missing', () => {
    expect(normalizePhone('5551212', { defaultCountry: 'US' })).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'PHONE_DEFAULT_AREA_CODE_REQUIRED',
      }),
    });
  });

  it('rejects malformed input with alpha characters', () => {
    expect(parsePhone('260-ABC-1212', { defaultCountry: 'US' })).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'PHONE_INVALID_FORMAT',
      }),
    });
  });

  it('formats display output, validates channels, and compares canonical identity', () => {
    const result = normalizePhone('+12605551212', {
      defaultCountry: 'US',
      source: 'system_generated',
    });

    if (!result.ok) {
      throw new Error('Expected canonical phone normalization to succeed');
    }

    expect(formatDisplayPhone(result.phone, 'en-US')).toBe('(260) 555-1212');
    expect(comparePhoneIdentity(result.phone, '+12605551212')).toBe(true);
    expect(comparePhoneIdentity(result.phone, '+12605550000')).toBe(false);
    expect(validatePhoneForChannel(result.phone, 'sms')).toEqual({ ok: true });
    expect(validatePhoneForChannel(result.phone, 'voice')).toEqual({ ok: true });
  });
});
