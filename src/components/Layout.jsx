import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import { Menu, X, Heart, Code } from 'lucide-react';
import { cn } from '../lib/utils.js';

const TITLES = {
  '/dashboard':     { title: 'Dashboard',       sub: 'Resumen general del sistema de calidad' },
  '/expedientes':   { title: 'Expedientes',      sub: 'Gestión de expedientes de calidad' },
  '/indicadores':   { title: 'Indicadores',      sub: 'KPIs y métricas mensuales' },
  '/ordenes':       { title: 'Órdenes',          sub: 'Órdenes de producción' },
  '/reportes':      { title: 'Reportes',         sub: 'Generación de reportes' },
  '/recepciones':   { title: 'Recepciones',      sub: 'Recepción de Materia Prima' },
  '/configuracion': { title: 'Configuración',    sub: 'Ajustes del sistema' },
};

export default function Layout({ children }) {
  const location = useLocation();
  const info = TITLES[location.pathname] || { title: 'NÜX Quality Manager', sub: '' };
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex min-h-screen bg-background">
      <div
        className={cn(
          'transition-all duration-300 ease-in-out flex-shrink-0',
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        )}
      >
        <Sidebar />
      </div>

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header fijo */}
        <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 flex-shrink-0 flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{info.title}</h1>
            {info.sub && <p className="text-sm text-muted-foreground mt-0.5">{info.sub}</p>}
          </div>
        </header>

        {/* Contenido */}
        <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
          {children}
        </div>

        {/* FOOTER */}
        <footer className="border-t border-border/60 px-10 py-4 mt-auto bg-card/30 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground/80">NÜX Quality Manager</span>
              <span className="text-border">•</span>
              <span>v2.0</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Hecho por:</span>
              <span className="font-medium text-foreground/80">Ing. Leober Reyes Hastie</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}