/**
 * Custom HTTP error classes for API route handlers.
 * Each carries a statusCode so the catch block can return the right HTTP status.
 */

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Not your workspace') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid input') {
    super(message, 400);
  }
}

/**
 * Helper to build a JSON error response from an AppError (or unknown error).
 * Use in API route catch blocks.
 */
export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }
  // Unknown error — don't leak internal details
  console.error('Unhandled error:', error);
  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
