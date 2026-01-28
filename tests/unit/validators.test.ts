import { Validator } from '../../src/validators';
import { ParserConfig, Jugada, DetalleApuesta } from '../../src/types';

describe('Unit Tests - Validator', () => {
  let validator: Validator;
  let config: ParserConfig;

  beforeEach(() => {
    config = {
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
      cache: { enabled: true, ttl: 60000, maxSize: 1000 }
    };
    
    validator = new Validator(config);
  });

  describe('Syntax Validation', () => {
    test('should validate empty text', () => {
      const result = validator.validateSyntax('');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Texto vacío');
    });

    test('should validate valid syntax', () => {
      const text = '05 10 con 20';
      const result = validator.validateSyntax(text);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing numbers', () => {
      const text = 'con 20';
      const result = validator.validateSyntax(text);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('No se encontraron números');
    });

    test('should detect missing amounts', () => {
      const text = '05 10';
      const result = validator.validateSyntax(text);
      
      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('No se encontraron montos');
    });

    test('should validate line numbers correctly', () => {
      const text = 'Line 1\nInvalid Line\n05 10 con 20';
      const result = validator.validateSyntax(text);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Línea 2');
    });
  });

  describe('Player Name Detection', () => {
    test('should detect valid player names', () => {
      const validNames = [
        'Juan Perez',
        'Maria Garcia',
        'José Rodríguez',
        'Ana María',
        'Carlos'
      ];
      
      validNames.forEach(name => {
        expect(validator.isNombreJugador(name)).toBe(true);
      });
    });

    test('should reject invalid player names', () => {
      const invalidNames = [
        '05 10 con 20', // Contains numbers and keywords
        'con', // Just a keyword
        'parle', // Just a keyword
        'A', // Too short
        'A'.repeat(36), // Too long
        '1234', // Starts with number
        'Jugador con 20' // Contains keyword
      ];
      
      invalidNames.forEach(name => {
        expect(validator.isNombreJugador(name)).toBe(false);
      });
    });

    test('should detect total lines', () => {
      const totalLines = [
        'Total: 100',
        'Total 100',
        'total: 100',
        'TOTAL = 100',
        ' total 100 '
      ];
      
      totalLines.forEach(line => {
        expect(validator.isTotalLine(line)).toBe(true);
      });
    });

    test('should reject non-total lines', () => {
      const nonTotalLines = [
        '05 10 con 20',
        'Jugador',
        'parle con 5',
        'Totalidad',
        'Totalmente'
      ];
      
      nonTotalLines.forEach(line => {
        expect(validator.isTotalLine(line)).toBe(false);
      });
    });
  });

  describe('Amount Validation', () => {
    test('should detect negative amounts when not allowed', () => {
      const text = '05 10 con -20';
      const result = validator.validateSyntax(text);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Monto negativo no permitido');
    });

    test('should allow negative amounts when configured', () => {
      const allowNegativeConfig = { ...config, allowNegative: true };
      const allowNegativeValidator = new Validator(allowNegativeConfig);
      
      const text = '05 10 con -20';
      const result = allowNegativeValidator.validateSyntax(text);
      
      // Still invalid for other reasons, but not for negative amount
      expect(result.errors.some(e => e.includes('negativo'))).toBe(false);
    });

    test('should detect excessive amounts', () => {
      const text = '05 10 con 2000000'; // Exceeds maxMonto of 1000000
      const result = validator.validateSyntax(text);
      
      expect(result.valid).toBe(false);
      expect(result.warnings[0]).toContain('Monto excesivo');
    });

    test('should detect zero amounts', () => {
      const text = '05 10 con 0';
      const result = validator.validateSyntax(text);
      
      expect(result.valid).toBe(false);
      expect(result.warnings[0]).toContain('Monto cero');
    });
  });

  describe('Number Validation', () => {
    test('should validate 2-digit numbers', () => {
      const validNumbers = ['00', '05', '10', '99'];
      const invalidNumbers = ['-1', '100', 'abc', '5', '05.5'];
      
      validNumbers.forEach(num => {
        const extracted = validator['extractNumbers'](`test ${num} test`);
        expect(extracted).toContain(num);
      });
      
      // Note: extractNumbers is private, so we test through validateSyntax
      invalidNumbers.forEach(num => {
        const text = `${num} con 20`;
        const result = validator.validateSyntax(text);
        expect(result.valid).toBe(false);
      });
    });

    test('should detect duplicate numbers', () => {
      const text = '05 05 10 10 con 20';
      const result = validator.validateSyntax(text);
      
      expect(result.valid).toBe(true); // Duplicates are warnings, not errors
      expect(result.warnings[0]).toContain('Números duplicados');
    });

    test('should validate number ranges', () => {
      const validNumbers = ['00', '50', '99'];
      const invalidNumbers = ['-1', '100', '999'];
      
      // These are tested indirectly through the validation process
      invalidNumbers.forEach(num => {
        const text = `${num} con 20`;
        const result = validator.validateSyntax(text);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Pattern Validation', () => {
    test('should detect invalid patterns', () => {
      const invalidPatterns = [
        'abc def ghi', // No recognizable pattern
        '05 10 con 20 extra', // Extra unrecognized text
      ];
      
      invalidPatterns.forEach(text => {
        const result = validator.validateSyntax(text);
        expect(result.warnings[0]).toContain('Posible patrón no reconocido');
      });
    });

    test('should validate parle/candado structure', () => {
      const validParle = '05 10 parle con 5';
      const invalidParle = 'parle con'; // No numbers
      const validCandado = '05 10 candado con 50';
      const invalidCandado = 'candado con'; // No numbers
      
      const result1 = validator.validateSyntax(validParle);
      const result2 = validator.validateSyntax(invalidParle);
      const result3 = validator.validateSyntax(validCandado);
      const result4 = validator.validateSyntax(invalidCandado);
      
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(false);
      expect(result2.errors[0]).toContain('Parle/candado requiere al menos 2 números');
      expect(result3.valid).toBe(true);
      expect(result4.valid).toBe(false);
    });
  });

  describe('Jugada Validation', () => {
    const createTestJugada = (overrides: Partial<Jugada> = {}): Jugada => ({
      jugador: 'Test Player',
      totalCalculado: 100,
      totalDeclarado: null,
      lineas: ['05 10 con 20'],
      detalles: [
        {
          tipo: 'fijo',
          numeros: ['05', '10'],
          monto: 40,
          montoUnitario: 20,
          lineaOriginal: '05 10 con 20',
          lineaNumero: 1
        }
      ],
      isValid: true,
      warnings: [],
      errors: [],
      metadata: {
        timestamp: Date.now(),
        processingTime: 0,
        lineCount: 1,
        numberCount: 2,
        betTypes: new Set(['fijo'])
      },
      ...overrides
    });

    test('should validate valid jugada', () => {
      const jugada = createTestJugada();
      const result = validator.validateJugada(jugada);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing player name', () => {
      const jugada = createTestJugada({ jugador: '' });
      const result = validator.validateJugada(jugada);
      
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.warnings).toContain('Nombre de jugador vacío o no identificado');
    });

    test('should detect negative total when not allowed', () => {
      const jugada = createTestJugada({ totalCalculado: -100 });
      const result = validator.validateJugada(jugada);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Total calculado negativo');
    });

    test('should detect total exceeding max amount', () => {
      const jugada = createTestJugada({ totalCalculado: 2000000 });
      const result = validator.validateJugada(jugada);
      
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.warnings[0]).toContain('excede el máximo permitido');
    });

    test('should validate total consistency', () => {
      // Matching total
      const jugada1 = createTestJugada({ 
        totalCalculado: 100,
        totalDeclarado: 100 
      });
      
      // Mismatched total (small difference)
      const jugada2 = createTestJugada({ 
        totalCalculado: 100,
        totalDeclarado: 100.01 
      });
      
      // Mismatched total (large difference)
      const jugada3 = createTestJugada({ 
        totalCalculado: 100,
        totalDeclarado: 200 
      });
      
      const result1 = validator.validateJugada(jugada1);
      const result2 = validator.validateJugada(jugada2);
      const result3 = validator.validateJugada(jugada3);
      
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true); // Small difference = warning
      expect(result2.warnings).toContain('Diferencia entre total calculado');
      expect(result3.valid).toBe(false); // Large difference = error (if validateTotals is true)
    });

    test('should detect duplicate numbers in jugada', () => {
      const jugada = createTestJugada({
        detalles: [
          {
            tipo: 'fijo',
            numeros: ['05', '05', '10', '10'],
            monto: 80,
            montoUnitario: 20,
            lineaOriginal: '05 05 10 10 con 20',
            lineaNumero: 1
          }
        ]
      });
      
      const result = validator.validateJugada(jugada);
      
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.warnings).toContain('Números duplicados');
    });
  });

  describe('Detalle Validation', () => {
    const createTestDetalle = (overrides: Partial<DetalleApuesta> = {}): DetalleApuesta => ({
      tipo: 'fijo',
      numeros: ['05', '10'],
      monto: 40,
      montoUnitario: 20,
      lineaOriginal: '05 10 con 20',
      lineaNumero: 1,
      ...overrides
    });

    test('should validate valid detalle', () => {
      // This is tested indirectly through validateJugada
      const jugada: Jugada = {
        jugador: 'Test',
        totalCalculado: 40,
        totalDeclarado: null,
        lineas: ['05 10 con 20'],
        detalles: [createTestDetalle()],
        isValid: true,
        warnings: [],
        errors: [],
        metadata: {
          timestamp: Date.now(),
          processingTime: 0,
          lineCount: 1,
          numberCount: 2,
          betTypes: new Set(['fijo'])
        }
      };
      
      const result = validator.validateJugada(jugada);
      expect(result.valid).toBe(true);
    });

    test('should detect invalid detalle type', () => {
      const jugada: Jugada = {
        jugador: 'Test',
        totalCalculado: 40,
        totalDeclarado: null,
        lineas: ['05 10 con 20'],
        detalles: [createTestDetalle({ tipo: 'invalid_type' as any })],
        isValid: true,
        warnings: [],
        errors: [],
        metadata: {
          timestamp: Date.now(),
          processingTime: 0,
          lineCount: 1,
          numberCount: 2,
          betTypes: new Set()
        }
      };
      
      const result = validator.validateJugada(jugada);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Tipo no especificado');
    });

    test('should detect detalle without numbers', () => {
      const jugada: Jugada = {
        jugador: 'Test',
        totalCalculado: 0,
        totalDeclarado: null,
        lineas: ['con 20'],
        detalles: [createTestDetalle({ numeros: [] })],
        isValid: true,
        warnings: [],
        errors: [],
        metadata: {
          timestamp: Date.now(),
          processingTime: 0,
          lineCount: 1,
          numberCount: 0,
          betTypes: new Set(['fijo'])
        }
      };
      
      const result = validator.validateJugada(jugada);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Sin números');
    });

    test('should detect invalid detalle amount', () => {
      const jugada: Jugada = {
        jugador: 'Test',
        totalCalculado: NaN,
        totalDeclarado: null,
        lineas: ['05 10 con 20'],
        detalles: [createTestDetalle({ monto: NaN })],
        isValid: true,
        warnings: [],
        errors: [],
        metadata: {
          timestamp: Date.now(),
          processingTime: 0,
          lineCount: 1,
          numberCount: 2,
          betTypes: new Set(['fijo'])
        }
      };
      
      const result = validator.validateJugada(jugada);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Monto inválido');
    });

    test('should validate parle-specific fields', () => {
      const parleDetalle: DetalleApuesta = {
        tipo: 'parle',
        numeros: ['05', '10'],
        monto: 10,
        montoUnitario: 10,
        combinaciones: 1,
        pares: [['05', '10']],
        lineaOriginal: '05*10 parle con 10',
        lineaNumero: 1
      };
      
      const jugada: Jugada = {
        jugador: 'Test',
        totalCalculado: 10,
        totalDeclarado: null,
        lineas: ['05*10 parle con 10'],
        detalles: [parleDetalle],
        isValid: true,
        warnings: [],
        errors: [],
        metadata: {
          timestamp: Date.now(),
          processingTime: 0,
          lineCount: 1,
          numberCount: 2,
          betTypes: new Set(['parle'])
        }
      };
      
      const result = validator.validateJugada(jugada);
      expect(result.valid).toBe(true);
    });

    test('should detect invalid parle combinations', () => {
      const parleDetalle: DetalleApuesta = {
        tipo: 'parle',
        numeros: ['05', '10'],
        monto: 10,
        montoUnitario: 10,
        combinaciones: 0, // Invalid: 0 combinations
        lineaOriginal: '05*10 parle con 10',
        lineaNumero: 1
      };
      
      const jugada: Jugada = {
        jugador: 'Test',
        totalCalculado: 10,
        totalDeclarado: null,
        lineas: ['05*10 parle con 10'],
        detalles: [parleDetalle],
        isValid: true,
        warnings: [],
        errors: [],
        metadata: {
          timestamp: Date.now(),
          processingTime: 0,
          lineCount: 1,
          numberCount: 2,
          betTypes: new Set(['parle'])
        }
      };
      
      const result = validator.validateJugada(jugada);
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.warnings[0]).toContain('combinaciones inválidas');
    });

    test('should validate centena-specific fields', () => {
      const centenaDetalle: DetalleApuesta = {
        tipo: 'centena',
        numeros: ['325', '175'],
        monto: 20,
        montoUnitario: 10,
        lineaOriginal: '325 175 con 10',
        lineaNumero: 1
      };
      
      const jugada: Jugada = {
        jugador: 'Test',
        totalCalculado: 20,
        totalDeclarado: null,
        lineas: ['325 175 con 10'],
        detalles: [centenaDetalle],
        isValid: true,
        warnings: [],
        errors: [],
        metadata: {
          timestamp: Date.now(),
          processingTime: 0,
          lineCount: 1,
          numberCount: 2,
          betTypes: new Set(['centena'])
        }
      };
      
      const result = validator.validateJugada(jugada);
      expect(result.valid).toBe(true);
    });

    test('should detect invalid centena numbers', () => {
      const centenaDetalle: DetalleApuesta = {
        tipo: 'centena',
        numeros: ['05', '10'], // Invalid: not 3-digit
        monto: 20,
        montoUnitario: 10,
        lineaOriginal: '05 10 con 10',
        lineaNumero: 1
      };
      
      const jugada: Jugada = {
        jugador: 'Test',
        totalCalculado: 20,
        totalDeclarado: null,
        lineas: ['05 10 con 10'],
        detalles: [centenaDetalle],
        isValid: true,
        warnings: [],
        errors: [],
        metadata: {
          timestamp: Date.now(),
          processingTime: 0,
          lineCount: 1,
          numberCount: 2,
          betTypes: new Set(['centena'])
        }
      };
      
      const result = validator.validateJugada(jugada);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Centenas inválidas');
    });
  });

  describe('Global Validation', () => {
    test('should detect too many players', () => {
      let text = '';
      for (let i = 1; i <= 150; i++) {
        text += `Jugador${i}\n05 10 con 20\n\n`;
      }
      
      const result = validator.validateSyntax(text);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Demasiados jugadores');
    });

    test('should detect multiple total lines', () => {
      const text = 'Jugador\n05 10 con 20\nTotal: 40\nTotal: 50';
      const result = validator.validateSyntax(text);
      
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.warnings).toContain('Múltiples líneas de total');
    });

    test('should detect unprocessed lines', () => {
      const text = 'Jugador\n05 10 con 20\nEsta línea no será procesada\nOtra línea inválida';
      const result = validator.validateSyntax(text);
      
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.warnings).toContain('líneas no fueron procesadas');
    });
  });

  describe('Information Extraction', () => {
    test('should extract text info', () => {
      const text = 'Jugador\n05 10 con 20\nTotal: 40';
      const result = validator.validateSyntax(text);
      
      expect(result.info).toBeDefined();
      expect(result.info.hasJugadores).toBe(true);
      expect(result.info.hasTotals).toBe(true);
      expect(result.info.hasNumbers).toBe(true);
      expect(result.info.estimatedLines).toBe(3);
      expect(['simple', 'medium', 'complex']).toContain(result.info.complexity);
    });

    test('should extract line info', () => {
      const line = '05 10 con 20';
      // This is a private method, tested indirectly
      const text = `Jugador\n${line}`;
      const result = validator.validateSyntax(text);
      
      expect(result.valid).toBe(true);
    });
  });
});