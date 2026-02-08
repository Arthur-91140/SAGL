import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertTriangle, PlusCircle } from 'lucide-react';

export default function InventoryComplete() {
  const { uniqueLink } = useParams<{ uniqueLink: string }>();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('sagl_inventory_result');
    if (saved) {
      setResult(JSON.parse(saved));
      sessionStorage.removeItem('sagl_inventory');
      sessionStorage.removeItem('sagl_inventory_result');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 to-green-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={56} />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Inventaire envoyé !</h1>
        <p className="text-gray-500 mb-6">
          Merci pour votre travail sur {result?.storageName || 'ce stockage'}.
        </p>

        {result && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center gap-2 text-sm">
              <CheckCircle size={16} className="text-green-500" />
              <span>{result.itemCount} matériel(s) vérifiés</span>
            </div>

            {result.addedCount > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                <PlusCircle size={16} />
                <span>{result.addedCount} matériel(s) réassortis</span>
              </div>
            )}

            {result.missingCount > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-amber-600">
                <AlertTriangle size={16} />
                <span>{result.missingCount} matériel(s) manquants signalés</span>
              </div>
            )}
          </div>
        )}

        <a
          href={`/i/${uniqueLink}`}
          className="btn-primary inline-block w-full py-3"
        >
          Nouvel inventaire
        </a>
      </div>
    </div>
  );
}
