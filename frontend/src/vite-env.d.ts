/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public API origin, e.g. http://localhost:8080 */
  readonly VITE_API_BASE_URL?: string
  /** Lightweight Bearer barrier value — intentionally public (accepted limitation). */
  readonly VITE_UUID_CONNECTION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
