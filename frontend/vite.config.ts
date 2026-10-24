import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/**
 * Opens the DNS/TCP/TLS connection to the API origin before the bundle has
 * parsed. The dashboard request is the first cross-origin hop on the Panel, so
 * the handshake would otherwise sit on the critical path.
 */
function apiPreconnect(apiBaseUrl: string | undefined): Plugin {
  return {
    name: 'api-preconnect',
    transformIndexHtml() {
      if (!apiBaseUrl) return []
      let origin: string
      try {
        const url = new URL(apiBaseUrl)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return []
        origin = url.origin
      } catch {
        return []
      }
      return [
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: origin, crossorigin: '' },
          injectTo: 'head',
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      babel({ presets: [reactCompilerPreset()] }),
      apiPreconnect(env.VITE_API_BASE_URL),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
