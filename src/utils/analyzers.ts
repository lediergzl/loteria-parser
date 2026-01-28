import { DetalleApuesta, Jugada, ParseResult } from '../types';
import { PATTERNS, APUESTA_PATTERNS, LINE_PATTERNS } from '../constants/patterns';

/**
 * Analizadores para extraer información y métricas del parseo
 */

export interface AnalysisResult {
  complexity: {
    score: number; // 0-100
    level: 'simple' | 'medium' | 'complex' | 'extreme';
    factors: string[];
  };
  patterns: {
    detected: Array<{ type: string; count: number; examples: string[] }>;
    coverage: number; // 0-1
  };
  numbers: {
    total: number;
    unique: number;
    distribution: Record<string, number>;
    mostCommon: Array<{ number: string; count: number }>;
  };
  bets: {
    byType: Record<string, number>;
    averageBet: number;
    largestBet: number;
    smallestBet: number;
  };
  players: {
    count: number;
    mostActive: string | null;
    averageBetsPerPlayer: number;
    distribution: Record<string, number>;
  };
  suggestions: string[];
  warnings: string[];
}

/**
 * Analiza un texto para detectar patrones y complejidad
 */
export function analyzeText(text: string): {
  patterns: Array<{ type: string; match: string }>;
  hasPlayerNames: boolean;
  hasTotals: boolean;
  lineCount: number;
  numberCount: number;
  estimatedComplexity: 'low' | 'medium' | 'high';
} {
  const lines = text.split('\n').filter(line => line.trim());
  const patterns: Array<{ type: string; match: string }> = [];
  
  // Detectar patrones en cada línea
  lines.forEach(line => {
    // Patrones especiales
    if (PATTERNS.VOLTEO.test(line)) {
      const matches = line.match(PATTERNS.VOLTEO);
      matches?.forEach(match => patterns.push({ type: 'volteo', match }));
    }
    
    if (PATTERNS.RANGO.test(line)) {
      const matches = line.match(PATTERNS.RANGO);
      matches?.forEach(match => patterns.push({ type: 'rango', match }));
    }
    
    if (PATTERNS.DECENA.test(line)) {
      const matches = line.match(PATTERNS.DECENA);
      matches?.forEach(match => patterns.push({ type: 'decena', match }));
    }
    
    if (PATTERNS.TERMINAL.test(line)) {
      const matches = line.match(PATTERNS.TERMINAL);
      matches?.forEach(match => patterns.push({ type: 'terminal', match }));
    }
    
    if (PATTERNS.PARES_RELATIVOS.test(line)) {
      const matches = line.match(PATTERNS.PARES_RELATIVOS);
      matches?.forEach(match => patterns.push({ type: 'pares_relativos', match }));
    }
    
    if (PATTERNS.CENTENAS_TODAS.test(line)) {
      const matches = line.match(PATTERNS.CENTENAS_TODAS);
      matches?.forEach(match => patterns.push({ type: 'centenas_todas', match }));
    }
    
    // Tipos de apuesta
    if (APUESTA_PATTERNS.PARLE_SIMPLE.pattern.test(line)) {
      patterns.push({ type: 'parle_simple', match: line });
    }
    
    if (APUESTA_PATTERNS.CANDADO.pattern.test(line)) {
      patterns.push({ type: 'candado', match: line });
    }
    
    if (APUESTA_PATTERNS.CENTENA_COMPUESTA.pattern.test(line)) {
      patterns.push({ type: 'centena_compuesta', match: line });
    }
  });
  
  // Contar números
  const numberCount = (text.match(/\d{2,4}/g) || []).length;
  
  // Detectar nombres de jugador
  const hasPlayerNames = lines.some(line => LINE_PATTERNS.ES_NOMBRE.test(line));
  
  // Detectar totales
  const hasTotals = PATTERNS.TOTAL.test(text);
  
  // Calcular complejidad estimada
  let complexity: 'low' | 'medium' | 'high' = 'low';
  const patternCount = patterns.length;
  const uniquePatternTypes = new Set(patterns.map(p => p.type)).size;
  
  if (numberCount > 50 || patternCount > 10 || uniquePatternTypes > 5) {
    complexity = 'high';
  } else if (numberCount > 20 || patternCount > 5 || uniquePatternTypes > 2) {
    complexity = 'medium';
  }
  
  return {
    patterns,
    hasPlayerNames,
    hasTotals,
    lineCount: lines.length,
    numberCount,
    estimatedComplexity: complexity
  };
}

