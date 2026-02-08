import { useState, useEffect } from 'react';
import { stats, exports_ } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Download, FileText } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const typeLabels: Record<string, string> = {
  START: 'Début',
  END: 'Fin',
  OTHER: 'Autre',
};

export default function Stats() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stats
      .get()
      .then(setData)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleExport(format: 'csv' | 'pdf') {
    try {
      const blob = format === 'csv' ? await exports_.csv() : await exports_.pdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-sagl-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Export ${format.toUpperCase()} téléchargé`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={16} />
            CSV
          </button>
          <button onClick={() => handleExport('pdf')} className="btn-secondary flex items-center gap-2 text-sm">
            <FileText size={16} />
            PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventaires par type */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Inventaires par type</h2>
          {data?.inventoriesByType?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.inventoriesByType.map((d: any) => ({
                    ...d,
                    name: typeLabels[d.type] || d.type,
                  }))}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, count }) => `${name}: ${count}`}
                >
                  {data.inventoriesByType.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">Pas de données</p>
          )}
        </div>

        {/* Inventaires par jour */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Inventaires (30 derniers jours)</h2>
          {data?.inventoriesPerDay?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.inventoriesPerDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  fontSize={12}
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  labelFormatter={(d) => new Date(d).toLocaleDateString('fr-FR')}
                />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Inventaires" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">Pas de données</p>
          )}
        </div>

        {/* Top consommés */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Matériels les plus consommés</h2>
          {data?.topConsumed?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topConsumed} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={150} fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" name="Quantité consommée" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">Pas de données</p>
          )}
        </div>

        {/* Top manquants */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Matériels les plus souvent manquants</h2>
          {data?.topMissing?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topMissing} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={150} fontSize={12} />
                <Tooltip />
                <Bar dataKey="missingCount" fill="#ef4444" name="Fois manquant" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">Pas de données</p>
          )}
        </div>

        {/* État du stock global */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">État de la réserve locale</h2>
          {data?.stockStatus?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 text-sm font-semibold text-gray-600">Matériel</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-600">Quantité</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-600">Seuil</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-600">État</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stockStatus.map((item: any, i: number) => {
                    const isLow = item.threshold && item.quantity <= item.threshold;
                    const isEmpty = item.quantity === 0;

                    return (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="p-3 text-sm">{item.name}</td>
                        <td className={`p-3 text-sm text-center font-semibold ${isEmpty ? 'text-red-600' : isLow ? 'text-amber-600' : ''}`}>
                          {item.quantity}
                        </td>
                        <td className="p-3 text-sm text-center text-gray-500">
                          {item.threshold || '-'}
                        </td>
                        <td className="p-3 text-center">
                          {isEmpty ? (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Épuisé</span>
                          ) : isLow ? (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Faible</span>
                          ) : (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">Aucun stock en réserve</p>
          )}
        </div>
      </div>
    </div>
  );
}
