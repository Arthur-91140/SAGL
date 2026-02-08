import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicInventory } from '../../lib/api';
import toast from 'react-hot-toast';
import { ClipboardList, Play, Flag, MoreHorizontal } from 'lucide-react';

export default function InventoryStart() {
  const { uniqueLink } = useParams<{ uniqueLink: string }>();
  const navigate = useNavigate();
  const [storage, setStorage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [rescuerName, setRescuerName] = useState('');
  const [postName, setPostName] = useState('');
  const [postNumber, setPostNumber] = useState('');
  const [type, setType] = useState<string>('');

  useEffect(() => {
    publicInventory
      .get(uniqueLink!)
      .then(setStorage)
      .catch(() => setError('Stockage non trouvé. Vérifiez le lien.'))
      .finally(() => setLoading(false));
  }, [uniqueLink]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!rescuerName.trim()) {
      toast.error('Veuillez saisir votre nom');
      return;
    }

    if (!postName.trim() && !postNumber.trim()) {
      toast.error('Veuillez saisir le nom ou le numéro du poste');
      return;
    }

    if (!type) {
      toast.error("Veuillez sélectionner le type d'inventaire");
      return;
    }

    // Stocker les infos dans sessionStorage et naviguer
    sessionStorage.setItem(
      'sagl_inventory',
      JSON.stringify({ rescuerName, postName, postNumber, type })
    );
    navigate(`/i/${uniqueLink}/form`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <ClipboardList className="mx-auto text-gray-400 mb-4" size={48} />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="text-center text-white mb-8">
          <ClipboardList className="mx-auto mb-3" size={40} />
          <h1 className="text-2xl font-bold">Inventaire</h1>
          <p className="text-primary-200 mt-1">{storage?.name}</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Votre nom *
            </label>
            <input
              type="text"
              value={rescuerName}
              onChange={(e) => setRescuerName(e.target.value)}
              className="input-field text-lg py-3"
              placeholder="Prénom Nom"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nom du poste
            </label>
            <input
              type="text"
              value={postName}
              onChange={(e) => setPostName(e.target.value)}
              className="input-field text-lg py-3"
              placeholder="Ex: DPS Concert"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Numéro du poste
            </label>
            <input
              type="text"
              value={postNumber}
              onChange={(e) => setPostNumber(e.target.value)}
              className="input-field text-lg py-3"
              placeholder="Ex: 42"
            />
          </div>

          {(!postName.trim() && !postNumber.trim()) && (
            <p className="text-xs text-amber-600">
              Au moins un des deux champs (nom ou numéro du poste) doit être rempli.
            </p>
          )}

          {/* Type d'inventaire */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Type d'inventaire *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setType('START')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  type === 'START'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Play size={24} />
                <span className="text-xs font-semibold">Début</span>
              </button>

              <button
                type="button"
                onClick={() => setType('END')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  type === 'END'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Flag size={24} />
                <span className="text-xs font-semibold">Fin</span>
              </button>

              <button
                type="button"
                onClick={() => setType('OTHER')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  type === 'OTHER'
                    ? 'border-gray-500 bg-gray-50 text-gray-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <MoreHorizontal size={24} />
                <span className="text-xs font-semibold">Autre</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-4 text-lg font-semibold"
          >
            Commencer l'inventaire
          </button>
        </form>
      </div>
    </div>
  );
}
