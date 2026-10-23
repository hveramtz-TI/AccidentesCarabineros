/**
 * Route tree (EXP-00 T1/T4).
 *
 * `/` stays the eager Panel so the first paint and the existing bundle cost do
 * not regress; anything that is not the initial route is lazy-loaded behind one
 * Suspense fallback, and `*` lands on a real 404 page inside the shell instead
 * of a blank screen. Later ODDs add their own `<Route>` here and enable their
 * own navigation item in `layout/Layout.tsx`.
 */

import { Suspense, lazy } from "react"
import { BrowserRouter, Route, Routes } from "react-router"

import DashboardPage from "@/pages/dashboard-page"
import Layout from "@/layout/Layout"

// Lazy: a cold 404 or a later section must not enter the Panel chunk.
const NotFoundPage = lazy(() => import("@/pages/not-found-page"))

function RouteFallback() {
  return (
    <div className="flex w-full flex-col gap-4 p-4 md:p-10">
      <div role="status" aria-label="Cargando página" className="min-w-0">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-[60dvh] w-full animate-pulse rounded bg-muted lg:h-96" />
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="*"
            element={
              <Suspense fallback={<RouteFallback />}>
                <NotFoundPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
