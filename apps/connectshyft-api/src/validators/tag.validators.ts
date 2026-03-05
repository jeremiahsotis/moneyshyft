import Joi from 'joi';

export const createTagSchema = Joi.object({
  name: Joi.string().min(1).max(255).required()
    .messages({
      'string.empty': 'Name is required',
      'string.max': 'Name must be less than 255 characters'
    }),
  parent_tag_id: Joi.string().uuid().allow(null).optional()
    .messages({
      'string.guid': 'Parent tag ID must be a valid UUID'
    }),
  color: Joi.string().max(7).allow(null, '').optional(),
  icon: Joi.string().max(50).allow(null, '').optional()
});

export const updateTagSchema = Joi.object({
  name: Joi.string().min(1).max(255)
    .messages({
      'string.empty': 'Name cannot be empty',
      'string.max': 'Name must be less than 255 characters'
    }),
  parent_tag_id: Joi.string().uuid().allow(null)
    .messages({
      'string.guid': 'Parent tag ID must be a valid UUID'
    }),
  color: Joi.string().max(7).allow(null, ''),
  icon: Joi.string().max(50).allow(null, ''),
  is_active: Joi.boolean()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});
