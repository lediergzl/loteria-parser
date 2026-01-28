/**
 * Ejemplo básico de uso de Loteria Parser
 * Muestra las funcionalidades principales de la librería
 */

import { 
  parseJugada, 
  createParser, 
  validateJugada,
  Jugada,
  ParseResult,
  ValidationResult
} from 'loteria-parser';

console.log('🎰 Loteria Parser - Ejemplo Básico\n');

// ============================================
// 1. USO RÁPIDO CON parseJugada
// ============================================

console.log('1. Uso rápido con parseJugada():');

const jugadaSimple = `
Zuzel
33 25 88 7 14 con 20 y 30 p5
26 78 98 45 con 1 y 3 candado con 50
Total: 500
`;

console.log('📝 Jugada de ejemplo:');
console.log(jugadaSimple);

const resultado = parseJugada(jugadaSimple);

console.log('\n📊 Resultado del parseo:');
console.log(`✅ Éxito: ${resultado.success}`);
console.log(`👤 Jugador: ${resultado.jugadas[0].jugador}`);
console.log(`💰 Total calculado: $${resultado.summary.totalCalculado.toFixed(2)}`);
console.log(`🎯 Válido: ${resultado.summary.isValid ? 'Sí ✅' : 'No ❌'}`);
console.log(`📈 Confianza: ${(resultado.summary.confidence * 100).toFixed(1)}%`);
console.log(`⚡ Tiempo de procesamiento: ${resultado.metadata.parseTime}ms`);

// ============================================
// 2. CREACIÓN DE PARSER PERSONALIZADO
// ============================================

console.log('\n\n2. Parser personalizado:');

const parser = createParser({
  strictMode: false,
  autoExpand: true,
  validateTotals: true,
  maxJugadores: 10,
  currencySymbol: 'USD$',
  debug: true
});

console.log('⚙️ Configuración del parser:');
const info = parser.getInfo();
console.log(`• Versión: ${info.version}`);
console.log(`• Modo estricto: ${info.config.strictMode}`);
console.log(`• Plugins cargados: ${info.plugins.length}`);

// ============================================
// 3. DIFERENTES FORMATOS DE JUGADAS
// ============================================

console.log('\n\n3. Formatos soportados:');

const ejemplos = [
  {
    nombre: 'Fijo simple',
    texto: '05 10 15 con 20'
  },
  {
    nombre: 'Fijo y corrido',
    texto: '05 10 15 con 20 y 30'
  },
  {
    nombre: 'Parle explícito',
    texto: '25*33 parle con 5'
  },
  {
    nombre: 'Parle inline',
    texto: '05 10 15 con 20 p5'
  },
  {
    nombre: 'Candado',
    texto: '26 78 98 45 con 1 y 3 candado con 50'
  },
  {
    nombre: 'Centenas',
    texto: '325 175 359 con 10 y 10 y 10 parle con 3'
  },
  {
    nombre: 'Volteo',
    texto: '10v 20v con 10'
  },
  {
    nombre: 'Rango',
    texto: '05 al 15 con 10'
  }
];

ejemplos.forEach((ejemplo, index) => {
  const result = parseJugada(ejemplo.texto);
  console.log(`\n${index + 1}. ${ejemplo.nombre}:`);
  console.log(`   Entrada: ${ejemplo.texto}`);
  console.log(`   Total: $${result.summary.totalCalculado.toFixed(2)}`);
  console.log(`   Detalles: ${result.jugadas[0].detalles.length} apuesta(s)`);
});

// ============================================
// 4. VALIDACIÓN DE JUGADAS
// ============================================

console.log('\n\n4. Validación de jugadas:');

const jugadasParaValidar = [
  {
    nombre: 'Jugada válida',
    texto: '05 10 con 20'
  },
  {
    nombre: 'Sin montos',
    texto: '05 10 15'
  },
  {
    nombre: 'Sin números',
    texto: 'con 20'
  },
  {
    nombre: 'Total incorrecto',
    texto: '05 10 con 20\nTotal: 100'
  }
];

jugadasParaValidar.forEach((jugada, index) => {
  const validation = validateJugada(jugada.texto);
  
  console.log(`\n${index + 1}. ${jugada.nombre}:`);
  console.log(`   Entrada: ${jugada.texto.replace(/\n/g, '\\n')}`);
  console.log(`   Válida: ${validation.valid ? 'Sí ✅' : 'No ❌'}`);
  
  if (!validation.valid) {
    console.log(`   Errores: ${validation.errors.length}`);
    if (validation.errors.length > 0) {
      console.log(`     - ${validation.errors[0]}`);
    }
    
    console.log(`   Sugerencias: ${validation.suggestions.length}`);
    if (validation.suggestions.length > 0) {
      console.log(`     - ${validation.suggestions[0]}`);
    }
  }
});

