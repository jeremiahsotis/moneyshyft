import Joi from 'joi';

export const createGoalSchema = Joi.object({
  name: Joi.string().min(1).max(255).required()
    .messages({
      'string.empty': 'Goal name is required',
      'string.max': 'Goal name must be less than 255 characters'
    }),

  description: Joi.string().max(1000).allow('', null).optional()
    .messages({
      'string.max': 'Description must be less than 1000 characters'
    }),

  target_amount: Joi.number().positive().required()
    .messages({
      'number.base': 'Target amount must be a number',
      'number.positive': 'Target amount must be positive',
      'any.required': 'Target amount is required'
    }),

  current_amount: Joi.number().min(0).default(0)
    .messages({
      'number.base': 'Current amount must be a number',
      'number.min': 'Current amount cannot be negative'
    }),

  target_date: Joi.date().iso().allow(null).optional()
    .messages({
      'date.base': 'Target date must be a valid date'
    }),

  category_id: Joi.string().uuid().allow(null).optional()
    .messages({
      'string.guid': 'Category ID must be a valid UUID'
    })
});

export const updateGoalSchema = Joi.object({
  name: Joi.string().min(1).max(255)
    .messages({
      'string.empty': 'Goal name cannot be empty',
      'string.max': 'Goal name must be less than 255 characters'
    }),

  description: Joi.string().max(1000).allow('', null)
    .messages({
      'string.max': 'Description must be less than 1000 characters'
    }),

  target_amount: Joi.number().positive()
    .messages({
      'number.base': 'Target amount must be a number',
      'number.positive': 'Target amount must be positive'
    }),

  current_amount: Joi.number().min(0)
    .messages({
      'number.base': 'Current amount must be a number',
      'number.min': 'Current amount cannot be negative'
    }),

  target_date: Joi.date().iso().allow(null)
    .messages({
      'date.base': 'Target date must be a valid date'
    }),

  category_id: Joi.string().uuid().allow(null)
    .messages({
      'string.guid': 'Category ID must be a valid UUID'
    }),

  is_completed: Joi.boolean()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

export const addContributionSchema = Joi.object({
  amount: Joi.number().positive().required()
    .messages({
      'number.base': 'Contribution amount must be a number',
      'number.positive': 'Contribution amount must be positive',
      'any.required': 'Contribution amount is required'
    }),

  contribution_date: Joi.date().iso().default(() => new Date())
    .messages({
      'date.base': 'Contribution date must be a valid date'
    }),

  notes: Joi.string().max(500).allow('', null).optional()
    .messages({
      'string.max': 'Notes must be less than 500 characters'
    }),

  transaction_id: Joi.string().uuid().allow(null).optional()
    .messages({
      'string.guid': 'Transaction ID must be a valid UUID'
    })
});
