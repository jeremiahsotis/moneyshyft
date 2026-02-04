import Joi from 'joi';

// Account type enum
export const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'cash', 'investment'] as const;

export const createAccountSchema = Joi.object({
  name: Joi.string().min(1).max(255).required()
    .messages({
      'string.empty': 'Account name is required',
      'string.max': 'Account name must be less than 255 characters'
    }),

  type: Joi.string().valid(...ACCOUNT_TYPES).required()
    .messages({
      'any.only': 'Account type must be one of: checking, savings, credit, cash, investment',
      'any.required': 'Account type is required'
    }),

  starting_balance: Joi.number().default(0)
    .messages({
      'number.base': 'Starting balance must be a number'
    }),

  is_active: Joi.boolean().default(true)
});

export const updateAccountSchema = Joi.object({
  name: Joi.string().min(1).max(255)
    .messages({
      'string.empty': 'Account name cannot be empty',
      'string.max': 'Account name must be less than 255 characters'
    }),

  is_active: Joi.boolean()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});
