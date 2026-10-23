/**
 * Route tree (EXP-00 T1/T4, EXP-02 T4, EXP-03 T4).
 *
 * `/` stays the eager Panel so the first paint and the existing bundle cost do
 * not regress; every other page is lazy-loaded. The Suspense fallback and the
 * route error boundary live in the shell (`layout/Layout.tsx`), so adding a page
 * here is the only edit a new section needs.
 */

import { lazy } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router"

import DashboardPage from "@/pages/dashboard-page"
import Layout from "@/layout/Layout"

// Lazy: a cold section must not enter the Panel chunk.
const MapsPage = lazy(() => import("@/pages/maps-page"))
const MethodologyPage = lazy(() => import("@/pages/methodology-page"))
const AnalysisLayout = lazy(() => import("@/routes/analysis-layout"))
const AnalysisCausesPage = lazy(() => import("@/pages/analysis-causes-page"))
const NotFoundPage = lazy(() => import("@/pages/not-found-page"))

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="mapas" element={<MapsPage />} />
          <Route path="analisis" element={<AnalysisLayout />}>
            <Route index element={<Navigate to="causas" replace />} />
            <Route path="causas" element={<AnalysisCausesPage />} />
          </Route>
          <Route path="metodologia" element={<MethodologyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
