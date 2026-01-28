/**
 * Patrones regex para el parser de lotería
 */

export const PATTERNS = {
  // Números básicos
  NUMERO_2D: /\b\d{2}\b/g,
  NUMERO_3D: /\b\d{3}\b/g,
  NUMERO_4D: /\b\d{4}\b/g,
  NUMERO_CUALQUIERA: /\b\d{1,4}\b/g,
  
  // Montos y dinero
  MONTO: /\b\d+(?:[.,]\d+)?\b/g,
  MONTO_CON: /(?:con|de|a)\s*(\d+(?:[.,]\d+)?)/i,
  MONTO_DOBLE: /(?:con|de|a)\s*(\d+(?:[.,]\d+)?)\s*y\s*(\d+(?:[.,]\d+)?)/i,
  MONTO_TRIPLE: /(?:con|de|a)\s*(\d+(?:[.,]\d+)?)\s*y\s*(\d+(?:[.,]\d+)?)\s*y\s*(\d+(?:[.,]\d+)?)/i,
  
  // Patrones especiales
  VOLTEO: /(\d{2,4})\s*v\b/gi,
  RANGO: /(\d{1,2})\s*al\s*(\d{1,2})/gi,
  DECENA: /\bd\s*(\d{1,2})\b/gi,
  TERMINAL: /\bt\s*(\d{1,2})\b/gi,
  PARES_RELATIVOS: /(\d{2,4})\s*pr\s*(\d{1,3})/gi,
  CENTENAS_TODAS: /(.+?)\s*por\s*todas?\s*(?:las?\s*)?centenas?(?:\s+con\s+(\d+(?:[.,]\d+)?))?/gi,
  
  // Apuestas especiales
  PARLE_EXPLICITO: /(\d{2,4})\s*[*x]\s*(\d{2,4})/gi,
  PARLE_INLINE: /\bp\s*(\d+(?:[.,]\d+)?)\s*$/i,
  PARLE: /\bparle\s*(?:con\s*)?(\d+(?:[.,]\d+)?)/i,
  CANDADO: /\bcandado\s*(?:con\s*)?(\d+(?:[.,]\d+)?)/i,
  
  // Totales
  TOTAL: /^\s*total\b[:\s]*\$?\s*(\d+(?:[.,]\d+)?)/im,
  
  // Nombres de jugador
  NOMBRE_JUGADOR: /^[A-Za-zÁ-ÿ][A-Za-zÁ-ÿ\s]{1,34}$/,
  
  // Operadores y separadores
  OPERADOR_MULTIPLICACION: /[*x×]/g,
  SEPARADOR_Y: /\s+y\s+/gi,
  
  // Validaciones
  SOLO_NUMEROS: /^\d+$/,
  SOLO_LETRAS: /^[A-Za-zÁ-ÿ\s]+$/,
  
  // Caracteres especiales a normalizar
  CEROS_VARIANTES: /[oOøØοΟ]/g,
  UNOS_VARIANTES: /[lI|]/g,
  
  // Caracteres no permitidos
  CARACTERES_INVALIDOS: /[^\d\s\n.,a-záéíóúñüA-ZÁÉÍÓÚÑÜ\-*xconypdealtprv]/g
} as const;

/**
 * Tipos de apuesta y sus patrones asociados
 */
export const APUESTA_PATTERNS = {
  FIJO: {
    pattern: /(\d{2}(?:\s+\d{2})*)\s+con\s+(\d+(?:[.,]\d+)?)/i,
    description: 'Apuesta fija simple'
  },
  FIJO_CORRIDO: {
    pattern: /(\d{2}(?:\s+\d{2})*)\s+con\s+(\d+(?:[.,]\d+)?)\s+y\s+(\d+(?:[.,]\d+)?)/i,
    description: 'Apuesta fija y corrida'
  },
  PARLE_SIMPLE: {
    pattern: /(\d{2})\s*[*x]\s*(\d{2})\s+parle\s+(?:con\s+)?(\d+(?:[.,]\d+)?)/i,
    description: 'Parle simple entre dos números'
  },
  PARLE_COMPUESTO: {
    pattern: /(\d{2}(?:\s+\d{2})*)\s+con\s+(\d+(?:[.,]\d+)?)\s+p\s*(\d+(?:[.,]\d+)?)/i,
    description: 'Parle compuesto sobre números'
  },
  CENTENA_SIMPLE: {
    pattern: /(\d{3}(?:\s+\d{3})*)\s+con\s+(\d+(?:[.,]\d+)?)/i,
    description: 'Centena simple'
  },
  CENTENA_COMPUESTA: {
    pattern: /(\d{3}(?:\s+\d{3})*)\s+con\s+(\d+(?:[.,]\d+)?)\s+y\s+(\d+(?:[.,]\d+)?)\s+y\s+(\d+(?:[.,]\d+)?)/i,
    description: 'Centena con fijos y corridos derivados'
  },
  CANDADO: {
    pattern: /(\d{2}(?:\s+\d{2})*)\s+con\s+(\d+(?:[.,]\d+)?)(?:\s+y\s+(\d+(?:[.,]\d+)?))?\s+candado\s+(?:con\s+)?(\d+(?:[.,]\d+)?)/i,
    description: 'Candado con apuestas base'
  }
} as const;

