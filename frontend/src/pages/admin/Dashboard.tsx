import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { stats, notifications as notificationsApi } from '../../lib/api';
import { Package, FolderTree, ClipboardList, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([stats.get(), notificationsApi.get()])
      .then(([statsData, notifsData]) => {
        setData(statsData);
        setNotifs(notifsData.notifications);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const overview = data?.overview || {};

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h1>

      {/* Cards de résumé */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg">
            <Package className="text-blue-600" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold">{overview.totalMaterials || 0}</p>
            <p className="text-sm text-gray-500">Matériels</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-lg">
            <FolderTree className="text-green-600" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold">{overview.totalStorages || 0}</p>
            <p className="text-sm text-gray-500">Stockages</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-lg">
            <ClipboardList className="text-purple-600" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold">{overview.totalInventories || 0}</p>
            <p className="text-sm text-gray-500">Inventaires</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-lg">
            <AlertTriangle className="text-amber-600" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold">{notifs.length}</p>
            <p className="text-sm text-gray-500">Alertes</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertes */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Alertes actives</h2>
          {notifs.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune alerte</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {notifs.slice(0, 10).map((n, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg text-sm ${
                    n.severity === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {n.message}
                </div>
              ))}
              {notifs.length > 10 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  Et {notifs.length - 10} autres alertes...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Inventaires récents */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Activité récente</h2>
            <Link to="/admin/history" className="text-sm text-primary-600 hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="space-y-2">
            {data?.inventoriesByType?.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucun inventaire</p>
            ) : (
              <div className="space-y-2">
                {data?.inventoriesByType?.map((item: any, i: number) => {
                  const labels: Record<string, string> = {
                    START: 'Début de mission',
                    END: 'Fin de mission',
                    OTHER: 'Autre',
                  };
                  return (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">{labels[item.type] || item.type}</span>
                      <span className="text-sm text-gray-600">{item.count} inventaire(s)</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {overview.recentInventories || 0} inventaire(s) ces 30 derniers jours
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
