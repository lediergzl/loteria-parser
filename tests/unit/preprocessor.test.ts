import { Preprocessor } from '../../src/preprocessor';
import { ParserConfig } from '../../src/types';

describe('Unit Tests - Preprocessor', () => {
  let preprocessor: Preprocessor;
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
    
    preprocessor = new Preprocessor(config);
  });

  describe('Text Processing', () => {
    test('should normalize line endings', () => {
      const text = 'Line 1\r\nLine 2\rLine 3\n';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('Line 1\nLine 2\nLine 3');
    });

    test('should normalize spaces', () => {
      const text = '  05   10   con   20  ';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('05 10 con 20');
    });

    test('should normalize tabs', () => {
      const text = '05\t10\tcon\t20';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('05 10 con 20');
    });

    test('should remove multiple empty lines', () => {
      const text = 'Line 1\n\n\nLine 2\n\n\n\nLine 3';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('Line 1\n\nLine 2\n\nLine 3');
    });
  });

  describe('Character Normalization', () => {
    test('should normalize zero characters', () => {
      const testCases = [
        { input: 'o5', expected: '05' },
        { input: 'O5', expected: '05' },
        { input: 'ø5', expected: '05' },
        { input: '0oOø5', expected: '0005' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const processed = preprocessor.process(input);
        expect(processed).toBe(expected);
      });
    });

    test('should normalize one characters', () => {
      const testCases = [
        { input: 'l5', expected: '15' },
        { input: 'I5', expected: '15' },
        { input: '|5', expected: '15' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const processed = preprocessor.process(input);
        expect(processed).toBe(expected);
      });
    });

    test('should normalize multiplication operator', () => {
      const text = '25×33 parle con 5';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('25x33 parle con 5');
    });
  });

  describe('Amount Normalization', () => {
    test('should normalize decimal commas', () => {
      const text = '05 10 con 20,50';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('05 10 con 20.50');
    });

    test('should handle custom decimal separator', () => {
      const customConfig = { ...config, decimalSeparator: ',' };
      const customPreprocessor = new Preprocessor(customConfig);
      
      const text = '05 10 con 20.50';
      const processed = customPreprocessor.process(text);
      
      expect(processed).toBe('05 10 con 20,50');
    });

    test('should normalize "con" spacing', () => {
      const text = '05 10con20';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('05 10 con 20');
    });

    test('should normalize "y" spacing', () => {
      const text = '05 10 con 20y30';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('05 10 con 20 y 30');
    });

    test('should remove currency symbols', () => {
      const text = '05 10 con $20 y €30';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('05 10 con 20 y 30');
    });

    test('should normalize "pesos" text', () => {
      const text = '05 10 con 20 pesos';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('05 10 con 20');
    });
  });

  describe('Pattern Expansion', () => {
    test('should expand volteos when autoExpand is true', () => {
      const text = '10v con 20';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('10 01 con 20');
    });

    test('should not expand patterns when autoExpand is false', () => {
      const noExpandConfig = { ...config, autoExpand: false };
      const noExpandPreprocessor = new Preprocessor(noExpandConfig);
      
      const text = '10v con 20';
      const processed = noExpandPreprocessor.process(text);
      
      expect(processed).toBe('10v con 20');
    });

    test('should expand ranges', () => {
      const text = '05 al 10 con 20';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('05 06 07 08 09 10 con 20');
    });

    test('should expand decenas', () => {
      const text = 'd0 con 5';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('00 10 20 30 40 50 60 70 80 90 con 5');
    });

    test('should expand terminales', () => {
      const text = 't5 con 3';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('05 15 25 35 45 55 65 75 85 95 con 3');
    });

    test('should expand pares relativos', () => {
      const text = '10 pr 5 con 2';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('1001 1002 1003 1004 1005 con 2');
    });

    test('should expand "todas las centenas"', () => {
      const text = '05 10 por todas las centenas con 5';
      const processed = preprocessor.process(text);
      
      expect(processed).toContain('005');
      expect(processed).toContain('105');
      expect(processed).toContain('010');
      expect(processed).toContain('110');
      expect(processed).toContain('con 5');
    });
  });

  describe('Number Extraction', () => {
    test('should extract 2-digit numbers', () => {
      const text = '05 10 15 20';
      const numbers = preprocessor.extractNumbers(text);
      
      expect(numbers).toEqual(['05', '10', '15', '20']);
    });

    test('should extract 3-digit numbers (centenas)', () => {
      const text = '325 175 359';
      const numbers = preprocessor.extractNumbers(text);
      
      expect(numbers).toEqual(['325', '175', '359']);
    });

    test('should split 4-digit numbers into pairs', () => {
      const text = '1001 2503';
      const numbers = preprocessor.extractNumbers(text);
      
      expect(numbers).toEqual(['10', '01', '25', '03']);
    });

    test('should handle mixed number lengths', () => {
      const text = '05 325 1001 20';
      const numbers = preprocessor.extractNumbers(text);
      
      expect(numbers).toEqual(['05', '325', '10', '01', '20']);
    });

    test('should ignore non-numeric text', () => {
      const text = 'abc 05 def 10 ghi';
      const numbers = preprocessor.extractNumbers(text);
      
      expect(numbers).toEqual(['05', '10']);
    });
  });

  describe('Amount Extraction', () => {
    test('should extract amounts after "con"', () => {
      const text = '05 10 con 20 y 30';
      const amounts = preprocessor.extractAmounts(text);
      
      expect(amounts).toEqual([20, 30]);
    });

    test('should extract decimal amounts', () => {
      const text = '05 10 con 20.50 y 30.75';
      const amounts = preprocessor.extractAmounts(text);
      
      expect(amounts).toEqual([20.5, 30.75]);
    });

    test('should extract comma decimal amounts', () => {
      const text = '05 10 con 20,50 y 30,75';
      const amounts = preprocessor.extractAmounts(text);
      
      expect(amounts).toEqual([20.5, 30.75]);
    });

    test('should extract standalone amounts', () => {
      const text = 'The amounts are 20, 30, and 40.50';
      const amounts = preprocessor.extractAmounts(text);
      
      expect(amounts).toEqual([20, 30, 40.5]);
    });

    test('should handle multiple occurrences', () => {
      const text = 'con 20 y con 30';
      const amounts = preprocessor.extractAmounts(text);
      
      expect(amounts).toEqual([20, 30]);
    });
  });

  describe('Line Processing', () => {
    test('should split lines correctly', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const lines = preprocessor.splitLines(text);
      
      expect(lines).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    test('should filter empty lines', () => {
      const text = 'Line 1\n\nLine 2\n \nLine 3';
      const lines = preprocessor.splitLines(text);
      
      expect(lines).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    test('should preprocess individual line', () => {
      const line = '  05   10   con   20  ';
      const processed = preprocessor.preprocessLine(line);
      
      expect(processed).toBe('05 10 con 20');
    });
  });

  describe('Pattern Detection', () => {
    test('should detect volteo pattern', () => {
      const line = '10v con 20';
      const needsExpansion = preprocessor.needsExpansion(line);
      
      expect(needsExpansion).toBe(true);
    });

    test('should detect range pattern', () => {
      const line = '05 al 10 con 20';
      const needsExpansion = preprocessor.needsExpansion(line);
      
      expect(needsExpansion).toBe(true);
    });

    test('should detect no expansion needed', () => {
      const line = '05 10 con 20';
      const needsExpansion = preprocessor.needsExpansion(line);
      
      expect(needsExpansion).toBe(false);
    });

    test('should detect multiple patterns', () => {
      const line = '10v y d0 con 20';
      const needsExpansion = preprocessor.needsExpansion(line);
      
      expect(needsExpansion).toBe(true);
    });
  });

  describe('Cleanup', () => {
    test('should remove unwanted characters', () => {
      const text = '05@10#con$20%';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('05 10 con 20');
    });

    test('should preserve allowed special characters', () => {
      const text = '05*33 parle con 5';
      const processed = preprocessor.process(text);
      
      expect(processed).toBe('05*33 parle con 5');
    });

    test('should handle accented characters in names', () => {
      const text = 'José Pérez\n05 10 con 20';
      const processed = preprocessor.process(text);
      
      expect(processed).toContain('José Pérez');
      expect(processed).toContain('05 10 con 20');
    });
  });
});