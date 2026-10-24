/**
 * Typed client for GET /api/analysis (EXP-03).
 *
 * Sends the same approved Bearer barrier as GET /api/dashboard
 * (`VITE_UUID_CONNECTION`, public by design — a request barrier, not
 * authentication). Never falls back to synthetic data on failure; callers must
 * render the error state.
 */

export interface AnalysisCauseRow {
  causeId: number
  name: string
  accidents: number
  /** accidents / totalAccidents * 100, one decimal; the API sends 0 when the total is 0. */
  share: number
}

/** Mirrors the backend `AnalysisSeverityBucket` (siniestro-level buckets, SEV-1). */
export type AnalysisSeverityBucket = "fatal" | "serious" | "minor" | "onlyIlesos" | "unknown"

export interface AnalysisVehicleTypeRow {
  typeId: number
  name: string
  /** Distinct siniestros of this type — never vehicle rows. */
  siniestros: number
  /**
   * siniestros / totalSiniestros * 100, one decimal. Non-additive across
   * types: one siniestro can involve several types, so shares may sum above 100.
   */
  share: number
}

export interface AnalysisVehicleSeverityRow {
  typeId: number
  name: string
  severity: AnalysisSeverityBucket
  siniestros: number
}

export interface AnalysisVehiclesSection {
  /** Scope siniestro count; always equals `causes.totalAccidents`. */
  totalSiniestros: number
  /** Siniestros with no vehicle row. A coverage note, never a type. */
  withoutVehicleRows: number
  byType: AnalysisVehicleTypeRow[]
  /** Per type these rows reconcile exactly with that type's `byType.siniestros`. */
  byTypeSeverity: AnalysisVehicleSeverityRow[]
}

/** Mirrors the backend `AnalysisAgeBand` — the dashboard's approved AGE_BANDS. */
export type AnalysisAgeBand = "0-17" | "18-25" | "26-40" | "41-64" | "65+" | "unknown"

export interface AnalysisPersonSexRow {
  sexId: number
  /** Catalog label; `SE IGNORA` is a real category, never an imputation. */
  name: string
  /** Personas with this sex in the scope — PERSONS, not siniestros. */
  persons: number
  /** persons / `persons.rows` * 100, one decimal. */
  share: number
}

export interface AnalysisPersonAgeRow {
  bucket: AnalysisAgeBand
  persons: number
  share: number
}

export interface AnalysisPersonSexAgeRow {
  sexId: number
  name: string
  bucket: AnalysisAgeBand
  persons: number
}

export interface AnalysisPersonQualityOutcomeRow {
  qualityId: number
  qualityName: string
  outcomeId: number
  /** Person-level outcome (`resultado_persona`), NOT siniestro-level severity. */
  outcomeName: string
  persons: number
}

/**
 * Added by EXP-05. Person grain throughout: `rows` is the persona-row count of
 * the scope. `bySexAge` and `byQualityOutcome` are MECE partitions of the same
 * set, so both sum exactly to `rows`, and `bySex`/`byAge` are exact marginals
 * of the first. `unknownAge` equals the `unknown` band marginal; `unknownSex`
 * equals the sexId-3 (`SE IGNORA`) marginal.
 */
export interface AnalysisPersonsSection {
  rows: number
  unknownAge: number
  unknownSex: number
  bySex: AnalysisPersonSexRow[]
  /** Always the full six bands in order, including zero-valued ones. */
  byAge: AnalysisPersonAgeRow[]
  /** Populated cells only; ordered sexId ASC then band order. */
  bySexAge: AnalysisPersonSexAgeRow[]
  /** Populated cells only; ordered persons DESC, qualityId ASC, outcomeId ASC. */
  byQualityOutcome: AnalysisPersonQualityOutcomeRow[]
}

export interface AnalysisFilters {
  from: string
  to: string
  regionId: number | null
  communeId: string | null
}

export interface AnalysisApiResponse {
  schemaVersion: 1
  meta: { generatedAt: string }
  filters: AnalysisFilters
  causes: {
    totalAccidents: number
    rows: AnalysisCauseRow[]
  }
  /**
   * Added by EXP-04. Typed as required (the backend always sends it), but the
   * tab must stay defensive: a stale server without this section returns
   * `undefined` at runtime.
   */
  vehicles: AnalysisVehiclesSection
  /**
   * Added by EXP-05. Same defensive rule as `vehicles`: a stale server without
   * this section returns `undefined` at runtime.
   */
  persons: AnalysisPersonsSection
}

export interface AnalysisQueryParams {
  from?: string
  to?: string
  regionId?: number
  communeId?: string
}

interface ApiErrorBody {
  error?: { code?: string; message?: string }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080").replace(/\/+$/, "")
const CONNECTION_TOKEN = import.meta.env.VITE_UUID_CONNECTION ?? ""

export class AnalysisApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "AnalysisApiError"
    this.status = status
    this.code = code
  }
}

export function buildAnalysisUrl(params: AnalysisQueryParams): string {
  const search = new URLSearchParams()
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  if (params.regionId !== undefined) search.set("regionId", String(params.regionId))
  if (params.communeId !== undefined) search.set("communeId", params.communeId)
  const query = search.toString()
  return `${API_BASE_URL}/api/analysis${query ? `?${query}` : ""}`
}

export async function fetchAnalysis(
  params: AnalysisQueryParams,
  signal: AbortSignal,
): Promise<AnalysisApiResponse> {
  let response: Response
  try {
    response = await fetch(buildAnalysisUrl(params), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${CONNECTION_TOKEN}`,
      },
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new AnalysisApiError(0, "NETWORK", "could not reach the analysis API")
  }

  if (!response.ok) {
    let code = "HTTP_ERROR"
    let message = `analysis API responded ${response.status}`
    try {
      const body = (await response.json()) as ApiErrorBody
      if (body.error?.code) code = body.error.code
      if (body.error?.message) message = body.error.message
    } catch {
      /* non-JSON error body: keep the generic message */
    }
    throw new AnalysisApiError(response.status, code, message)
  }

  return (await response.json()) as AnalysisApiResponse
}