/**
 * Extrae metadatos de un bloque de texto
 */
export function extractMetadata(text: string): {
  playerName: string | null;
  hasTotal: boolean;
  betTypes: string[];
  patternTypes: string[];
  lineCount: number;
  numberCount: number;
  estimatedAmount: number;
} {
  const lines = text.split('\n').filter(line => line.trim());
  
  // Extraer nombre del jugador (primera línea si no es apuesta)
  let playerName: string | null = null;
  if (lines.length > 0 && LINE_PATTERNS.ES_NOMBRE.test(lines[0])) {
    playerName = lines[0].trim();
  }
  
  // Verificar si tiene total
  const hasTotal = lines.some(line => LINE_PATTERNS.ES_TOTAL.test(line));
  
  // Detectar tipos de apuesta
  const betTypes: string[] = [];
  const patternTypes: string[] = [];
  
  lines.forEach(line => {
    // Tipos de apuesta
    if (APUESTA_PATTERNS.FIJO.pattern.test(line)) {
      if (!betTypes.includes('fijo')) betTypes.push('fijo');
    }
    
    if (APUESTA_PATTERNS.FIJO_CORRIDO.pattern.test(line)) {
      if (!betTypes.includes('fijo_corrido')) betTypes.push('fijo_corrido');
    }
    
    if (APUESTA_PATTERNS.PARLE_SIMPLE.pattern.test(line) || 
        APUESTA_PATTERNS.PARLE_COMPUESTO.pattern.test(line)) {
      if (!betTypes.includes('parle')) betTypes.push('parle');
    }
    
    if (APUESTA_PATTERNS.CENTENA_SIMPLE.pattern.test(line) || 
        APUESTA_PATTERNS.CENTENA_COMPUESTA.pattern.test(line)) {
      if (!betTypes.includes('centena')) betTypes.push('centena');
    }
    
    if (APUESTA_PATTERNS.CANDADO.pattern.test(line)) {
      if (!betTypes.includes('candado')) betTypes.push('candado');
    }
    
    // Patrones especiales
    if (PATTERNS.VOLTEO.test(line)) patternTypes.push('volteo');
    if (PATTERNS.RANGO.test(line)) patternTypes.push('rango');
    if (PATTERNS.DECENA.test(line)) patternTypes.push('decena');
    if (PATTERNS.TERMINAL.test(line)) patternTypes.push('terminal');
    if (PATTERNS.PARES_RELATIVOS.test(line)) patternTypes.push('pares_relativos');
    if (PATTERNS.CENTENAS_TODAS.test(line)) patternTypes.push('centenas_todas');
  });
  
  // Contar números
  const numberCount = (text.match(/\d{2,4}/g) || []).length;
  
  // Estimar monto (básico)
  const amountMatches = text.match(/(?:con|de|a)\s*(\d+(?:[.,]\d+)?)/gi) || [];
  const amounts = amountMatches.map(match => {
    const numMatch = match.match(/\d+(?:[.,]\d+)?/);
    return numMatch ? parseFloat(numMatch[0].replace(',', '.')) : 0;
  });
  
  const estimatedAmount = amounts.reduce((sum, amount) => sum + amount, 0) * numberCount;
  
  return {
    playerName,
    hasTotal,
    betTypes: [...new Set(betTypes)],
    patternTypes: [...new Set(patternTypes)],
    lineCount: lines.length,
    numberCount,
    estimatedAmount
  };
}

/**
 * Analiza los detalles de apuestas para generar estadísticas
 */
