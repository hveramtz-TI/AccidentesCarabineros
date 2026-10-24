import ChartSkeleton from "./chart-skeleton"

/**
 * Loading placeholder for the whole analytic block. It mirrors the real grid,
 * titles, and body heights so nothing shifts when the deferred chart chunk and
 * the dashboard payload arrive.
 */
export default function ChartsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <div className="min-w-0 lg:col-span-4">
          <ChartSkeleton
            title="Tendencia mensual"
            description="Cargando datos del período seleccionado"
            bodyClass="h-64 w-full"
          />
        </div>
        <div className="min-w-0 lg:col-span-3">
          <ChartSkeleton
            title="Distribución por gravedad"
            description="Cargando datos del período seleccionado"
            bodyClass="h-64 w-full"
          />
        </div>
      </div>

      <div className="space-y-4 border-t border-border/70 pt-5">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Ranking territorial
        </h3>
        <ChartSkeleton
          title="Territorios con más siniestros"
          description="Cargando datos territoriales"
          bodyClass="h-80 w-full"
        />
      </div>
    </>
  )
}
