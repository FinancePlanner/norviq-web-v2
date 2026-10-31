// Port of norviq-web handlers/public_page_cache.go.
//
// Go cached the finished HTML per key; SvelteKit renders per request, so this
// caches what the render is built from (the view model). The semantics the
// Go cache existed for carry over unchanged:
//
//   - single-flight: concurrent misses for one key share one fan-out, so a
//     crawler opening parallel connections on a cold key costs one render;
//   - a successful result is served for `ttl`;
//   - failures are never cached (a backend blip must not blackhole a key for
//     the whole TTL), and only the failing entry itself is dropped.
//
// One cache per Worker isolate (module scope), as Go had one per process.

interface Entry<T> {
	promise: Promise<T>;
	settled: boolean;
	ok: boolean;
	expiresAt: number;
}

export class PublicPageCache<T> {
	#entries = new Map<string, Entry<T>>();

	constructor(
		private readonly ttlMs: number,
		private readonly max = 0,
		private readonly now: () => number = Date.now
	) {}

	do(key: string, render: () => Promise<T>): Promise<T> {
		const existing = this.#entries.get(key);
		if (existing) {
			// Still rendering: wait for that one instead of starting another.
			if (!existing.settled) return existing.promise;
			if (existing.ok && this.now() < existing.expiresAt) return existing.promise;
		}
		if (!existing && this.max > 0 && this.#entries.size >= this.max) this.#evict();

		const entry: Entry<T> = {
			promise: undefined as unknown as Promise<T>,
			settled: false,
			ok: false,
			expiresAt: 0
		};
		entry.promise = (async () => {
			try {
				const value = await render();
				entry.ok = true;
				entry.expiresAt = this.now() + this.ttlMs;
				return value;
			} catch (err) {
				// Only drop our own entry; a later miss may already have replaced it.
				if (this.#entries.get(key) === entry) this.#entries.delete(key);
				throw err;
			} finally {
				entry.settled = true;
			}
		})();
		this.#entries.set(key, entry);
		return entry.promise;
	}

	forget(...keys: string[]) {
		for (const key of keys) this.#entries.delete(key);
	}

	/** Expired entries go; if that frees nothing, one finished entry does. */
	#evict() {
		const now = this.now();
		let victim = '';
		for (const [key, entry] of this.#entries) {
			if (!entry.settled) continue;
			if (now >= entry.expiresAt) {
				this.#entries.delete(key);
				continue;
			}
			if (!victim) victim = key;
		}
		if (this.#entries.size >= this.max && victim) this.#entries.delete(victim);
	}
}
