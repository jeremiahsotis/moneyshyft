import Joi from 'joi';

export const createDebtSchema = Joi.object({
  name: Joi.string().min(1).max(255).required()
    .messages({
      'string.empty': 'Debt name is required',
      'string.max': 'Name must be less than 255 characters',
    }),

  debt_type: Joi.string()
    .valid('credit_card', 'auto_loan', 'student_loan', 'personal_loan', 'medical', 'other')
    .required()
    .messages({
      'any.only': 'Debt type must be one of: credit_card, auto_loan, student_loan, personal_loan, medical, other',
      'any.required': 'Debt type is required',
    }),

  current_balance: Joi.number().min(0).required()
    .messages({
      'number.base': 'Current balance must be a number',
      'number.min': 'Current balance cannot be negative',
      'any.required': 'Current balance is required',
    }),

  original_balance: Joi.number().min(0).optional()
    .messages({
      'number.min': 'Original balance cannot be negative',
    }),

  interest_rate: Joi.number().min(0).max(100).required()
    .messages({
      'number.base': 'Interest rate must be a number',
      'number.min': 'Interest rate cannot be negative',
      'number.max': 'Interest rate cannot exceed 100%',
      'any.required': 'Interest rate is required',
    }),

  minimum_payment: Joi.number().min(0).required()
    .messages({
      'number.base': 'Minimum payment must be a number',
      'number.min': 'Minimum payment cannot be negative',
      'any.required': 'Minimum payment is required',
    }),

  category_id: Joi.string().uuid().optional().allow(null),

  notes: Joi.string().max(1000).allow(null, '').optional()
    .messages({
      'string.max': 'Notes must be less than 1000 characters',
    }),
});

export const updateDebtSchema = Joi.object({
  name: Joi.string().min(1).max(255)
    .messages({
      'string.empty': 'Name cannot be empty',
      'string.max': 'Name must be less than 255 characters',
    }),

  debt_type: Joi.string()
    .valid('credit_card', 'auto_loan', 'student_loan', 'personal_loan', 'medical', 'other')
    .messages({
      'any.only': 'Debt type must be one of: credit_card, auto_loan, student_loan, personal_loan, medical, other',
    }),

  current_balance: Joi.number().min(0)
    .messages({
      'number.min': 'Current balance cannot be negative',
    }),

  interest_rate: Joi.number().min(0).max(100)
    .messages({
      'number.min': 'Interest rate cannot be negative',
      'number.max': 'Interest rate cannot exceed 100%',
    }),

  minimum_payment: Joi.number().min(0)
    .messages({
      'number.min': 'Minimum payment cannot be negative',
    }),

  category_id: Joi.string().uuid().allow(null),

  sort_order: Joi.number().integer().min(0),

  notes: Joi.string().max(1000).allow(null, '')
    .messages({
      'string.max': 'Notes must be less than 1000 characters',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

export const addDebtPaymentSchema = Joi.object({
  amount: Joi.number().positive().required()
    .messages({
      'number.base': 'Payment amount must be a number',
      'number.positive': 'Payment amount must be positive',
      'any.required': 'Payment amount is required',
    }),

  payment_date: Joi.date().iso().max('now').required()
    .messages({
      'date.base': 'Payment date must be a valid date',
      'date.max': 'Payment date cannot be in the future',
      'any.required': 'Payment date is required',
    }),

  notes: Joi.string().max(500).allow(null, '').optional()
    .messages({
      'string.max': 'Notes must be less than 500 characters',
    }),
});

export const calculatePayoffSchema = Joi.object({
  monthly_payment_budget: Joi.number().positive().required()
    .messages({
      'number.base': 'Monthly payment budget must be a number',
      'number.positive': 'Monthly payment budget must be positive',
      'any.required': 'Monthly payment budget is required',
    }),
});
