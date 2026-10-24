/**
 * Metodología-facing wrapper over the shared abortable query hook (EXP-01).
 *
 * The request has no filters, so its key is a constant: the page fetches the
 * dataset summary once and `retry` is the only way to re-run it. No synthetic
 * fallback and no extra state layer.
 */

import { useApiQuery } from "@/hooks/use-api-query"
import type { ApiQueryState } from "@/hooks/use-api-query"
import { fetchMeta } from "@/lib/api/meta"
import type { MetaApiResponse } from "@/lib/api/meta"

export type MetaQueryState = ApiQueryState<MetaApiResponse>

export function useMetaQuery(enabled = true): MetaQueryState {
  return useApiQuery((signal) => fetchMeta(signal), "meta", {
    enabled,
    fallbackError: "the metadata request failed",
  })
}
