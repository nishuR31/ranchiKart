export class AppError extends Error {
  public statusCode: number;
  public details: any;

  constructor(message: string = "Error", statusCode: number = 500, details: any = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation Failed", details: any = {}) {
    super(message, 400, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad Request", details: any = {}) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized Access", details: any = {}) {
    super(message, 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied. Insufficient permissions.", details: any = {}) {
    super(message, 403, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", details: any = {}) {
    super(message, 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists", details: any = {}) {
    super(message, 409, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = "Too many requests, please try again later.", details: any = {}) {
    super(message, 429, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Something went wrong", details: any = {}) {
    super(message, 500, details);
  }
}

export class MethodNotAllowedError extends AppError {
  constructor(message: string = "Method Not Allowed", details: any = {}) {
    super(message, 405, details);
  }
}
