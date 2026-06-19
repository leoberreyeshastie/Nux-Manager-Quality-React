import { useEffect, useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useExpedientes } from '../context/ExpedientesContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import {
  FolderOpen, FolderCheck, Package, AlertTriangle,
  TrendingUp, RefreshCw, Loader2
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

function computeMetrics(expedientes) {
  const active = expedientes.filter(e => e.estado !== 'ANULADO');
  let abiertos = 0, cerrados = 0, piezasProducidas = 0, defectos = 0, recuperadas = 0;
  active.forEach(exp => {
    if (exp.estado === 'ABIERTO' || exp.estado === 'EN_PROCESO') abiertos++;
    if (exp.estado === 'CERRADO') cerrados++;
    piezasProducidas += exp.cantidad_producida || 0;
    (exp.hallazgos || []).forEach(h => {
      defectos += h.piezas_detectadas || 0;
      recuperadas += h.piezas_recuperadas || 0;
    });
  });
  const calidad = piezasProducidas > 0 ? ((piezasProducidas - defectos) / piezasProducidas) * 100 : 0;
  const recuperacion = defectos > 0 ? (recuperadas / defectos) * 100 : 0;
  return { abiertos, cerrados, piezasProducidas, defectos, calidad, recuperacion };
}

function computePareto(expedientes) {
  const resumen = {};
  expedientes.filter(e => e.estado !== 'ANULADO').forEach(exp => {
    (exp.hallazgos || []).forEach(h => {
      const defecto = h.defecto_id || 'Otro'; // Podrías mapear al nombre del catálogo si quieres
      resumen[defecto] = (resumen[defecto] || 0) + (h.piezas_detectadas || 0);
    });
  });
  return Object.entries(resumen)
    .map(([defecto, cantidad]) => ({ defecto, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 8);
}

function computeTrend(expedientes) {
  const byMonth = {};
  expedientes.filter(e => e.estado !== 'ANULADO').forEach(exp => {
    const key = exp.mes_produccion && exp.anio_produccion
      ? `${exp.anio_produccion}-${String(exp.mes_produccion).padStart(2, '0')}`
      : null;
    if (!key) return;
    if (!byMonth[key]) byMonth[key] = 0;
    (exp.hallazgos || []).forEach(h => { byMonth[key] += h.piezas_detectadas || 0; });
  });
  const sorted = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  return { labels: sorted.map(([k]) => k), data: sorted.map(([, v]) => v) };
}

const KPI_CARDS = [
  { key: 'abiertos',        label: 'Expedientes Activos',    Icon: FolderOpen,    color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950/30',   fmt: v => v },
  { key: 'cerrados',        label: 'Expedientes Cerrados',   Icon: FolderCheck,   color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', fmt: v => v },
  { key: 'piezasProducidas',label: 'Piezas Inspeccionadas',  Icon: Package,       color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30', fmt: v => v.toLocaleString() },
  { key: 'defectos',        label: 'Hallazgos Detectados',   Icon: AlertTriangle, color: 'text-rose-600',   bg: 'bg-rose-50 dark:bg-rose-950/30',   fmt: v => v },
  { key: 'calidad',         label: 'Calidad General',        Icon: TrendingUp,    color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', fmt: v => `${v.toFixed(2)}%` },
  { key: 'recuperacion',    label: 'Tasa de Recuperación',   Icon: RefreshCw,     color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-950/30',  fmt: v => `${v.toFixed(2)}%` },
];

const CHART_OPTIONS = {
  responsive: true,
  plugins: { legend: { position: 'top' } },
  scales: { y: { beginAtZero: true } },
};

export default function Dashboard() {
  const { expedientes, loading } = useExpedientes();
  const [error, setError] = useState(null);

  useEffect(() => {
    // Si hay algún error de carga, se mostrará desde el contexto
    // Podemos agregar un estado de error en el contexto si se desea.
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!expedientes || expedientes.length === 0) {
    return (
      <div className="rounded-lg bg-muted/30 border border-border p-8 text-center text-muted-foreground">
        <p>No hay expedientes cargados.</p>
      </div>
    );
  }

  const metrics = computeMetrics(expedientes);
  const pareto = computePareto(expedientes);
  const trend = computeTrend(expedientes);

  const trendData = {
    labels: trend.labels.length ? trend.labels : ['Sin datos'],
    datasets: [{
      label: 'Hallazgos por Mes',
      data: trend.data.length ? trend.data : [0],
      borderColor: 'hsl(221 83% 53%)',
      backgroundColor: 'hsla(221, 83%, 53%, 0.1)',
      tension: 0.4,
      fill: true,
    }],
  };

  const paretoData = {
    labels: pareto.length ? pareto.map(p => p.defecto) : ['Sin datos'],
    datasets: [{
      label: 'Piezas Detectadas',
      data: pareto.length ? pareto.map(p => p.cantidad) : [0],
      backgroundColor: 'hsl(221 83% 53%)',
      borderRadius: 6,
    }],
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {KPI_CARDS.map(({ key, label, Icon, color, bg, fmt }) => (
          <Card key={key} className="hover:-translate-y-1 transition-transform duration-200">
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{fmt(metrics[key])}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendencia de Hallazgos</CardTitle>
          </CardHeader>
          <CardContent>
            <Line data={trendData} options={CHART_OPTIONS} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pareto de Defectos</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={paretoData} options={CHART_OPTIONS} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}