import merge from 'lodash.merge';
import Decimal from 'decimal.js';
import { 
  ParserConfig, 
  ParseResult, 
  Jugada, 
  ValidationResult,
  ProcessorPlugin,
  PluginContext
} from './types';
import { Preprocessor } from './preprocessor';
import { PatternExpander } from './pattern-expander';
import { Validator } from './validators';
import { CacheManager } from './utils/cache';
import { ParserError, ValidationError } from './utils/errors';
import { formatCurrency, normalizeNumber } from './utils/formatters';
import { detectPatterns, extractMetadata } from './utils/analyzers';

const DEFAULT_CONFIG: ParserConfig = {
  strictMode: false,
  autoExpand: true,
  validateTotals: true,
  maxJugadores: 100,
  currencySymbol: '$',
  decimalSeparator: '.',
  allowNegative: false,
  maxMonto: 1000000,
  defaultMontoFijo: 1,
  defaultMontoCorrido: 0,
  debug: false,
  timeout: 5000,
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 minutos
    maxSize: 1000
  }
};

export class Parser {
  private config: ParserConfig;
  private preprocessor: Preprocessor;
  private expander: PatternExpander;
  private validator: Validator;
  private cache: CacheManager;
  private plugins: ProcessorPlugin[] = [];
  private isInitialized = false;

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = merge({}, DEFAULT_CONFIG, config);
    this.preprocessor = new Preprocessor(this.config);
    this.expander = new PatternExpander(this.config);
    this.validator = new Validator(this.config);
    this.cache = new CacheManager(this.config.cache);
    this.registerDefaultPlugins();
  }

  /**
   * Inicializa el parser (opcional, se llama automáticamente en parse)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Inicializar caché
    await this.cache.initialize();
    
    // Inicializar plugins
    for (const plugin of this.plugins) {
      if (plugin.init) {
        plugin.init(this.config);
      }
    }
    
    this.isInitialized = true;
  }

  /**
   * Registra un plugin para extender funcionalidades
   */
  registerPlugin(plugin: ProcessorPlugin): void {
    this.plugins.push(plugin);
    this.plugins.sort((a, b) => b.priority - a.priority);
    
    if (this.isInitialized && plugin.init) {
      plugin.init(this.config);
    }
  }

  /**
   * Parsea un texto completo con múltiples jugadas
   */
  parse(text: string): ParseResult {
    const startTime = Date.now();
    
    try {
      // Inicializar si no está inicializado
      if (!this.isInitialized) {
        this.initialize();
      }

      // Verificar timeout
      if (this.config.timeout) {
        setTimeout(() => {
          throw new ParserError('Timeout excedido durante el parseo');
        }, this.config.timeout);
      }

      // Verificar caché
      const cacheKey = `parse:${hashString(text)}:${JSON.stringify(this.config)}`;
      if (this.config.cache.enabled) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          return cached as ParseResult;
        }
      }

      // Preprocesar
      const preprocessed = this.preprocessor.process(text);
      
      // Validación inicial
      const validation = this.validator.validateSyntax(preprocessed);
      if (!validation.valid && this.config.strictMode) {
        throw new ValidationError('Validación de sintaxis fallida', validation.errors);
      }

      // Procesar bloques
      const bloques = this.extractBloques(preprocessed);
      
      if (bloques.length > this.config.maxJugadores) {
        throw new ParserError(
          `Número máximo de jugadores excedido: ${bloques.length} > ${this.config.maxJugadores}`
        );
      }

      const jugadas: Jugada[] = [];
      const warnings: string[] = [];
      const errors: string[] = [];

      // Estadísticas
      const stats = {
        fijos: 0,
        corridos: 0,
        parles: 0,
        centenas: 0,
        candados: 0,
        especiales: 0,
        totalApuestas: 0,
        totalNumeros: 0
      };

      for (const [index, bloque] of bloques.entries()) {
        try {
          const jugada = this.parseBloque(bloque, index);
          jugadas.push(jugada);

          // Actualizar estadísticas
          jugada.detalles.forEach(detalle => {
            stats[detalle.tipo as keyof typeof stats] += detalle.monto;
            stats.totalApuestas++;
            stats.totalNumeros += detalle.numeros.length;
          });

          // Validar jugada individual
          const jugadaValidation = this.validator.validateJugada(jugada);
          if (!jugadaValidation.valid) {
            warnings.push(...jugadaValidation.warnings.map(w => `[${jugada.jugador}] ${w}`));
            if (this.config.strictMode) {
              errors.push(...jugadaValidation.errors.map(e => `[${jugada.jugador}] ${e}`));
            }
          }
        } catch (error) {
          const errorMsg = `Error procesando bloque ${index + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
          errors.push(errorMsg);
          
          if (this.config.strictMode) {
            throw new ParserError(errorMsg, { bloque });
          }
        }
      }

      // Calcular totales con precisión decimal
      const totalCalculado = jugadas.reduce((sum, j) => 
        new Decimal(sum).plus(j.totalCalculado).toNumber(), 0
      );
      
      const totalDeclarado = jugadas.reduce((sum, j) => 
        new Decimal(sum).plus(j.totalDeclarado || 0).toNumber(), 0
      );
      
      const difference = Math.abs(totalCalculado - totalDeclarado);
      const isValid = difference < 0.01;
      
      const parseTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(jugadas, validation);

      const result: ParseResult = {
        success: errors.length === 0,
        jugadas,
        summary: {
          totalJugadas: jugadas.length,
          totalCalculado,
          totalDeclarado,
          difference,
          isValid,
          confidence
        },
        metadata: {
          parseTime,
          originalLength: text.length,
          processedLength: preprocessed.length,
          warnings,
          errors,
          cacheStats: this.cache.getStats()
        },
        stats
      };

      // Guardar en caché
      if (this.config.cache.enabled && result.success) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      const parseTime = Date.now() - startTime;
      
      return {
        success: false,
        jugadas: [],
        summary: {
          totalJugadas: 0,
          totalCalculado: 0,
          totalDeclarado: 0,
          difference: 0,
          isValid: false,
          confidence: 0
        },
        metadata: {
          parseTime,
          originalLength: text.length,
          processedLength: 0,
          warnings: [],
          errors: [error instanceof Error ? error.message : 'Error desconocido'],
          cacheStats: this.cache.getStats()
        },
        stats: {
          fijos: 0,
          corridos: 0,
          parles: 0,
          centenas: 0,
          candados: 0,
          especiales: 0,
          totalApuestas: 0,
          totalNumeros: 0
        }
      };
    }
  }

  /**
   * Valida una jugada sin procesarla completamente
   */
  validate(text: string): ValidationResult {
    const preprocessed = this.preprocessor.process(text);
    return this.validator.validateSyntax(preprocessed);
  }

  /**
   * Extrae la estructura básica de una jugada
   */
  extractStructure(text: string): any {
    const preprocessed = this.preprocessor.process(text);
    const bloques = this.extractBloques(preprocessed);
    
    return bloques.map((bloque, index) => {
      const lineas = bloque.split('\n').filter(l => l.trim());
      const jugador = this.extractJugador(bloque);
      
      return {
        id: index + 1,
        jugador,
        lineCount: lineas.length,
        lines: lineas.map((line, i) => ({
          number: i + 1,
          content: line,
          hasNumbers: /\d/.test(line),
          hasAmounts: /(?:con|de|a)\s*[\d.,]+/i.test(line),
          patternTypes: detectPatterns(line)
        })),
        metadata: extractMetadata(bloque)
      };
    });
  }

  /**
   * Limpia recursos del parser
   */
  async cleanup(): Promise<void> {
    await this.cache.cleanup();
    
    for (const plugin of this.plugins) {
      if (plugin.cleanup) {
        plugin.cleanup();
      }
    }
    
    this.isInitialized = false;
  }

  /**
   * Obtiene información de versión y configuración
   */
  getInfo(): {
    version: string;
    config: ParserConfig;
    plugins: string[];
    cacheStats: any;
  } {
    return {
      version: '1.0.0',
      config: this.config,
      plugins: this.plugins.map(p => p.name),
      cacheStats: this.cache.getStats()
    };
  }

  private registerDefaultPlugins(): void {
    // Plugins por defecto se registran aquí
    // Estos pueden estar en un archivo separado
  }

  private extractBloques(text: string): string[] {
    // Implementación mejorada de extracción de bloques
    const lines = text.split('\n');
    const bloques: string[] = [];
    let currentBloque: string[] = [];
    let inBloque = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed) {
        if (inBloque && currentBloque.length > 0) {
          bloques.push(currentBloque.join('\n'));
          currentBloque = [];
          inBloque = false;
        }
        continue;
      }

      // Detectar inicio de nuevo bloque (nombre de jugador)
      if (this.validator.isNombreJugador(trimmed) && !inBloque) {
        if (currentBloque.length > 0) {
          bloques.push(currentBloque.join('\n'));
        }
        currentBloque = [trimmed];
        inBloque = true;
      } else {
        currentBloque.push(line);
        inBloque = true;
      }
    }

    if (currentBloque.length > 0) {
      bloques.push(currentBloque.join('\n'));
    }

    return bloques.filter(b => b.trim().length > 0);
  }

  private extractJugador(bloque: string): string {
    const firstLine = bloque.split('\n')[0]?.trim() || '';
    if (this.validator.isNombreJugador(firstLine)) {
      return firstLine;
    }
    return 'Desconocido';
  }

  private parseBloque(bloque: string, bloqueIndex: number): Jugada {
    const lineas = bloque.split('\n').map(l => l.trim()).filter(l => l);
    const jugador = this.extractJugador(bloque);
    
    // Intentar con plugins primero
    const pluginContext: PluginContext = {
      config: this.config,
      jugador,
      totalDeclarado: this.extractTotalDeclarado(bloque),
      lineas: lineas.filter(l => 
        !this.validator.isNombreJugador(l) && 
        !this.validator.isTotalLine(l)
      )
    };

    for (const plugin of this.plugins) {
      if (plugin.canProcess(bloque)) {
        const jugada = plugin.process(bloque, pluginContext);
        if (jugada) {
          return this.enrichJugada(jugada, bloqueIndex);
        }
      }
    }

    // Procesamiento estándar
    return this.parseBloqueStandard(jugador, lineas, bloqueIndex);
  }

  private parseBloqueStandard(
    jugador: string,
    lineas: string[],
    bloqueIndex: number
  ): Jugada {
    // Implementación del procesamiento estándar
    // Esta es la lógica principal de tu parser original
    
    const detalles: DetalleApuesta[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    let totalDeclarado: number | null = null;
    const betTypes = new Set<TipoApuesta>();

    const startTime = Date.now();
    let lastFijoMonto = this.config.defaultMontoFijo;
    let lastCorridoMonto = this.config.defaultMontoCorrido;

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i];
      
      // Saltar línea de jugador
      if (i === 0 && this.validator.isNombreJugador(linea)) {
        continue;
      }

      // Extraer total declarado
      const totalMatch = linea.match(/total\s*[:=]?\s*\$?\s*([\d.,]+)/i);
      if (totalMatch) {
        totalDeclarado = parseFloat(totalMatch[1].replace(',', '.'));
        continue;
      }

      try {
        const detallesLinea = this.parseLinea(
          linea,
          i,
          lastFijoMonto,
          lastCorridoMonto
        );

        if (detallesLinea.length > 0) {
          detalles.push(...detallesLinea);
          
          // Actualizar últimos montos
          const ultimoDetalle = detallesLinea[detallesLinea.length - 1];
          if (ultimoDetalle.tipo === 'fijo') {
            lastFijoMonto = ultimoDetalle.montoUnitario;
          } else if (ultimoDetalle.tipo === 'corrido') {
            lastCorridoMonto = ultimoDetalle.montoUnitario;
          }

          // Registrar tipos de apuestas
          detallesLinea.forEach(d => betTypes.add(d.tipo));
        }
      } catch (error) {
        const errorMsg = `Línea ${i + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
        
        if (this.config.strictMode) {
          errors.push(errorMsg);
          throw new ParserError(errorMsg, { linea, lineNumber: i + 1 });
        } else {
          warnings.push(errorMsg);
        }
      }
    }

    const totalCalculado = detalles.reduce((sum, d) => 
      new Decimal(sum).plus(d.monto).toNumber(), 0
    );

    const isValid = totalDeclarado === null || 
      Math.abs(totalCalculado - totalDeclarado) < 0.01;

    const processingTime = Date.now() - startTime;

    return {
      jugador,
      totalCalculado,
      totalDeclarado,
      lineas: lineas.filter(l => !this.validator.isTotalLine(l)),
      detalles,
      isValid,
      warnings,
      errors,
      metadata: {
        timestamp: Date.now(),
        processingTime,
        lineCount: lineas.length,
        numberCount: detalles.reduce((sum, d) => sum + d.numeros.length, 0),
        betTypes
      }
    };
  }

  private parseLinea(
    linea: string,
    lineIndex: number,
    lastFijoMonto: number,
    lastCorridoMonto: number
  ): DetalleApuesta[] {
    // Implementación detallada del parseo de línea
    // Esta sería tu lógica actual de procesamiento por línea
    
    // Por ahora, devolvemos un array vacío
    // Debes implementar aquí tu lógica de parseo detallado
    return [];
  }

  private extractTotalDeclarado(bloque: string): number | null {
    const match = bloque.match(/total\s*[:=]?\s*\$?\s*([\d.,]+)/i);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
    return null;
  }

  private enrichJugada(jugada: Jugada, bloqueIndex: number): Jugada {
    // Enriquecer la jugada con metadatos adicionales
    return {
      ...jugada,
      metadata: {
        ...jugada.metadata,
        bloqueIndex,
        enriched: true
      }
    };
  }

  private calculateConfidence(jugadas: Jugada[], validation: ValidationResult): number {
    // Calcular confianza del parseo (0-1)
    let confidence = 1.0;

    // Penalizar por errores de validación
    if (validation.errors.length > 0) {
      confidence -= validation.errors.length * 0.1;
    }

    // Penalizar por advertencias
    if (validation.warnings.length > 0) {
      confidence -= validation.warnings.length * 0.05;
    }

    // Penalizar por jugadas inválidas
    const invalidJugadas = jugadas.filter(j => !j.isValid).length;
    if (invalidJugadas > 0) {
      confidence -= (invalidJugadas / jugadas.length) * 0.3;
    }

    // Bonus por jugadas con total declarado que coincide
    const exactMatches = jugadas.filter(j => 
      j.totalDeclarado !== null && 
      Math.abs(j.totalCalculado - j.totalDeclarado) < 0.01
    ).length;
    
    if (exactMatches > 0) {
      confidence += (exactMatches / jugadas.length) * 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}

// Función de hash simple para caché
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}