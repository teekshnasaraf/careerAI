import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const firstError =
        Object.values(fieldErrors).flat()[0] || "Validation failed";

      res.status(400).json({
        success: false,
        message: firstError,
        errors: fieldErrors,
      });
      return;
    }

    req.body = result.data;
    next();
  };

export default validate;