// ============================================
// 5. MÚLTIPLES JUGADORES
// ============================================

console.log('\n\n5. Múltiples jugadores:');

const jugadoresMultiples = `
Juan Perez
05 10 con 20
15 20 con 30
Total: 100

Maria Garcia
25 30 con 40
35 40 con 50
Total: 180

Carlos Rodriguez
45 50 con 60
55 60 con 70
Total: 260
`;

const resultadoMultiples = parseJugada(jugadoresMultiples);

console.log(`🎮 Total de jugadores: ${resultadoMultiples.jugadas.length}`);
console.log(`🏆 Total general: $${resultadoMultiples.summary.totalCalculado.toFixed(2)}`);

resultadoMultiples.jugadas.forEach((jugada, index) => {
  console.log(`\n   ${index + 1}. ${jugada.jugador}:`);
  console.log(`      Total: $${jugada.totalCalculado.toFixed(2)}`);
  console.log(`      Declarado: $${jugada.totalDeclarado?.toFixed(2) || 'No declarado'}`);
  console.log(`      Válido: ${jugada.isValid ? 'Sí ✅' : 'No ❌'}`);
  console.log(`      Apuestas: ${jugada.detalles.length}`);
});

// ============================================
// 6. EXTRACCIÓN DE ESTRUCTURA
// ============================================

console.log('\n\n6. Extracción de estructura:');

const estructura = parser.extractStructure(jugadoresMultiples);

console.log('📋 Estructura detectada:');
estructura.forEach((item, index) => {
  console.log(`\n   Jugador ${index + 1}: ${item.jugador}`);
  console.log(`   Líneas: ${item.lineCount}`);
  
  const lineasConNumeros = item.lines.filter(l => l.hasNumbers);
  console.log(`   Líneas con números: ${lineasConNumeros.length}`);
  
  if (lineasConNumeros.length > 0) {
    console.log(`   Ejemplo: "${lineasConNumeros[0].content.substring(0, 20)}..."`);
  }
});

// ============================================
// 7. ESTADÍSTICAS DETALLADAS
// ============================================

console.log('\n\n7. Estadísticas detalladas:');

console.log('📈 Estadísticas del último parseo:');
console.log(`• Apuestas fijas: $${resultadoMultiples.stats.fijos.toFixed(2)}`);
console.log(`• Apuestas corridas: $${resultadoMultiples.stats.corridos.toFixed(2)}`);
console.log(`• Parlés: $${resultadoMultiples.stats.parles.toFixed(2)}`);
console.log(`• Centenas: $${resultadoMultiples.stats.centenas.toFixed(2)}`);
console.log(`• Candados: $${resultadoMultiples.stats.candados.toFixed(2)}`);
console.log(`• Total de apuestas: ${resultadoMultiples.stats.totalApuestas}`);
console.log(`• Total de números: ${resultadoMultiples.stats.totalNumeros}`);

// ============================================
// 8. MANEJO DE ERRORES
// ============================================

console.log('\n\n8. Manejo de errores:');

const casosConError = [
  'Texto vacío',
  'Solo nombre',
  'abc def con ghi',
  '9999 10000 con 1',
  '05 10 con -20'
];

casosConError.forEach((texto, index) => {
  try {
    const result = parseJugada(texto);
    console.log(`\n${index + 1}. "${texto.substring(0, 20)}...":`);
    console.log(`   Éxito: ${result.success ? 'Sí' : 'No'}`);
    
    if (!result.success) {
      console.log(`   Error: ${result.metadata.errors[0]?.substring(0, 50)}...`);
    }
  } catch (error) {
    console.log(`\n${index + 1}. "${texto.substring(0, 20)}...":`);
    console.log(`   Error: ${error instanceof Error ? error.message.substring(0, 50) : 'Error desconocido'}...`);
  }
});

// ============================================
// 9. SERIALIZACIÓN JSON
// ============================================

console.log('\n\n9. Serialización a JSON:');

const resultadoJSON = JSON.stringify(resultado, null, 2);
console.log(`📄 Tamaño del JSON: ${Math.round(resultadoJSON.length / 1024)} KB`);

// Guardar en archivo (Node.js)
if (typeof process !== 'undefined') {
  const fs = require('fs');
  fs.writeFileSync('resultado-parser.json', resultadoJSON);
  console.log('💾 Resultado guardado en resultado-parser.json');
}

// ============================================
// 10. LIMPIEZA
// ============================================

console.log('\n\n10. Limpieza de recursos:');

parser.cleanup().then(() => {
  console.log('🧹 Parser limpiado correctamente');
}).catch(error => {
  console.error('❌ Error al limpiar:', error.message);
});

console.log('\n✨ Ejemplo básico completado exitosamente!');