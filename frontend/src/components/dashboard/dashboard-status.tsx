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
          Could not load dashboard data from the API{error ? `: ${error}` : "."}
        </span>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-current px-3 py-1 font-mono text-xs hover:bg-destructive/10"
        >
          Retry
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
        This scope returned no accidents from the API. Pick another commune,
        another region, or return to “All regions”.
      </div>
    )
  }

  return null
}
