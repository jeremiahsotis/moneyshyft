import Joi from 'joi';

export const createRecurringSchema = Joi.object({
  account_id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Account ID must be a valid UUID',
      'any.required': 'Account ID is required'
    }),

  category_id: Joi.string().uuid().allow(null).optional()
    .messages({
      'string.guid': 'Category ID must be a valid UUID'
    }),

  payee: Joi.string().max(255).required()
    .messages({
      'string.max': 'Payee must be less than 255 characters',
      'any.required': 'Payee is required'
    }),

  amount: Joi.number().required().invalid(0)
    .messages({
      'number.base': 'Amount must be a number',
      'any.invalid': 'Amount cannot be zero',
      'any.required': 'Amount is required'
    }),

  notes: Joi.string().max(2000).allow('', null).optional()
    .messages({
      'string.max': 'Notes must be less than 2000 characters'
    }),

  frequency: Joi.string().valid('daily', 'weekly', 'biweekly', 'monthly', 'yearly').required()
    .messages({
      'any.only': 'Frequency must be one of: daily, weekly, biweekly, monthly, yearly',
      'any.required': 'Frequency is required'
    }),

  start_date: Joi.string().isoDate().required()
    .messages({
      'string.isoDate': 'Start date must be a valid ISO date (YYYY-MM-DD)',
      'any.required': 'Start date is required'
    }),

  end_date: Joi.string().isoDate().allow(null).optional()
    .messages({
      'string.isoDate': 'End date must be a valid ISO date (YYYY-MM-DD)'
    }),

  auto_post: Joi.boolean().optional()
    .messages({
      'boolean.base': 'Auto post must be a boolean'
    }),

  skip_weekends: Joi.boolean().optional()
    .messages({
      'boolean.base': 'Skip weekends must be a boolean'
    }),

  advance_notice_days: Joi.number().integer().min(0).max(30).optional()
    .messages({
      'number.base': 'Advance notice days must be a number',
      'number.integer': 'Advance notice days must be an integer',
      'number.min': 'Advance notice days must be at least 0',
      'number.max': 'Advance notice days cannot exceed 30'
    })
});

export const updateRecurringSchema = Joi.object({
  account_id: Joi.string().uuid().optional()
    .messages({
      'string.guid': 'Account ID must be a valid UUID'
    }),

  category_id: Joi.string().uuid().allow(null).optional()
    .messages({
      'string.guid': 'Category ID must be a valid UUID'
    }),

  payee: Joi.string().max(255).optional()
    .messages({
      'string.max': 'Payee must be less than 255 characters'
    }),

  amount: Joi.number().invalid(0).optional()
    .messages({
      'number.base': 'Amount must be a number',
      'any.invalid': 'Amount cannot be zero'
    }),

  notes: Joi.string().max(2000).allow('', null).optional()
    .messages({
      'string.max': 'Notes must be less than 2000 characters'
    }),

  frequency: Joi.string().valid('daily', 'weekly', 'biweekly', 'monthly', 'yearly').optional()
    .messages({
      'any.only': 'Frequency must be one of: daily, weekly, biweekly, monthly, yearly'
    }),

  auto_post: Joi.boolean().optional()
    .messages({
      'boolean.base': 'Auto post must be a boolean'
    }),

  skip_weekends: Joi.boolean().optional()
    .messages({
      'boolean.base': 'Skip weekends must be a boolean'
    }),

  advance_notice_days: Joi.number().integer().min(0).max(30).optional()
    .messages({
      'number.base': 'Advance notice days must be a number',
      'number.integer': 'Advance notice days must be an integer',
      'number.min': 'Advance notice days must be at least 0',
      'number.max': 'Advance notice days cannot exceed 30'
    })
});

export const skipInstanceSchema = Joi.object({
  reason: Joi.string().max(500).allow('', null).optional()
    .messages({
      'string.max': 'Skip reason must be less than 500 characters'
    })
});

export const updateInstanceSchema = Joi.object({
  amount: Joi.number().invalid(0).optional()
    .messages({
      'number.base': 'Amount must be a number',
      'any.invalid': 'Amount cannot be zero'
    }),

  category_id: Joi.string().uuid().allow(null).optional()
    .messages({
      'string.guid': 'Category ID must be a valid UUID'
    }),

  payee: Joi.string().max(255).optional()
    .messages({
      'string.max': 'Payee must be less than 255 characters'
    }),

  notes: Joi.string().max(2000).allow('', null).optional()
    .messages({
      'string.max': 'Notes must be less than 2000 characters'
    })
});
