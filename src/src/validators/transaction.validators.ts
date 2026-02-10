import Joi from 'joi';

export const createTransactionSchema = Joi.object({
  account_id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Account ID must be a valid UUID',
      'any.required': 'Account ID is required'
    }),

  category_id: Joi.string().uuid().allow(null).optional()
    .messages({
      'string.guid': 'Category ID must be a valid UUID'
    }),

  tag_id: Joi.string().uuid().allow(null).optional()
    .messages({
      'string.guid': 'Tag ID must be a valid UUID'
    }),

  debt_id: Joi.string().uuid().allow(null).optional()
    .messages({
      'string.guid': 'Debt ID must be a valid UUID'
    }),

  goal_id: Joi.string().uuid().allow(null).optional()
    .messages({
      'string.guid': 'Goal ID must be a valid UUID'
    }),

  payee: Joi.string().min(1).max(255).required()
    .messages({
      'string.empty': 'Payee is required',
      'string.max': 'Payee must be less than 255 characters'
    }),

  amount: Joi.number().required()
    .messages({
      'number.base': 'Amount must be a number',
      'any.required': 'Amount is required'
    }),

  transaction_date: Joi.date().iso().required()
    .messages({
      'date.base': 'Transaction date must be a valid date',
      'any.required': 'Transaction date is required'
    }),

  notes: Joi.string().max(1000).allow('', null).optional()
    .messages({
      'string.max': 'Notes must be less than 1000 characters'
    }),

  is_cleared: Joi.boolean().default(false),

  is_reconciled: Joi.boolean().default(false)
}).custom((value, helpers) => {
  if (value.debt_id && value.goal_id) {
    return helpers.error('any.invalid', { message: 'Cannot link a transaction to both a debt and a goal' });
  }
  return value;
});

export const createTransferSchema = Joi.object({
  from_account_id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'From account ID must be a valid UUID',
      'any.required': 'From account ID is required'
    }),

  to_account_id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'To account ID must be a valid UUID',
      'any.required': 'To account ID is required'
    }),

  amount: Joi.number().positive().required()
    .messages({
      'number.base': 'Amount must be a number',
      'number.positive': 'Amount must be positive',
      'any.required': 'Amount is required'
    }),

  transaction_date: Joi.date().iso().required()
    .messages({
      'date.base': 'Transaction date must be a valid date',
      'any.required': 'Transaction date is required'
    }),

  notes: Joi.string().max(1000).allow('', null).optional()
    .messages({
      'string.max': 'Notes must be less than 1000 characters'
    }),

  goal_id: Joi.string().uuid().allow(null).optional()
    .messages({
      'string.guid': 'Goal ID must be a valid UUID'
    })
}).custom((value, helpers) => {
  if (value.from_account_id && value.to_account_id && value.from_account_id === value.to_account_id) {
    return helpers.error('any.invalid', { message: 'Cannot transfer to the same account' });
  }
  return value;
});

export const updateTransactionSchema = Joi.object({
  category_id: Joi.string().uuid().allow(null).optional()
    .messages({
      'string.guid': 'Category ID must be a valid UUID'
    }),

  tag_id: Joi.string().uuid().allow(null).optional()
    .messages({
      'string.guid': 'Tag ID must be a valid UUID'
    }),

  payee: Joi.string().min(1).max(255)
    .messages({
      'string.empty': 'Payee cannot be empty',
      'string.max': 'Payee must be less than 255 characters'
    }),

  amount: Joi.number()
    .messages({
      'number.base': 'Amount must be a number'
    }),

  transaction_date: Joi.date().iso()
    .messages({
      'date.base': 'Transaction date must be a valid date'
    }),

  notes: Joi.string().max(1000).allow('', null)
    .messages({
      'string.max': 'Notes must be less than 1000 characters'
    }),

  is_cleared: Joi.boolean(),

  is_reconciled: Joi.boolean()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});
