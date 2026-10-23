/**
 * URL-backed dashboard filters (EXP-00 T3, reused by EXP-02 T4).
 *
 * The search string is the only filter store. Every change rewrites the URL and
 * pushes a history entry, so a deep link, a refresh, and Back all restore the same
 * scope on any page that uses it.
 */

import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"

import { filtersToSearchParams, parseFilters } from "@/lib/filters-url"
import type { DashboardFilters } from "@/types/dashboard"

export function useUrlFilters(): [DashboardFilters, (next: DashboardFilters) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(searchParams), [searchParams])

  const setFilters = useCallback(
    (next: DashboardFilters) => setSearchParams(filtersToSearchParams(next)),
    [setSearchParams],
  )

  return [filters, setFilters]
}
