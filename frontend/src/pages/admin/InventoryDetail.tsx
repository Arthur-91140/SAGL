import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inventories } from '../../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, AlertTriangle, CheckCircle, PlusCircle } from 'lucide-react';

const typeLabels: Record<string, string> = {
  START: 'Début de mission',
  END: 'Fin de mission',
  OTHER: 'Autre',
};

export default function InventoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventories
      .get(parseInt(id!))
      .then(setInventory)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!inventory) {
    return <p className="text-center text-gray-500">Inventaire non trouvé</p>;
  }

  // Grouper par stockage
  const groupedItems = new Map<string, any[]>();
  for (const item of inventory.items) {
    const key = item.storage.name;
    if (!groupedItems.has(key)) {
      groupedItems.set(key, []);
    }
    groupedItems.get(key)!.push(item);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/history')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Détail de l'inventaire</h1>
      </div>

      {/* Info générales */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Secouriste</p>
            <p className="font-semibold">{inventory.rescuerName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Stockage</p>
            <p className="font-semibold">{inventory.storage?.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Type</p>
            <p className="font-semibold">{typeLabels[inventory.type] || inventory.type}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
            <p className="font-semibold">
              {new Date(inventory.createdAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
        {(inventory.postName || inventory.postNumber) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Poste : {inventory.postName} {inventory.postNumber ? `(#${inventory.postNumber})` : ''}
            </p>
          </div>
        )}
        {inventory.greeting && (
          <div className="mt-2">
            <p className="text-sm text-gray-500 italic">"{inventory.greeting}"</p>
          </div>
        )}
      </div>

      {/* Items par stockage */}
      {Array.from(groupedItems.entries()).map(([storageName, items]) => (
        <div key={storageName} className="card mb-4">
          <h3 className="font-semibold text-lg mb-3">{storageName}</h3>
          <div className="space-y-2">
            {items.map((item: any) => {
              const isMissing = item.quantityFound < item.expected;
              const wasAdded = item.quantityAdded > 0;

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isMissing ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isMissing ? (
                      <AlertTriangle size={16} className="text-red-500" />
                    ) : (
                      <CheckCircle size={16} className="text-green-500" />
                    )}
                    <span className="text-sm font-medium">{item.material.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">Attendu: {item.expected}</span>
                    <span className={isMissing ? 'text-red-600 font-semibold' : ''}>
                      Trouvé: {item.quantityFound}
                    </span>
                    {wasAdded && (
                      <span className="text-green-600 font-semibold flex items-center gap-1">
                        <PlusCircle size={14} />
                        Ajouté: {item.quantityAdded}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
