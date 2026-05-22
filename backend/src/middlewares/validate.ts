import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => {
          // path might start with 'body', 'query', or 'params'. Strip it for cleaner client response
          const field = err.path.length > 1 ? err.path.slice(1).join('.') : err.path[0];
          return {
            field,
            message: err.message,
          };
        });
        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors,
        });
        return;
      }
      next(error);
    }
  };
};
