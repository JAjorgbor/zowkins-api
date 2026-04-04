import httpStatus from "http-status";
import { ZodError, type ZodType } from "zod";
import type { Request, Response, NextFunction } from "express";
import ApiError from "@/utils/api-error.js";

type Schema = {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
};

const validateRoute =
  (schema: Schema) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as any;
      }
      if (schema.query) {
        req.query = (await schema.query.parseAsync(req.query)) as any;
      }
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = error.issues
          .map((issue) => {
            const field = issue.path.length ? issue.path.join(".") : "body";
            return `${field}: ${issue.message}`;
          })
          .join(", ");
      }
      return next(error);
    }
  };

export default validateRoute;

export const validateService = (schema: ZodType, fields: any) => {
  try {
    schema.parse(fields);
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessage = error.issues
        .map((issue) => {
          const field = issue.path.length ? issue.path.join(".") : "body";
          return `${field}: ${issue.message}`;
        })
        .join(", ");
      throw new ApiError(httpStatus.BAD_REQUEST, errorMessage);
    }
  }
};
