/**
 * Shared lazy-route fallback (EXP-00 T4, EXP-02 T4).
 *
 * One skeleton for every lazy page: the shell never collapses while a chunk
 * loads, and the placeholder announces itself instead of rendering silently.
 */

export default function RouteFallback() {
  return (
    <div className="flex w-full flex-col gap-4 p-4 md:p-10">
      <div role="status" aria-label="Cargando página" className="min-w-0">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-[60dvh] w-full animate-pulse rounded bg-muted lg:h-96" />
      </div>
    </div>
  )
}
