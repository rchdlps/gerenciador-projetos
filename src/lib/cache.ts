/**
 * Generic in-memory TTL cache.
 * Used for data that changes infrequently (organizations, settings).
 */
export function createTTLCache<V>(ttlMs: number, maxEntries = 100) {
    const cache = new Map<string, { value: V; expiresAt: number }>()

    function cleanup() {
        if (cache.size <= maxEntries) return
        const now = Date.now()
        for (const [key, entry] of cache) {
            if (entry.expiresAt < now) cache.delete(key)
        }
        if (cache.size > maxEntries) {
            const entries = [...cache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)
            for (const [key] of entries.slice(0, entries.length - maxEntries)) {
                cache.delete(key)
            }
        }
    }

    return {
        get(key: string): V | undefined {
            const entry = cache.get(key)
            if (!entry || entry.expiresAt < Date.now()) {
                if (entry) cache.delete(key)
                return undefined
            }
            return entry.value
        },
        set(key: string, value: V) {
            cache.set(key, { value, expiresAt: Date.now() + ttlMs })
            cleanup()
        },
        invalidate(key?: string) {
            if (key) cache.delete(key)
            else cache.clear()
        },
    }
}
