import { ParserConfig } from './types';
import { PATTERNS } from './constants/patterns';

/**
 * Preprocesador para limpiar y normalizar texto de jugadas
 */
export class Preprocessor {
  private patterns = PATTERNS;

  constructor(private config: ParserConfig) {}

  /**
   * Procesa el texto completo aplicando todas las normalizaciones
   */
  process(text: string): string {
    let processed = text;

    // 1. Normalización de caracteres y espacios
    processed = this.normalizeSpaces(processed);
    
    // 2. Normalización de caracteres especiales
    processed = this.normalizeSpecialCharacters(processed);
    
    // 3. Expansión automática si está habilitada
    if (this.config.autoExpand) {
      processed = this.expandPatterns(processed);
    }
    
    // 4. Normalización de montos
    processed = this.normalizeAmounts(processed);
    
    // 5. Limpieza final
    processed = this.cleanup(processed);

    return processed;
  }

  /**
   * Normaliza espacios y saltos de línea
   */
  private normalizeSpaces(text: string): string {
    return text
      // Normalizar saltos de línea
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Normalizar múltiples saltos de línea
      .replace(/\n{3,}/g, '\n\n')
      // Normalizar tabs a espacios
      .replace(/\t/g, ' ')
      // Normalizar múltiples espacios
      .replace(/[ \u00A0\u2000-\u200F\u2028-\u202F\u205F\u3000]+/g, ' ')
      // Eliminar espacios al inicio/final de línea
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Eliminar espacios alrededor de operadores
      .replace(/\s*([*x×\-+.])\s*/g, '$1')
      // Añadir espacios después de comas
      .replace(/,(\S)/g, ', $1');
  }

