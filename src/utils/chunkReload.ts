// Después de cada deploy, Cloudflare Pages reemplaza los archivos JS con nuevos nombres
// (hash de contenido) y borra los del build anterior. A veces, además, el deploy nuevo
// tarda unos segundos en terminar de propagarse a todos los edges de Cloudflare — si el
// navegador pide un chunk justo en esa ventana, ni recargando fuerte alcanza porque el
// archivo todavía no está listo en el servidor, no es un tema de caché local. Por eso se
// reintenta más de una vez, con espera creciente, para darle tiempo al deploy a terminar
// de propagarse antes de rendirse y mostrar la pantalla de error.
const RELOAD_COUNT_KEY = 'vendex_chunk_reload_count'
const MAX_RELOAD_ATTEMPTS = 3
const BASE_DELAY_MS = 1500

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(message)
}

export function reloadOnceForChunkError(): void {
  const attempt = Number(sessionStorage.getItem(RELOAD_COUNT_KEY) || 0)
  if (attempt >= MAX_RELOAD_ATTEMPTS) return
  sessionStorage.setItem(RELOAD_COUNT_KEY, String(attempt + 1))
  // Espera creciente (1.5s, 3s, 4.5s) — le da más margen al deploy para terminar de
  // propagarse en los intentos siguientes, en vez de volver a fallar de inmediato.
  setTimeout(() => window.location.reload(), BASE_DELAY_MS * (attempt + 1))
}

// Se llama una vez que la app arrancó bien — si sigue viva pasado un rato, el problema
// (si lo hubo) ya se resolvió, así que se limpia el contador para no arrancar "gastado"
// el margen de reintentos ante un error nuevo y no relacionado más adelante en la sesión.
export function clearChunkReloadCounterAfterStableLoad(): void {
  setTimeout(() => sessionStorage.removeItem(RELOAD_COUNT_KEY), 8000)
}
