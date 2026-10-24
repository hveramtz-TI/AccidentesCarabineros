/**
 * Comparator query hook for the Tendencias tab (EXP-07 T6).
 *
 * The analysis request stays the single shared one (the layout owns it); the
 * comparator is a SEPARATE, opt-in fetch: `/api/compare` runs only when the
 * user has selected at least one code. A filter/level change aborts the stale
 * request through the shared `useApiQuery` key, exactly like every other
 * dashboard-family query.
 */

import { useApiQuery } from "@/hooks/use-api-query"
import type { ApiQueryState } from "@/hooks/use-api-query"
import { fetchCompare } from "@/lib/api/compare"
import type { CompareApiResponse } from "@/lib/api/compare"

export type ComparatorLevel = "region" | "commune" | "commune-selected"

export interface ComparatorParams {
  from?: string
  to?: string
  regionId?: number
  communeId?: string
  /** Raw URL filter values, used only to derive the comparison level. */
  region?: string
  commune?: string
}

/** A commune selection disables the comparator; national compares regions; a region compares its communes. */
export function comparatorLevel(params: ComparatorParams): ComparatorLevel {
  if (params.communeId || params.commune) return "commune-selected"
  if (params.regionId || params.region) return "commune"
  return "region"
}

export interface ComparatorState {
  level: ComparatorLevel
  query: ApiQueryState<CompareApiResponse>
}

/**
 * `codes` are the selected catalog identifiers (already de-duplicated by the
 * UI, max 4). The request is skipped entirely while the selection is empty or
 * the scope is a single commune (where the comparator is disabled).
 */
export function useCompare(params: ComparatorParams, codes: string[]): ComparatorState {
  const level = comparatorLevel(params)
  // Request order is kept (the API answers in request order): the table reads
  // as the user's own selection sequence, matching the loading skeleton.
  const effectiveCodes = level === "commune-selected" ? [] : [...codes]

  const query = useApiQuery(
    (signal) =>
      fetchCompare(
        {
          from: params.from,
          to: params.to,
          regionId: params.regionId,
          communeId: params.communeId,
          codes: effectiveCodes,
        },
        signal,
      ),
    `${params.from ?? ""}|${params.to ?? ""}|${params.regionId ?? ""}|${params.communeId ?? ""}|${level}|${effectiveCodes.join(",")}`,
    {
      enabled: effectiveCodes.length > 0,
      fallbackError: "the comparator request failed",
    },
  )

  return { level, query }
}
