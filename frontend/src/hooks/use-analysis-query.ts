/**
 * Análisis-facing wrapper over the shared abortable query hook (EXP-03).
 *
 * The layout owns exactly one analysis request; the primitive key is built from
 * the same four filter params the API understands, so a filter change starts a
 * new query and a tab switch never issues another one.
 */

import { useApiQuery } from "@/hooks/use-api-query"
import type { ApiQueryState } from "@/hooks/use-api-query"
import { fetchAnalysis } from "@/lib/api/analysis"
import type { AnalysisApiResponse, AnalysisQueryParams } from "@/lib/api/analysis"

export type AnalysisQueryState = ApiQueryState<AnalysisApiResponse>

export function useAnalysisQuery(params: AnalysisQueryParams, enabled = true): AnalysisQueryState {
  const key = `${params.from ?? ""}|${params.to ?? ""}|${params.regionId ?? ""}|${params.communeId ?? ""}`

  return useApiQuery((signal) => fetchAnalysis(params, signal), key, {
    enabled,
    fallbackError: "the analysis request failed",
  })
}
