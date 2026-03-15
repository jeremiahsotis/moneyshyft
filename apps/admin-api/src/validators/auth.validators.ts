import Joi from 'joi';
import { loginSchema, signupSchema } from '../../../../libs/http/dist/validators/auth';

export { loginSchema, signupSchema };

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  resetBaseUrl: Joi.string().uri({ scheme: [/https?/] }).optional().messages({
    'string.uri': 'resetBaseUrl must be a valid http/https URL',
  }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().min(16).required().messages({
    'string.min': 'Reset token is invalid',
    'any.required': 'Reset token is required',
  }),
  newPassword: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'New password is required',
  }),
});
