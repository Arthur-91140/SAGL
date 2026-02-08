import { useState, useEffect, FormEvent } from 'react';
import { materials } from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';

interface Material {
  id: number;
  name: string;
  description: string | null;
  alertThreshold: number | null;
}

export default function Materials() {
  const [list, setList] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState({ name: '', description: '', alertThreshold: '' });

  useEffect(() => {
    loadMaterials();
  }, []);

  async function loadMaterials() {
    try {
      const data = await materials.list();
      setList(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', description: '', alertThreshold: '' });
    setShowForm(true);
  }

  function openEdit(mat: Material) {
    setEditing(mat);
    setForm({
      name: mat.name,
      description: mat.description || '',
      alertThreshold: mat.alertThreshold?.toString() || '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await materials.update(editing.id, {
          name: form.name,
          description: form.description || undefined,
          alertThreshold: form.alertThreshold ? parseInt(form.alertThreshold) : null,
        });
        toast.success('Matériel modifié');
      } else {
        await materials.create({
          name: form.name,
          description: form.description || undefined,
          alertThreshold: form.alertThreshold ? parseInt(form.alertThreshold) : undefined,
        });
        toast.success('Matériel créé');
      }
      setShowForm(false);
      loadMaterials();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Supprimer "${name}" ? Cette action est irréversible.`)) return;
    try {
      await materials.delete(id);
      toast.success('Matériel supprimé');
      loadMaterials();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const filtered = list.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.description?.toLowerCase().includes(search.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold text-gray-900">Matériels</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          <span className="hidden sm:inline">Nouveau matériel</span>
        </button>
      </div>

      {/* Recherche */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un matériel..."
          className="input-field pl-10"
        />
      </div>

      {/* Liste */}
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-4 text-sm font-semibold text-gray-600">Nom</th>
              <th className="text-left p-4 text-sm font-semibold text-gray-600 hidden md:table-cell">Description</th>
              <th className="text-left p-4 text-sm font-semibold text-gray-600 hidden sm:table-cell">Seuil d'alerte</th>
              <th className="text-right p-4 text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  {search ? 'Aucun résultat' : 'Aucun matériel. Créez-en un !'}
                </td>
              </tr>
            ) : (
              filtered.map((mat) => (
                <tr key={mat.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium">{mat.name}</td>
                  <td className="p-4 text-sm text-gray-500 hidden md:table-cell">
                    {mat.description || '-'}
                  </td>
                  <td className="p-4 text-sm hidden sm:table-cell">
                    {mat.alertThreshold ? (
                      <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-medium">
                        {mat.alertThreshold}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => openEdit(mat)}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600"
                      title="Modifier"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(mat.id, mat.name)}
                      className="p-1.5 hover:bg-red-100 rounded text-red-600 ml-1"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editing ? 'Modifier le matériel' : 'Nouveau matériel'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Compresse stérile 10x10"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field"
                  placeholder="Description optionnelle"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seuil d'alerte (stock)
                </label>
                <input
                  type="number"
                  value={form.alertThreshold}
                  onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })}
                  className="input-field"
                  placeholder="Laisser vide pour aucune alerte"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Notification si le stock en réserve descend sous cette quantité
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editing ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
