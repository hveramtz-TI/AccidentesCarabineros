interface Props {
  status: "loading" | "success" | "error"
  error: string | null
  emptyScope: boolean
  onRetry: () => void
}

export default function DashboardStatus({ status, error, emptyScope, onRetry }: Props) {
  if (status === "error") {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        <span>
          {error
            ? "No se pudieron cargar los datos del panel. Inténtalo nuevamente."
            : "Ocurrió un error al cargar los datos del panel."}
        </span>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-current px-3 py-1 font-mono text-xs hover:bg-destructive/10"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (emptyScope) {
    return (
      <div
        role="status"
        className="rounded-lg border border-[rgba(255,178,36,0.25)] bg-[rgba(255,178,36,0.08)] px-4 py-3 text-sm text-accent-foreground"
      >
        No hay siniestros en el territorio seleccionado para este período.
        Elige otra comuna o región, o vuelve a «Todas las regiones».
      </div>
    )
  }

  return null
}