/**
 * Patrones para detección de tipo de línea
 */
export const LINE_PATTERNS = {
  ES_NOMBRE: /^[A-Za-zÁ-ÿ][A-Za-zÁ-ÿ\s]{1,35}$/,
  ES_TOTAL: /^\s*total\b/i,
  ES_APUESTA: /\d.*(?:con|parle|candado|v\b|al\b|d\s*\d|t\s*\d|pr\s*\d)/i,
  ES_COMENTARIO: /^[^0-9]*$/,
  ES_VACIA: /^\s*$/
} as const;

/**
 * Valores por defecto y límites
 */
export const DEFAULT_VALUES = {
  MONTO_FIJO_DEFAULT: 1,
  MONTO_CORRIDO_DEFAULT: 0,
  MONTO_PARLE_DEFAULT: 1,
  MAX_JUGADORES: 100,
  MAX_NUMEROS_POR_LINEA: 50,
  MAX_EXPANSION: 1000,
  MAX_MONTO: 1000000,
  TIMEOUT_MS: 5000
} as const;

/**
 * Mensajes de error y advertencia
 */
export const MESSAGES = {
  ERRORS: {
    NO_NUMBERS: 'No se encontraron números en la línea',
    NO_AMOUNTS: 'No se encontraron montos en la línea',
    INVALID_NUMBER: 'Número inválido: ',
    INVALID_AMOUNT: 'Monto inválido: ',
    MAX_PLAYERS_EXCEEDED: 'Número máximo de jugadores excedido',
    MAX_NUMBERS_EXCEEDED: 'Número máximo de números por línea excedido',
    PARSE_TIMEOUT: 'Tiempo de parseo excedido',
    TOTAL_MISMATCH: 'El total calculado no coincide con el declarado'
  },
  WARNINGS: {
    DUPLICATE_NUMBERS: 'Números duplicados encontrados: ',
    ZERO_AMOUNT: 'Monto cero detectado',
    LARGE_EXPANSION: 'Expansión grande detectada, puede afectar el rendimiento',
    UNKNOWN_PATTERN: 'Patrón no reconocido encontrado',
    NO_PLAYER_NAME: 'No se detectó nombre de jugador'
  },
  SUGGESTIONS: {
    ADD_CON: 'Agregue "con X" para especificar el monto',
    USE_PARLE_CON: 'Use "parle con X" en lugar de solo "parle"',
    USE_CANDADO_CON: 'Use "candado con X" en lugar de solo "candado"',
    CHECK_TOTAL: 'Verifique que el total declarado sea correcto',
    FORMAT_NUMBERS: 'Formatee los números con dos dígitos (ej: 05 en lugar de 5)'
  }
} as const;

/**
 * Expresiones regulares compiladas para mejor rendimiento
 */
export class CompiledPatterns {
  static readonly NUMERO_2D = new RegExp(PATTERNS.NUMERO_2D.source, 'g');
  static readonly VOLTEO = new RegExp(PATTERNS.VOLTEO.source, 'gi');
  static readonly RANGO = new RegExp(PATTERNS.RANGO.source, 'gi');
  static readonly TOTAL = new RegExp(PATTERNS.TOTAL.source, 'im');
  static readonly PARLE_EXPLICITO = new RegExp(PATTERNS.PARLE_EXPLICITO.source, 'gi');
}