import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AdminLayout from './components/admin/AdminLayout';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Materials from './pages/admin/Materials';
import Storages from './pages/admin/Storages';
import StorageDetail from './pages/admin/StorageDetail';
import History from './pages/admin/History';
import InventoryDetail from './pages/admin/InventoryDetail';
import Stats from './pages/admin/Stats';
import Settings from './pages/admin/Settings';
import InventoryStart from './pages/inventory/InventoryStart';
import InventoryForm from './pages/inventory/InventoryForm';
import InventoryComplete from './pages/inventory/InventoryComplete';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Inventaire public (secouriste) */}
      <Route path="/i/:uniqueLink" element={<InventoryStart />} />
      <Route path="/i/:uniqueLink/form" element={<InventoryForm />} />
      <Route path="/i/:uniqueLink/complete" element={<InventoryComplete />} />

      {/* Admin */}
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="materials" element={<Materials />} />
        <Route path="storages" element={<Storages />} />
        <Route path="storages/:id" element={<StorageDetail />} />
        <Route path="history" element={<History />} />
        <Route path="history/:id" element={<InventoryDetail />} />
        <Route path="stats" element={<Stats />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Redirection par défaut */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
