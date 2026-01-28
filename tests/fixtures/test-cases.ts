export const TEST_CASES = {
  // Casos básicos
  SIMPLE_FIJO: '05 10 15 con 20',
  FIJO_CORRIDO: '05 10 15 con 20 y 30',
  MULTIPLE_PLAYERS: `
Juan
05 10 con 20

Maria
20 30 con 10
`,
  
  // Parlés
  PARLE_EXPLICITO: '25*33 parle con 5',
  PARLE_INLINE: '05 10 15 con 20 p5',
  PARLE_CANDADO: '26 78 98 45 con 1 y 3 candado con 50',
  
  // Centenas
  CENTENAS: '325 175 359 con 10 y 10 y 10 parle con 3',
  CENTENAS_TODAS: '15 18 por todas las centenas con 5',
  
  // Patrones especiales
  VOLTEOS: '10v 20v con 10',
  RANGOS: '05 al 15 con 10',
  DECENAS: 'd0 con 5',
  TERMINALES: 't5 con 3',
  PARES_RELATIVOS: '10 pr 100 con 5',
  
  // Casos complejos
  COMPLEX_CASE: `
Zuzel
33 25 88 7 14 con 20 y 30 p5
26 78 98 45 con 1 y 3 candado con 50
44 54 con 25
33x25 parle con 10
325 175 359 con 10 y 10 y 10 parle con 3
10v 20v con 10
15 18 por todas las centenas con 5
10 pr 100  con 5
Total: 500
`,
  
  // Casos límite
  EMPTY: '',
  ONLY_NAME: 'Jugador',
  INVALID_NUMBERS: 'abc def con 10',
  HUGE_NUMBERS: '9999 10000 con 1',
  NEGATIVE_AMOUNT: '05 10 con -20',
  MULTIPLE_TOTALS: `
Jugador
05 con 10
Total: 10
Total: 20
`
};

export const EXPECTED_RESULTS = {
  SIMPLE_FIJO: {
    totalCalculado: 60,
    jugadas: 1,
    detalles: 1
  },
  FIJO_CORRIDO: {
    totalCalculado: 150,
    jugadas: 1,
    detalles: 2
  },
  // ... más resultados esperados
};