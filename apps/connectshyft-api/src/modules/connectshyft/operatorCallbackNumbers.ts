import type { Knex } from 'knex';
import db from '../../config/knex';
import {
  normalizePhone,
  validatePhoneForChannel,
  type PhoneNormalizationError,
} from '../../../../../domains/communication';

export type ConnectShyftOperatorCallbackNumber = {
  tenantId: string;
  userId: string;
  callbackNumberE164: string;
  callbackNumberRawInput: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type ConnectShyftOperatorCallbackNumberFieldErrorReason =
  | 'REQUIRED'
  | PhoneNormalizationError['code']
  | 'VOICE_UNSUPPORTED';

export type ConnectShyftOperatorCallbackNumberFieldError = {
  field: 'callbackNumber';
  reason: ConnectShyftOperatorCallbackNumberFieldErrorReason;
  message: string;
};

type ConnectShyftOperatorCallbackNumberRequiredResult = {
  ok: false;
  code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_REQUIRED';
  message: string;
  data: {
    fieldErrors: ConnectShyftOperatorCallbackNumberFieldError[];
  };
};

type ConnectShyftOperatorCallbackNumberInvalidResult = {
  ok: false;
  code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_INVALID';
  message: string;
  data: {
    fieldErrors: ConnectShyftOperatorCallbackNumberFieldError[];
  };
};

export type ConnectShyftOperatorCallbackNumberSaveResult =
  | {
    ok: true;
    code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_SAVED';
    httpStatus: 200;
    data: {
      callbackNumber: ConnectShyftOperatorCallbackNumber;
    };
  }
  | ConnectShyftOperatorCallbackNumberRequiredResult
  | ConnectShyftOperatorCallbackNumberInvalidResult;

export type ConnectShyftOperatorCallbackNumberStore = {
  getCallbackNumber(input: {
    tenantId: string;
    userId: string;
  }): Promise<ConnectShyftOperatorCallbackNumber | null>;
  saveCallbackNumber(input: {
    tenantId: string;
    userId: string;
    callbackNumberE164: string;
    callbackNumberRawInput: string;
  }): Promise<ConnectShyftOperatorCallbackNumber>;
};

type DbOperatorCallbackNumberRow = {
  tenant_id: string;
  user_id: string;
  callback_number_e164: string;
  callback_number_raw_input: string;
  created_at_utc: string | Date;
  updated_at_utc: string | Date;
};

type ValidatedCallbackNumber =
  | {
    ok: true;
    callbackNumberE164: string;
    callbackNumberRawInput: string;
  }
  | Extract<ConnectShyftOperatorCallbackNumberSaveResult, { ok: false }>;

const CONNECTSHYFT_OPERATOR_CALLBACK_NUMBERS_TABLE = 'cs_operator_callback_numbers';

const normalizeRequiredString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const toIsoUtc = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
};

const mapDbRowToOperatorCallbackNumber = (
  row: DbOperatorCallbackNumberRow,
): ConnectShyftOperatorCallbackNumber => ({
  tenantId: row.tenant_id,
  userId: row.user_id,
  callbackNumberE164: row.callback_number_e164,
  callbackNumberRawInput: row.callback_number_raw_input,
  createdAtUtc: toIsoUtc(row.created_at_utc),
  updatedAtUtc: toIsoUtc(row.updated_at_utc),
});

const buildRequiredRefusal = (): ConnectShyftOperatorCallbackNumberRequiredResult => ({
  ok: false,
  code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_REQUIRED',
  message: 'Provide a callback number so ConnectShyft voice forwarding can reach you.',
  data: {
    fieldErrors: [
      {
        field: 'callbackNumber',
        reason: 'REQUIRED',
        message: 'Provide a callback number so ConnectShyft voice forwarding can reach you.',
      },
    ],
  },
});

const buildInvalidRefusal = (
  reason: ConnectShyftOperatorCallbackNumberFieldErrorReason,
  message: string,
): ConnectShyftOperatorCallbackNumberInvalidResult => ({
  ok: false,
  code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_INVALID',
  message,
  data: {
    fieldErrors: [
      {
        field: 'callbackNumber',
        reason,
        message,
      },
    ],
  },
});

const isMissingPersistenceError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string };
  const normalizedCode = typeof candidate.code === 'string'
    ? candidate.code.toUpperCase()
    : '';
  return normalizedCode === '42P01'
    || normalizedCode === '3F000'
    || normalizedCode === '42703'
    || normalizedCode === '28000'
    || normalizedCode === '28P01'
    || normalizedCode.startsWith('08')
    || normalizedCode === 'ECONNREFUSED'
    || normalizedCode === 'ENOTFOUND'
    || normalizedCode === 'ETIMEDOUT';
};

const validateCallbackNumber = (value: unknown): ValidatedCallbackNumber => {
  const callbackNumberRawInput = normalizeRequiredString(value);
  if (!callbackNumberRawInput) {
    return buildRequiredRefusal();
  }

  const normalizedPhone = normalizePhone(callbackNumberRawInput, {
    defaultCountry: 'US',
  });
  if (!normalizedPhone.ok) {
    return buildInvalidRefusal(normalizedPhone.error.code, normalizedPhone.error.message);
  }

  const voiceValidation = validatePhoneForChannel(normalizedPhone.phone, 'voice');
  if (!voiceValidation.ok) {
    return buildInvalidRefusal('VOICE_UNSUPPORTED', voiceValidation.reason);
  }

  return {
    ok: true,
    callbackNumberE164: normalizedPhone.phone.normalizedE164,
    callbackNumberRawInput: normalizedPhone.phone.rawInput,
  };
};

