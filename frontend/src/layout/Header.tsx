import type { ReactNode } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface Props {
  /** Optional toolbar rendered at the end of the header (e.g. dashboard filters). */
  toolbar?: ReactNode
}

const Header = ({ toolbar }: Props) => {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-3 backdrop-blur-md md:px-4">
      <SidebarTrigger
        aria-label="Toggle navigation sidebar"
        className="rounded-md border border-input"
      />
      <div className="flex min-w-0 flex-col justify-center">
        <h1 className="truncate font-heading text-sm font-semibold leading-tight text-foreground">
          Traffic Accident Telemetry
        </h1>
        <span className="metric-label truncate">
          Carabineros de Chile road-safety analytics
        </span>
      </div>
      {toolbar ? <div className="ml-auto flex min-w-0 flex-wrap justify-end">{toolbar}</div> : null}
    </header>
  )
}

export default Header
