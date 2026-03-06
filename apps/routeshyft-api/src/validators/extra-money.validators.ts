import Joi from 'joi';

export const createExtraMoneySchema = Joi.object({
  transaction_id: Joi.string().uuid().optional().allow(null),
  source: Joi.string().max(100).required(),
  amount: Joi.number().positive().required(),
  received_date: Joi.date().iso().required(),
  notes: Joi.string().max(500).optional().allow(null, '')
});

export const assignExtraMoneySchema = Joi.object({
  savings_reserve: Joi.number().min(0).optional(),
  assignments: Joi.array()
    .items(
      Joi.object({
        category_id: Joi.string().uuid().allow(null),
        section_id: Joi.string().uuid().allow(null),
        amount: Joi.number().positive().required()
      }).custom((value, helpers) => {
        const hasCategory = !!value.category_id;
        const hasSection = !!value.section_id;
        if (hasCategory === hasSection) {
          return helpers.error('any.invalid', { message: 'Assignment must include either category_id or section_id' });
        }
        return value;
      })
    )
    .min(0)
    .required()
});

export const queryExtraMoneySchema = Joi.object({
  status: Joi.string().valid('pending', 'assigned', 'ignored').optional()
});

export const savePreferencesSchema = Joi.object({
  category_percentages: Joi.object()
    .pattern(
      Joi.string().uuid(), // category_id
      Joi.number().min(0).max(1) // percentage as decimal
    )
    .required()
    .custom((value, helpers) => value),
  section_percentages: Joi.object()
    .pattern(
      Joi.string().uuid(), // section_id
      Joi.number().min(0).max(1)
    )
    .optional()
    .default({}),
  default_categories: Joi.object({
    giving: Joi.string().uuid().optional(),
    debt: Joi.string().uuid().optional(),
    fun: Joi.string().uuid().optional(),
    savings: Joi.string().uuid().optional(),
    helping: Joi.string().uuid().optional()
  }).required(),
  default_sections: Joi.object({
    debt: Joi.string().uuid().optional(),
    fun: Joi.string().uuid().optional()
  }).optional().default({}),
  reserve_percentage: Joi.number().min(0).max(1).optional().default(0)
}).custom((value, helpers) => {
  const categoryTotal = Object.values(value.category_percentages || {}).reduce((sum: number, p: any) => sum + p, 0);
  const sectionTotal = Object.values(value.section_percentages || {}).reduce((sum: number, p: any) => sum + p, 0);
  const reserve = Number(value.reserve_percentage || 0);
  const total = categoryTotal + sectionTotal + reserve;
  if (Math.abs(total - 1.00) > 0.0001) {
    return helpers.error('any.invalid', { message: 'Percentages must sum to 100%' });
  }
  return value;
});

export const assignGoalsSchema = Joi.object({
  allocations: Joi.array()
    .items(
      Joi.object({
        goal_id: Joi.string().uuid().required(),
        amount: Joi.number().positive().required()
      })
    )
    .min(1)
    .required()
});
