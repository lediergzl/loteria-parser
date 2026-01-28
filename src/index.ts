/**
 * Loteria Parser - Parser avanzado para jugadas de lotería
 * @package loteria-parser
 * @version 1.0.0
 */

// Re-exportar todo desde los módulos principales
export * from './types';
export * from './parser';
export * from './preprocessor';
export * from './pattern-expander';
export * from './validators';
export * from './utils';
export * from './plugins';

// Exportaciones principales con documentación
import { Parser, ParserConfig, ParseResult } from './parser';
import { ValidationResult } from './validators';

/**
 * Crea una nueva instancia del parser configurable
 * @example
 * ```typescript
 * const parser = createParser({
 *   strictMode: true,
 *   validateTotals: true
 * });
 * const result = parser.parse(jugadaText);
 * ```
 */
export function createParser(config: Partial<ParserConfig> = {}): Parser {
  return new Parser(config);
}

/**
 * Función de conveniencia para parseo rápido
 * @example
 * ```typescript
 * const result = parseJugada('05 10 15 con 20');
 * console.log(result.summary.totalCalculado); // 60
 * ```
 */
export function parseJugada(text: string, options?: Partial<ParserConfig>): ParseResult {
  return createParser(options).parse(text);
}

/**
 * Valida el formato de una jugada sin procesarla completamente
 * @example
 * ```typescript
 * const validation = validateJugada('05 10 15 con 20');
 * if (validation.valid) {
 *   console.log('Formato válido');
 * }
 * ```
 */
export function validateJugada(text: string, options?: Partial<ParserConfig>): ValidationResult {
  return createParser(options).validate(text);
}

// Versión de la librería
export const VERSION = '1.0.0';