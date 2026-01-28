 import { ParserConfig, PatternType } from './types';

/**
 * Expansor de patrones especiales para lotería
 */
export class PatternExpander {
  constructor(private config: ParserConfig) {}

  /**
   * Expande un número volteado (XXv -> XX YY)
   */
  expandVolteo(numero: string): string[] {
    const normalized = numero.padStart(2, '0');
    const volteo = normalized.split('').reverse().join('');
    return [normalized, volteo];
  }

  /**
   * Expande un rango numérico (inicio al fin)
   */
  expandRango(inicio: number, fin: number): string[] {
    if (inicio > fin) {
      [inicio, fin] = [fin, inicio];
    }
    
    const numeros: string[] = [];
    for (let i = inicio; i <= fin; i++) {
      numeros.push(i.toString().padStart(2, '0'));
    }
    
    return numeros;
  }

  /**
   * Expande una decena (dX -> todos los números que terminan en X)
   */
  expandDecena(unidad: number): string[] {
    const numeros: string[] = [];
    const u = unidad % 10;
    
    for (let decena = 0; decena <= 9; decena++) {
      numeros.push(`${decena}${u}`.padStart(2, '0'));
    }
    
    return numeros;
  }

  /**
   * Expande una terminal (tX -> todos los números que empiezan con X)
   */
  expandTerminal(decena: number): string[] {
    const numeros: string[] = [];
    const d = decena % 10;
    
    for (let unidad = 0; unidad <= 9; unidad++) {
      numeros.push(`${d}${unidad}`.padStart(2, '0'));
    }
    
    return numeros;
  }

  /**
   * Expande pares relativos (XX pr N -> XX01, XX02, ..., XXN)
   */
  expandParesRelativos(base: string, cantidad: number): string[] {
    const baseNormalized = base.padStart(2, '0');
    const numeros: string[] = [];
    const maxCantidad = Math.min(cantidad, 100); // Límite para evitar explosión
    
    for (let i = 1; i <= maxCantidad; i++) {
      const complemento = i.toString().padStart(2, '0');
      numeros.push(`${baseNormalized}${complemento}`);
    }
    
    return numeros;
  }

  /**
   * Expande "todas las centenas" para un número base
   */
  expandTodasLasCentenasParaNumero(numero: string): string[] {
    const base = numero.padStart(2, '0');
    const centenas: string[] = [];
    
    for (let centena = 0; centena <= 9; centena++) {
      centenas.push(`${centena}${base}`);
    }
    
    return centenas;
  }

  /**
   * Expande números repetidos (5x10 -> 10,10,10,10,10)
   */
  expandRepeticiones(cantidad: number, numero: string): string[] {
    const normalized = numero.padStart(2, '0');
    return Array(cantidad).fill(normalized);
  }

  /**
   * Detecta y expande todos los patrones en un texto
   */
  expandText(text: string): { expanded: string; patterns: Array<{type: PatternType; original: string}> } {
    let expanded = text;
    const patternsFound: Array<{type: PatternType; original: string}> = [];
    
    // Patrones a expandir (en orden específico)
    const expansionRules = [
      {
        pattern: /(\d{2,4})\s*v\b/gi,
        type: 'volteo' as PatternType,
        expander: (match: string, num: string) => {
          patternsFound.push({ type: 'volteo', original: match });
          return this.expandVolteo(num).join(' ');
        }
      },
      {
        pattern: /(\d{1,2})\s*al\s*(\d{1,2})/gi,
        type: 'rango' as PatternType,
        expander: (match: string, inicioStr: string, finStr: string) => {
          patternsFound.push({ type: 'rango', original: match });
          const inicio = parseInt(inicioStr, 10);
          const fin = parseInt(finStr, 10);
          return this.expandRango(inicio, fin).join(' ');
        }
      },
      {
        pattern: /\bd\s*(\d{1,2})\b/gi,
        type: 'decena' as PatternType,
        expander: (match: string, unidadStr: string) => {
          patternsFound.push({ type: 'decena', original: match });
          const unidad = parseInt(unidadStr, 10);
          return this.expandDecena(unidad).join(' ');
        }
      },
      {
        pattern: /\bt\s*(\d{1,2})\b/gi,
        type: 'terminal' as PatternType,
        expander: (match: string, decenaStr: string) => {
          patternsFound.push({ type: 'terminal', original: match });
          const decena = parseInt(decenaStr, 10);
          return this.expandTerminal(decena).join(' ');
        }
      },
      {
        pattern: /(\d{2,4})\s*pr\s*(\d{1,3})/gi,
        type: 'pares_relativos' as PatternType,
        expander: (match: string, base: string, cantidadStr: string) => {
          patternsFound.push({ type: 'pares_relativos', original: match });
          const cantidad = parseInt(cantidadStr, 10);
          return this.expandParesRelativos(base, cantidad).join(' ');
        }
      },
      {
        pattern: /por\s*todas?\s*(?:las?\s*)?centenas?\s*(\d{2})/gi,
        type: 'centenas_todas' as PatternType,
        expander: (match: string, numero: string) => {
          patternsFound.push({ type: 'centenas_todas', original: match });
          return this.expandTodasLasCentenasParaNumero(numero).join(' ');
        }
      },
      {
        pattern: /(\d+)\s*x\s*(\d{2,4})/gi,
        type: 'repeticion' as PatternType,
        expander: (match: string, cantidadStr: string, numero: string) => {
          patternsFound.push({ type: 'repeticion', original: match });
          const cantidad = parseInt(cantidadStr, 10);
          return this.expandRepeticiones(cantidad, numero).join(' ');
        }
      }
    ];
    
    // Aplicar expansiones en orden
    for (const rule of expansionRules) {
      expanded = expanded.replace(rule.pattern, rule.expander);
    }
    
    return { expanded, patterns: patternsFound };
  }

