import { 
  ProcessorPlugin, 
  Jugada, 
  ValidationResult, 
  PluginContext,
  ParserConfig,
  DetalleApuesta
} from '../types';

/**
 * Clase base abstracta para plugins del parser
 * Proporciona funcionalidades comunes y estructura estándar
 */
export abstract class BasePlugin implements ProcessorPlugin {
  public abstract name: string;
  public abstract version: string;
  public abstract priority: number;
  
  protected config: ParserConfig | null = null;
  protected initialized = false;
  
  /**
   * Inicializa el plugin con la configuración del parser
   */
  init(config: ParserConfig): void {
    this.config = config;
    this.initialized = true;
    this.onInit();
  }
  
  /**
   * Limpia recursos del plugin
   */
  cleanup(): void {
    this.onCleanup();
    this.config = null;
    this.initialized = false;
  }
  
  /**
   * Verifica si el plugin puede procesar el texto
   */
  abstract canProcess(text: string): boolean;
  
  /**
   * Procesa el texto y devuelve una jugada
   */
  abstract process(text: string, context: PluginContext): Jugada;
  
  /**
   * Valida una jugada procesada
   */
  validate(jugada: Jugada): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Validaciones básicas comunes a todos los plugins
    if (!jugada.jugador || jugada.jugador.trim() === '') {
      warnings.push('Nombre de jugador vacío o no identificado');
    }
    
    if (jugada.totalCalculado < 0 && this.config?.allowNegative === false) {
      errors.push('Total calculado negativo no permitido');
    }
    
    if (jugada.detalles.length === 0) {
      warnings.push('No se generaron detalles de apuestas');
    }
    
    // Validar cada detalle
    jugada.detalles.forEach((detalle, index) => {
      const detailValidation = this.validateDetalle(detalle, index);
      
      if (!detailValidation.valid) {
        errors.push(...detailValidation.errors);
      }
      
      if (detailValidation.warnings.length > 0) {
        warnings.push(...detailValidation.warnings);
      }
    });
    
    // Validaciones específicas del plugin
    const pluginValidation = this.onValidate(jugada);
    if (!pluginValidation.valid) {
      errors.push(...pluginValidation.errors);
      warnings.push(...pluginValidation.warnings);
      suggestions.push(...pluginValidation.suggestions);
    }
    
