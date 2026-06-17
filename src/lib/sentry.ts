import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

export function initSentry() {
  if (!DSN) return

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    // Solo enviar errores en producción; en dev solo loguear
    enabled: import.meta.env.PROD,
    tracesSampleRate: 0.2,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    integrations: [
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: false }),
    ],
  })
}

export { Sentry }