  /**
   * Detecta si un texto contiene patrones expandibles
   */
  containsExpandablePatterns(text: string): boolean {
    const patterns = [
      /v\b/i,
      /\bal\b/i,
      /^\s*d\s*\d/i,
      /^\s*t\s*\d/i,
      /\bpr\b/i,
      /\bpor\s*todas?\s*centenas?\b/i,
      /\d+\s*x\s*\d/
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Extrae información de los patrones encontrados
   */
  analyzePatterns(text: string): Array<{
    type: PatternType;
    match: string;
    expandedCount: number;
  }> {
    const { patterns } = this.expandText(text);
    
    return patterns.map(pattern => {
      let expandedCount = 0;
      
      switch (pattern.type) {
        case 'volteo':
          expandedCount = 2;
          break;
        case 'rango':
          const match = pattern.original.match(/(\d+)\s*al\s*(\d+)/i);
          if (match) {
            const inicio = parseInt(match[1], 10);
            const fin = parseInt(match[2], 10);
            expandedCount = Math.abs(fin - inicio) + 1;
          }
          break;
        case 'decena':
        case 'terminal':
          expandedCount = 10;
          break;
        case 'pares_relativos':
          const prMatch = pattern.original.match(/pr\s*(\d+)/i);
          if (prMatch) {
            expandedCount = Math.min(parseInt(prMatch[1], 10), 100);
          }
          break;
        case 'centenas_todas':
          expandedCount = 10;
          break;
        case 'repeticion':
          const repMatch = pattern.original.match(/(\d+)\s*x/i);
          if (repMatch) {
            expandedCount = parseInt(repMatch[1], 10);
          }
          break;
      }
      
      return {
        type: pattern.type,
        match: pattern.original,
        expandedCount
      };
    });
  }

  /**
   * Calcula el factor de expansión (cuántos números genera)
   */
  calculateExpansionFactor(text: string): number {
    const patterns = this.analyzePatterns(text);
    
    if (patterns.length === 0) {
      return 1; // Sin expansión
    }
    
    // Contar números originales (sin expandir)
    const originalNumbers = (text.match(/\b\d{2,4}\b/g) || []).length;
    
    // Calcular números expandidos
    let expandedNumbers = originalNumbers;
    
    for (const pattern of patterns) {
      // Restar los números que serán reemplazados por la expansión
      const numbersInPattern = (pattern.match.match(/\b\d{2,4}\b/g) || []).length;
      expandedNumbers -= numbersInPattern;
      expandedNumbers += pattern.expandedCount;
    }
    
    return expandedNumbers / originalNumbers;
  }

  /**
   * Limita la expansión si excede un máximo
   */
  expandWithLimit(text: string, maxExpansion: number = 100): string {
    const { expanded, patterns } = this.expandText(text);
    
    // Contar números expandidos
    const expandedNumbers = (expanded.match(/\b\d{2,4}\b/g) || []).length;
    
    if (expandedNumbers <= maxExpansion) {
      return expanded;
    }
    
    // Si excede el límite, mantener el texto original
    console.warn(`Expansión excede límite (${expandedNumbers} > ${maxExpansion}), manteniendo original`);
    return text;
  }

  /**
   * Formatea números expandidos para mejor legibilidad
   */
  formatExpandedNumbers(numbers: string[], maxPerLine: number = 10): string {
    if (numbers.length <= maxPerLine) {
      return numbers.join(' ');
    }
    
    const lines: string[] = [];
    for (let i = 0; i < numbers.length; i += maxPerLine) {
      const chunk = numbers.slice(i, i + maxPerLine);
      lines.push(chunk.join(' '));
    }
    
    return lines.join('\n');
  }
}