import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { notifications as notificationsApi } from '../../lib/api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadNotifications() {
    try {
      const data = await notificationsApi.get();
      setNotifications(data.notifications);
      setCount(data.count);
    } catch {
      // Silencieux
    }
  }

  const severityColors: Record<string, string> = {
    error: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-100">
            <h3 className="font-semibold text-sm">
              Notifications ({count})
            </h3>
          </div>

          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Aucune notification
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((n, i) => (
                <div
                  key={i}
                  className={`p-3 text-xs border-l-4 ${severityColors[n.severity] || 'bg-gray-50 text-gray-700 border-gray-200'}`}
                >
                  <p className="font-medium">{n.message}</p>
                  {n.type === 'expired' && n.expirationDate && (
                    <p className="mt-1 opacity-75">
                      Périmé le {new Date(n.expirationDate).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
