import { CacheEntry } from '../types';

export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    size: 0,
    evictions: 0
  };

  constructor(private config: { enabled: boolean; ttl: number; maxSize: number }) {}

  async initialize(): Promise<void> {
    // Inicializar caché si es necesario
    this.cleanupExpired();
  }

  get(key: string): any | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Verificar expiración
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size--;
      return null;
    }

    this.stats.hits++;
    entry.hits++;
    
    return entry.value;
  }

  set(key: string, value: any, ttl?: number): void {
    if (!this.config.enabled) return;

    // Limpiar expirados primero
    this.cleanupExpired();

    // Verificar tamaño máximo
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastUsed();
    }

    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl || this.config.ttl,
      hits: 0
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.evictions = 0;
  }

  async cleanup(): Promise<void> {
    this.cleanupExpired();
  }

  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
        : 0,
      currentSize: this.cache.size,
      maxSize: this.config.maxSize
    };
  }

  private cleanupExpired(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        this.stats.size--;
      }
    }
  }

  private evictLeastUsed(): void {
    // Encontrar la entrada menos usada
    let leastUsedKey: string | null = null;
    let leastHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < leastHits) {
        leastHits = entry.hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      this.stats.evictions++;
      this.stats.size--;
    }
  }
}