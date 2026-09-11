/** Bounded per-resource cache with in-flight deduplication. Failed reads are never cached. */
export class ResourceCache {
  private entries = new Map<string, { value: unknown; expires: number }>();
  private pending = new Map<string, Promise<unknown>>();
  private generation = 0;

  clear() {
    this.generation++;
    this.entries.clear();
    this.pending.clear();
  }

  async get<T>(key: string, load: () => Promise<T>, ttl = 5_000): Promise<T> {
    const cached = this.entries.get(key);
    if (cached && cached.expires > Date.now()) return cached.value as T;
    const pending = this.pending.get(key);
    if (pending) return pending as Promise<T>;
    const generation = this.generation;
    const request = load().then(value => {
      if (generation === this.generation) this.entries.set(key, { value, expires: Date.now() + ttl });
      return value;
    }).finally(() => {
      if (this.pending.get(key) === request) this.pending.delete(key);
    });
    this.pending.set(key, request);
    return request;
  }
}
