import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { storages } from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, ChevronRight, ChevronDown, FolderTree, Warehouse, X } from 'lucide-react';

export default function Storages() {
  const [tree, setTree] = useState<any[]>([]);
  const [flatList, setFlatList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', parentId: '' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [treeData, listData] = await Promise.all([storages.tree(), storages.list()]);
      setTree(treeData);
      setFlatList(listData);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await storages.create({
        name: form.name,
        parentId: form.parentId ? parseInt(form.parentId) : undefined,
      });
      toast.success('Stockage créé');
      setShowForm(false);
      setForm({ name: '', parentId: '' });
      loadData();
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
        <h1 className="text-2xl font-bold text-gray-900">Stockages</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          <span className="hidden sm:inline">Nouveau stockage</span>
        </button>
      </div>

      {/* Arbre */}
      <div className="card">
        {tree.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucun stockage. Créez-en un !</p>
        ) : (
          <div className="space-y-1">
            {tree.map((node) => (
              <StorageNode key={node.id} node={node} depth={0} />
            ))}
          </div>
        )}
      </div>

      {/* Modal création */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Nouveau stockage</h2>
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
                  placeholder="Ex: Ambulance 1, Sac de soin, Pochette jaune..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stockage parent (optionnel)
                </label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Aucun (stockage racine)</option>
                  {flatList
                    .filter((s) => !s.isGlobalStock)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.parent ? `${s.parent.name} > ` : ''}{s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StorageNode({ node, depth }: { node: any; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 group"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="p-0.5">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {node.isGlobalStock ? (
          <Warehouse size={18} className="text-amber-600 shrink-0" />
        ) : (
          <FolderTree size={18} className="text-primary-600 shrink-0" />
        )}

        <Link
          to={`/admin/storages/${node.id}`}
          className="flex-1 font-medium text-sm hover:text-primary-600"
        >
          {node.name}
        </Link>

        {node.isGlobalStock && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            Réserve
          </span>
        )}

        {node.uniqueLink && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            Lien actif
          </span>
        )}

        <span className="text-xs text-gray-400">
          {node.templateItems?.length || 0} matériel(s)
        </span>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child: any) => (
            <StorageNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
