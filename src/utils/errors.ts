/**
 * Clases de error personalizadas para el parser
 */

export class ParserError extends Error {
  constructor(
    message: string,
    public readonly context?: any,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ParserError';
    
    // Mantener el stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ParserError);
    }
  }
}

export class ValidationError extends ParserError {
  constructor(
    message: string,
    public readonly validationErrors: string[] = [],
    context?: any
  ) {
    super(message, context, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ExpansionError extends ParserError {
  constructor(
    message: string,
    public readonly pattern: string,
    context?: any
  ) {
    super(message, context, 'EXPANSION_ERROR');
    this.name = 'ExpansionError';
  }
}

export class CalculationError extends ParserError {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly values: any[],
    context?: any
  ) {
    super(message, context, 'CALCULATION_ERROR');
    this.name = 'CalculationError';
  }
}

export class TimeoutError extends ParserError {
  constructor(
    message: string = 'Operación excedió el tiempo límite',
    public readonly timeoutMs: number,
    context?: any
  ) {
    super(message, context, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}

/**
 * Helper para crear errores con contexto
 */
export function createError(
  type: 'parser' | 'validation' | 'expansion' | 'calculation' | 'timeout',
  message: string,
  details?: any
): ParserError {
  switch (type) {
    case 'validation':
      return new ValidationError(message, details?.errors, details?.context);
    case 'expansion':
      return new ExpansionError(message, details?.pattern, details?.context);
    case 'calculation':
      return new CalculationError(message, details?.operation, details?.values, details?.context);
    case 'timeout':
      return new TimeoutError(message, details?.timeoutMs, details?.context);
    default:
      return new ParserError(message, details?.context, details?.code);
  }
}

/**
 * Helper para manejar errores de forma segura
 */
export function safeParse<T>(fn: () => T, errorMessage: string): T | null {
  try {
    return fn();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    return null;
  }
}

/**
 * Verifica si un error es del tipo ParserError
 */
export function isParserError(error: any): error is ParserError {
  return error instanceof ParserError || error?.name?.includes('Error');
}