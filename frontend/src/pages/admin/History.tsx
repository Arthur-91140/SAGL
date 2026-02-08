import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { inventories, storages as storagesApi } from '../../lib/api';
import toast from 'react-hot-toast';
import { Eye, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const typeLabels: Record<string, string> = {
  START: 'Début de mission',
  END: 'Fin de mission',
  OTHER: 'Autre',
};

const typeColors: Record<string, string> = {
  START: 'bg-green-100 text-green-700',
  END: 'bg-blue-100 text-blue-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

export default function History() {
  const [data, setData] = useState<any>({ inventories: [], pagination: { page: 1, totalPages: 1, total: 0 } });
  const [storagesList, setStoragesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', storageId: '', page: '1' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    storagesApi.list().then(setStoragesList).catch(console.error);
  }, []);

  useEffect(() => {
    loadInventories();
  }, [filters]);

  async function loadInventories() {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: filters.page, limit: '20' };
      if (filters.type) params.type = filters.type;
      if (filters.storageId) params.storageId = filters.storageId;
      const result = await inventories.list(params);
      setData(result);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historique des inventaires</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary flex items-center gap-2"
        >
          <Filter size={16} />
          Filtres
        </button>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="card mb-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value, page: '1' })}
              className="input-field w-48"
            >
              <option value="">Tous</option>
              <option value="START">Début de mission</option>
              <option value="END">Fin de mission</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Stockage</label>
            <select
              value={filters.storageId}
              onChange={(e) => setFilters({ ...filters, storageId: e.target.value, page: '1' })}
              className="input-field w-48"
            >
              <option value="">Tous</option>
              {storagesList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : data.inventories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucun inventaire trouvé</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Date</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Secouriste</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600 hidden md:table-cell">Stockage</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600 hidden sm:table-cell">Type</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600 hidden lg:table-cell">Poste</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">Détails</th>
              </tr>
            </thead>
            <tbody>
              {data.inventories.map((inv: any) => (
                <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-sm">
                    {new Date(inv.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="p-4 text-sm font-medium">{inv.rescuerName}</td>
                  <td className="p-4 text-sm hidden md:table-cell">{inv.storage?.name}</td>
                  <td className="p-4 hidden sm:table-cell">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeColors[inv.type] || ''}`}>
                      {typeLabels[inv.type] || inv.type}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-500 hidden lg:table-cell">
                    {inv.postName || inv.postNumber || '-'}
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      to={`/admin/history/${inv.id}`}
                      className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm"
                    >
                      <Eye size={16} />
                      <span className="hidden sm:inline">Voir</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            {data.pagination.total} résultat(s)
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={data.pagination.page <= 1}
              onClick={() => setFilters({ ...filters, page: (data.pagination.page - 1).toString() })}
              className="btn-secondary p-2 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm">
              {data.pagination.page} / {data.pagination.totalPages}
            </span>
            <button
              disabled={data.pagination.page >= data.pagination.totalPages}
              onClick={() => setFilters({ ...filters, page: (data.pagination.page + 1).toString() })}
              className="btn-secondary p-2 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
