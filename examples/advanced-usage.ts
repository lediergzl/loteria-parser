/**
 * Ejemplo avanzado de uso de Loteria Parser
 * Muestra funcionalidades avanzadas, plugins personalizados y optimizaciones
 */

import { 
  createParser, 
  Parser,
  ParseResult,
  Jugada,
  ProcessorPlugin,
  PluginContext,
  BasePlugin
} from 'loteria-parser';

import { 
  analyzeParseResult, 
  getExecutiveSummary,
  analyzeText 
} from 'loteria-parser/utils/analyzers';

import { formatCurrency, formatDuration } from 'loteria-parser/utils/formatters';

console.log('🚀 Loteria Parser - Ejemplo Avanzado\n');

// ============================================
// 1. CONFIGURACIÓN AVANZADA DEL PARSER
// ============================================

console.log('1. Configuración avanzada del parser:');

const advancedParser = createParser({
  strictMode: true,                    // Lanza errores en lugar de warnings
  autoExpand: true,                    // Expande patrones automáticamente
  validateTotals: true,                // Valida que los totales coincidan
  maxJugadores: 50,                    // Límite de jugadores
  currencySymbol: '€',                 // Símbolo personalizado
  decimalSeparator: ',',               // Separador decimal europeo
  allowNegative: false,                // No permitir montos negativos
  maxMonto: 50000,                     // Monto máximo por apuesta
  defaultMontoFijo: 5,                 // Monto por defecto para fijos
  defaultMontoCorrido: 3,              // Monto por defecto para corridos
  debug: true,                         // Modo depuración
  timeout: 10000,                      // Timeout de 10 segundos
  cache: {
    enabled: true,                     // Habilitar caché
    ttl: 300000,                       // 5 minutos de vida
    maxSize: 500                       // Máximo 500 entradas en caché
  }
});

console.log('⚙️ Configuración aplicada:');
const parserInfo = advancedParser.getInfo();
console.log(`• Timeout: ${parserInfo.config.timeout}ms`);
console.log(`• TTL del caché: ${parserInfo.config.cache.ttl}ms`);
console.log(`• Tamaño máximo del caché: ${parserInfo.config.cache.maxSize}`);
console.log(`• Plugins activos: ${parserInfo.plugins.join(', ')}`);

// ============================================
// 2. ANÁLISIS DE COMPLEJIDAD Y RENDIMIENTO
// ============================================

console.log('\n\n2. Análisis de complejidad y rendimiento:');

const jugadaCompleja = `
Equipo Alpha
00 al 99 con 0.50
d0 d5 con 1
t1 t9 con 2
10v 25v 33v con 3
15 25 35 45 por todas las centenas con 5
50*75 parle con 10
01 02 03 04 05 con 2 y 4 candado con 100
325 426 527 con 10 y 5 y 3 parle con 2
Total: 5000
`;

console.log('📊 Análisis del texto:');
const analisisTexto = analyzeText(jugadaCompleja);
console.log(`• Líneas: ${analisisTexto.lineCount}`);
console.log(`• Números: ${analisisTexto.numberCount}`);
console.log(`• Patrones detectados: ${analisisTexto.patterns.length}`);
console.log(`• Complejidad estimada: ${analisisTexto.estimatedComplexity}`);

if (analisisTexto.patterns.length > 0) {
  console.log('• Tipos de patrones:');
  analisisTexto.patterns.forEach(p => {
    console.log(`  - ${p.type}: "${p.match.substring(0, 20)}..."`);
  });
}

// ============================================
// 3. PROCESAMIENTO CON MÉTRICAS DE RENDIMIENTO
// ============================================

console.log('\n\n3. Procesamiento con métricas de rendimiento:');

const startTime = Date.now();
const resultadoComplejo = advancedParser.parse(jugadaCompleja);
const endTime = Date.now();

