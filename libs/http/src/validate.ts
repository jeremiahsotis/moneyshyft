import Joi from 'joi';

type RequestLike = {
  body: unknown;
};

type JsonResponseLike = {
  json(payload: unknown): unknown;
};

type ResponseLike = {
  status(code: number): JsonResponseLike;
};

type NextLike = () => unknown;

export function validateRequest(schema: Joi.Schema) {
  return (req: RequestLike, res: ResponseLike, next: NextLike): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
      return;
    }

    req.body = value;
    next();
  };
}
