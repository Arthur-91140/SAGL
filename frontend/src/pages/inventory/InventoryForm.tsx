import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicInventory } from '../../lib/api';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, Send, Minus, Plus } from 'lucide-react';

interface InventoryItemData {
  storageId: number;
  storageName: string;
  materialId: number;
  materialName: string;
  expected: number;
  quantityFound: number;
  quantityAdded: number;
}

function getGreetingMessage(type: string): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 10) {
    switch (type) {
      case 'START': return 'Bonne matinée et bon début de mission !';
      case 'END': return "Bonne matinée ! On espère que tout s'est bien passé.";
      default: return 'Bonne matinée !';
    }
  }
  if (hour >= 10 && hour < 14) {
    switch (type) {
      case 'START': return 'Bonne journée et bon courage pour cette mission !';
      case 'END': return "Bonne fin de matinée ! On espère que la mission s'est bien déroulée.";
      default: return 'Bonne journée !';
    }
  }
  if (hour >= 14 && hour < 18) {
    switch (type) {
      case 'START': return "Bon après-midi et bon début de mission !";
      case 'END': return "Bon après-midi ! On espère que tout s'est bien passé.";
      default: return "Bon après-midi !";
    }
  }
  if (hour >= 18 && hour < 21) {
    switch (type) {
      case 'START': return 'Bonne soirée et bon courage pour cette mission !';
      case 'END': return "Bonne soirée ! On espère que la mission s'est bien déroulée.";
      default: return 'Bonne soirée !';
    }
  }
  // 21h - 5h
  switch (type) {
    case 'START': return 'Bonne nuit et bon courage pour cette mission !';
    case 'END': return "Bonne nuit ! On espère que tout s'est bien passé.";
    default: return 'Bonne nuit !';
  }
}