console.log('⏱️  Métricas de rendimiento:');
console.log(`• Tiempo total: ${formatDuration(endTime - startTime)}`);
console.log(`• Tiempo del parser: ${formatDuration(resultadoComplejo.metadata.parseTime)}`);
console.log(`• Longitud original: ${resultadoComplejo.metadata.originalLength} caracteres`);
console.log(`• Longitud procesada: ${resultadoComplejo.metadata.processedLength} caracteres`);

if (resultadoComplejo.metadata.cacheStats) {
  console.log('• Estadísticas del caché:');
  console.log(`  - Hits: ${resultadoComplejo.metadata.cacheStats.hits}`);
  console.log(`  - Misses: ${resultadoComplejo.metadata.cacheStats.misses}`);
  console.log(`  - Tasa de acierto: ${resultadoComplejo.metadata.cacheStats.hitRate.toFixed(1)}%`);
}

// ============================================
// 4. ANÁLISIS COMPLETO DEL RESULTADO
// ============================================

console.log('\n\n4. Análisis completo del resultado:');

const analisisCompleto = analyzeParseResult(resultadoComplejo);

console.log('🎯 Resumen ejecutivo:');
const resumenEjecutivo = getExecutiveSummary(analisisCompleto);
console.log(`• Overview: ${resumenEjecutivo.overview}`);
console.log(`• Nivel de riesgo: ${resumenEjecutivo.riskLevel}`);

console.log('\n📈 Métricas clave:');
resumenEjecutivo.keyMetrics.forEach(metric => {
  console.log(`• ${metric.label}: ${metric.value}`);
});

console.log('\n💡 Recomendaciones:');
resumenEjecutivo.recommendations.forEach((rec, index) => {
  console.log(`  ${index + 1}. ${rec}`);
});

console.log('\n📊 Estadísticas detalladas:');
console.log(`• Complejidad: ${analisisComplejo.complexity.score}/100 (${analisisComplejo.complexity.level})`);
console.log(`• Factores: ${analisisComplejo.complexity.factors.join(', ')}`);
console.log(`• Cobertura de patrones: ${(analisisComplejo.patterns.coverage * 100).toFixed(1)}%`);

console.log('\n🎰 Distribución de apuestas:');
Object.entries(analisisComplejo.bets.byType).forEach(([type, amount]) => {
  console.log(`  • ${type}: ${formatCurrency(amount, '€')}`);
});

console.log('\n🔢 Números más comunes:');
analisisComplejo.numbers.mostCommon.forEach((num, index) => {
  console.log(`  ${index + 1}. ${num.number}: ${num.count} veces`);
});

// ============================================
// 5. PLUGIN PERSONALIZADO
// ============================================

console.log('\n\n5. Plugin personalizado:');

class LoteriasNacionalesPlugin extends BasePlugin {
  name = 'loterias-nacionales-plugin';
  version = '1.0.0';
  priority = 150; // Prioridad alta
  
  private loterias = new Set(['primera', 'matutina', 'vespertina', 'nocturna']);
  
  canProcess(text: string): boolean {
    const lowerText = text.toLowerCase();
    return Array.from(this.loterias).some(loteria => 
      lowerText.includes(`lotería ${loteria}`) || 
      lowerText.includes(`loteria ${loteria}`)
    );
  }
  
  process(text: string, context: PluginContext): Jugada {
    console.log('🔌 Plugin de Loterías Nacionales procesando...');
    
    // Extraer tipo de lotería
    const lowerText = text.toLowerCase();
    let tipoLoteria = 'desconocida';
    
    for (const loteria of this.loterias) {
      if (lowerText.includes(loteria)) {
        tipoLoteria = loteria;
        break;
      }
    }
    
    // Procesar como apuesta normal pero con metadata especial
    const jugadaBase = super.createJugada(
      context.jugador,
      [], // Los detalles los procesará otro plugin
      context.totalDeclarado,
      context.lineas
    );
    
    // Enriquecer con metadata específica
    return {
      ...jugadaBase,
      metadata: {
        ...jugadaBase.metadata,
        loteria: {
          tipo: tipoLoteria,
          horario: this.getHorarioLoteria(tipoLoteria),
          multiplicador: this.getMultiplicador(tipoLoteria)
        }
      }
    };
  }
  
