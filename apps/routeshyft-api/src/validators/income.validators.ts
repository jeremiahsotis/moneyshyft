import Joi from 'joi';

export const createIncomeSourceSchema = Joi.object({
  name: Joi.string().min(1).max(255).required()
    .messages({
      'string.empty': 'Income source name is required',
      'string.max': 'Name must be less than 255 characters'
    }),

  monthly_amount: Joi.number().min(0).required()
    .messages({
      'number.base': 'Monthly amount must be a number',
      'number.min': 'Monthly amount cannot be negative',
      'any.required': 'Monthly amount is required'
    }),

  frequency: Joi.string()
    .valid('hourly', 'weekly', 'biweekly', 'semimonthly', 'monthly', 'annually')
    .optional(),

  expected_day_of_month: Joi.number().integer().min(1).max(31).allow(null).optional()
    .messages({
      'number.base': 'Expected day of month must be a number',
      'number.min': 'Expected day of month must be between 1 and 31',
      'number.max': 'Expected day of month must be between 1 and 31'
    }),

  hours_per_week: Joi.number().min(0).max(168).allow(null).optional()
    .messages({
      'number.base': 'Hours per week must be a number',
      'number.min': 'Hours per week cannot be negative',
      'number.max': 'Hours per week cannot exceed 168'
    }),

  last_payment_date: Joi.date().iso().allow(null).optional()
    .messages({
      'date.format': 'Last payment date must be a valid date'
    }),

  is_active: Joi.boolean().optional(),

  notes: Joi.string().max(1000).allow(null, '').optional()
    .messages({
      'string.max': 'Notes must be less than 1000 characters'
    })
}).when(Joi.object({ frequency: Joi.valid('hourly') }).unknown(), {
  then: Joi.object({
    hours_per_week: Joi.number().min(1).required()
  })
}).when(Joi.object({ frequency: Joi.valid('monthly') }).unknown(), {
  then: Joi.object({
    expected_day_of_month: Joi.number().integer().min(1).max(31).required()
  })
});

export const updateIncomeSourceSchema = Joi.object({
  name: Joi.string().min(1).max(255)
    .messages({
      'string.empty': 'Name cannot be empty',
      'string.max': 'Name must be less than 255 characters'
    }),

  monthly_amount: Joi.number().min(0)
    .messages({
      'number.min': 'Monthly amount cannot be negative'
    }),

  frequency: Joi.string()
    .valid('hourly', 'weekly', 'biweekly', 'semimonthly', 'monthly', 'annually'),

  expected_day_of_month: Joi.number().integer().min(1).max(31).allow(null)
    .messages({
      'number.base': 'Expected day of month must be a number',
      'number.min': 'Expected day of month must be between 1 and 31',
      'number.max': 'Expected day of month must be between 1 and 31'
    }),

  hours_per_week: Joi.number().min(0).max(168).allow(null)
    .messages({
      'number.base': 'Hours per week must be a number',
      'number.min': 'Hours per week cannot be negative',
      'number.max': 'Hours per week cannot exceed 168'
    }),

  last_payment_date: Joi.date().iso().allow(null)
    .messages({
      'date.format': 'Last payment date must be a valid date'
    }),

  is_active: Joi.boolean(),

  sort_order: Joi.number().integer().min(0),

  notes: Joi.string().max(1000).allow(null, '')
    .messages({
      'string.max': 'Notes must be less than 1000 characters'
    })
}).when(Joi.object({ frequency: Joi.valid('hourly') }).unknown(), {
  then: Joi.object({
    hours_per_week: Joi.number().min(1).required()
  })
}).when(Joi.object({ frequency: Joi.valid('monthly') }).unknown(), {
  then: Joi.object({
    expected_day_of_month: Joi.number().integer().min(1).max(31).required()
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});
