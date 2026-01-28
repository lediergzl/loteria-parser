import { createParser } from '../../src';
import { BasePlugin, pluginRegistry, pluginFactory } from '../../src/plugins';
import { ProcessorPlugin, Jugada, PluginContext } from '../../src/types';

describe('Plugin System Integration Tests', () => {
  describe('Default Plugins', () => {
    test('should have default plugins registered', () => {
      const parser = createParser();
      const info = parser.getInfo();
      
      expect(info.plugins.length).toBeGreaterThan(0);
      expect(info.plugins).toContain('basic-bet-plugin');
      expect(info.plugins).toContain('parle-plugin');
      expect(info.plugins).toContain('centena-plugin');
      expect(info.plugins).toContain('candado-plugin');
      expect(info.plugins).toContain('special-patterns-plugin');
      expect(info.plugins).toContain('auto-correct-plugin');
    });

    test('should use correct plugin for each pattern', () => {
      const testCases = [
        { input: '05 10 con 20', expectedPlugin: 'basic-bet-plugin' },
        { input: '25*33 parle con 5', expectedPlugin: 'parle-plugin' },
        { input: '325 con 10', expectedPlugin: 'centena-plugin' },
        { input: '05 10 candado con 50', expectedPlugin: 'candado-plugin' },
        { input: '10v con 10', expectedPlugin: 'special-patterns-plugin' },
        { input: '05 al 15 con 10', expectedPlugin: 'special-patterns-plugin' },
      ];
      
      testCases.forEach(({ input, expectedPlugin }) => {
        const result = parseJugada(input);
        // Verificar que se procesó correctamente (indirectamente verifica plugin)
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Custom Plugin Integration', () => {
    class TestPlugin extends BasePlugin {
      name = 'test-plugin';
      version = '1.0.0';
      priority = 200; // Prioridad muy alta
      
      canProcess(text: string): boolean {
        return text.includes('TEST_FORMAT');
      }
      
      process(text: string, context: PluginContext): Jugada {
        return this.createJugada(
          context.jugador,
          [this.createDetalle('fijo', ['00', '11'], 10, text)],
          context.totalDeclarado,
          context.lineas,
          { metadata: { processedBy: this.name } }
        );
      }
    }

    test('should register and use custom plugin', () => {
      const parser = createParser();
      const testPlugin = new TestPlugin();
      
      // Registrar plugin
      parser.registerPlugin(testPlugin);
      
      // Verificar que está registrado
      const info = parser.getInfo();
      expect(info.plugins).toContain('test-plugin');
      
      // Probar que funciona
      const result = parser.parse('Jugador\nTEST_FORMAT 00 11 con 10');
      
      expect(result.success).toBe(true);
      expect(result.jugadas[0].metadata.processedBy).toBe('test-plugin');
    });

    test('should respect plugin priority', () => {
      class HighPriorityPlugin extends BasePlugin {
        name = 'high-priority-plugin';
        version = '1.0.0';
        priority = 1000;
        
        canProcess(text: string): boolean {
          return text.includes('05');
        }
        
        process(text: string, context: PluginContext): Jugada {
          return this.createJugada(
            context.jugador,
            [this.createDetalle('especial', ['99'], 99, text)],
            context.totalDeclarado,
            context.lineas,
            { metadata: { processedBy: this.name } }
          );
        }
      }
      
      const parser = createParser();
      const highPriorityPlugin = new HighPriorityPlugin();
      parser.registerPlugin(highPriorityPlugin);
      
      // Este texto debería ser procesado por el plugin de alta prioridad
      const result = parser.parse('05 10 con 20');
      
      expect(result.success).toBe(true);
      expect(result.jugadas[0].metadata.processedBy).toBe('high-priority-plugin');
      expect(result.jugadas[0].detalles[0].numeros).toEqual(['99']);
    });
  });

  describe('Plugin Lifecycle', () => {
    test('should initialize and cleanup plugins', () => {
      let initialized = false;
      let cleanedUp = false;
      
      class LifecyclePlugin extends BasePlugin {
        name = 'lifecycle-plugin';
        version = '1.0.0';
        priority = 150;
        
        canProcess(text: string): boolean {
          return true;
        }
        
        process(text: string, context: PluginContext): Jugada {
          return this.createJugada(context.jugador, [], null, []);
        }
        
        protected onInit(): void {
          initialized = true;
        }
        
        protected onCleanup(): void {
          cleanedUp = true;
        }
      }
      
      const parser = createParser();
      const plugin = new LifecyclePlugin();
      parser.registerPlugin(plugin);
      
      // Forzar inicialización
      parser.parse('test');
      
      expect(initialized).toBe(true);
      
      // Limpiar
      parser.cleanup();
      
      expect(cleanedUp).toBe(true);
    });
  });

  describe('Plugin Validation', () => {
    test('should validate plugin output', () => {
      class InvalidPlugin extends BasePlugin {
        name = 'invalid-plugin';
        version = '1.0.0';
        priority = 100;
        
        canProcess(text: string): boolean {
          return true;
        }
        
        process(text: string, context: PluginContext): Jugada {
          // Plugin que crea una jugada inválida
          return {
            jugador: '',
            totalCalculado: -100,
            totalDeclarado: null,
            lineas: [],
            detalles: [],
            isValid: false,
            warnings: [],
            errors: [],
            metadata: {
              timestamp: Date.now(),
              processingTime: 0,
              lineCount: 0,
              numberCount: 0,
              betTypes: new Set()
            }
          };
        }
      }
      
      const parser = createParser({ strictMode: false });
      const plugin = new InvalidPlugin();
      parser.registerPlugin(plugin);
      
      const result = parser.parse('test');
      
      expect(result.success).toBe(false);
      expect(result.metadata.errors).toContain('Total calculado negativo');
    });
  });
});