export function analyzeBets(detalles: DetalleApuesta[]): {
  totalAmount: number;
  averageAmount: number;
  largestBet: DetalleApuesta | null;
  smallestBet: DetalleApuesta | null;
  byType: Record<string, { count: number; total: number; average: number }>;
  numberDistribution: Record<string, number>;
  mostCommonNumbers: Array<{ number: string; count: number }>;
} {
  if (detalles.length === 0) {
    return {
      totalAmount: 0,
      averageAmount: 0,
      largestBet: null,
      smallestBet: null,
      byType: {},
      numberDistribution: {},
      mostCommonNumbers: []
    };
  }
  
  const byType: Record<string, { count: number; total: number; average: number }> = {};
  const numberDistribution: Record<string, number> = {};
  
  let totalAmount = 0;
  let largestBet: DetalleApuesta | null = null;
  let smallestBet: DetalleApuesta | null = null;
  
  detalles.forEach(detalle => {
    // Por tipo
    const type = detalle.tipo;
    if (!byType[type]) {
      byType[type] = { count: 0, total: 0, average: 0 };
    }
    
    byType[type].count++;
    byType[type].total += detalle.monto;
    byType[type].average = byType[type].total / byType[type].count;
    
    // Distribución de números
    detalle.numeros.forEach(num => {
      numberDistribution[num] = (numberDistribution[num] || 0) + 1;
    });
    
    // Monto total
    totalAmount += detalle.monto;
    
    // Mayor y menor apuesta
    if (!largestBet || detalle.monto > largestBet.monto) {
      largestBet = detalle;
    }
    
    if (!smallestBet || detalle.monto < smallestBet.monto) {
      smallestBet = detalle;
    }
  });
  
  // Números más comunes
  const mostCommonNumbers = Object.entries(numberDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([number, count]) => ({ number, count }));
  
  const averageAmount = totalAmount / detalles.length;
  
  return {
    totalAmount,
    averageAmount,
    largestBet,
    smallestBet,
    byType,
    numberDistribution,
    mostCommonNumbers
  };
}

/**
 * Analiza una jugada completa
 */
export function analyzeJugada(jugada: Jugada): {
  summary: {
    totalBets: number;
    totalNumbers: number;
    uniqueNumbers: number;
    totalAmount: number;
    averageBetSize: number;
    betTypes: string[];
  };
  patterns: {
    specialPatterns: string[];
    expansionFactor: number;
    hasComplexPatterns: boolean;
  };
  validation: {
    isValid: boolean;
    confidence: number;
    warnings: string[];
    suggestions: string[];
  };
} {
  const betAnalysis = analyzeBets(jugada.detalles);
  const allNumbers = jugada.detalles.flatMap(d => d.numeros);
  const uniqueNumbers = new Set(allNumbers).size;
  
  // Detectar patrones especiales en las líneas
  const specialPatterns: string[] = [];
  jugada.lineas.forEach(line => {
    if (PATTERNS.VOLTEO.test(line)) specialPatterns.push('volteo');
    if (PATTERNS.RANGO.test(line)) specialPatterns.push('rango');
    if (PATTERNS.DECENA.test(line)) specialPatterns.push('decena');
    if (PATTERNS.TERMINAL.test(line)) specialPatterns.push('terminal');
    if (PATTERNS.PARES_RELATIVOS.test(line)) specialPatterns.push('pares_relativos');
    if (PATTERNS.CENTENAS_TODAS.test(line)) specialPatterns.push('centenas_todas');
  });
  
  // Calcular factor de expansión
  const expansionFactor = specialPatterns.length > 0 ? 
    allNumbers.length / Math.max(1, jugada.lineas.length) : 1;
  
  // Generar advertencias y sugerencias
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  if (!jugada.isValid) {
    warnings.push('Los totales no coinciden');
  }
  
  if (jugada.warnings.length > 0) {
    warnings.push(...jugada.warnings);
  }
  
  if (uniqueNumbers < allNumbers.length * 0.5) {
    warnings.push('Muchos números duplicados');
    suggestions.push('Considere revisar números duplicados');
  }
  
  if (specialPatterns.length > 3) {
    warnings.push('Muchos patrones especiales detectados');
  }
  
  if (jugada.detalles.length === 0) {
    warnings.push('No se detectaron apuestas válidas');
    suggestions.push('Verifique el formato de las apuestas');
  }
  
  // Calcular confianza
  let confidence = 1.0;
  if (!jugada.isValid) confidence -= 0.3;
  if (warnings.length > 2) confidence -= 0.2;
  if (jugada.detalles.length === 0) confidence = 0;
  confidence = Math.max(0, Math.min(1, confidence));
  
  return {
    summary: {
      totalBets: jugada.detalles.length,
      totalNumbers: allNumbers.length,
      uniqueNumbers,
      totalAmount: jugada.totalCalculado,
      averageBetSize: betAnalysis.averageAmount,
      betTypes: Object.keys(betAnalysis.byType)
    },
    patterns: {
      specialPatterns: [...new Set(specialPatterns)],
      expansionFactor,
      hasComplexPatterns: specialPatterns.length > 0
    },
    validation: {
      isValid: jugada.isValid,
      confidence,
      warnings: [...new Set(warnings)],
      suggestions: [...new Set(suggestions)]
    }
  };
}

