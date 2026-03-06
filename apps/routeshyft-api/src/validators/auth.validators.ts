import Joi from 'joi';

export const signupSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required',
  }),
  firstName: Joi.string().min(1).max(100).required().messages({
    'string.min': 'First name cannot be empty',
    'string.max': 'First name must be less than 100 characters',
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Last name cannot be empty',
    'string.max': 'Last name must be less than 100 characters',
    'any.required': 'Last name is required',
  }),
  householdName: Joi.string().min(1).max(255).optional().messages({
    'string.min': 'Household name cannot be empty',
    'string.max': 'Household name must be less than 255 characters',
  }),
  invitationCode: Joi.string().length(6).uppercase().optional().messages({
    'string.length': 'Invitation code must be exactly 6 characters',
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
  rememberMe: Joi.boolean().optional().messages({
    'boolean.base': 'Remember Me must be a boolean value',
  }),
});