  private getHorarioLoteria(tipo: string): string {
    const horarios: Record<string, string> = {
      'primera': '12:00 PM',
      'matutina': '10:00 AM',
      'vespertina': '4:00 PM',
      'nocturna': '8:00 PM'
    };
    return horarios[tipo] || 'Horario no especificado';
  }
  
  private getMultiplicador(tipo: string): number {
    const multiplicadores: Record<string, number> = {
      'primera': 1.0,
      'matutina': 0.9,
      'vespertina': 1.1,
      'nocturna': 1.2
    };
    return multiplicadores[tipo] || 1.0;
  }
  
  protected onValidate(jugada: Jugada) {
    const warnings: string[] = [];
    
    // Validar que la lotería tenga metadata
    if (!jugada.metadata?.loteria) {
      warnings.push('No se especificó tipo de lotería');
    }
    
    return {
      valid: true,
      errors: [],
      warnings,
      suggestions: []
    };
  }
}

// Registrar el plugin personalizado
const pluginLoteria = new LoteriasNacionalesPlugin();
advancedParser.registerPlugin(pluginLoteria);

console.log(`✅ Plugin registrado: ${pluginLoteria.name} v${pluginLoteria.version}`);

// Probar el plugin
const jugadaLoteria = `
Juan Perez
Lotería Primera
05 10 15 con 20
Total: 60
`;

const resultadoConPlugin = advancedParser.parse(jugadaLoteria);
console.log(`📊 Jugada procesada con plugin: ${resultadoConPlugin.success}`);
console.log(`🎯 Tipo de lotería: ${resultadoConPlugin.jugadas[0].metadata?.loteria?.tipo}`);
console.log(`⏰ Horario: ${resultadoConPlugin.jugadas[0].metadata?.loteria?.horario}`);

// ============================================
// 6. PROCESAMIENTO POR LOTES
// ============================================

console.log('\n\n6. Procesamiento por lotes:');

function generarLoteJugadas(cantidad: number): string {
  let lote = '';
  
  for (let i = 1; i <= cantidad; i++) {
    lote += `Cliente ${i}\n`;
    
    // Generar apuestas aleatorias
    const numApuestas = Math.floor(Math.random() * 5) + 1;
    for (let j = 0; j < numApuestas; j++) {
      const num1 = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const num2 = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const monto = Math.floor(Math.random() * 50) + 1;
      lote += `${num1} ${num2} con ${monto}\n`;
    }
    
    const total = numApuestas * 2 * monto;
    lote += `Total: ${total}\n\n`;
  }
  
  return lote;
}

console.log('🔁 Procesando lote de 100 jugadores...');
const loteGrande = generarLoteJugadas(100);

const inicioLote = Date.now();
const resultadoLote = advancedParser.parse(loteGrande);
const finLote = Date.now();

console.log('📈 Resultados del procesamiento por lotes:');
console.log(`• Jugadores procesados: ${resultadoLote.jugadas.length}`);
console.log(`• Tiempo total: ${formatDuration(finLote - inicioLote)}`);
console.log(`• Apuestas por segundo: ${Math.round(resultadoLote.stats.totalApuestas / ((finLote - inicioLote) / 1000))}`);
console.log(`• Memoria usada: ~${Math.round(resultadoLote.metadata.processedLength / 1024)}KB`);

// ============================================
// 7. OPTIMIZACIÓN CON CACHÉ
// ============================================

console.log('\n\n7. Optimización con caché:');

const jugadasFrecuentes = [
  '05 10 con 20',
  '15 20 con 30',
  '25 30 con 40',
  '35 40 con 50'
];

console.log('🔥 Procesando jugadas frecuentes (con caché):');

// Primera pasada (cache miss)
console.log('Primera pasada (cache miss):');
const tiemposPrimera: number[] = [];

jugadasFrecuentes.forEach((jugada, index) => {
  const inicio = Date.now();
  advancedParser.parse(jugada);
  const fin = Date.now();
  tiemposPrimera.push(fin - inicio);
  
  console.log(`  ${index + 1}. ${jugada}: ${fin - inicio}ms`);
});

