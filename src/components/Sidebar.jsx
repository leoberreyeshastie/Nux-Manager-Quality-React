import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { cn } from '../lib/utils.js';
import {
  LayoutDashboard, FolderOpen, BarChart2,
  ClipboardList, FileText, Settings, LogOut, ShieldCheck, Truck  // <-- AGREGAR Truck
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard',    label: 'Dashboard',      Icon: LayoutDashboard },
  { to: '/expedientes',  label: 'Expedientes',    Icon: FolderOpen },
  { to: '/indicadores',  label: 'Indicadores',    Icon: BarChart2 },
  { to: '/ordenes',      label: 'Órdenes',        Icon: ClipboardList },
  { to: '/reportes',     label: 'Reportes',       Icon: FileText },
  { to: '/recepciones',  label: 'Recepciones',    Icon: Truck },          // <-- AGREGADO
  { to: '/configuracion',label: 'Configuración',  Icon: Settings },
];

export default function Sidebar() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="flex flex-col w-64 h-full bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-bold text-sm tracking-widest text-white">NÜX</p>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Quality Manager</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary uppercase">
              {
                profile?.nombre
                    ?.split(' ')
                    .map(x => x[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                    || 'U'
              }
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.nombre || 'Usuario'}</p>
            <p className="text-xs text-white/40"> {profile?.rol || 'ROL'} </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}