export { BasePlugin } from './base-plugin';
export { 
  BasicBetPlugin,
  ParlePlugin,
  CentenaPlugin,
  CandadoPlugin,
  SpecialPatternsPlugin,
  AutoCorrectPlugin
} from './default-plugins';

import { ProcessorPlugin } from '../types';

/**
 * Registro central de plugins disponibles
 */
export class PluginRegistry {
  private static instance: PluginRegistry;
  private plugins: Map<string, ProcessorPlugin> = new Map();
  
  private constructor() {
    this.registerDefaultPlugins();
  }
  
  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }
  
  /**
   * Registra un plugin en el registro
   */
  register(plugin: ProcessorPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }
  
  /**
   * Obtiene un plugin por nombre
   */
  get(name: string): ProcessorPlugin | undefined {
    return this.plugins.get(name);
  }
  
  /**
   * Obtiene todos los plugins registrados
   */
  getAll(): ProcessorPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Obtiene plugins ordenados por prioridad (descendente)
   */
  getAllByPriority(): ProcessorPlugin[] {
    return this.getAll().sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Elimina un plugin del registro
   */
  remove(name: string): boolean {
    return this.plugins.delete(name);
  }
  
  /**
   * Limpia todos los plugins del registro
   */
  clear(): void {
    this.plugins.clear();
  }
  
  /**
   * Verifica si un plugin está registrado
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }
  
  /**
   * Obtiene nombres de todos los plugins registrados
   */
  getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }
  
  /**
   * Crea instancias de todos los plugins por defecto
   */
  private registerDefaultPlugins(): void {
    // Importar dinámicamente para evitar dependencias circulares
    const plugins = [
      new (require('./default-plugins').AutoCorrectPlugin)(),
      new (require('./default-plugins').SpecialPatternsPlugin)(),
      new (require('./default-plugins').CandadoPlugin)(),
      new (require('./default-plugins').CentenaPlugin)(),
      new (require('./default-plugins').ParlePlugin)(),
      new (require('./default-plugins').BasicBetPlugin)()
    ];
    
    plugins.forEach(plugin => this.register(plugin));
  }
}

/**
 * Factory para crear plugins
 */
export class PluginFactory {
  /**
   * Crea un plugin por nombre
   */
  static create(name: string, config?: any): ProcessorPlugin | null {
    const registry = PluginRegistry.getInstance();
    const plugin = registry.get(name);
    
    if (!plugin) {
      return null;
    }
    
    // Clonar el plugin (si es necesario)
    const clonedPlugin = Object.create(Object.getPrototypeOf(plugin));
    Object.assign(clonedPlugin, plugin);
    
    if (config && clonedPlugin.init) {
      clonedPlugin.init(config);
    }
    
    return clonedPlugin;
  }
  
  /**
   * Crea todos los plugins por defecto
   */
  static createDefaultPlugins(config?: any): ProcessorPlugin[] {
    const registry = PluginRegistry.getInstance();
    return registry.getAllByPriority().map(plugin => {
      const cloned = PluginFactory.create(plugin.name, config);
      return cloned || plugin;
    });
  }
}

/**
 * Decorador para registrar plugins automáticamente
 */
export function RegisterPlugin(pluginClass: new () => ProcessorPlugin): ClassDecorator {
  return function (constructor: Function) {
    const plugin = new pluginClass();
    const registry = PluginRegistry.getInstance();
    registry.register(plugin);
  };
}

/**
 * Interfaz para crear plugins personalizados fácilmente
 */
export interface PluginCreator {
  (config?: any): ProcessorPlugin;
}

/**
 * Utilidad para crear plugins rápidamente
 */
export function createPlugin(
  name: string,
  version: string,
  priority: number,
  canProcess: (text: string) => boolean,
  process: (text: string, context: any) => any,
  validate?: (jugada: any) => any
): ProcessorPlugin {
  return {
    name,
    version,
    priority,
    canProcess,
    process,
    validate: validate || (() => ({
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    })),
    init: function(config: any) {
      // Inicialización opcional
    },
    cleanup: function() {
      // Limpieza opcional
    }
  };
}

// Exportar tipos
export type { ProcessorPlugin } from '../types';

// Exportar instancia del registro para fácil acceso
export const pluginRegistry = PluginRegistry.getInstance();

// Exportar factory para fácil creación
export const pluginFactory = PluginFactory;