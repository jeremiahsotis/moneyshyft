import Joi from 'joi';

// Category section types
export const SECTION_TYPES = ['fixed', 'flexible', 'debt'] as const;

// Create section schema
export const createSectionSchema = Joi.object({
  name: Joi.string().min(1).max(255).required()
    .messages({
      'string.empty': 'Section name is required',
      'string.max': 'Section name must be less than 255 characters'
    }),

  type: Joi.string().valid(...SECTION_TYPES).required()
    .messages({
      'any.only': 'Section type must be "fixed", "flexible", or "debt"',
      'any.required': 'Section type is required'
    }),

  sort_order: Joi.number().integer().min(0).default(0)
});

// Update section schema
export const updateSectionSchema = Joi.object({
  name: Joi.string().min(1).max(255)
    .messages({
      'string.empty': 'Section name cannot be empty',
      'string.max': 'Section name must be less than 255 characters'
    }),

  type: Joi.string().valid(...SECTION_TYPES)
    .messages({
      'any.only': 'Section type must be "fixed", "flexible", or "debt"'
    }),

  sort_order: Joi.number().integer().min(0)
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Create category schema
export const createCategorySchema = Joi.object({
  section_id: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Section ID must be a valid UUID',
      'any.required': 'Section ID is required'
    }),

  name: Joi.string().min(1).max(255).required()
    .messages({
      'string.empty': 'Category name is required',
      'string.max': 'Category name must be less than 255 characters'
    }),

  parent_category_id: Joi.string().uuid().allow(null).optional()
    .messages({
      'string.guid': 'Parent category ID must be a valid UUID'
    }),

  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(null).optional()
    .messages({
      'string.pattern.base': 'Color must be a valid hex color code (e.g., #FF5733)'
    }),

  icon: Joi.string().max(50).allow(null).optional()
    .messages({
      'string.max': 'Icon must be less than 50 characters'
    }),

  sort_order: Joi.number().integer().min(0).default(0)
});

// Update category schema
export const updateCategorySchema = Joi.object({
  name: Joi.string().min(1).max(255)
    .messages({
      'string.empty': 'Category name cannot be empty',
      'string.max': 'Category name must be less than 255 characters'
    }),

  parent_category_id: Joi.string().uuid().allow(null)
    .messages({
      'string.guid': 'Parent category ID must be a valid UUID'
    }),

  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(null)
    .messages({
      'string.pattern.base': 'Color must be a valid hex color code (e.g., #FF5733)'
    }),

  icon: Joi.string().max(50).allow(null)
    .messages({
      'string.max': 'Icon must be less than 50 characters'
    }),

  sort_order: Joi.number().integer().min(0),

  is_archived: Joi.boolean()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});
