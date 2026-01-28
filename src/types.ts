/**
 * Tipos principales para la librería Loteria Parser
 */

export interface ParserConfig {
  /** Modo estricto: lanza errores en lugar de advertencias */
  strictMode: boolean;
  
  /** Expandir patrones automáticamente (volteos, rangos, etc.) */
  autoExpand: boolean;
  
  /** Validar que los totales declarados coincidan con los calculados */
  validateTotals: boolean;
  
  /** Número máximo de jugadores permitidos */
  maxJugadores: number;
  
  /** Símbolo de moneda */
  currencySymbol: string;
  
  /** Separador decimal */
  decimalSeparator: string;
  
  /** Permitir montos negativos */
  allowNegative: boolean;
  
  /** Monto máximo permitido por apuesta */
  maxMonto: number;
  
  /** Monto fijo por defecto cuando no se especifica */
  defaultMontoFijo: number;
  
  /** Monto corrido por defecto cuando no se especifica */
  defaultMontoCorrido: number;
  
  /** Incluir información de depuración en el resultado */
  debug: boolean;
  
  /** Límite de tiempo para el parseo (ms) */
  timeout: number;
  
  /** Configuración de caché */
  cache: {
    enabled: boolean;
    ttl: number; // Tiempo de vida en ms
    maxSize: number;
  };
}

export interface Jugada {
  /** Nombre del jugador */
  jugador: string;
  
  /** Total calculado por el parser */
  totalCalculado: number;
  
  /** Total declarado en el texto (si existe) */
  totalDeclarado: number | null;
  
  /** Líneas originales de la jugada */
  lineas: string[];
  
  /** Detalles de cada apuesta */
  detalles: DetalleApuesta[];
  
  /** Indica si la jugada es válida */
  isValid: boolean;
  
  /** Advertencias de procesamiento */
  warnings: string[];
  
  /** Errores críticos */
  errors: string[];
  
  /** Metadatos adicionales */
  metadata: {
    timestamp: number;
    processingTime: number;
    lineCount: number;
    numberCount: number;
    betTypes: Set<TipoApuesta>;
  };
}

export interface DetalleApuesta {
  /** Tipo de apuesta */
  tipo: TipoApuesta;
  
  /** Números involucrados */
  numeros: string[];
  
  /** Monto total de la apuesta */
  monto: number;
  
  /** Monto unitario (por número o combinación) */
  montoUnitario: number;
  
  /** Número de combinaciones (para parlés, candados) */
  combinaciones?: number;
  
  /** Pares específicos (para parlés explícitos) */
  pares?: [string, string][];
  
  /** Línea original donde se encontró la apuesta */
  lineaOriginal: string;
  
  /** Número de línea (1-indexed) */
  lineaNumero?: number;
  
  /** Información de expansión (para patrones expandidos) */
  expansion?: {
    original: string;
    expanded: string[];
    patternType?: PatternType;
  };
}

export type TipoApuesta = 
  | 'fijo' 
  | 'corrido' 
  | 'parle' 
  | 'centena' 
  | 'candado'
  | 'especial'
  | 'volteo'
  | 'rango';

export type PatternType = 
  | 'volteo' 
  | 'rango' 
  | 'decena' 
  | 'terminal' 
  | 'pares_relativos' 
  | 'centenas_todas'
  | 'simple';

export interface ParseResult {
  /** Indica si el parseo fue exitoso */
  success: boolean;
  
  /** Jugadas procesadas */
  jugadas: Jugada[];
  
  /** Resumen del procesamiento */
  summary: {
    totalJugadas: number;
    totalCalculado: number;
    totalDeclarado: number;
    difference: number;
    isValid: boolean;
    confidence: number; // 0-1
  };
  
  /** Metadatos del procesamiento */
  metadata: {
    parseTime: number;
    originalLength: number;
    processedLength: number;
    warnings: string[];
    errors: string[];
    cacheStats?: {
      hits: number;
      misses: number;
      size: number;
    };
  };
  
  /** Estadísticas detalladas */
  stats: {
    fijos: number;
    corridos: number;
    parles: number;
    centenas: number;
    candados: number;
    especiales: number;
    totalApuestas: number;
    totalNumeros: number;
  };
}

export interface ValidationResult {
  /** Indica si la validación fue exitosa */
  valid: boolean;
  
  /** Errores críticos */
  errors: string[];
  
  /** Advertencias */
  warnings: string[];
  
  /** Sugerencias de mejora */
  suggestions: string[];
  
  /** Información de validación */
  info: {
    hasJugadores: boolean;
    hasTotals: boolean;
    hasNumbers: boolean;
    estimatedLines: number;
    complexity: 'simple' | 'medium' | 'complex';
  };
}

export interface ProcessorPlugin {
  /** Nombre único del plugin */
  name: string;
  
  /** Versión del plugin */
  version: string;
  
  /** Prioridad (mayor = se ejecuta primero) */
  priority: number;
  
  /** Indica si el plugin puede procesar el texto */
  canProcess(text: string): boolean;
  
  /** Procesa el texto y devuelve una jugada */
  process(text: string, context: PluginContext): Jugada;
  
  /** Valida una jugada procesada */
  validate(jugada: Jugada): ValidationResult;
  
  /** Inicializa el plugin */
  init?(config: any): void;
  
  /** Limpia recursos del plugin */
  cleanup?(): void;
}

export interface PluginContext {
  /** Configuración del parser */
  config: ParserConfig;
  
  /** Jugador detectado */
  jugador: string;
  
  /** Total declarado (si existe) */
  totalDeclarado: number | null;
  
  /** Líneas a procesar */
  lineas: string[];
  
  /** Línea actual */
  currentLine?: string;
  
  /** Índice de línea actual */
  lineIndex?: number;
}

export interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface BenchmarkResult {
  name: string;
  opsPerSecond: number;
  averageTime: number;
  memoryUsed: number;
  runs: number;
}