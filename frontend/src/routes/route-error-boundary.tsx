/**
 * Route error boundary (EXP-00 T4).
 *
 * One broken page must not blank the shell: the boundary keeps the header and
 * footer alive, offers a retry, and always returns to the Panel.
 */

import { Component } from "react"
import type { ErrorInfo, ReactNode } from "react"
import { Link } from "react-router"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

interface ResetProps {
  onReset: () => void
}

function RouteFailure({ onReset }: ResetProps) {
  return (
    <div className="flex w-full flex-col gap-4 p-4 md:p-10">
      <section
        aria-labelledby="route-error-title"
        role="alert"
        className="min-w-0 rounded-lg border border-destructive/40 bg-destructive/10 p-4 md:p-6"
      >
        <h1
          id="route-error-title"
          data-page-heading
          tabIndex={-1}
          className="mb-2 font-heading text-lg font-semibold text-destructive outline-none"
        >
          Esta sección no pudo cargarse
        </h1>
        <p className="max-w-prose text-sm text-foreground">
          El resto del sitio sigue funcionando. Podés reintentar o volver al panel
          principal.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-current px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Reintentar
          </button>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Volver al panel
          </Link>
        </div>
      </section>
    </div>
  )
}

export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("route render failed", error, info.componentStack)
  }

  #reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return <RouteFailure onReset={this.#reset} />
    }
    return this.props.children
  }
}
