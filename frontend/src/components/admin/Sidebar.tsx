import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ClipboardList,
  BarChart3,
  Settings,
} from 'lucide-react';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/admin/materials', icon: Package, label: 'Matériels' },
  { to: '/admin/storages', icon: FolderTree, label: 'Stockages' },
  { to: '/admin/history', icon: ClipboardList, label: 'Historique' },
  { to: '/admin/stats', icon: BarChart3, label: 'Statistiques' },
  { to: '/admin/settings', icon: Settings, label: 'Paramètres' },
];

export default function Sidebar({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-primary-950 text-white">
      {/* Logo */}
      <div className="p-6 border-b border-primary-800">
        <h1 className="text-xl font-bold tracking-wide">SAGL</h1>
        <p className="text-xs text-primary-300 mt-1">Gestion d'inventaire</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-200 hover:bg-primary-800 hover:text-white'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-primary-800">
        <p className="text-xs text-primary-400 text-center">SAGL v1.0</p>
      </div>
    </div>
  );
}
