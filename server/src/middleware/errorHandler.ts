import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

export const errorHandler = (
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const status = error.status || error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  logger.error("Error occurred:", {
    error: message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  res.status(status).json({
    error: {
      message: status === 500 ? "Internal Server Error" : message,
      status,
      timestamp: new Date().toISOString(),
    },
  });
};