export class ConnectShyftOperatorCallbackNumberPersistenceUnavailableError extends Error {
  readonly code = 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_PERSISTENCE_UNAVAILABLE';

  constructor(cause?: unknown) {
    super('Operator callback number persistence is unavailable.');
    this.name = 'ConnectShyftOperatorCallbackNumberPersistenceUnavailableError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class InMemoryConnectShyftOperatorCallbackNumberStore
implements ConnectShyftOperatorCallbackNumberStore {
  private readonly records = new Map<string, ConnectShyftOperatorCallbackNumber>();

  private buildKey(tenantId: string, userId: string): string {
    return `${tenantId}::${userId}`;
  }

  async getCallbackNumber(input: {
    tenantId: string;
    userId: string;
  }): Promise<ConnectShyftOperatorCallbackNumber | null> {
    return this.records.get(this.buildKey(input.tenantId, input.userId)) || null;
  }

  async saveCallbackNumber(input: {
    tenantId: string;
    userId: string;
    callbackNumberE164: string;
    callbackNumberRawInput: string;
  }): Promise<ConnectShyftOperatorCallbackNumber> {
    const key = this.buildKey(input.tenantId, input.userId);
    const existing = this.records.get(key);
    const timestamp = new Date().toISOString();
    const record: ConnectShyftOperatorCallbackNumber = {
      tenantId: input.tenantId,
      userId: input.userId,
      callbackNumberE164: input.callbackNumberE164,
      callbackNumberRawInput: input.callbackNumberRawInput,
      createdAtUtc: existing?.createdAtUtc || timestamp,
      updatedAtUtc: timestamp,
    };

    this.records.set(key, record);
    return record;
  }
}

export class KnexConnectShyftOperatorCallbackNumberStore
implements ConnectShyftOperatorCallbackNumberStore {
  constructor(private readonly knexClient: Knex = db) {}

  async getCallbackNumber(input: {
    tenantId: string;
    userId: string;
  }): Promise<ConnectShyftOperatorCallbackNumber | null> {
    const row = await this.knexClient
      .withSchema('connectshyft')
      .table(CONNECTSHYFT_OPERATOR_CALLBACK_NUMBERS_TABLE)
      .where({
        tenant_id: input.tenantId,
        user_id: input.userId,
      })
      .first<DbOperatorCallbackNumberRow>([
        'tenant_id',
        'user_id',
        'callback_number_e164',
        'callback_number_raw_input',
        'created_at_utc',
        'updated_at_utc',
      ]);

    return row ? mapDbRowToOperatorCallbackNumber(row) : null;
  }

  async saveCallbackNumber(input: {
    tenantId: string;
    userId: string;
    callbackNumberE164: string;
    callbackNumberRawInput: string;
  }): Promise<ConnectShyftOperatorCallbackNumber> {
    const [row] = await this.knexClient
      .withSchema('connectshyft')
      .table(CONNECTSHYFT_OPERATOR_CALLBACK_NUMBERS_TABLE)
      .insert({
        tenant_id: input.tenantId,
        user_id: input.userId,
        callback_number_e164: input.callbackNumberE164,
        callback_number_raw_input: input.callbackNumberRawInput,
        created_at_utc: this.knexClient.fn.now(),
        updated_at_utc: this.knexClient.fn.now(),
      })
      .onConflict(['tenant_id', 'user_id'])
      .merge({
        callback_number_e164: input.callbackNumberE164,
        callback_number_raw_input: input.callbackNumberRawInput,
        updated_at_utc: this.knexClient.fn.now(),
      })
      .returning<DbOperatorCallbackNumberRow[]>([
        'tenant_id',
        'user_id',
        'callback_number_e164',
        'callback_number_raw_input',
        'created_at_utc',
        'updated_at_utc',
      ]);

    return mapDbRowToOperatorCallbackNumber(row);
  }
}

export class AsyncConnectShyftOperatorCallbackNumberService {
  constructor(
    private readonly store: ConnectShyftOperatorCallbackNumberStore = new KnexConnectShyftOperatorCallbackNumberStore(),
  ) {}

  async getCurrentCallbackNumber(input: {
    tenantId: string;
    userId: string;
  }): Promise<ConnectShyftOperatorCallbackNumber | null> {
    try {
      return await this.store.getCallbackNumber(input);
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      throw new ConnectShyftOperatorCallbackNumberPersistenceUnavailableError(error);
    }
  }

  async setCallbackNumber(input: {
    tenantId: string;
    userId: string;
    callbackNumber: unknown;
  }): Promise<ConnectShyftOperatorCallbackNumberSaveResult> {
    const validated = validateCallbackNumber(input.callbackNumber);
    if (!validated.ok) {
      return validated;
    }

    try {
      const callbackNumber = await this.store.saveCallbackNumber({
        tenantId: input.tenantId,
        userId: input.userId,
        callbackNumberE164: validated.callbackNumberE164,
        callbackNumberRawInput: validated.callbackNumberRawInput,
      });

      return {
        ok: true,
        code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_SAVED',
        httpStatus: 200,
        data: {
          callbackNumber,
        },
      };
    } catch (error) {
      if (!isMissingPersistenceError(error)) {
        throw error;
      }

      throw new ConnectShyftOperatorCallbackNumberPersistenceUnavailableError(error);
    }
  }
}

export const validateConnectShyftOperatorCallbackNumber = validateCallbackNumber;

export const connectShyftOperatorCallbackNumberServiceAsync =
  new AsyncConnectShyftOperatorCallbackNumberService();
