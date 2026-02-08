import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { storages, materials as materialsApi } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Link as LinkIcon,
  QrCode,
  Pencil,
  Trash2,
  Plus,
  Save,
  Download,
  FolderTree,
  X,
} from 'lucide-react';

export default function StorageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [storage, setStorage] = useState<any>(null);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateItems, setTemplateItems] = useState<any[]>([]);
  const [showStockForm, setShowStockForm] = useState(false);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [storageData, materialsData] = await Promise.all([
        storages.get(parseInt(id!)),
        materialsApi.list(),
      ]);
      setStorage(storageData);
      setName(storageData.name);
      setAllMaterials(materialsData);
      setTemplateItems(
        storageData.templateItems.map((t: any) => ({
          materialId: t.materialId.toString(),
          expectedQuantity: t.expectedQuantity.toString(),
        }))
      );
      setStockItems(
        storageData.stockItems.map((s: any) => ({
          materialId: s.materialId.toString(),
          quantity: s.quantity.toString(),
          expirationDate: s.expirationDate
            ? new Date(s.expirationDate).toISOString().split('T')[0]
            : '',
        }))
      );
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    try {
      await storages.update(parseInt(id!), { name });
      setEditingName(false);
      toast.success('Nom modifié');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${storage.name}" et tous ses sous-stockages ?`)) return;
    try {
      await storages.delete(parseInt(id!));
      toast.success('Stockage supprimé');
      navigate('/admin/storages');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleGenerateLink() {
    try {
      const data = await storages.generateLink(parseInt(id!));
      toast.success('Lien généré');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDownloadQR() {
    try {
      const blob = await storages.getQRCode(parseInt(id!));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${storage.name}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleSaveTemplate(e: FormEvent) {
    e.preventDefault();
    try {
      const items = templateItems
        .filter((t) => t.materialId && t.expectedQuantity)
        .map((t) => ({
          materialId: parseInt(t.materialId),
          expectedQuantity: parseInt(t.expectedQuantity),
        }));
      await storages.updateTemplate(parseInt(id!), items);
      toast.success('Template mis à jour');
      setShowTemplateForm(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleSaveStock(e: FormEvent) {
    e.preventDefault();
    try {
      const items = stockItems
        .filter((s) => s.materialId && s.quantity)
        .map((s) => ({
          materialId: parseInt(s.materialId),
          quantity: parseInt(s.quantity),
          expirationDate: s.expirationDate || undefined,
        }));
      await storages.updateStock(parseInt(id!), items);
      toast.success('Stock mis à jour');
      setShowStockForm(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleAddChild(e: FormEvent) {
    e.preventDefault();
    try {
      await storages.create({ name: childName, parentId: parseInt(id!) });
      toast.success('Sous-stockage créé');
      setShowAddChild(false);
      setChildName('');
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

  if (!storage) {
    return <p className="text-center text-gray-500">Stockage non trouvé</p>;
  }

  const baseUrl = window.location.origin;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/storages')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>

        {editingName ? (
          <form onSubmit={handleRename} className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field text-xl font-bold"
              autoFocus
            />
            <button type="submit" className="btn-primary">
              <Save size={16} />
            </button>
            <button type="button" onClick={() => { setEditingName(false); setName(storage.name); }} className="btn-secondary">
              <X size={16} />
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-3 flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{storage.name}</h1>
            {storage.isGlobalStock && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Réserve</span>
            )}
            <button onClick={() => setEditingName(true)} className="p-1.5 hover:bg-gray-100 rounded">
              <Pencil size={16} className="text-gray-400" />
            </button>
          </div>
        )}

        {!storage.isGlobalStock && (
          <button onClick={handleDelete} className="btn-danger flex items-center gap-1.5">
            <Trash2 size={16} />
            <span className="hidden sm:inline">Supprimer</span>
          </button>
        )}
      </div>

      {/* Info parent */}
      {storage.parent && (
        <p className="text-sm text-gray-500 mb-4">
          Parent :{' '}
          <Link to={`/admin/storages/${storage.parent.id}`} className="text-primary-600 hover:underline">
            {storage.parent.name}
          </Link>
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lien unique & QR */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <LinkIcon size={18} />
            Lien d'inventaire
          </h2>
          {storage.uniqueLink ? (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 text-sm font-mono break-all">
                {baseUrl}/i/{storage.uniqueLink}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${baseUrl}/i/${storage.uniqueLink}`);
                    toast.success('Lien copié');
                  }}
                  className="btn-secondary text-sm flex-1"
                >
                  Copier le lien
                </button>
                <button onClick={handleDownloadQR} className="btn-secondary text-sm flex items-center gap-1">
                  <QrCode size={16} />
                  QR Code
                </button>
              </div>
              <button onClick={handleGenerateLink} className="text-sm text-gray-500 hover:text-gray-700">
                Regénérer le lien
              </button>
            </div>
          ) : (
            <button onClick={handleGenerateLink} className="btn-primary flex items-center gap-2">
              <LinkIcon size={16} />
              Générer un lien
            </button>
          )}
        </div>

        {/* Sous-stockages */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FolderTree size={18} />
              Sous-stockages ({storage.children?.length || 0})
            </h2>
            <button onClick={() => setShowAddChild(true)} className="btn-secondary text-sm flex items-center gap-1">
              <Plus size={14} />
              Ajouter
            </button>
          </div>
          {storage.children?.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun sous-stockage</p>
          ) : (
            <div className="space-y-2">
              {storage.children.map((child: any) => (
                <Link
                  key={child.id}
                  to={`/admin/storages/${child.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <span className="font-medium text-sm">{child.name}</span>
                  <span className="text-xs text-gray-500">
                    {child.templateItems?.length || 0} matériel(s)
                    {child._count?.children > 0 && ` · ${child._count.children} sous-stockage(s)`}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {showAddChild && (
            <form onSubmit={handleAddChild} className="mt-3 flex gap-2">
              <input
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                className="input-field flex-1"
                placeholder="Nom du sous-stockage"
                required
                autoFocus
              />
              <button type="submit" className="btn-primary">
                <Plus size={16} />
              </button>
              <button type="button" onClick={() => setShowAddChild(false)} className="btn-secondary">
                <X size={16} />
              </button>
            </form>
          )}
        </div>

        {/* Template (contenu attendu) */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Contenu attendu (template)</h2>
            <button
              onClick={() => setShowTemplateForm(!showTemplateForm)}
              className="btn-secondary text-sm"
            >
              {showTemplateForm ? 'Annuler' : 'Modifier'}
            </button>
          </div>

          {showTemplateForm ? (
            <form onSubmit={handleSaveTemplate} className="space-y-3">
              {templateItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={item.materialId}
                    onChange={(e) => {
                      const updated = [...templateItems];
                      updated[i].materialId = e.target.value;
                      setTemplateItems(updated);
                    }}
                    className="input-field flex-1"
                  >
                    <option value="">Sélectionner...</option>
                    {allMaterials.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={item.expectedQuantity}
                    onChange={(e) => {
                      const updated = [...templateItems];
                      updated[i].expectedQuantity = e.target.value;
                      setTemplateItems(updated);
                    }}
                    className="input-field w-24"
                    placeholder="Qté"
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={() => setTemplateItems(templateItems.filter((_, j) => j !== i))}
                    className="p-1.5 hover:bg-red-100 rounded text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setTemplateItems([...templateItems, { materialId: '', expectedQuantity: '' }])}
                className="btn-secondary text-sm w-full"
              >
                <Plus size={14} className="inline mr-1" />
                Ajouter un matériel
              </button>

              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                <Save size={16} />
                Enregistrer le template
              </button>
            </form>
          ) : (
            <div>
              {storage.templateItems.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucun contenu attendu défini</p>
              ) : (
                <div className="space-y-2">
                  {storage.templateItems.map((t: any) => (
                    <div key={t.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">{t.material.name}</span>
                      <span className="text-sm font-semibold text-primary-600">{t.expectedQuantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stock actuel */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Stock actuel</h2>
            <button
              onClick={() => setShowStockForm(!showStockForm)}
              className="btn-secondary text-sm"
            >
              {showStockForm ? 'Annuler' : 'Modifier'}
            </button>
          </div>

          {showStockForm ? (
            <form onSubmit={handleSaveStock} className="space-y-3">
              {stockItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={item.materialId}
                    onChange={(e) => {
                      const updated = [...stockItems];
                      updated[i].materialId = e.target.value;
                      setStockItems(updated);
                    }}
                    className="input-field flex-1"
                  >
                    <option value="">Sélectionner...</option>
                    {allMaterials.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const updated = [...stockItems];
                      updated[i].quantity = e.target.value;
                      setStockItems(updated);
                    }}
                    className="input-field w-20"
                    placeholder="Qté"
                    min="0"
                  />
                  <input
                    type="date"
                    value={item.expirationDate}
                    onChange={(e) => {
                      const updated = [...stockItems];
                      updated[i].expirationDate = e.target.value;
                      setStockItems(updated);
                    }}
                    className="input-field w-40"
                    title="Date de péremption (optionnel)"
                  />
                  <button
                    type="button"
                    onClick={() => setStockItems(stockItems.filter((_, j) => j !== i))}
                    className="p-1.5 hover:bg-red-100 rounded text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setStockItems([...stockItems, { materialId: '', quantity: '', expirationDate: '' }])}
                className="btn-secondary text-sm w-full"
              >
                <Plus size={14} className="inline mr-1" />
                Ajouter un matériel
              </button>

              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                <Save size={16} />
                Enregistrer le stock
              </button>
            </form>
          ) : (
            <div>
              {storage.stockItems.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucun stock enregistré</p>
              ) : (
                <div className="space-y-2">
                  {storage.stockItems.map((s: any) => (
                    <div key={s.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="text-sm">{s.material.name}</span>
                        {s.expirationDate && (
                          <span className={`text-xs ml-2 ${
                            new Date(s.expirationDate) < new Date()
                              ? 'text-red-600 font-semibold'
                              : 'text-gray-500'
                          }`}>
                            (exp: {new Date(s.expirationDate).toLocaleDateString('fr-FR')})
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold">{s.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