/**
 * Analiza el resultado completo del parseo
 */
export function analyzeParseResult(result: ParseResult): AnalysisResult {
  if (result.jugadas.length === 0) {
    return {
      complexity: {
        score: 0,
        level: 'simple',
        factors: ['Sin jugadas procesadas']
      },
      patterns: {
        detected: [],
        coverage: 0
      },
      numbers: {
        total: 0,
        unique: 0,
        distribution: {},
        mostCommon: []
      },
      bets: {
        byType: {},
        averageBet: 0,
        largestBet: 0,
        smallestBet: 0
      },
      players: {
        count: 0,
        mostActive: null,
        averageBetsPerPlayer: 0,
        distribution: {}
      },
      suggestions: ['No se procesaron jugadas válidas'],
      warnings: result.metadata.errors
    };
  }
  
  // Recolectar todos los detalles
  const allDetalles = result.jugadas.flatMap(j => j.detalles);
  const allNumbers = allDetalles.flatMap(d => d.numeros);
  const uniqueNumbers = new Set(allNumbers);
  
  // Analizar complejidad
  const complexityScore = calculateComplexityScore(result);
  const complexityLevel = getComplexityLevel(complexityScore);
  const complexityFactors = getComplexityFactors(result);
  
  // Detectar patrones
  const patternsDetected = detectPatterns(result);
  
  // Distribución de números
  const numberDistribution: Record<string, number> = {};
  allNumbers.forEach(num => {
    numberDistribution[num] = (numberDistribution[num] || 0) + 1;
  });
  
  const mostCommonNumbers = Object.entries(numberDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([number, count]) => ({ number, count }));
  
  // Análisis de apuestas
  const betsByType: Record<string, number> = {};
  let totalBetAmount = 0;
  let largestBet = 0;
  let smallestBet = Infinity;
  
  allDetalles.forEach(detalle => {
    const type = detalle.tipo;
    betsByType[type] = (betsByType[type] || 0) + detalle.monto;
    totalBetAmount += detalle.monto;
    
    if (detalle.monto > largestBet) largestBet = detalle.monto;
    if (detalle.monto < smallestBet) smallestBet = detalle.monto;
  });
  
  const averageBet = allDetalles.length > 0 ? totalBetAmount / allDetalles.length : 0;
  
  // Análisis de jugadores
  const playerDistribution: Record<string, number> = {};
  let mostActivePlayer: string | null = null;
  let maxBets = 0;
  
  result.jugadas.forEach(jugada => {
    const betCount = jugada.detalles.length;
    playerDistribution[jugada.jugador] = betCount;
    
    if (betCount > maxBets) {
      maxBets = betCount;
      mostActivePlayer = jugada.jugador;
    }
  });
  
  const averageBetsPerPlayer = result.jugadas.length > 0 ? 
    allDetalles.length / result.jugadas.length : 0;
  
  // Generar sugerencias y advertencias
  const suggestions: string[] = [];
  const warnings: string[] = [];
  
  if (!result.summary.isValid) {
    warnings.push(`Diferencia en totales: ${result.summary.difference.toFixed(2)}`);
    suggestions.push('Verifique los montos declarados vs calculados');
  }
  
  if (result.metadata.errors.length > 0) {
    warnings.push(...result.metadata.errors.slice(0, 3));
  }
  
  if (result.metadata.warnings.length > 0) {
    warnings.push(...result.metadata.warnings.slice(0, 5));
  }
  
  if (allNumbers.length > uniqueNumbers.size * 2) {
    warnings.push('Muchos números duplicados encontrados');
    suggestions.push('Considere eliminar números duplicados');
  }
  
  if (complexityLevel === 'extreme') {
    warnings.push('Complejidad extrema detectada');
    suggestions.push('Considere dividir las jugadas en lotes más pequeños');
  }
  
  // Cobertura de patrones
  const patternCoverage = patternsDetected.length > 0 ? 
    Math.min(1, patternsDetected.length / 10) : 0;
  
  return {
    complexity: {
      score: complexityScore,
      level: complexityLevel,
      factors: complexityFactors
    },
    patterns: {
      detected: patternsDetected,
      coverage: patternCoverage
    },
    numbers: {
      total: allNumbers.length,
      unique: uniqueNumbers.size,
      distribution: numberDistribution,
      mostCommon: mostCommonNumbers
    },
    bets: {
      byType: betsByType,
      averageBet,
      largestBet,
      smallestBet: smallestBet === Infinity ? 0 : smallestBet
    },
    players: {
      count: result.jugadas.length,
      mostActive: mostActivePlayer,
      averageBetsPerPlayer,
      distribution: playerDistribution
    },
    suggestions: [...new Set(suggestions)],
    warnings: [...new Set(warnings)]
  };
}

