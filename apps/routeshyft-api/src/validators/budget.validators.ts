import Joi from 'joi';

/**
 * Validator for creating a budget month
 */
export const createBudgetMonthSchema = Joi.object({
  month: Joi.date().iso().required()
    .messages({
      'any.required': 'Budget month is required',
      'date.base': 'Month must be a valid date'
    }),
  notes: Joi.string().max(1000).allow('', null).optional()
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    })
});

/**
 * Validator for updating a budget month
 */
export const updateBudgetMonthSchema = Joi.object({
  notes: Joi.string().max(1000).allow('', null).optional()
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    })
});

/**
 * Validator for creating/updating budget allocations
 * Allocation can be at category level OR section level (not both)
 */
export const setBudgetAllocationSchema = Joi.object({
  category_id: Joi.string().uuid().optional()
    .messages({
      'string.guid': 'Category ID must be a valid UUID'
    }),
  section_id: Joi.string().uuid().optional()
    .messages({
      'string.guid': 'Section ID must be a valid UUID'
    }),
  allocated_amount: Joi.number().min(0).required()
    .messages({
      'any.required': 'Allocated amount is required',
      'number.base': 'Allocated amount must be a number',
      'number.min': 'Allocated amount cannot be negative'
    }),
  rollup_mode: Joi.boolean().default(false)
    .messages({
      'boolean.base': 'Rollup mode must be a boolean'
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

  // Validate rollup_mode matches the allocation type
  if (hasSectionId && value.rollup_mode !== true) {
    return helpers.error('any.invalid', {
      message: 'rollup_mode must be true when allocating to a section'
    });
  }

  if (hasCategoryId && value.rollup_mode !== false) {
    return helpers.error('any.invalid', {
      message: 'rollup_mode must be false when allocating to a category'
    });
  }

  return value;
});

/**
 * Validator for bulk allocation updates
 */
export const bulkSetAllocationsSchema = Joi.object({
  allocations: Joi.array().items(
    Joi.object({
      category_id: Joi.string().uuid().optional(),
      section_id: Joi.string().uuid().optional(),
      allocated_amount: Joi.number().min(0).required(),
      rollup_mode: Joi.boolean().default(false),
      notes: Joi.string().max(500).allow('', null).optional()
    })
  ).min(1).required()
    .messages({
      'any.required': 'Allocations array is required',
      'array.min': 'At least one allocation must be provided'
    })
});

/**
 * Validator for assigning account balance to category
 * Used during wizard setup when user assigns their existing account balances
 */
export const assignAccountBalanceSchema = Joi.object({
  category_id: Joi.string().uuid().optional().allow(null)
    .messages({
      'string.guid': 'Category ID must be a valid UUID'
    }),
  section_id: Joi.string().uuid().optional().allow(null)
    .messages({
      'string.guid': 'Section ID must be a valid UUID'
    }),
  account_id: Joi.string().uuid().optional().allow(null)
    .messages({
      'string.guid': 'Account ID must be a valid UUID'
    }),
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).optional()
    .messages({
      'string.pattern.base': 'Month must be in YYYY-MM format'
    }),
  amount: Joi.number().min(0.01).required()
    .messages({
      'any.required': 'Amount is required',
      'number.base': 'Amount must be a number',
      'number.min': 'Amount must be greater than 0'
    })
}).custom((value, helpers) => {
  const hasCategoryId = !!value.category_id;
  const hasSectionId = !!value.section_id;

  if (!hasCategoryId && !hasSectionId) {
    return helpers.error('any.invalid', { message: 'Either category_id or section_id must be provided' });
  }

  if (hasCategoryId && hasSectionId) {
    return helpers.error('any.invalid', { message: 'Cannot set both category_id and section_id' });
  }

  return value;
});