    return {
      valid: errors.length === 0,
      errors: [...new Set(errors)],
      warnings: [...new Set(warnings)],
      suggestions: [...new Set(suggestions)],
      info: this.getValidationInfo(jugada)
    };
  }
  
  /**
   * Hook para inicialización personalizada
   */
  protected onInit(): void {
    // Para ser sobrescrito por plugins hijos
  }
  
  /**
   * Hook para limpieza personalizada
   */
  protected onCleanup(): void {
    // Para ser sobrescrito por plugins hijos
  }
  
  /**
   * Hook para validación personalizada
   */
  protected onValidate(jugada: Jugada): ValidationResult {
    return {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      info: {}
    };
  }
  
  /**
   * Valida un detalle de apuesta individual
   */
  protected validateDetalle(detalle: DetalleApuesta, index: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    if (!detalle.tipo) {
      errors.push(`Detalle ${index + 1}: Tipo no especificado`);
    }
    
    if (!detalle.numeros || detalle.numeros.length === 0) {
      errors.push(`Detalle ${index + 1}: Sin números`);
    }
    
    if (detalle.monto === undefined || isNaN(detalle.monto)) {
      errors.push(`Detalle ${index + 1}: Monto inválido`);
    }
    
    if (detalle.montoUnitario === undefined || isNaN(detalle.montoUnitario)) {
      warnings.push(`Detalle ${index + 1}: Monto unitario inválido`);
    }
    
    // Validar números
    detalle.numeros.forEach(num => {
      if (!this.isValidNumber(num)) {
        errors.push(`Detalle ${index + 1}: Número inválido "${num}"`);
      }
    });
    
    // Validar montos contra configuración
    if (this.config) {
      if (detalle.monto > this.config.maxMonto) {
        warnings.push(`Detalle ${index + 1}: Monto excede máximo permitido (${this.config.maxMonto})`);
      }
      
      if (detalle.monto < 0 && !this.config.allowNegative) {
        errors.push(`Detalle ${index + 1}: Monto negativo no permitido`);
      }
    }
    
    // Validaciones específicas por tipo
    switch (detalle.tipo) {
      case 'parle':
        if (detalle.combinaciones === undefined || detalle.combinaciones < 1) {
          warnings.push(`Detalle ${index + 1}: Parle con combinaciones inválidas`);
        }
        break;
        
      case 'candado':
        if (detalle.combinaciones === undefined) {
          warnings.push(`Detalle ${index + 1}: Candado sin combinaciones especificadas`);
        }
        break;
        
      case 'centena':
        const invalidCentenas = detalle.numeros.filter(n => n.length !== 3);
        if (invalidCentenas.length > 0) {
          errors.push(`Detalle ${index + 1}: Centenas inválidas: ${invalidCentenas.join(', ')}`);
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      info: {
        index,
        type: detalle.tipo,
        numberCount: detalle.numeros.length
      }
    };
  }
  
  /**
   * Verifica si un número es válido según las reglas del plugin
   */
  protected isValidNumber(num: string): boolean {
    if (!num || typeof num !== 'string') return false;
    
    // Longitudes permitidas: 2, 3, o 4 dígitos
    if (!/^\d{2,4}$/.test(num)) return false;
    
    const n = parseInt(num, 10);
    
    // Validar según longitud
    if (num.length === 2) {
      return n >= 0 && n <= 99;
    } else if (num.length === 3) {
      return n >= 0 && n <= 999;
    } else if (num.length === 4) {
      return n >= 0 && n <= 9999;
    }
    
    return false;
  }
  
  /**
   * Extrae números de un texto
   */
  protected extractNumbers(text: string): string[] {
    const numbers: string[] = [];
    const matches = text.match(/\b\d{1,4}\b/g) || [];
    
    for (const match of matches) {
      if (match.length === 2) {
        numbers.push(match);
      } else if (match.length === 3) {
        numbers.push(match); // Centena
      } else if (match.length === 4) {
        // Para pares relativos, separar en dos números
        numbers.push(match.substring(0, 2), match.substring(2, 4));
      }
    }
    
    return numbers;
  }
  
  /**
   * Extrae montos de un texto
   */
  protected extractAmounts(text: string): number[] {
    const amounts: number[] = [];
    const matches = text.match(/\d+(?:[.,]\d+)?/g) || [];
    
    for (const match of matches) {
      const normalized = match.replace(',', '.');
      const amount = parseFloat(normalized);
      if (!isNaN(amount)) {
        amounts.push(amount);
      }
    }
    
    return amounts;
  }
  
  /**
   * Crea un detalle de apuesta estándar
   */
  protected createDetalle(
    tipo: DetalleApuesta['tipo'],
    numeros: string[],
    montoUnitario: number,
    lineaOriginal: string,
    lineaNumero?: number,
    extras?: Partial<DetalleApuesta>
  ): DetalleApuesta {
    const monto = numeros.length * montoUnitario;
    
    return {
      tipo,
      numeros,
      monto,
      montoUnitario,
      lineaOriginal,
      lineaNumero,
      ...extras
    };
  }
  
  /**
   * Crea una jugada básica
   */
  protected createJugada(
    jugador: string,
    detalles: DetalleApuesta[],
    totalDeclarado: number | null = null,
    lineas: string[] = [],
    extras?: Partial<Jugada>
  ): Jugada {
    const totalCalculado = detalles.reduce((sum, d) => sum + d.monto, 0);
    const betTypes = new Set(detalles.map(d => d.tipo));
    
    return {
      jugador,
      totalCalculado,
      totalDeclarado,
      lineas,
      detalles,
      isValid: totalDeclarado === null || Math.abs(totalCalculado - totalDeclarado) < 0.01,
      warnings: [],
      errors: [],
      metadata: {
        timestamp: Date.now(),
        processingTime: 0,
        lineCount: lineas.length,
        numberCount: detalles.reduce((sum, d) => sum + d.numeros.length, 0),
        betTypes
      },
      ...extras
    };
  }
  
  /**
   * Obtiene información para la validación
   */
  private getValidationInfo(jugada: Jugada): any {
    return {
      plugin: this.name,
      player: jugada.jugador,
      detailCount: jugada.detalles.length,
      totalAmount: jugada.totalCalculado,
      isValid: jugada.isValid,
      hasWarnings: jugada.warnings.length > 0
    };
  }
  
  /**
   * Verifica si el plugin está inicializado
   */
  protected ensureInitialized(): void {
    if (!this.initialized || !this.config) {
      throw new Error(`Plugin ${this.name} no está inicializado`);
    }
  }
  
  /**
   * Genera un ID único para el plugin
   */
  protected generatePluginId(): string {
    return `${this.name}-${this.version}-${Date.now()}`;
  }
}