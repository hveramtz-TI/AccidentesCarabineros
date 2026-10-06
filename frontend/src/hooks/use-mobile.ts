import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * True when the viewport is below the mobile breakpoint.
 * Initial value is computed once in the lazy useState initializer; the
 * effect only subscribes to matchMedia changes and cleans up on unmount.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