export default function InventoryForm() {
  const { uniqueLink } = useParams<{ uniqueLink: string }>();
  const navigate = useNavigate();
  const [storage, setStorage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('sagl_inventory');
    if (!saved) {
      navigate(`/i/${uniqueLink}`);
      return;
    }
    setSessionData(JSON.parse(saved));

    publicInventory
      .get(uniqueLink!)
      .then((data) => {
        setStorage(data);
        // Construire la liste des items à inventorier
        const allItems: InventoryItemData[] = [];
        collectItems(data, allItems);
        setItems(allItems);
      })
      .catch(() => {
        toast.error('Erreur de chargement');
        navigate(`/i/${uniqueLink}`);
      })
      .finally(() => setLoading(false));
  }, [uniqueLink]);

  function collectItems(node: any, result: InventoryItemData[]) {
    if (node.templateItems) {
      for (const t of node.templateItems) {
        result.push({
          storageId: node.id,
          storageName: node.name,
          materialId: t.materialId,
          materialName: t.material.name,
          expected: t.expectedQuantity,
          quantityFound: t.expectedQuantity, // Par défaut, tout est présent
          quantityAdded: 0,
        });
      }
    }
    if (node.children) {
      for (const child of node.children) {
        collectItems(child, result);
      }
    }
  }

  function updateItem(index: number, field: 'quantityFound' | 'quantityAdded', value: number) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: Math.max(0, value) };
    setItems(updated);
  }

  async function handleSubmit() {
    if (!sessionData) return;

    setSubmitting(true);
    try {
      await publicInventory.submit(uniqueLink!, {
        rescuerName: sessionData.rescuerName,
        postName: sessionData.postName,
        postNumber: sessionData.postNumber,
        type: sessionData.type,
        items: items.map((item) => ({
          storageId: item.storageId,
          materialId: item.materialId,
          expected: item.expected,
          quantityFound: item.quantityFound,
          quantityAdded: item.quantityAdded,
        })),
      });

      sessionStorage.setItem('sagl_inventory_result', JSON.stringify({
        storageName: storage.name,
        type: sessionData.type,
        itemCount: items.length,
        addedCount: items.filter((i) => i.quantityAdded > 0).length,
        missingCount: items.filter((i) => i.quantityFound < i.expected).length,
      }));

      navigate(`/i/${uniqueLink}/complete`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const greeting = sessionData ? getGreetingMessage(sessionData.type) : '';

  // Grouper par stockage
  const groupedItems = new Map<string, { storageId: number; items: (InventoryItemData & { index: number })[] }>();
  items.forEach((item, index) => {
    const key = `${item.storageId}-${item.storageName}`;
    if (!groupedItems.has(key)) {
      groupedItems.set(key, { storageId: item.storageId, items: [] });
    }
    groupedItems.get(key)!.items.push({ ...item, index });
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-primary-600 text-white p-4 sticky top-0 z-10 shadow">
        <h1 className="text-lg font-bold text-center">{storage?.name}</h1>
        <p className="text-primary-200 text-center text-sm mt-0.5">
          {sessionData?.rescuerName}
          {sessionData?.postName ? ` — ${sessionData.postName}` : ''}
        </p>
      </div>

      {/* Greeting */}
      <div className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm border border-primary-100">
        <p className="text-primary-700 text-center font-medium">{greeting}</p>
      </div>

      {/* Items groupés par stockage */}
      <div className="p-4 space-y-4">
        {Array.from(groupedItems.entries()).map(([key, group]) => (
          <StorageGroup
            key={key}
            name={group.items[0].storageName}
            isRoot={group.storageId === storage?.id}
            items={group.items}
            onUpdate={updateItem}
          />
        ))}
      </div>

      {/* Résumé et soumission */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <div className="flex-1 text-sm">
            <span className="text-gray-500">{items.length} matériel(s)</span>
            {items.filter((i) => i.quantityAdded > 0).length > 0 && (
              <span className="text-green-600 ml-2">
                +{items.reduce((sum, i) => sum + i.quantityAdded, 0)} ajouté(s)
              </span>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary flex items-center gap-2 py-3 px-6"
          >
            <Send size={18} />
            {submitting ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StorageGroup({
  name,
  isRoot,
  items,
  onUpdate,
}: {
  name: string;
  isRoot: boolean;
  items: (InventoryItemData & { index: number })[];
  onUpdate: (index: number, field: 'quantityFound' | 'quantityAdded', value: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 p-4 text-left ${
          isRoot ? 'bg-primary-50' : 'bg-gray-50'
        }`}
      >
        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <span className="font-semibold">{name}</span>
        <span className="text-xs text-gray-500 ml-auto">{items.length} matériel(s)</span>
      </button>

      {expanded && (
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <MaterialRow key={item.index} item={item} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

function MaterialRow({
  item,
  onUpdate,
}: {
  item: InventoryItemData & { index: number };
  onUpdate: (index: number, field: 'quantityFound' | 'quantityAdded', value: number) => void;
}) {
  const isMissing = item.quantityFound < item.expected;

  return (
    <div className={`p-4 ${isMissing ? 'bg-red-50' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-sm">{item.materialName}</span>
        <span className="text-xs text-gray-500">Attendu : {item.expected}</span>
      </div>

      {/* Quantité trouvée */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">Quantité présente</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdate(item.index, 'quantityFound', item.quantityFound - 1)}
            className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center active:bg-gray-200"
          >
            <Minus size={16} />
          </button>
          <input
            type="number"
            value={item.quantityFound}
            onChange={(e) => onUpdate(item.index, 'quantityFound', parseInt(e.target.value) || 0)}
            className={`w-16 text-center text-lg font-bold rounded-lg border py-1 ${
              isMissing ? 'border-red-300 text-red-600 bg-red-50' : 'border-gray-300'
            }`}
            min="0"
          />
          <button
            onClick={() => onUpdate(item.index, 'quantityFound', item.quantityFound + 1)}
            className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center active:bg-gray-200"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Quantité ajoutée */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Quantité ajoutée</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdate(item.index, 'quantityAdded', item.quantityAdded - 1)}
            className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center active:bg-gray-200"
          >
            <Minus size={16} />
          </button>
          <input
            type="number"
            value={item.quantityAdded}
            onChange={(e) => onUpdate(item.index, 'quantityAdded', parseInt(e.target.value) || 0)}
            className="w-16 text-center text-lg font-bold border border-gray-300 rounded-lg py-1"
            min="0"
          />
          <button
            onClick={() => onUpdate(item.index, 'quantityAdded', item.quantityAdded + 1)}
            className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center active:bg-green-200"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {isMissing && (
        <p className="text-xs text-red-600 mt-2">
          Manquant : {item.expected - item.quantityFound} unité(s)
        </p>
      )}
    </div>
  );
}