/**
 * Detectar patrones específicos en el resultado
 */
function detectPatterns(result: ParseResult): Array<{ type: string; count: number; examples: string[] }> {
  const patterns: Record<string, { count: number; examples: Set<string> }> = {};
  
  result.jugadas.forEach(jugada => {
    jugada.lineas.forEach(line => {
      // Patrones especiales
      if (PATTERNS.VOLTEO.test(line)) {
        addPattern('volteo', line.match(PATTERNS.VOLTEO)?.[0] || line);
      }
      
      if (PATTERNS.RANGO.test(line)) {
        addPattern('rango', line.match(PATTERNS.RANGO)?.[0] || line);
      }
      
      if (PATTERNS.DECENA.test(line)) {
        addPattern('decena', line.match(PATTERNS.DECENA)?.[0] || line);
      }
      
      if (PATTERNS.TERMINAL.test(line)) {
        addPattern('terminal', line.match(PATTERNS.TERMINAL)?.[0] || line);
      }
      
      if (PATTERNS.PARES_RELATIVOS.test(line)) {
        addPattern('pares_relativos', line.match(PATTERNS.PARES_RELATIVOS)?.[0] || line);
      }
      
      if (PATTERNS.CENTENAS_TODAS.test(line)) {
        addPattern('centenas_todas', line.match(PATTERNS.CENTENAS_TODAS)?.[0] || line);
      }
      
      // Tipos de apuesta
      if (APUESTA_PATTERNS.PARLE_SIMPLE.pattern.test(line)) {
        addPattern('parle_simple', line);
      }
      
      if (APUESTA_PATTERNS.CANDADO.pattern.test(line)) {
        addPattern('candado', line);
      }
      
      if (APUESTA_PATTERNS.CENTENA_COMPUESTA.pattern.test(line)) {
        addPattern('centena_compuesta', line);
      }
    });
  });
  
  function addPattern(type: string, example: string) {
    if (!patterns[type]) {
      patterns[type] = { count: 0, examples: new Set() };
    }
    patterns[type].count++;
    patterns[type].examples.add(example);
  }
  
  return Object.entries(patterns).map(([type, data]) => ({
    type,
    count: data.count,
    examples: Array.from(data.examples).slice(0, 3)
  }));
}

/**
 * Calcular puntuación de complejidad (0-100)
 */
function calculateComplexityScore(result: ParseResult): number {
  let score = 0;
  
  // Factor 1: Número de jugadores (0-20)
  const playerFactor = Math.min(20, result.jugadas.length * 2);
  score += playerFactor;
  
  // Factor 2: Número total de apuestas (0-30)
  const totalBets = result.jugadas.reduce((sum, j) => sum + j.detalles.length, 0);
  const betFactor = Math.min(30, totalBets);
  score += betFactor;
  
  // Factor 3: Número total de números únicos (0-25)
  const allNumbers = result.jugadas.flatMap(j => j.detalles.flatMap(d => d.numeros));
  const uniqueNumbers = new Set(allNumbers).size;
  const numberFactor = Math.min(25, uniqueNumbers / 2);
  score += numberFactor;
  
  // Factor 4: Variedad de tipos de apuesta (0-15)
  const betTypes = new Set(result.jugadas.flatMap(j => j.detalles.map(d => d.tipo)));
  const typeFactor = Math.min(15, betTypes.size * 3);
  score += typeFactor;
  
  // Factor 5: Presencia de patrones especiales (0-10)
  const specialPatterns = detectPatterns(result);
  const patternFactor = Math.min(10, specialPatterns.length * 2);
  score += patternFactor;
  
  return Math.min(100, score);
}

