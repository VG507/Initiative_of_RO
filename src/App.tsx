import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './layouts/Layout'
import Dashboard from './pages/Dashboard'
import Applications from './pages/Applications'
import ApplicationDetail from './pages/ApplicationDetail'
import { Clusters, ClusterDetail } from './pages/Clusters'
import { Municipalities, MunicipalityDetail } from './pages/Municipalities'
import Analytics from './pages/Analytics'
import StrategyPage from './pages/StrategyPage'
import StrategyIncluded from './pages/StrategyIncluded'
import StrategyCandidates from './pages/StrategyCandidates'
import Monitoring from './pages/Monitoring'
import Submit from './pages/Submit'
import { EmptyState } from './components/ui'

function NotFound() {
  return <EmptyState title="Страница не найдена" description="Проверьте адрес или вернитесь на главную." action={{ label: 'На главную', to: '/' }} />
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/applications/:id" element={<ApplicationDetail />} />
          <Route path="/clusters" element={<Clusters />} />
          <Route path="/clusters/:id" element={<ClusterDetail />} />
          <Route path="/municipalities" element={<Municipalities />} />
          <Route path="/municipalities/:id" element={<MunicipalityDetail />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/strategy" element={<StrategyPage />} />
          <Route path="/strategy/included" element={<StrategyIncluded />} />
          <Route path="/strategy/candidates" element={<StrategyCandidates />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}