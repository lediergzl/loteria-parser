import { BasePlugin } from './base-plugin';
import { ProcessorPlugin, Jugada, PluginContext, DetalleApuesta } from '../types';
import { PATTERNS, APUESTA_PATTERNS } from '../constants/patterns';

/**
 * Plugin para procesar apuestas básicas (fijos y corridos)
 */
export class BasicBetPlugin extends BasePlugin {
  name = 'basic-bet-plugin';
  version = '1.0.0';
  priority = 50;
  
  private readonly basicPatterns = [
    APUESTA_PATTERNS.FIJO.pattern,
    APUESTA_PATTERNS.FIJO_CORRIDO.pattern
  ];
  
  canProcess(text: string): boolean {
    // Puede procesar cualquier texto que no sea procesado por plugins de mayor prioridad
    return true;
  }
  
  process(text: string, context: PluginContext): Jugada {
    this.ensureInitialized();
    
    const detalles: DetalleApuesta[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Procesar cada línea
    context.lineas.forEach((linea, index) => {
      try {
        const lineDetalles = this.processLine(linea, index + 1, context);
        detalles.push(...lineDetalles);
      } catch (error) {
        const errorMsg = `Error procesando línea ${index + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
        
        if (this.config?.strictMode) {
          errors.push(errorMsg);
          throw error;
        } else {
          warnings.push(errorMsg);
        }
      }
    });
    
    // Crear la jugada
    return this.createJugada(
      context.jugador,
      detalles,
      context.totalDeclarado,
      context.lineas,
      { warnings, errors }
    );
  }
  
  protected onValidate(jugada: Jugada) {
    const warnings: string[] = [];
    
    // Verificar que no haya apuestas muy pequeñas
    jugada.detalles.forEach(detalle => {
      if (detalle.monto < 1 && detalle.monto > 0) {
        warnings.push(`Apuesta muy pequeña: ${detalle.monto} en línea ${detalle.lineaNumero}`);
      }
    });
    
    return {
      valid: true,
      errors: [],
      warnings,
      suggestions: []
    };
  }
  
  private processLine(
    linea: string, 
    lineNumber: number,
    context: PluginContext
  ): DetalleApuesta[] {
    const detalles: DetalleApuesta[] = [];
    
    // 1. Procesar fijos simples
    const fijoMatch = linea.match(APUESTA_PATTERNS.FIJO.pattern);
    if (fijoMatch) {
      const numeros = this.extractNumbers(fijoMatch[1]);
      const monto = parseFloat(fijoMatch[2].replace(',', '.'));
      
      if (numeros.length > 0 && !isNaN(monto)) {
        detalles.push(
          this.createDetalle('fijo', numeros, monto, linea, lineNumber)
        );
      }
    }
    
    // 2. Procesar fijos y corridos
    const fijoCorridoMatch = linea.match(APUESTA_PATTERNS.FIJO_CORRIDO.pattern);
    if (fijoCorridoMatch) {
      const numeros = this.extractNumbers(fijoCorridoMatch[1]);
      const montoFijo = parseFloat(fijoCorridoMatch[2].replace(',', '.'));
      const montoCorrido = parseFloat(fijoCorridoMatch[3].replace(',', '.'));
      
      if (numeros.length > 0 && !isNaN(montoFijo)) {
        detalles.push(
          this.createDetalle('fijo', numeros, montoFijo, linea, lineNumber)
        );
      }
      
      if (numeros.length > 0 && !isNaN(montoCorrido)) {
        detalles.push(
          this.createDetalle('corrido', numeros, montoCorrido, linea, lineNumber)
        );
      }
    }
    
    // 3. Procesar números sueltos con montos por defecto
    if (detalles.length === 0 && /\d{2,}/.test(linea)) {
      const numeros = this.extractNumbers(linea);
      if (numeros.length > 0) {
        const monto = context.config.defaultMontoFijo;
        detalles.push(
          this.createDetalle('fijo', numeros, monto, linea, lineNumber)
        );
      }
    }
    
    return detalles;
  }
}

/**
 * Plugin para procesar parlés
 */
export class ParlePlugin extends BasePlugin {
  name = 'parle-plugin';
  version = '1.0.0';
  priority = 60; // Mayor prioridad que basic-bet-plugin
  
  canProcess(text: string): boolean {
    return PATTERNS.PARLE_EXPLICITO.test(text) || 
           /parle\s+con/i.test(text) ||
           /\bp\s*\d+$/.test(text);
  }
  
  process(text: string, context: PluginContext): Jugada {
    this.ensureInitialized();
    
    const detalles: DetalleApuesta[] = [];
    const warnings: string[] = [];
    
    // Procesar parlés explícitos (25*33)
    const parleMatches = text.matchAll(PATTERNS.PARLE_EXPLICITO);
    for (const match of parleMatches) {
      const n1 = match[1].padStart(2, '0');
      const n2 = match[2].padStart(2, '0');
      
      // Buscar monto del parle
      let monto = this.config?.defaultMontoFijo || 1;
      const montoMatch = text.match(/parle\s+con\s+(\d+(?:[.,]\d+)?)/i);
      if (montoMatch) {
        monto = parseFloat(montoMatch[1].replace(',', '.'));
      }
      
      detalles.push(
        this.createDetalle(
          'parle',
          [n1, n2],
          monto,
          text,
          undefined,
          {
            pares: [[n1, n2]],
            combinaciones: 1
          }
        )
      );
    }
    
    // Procesar parle inline (p5)
    const inlineMatch = text.match(/\bp\s*(\d+(?:[.,]\d+)?)\s*$/i);
    if (inlineMatch && !PATTERNS.PARLE_EXPLICITO.test(text)) {
      const monto = parseFloat(inlineMatch[1].replace(',', '.'));
      const numeros = this.extractNumbers(text.replace(/\bp\s*\d+\s*$/i, ''));
      
      if (numeros.length >= 2) {
        const combinaciones = this.calculateCombinations(numeros.length);
        
        detalles.push(
          this.createDetalle(
            'parle',
            numeros,
            monto,
            text,
            undefined,
            {
              combinaciones
            }
          )
        );
      }
    }
    
    // Procesar parle compuesto
    const compuestoMatch = text.match(APUESTA_PATTERNS.PARLE_COMPUESTO.pattern);
    if (compuestoMatch) {
      const numeros = this.extractNumbers(compuestoMatch[1]);
      const montoFijo = parseFloat(compuestoMatch[2].replace(',', '.'));
      const montoParle = parseFloat(compuestoMatch[3].replace(',', '.'));
      
      if (numeros.length > 0 && !isNaN(montoFijo)) {
        detalles.push(
          this.createDetalle('fijo', numeros, montoFijo, text, undefined)
        );
      }
      
      if (numeros.length >= 2 && !isNaN(montoParle)) {
        const combinaciones = this.calculateCombinations(numeros.length);
        
        detalles.push(
          this.createDetalle(
            'parle',
            numeros,
            montoParle,
            text,
            undefined,
            {
              combinaciones
            }
          )
        );
      }
    }
    
    return this.createJugada(
      context.jugador,
      detalles,
      context.totalDeclarado,
      context.lineas,
      { warnings }
    );
  }
  
  private calculateCombinations(n: number): number {
    if (n < 2) return 0;
    return (n * (n - 1)) / 2;
  }
}

/**
 * Plugin para procesar centenas
 */
export class CentenaPlugin extends BasePlugin {
  name = 'centena-plugin';
  version = '1.0.0';
  priority = 70;
  
  canProcess(text: string): boolean {
    return PATTERNS.CENTENAS_TODAS.test(text) ||
           APUESTA_PATTERNS.CENTENA_SIMPLE.pattern.test(text) ||
           APUESTA_PATTERNS.CENTENA_COMPUESTA.pattern.test(text);
  }
  
  process(text: string, context: PluginContext): Jugada {
    this.ensureInitialized();
    
    const detalles: DetalleApuesta[] = [];
    
    // Procesar "por todas las centenas"
    const centenasTodasMatch = text.match(PATTERNS.CENTENAS_TODAS);
    if (centenasTodasMatch) {
      const numerosBase = this.extractNumbers(centenasTodasMatch[1]);
      let monto = this.config?.defaultMontoFijo || 1;
      
      if (centenasTodasMatch[2]) {
        monto = parseFloat(centenasTodasMatch[2].replace(',', '.'));
      }
      
      const centenas: string[] = [];
      numerosBase.forEach(num => {
        if (num.length === 2) {
          for (let i = 0; i <= 9; i++) {
            centenas.push(`${i}${num}`);
          }
        }
      });
      
      if (centenas.length > 0) {
        detalles.push(
          this.createDetalle('centena', centenas, monto, text, undefined)
        );
      }
    }
    
    // Procesar centenas simples
    const centenaSimpleMatch = text.match(APUESTA_PATTERNS.CENTENA_SIMPLE.pattern);
    if (centenaSimpleMatch) {
      const numeros = this.extractNumbers(centenaSimpleMatch[1]);
      const monto = parseFloat(centenaSimpleMatch[2].replace(',', '.'));
      
      const centenas = numeros.filter(n => n.length === 3);
      if (centenas.length > 0 && !isNaN(monto)) {
        detalles.push(
          this.createDetalle('centena', centenas, monto, text, undefined)
        );
      }
    }
    
    // Procesar centenas compuestas
    const centenaCompuestaMatch = text.match(APUESTA_PATTERNS.CENTENA_COMPUESTA.pattern);
    if (centenaCompuestaMatch) {
      const numeros = this.extractNumbers(centenaCompuestaMatch[1]);
      const montoCentena = parseFloat(centenaCompuestaMatch[2].replace(',', '.'));
      const montoFijo = parseFloat(centenaCompuestaMatch[3].replace(',', '.'));
      const montoCorrido = parseFloat(centenaCompuestaMatch[4].replace(',', '.'));
      
      const centenas = numeros.filter(n => n.length === 3);
      const fijos = centenas.map(c => c.slice(-2));
      
      if (centenas.length > 0 && !isNaN(montoCentena)) {
        detalles.push(
          this.createDetalle('centena', centenas, montoCentena, text, undefined)
        );
      }
      
      if (fijos.length > 0 && !isNaN(montoFijo)) {
        detalles.push(
          this.createDetalle('fijo', fijos, montoFijo, text, undefined)
        );
      }
      
      if (fijos.length > 0 && !isNaN(montoCorrido)) {
        detalles.push(
          this.createDetalle('corrido', fijos, montoCorrido, text, undefined)
        );
      }
    }
    
    return this.createJugada(
      context.jugador,
      detalles,
      context.totalDeclarado,
      context.lineas
    );
  }
}

/**
 * Plugin para procesar candados
 */
export class CandadoPlugin extends BasePlugin {
  name = 'candado-plugin';
  version = '1.0.0';
  priority = 80;
  
  canProcess(text: string): boolean {
    return PATTERNS.CANDADO.test(text) ||
           APUESTA_PATTERNS.CANDADO.pattern.test(text);
  }
  
  process(text: string, context: PluginContext): Jugada {
    this.ensureInitialized();
    
    const detalles: DetalleApuesta[] = [];
    
    // Procesar candado estándar
    const candadoMatch = text.match(APUESTA_PATTERNS.CANDADO.pattern);
    if (candadoMatch) {
      const numeros = this.extractNumbers(candadoMatch[1]);
      const montoFijo = parseFloat(candadoMatch[2].replace(',', '.'));
      const montoCorrido = candadoMatch[3] ? parseFloat(candadoMatch[3].replace(',', '.')) : null;
      const montoCandado = parseFloat(candadoMatch[4].replace(',', '.'));
      
      if (numeros.length >= 2) {
        // Agregar fijos
        if (!isNaN(montoFijo)) {
          detalles.push(
            this.createDetalle('fijo', numeros, montoFijo, text, undefined)
          );
        }
        
        // Agregar corridos si existen
        if (montoCorrido !== null && !isNaN(montoCorrido)) {
          detalles.push(
            this.createDetalle('corrido', numeros, montoCorrido, text, undefined)
          );
        }
        
        // Agregar candado
        const combinaciones = this.calculateCombinations(numeros.length);
        const montoUnitario = combinaciones > 0 ? montoCandado / combinaciones : 0;
        
        detalles.push(
          this.createDetalle(
            'candado',
            numeros,
            montoUnitario,
            text,
            undefined,
            {
              monto: montoCandado,
              combinaciones
            }
          )
        );
      }
    }
    
    return this.createJugada(
      context.jugador,
      detalles,
      context.totalDeclarado,
      context.lineas
    );
  }
  
  private calculateCombinations(n: number): number {
    if (n < 2) return 0;
    return (n * (n - 1)) / 2;
  }
}

/**
 * Plugin para patrones especiales (volteos, rangos, etc.)
 */
export class SpecialPatternsPlugin extends BasePlugin {
  name = 'special-patterns-plugin';
  version = '1.0.0';
  priority = 90; // Alta prioridad para patrones especiales
  
  private patterns = [
    { pattern: PATTERNS.VOLTEO, type: 'volteo', handler: this.handleVolteo.bind(this) },
    { pattern: PATTERNS.RANGO, type: 'rango', handler: this.handleRango.bind(this) },
    { pattern: PATTERNS.DECENA, type: 'decena', handler: this.handleDecena.bind(this) },
    { pattern: PATTERNS.TERMINAL, type: 'terminal', handler: this.handleTerminal.bind(this) },
    { pattern: PATTERNS.PARES_RELATIVOS, type: 'pares_relativos', handler: this.handleParesRelativos.bind(this) }
  ];
  
  canProcess(text: string): boolean {
    return this.patterns.some(p => p.pattern.test(text));
  }
  
  process(text: string, context: PluginContext): Jugada {
    this.ensureInitialized();
    
    const detalles: DetalleApuesta[] = [];
    
    // Procesar cada patrón encontrado
    this.patterns.forEach(patternConfig => {
      const matches = text.matchAll(patternConfig.pattern);
      
      for (const match of matches) {
        const result = patternConfig.handler(match, text);
        if (result) {
          detalles.push(result);
        }
      }
    });
    
    // Si hay números regulares además de los patrones, procesarlos también
    const regularNumbers = this.extractRegularNumbers(text);
    if (regularNumbers.length > 0 && detalles.length === 0) {
      const monto = context.config.defaultMontoFijo;
      detalles.push(
        this.createDetalle('fijo', regularNumbers, monto, text, undefined)
      );
    }
    
    return this.createJugada(
      context.jugador,
      detalles,
      context.totalDeclarado,
      context.lineas
    );
  }
  
  private handleVolteo(match: RegExpMatchArray, originalLine: string): DetalleApuesta | null {
    const num = match[1].padStart(2, '0');
    const volteo = num.split('').reverse().join('');
    
    // Buscar monto
    const montoMatch = originalLine.match(/con\s+(\d+(?:[.,]\d+)?)/i);
    const monto = montoMatch ? 
      parseFloat(montoMatch[1].replace(',', '.')) : 
      this.config?.defaultMontoFijo || 1;
    
    return this.createDetalle(
      'especial',
      [num, volteo],
      monto,
      originalLine,
      undefined,
      {
        expansion: {
          original: match[0],
          expanded: [num, volteo],
          patternType: 'volteo'
        }
      }
    );
  }
  
  private handleRango(match: RegExpMatchArray, originalLine: string): DetalleApuesta | null {
    const inicio = parseInt(match[1], 10);
    const fin = parseInt(match[2], 10);
    
    if (isNaN(inicio) || isNaN(fin) || inicio > fin) {
      return null;
    }
    
    const numeros: string[] = [];
    for (let i = inicio; i <= fin; i++) {
      numeros.push(i.toString().padStart(2, '0'));
    }
    
    const montoMatch = originalLine.match(/con\s+(\d+(?:[.,]\d+)?)/i);
    const monto = montoMatch ? 
      parseFloat(montoMatch[1].replace(',', '.')) : 
      this.config?.defaultMontoFijo || 1;
    
    return this.createDetalle(
      'especial',
      numeros,
      monto,
      originalLine,
      undefined,
      {
        expansion: {
          original: match[0],
          expanded: numeros,
          patternType: 'rango'
        }
      }
    );
  }
  
  private handleDecena(match: RegExpMatchArray, originalLine: string): DetalleApuesta | null {
    const unidad = parseInt(match[1], 10) % 10;
    const numeros: string[] = [];
    
    for (let decena = 0; decena <= 9; decena++) {
      numeros.push(`${decena}${unidad}`.padStart(2, '0'));
    }
    
    const montoMatch = originalLine.match(/con\s+(\d+(?:[.,]\d+)?)/i);
    const monto = montoMatch ? 
      parseFloat(montoMatch[1].replace(',', '.')) : 
      this.config?.defaultMontoFijo || 1;
    
    return this.createDetalle(
      'especial',
      numeros,
      monto,
      originalLine,
      undefined,
      {
        expansion: {
          original: match[0],
          expanded: numeros,
          patternType: 'decena'
        }
      }
    );
  }
  
  private handleTerminal(match: RegExpMatchArray, originalLine: string): DetalleApuesta | null {
    const decena = parseInt(match[1], 10) % 10;
    const numeros: string[] = [];
    
    for (let unidad = 0; unidad <= 9; unidad++) {
      numeros.push(`${decena}${unidad}`.padStart(2, '0'));
    }
    
    const montoMatch = originalLine.match(/con\s+(\d+(?:[.,]\d+)?)/i);
    const monto = montoMatch ? 
      parseFloat(montoMatch[1].replace(',', '.')) : 
      this.config?.defaultMontoFijo || 1;
    
    return this.createDetalle(
      'especial',
      numeros,
      monto,
      originalLine,
      undefined,
      {
        expansion: {
          original: match[0],
          expanded: numeros,
          patternType: 'terminal'
        }
      }
    );
  }
  
  private handleParesRelativos(match: RegExpMatchArray, originalLine: string): DetalleApuesta | null {
    const base = match[1].padStart(2, '0');
    const cantidad = Math.min(parseInt(match[2], 10), 100); // Límite
    const numeros: string[] = [];
    
    for (let i = 1; i <= cantidad; i++) {
      const complemento = i.toString().padStart(2, '0');
      numeros.push(`${base}${complemento}`);
    }
    
    const montoMatch = originalLine.match(/con\s+(\d+(?:[.,]\d+)?)/i);
    const monto = montoMatch ? 
      parseFloat(montoMatch[1].replace(',', '.')) : 
      this.config?.defaultMontoFijo || 1;
    
    return this.createDetalle(
      'especial',
      numeros,
      monto,
      originalLine,
      undefined,
      {
        expansion: {
          original: match[0],
          expanded: numeros,
          patternType: 'pares_relativos'
        }
      }
    );
  }
  
  private extractRegularNumbers(text: string): string[] {
    // Extraer números que no sean parte de patrones especiales
    const withoutPatterns = this.patterns.reduce((acc, pattern) => 
      acc.replace(pattern.pattern, ''), text
    );
    
    return this.extractNumbers(withoutPatterns);
  }
}

/**
 * Plugin para validación y corrección automática
 */
export class AutoCorrectPlugin extends BasePlugin {
  name = 'auto-correct-plugin';
  version = '1.0.0';
  priority = 100; // Prioridad más alta, se ejecuta primero
  
  private corrections: Array<{
    pattern: RegExp;
    replacement: string;
    description: string;
  }> = [
    {
      pattern: /(\d)\s*-\s*(\d)/g,
      replacement: '$1$2',
      description: 'Corregir guiones en números'
    },
    {
      pattern: /con\s*(\d+)\s*pesos/gi,
      replacement: 'con $1',
      description: 'Eliminar "pesos" después de montos'
    },
    {
      pattern: /(\d)\s*y\s*media/gi,
      replacement: '$1.5',
      description: 'Convertir "y media" a decimal'
    },
    {
      pattern: /parle\s*[:=]/gi,
      replacement: 'parle con',
      description: 'Corregir formato de parle'
    },
    {
      pattern: /candado\s*[:=]/gi,
      replacement: 'candado con',
      description: 'Corregir formato de candado'
    }
  ];
  
  canProcess(text: string): boolean {
    // Siempre puede procesar para aplicar correcciones
    return true;
  }
  
  process(text: string, context: PluginContext): Jugada {
    this.ensureInitialized();
    
    // Aplicar correcciones al texto
    let correctedText = text;
    const appliedCorrections: string[] = [];
    
    this.corrections.forEach(correction => {
      if (correction.pattern.test(correctedText)) {
        const original = correctedText;
        correctedText = correctedText.replace(correction.pattern, correction.replacement);
        
        if (original !== correctedText) {
          appliedCorrections.push(correction.description);
        }
      }
    });
    
    // Normalizar espacios alrededor de "con"
    correctedText = correctedText.replace(/(\s)con(\s|$)/gi, '$1 con$2');
    
    // Normalizar "y" entre montos
    correctedText = correctedText.replace(/(\d)\s*y\s*(\d)/gi, '$1 y $2');
    
    // Actualizar el contexto con el texto corregido
    const correctedContext: PluginContext = {
      ...context,
      currentLine: correctedText
    };
    
    // Devolver una jugada vacía (este plugin solo corrige, no procesa)
    // El procesamiento real lo harán otros plugins
    return this.createJugada(
      context.jugador,
      [],
      context.totalDeclarado,
      context.lineas,
      {
        warnings: appliedCorrections.length > 0 ? 
          [`Aplicadas correcciones: ${appliedCorrections.join(', ')}`] : []
      }
    );
  }
  
  protected onValidate(jugada: Jugada) {
    const suggestions: string[] = [];
    
    // Sugerir correcciones basadas en la jugada
    if (jugada.detalles.length === 0 && jugada.lineas.length > 0) {
      suggestions.push('No se detectaron apuestas. Verifique el formato.');
    }
    
    if (jugada.lineas.some(line => /\d\s*-\s*\d/.test(line))) {
      suggestions.push('Se detectaron guiones en números. Use espacios en lugar de guiones.');
    }
    
    if (jugada.lineas.some(line => /con\s*\d+\s*pesos/gi.test(line))) {
      suggestions.push('Elimine "pesos" después de los montos para mejor procesamiento.');
    }
    
    return {
      valid: true,
      errors: [],
      warnings: [],
      suggestions
    };
  }
}