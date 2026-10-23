/**
 * 404 route (EXP-00 T1/T4).
 *
 * Unknown client paths land here instead of blanking the shell, and the page
 * sends the user back to a route that actually renders data.
 */

import { Link } from "react-router"

import { pageTitle, usePageEffects } from "@/hooks/use-page-effects"

export default function NotFoundPage() {
  usePageEffects(pageTitle("Página no encontrada"))

  return (
    <div className="flex w-full flex-col gap-4 p-4 md:p-10">
      <section aria-labelledby="not-found-title" className="min-w-0">
        <h1
          id="not-found-title"
          data-page-heading
          tabIndex={-1}
          className="mb-3 font-heading text-lg font-semibold text-foreground outline-none"
        >
          Página no encontrada
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          La dirección que abriste no corresponde a ninguna sección del panel.
          Volvé al inicio para ver el mapa y los indicadores de siniestros viales
          de Chile 2025.
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Volver al panel
        </Link>
      </section>
    </div>
  )
}
