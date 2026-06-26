import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

const TITLES = {
  '/dashboard':     { title: 'Dashboard',       sub: 'Resumen general del sistema de calidad' },
  '/expedientes':   { title: 'Expedientes',      sub: 'Gestión de expedientes de calidad' },
  '/indicadores':   { title: 'Indicadores',      sub: 'KPIs y métricas mensuales' },
  '/ordenes':       { title: 'Órdenes',          sub: 'Órdenes de producción' },
  '/reportes':      { title: 'Reportes',         sub: 'Generación de reportes' },
  '/recepciones':      { title: 'Recepciones',         sub: 'Recepción de Materia Prima' },
  '/configuracion': { title: 'Configuración',    sub: 'Ajustes del sistema' },
};

export default function Layout({ children }) {
  const location = useLocation();
  const info = TITLES[location.pathname] || { title: 'NÜX Quality Manager', sub: '' };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-card border-b border-border px-6 py-4 flex-shrink-0">
          <h1 className="text-xl font-semibold text-foreground">{info.title}</h1>
          {info.sub && <p className="text-sm text-muted-foreground mt-0.5">{info.sub}</p>}
        </header>
        <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
          {children}
        </div>
      </main>
    </div>
  );
}
