import { createParser, Parser } from '../../src/parser';
import { ParseResult, Jugada, ParserConfig } from '../../src/types';

describe('Unit Tests - Parser', () => {
  let parser: Parser;

  beforeEach(() => {
    parser = createParser();
  });

  describe('Parser Creation', () => {
    test('should create parser with default config', () => {
      expect(parser).toBeDefined();
      expect(parser).toBeInstanceOf(Parser);
      
      const info = parser.getInfo();
      expect(info.version).toBe('1.0.0');
      expect(info.config.strictMode).toBe(false);
      expect(info.config.autoExpand).toBe(true);
      expect(info.plugins.length).toBeGreaterThan(0);
    });

    test('should create parser with custom config', () => {
      const customConfig: Partial<ParserConfig> = {
        strictMode: true,
        autoExpand: false,
        maxJugadores: 50,
        maxMonto: 5000
      };
      
      const customParser = createParser(customConfig);
      const info = customParser.getInfo();
      
      expect(info.config.strictMode).toBe(true);
      expect(info.config.autoExpand).toBe(false);
      expect(info.config.maxJugadores).toBe(50);
      expect(info.config.maxMonto).toBe(5000);
    });
  });

  describe('Text Parsing', () => {
    test('should parse simple text correctly', () => {
      const text = '05 10 con 20';
      const result = parser.parse(text);
      
      expect(result.success).toBe(true);
      expect(result.jugadas).toHaveLength(1);
      expect(result.summary.totalCalculado).toBe(40);
      expect(result.jugadas[0].detalles).toHaveLength(1);
    });

    test('should handle multiple lines', () => {
      const text = `
        05 10 con 20
        15 20 con 30
        25 30 con 40
      `;
      
      const result = parser.parse(text);
      
      expect(result.success).toBe(true);
      expect(result.jugadas[0].lineas).toHaveLength(3);
      expect(result.summary.totalCalculado).toBe(60 + 90 + 120);
    });

    test('should extract player names', () => {
      const text = `
        Juan Perez
        05 10 con 20
        
        Maria Garcia
        15 20 con 30
      `;
      
      const result = parser.parse(text);
      
      expect(result.success).toBe(true);
      expect(result.jugadas).toHaveLength(2);
      expect(result.jugadas[0].jugador).toBe('Juan Perez');
      expect(result.jugadas[1].jugador).toBe('Maria Garcia');
    });

    test('should handle unknown player', () => {
      const text = '05 10 con 20';
      const result = parser.parse(text);
      
      expect(result.success).toBe(true);
      expect(result.jugadas[0].jugador).toBe('Desconocido');
    });
  });

  describe('Block Extraction', () => {
    test('should extract single block', () => {
      const text = 'Jugador\n05 10 con 20\nTotal: 40';
      const structure = parser.extractStructure(text);
      
      expect(structure).toHaveLength(1);
      expect(structure[0].jugador).toBe('Jugador');
      expect(structure[0].lineCount).toBe(3);
      expect(structure[0].lines).toHaveLength(3);
    });

    test('should extract multiple blocks', () => {
      const text = `
        Juan
        05 con 10
        
        Maria
        10 con 20
        
        Pedro
        15 con 30
      `;
      
      const structure = parser.extractStructure(text);
      
      expect(structure).toHaveLength(3);
      expect(structure[0].jugador).toBe('Juan');
      expect(structure[1].jugador).toBe('Maria');
      expect(structure[2].jugador).toBe('Pedro');
    });

    test('should handle empty blocks', () => {
      const text = '\n\n\n';
      const structure = parser.extractStructure(text);
      
      expect(structure).toHaveLength(0);
    });
  });

  describe('Total Extraction', () => {
    test('should extract declared total', () => {
      const text = 'Jugador\n05 10 con 20\nTotal: 500';
      
      const result = parser.parse(text);
      
      expect(result.success).toBe(true);
      expect(result.jugadas[0].totalDeclarado).toBe(500);
      expect(result.summary.totalDeclarado).toBe(500);
    });

    test('should handle multiple total formats', () => {
      const formats = [
        'Total: 100',
        'Total 100',
        'Total: $100',
        'Total = 100',
        'total 100',
      ];
      
      formats.forEach(format => {
        const text = `Jugador\n05 con 10\n${format}`;
        const result = parser.parse(text);
        
        expect(result.success).toBe(true);
        expect(result.jugadas[0].totalDeclarado).toBe(100);
      });
    });

    test('should handle no declared total', () => {
      const text = 'Jugador\n05 10 con 20';
      const result = parser.parse(text);
      
      expect(result.success).toBe(true);
      expect(result.jugadas[0].totalDeclarado).toBeNull();
      expect(result.summary.totalDeclarado).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should return error for empty text', () => {
      const result = parser.parse('');
      
      expect(result.success).toBe(false);
      expect(result.metadata.errors).toContain('Texto vacío');
      expect(result.jugadas).toHaveLength(0);
    });

    test('should handle max players limit', () => {
      const customParser = createParser({ maxJugadores: 2 });
      
      const text = `
        Jugador1
        05 con 10
        
        Jugador2
        10 con 20
        
        Jugador3
        15 con 30
      `;
      
      const result = customParser.parse(text);
      
      expect(result.success).toBe(false);
      expect(result.metadata.errors[0]).toContain('Número máximo de jugadores excedido');
    });

    test('should handle parse errors gracefully', () => {
      const text = 'Invalid\nabc def ghi';
      const result = parser.parse(text);
      
      expect(result.success).toBe(false);
      expect(result.metadata.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    test('should validate text syntax', () => {
      const validText = '05 10 con 20';
      const invalidText = 'abc def ghi';
      
      const validResult = parser.validate(validText);
      const invalidResult = parser.validate(invalidText);
      
      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    test('should provide suggestions for invalid text', () => {
      const text = '05 10';
      const result = parser.validate(text);
      
      expect(result.valid).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]).toContain('con');
    });
  });

  describe('Metadata and Statistics', () => {
    test('should include parse time metadata', () => {
      const text = '05 10 con 20';
      const result = parser.parse(text);
      
      expect(result.metadata.parseTime).toBeGreaterThan(0);
      expect(result.metadata.originalLength).toBe(text.length);
      expect(result.metadata.processedLength).toBeGreaterThan(0);
    });

    test('should include statistics', () => {
      const text = '05 10 con 20';
      const result = parser.parse(text);
      
      expect(result.stats).toBeDefined();
      expect(result.stats.fijos).toBeGreaterThan(0);
      expect(result.stats.totalApuestas).toBe(1);
      expect(result.stats.totalNumeros).toBe(2);
    });

    test('should calculate confidence score', () => {
      const perfectText = '05 10 con 20\nTotal: 40';
      const mismatchText = '05 10 con 20\nTotal: 100';
      
      const perfectResult = parser.parse(perfectText);
      const mismatchResult = parser.parse(mismatchText);
      
      expect(perfectResult.summary.confidence).toBeGreaterThan(0.9);
      expect(mismatchResult.summary.confidence).toBeLessThan(perfectResult.summary.confidence);
    });
  });

  describe('Cache Integration', () => {
    test('should use cache when enabled', () => {
      const cachedParser = createParser({
        cache: { enabled: true, ttl: 60000, maxSize: 100 }
      });
      
      const text = '05 10 con 20';
      
      // First call
      const result1 = cachedParser.parse(text);
      expect(result1.metadata.cacheStats?.misses).toBe(1);
      
      // Second call (should hit cache)
      const result2 = cachedParser.parse(text);
      expect(result2.metadata.cacheStats?.hits).toBe(1);
    });

    test('should not use cache when disabled', () => {
      const nonCachedParser = createParser({
        cache: { enabled: false, ttl: 60000, maxSize: 100 }
      });
      
      const text = '05 10 con 20';
      
      const result1 = nonCachedParser.parse(text);
      const result2 = nonCachedParser.parse(text);
      
      expect(result1.metadata.cacheStats).toBeUndefined();
      expect(result2.metadata.cacheStats).toBeUndefined();
    });
  });

  describe('Plugin System Integration', () => {
    test('should register plugins', () => {
      const info = parser.getInfo();
      
      expect(info.plugins.length).toBeGreaterThan(0);
      expect(info.plugins).toContain('basic-bet-plugin');
      expect(info.plugins).toContain('auto-correct-plugin');
    });

    test('should allow custom plugin registration', () => {
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        priority: 100,
        canProcess: jest.fn().mockReturnValue(true),
        process: jest.fn().mockReturnValue({
          jugador: 'Test',
          totalCalculado: 100,
          totalDeclarado: null,
          lineas: [],
          detalles: [],
          isValid: true,
          warnings: [],
          errors: [],
          metadata: {
            timestamp: Date.now(),
            processingTime: 0,
            lineCount: 0,
            numberCount: 0,
            betTypes: new Set()
          }
        }),
        validate: jest.fn().mockReturnValue({
          valid: true,
          errors: [],
          warnings: [],
          suggestions: []
        })
      };
      
      parser.registerPlugin(mockPlugin);
      
      const info = parser.getInfo();
      expect(info.plugins).toContain('test-plugin');
      
      const result = parser.parse('test');
      expect(mockPlugin.canProcess).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup parser resources', async () => {
      const parser = createParser({
        cache: { enabled: true, ttl: 60000, maxSize: 100 }
      });
      
      await expect(parser.cleanup()).resolves.not.toThrow();
      
      // Parser should still be usable after cleanup
      const result = parser.parse('05 10 con 20');
      expect(result.success).toBe(true);
    });
  });
});