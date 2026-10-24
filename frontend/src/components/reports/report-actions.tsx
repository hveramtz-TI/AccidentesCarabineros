/**
 * Report action controls (EXP-06 T4/T5): "Descargar CSV", "Imprimir", and the
 * Spanish download feedback. Both buttons are screen-only (`print:hidden`),
 * and the failure copy never echoes raw API errors or the request token —
 * only the classified reason.
 */

import type { TerritoryCsvFailureReason } from "@/lib/reports/csv-download"
import type { ReportsDownloadState } from "@/hooks/use-reports-page"

interface Props {
  download: ReportsDownloadState
  /** Disabled while the dashboard query is loading or failed (T4). */
  disabled: boolean
  onDownload: () => void
  onPrint: () => void
}

const DOWNLOAD_MESSAGES: Record<TerritoryCsvFailureReason, string> = {
  auth: "El servidor rechazó la descarga del CSV. Intenta nuevamente más tarde.",
  unavailable: "El servidor no pudo generar el CSV en este momento. Intenta nuevamente más tarde.",
  network: "No se pudo contactar al servidor para descargar el CSV. Revisa la conexión e inténtalo nuevamente.",
}

const BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"

export default function ReportActions({ download, disabled, onDownload, onPrint }: Props) {
  const downloading = download.status === "downloading"

  return (
    <div className="flex min-w-0 flex-col gap-2 print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onDownload}
          disabled={disabled || downloading}
          aria-busy={downloading}
          className={`${BUTTON_CLASS} bg-primary text-primary-foreground hover:bg-primary/90`}
        >
          {downloading ? "Descargando…" : "Descargar CSV"}
        </button>
        <button
          type="button"
          onClick={onPrint}
          className={`${BUTTON_CLASS} border border-border text-foreground hover:bg-muted`}
        >
          Imprimir
        </button>
      </div>
      {download.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {DOWNLOAD_MESSAGES[download.reason ?? "network"]}
        </p>
      ) : null}
    </div>
  )
}