const promedioPrimera = tiemposPrimera.reduce((a, b) => a + b, 0) / tiemposPrimera.length;
console.log(`  Promedio: ${promedioPrimera.toFixed(2)}ms`);

// Segunda pasada (cache hit)
console.log('\nSegunda pasada (cache hit):');
const tiemposSegunda: number[] = [];

jugadasFrecuentes.forEach((jugada, index) => {
  const inicio = Date.now();
  advancedParser.parse(jugada);
  const fin = Date.now();
  tiemposSegunda.push(fin - inicio);
  
  console.log(`  ${index + 1}. ${jugada}: ${fin - inicio}ms`);
});

const promedioSegunda = tiemposSegunda.reduce((a, b) => a + b, 0) / tiemposSegunda.length;
console.log(`  Promedio: ${promedioSegunda.toFixed(2)}ms`);
console.log(`  Mejora: ${((promedioPrimera / promedioSegunda) - 1).toFixed(1)}x más rápido`);

// ============================================
// 8. INTEGRACIÓN CON BASE DE DATOS
// ============================================

console.log('\n\n8. Integración con base de datos:');

// Simulación de conexión a base de datos
class DatabaseSimulator {
  private jugadas: Array<{
    id: number;
    texto: string;
    resultado: ParseResult;
    timestamp: Date;
  }> = [];
  
  private nextId = 1;
  
  async guardarJugada(texto: string, resultado: ParseResult): Promise<number> {
    const id = this.nextId++;
    this.jugadas.push({
      id,
      texto,
      resultado,
      timestamp: new Date()
    });
    
    console.log(`💾 Jugada guardada en DB con ID: ${id}`);
    return id;
  }
  
  async buscarJugada(id: number): Promise<ParseResult | null> {
    const jugada = this.jugadas.find(j => j.id === id);
    return jugada?.resultado || null;
  }
  
  async obtenerEstadisticas(): Promise<{
    total: number;
    promedioTiempo: number;
    tasaExito: number;
  }> {
    const total = this.jugadas.length;
    const promedioTiempo = this.jugadas.reduce((sum, j) => 
      sum + j.resultado.metadata.parseTime, 0) / total;
    const tasaExito = this.jugadas.filter(j => j.resultado.success).length / total;
    
    return { total, promedioTiempo, tasaExito };
  }
}

const db = new DatabaseSimulator();

// Guardar varias jugadas
const jugadasParaGuardar = [
  '05 10 con 20',
  '15 20 con 30',
  '25 30 con 40'
];

console.log('💾 Guardando jugadas en base de datos...');

const ids: number[] = [];
for (const texto of jugadasParaGuardar) {
  const resultado = advancedParser.parse(texto);
  const id = await db.guardarJugada(texto, resultado);
  ids.push(id);
}

// Obtener estadísticas
const stats = await db.obtenerEstadisticas();
console.log('\n📊 Estadísticas de la base de datos:');
console.log(`• Total de jugadas: ${stats.total}`);
console.log(`• Tiempo promedio: ${stats.promedioTiempo.toFixed(2)}ms`);
console.log(`• Tasa de éxito: ${(stats.tasaExito * 100).toFixed(1)}%`);

// ============================================
// 9. EXPORTACIÓN DE RESULTADOS
// ============================================

console.log('\n\n9. Exportación de resultados:');

function exportarCSV(resultados: ParseResult): string {
  let csv = 'Jugador,Total Calculado,Total Declarado,Diferencia,Válido,Apuestas,Números\n';
  
  resultados.jugadas.forEach(jugada => {
    const diferencia = jugada.totalDeclarado ? 
      Math.abs(jugada.totalCalculado - jugada.totalDeclarado) : 0;
    
    csv += `"${jugada.jugador}",${jugada.totalCalculado},${jugada.totalDeclarado || ''},`;
    csv += `${diferencia},${jugada.isValid},`;
    csv += `${jugada.detalles.length},`;
    csv += `${jugada.detalles.reduce((sum, d) => sum + d.numeros.length, 0)}\n`;
  });
  
  return csv;
}

