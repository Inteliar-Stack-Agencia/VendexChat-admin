// Después de cada deploy, Cloudflare Pages reemplaza los archivos JS con nuevos nombres
// (hash de contenido) y borra los del build anterior. Si el navegador todavía tiene
// cargado el index.html viejo (o una pestaña abierta de antes del deploy) e intenta
// importar dinámicamente un chunk de ruta (ej. al navegar a Clientes), ese archivo ya no
// existe y falla con "Failed to fetch dynamically imported module". La solución es
// recargar la página para traer el index.html actualizado, que apunta a los hashes
// correctos — pero solo UNA vez, para no quedar en loop si el problema es otro.
const RELOAD_KEY = 'vendex_chunk_reload_at'
const RELOAD_COOLDOWN_MS = 10000

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(message)
}

export function reloadOnceForChunkError(): void {
  const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
  if (Date.now() - lastReload > RELOAD_COOLDOWN_MS) {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    window.location.reload()
  }
}
