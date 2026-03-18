/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within `ms`,
 * it rejects with a TimeoutError so the app doesn't hang indefinitely.
 */
export class TimeoutError extends Error {
    constructor(ms: number, label?: string) {
        super(`${label || 'Operation'} timed out after ${ms}ms`)
        this.name = 'TimeoutError'
    }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label?: string): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>
    const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new TimeoutError(ms, label)), ms)
    })

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}