  /**
   * Normaliza caracteres especiales
   */
  private normalizeSpecialCharacters(text: string): string {
    return text
      // Normalizar ceros (o, O, ø, etc.)
      .replace(/[oOøØοΟ]/g, '0')
      // Normalizar unos (l, I, |, etc.)
      .replace(/[lI|]/g, '1')
      // Normalizar multiplicación
      .replace(/×/g, 'x')
      // Normalizar comillas y apostrofes
      .replace(/['"`´]/g, '')
      // Convertir a minúsculas (excepto nombres propios)
      .split('\n')
      .map((line, index) => {
        // La primera línea (nombre) la mantenemos como está
        if (index === 0 && this.isNombreJugador(line)) {
          return line;
        }
        return line.toLowerCase();
      })
      .join('\n');
  }

  /**
   * Expande patrones especiales
   */
  private expandPatterns(text: string): string {
    let expanded = text;

    // Expansión en varias pasadas para patrones complejos
    const expansionSteps = [
      this.expandVolteos.bind(this),
      this.expandRanges.bind(this),
      this.expandDecenas.bind(this),
      this.expandTerminales.bind(this),
      this.expandParesRelativos.bind(this),
      this.expandCentenasTodas.bind(this)
    ];

    for (const step of expansionSteps) {
      expanded = step(expanded);
    }

    return expanded;
  }

  /**
   * Expande volteos (XXv -> XX YY)
   */
  private expandVolteos(text: string): string {
    return text.replace(
      this.patterns.VOLTEO,
      (match, num) => {
        const normalized = num.padStart(2, '0');
        const volteo = normalized.split('').reverse().join('');
        return `${normalized} ${volteo}`;
      }
    );
  }

  /**
   * Expande rangos (XX al YY)
   */
  private expandRanges(text: string): string {
    return text.replace(
      this.patterns.RANGO,
      (match, inicioStr, finStr) => {
        const inicio = parseInt(inicioStr, 10);
        const fin = parseInt(finStr, 10);
        
        if (isNaN(inicio) || isNaN(fin) || inicio > fin) {
          return match;
        }

        const numeros: string[] = [];
        for (let i = inicio; i <= fin; i++) {
          numeros.push(i.toString().padStart(2, '0'));
        }
        
        return numeros.join(' ');
      }
    );
  }

  /**
   * Expande decenas (dX -> 0X, 1X, ..., 9X)
   */
  private expandDecenas(text: string): string {
    return text.replace(
      this.patterns.DECENA,
      (match, unidadStr) => {
        const unidad = parseInt(unidadStr, 10) % 10;
        const numeros: string[] = [];
        
        for (let decena = 0; decena <= 9; decena++) {
          numeros.push(`${decena}${unidad}`.padStart(2, '0'));
        }
        
        return numeros.join(' ');
      }
    );
  }

  /**
   * Expande terminales (tX -> X0, X1, ..., X9)
   */
  private expandTerminales(text: string): string {
    return text.replace(
      this.patterns.TERMINAL,
      (match, decenaStr) => {
        const decena = parseInt(decenaStr, 10) % 10;
        const numeros: string[] = [];
        
        for (let unidad = 0; unidad <= 9; unidad++) {
          numeros.push(`${decena}${unidad}`.padStart(2, '0'));
        }
        
        return numeros.join(' ');
      }
    );
  }

  /**
   * Expande pares relativos (XX pr N)
   */
  private expandParesRelativos(text: string): string {
    return text.replace(
      this.patterns.PARES_RELATIVOS,
      (match, base, cantidadStr) => {
        const baseNormalized = base.padStart(2, '0');
        const cantidad = Math.min(parseInt(cantidadStr, 10), 100); // Máximo 100 números
        const numeros: string[] = [];
        
        for (let i = 1; i <= cantidad; i++) {
          const complemento = i.toString().padStart(2, '0');
          numeros.push(`${baseNormalized}${complemento}`);
        }
        
        return numeros.join(' ');
      }
    );
  }

  /**
   * Expande "por todas las centenas"
   */
  private expandCentenasTodas(text: string): string {
    return text.replace(
      this.patterns.CENTENAS_TODAS,
      (match, numerosStr, montoStr) => {
        const numeros = this.extractNumbers(numerosStr);
        const centenas: string[] = [];
        
        for (const numero of numeros) {
          if (numero.length === 2) {
            for (let centena = 0; centena <= 9; centena++) {
              centenas.push(`${centena}${numero}`);
            }
          }
        }
        
        const montoPart = montoStr ? ` con ${montoStr}` : '';
        return `${centenas.join(' ')}${montoPart}`;
      }
    );
  }

  /**
   * Normaliza montos (decimales, comas, etc.)
   */
  private normalizeAmounts(text: string): string {
    return text
      // Normalizar comas decimales a puntos
      .replace(/(\d),(\d)/g, (match, p1, p2) => {
        return `${p1}${this.config.decimalSeparator}${p2}`;
      })
      // Asegurar espacios después de "con"
      .replace(/(con)(\d)/gi, '$1 $2')
      // Asegurar espacios después de montos seguidos de "y"
      .replace(/(\d)\s*(y)\s*(\d)/gi, '$1 $2 $3')
      // Eliminar símbolos de moneda innecesarios
      .replace(/[$\€\£]/g, '')
      // Normalizar "pesos" a solo números
      .replace(/\b(\d+)\s*(?:pesos?|bs|bss?)\b/gi, '$1');
  }

  /**
   * Limpieza final del texto
   */
  private cleanup(text: string): string {
    return text
      // Eliminar líneas completamente vacías al inicio/final
      .replace(/^\n+|\n+$/g, '')
      // Eliminar espacios múltiples al final de línea
      .replace(/ +\n/g, '\n')
      // Eliminar caracteres no deseados
      .replace(/[^\d\s\n.,a-záéíóúñüA-ZÁÉÍÓÚÑÜ\-*xconypdealtprv]/g, '')
      // Asegurar que cada línea tenga contenido
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n');
  }

  /**
   * Extrae números de un texto
   */
  extractNumbers(text: string): string[] {
    const numbers: string[] = [];
    const matches = text.match(/\d{1,4}/g) || [];
    
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
   * Extrae montos de una línea
   */
  extractAmounts(line: string): number[] {
    const amounts: number[] = [];
    const regex = /(\d+(?:\.\d+)?(?:,\d+)?)/g;
    let match: RegExpExecArray | null;
    
    // Primero buscar montos después de "con"
    const conIndex = line.toLowerCase().indexOf('con');
    if (conIndex !== -1) {
      const afterCon = line.substring(conIndex);
      const amountMatches = afterCon.match(/\d+(?:[.,]\d+)?/g) || [];
      
      for (const amountStr of amountMatches) {
        const normalized = amountStr.replace(',', '.');
        const amount = parseFloat(normalized);
        if (!isNaN(amount)) {
          amounts.push(amount);
        }
      }
    }
    
    // También buscar montos sueltos
    while ((match = regex.exec(line)) !== null) {
      const normalized = match[0].replace(',', '.');
      const amount = parseFloat(normalized);
      if (!isNaN(amount) && !amounts.includes(amount)) {
        amounts.push(amount);
      }
    }
    
    return amounts;
  }

  /**
   * Verifica si una línea es un nombre de jugador
   */
  private isNombreJugador(line: string): boolean {
    const trimmed = line.trim();
    
    // No puede estar vacía
    if (!trimmed || trimmed.length < 2 || trimmed.length > 35) {
      return false;
    }
    
    // No puede empezar con número
    if (/^\d/.test(trimmed)) {
      return false;
    }
    
    // No puede contener palabras clave de apuestas
    if (/\b(con|parle|candado|total|fijo|corrido|al|pr|v|d|t)\b/i.test(trimmed)) {
      return false;
    }
    
    // Debe contener principalmente letras
    const letterCount = (trimmed.match(/[A-Za-zÁ-ÿ]/g) || []).length;
    const totalCount = trimmed.length;
    
    return letterCount / totalCount > 0.7;
  }

  /**
   * Divide el texto en líneas preprocesadas
   */
  splitLines(text: string): string[] {
    return text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  }

  /**
   * Preprocesa una línea individual
   */
  preprocessLine(line: string): string {
    return this.process(line);
  }

  /**
   * Detecta si una línea necesita expansión
   */
  needsExpansion(line: string): boolean {
    return [
      this.patterns.VOLTEO,
      this.patterns.RANGO,
      this.patterns.DECENA,
      this.patterns.TERMINAL,
      this.patterns.PARES_RELATIVOS,
      this.patterns.CENTENAS_TODAS
    ].some(pattern => pattern.test(line));
  }
}