function exportarJSON(resultados: ParseResult): string {
  const datosSimplificados = {
    timestamp: new Date().toISOString(),
    totalJugadas: resultados.jugadas.length,
    totalCalculado: resultados.summary.totalCalculado,
    totalDeclarado: resultados.summary.totalDeclarado,
    diferencia: resultados.summary.difference,
    valido: resultados.summary.isValid,
    jugadores: resultados.jugadas.map(j => ({
      nombre: j.jugador,
      total: j.totalCalculado,
      apuestas: j.detalles.length
    }))
  };
  
  return JSON.stringify(datosSimplificados, null, 2);
}

const csvExport = exportarCSV(resultadoComplejo);
const jsonExport = exportarJSON(resultadoComplejo);

console.log('📤 Exportaciones generadas:');
console.log(`• CSV: ${csvExport.length} caracteres`);
console.log(`• JSON: ${jsonExport.length} caracteres`);

// Guardar archivos (Node.js)
if (typeof process !== 'undefined') {
  const fs = require('fs');
  const path = require('path');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  fs.writeFileSync(`export-${timestamp}.csv`, csvExport);
  fs.writeFileSync(`export-${timestamp}.json`, jsonExport);
  
  console.log('💾 Archivos guardados:');
  console.log(`  • export-${timestamp}.csv`);
  console.log(`  • export-${timestamp}.json`);
}

// ============================================
// 10. MONITOREO Y LOGGING AVANZADO
// ============================================

console.log('\n\n10. Monitoreo y logging avanzado:');

class MonitoringService {
  private metrics: Array<{
    timestamp: Date;
    operation: string;
    duration: number;
    success: boolean;
    details?: any;
  }> = [];
  
  log(operation: string, duration: number, success: boolean, details?: any) {
    this.metrics.push({
      timestamp: new Date(),
      operation,
      duration,
      success,
      details
    });
    
    // Log en consola
    const status = success ? '✅' : '❌';
    console.log(`${status} ${operation}: ${duration}ms`);
  }
  
  getReport() {
    const total = this.metrics.length;
    const successes = this.metrics.filter(m => m.success).length;
    const avgDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / total;
    
    return {
      totalOperations: total,
      successRate: (successes / total) * 100,
      averageDuration: avgDuration,
      lastHour: this.metrics.filter(m => 
        new Date().getTime() - m.timestamp.getTime() < 3600000
      ).length
    };
  }
}

const monitor = new MonitoringService();

// Simular operaciones monitoreadas
console.log('📊 Operaciones monitoreadas:');

['parse_simple', 'parse_complex', 'validate', 'analyze'].forEach(op => {
  const start = Date.now();
  
  // Simular operación
  setTimeout(() => {
    const end = Date.now();
    const success = Math.random() > 0.2; // 80% de éxito
    monitor.log(op, end - start, success, {
      sample: '05 10 con 20'
    });
    
    // Si es la última operación, mostrar reporte
    if (op === 'analyze') {
      setTimeout(() => {
        console.log('\n📈 Reporte de monitoreo:');
        const report = monitor.getReport();
        console.log(`• Operaciones totales: ${report.totalOperations}`);
        console.log(`• Tasa de éxito: ${report.successRate.toFixed(1)}%`);
        console.log(`• Duración promedio: ${report.averageDuration.toFixed(2)}ms`);
        console.log(`• Operaciones última hora: ${report.lastHour}`);
      }, 100);
    }
  }, Math.random() * 100);
});

// ============================================
// LIMPIEZA FINAL
// ============================================

console.log('\n\n🧹 Limpieza final...');

advancedParser.cleanup().then(() => {
  console.log('✅ Recursos liberados correctamente');
  console.log('\n✨ Ejemplo avanzado completado exitosamente!');
}).catch(error => {
  console.error('❌ Error en limpieza:', error.message);
});