import Joi from 'joi';

/**
 * Validator for creating an income assignment
 * Assignment can be at category level OR section level (not both)
 */
export const createAssignmentSchema = Joi.object({
  income_transaction_id: Joi.string().uuid().required()
    .messages({
      'any.required': 'Income transaction ID is required',
      'string.guid': 'Income transaction ID must be a valid UUID'
    }),
  category_id: Joi.string().uuid().optional()
    .messages({
      'string.guid': 'Category ID must be a valid UUID'
    }),
  section_id: Joi.string().uuid().optional()
    .messages({
      'string.guid': 'Section ID must be a valid UUID'
    }),
  amount: Joi.number().min(0.01).required()
    .messages({
      'any.required': 'Amount is required',
      'number.base': 'Amount must be a number',
      'number.min': 'Amount must be greater than 0'
    }),
  notes: Joi.string().max(500).allow('', null).optional()
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
}).custom((value, helpers) => {
  // Ensure exactly one of category_id or section_id is provided
  const hasCategoryId = !!value.category_id;
  const hasSectionId = !!value.section_id;

  if (!hasCategoryId && !hasSectionId) {
    return helpers.error('any.invalid', {
      message: 'Either category_id or section_id must be provided'
    });
  }

  if (hasCategoryId && hasSectionId) {
    return helpers.error('any.invalid', {
      message: 'Cannot set both category_id and section_id - choose one'
    });
  }

  return value;
});

/**
 * Validator for auto-assignment request
 */
export const autoAssignSchema = Joi.object({
  income_transaction_id: Joi.string().uuid().required()
    .messages({
      'any.required': 'Income transaction ID is required',
      'string.guid': 'Income transaction ID must be a valid UUID'
    })
});

/**
 * Validator for assign-to-categories request
 * Allows assigning to multiple categories using FIFO matching
 */
export const assignToCategoriesSchema = Joi.object({
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).required()
    .messages({
      'any.required': 'Month is required',
      'string.pattern.base': 'Month must be in YYYY-MM format (e.g., "2025-12")'
    }),
  assignments: Joi.array().items(
    Joi.object({
      category_id: Joi.string().uuid().optional()
        .messages({
          'string.guid': 'Category ID must be a valid UUID'
        }),
      section_id: Joi.string().uuid().optional()
        .messages({
          'string.guid': 'Section ID must be a valid UUID'
        }),
      amount: Joi.number().min(0.01).required()
        .messages({
          'any.required': 'Amount is required',
          'number.base': 'Amount must be a number',
          'number.min': 'Amount must be greater than 0'
        })
    }).custom((value, helpers) => {
      // Ensure exactly one of category_id or section_id is provided
      const hasCategoryId = !!value.category_id;
      const hasSectionId = !!value.section_id;

      if (!hasCategoryId && !hasSectionId) {
        return helpers.error('any.invalid', {
          message: 'Either category_id or section_id must be provided'
        });
      }

      if (hasCategoryId && hasSectionId) {
        return helpers.error('any.invalid', {
          message: 'Cannot set both category_id and section_id - choose one'
        });
      }

      return value;
    })
  ).min(1).required()
    .messages({
      'any.required': 'Assignments array is required',
      'array.min': 'At least one assignment is required'
    })
});

/**
 * Validator for auto-assign-all request
 */
export const autoAssignAllSchema = Joi.object({
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).required()
    .messages({
      'any.required': 'Month is required',
      'string.pattern.base': 'Month must be in YYYY-MM format (e.g., "2025-12")'
    })
});