/**
 * Determinar nivel de complejidad basado en puntuación
 */
function getComplexityLevel(score: number): 'simple' | 'medium' | 'complex' | 'extreme' {
  if (score < 20) return 'simple';
  if (score < 50) return 'medium';
  if (score < 80) return 'complex';
  return 'extreme';
}

/**
 * Obtener factores que contribuyen a la complejidad
 */
function getComplexityFactors(result: ParseResult): string[] {
  const factors: string[] = [];
  
  const totalBets = result.jugadas.reduce((sum, j) => sum + j.detalles.length, 0);
  const allNumbers = result.jugadas.flatMap(j => j.detalles.flatMap(d => d.numeros));
  const uniqueNumbers = new Set(allNumbers).size;
  const betTypes = new Set(result.jugadas.flatMap(j => j.detalles.map(d => d.tipo)));
  const specialPatterns = detectPatterns(result);
  
  if (result.jugadas.length > 5) factors.push(`Muchos jugadores (${result.jugadas.length})`);
  if (totalBets > 20) factors.push(`Muchas apuestas (${totalBets})`);
  if (uniqueNumbers > 30) factors.push(`Muchos números únicos (${uniqueNumbers})`);
  if (betTypes.size > 3) factors.push(`Variedad de tipos de apuesta (${betTypes.size})`);
  if (specialPatterns.length > 2) factors.push(`Patrones especiales (${specialPatterns.length})`);
  
  if (factors.length === 0) {
    factors.push('Complejidad baja');
  }
  
  return factors;
}

/**
 * Obtener resumen ejecutivo del análisis
 */
export function getExecutiveSummary(analysis: AnalysisResult): {
  overview: string;
  keyMetrics: Array<{ label: string; value: string }>;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
} {
  const metrics: Array<{ label: string; value: string }> = [
    { label: 'Complejidad', value: analysis.complexity.level },
    { label: 'Jugadores', value: analysis.players.count.toString() },
    { label: 'Apuestas Totales', value: analysis.numbers.total.toString() },
    { label: 'Números Únicos', value: analysis.numbers.unique.toString() },
    { label: 'Tipos de Apuesta', value: Object.keys(analysis.bets.byType).length.toString() },
    { label: 'Patrones Detectados', value: analysis.patterns.detected.length.toString() }
  ];
  
  // Nivel de riesgo
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (analysis.complexity.level === 'extreme') riskLevel = 'high';
  else if (analysis.complexity.level === 'complex') riskLevel = 'medium';
  else if (analysis.warnings.length > 3) riskLevel = 'medium';
  
  // Recomendaciones
  const recommendations: string[] = [];
  
  if (analysis.complexity.level === 'extreme') {
    recommendations.push('Dividir el procesamiento en lotes más pequeños');
  }
  
  if (analysis.warnings.length > 0) {
    recommendations.push('Revisar las advertencias detectadas');
  }
  
  if (analysis.numbers.total > 100) {
    recommendations.push('Considerar validación adicional para grandes volúmenes');
  }
  
  if (analysis.patterns.detected.some(p => p.type.includes('centenas_todas'))) {
    recommendations.push('Verificar expansión de centenas (puede generar muchos números)');
  }
  
  // Overview
  const overview = `Análisis completado: ${analysis.players.count} jugadores, ` +
    `${analysis.numbers.total} apuestas procesadas con complejidad ${analysis.complexity.level}. ` +
    `${analysis.warnings.length} advertencias detectadas.`;
  
  return {
    overview,
    keyMetrics: metrics,
    recommendations: [...new Set(recommendations)],
    riskLevel
  };
}