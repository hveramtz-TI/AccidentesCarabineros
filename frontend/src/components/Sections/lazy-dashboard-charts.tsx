import { lazy, Suspense, useEffect, useRef, useState } from "react"
import ChartsSkeleton from "@/components/dashboard/charts-skeleton"
import type { DashboardData } from "@/types/dashboard"

/**
 * Recharts is only needed by the analytic block below the map. The chunk is
 * imported on the first paint pass, so this wrapper waits until the block is
 * near the viewport before downloading and mounting it. That keeps the chart
 * library out of the initial bundle and off the LCP path.
 */
const ContainerDashboardCharts = lazy(
  () => import("@/components/Sections/containerDashboardCharts"),
)

/** Load slightly before the block scrolls into view to avoid a visible gap. */
const DEFER_ROOT_MARGIN = "400px 0px"

type Props = {
  data: DashboardData | null
}

export default function LazyDashboardCharts({ data }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible) return
    const node = hostRef.current
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: DEFER_ROOT_MARGIN },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [visible])

  return (
    <div ref={hostRef} className="min-w-0">
      {visible ? (
        <Suspense fallback={<ChartsSkeleton />}>
          <ContainerDashboardCharts data={data} />
        </Suspense>
      ) : (
        <ChartsSkeleton />
      )}
    </div>
  )
}
