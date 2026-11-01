import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { AppShell } from './components/AppShell'
import { Overview } from './pages/Overview'
import { Atlas } from './pages/Atlas'
import { Prospects } from './pages/Prospects'
import { DistrictPage } from './pages/DistrictPage'
import { RoutePage } from './pages/RoutePage'
import { MyList } from './pages/MyList'
import { WorkspaceProvider } from './lib/store'
import { ToastProvider } from './lib/toast'

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <WorkspaceProvider>
          <ScrollToTop />
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Overview />} />
              <Route path="map" element={<Atlas />} />
              <Route path="prospects" element={<Prospects />} />
              <Route path="districts/:slug" element={<DistrictPage />} />
              <Route path="route" element={<RoutePage />} />
              <Route path="list" element={<MyList />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </WorkspaceProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
