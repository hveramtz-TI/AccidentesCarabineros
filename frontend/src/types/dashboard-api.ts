/**
 * Wire contract for GET /api/dashboard (schemaVersion 1).
 * Mirrors backend/src/types/dashboard-api.ts — keep both in sync.
 */

export interface DashboardApiResponse {
  meta: {
    schemaVersion: 1
    source: "carabineros-2025-normalized"
    synthetic: false
    period: { from: string; to: string }
    filters: { regionId: number | null; communeId: string | null }
    scopeLabel: string
    emptyScope: boolean
    generatedAt: string
  }
  kpis: {
    accidents: number
    fatalities: number
    injuries: number
    seriousInjuries: number
  }
  monthlyTrend: Array<{
    month: string
    accidents: number
    fatalities: number
    injuries: number
    seriousInjuries: number
  }>
  severity: Array<{
    key: "fatal" | "serious" | "minor" | "onlyIlesos"
    label: string
    accidents: number
  }>
  territories: {
    scope: "region" | "commune"
    items: Array<{ code: string; name: string; accidents: number; fatalities: number }>
    all: Array<{ code: string; name: string; accidents: number; fatalities: number }>
    outsideTopCount: number
    outsideAccidents: number
    zeroAccidentCount: number
  }
  causes: {
    items: Array<{ id: number; name: string; accidents: number; fatalities: number }>
    other: { distinctCount: number; accidents: number }
  }
  accidentTypes: Array<{ id: number; name: string; accidents: number; sharePct: number }>
  sectors: Array<{ id: number; name: string; accidents: number; sharePct: number }>
  hourBuckets: {
    items: Array<{ hourStart: number; label: string; accidents: number }>
    midnightArtifactCount: number
  }
  vehicles: {
    items: Array<{ id: number; name: string; siniestros: number; sharePct: number }>
    other: { accidents: number }
    note: string
  }
  persons: {
    rows: number
    calidad: Array<{ id: number; name: string; count: number; sharePct: number }>
    sexo: Array<{ id: number; name: string; count: number; sharePct: number }>
    ageBands: Array<{ band: "0-17" | "18-25" | "26-40" | "41-64" | "65+" | "unknown"; count: number }>
  }
}

export interface ApiErrorBody {
  error?: { code?: string; message?: string }
}
