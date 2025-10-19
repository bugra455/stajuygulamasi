import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import './App.css'
import { AuthProvider } from './context/AuthContext';
import { NotificationManager } from './components/ui/NotificationManager';

const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DanismanPanel = lazy(() => import('./pages/DanismanPanel'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const StajBasvuru = lazy(() => import('./pages/StajBasvuru'));
const BasvuruTakip = lazy(() => import('./pages/BasvuruTakip'));
const Defterim = lazy(() => import('./pages/Defterim/'));
const KariyerPanel = lazy(() => import('./pages/KariyerPanel'));
const SirketGiris = lazy(() => import('./pages/SirketGiris'));
const SirketDefterOnay = lazy(() => import('./pages/SirketDefterOnay'));
const MuafiyetBasvuru = lazy(() => import('./pages/MuafiyetBasvuru'));
const ParolaDegistir = lazy(() => import('./pages/ParolaDegistir'));
const DanismanPasswordGuard = lazy(() => import('./components/guards/DanismanPasswordGuard'));

// Loading component
const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <NotificationManager>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ogrenci-panel" element={<Dashboard />} />
            <Route path="/danisman-panel" element={<DanismanPasswordGuard><DanismanPanel /></DanismanPasswordGuard>} />
            <Route path="/admin-panel" element={<AdminPanel />} />
            <Route path="/kariyer-panel" element={<KariyerPanel/>}/>
            <Route path="/staj-basvurusu" element={<StajBasvuru />} />
            <Route path="/basvuru-takip" element={<BasvuruTakip />} />
            <Route path="/defterim" element={<Defterim />} />
            <Route path="/sirketgiris" element={<SirketGiris />} />
            <Route path="/defter-onay" element={<SirketDefterOnay />} />
            <Route path="/muafiyet-basvuru" element={<MuafiyetBasvuru />} />
            <Route path="/parola-degistir" element={<ParolaDegistir />} />
            <Route path="/danisman" element={<DanismanPasswordGuard><DanismanPanel /></DanismanPasswordGuard>} />
          </Routes>
        </Suspense>
      </NotificationManager>
    </AuthProvider>
  )
}

export default App