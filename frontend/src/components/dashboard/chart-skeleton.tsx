import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface Props {
  /** Real chart title, kept while loading (same pattern as KPI cards). */
  title: string
  description: string
  /** Static height utility matching the real chart body, e.g. "h-64 w-full". */
  bodyClass: string
}

/**
 * Loading placeholder for a chart card, mirroring the KPI card skeleton
 * (animate-pulse + role="status") so lower charts never disappear while
 * the dashboard has no data yet.
 */
export default function ChartSkeleton({ title, description, bodyClass }: Props) {
  return (
    <Card className="glass-card rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="font-mono text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="status"
          aria-label={`${title} loading`}
          className={`animate-pulse rounded bg-muted ${bodyClass}`}
        />
      </CardContent>
    </Card>
  )
}
