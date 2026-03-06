import Joi from 'joi';

export const createSplitSchema = Joi.object({
  splits: Joi.array()
    .min(2)
    .items(
      Joi.object({
        category_id: Joi.string().uuid().required()
          .messages({
            'string.guid': 'Category ID must be a valid UUID',
            'any.required': 'Category ID is required for each split'
          }),

        amount: Joi.number().required().invalid(0)
          .messages({
            'number.base': 'Amount must be a number',
            'any.invalid': 'Amount cannot be zero',
            'any.required': 'Amount is required for each split'
          }),

        notes: Joi.string().max(1000).allow('', null).optional()
          .messages({
            'string.max': 'Notes must be less than 1000 characters'
          })
      })
    )
    .required()
    .messages({
      'array.min': 'At least 2 splits are required',
      'any.required': 'Splits array is required'
    })
});

export const updateSplitSchema = Joi.object({
  splits: Joi.array()
    .min(2)
    .items(
      Joi.object({
        category_id: Joi.string().uuid().required()
          .messages({
            'string.guid': 'Category ID must be a valid UUID',
            'any.required': 'Category ID is required for each split'
          }),

        amount: Joi.number().required().invalid(0)
          .messages({
            'number.base': 'Amount must be a number',
            'any.invalid': 'Amount cannot be zero',
            'any.required': 'Amount is required for each split'
          }),

        notes: Joi.string().max(1000).allow('', null).optional()
          .messages({
            'string.max': 'Notes must be less than 1000 characters'
          })
      })
    )
    .required()
    .messages({
      'array.min': 'At least 2 splits are required',
      'any.required': 'Splits array is required'
    })
});

export const unsplitTransactionSchema = Joi.object({
  category_id: Joi.string().uuid().allow(null).optional()
    .messages({
      'string.guid': 'Category ID must be a valid UUID'
    })
});
