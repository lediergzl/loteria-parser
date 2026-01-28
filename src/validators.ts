import { ParserConfig, Jugada, ValidationResult, DetalleApuesta } from './types';
import { PATTERNS } from './constants/patterns';

/**
 * Validador para jugadas de lotería
 */
export class Validator {
  private patterns = PATTERNS;

  constructor(private config: ParserConfig) {}

  /**
   * Valida la sintaxis del texto completo
   */
  validateSyntax(text: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    const lines = text.split('\n').filter(l => l.trim());
    
    if (lines.length === 0) {
      errors.push('Texto vacío');
      return {
        valid: false,
        errors,
        warnings,
        suggestions,
        info: this.getTextInfo(text)
      };
    }
    
    // Validar cada línea
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      const lineValidation = this.validateLine(line, lineNumber);
      
      if (!lineValidation.valid) {
        errors.push(...lineValidation.errors);
      }
      
      if (lineValidation.warnings.length > 0) {
        warnings.push(...lineValidation.warnings);
      }
      
      if (lineValidation.suggestions.length > 0) {
        suggestions.push(...lineValidation.suggestions);
      }
    }
    
    // Validaciones globales
    this.validateGlobal(text, errors, warnings, suggestions);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      info: this.getTextInfo(text)
    };
  }

  /**
   * Valida una jugada procesada
   */
  validateJugada(jugada: Jugada): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Validar nombre del jugador
    if (!jugada.jugador || jugada.jugador === 'Desconocido') {
      warnings.push('Nombre de jugador no identificado');
    }
    
    // Validar montos
    if (jugada.totalCalculado < 0 && !this.config.allowNegative) {
      errors.push('Total calculado negativo');
    }
    
    if (jugada.totalCalculado > this.config.maxMonto) {
      warnings.push(`Total calculado (${jugada.totalCalculado}) excede el máximo permitido (${this.config.maxMonto})`);
    }
    
    // Validar detalles
    for (const detalle of jugada.detalles) {
      const detalleValidation = this.validateDetalle(detalle);
      
      if (!detalleValidation.valid) {
        errors.push(...detalleValidation.errors.map(e => 
          `Detalle línea ${detalle.lineaNumero}: ${e}`
        ));
      }
      
      if (detalleValidation.warnings.length > 0) {
        warnings.push(...detalleValidation.warnings.map(w => 
          `Detalle línea ${detalle.lineaNumero}: ${w}`
        ));
      }
    }
    
    // Validar consistencia de totales
    if (jugada.totalDeclarado !== null) {
      const difference = Math.abs(jugada.totalCalculado - jugada.totalDeclarado);
      if (difference > 0.01) {
        const msg = `Diferencia entre total calculado (${jugada.totalCalculado.toFixed(2)}) ` +
                   `y declarado (${jugada.totalDeclarado.toFixed(2)}): ${difference.toFixed(2)}`;
        
        if (this.config.validateTotals) {
          if (difference < 1) {
            warnings.push(msg);
          } else {
            errors.push(msg);
          }
        } else {
          warnings.push(msg);
        }
      }
    }
    
    // Validar números duplicados
    const allNumbers = jugada.detalles.flatMap(d => d.numeros);
    const duplicates = this.findDuplicates(allNumbers);
    if (duplicates.length > 0) {
      warnings.push(`Números duplicados encontrados: ${duplicates.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      info: this.getJugadaInfo(jugada)
    };
  }

  /**
   * Valida una línea individual
   */
  private validateLine(line: string, lineNumber: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Línea vacía
    if (!line.trim()) {
      return { valid: true, errors, warnings, suggestions, info: this.getLineInfo(line) };
    }
    
    // Verificar si es línea de total
    if (this.isTotalLine(line)) {
      if (!this.validateTotalLine(line)) {
        errors.push(`Línea ${lineNumber}: Formato de total inválido`);
        suggestions.push('Use: "Total: 100" o "Total 100"');
      }
      return { valid: errors.length === 0, errors, warnings, suggestions, info: this.getLineInfo(line) };
    }
    
    // Verificar si es nombre de jugador
    if (this.isNombreJugador(line)) {
      // Validaciones para nombres
      if (line.length > 35) {
        warnings.push(`Línea ${lineNumber}: Nombre muy largo (${line.length} caracteres)`);
      }
      
      if (line.length < 2) {
        warnings.push(`Línea ${lineNumber}: Nombre muy corto`);
      }
      
      return { valid: true, errors, warnings, suggestions, info: this.getLineInfo(line) };
    }
    
    // Validar línea de apuesta
    return this.validateBetLine(line, lineNumber);
  }

  /**
   * Valida una línea de apuesta
   */
  private validateBetLine(line: string, lineNumber: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Verificar estructura básica
    if (!this.hasNumbers(line)) {
      errors.push(`Línea ${lineNumber}: No se encontraron números`);
    }
    
    // Verificar montos
    if (!this.hasAmounts(line)) {
      warnings.push(`Línea ${lineNumber}: No se encontraron montos`);
      suggestions.push('Agregue "con X" para especificar el monto');
    } else {
      const amounts = this.extractAmounts(line);
      
      // Validar montos individuales
      for (const amount of amounts) {
        if (amount < 0 && !this.config.allowNegative) {
          errors.push(`Línea ${lineNumber}: Monto negativo no permitido: ${amount}`);
        }
        
        if (amount > this.config.maxMonto) {
          warnings.push(`Línea ${lineNumber}: Monto excesivo: ${amount}`);
        }
        
        if (amount === 0) {
          warnings.push(`Línea ${lineNumber}: Monto cero`);
        }
      }
    }
    
    // Verificar formato de números
    const numbers = this.extractNumbers(line);
    for (const num of numbers) {
      if (!this.validateNumber(num)) {
        errors.push(`Línea ${lineNumber}: Número inválido: ${num}`);
      }
    }
    
    // Verificar duplicados en la misma línea
    const duplicates = this.findDuplicates(numbers);
    if (duplicates.length > 0) {
      warnings.push(`Línea ${lineNumber}: Números duplicados en la misma línea: ${duplicates.join(', ')}`);
    }
    
    // Validar patrones especiales
    if (this.hasInvalidPatterns(line)) {
      warnings.push(`Línea ${lineNumber}: Posible patrón no reconocido`);
    }
    
    // Validar estructura de parle/candado
    if (this.hasParleOrCandado(line)) {
      const validation = this.validateParleCandado(line, lineNumber);
      if (!validation.valid) {
        errors.push(...validation.errors);
      }
      warnings.push(...validation.warnings);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      info: this.getLineInfo(line)
    };
  }

  /**
   * Valida un detalle de apuesta
   */
  private validateDetalle(detalle: DetalleApuesta): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Validar tipo
    if (!detalle.tipo || !['fijo', 'corrido', 'parle', 'centena', 'candado', 'especial'].includes(detalle.tipo)) {
      errors.push(`Tipo de apuesta inválido: ${detalle.tipo}`);
    }
    
    // Validar números
    if (!detalle.numeros || detalle.numeros.length === 0) {
      errors.push('Sin números en la apuesta');
    } else {
      for (const num of detalle.numeros) {
        if (!this.validateNumber(num)) {
          errors.push(`Número inválido: ${num}`);
        }
      }
    }
    
    // Validar monto
    if (detalle.monto === undefined || isNaN(detalle.monto)) {
      errors.push('Monto inválido');
    } else {
      if (detalle.monto < 0 && !this.config.allowNegative) {
        errors.push(`Monto negativo: ${detalle.monto}`);
      }
      
      if (detalle.monto > this.config.maxMonto) {
        warnings.push(`Monto excesivo: ${detalle.monto}`);
      }
    }
    
    // Validar monto unitario
    if (detalle.montoUnitario === undefined || isNaN(detalle.montoUnitario)) {
      errors.push('Monto unitario inválido');
    }
    
    // Validaciones específicas por tipo
    switch (detalle.tipo) {
      case 'parle':
        if (detalle.combinaciones === undefined) {
          errors.push('Parle sin número de combinaciones');
        } else if (detalle.combinaciones < 1) {
          warnings.push('Parle con 0 combinaciones');
        }
        break;
        
      case 'candado':
        if (detalle.combinaciones === undefined) {
          errors.push('Candado sin número de combinaciones');
        }
        break;
        
      case 'centena':
        // Centenas deben tener números de 3 dígitos
        const invalidCentenas = detalle.numeros.filter(n => n.length !== 3);
        if (invalidCentenas.length > 0) {
          errors.push(`Centenas inválidas: ${invalidCentenas.join(', ')}`);
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      info: this.getDetalleInfo(detalle)
    };
  }

  /**
   * Valida línea de parle o candado
   */
  private validateParleCandado(line: string, lineNumber: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Verificar que tenga números
    const numbers = this.extractNumbers(line);
    if (numbers.length < 2) {
      errors.push(`Línea ${lineNumber}: Parle/candado requiere al menos 2 números`);
    }
    
    // Verificar montos
    const amounts = this.extractAmounts(line);
    if (amounts.length === 0) {
      warnings.push(`Línea ${lineNumber}: Parle/candado sin monto especificado`);
    }
    
    // Verificar formato específico
    if (line.includes('parle') && !line.includes('con')) {
      suggestions.push(`Línea ${lineNumber}: Use "parle con X" en lugar de solo "parle"`);
    }
    
    if (line.includes('candado') && !line.includes('con')) {
      suggestions.push(`Línea ${lineNumber}: Use "candado con X" en lugar de solo "candado"`);
    }
    
    return { valid: errors.length === 0, errors, warnings, suggestions, info: this.getLineInfo(line) };
  }

  /**
   * Validaciones globales del texto
   */
  private validateGlobal(
    text: string,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    const lines = text.split('\n').filter(l => l.trim());
    
    // Contar jugadores
    const jugadores = lines.filter(l => this.isNombreJugador(l));
    if (jugadores.length === 0) {
      warnings.push('No se detectaron nombres de jugador');
    } else if (jugadores.length > this.config.maxJugadores) {
      errors.push(`Demasiados jugadores: ${jugadores.length} (máximo: ${this.config.maxJugadores})`);
    }
    
    // Verificar totales
    const totalLines = lines.filter(l => this.isTotalLine(l));
    if (totalLines.length > 1) {
      warnings.push(`Múltiples líneas de total encontradas: ${totalLines.length}`);
    }
    
    // Verificar líneas sin procesar
    const processedLines = lines.filter(l => 
      this.isNombreJugador(l) || 
      this.isTotalLine(l) || 
      this.hasNumbers(l)
    );
    
    if (processedLines.length < lines.length) {
      const unprocessed = lines.length - processedLines.length;
      warnings.push(`${unprocessed} líneas no fueron procesadas (posiblemente vacías o inválidas)`);
    }
  }

  /**
   * Herramientas de validación
   */
  public isNombreJugador(line: string): boolean {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.length < 2) return false;
    if (/^\d/.test(trimmed)) return false;
    if (/\b(con|parle|candado|total|fijo|corrido|al|pr|v|d|t)\b/i.test(trimmed)) return false;
    
    // Debe contener principalmente letras
    const letterCount = (trimmed.match(/[A-Za-zÁ-ÿ]/g) || []).length;
    const totalCount = trimmed.length;
    
    return letterCount / totalCount > 0.6;
  }

  public isTotalLine(line: string): boolean {
    return /^\s*total\b/i.test(line.trim());
  }

  private validateTotalLine(line: string): boolean {
    return /\btotal\b[:\s]*\d+(?:[.,]\d+)?/i.test(line);
  }

  private hasNumbers(line: string): boolean {
    return /\d/.test(line);
  }

  private hasAmounts(line: string): boolean {
    return /(?:con|de|a)\s*\d+(?:[.,]\d+)?/i.test(line);
  }

  private extractNumbers(line: string): string[] {
    const matches = line.match(/\d{1,4}/g) || [];
    return matches.map(m => m.padStart(2, '0'));
  }

  private extractAmounts(line: string): number[] {
    const amounts: number[] = [];
    const matches = line.match(/\d+(?:[.,]\d+)?/g) || [];
    
    for (const match of matches) {
      const normalized = match.replace(',', '.');
      const amount = parseFloat(normalized);
      if (!isNaN(amount)) {
        amounts.push(amount);
      }
    }
    
    return amounts;
  }

  private validateNumber(num: string): boolean {
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

  private hasInvalidPatterns(line: string): boolean {
    // Buscar patrones que no coincidan con ninguno conocido
    const knownPatterns = [
      this.patterns.VOLTEO,
      this.patterns.RANGO,
      this.patterns.DECENA,
      this.patterns.TERMINAL,
      this.patterns.PARES_RELATIVOS,
      this.patterns.CENTENAS_TODAS,
      /\d+\s*[*x]\s*\d+/, // Parlés
      /\bcandado\b/i,
      /\bparle\b/i,
      /\bcon\b/i,
      /\by\b/i
    ];
    
    // Si la línea tiene contenido pero no coincide con patrones conocidos
    if (line.trim() && !knownPatterns.some(p => p.test(line))) {
      return true;
    }
    
    return false;
  }

  private hasParleOrCandado(line: string): boolean {
    return /\b(parle|candado)\b/i.test(line);
  }

  private findDuplicates<T>(array: T[]): T[] {
    const seen = new Set<T>();
    const duplicates = new Set<T>();
    
    for (const item of array) {
      if (seen.has(item)) {
        duplicates.add(item);
      } else {
        seen.add(item);
      }
    }
    
    return Array.from(duplicates);
  }

  /**
   * Métodos de información
   */
  private getTextInfo(text: string): any {
    const lines = text.split('\n').filter(l => l.trim());
    const jugadores = lines.filter(l => this.isNombreJugador(l));
    const totalLines = lines.filter(l => this.isTotalLine(l));
    const betLines = lines.filter(l => this.hasNumbers(l));
    
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    const totalNumbers = betLines.reduce((sum, line) => 
      sum + (line.match(/\d+/g) || []).length, 0
    );
    
    if (totalNumbers > 20 || jugadores.length > 3) {
      complexity = 'complex';
    } else if (totalNumbers > 10 || jugadores.length > 1) {
      complexity = 'medium';
    }
    
    return {
      hasJugadores: jugadores.length > 0,
      hasTotals: totalLines.length > 0,
      hasNumbers: betLines.length > 0,
      estimatedLines: lines.length,
      complexity
    };
  }

  private getLineInfo(line: string): any {
    return {
      length: line.length,
      hasNumbers: this.hasNumbers(line),
      hasAmounts: this.hasAmounts(line),
      isJugador: this.isNombreJugador(line),
      isTotal: this.isTotalLine(line),
      wordCount: line.split(/\s+/).length
    };
  }

  private getJugadaInfo(jugada: Jugada): any {
    return {
      player: jugada.jugador,
      lineCount: jugada.lineas.length,
      detailCount: jugada.detalles.length,
      totalNumbers: jugada.detalles.reduce((sum, d) => sum + d.numeros.length, 0),
      betTypes: Array.from(jugada.metadata?.betTypes || new Set()),
      isValid: jugada.isValid
    };
  }

  private getDetalleInfo(detalle: DetalleApuesta): any {
    return {
      type: detalle.tipo,
      numberCount: detalle.numeros.length,
      amount: detalle.monto,
      unitAmount: detalle.montoUnitario,
      combinations: detalle.combinaciones,
      line: detalle.lineaNumero
    };
  }
}