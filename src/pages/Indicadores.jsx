import { useEffect, useState, useRef } from 'react';
import { useExpedientes } from '../context/ExpedientesContext';
import { useCatalogos } from '../context/CatalogosContext';
import { MONTHS } from '../data/months.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Label } from '../components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.jsx';
import { Input } from '../components/ui/input.jsx';
import { Badge } from '../components/ui/badge.jsx';
import {
  BarChart2, Calculator, Loader2, FolderOpen, Briefcase, Building,
  AlertTriangle, Package, TrendingUp, ChevronDown, ChevronRight,
  PieChart, List, FileSearch, Download
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ReportePDF } from '../components/ReportePDF';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

// ============================================================
// 1. FUNCIONES DE CÁLCULO
// ============================================================

/**
 * Obtiene la lista de expedientes activos en el mes (con hallazgos en el mes, o creados/cerrados en el mes)
 * y también calcula métricas agregadas.
 */
function getActiveOrdersAndMetrics(expedientes, mes, anio) {
  const activos = expedientes.filter(e => e.estado !== 'ANULADO');
  const isDateInMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getFullYear() === anio && d.getMonth() === mes - 1;
  };

  // Identificar expedientes activos en el mes
  const expedientesActivos = activos.filter(exp => {
    const tieneHallazgosEnMes = (exp.hallazgos || []).some(h => isDateInMonth(h.fecha_deteccion));
    const creadoEnMes = isDateInMonth(exp.fecha_creacion);
    const cerradoEnMes = exp.estado === 'CERRADO' && isDateInMonth(exp.updated_at);
    return tieneHallazgosEnMes || creadoEnMes || cerradoEnMes;
  });

  // Construir lista detallada de órdenes con sus métricas
  const ordenesConDetalle = expedientesActivos.map(exp => {
    // Filtrar hallazgos del mes para esta orden
    const hallazgosMes = (exp.hallazgos || []).filter(h => isDateInMonth(h.fecha_deteccion));
    const totalHallazgos = hallazgosMes.length;
    let defectos = 0;
    hallazgosMes.forEach(h => { defectos += h.piezas_detectadas || 0; });
    const produccion = exp.cantidad_producida || 0;
    const calidad = produccion > 0 ? ((produccion - defectos) / produccion) * 100 : 0;

    return {
      id: exp.id,
      codigo: exp.expediente_id,
      cliente: exp.cliente || '—',
      producto: exp.producto || '—',
      estado: exp.estado || 'ABIERTO',
      interna: exp.interna === true,
      piezasProducidas: produccion,
      hallazgos: totalHallazgos,
      defectos,
      calidad,
      fechaCreacion: exp.fecha_creacion,
      fechaCierre: exp.estado === 'CERRADO' ? exp.updated_at : null
    };
  });

  // Calcular métricas agregadas
  let totalOrdenes = ordenesConDetalle.length;
  let internas = ordenesConDetalle.filter(o => o.interna).length;
  let externas = ordenesConDetalle.filter(o => !o.interna).length;
  let piezasProduccion = 0;
  let piezasDetectadas = 0;
  let piezasRecuperadas = 0;
  let piezasRechazadas = 0;
  let totalHallazgos = 0;

  ordenesConDetalle.forEach(exp => {
    piezasProduccion += exp.piezasProducidas;
    // Para hallazgos del mes, necesitamos volver a recorrer los hallazgos originales
    const expOriginal = expedientes.find(e => e.id === exp.id);
    if (expOriginal) {
      (expOriginal.hallazgos || []).forEach(h => {
        if (isDateInMonth(h.fecha_deteccion)) {
          piezasDetectadas += h.piezas_detectadas || 0;
          piezasRecuperadas += h.piezas_recuperadas || 0;
          piezasRechazadas += h.piezas_rechazadas || 0;
          totalHallazgos++;
        }
      });
    }
  });

  const calidad = piezasProduccion > 0
    ? ((piezasProduccion - piezasDetectadas) / piezasProduccion) * 100
    : 0;
  const recuperacion = piezasDetectadas > 0
    ? (piezasRecuperadas / piezasDetectadas) * 100
    : 0;
  const rechazo = piezasDetectadas > 0
    ? (piezasRechazadas / piezasDetectadas) * 100
    : 0;

  return {
    metrics: {
      totalOrdenes,
      internas,
      externas,
      piezasProduccion,
      piezasDetectadas,
      piezasRecuperadas,
      piezasRechazadas,
      totalHallazgos,
      calidad,
      recuperacion,
      rechazo
    },
    ordenes: ordenesConDetalle
  };
}

/**
 * Pareto de Defectos (solo hallazgos del mes)
 */
function getParetoDefectos(expedientes, mes, anio) {
  const isDateInMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getFullYear() === anio && d.getMonth() === mes - 1;
  };
  const resumen = {};
  expedientes.forEach(exp => {
    if (exp.estado === 'ANULADO') return;
    (exp.hallazgos || []).forEach(h => {
      if (isDateInMonth(h.fecha_deteccion)) {
        const defecto = h.defecto_id || 'Otro';
        resumen[defecto] = (resumen[defecto] || 0) + (h.piezas_detectadas || 0);
      }
    });
  });
  return Object.entries(resumen)
    .map(([defecto, total]) => ({ defecto, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Pareto de Procesos (solo hallazgos del mes)
 */
function getParetoProcesos(expedientes, mes, anio) {
  const isDateInMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getFullYear() === anio && d.getMonth() === mes - 1;
  };
  const resumen = {};
  expedientes.forEach(exp => {
    if (exp.estado === 'ANULADO') return;
    (exp.hallazgos || []).forEach(h => {
      if (isDateInMonth(h.fecha_deteccion)) {
        const proceso = h.proceso_id || 'Otro';
        resumen[proceso] = (resumen[proceso] || 0) + (h.piezas_detectadas || 0);
      }
    });
  });
  return Object.entries(resumen)
    .map(([proceso, total]) => ({ proceso, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Ranking de órdenes con hallazgos en el mes
 */
function getOrdersRanking(expedientes, mes, anio) {
  const isDateInMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getFullYear() === anio && d.getMonth() === mes - 1;
  };
  const result = [];
  expedientes.forEach(exp => {
    if (exp.estado === 'ANULADO') return;
    const hallazgosMes = (exp.hallazgos || []).filter(h => isDateInMonth(h.fecha_deteccion));
    if (hallazgosMes.length === 0) return;
    let defectos = 0;
    hallazgosMes.forEach(h => { defectos += h.piezas_detectadas || 0; });
    const produccion = exp.cantidad_producida || 0;
    const calidad = produccion > 0 ? ((produccion - defectos) / produccion) * 100 : 0;
    result.push({
      codigoOrden: exp.expediente_id,
      cliente: exp.cliente,
      producto: exp.producto,
      produccion,
      defectos,
      calidad,
      hallazgos: hallazgosMes.length
    });
  });
  return result;
}

/**
 * Detalle de Defectos por Orden
 */
function getDetalleDefectosPorOrden(expedientes, mes, anio) {
  const isDateInMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getFullYear() === anio && d.getMonth() === mes - 1;
  };

  const defectosMap = {};

  expedientes.forEach(exp => {
    if (exp.estado === 'ANULADO') return;
    const produccionTotal = exp.cantidad_producida || 0;
    
    (exp.hallazgos || []).forEach(h => {
      if (isDateInMonth(h.fecha_deteccion)) {
        const defectoId = h.defecto_id || 'Otro';
        if (!defectosMap[defectoId]) {
          defectosMap[defectoId] = {
            defectoId,
            totalPiezas: 0,
            ordenes: {}
          };
        }
        defectosMap[defectoId].totalPiezas += h.piezas_detectadas || 0;

        const ordenKey = exp.id;
        if (!defectosMap[defectoId].ordenes[ordenKey]) {
          defectosMap[defectoId].ordenes[ordenKey] = {
            codigo: exp.expediente_id,
            cliente: exp.cliente || '—',
            producto: exp.producto || '—',
            produccionTotal: produccionTotal,
            piezasDetectadas: 0,
            piezasRecuperadas: 0,
            piezasRechazadas: 0,
          };
        }
        defectosMap[defectoId].ordenes[ordenKey].piezasDetectadas += h.piezas_detectadas || 0;
        defectosMap[defectoId].ordenes[ordenKey].piezasRecuperadas += h.piezas_recuperadas || 0;
        defectosMap[defectoId].ordenes[ordenKey].piezasRechazadas += h.piezas_rechazadas || 0;
      }
    });
  });

  const resultado = Object.values(defectosMap).map(def => ({
    ...def,
    ordenes: Object.values(def.ordenes).map(ord => ({
      ...ord,
      porcentajeProduccion: ord.produccionTotal > 0 
        ? (ord.piezasDetectadas / ord.produccionTotal) * 100 
        : 0
    })),
    totalOrdenes: Object.keys(def.ordenes).length
  })).sort((a, b) => b.totalPiezas - a.totalPiezas);

  return resultado;
}

/**
 * Evolución mensual de indicadores para los últimos N meses
 */
function getEvolucionMensual(expedientes, mesesAtras = 6, mesActual, anioActual) {
  const resultados = [];
  
  // Generar lista de meses hacia atrás
  for (let i = mesesAtras - 1; i >= 0; i--) {
    let mes = mesActual - i;
    let anio = anioActual;
    if (mes <= 0) {
      mes += 12;
      anio -= 1;
    }
    
    const { metrics } = getActiveOrdersAndMetrics(expedientes, mes, anio);
    resultados.push({
      mes,
      anio,
      label: `${MONTHS[mes]} ${anio}`,
      metrics
    });
  }
  
  return resultados;
}

// ============================================================
// 2. COMPONENTES UI
// ============================================================

// ---------- ACCORDION ----------
function AccordionSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-primary" />}
          <span className="font-semibold">{title}</span>
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 border-t border-border">
          {children}
        </div>
      )}
    </Card>
  );
}

// ---------- TABLA DE ÓRDENES ----------
function TablaOrdenes({ title, ordenes, showTipo = false }) {
  if (ordenes.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-2">No hay órdenes para mostrar en esta categoría.</p>
        </CardContent>
      </Card>
    );
  }

  const columnas = ['Código', 'Cliente', 'Producto', 'Estado', 'Piezas', 'Hallazgos', 'Defectos', 'Calidad'];
  if (showTipo) columnas.splice(1, 0, 'Tipo');

  const rows = ordenes.map(o => {
    const row = [
      o.codigo,
      o.cliente,
      o.producto,
      o.estado,
      o.piezasProducidas,
      o.hallazgos,
      o.defectos,
      `${o.calidad.toFixed(2)}%`
    ];
    if (showTipo) {
      row.splice(1, 0, o.interna ? 'Interna' : 'Externa');
    }
    return row;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title} ({ordenes.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {columnas.map(c => (
                  <th key={c} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="py-2.5 px-3 text-foreground">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- TABLA DE DEFECTOS POR ORDEN ----------
function TablaDefectosPorOrden({ defecto, catalogosMap }) {
  const nombreDefecto = catalogosMap[defecto.defectoId] || defecto.defectoId;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            {nombreDefecto}
            <Badge variant="outline" className="ml-2">
              {defecto.totalOrdenes} órdenes
            </Badge>
            <Badge variant="outline" className="ml-1">
              {defecto.totalPiezas} piezas totales
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {defecto.ordenes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin órdenes para este defecto.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orden</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Producto</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detectadas</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recuperadas</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rechazadas</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">% del Total</th>
                </tr>
              </thead>
              <tbody>
                {defecto.ordenes.map((ord, idx) => (
                  <tr key={idx} className="border-t border-border/50 hover:bg-muted/40 transition-colors">
                    <td className="py-2.5 px-3 font-medium">{ord.codigo}</td>
                    <td className="py-2.5 px-3">{ord.cliente}</td>
                    <td className="py-2.5 px-3">{ord.producto}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{ord.piezasDetectadas}</td>
                    <td className="py-2.5 px-3 text-right">{ord.piezasRecuperadas}</td>
                    <td className="py-2.5 px-3 text-right">{ord.piezasRechazadas}</td>
                    <td className="py-2.5 px-3 text-right font-medium">
                      {ord.porcentajeProduccion.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- EVOLUCIÓN MENSUAL ----------
function EvolucionMensual({ datosEvolucion }) {
  // Preparar datos para gráfico
  const labels = datosEvolucion.map(d => d.label);
  const dataTotalOrdenes = datosEvolucion.map(d => d.metrics.totalOrdenes);
  const dataInternas = datosEvolucion.map(d => d.metrics.internas);
  const dataExternas = datosEvolucion.map(d => d.metrics.externas);
  const dataHallazgos = datosEvolucion.map(d => d.metrics.totalHallazgos);
  const dataPiezas = datosEvolucion.map(d => d.metrics.piezasProduccion);
  const dataCalidad = datosEvolucion.map(d => d.metrics.calidad);

  // Calcular tendencias (vs mes anterior)
  const getTendencia = (data, index) => {
    if (index === 0) return { icon: '—', color: 'text-gray-400', label: '—' };
    const diff = data[index] - data[index-1];
    if (diff > 0) return { icon: '▲', color: 'text-emerald-600', label: `${diff.toFixed(1)}%` };
    if (diff < 0) return { icon: '▼', color: 'text-rose-600', label: `${Math.abs(diff).toFixed(1)}%` };
    return { icon: '•', color: 'text-gray-400', label: '0%' };
  };

  const lastIdx = datosEvolucion.length - 1;
  const tendencias = {
    totalOrdenes: getTendencia(dataTotalOrdenes, lastIdx),
    internas: getTendencia(dataInternas, lastIdx),
    externas: getTendencia(dataExternas, lastIdx),
    hallazgos: getTendencia(dataHallazgos, lastIdx),
    piezas: getTendencia(dataPiezas, lastIdx),
    calidad: getTendencia(dataCalidad, lastIdx),
  };

  return (
    <div className="space-y-6">
      {/* Cards de tendencia */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: 'totalOrdenes', label: 'Órdenes', value: dataTotalOrdenes[lastIdx], tendencia: tendencias.totalOrdenes },
          { key: 'internas', label: 'Internas', value: dataInternas[lastIdx], tendencia: tendencias.internas },
          { key: 'externas', label: 'Externas', value: dataExternas[lastIdx], tendencia: tendencias.externas },
          { key: 'hallazgos', label: 'Hallazgos', value: dataHallazgos[lastIdx], tendencia: tendencias.hallazgos },
          { key: 'piezas', label: 'Piezas', value: dataPiezas[lastIdx], tendencia: tendencias.piezas },
          { key: 'calidad', label: '% Calidad', value: dataCalidad[lastIdx], tendencia: tendencias.calidad, isPercent: true },
        ].map((item) => (
          <div key={item.key} className="text-center p-3 rounded-xl bg-muted/50 border border-border">
            <p className="text-2xl font-bold text-foreground">
              {item.isPercent ? item.value.toFixed(1) + '%' : item.value}
            </p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <span className={cn('text-xs font-semibold', item.tendencia.color)}>
                {item.tendencia.icon} {item.tendencia.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico + Tabla comparativa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80">
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: 'Total Órdenes',
                  data: dataTotalOrdenes,
                  borderColor: 'hsl(221, 83%, 53%)',
                  backgroundColor: 'hsla(221, 83%, 53%, 0.1)',
                  tension: 0.3,
                  fill: false,
                  yAxisID: 'y',
                },
                {
                  label: 'Internas',
                  data: dataInternas,
                  borderColor: 'hsl(280, 60%, 50%)',
                  backgroundColor: 'hsla(280, 60%, 50%, 0.1)',
                  tension: 0.3,
                  fill: false,
                  yAxisID: 'y',
                },
                {
                  label: 'Externas',
                  data: dataExternas,
                  borderColor: 'hsl(160, 84%, 39%)',
                  backgroundColor: 'hsla(160, 84%, 39%, 0.1)',
                  tension: 0.3,
                  fill: false,
                  yAxisID: 'y',
                },
                {
                  label: 'Hallazgos',
                  data: dataHallazgos,
                  borderColor: 'hsl(0, 72%, 51%)',
                  backgroundColor: 'hsla(0, 72%, 51%, 0.1)',
                  tension: 0.3,
                  fill: false,
                  yAxisID: 'y',
                },
                {
                  label: 'Piezas',
                  data: dataPiezas,
                  borderColor: 'hsl(45, 93%, 47%)',
                  backgroundColor: 'hsla(45, 93%, 47%, 0.1)',
                  tension: 0.3,
                  fill: false,
                  yAxisID: 'y1',
                },
                {
                  label: '% Calidad',
                  data: dataCalidad,
                  borderColor: 'hsl(142, 76%, 36%)',
                  backgroundColor: 'hsla(142, 76%, 36%, 0.1)',
                  tension: 0.3,
                  fill: false,
                  yAxisID: 'y1',
                  borderDash: [5, 5],
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: 'index', intersect: false },
              plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Evolución Mensual de KPIs' },
              },
              scales: {
                y: {
                  type: 'linear',
                  display: true,
                  position: 'left',
                  title: { display: true, text: 'Cantidad' },
                  beginAtZero: true,
                },
                y1: {
                  type: 'linear',
                  display: true,
                  position: 'right',
                  title: { display: true, text: 'Piezas / %' },
                  beginAtZero: true,
                  grid: { drawOnChartArea: false },
                },
              },
            }}
          />
        </div>
        <div className="lg:col-span-1">
          <h4 className="text-sm font-medium mb-2">Comparativa Mensual</h4>
          <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Mes</th>
                  <th className="px-3 py-2 text-right">Órdenes</th>
                  <th className="px-3 py-2 text-right">Hallazgos</th>
                  <th className="px-3 py-2 text-right">% Calidad</th>
                </tr>
              </thead>
              <tbody>
                {datosEvolucion.map((d, idx) => (
                  <tr key={idx} className={cn('border-t', idx === lastIdx && 'bg-primary/5 font-medium')}>
                    <td className="px-3 py-2">{d.label}</td>
                    <td className="px-3 py-2 text-right">{d.metrics.totalOrdenes}</td>
                    <td className="px-3 py-2 text-right">{d.metrics.totalHallazgos}</td>
                    <td className="px-3 py-2 text-right">{d.metrics.calidad.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- TABLA GENÉRICA (DataTable) ----------
function DataTable({ title, cols, rows }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Sin datos para este período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {cols.map(c => (
                    <th key={c} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                    {row.map((cell, j) => (
                      <td key={j} className="py-2.5 px-3 text-foreground">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// 3. COMPONENTE PRINCIPAL
// ============================================================

export default function Indicadores() {
  const { expedientes, loading } = useExpedientes();
  const { catalogosMap } = useCatalogos();

  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [resultado, setResultado] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  // Datos de evolución (se calculan siempre)
  const datosEvolucion = getEvolucionMensual(expedientes, 6, Number(mes), Number(anio));

  function calcular() {
    setCalculando(true);
    setMostrarResultados(false);
    const m = Number(mes);
    const a = Number(anio);

    setTimeout(() => {
      const { metrics, ordenes } = getActiveOrdersAndMetrics(expedientes, m, a);
      const paretoDefectos = getParetoDefectos(expedientes, m, a);
      const paretoProcesos = getParetoProcesos(expedientes, m, a);
      const orders = getOrdersRanking(expedientes, m, a);
      const detalleDefectos = getDetalleDefectosPorOrden(expedientes, m, a);

      const topOrders = [...orders].sort((a, b) => b.defectos - a.defectos).slice(0, 10);
      const bestOrders = [...orders].sort((a, b) => b.calidad - a.calidad).slice(0, 10);
      const worstOrders = [...orders].sort((a, b) => a.calidad - b.calidad).slice(0, 10);

      setResultado({
        metrics,
        ordenes,
        paretoDefectos,
        paretoProcesos,
        topOrders,
        bestOrders,
        worstOrders,
        detalleDefectos
      });
      setMostrarResultados(true);
      setCalculando(false);
    }, 100);
  }

  useEffect(() => {
    calcular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preparar datos para el reporte PDF
  const generarDatosReporte = () => {
    if (!resultado) return null;
    const ordenesConHallazgos = resultado.ordenes.map(orden => {
      const expOriginal = expedientes.find(e => e.id === orden.id);
      const hallazgosMes = (expOriginal?.hallazgos || [])
        .filter(h => {
          const d = new Date(h.fecha_deteccion);
          return d.getFullYear() === Number(anio) && d.getMonth() === Number(mes) - 1;
        })
        .map(h => ({
          ...h,
          defectoNombre: catalogosMap[h.defecto_id] || h.defecto_id || 'Defecto',
          accionNombre: catalogosMap[h.accion_id] || h.accion_id || 'N/A',
          procesoNombre: catalogosMap[h.proceso_id] || h.proceso_id || 'N/A',
          evidencias: h.evidencias || []
        }));
      return {
        ...orden,
        hallazgosCompletos: hallazgosMes
      };
    });

    return {
      ordenes: ordenesConHallazgos,
      metrics: resultado.metrics,
      paretoDefectos: resultado.paretoDefectos,
      detalleDefectos: resultado.detalleDefectos
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getChartColors = (count) => {
    const colors = [
      'hsl(221, 83%, 53%)', 'hsl(190, 95%, 46%)', 'hsl(340, 82%, 52%)',
      'hsl(45, 93%, 47%)', 'hsl(280, 60%, 50%)', 'hsl(160, 84%, 39%)',
      'hsl(0, 72%, 51%)', 'hsl(210, 70%, 50%)', 'hsl(320, 70%, 55%)',
      'hsl(30, 90%, 50%)'
    ];
    return colors.slice(0, count);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Panel de control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Indicadores de Calidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5 w-44">
              <Label>Mes</Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MONTHS).map(([id, nombre]) => (
                    <SelectItem key={id} value={String(id)}>{nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-28">
              <Label>Año</Label>
              <Input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))} />
            </div>
            <Button onClick={calcular} disabled={calculando} className="gap-2">
              {calculando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              Calcular
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {mostrarResultados && resultado && (
        <>
          {/* Botón de descarga PDF */}
          <div className="flex justify-end">
            <PDFDownloadLink
              document={<ReportePDF 
                datos={generarDatosReporte()} 
                mes={Number(mes)} 
                anio={Number(anio)} 
                logoUrl="/logo-nux.png"
              />}
              fileName={`Reporte_Indicadores_${MONTHS[mes]}_${anio}.pdf`}
            >
              {({ loading }) => (
                <Button disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Descargar Reporte PDF
                </Button>
              )}
            </PDFDownloadLink>
          </div>

          <div className="space-y-4">
            {/* Evolución Mensual */}
            <AccordionSection title="Evolución Mensual" icon={TrendingUp} defaultOpen={true}>
              <EvolucionMensual datosEvolucion={datosEvolucion} />
            </AccordionSection>

            {/* KPIs Generales */}
            <AccordionSection title="KPIs Generales" icon={BarChart2} defaultOpen={false}>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  { key: 'totalOrdenes', label: 'Total Órdenes', Icon: FolderOpen, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', fmt: v => v },
                  { key: 'internas', label: 'Órdenes Internas', Icon: Briefcase, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30', fmt: v => v },
                  { key: 'externas', label: 'Órdenes Externas', Icon: Building, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', fmt: v => v },
                  { key: 'totalHallazgos', label: 'Hallazgos', Icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', fmt: v => v },
                  { key: 'piezasProduccion', label: 'Piezas Producidas', Icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30', fmt: v => v.toLocaleString() },
                  { key: 'calidad', label: '% Calidad', Icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', fmt: v => `${v.toFixed(2)}%` },
                ].map(({ key, label, Icon, color, bg, fmt }) => {
                  const val = resultado.metrics[key];
                  return (
                    <Card key={key} className="hover:-translate-y-1 transition-transform duration-200">
                      <CardContent className="p-5">
                        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{fmt(val)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{label}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Tabla de desglose de órdenes */}
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Desglose de Órdenes</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">Tipo</th>
                        <th className="px-4 py-2 text-right">Cantidad</th>
                        <th className="px-4 py-2 text-right">% del Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-4 py-2 font-medium">Internas</td>
                        <td className="px-4 py-2 text-right">{resultado.metrics.internas}</td>
                        <td className="px-4 py-2 text-right">
                          {resultado.metrics.totalOrdenes > 0
                            ? ((resultado.metrics.internas / resultado.metrics.totalOrdenes) * 100).toFixed(1) + '%'
                            : '0%'}
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-4 py-2 font-medium">Externas</td>
                        <td className="px-4 py-2 text-right">{resultado.metrics.externas}</td>
                        <td className="px-4 py-2 text-right">
                          {resultado.metrics.totalOrdenes > 0
                            ? ((resultado.metrics.externas / resultado.metrics.totalOrdenes) * 100).toFixed(1) + '%'
                            : '0%'}
                        </td>
                      </tr>
                      <tr className="border-t font-semibold">
                        <td className="px-4 py-2">Total</td>
                        <td className="px-4 py-2 text-right">{resultado.metrics.totalOrdenes}</td>
                        <td className="px-4 py-2 text-right">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </AccordionSection>

            {/* Listado de Órdenes */}
            <AccordionSection title="Listado de Órdenes" icon={List}>
              <div className="space-y-4">
                <TablaOrdenes
                  title="Todas las Órdenes"
                  ordenes={resultado.ordenes}
                  showTipo={true}
                />
                <TablaOrdenes
                  title="Órdenes Internas"
                  ordenes={resultado.ordenes.filter(o => o.interna)}
                  showTipo={false}
                />
                <TablaOrdenes
                  title="Órdenes Externas"
                  ordenes={resultado.ordenes.filter(o => !o.interna)}
                  showTipo={false}
                />
              </div>
            </AccordionSection>

            {/* Resumen de Piezas */}
            <AccordionSection title="Resumen de Piezas" icon={Package}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Detectadas', resultado.metrics.piezasDetectadas, 'text-rose-600'],
                  ['Recuperadas', resultado.metrics.piezasRecuperadas, 'text-emerald-600'],
                  ['Rechazadas', resultado.metrics.piezasRechazadas, 'text-amber-600'],
                  ['% Recuperación', resultado.metrics.recuperacion, 'text-blue-600'],
                ].map(([label, val, color]) => (
                  <div key={label} className="text-center p-3 rounded-xl bg-muted/50 border border-border">
                    <p className={`text-2xl font-bold ${color}`}>
                      {typeof val === 'number' && val % 1 !== 0 ? val.toFixed(2) : val}
                      {label.includes('%') ? '%' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 max-w-md mx-auto">
                <h4 className="text-sm font-medium mb-2 text-center">Distribución de Piezas Detectadas</h4>
                <div className="h-64">
                  <Pie
                    data={{
                      labels: ['Recuperadas', 'Rechazadas'],
                      datasets: [{
                        data: [
                          resultado.metrics.piezasRecuperadas || 0,
                          resultado.metrics.piezasRechazadas || 0,
                        ],
                        backgroundColor: ['hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)'],
                        borderColor: ['hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)'],
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom' }
                      }
                    }}
                  />
                </div>
              </div>
            </AccordionSection>

            {/* Pareto de Defectos */}
            <AccordionSection title="Pareto de Defectos" icon={AlertTriangle}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80">
                  <Bar
                    data={{
                      labels: resultado.paretoDefectos.map(r => catalogosMap[r.defecto] || r.defecto),
                      datasets: [{
                        label: 'Piezas Detectadas',
                        data: resultado.paretoDefectos.map(r => r.total),
                        backgroundColor: getChartColors(resultado.paretoDefectos.length),
                        borderRadius: 6,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Pareto de Defectos' }
                      },
                      scales: {
                        y: { beginAtZero: true }
                      }
                    }}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Tabla de Defectos</h4>
                  <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">Defecto</th>
                          <th className="px-4 py-2 text-right">Piezas</th>
                          <th className="px-4 py-2 text-right">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.paretoDefectos.map((r, idx) => {
                          const total = resultado.paretoDefectos.reduce((s, item) => s + item.total, 0);
                          const porcentaje = total > 0 ? (r.total / total) * 100 : 0;
                          return (
                            <tr key={idx} className="border-t">
                              <td className="px-4 py-2">{catalogosMap[r.defecto] || r.defecto}</td>
                              <td className="px-4 py-2 text-right">{r.total}</td>
                              <td className="px-4 py-2 text-right">{porcentaje.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sub-acordeón: Detalle de Defectos por Orden */}
              <AccordionSection title="Detalle de Defectos por Orden" icon={FileSearch}>
                {resultado.detalleDefectos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No hay defectos registrados en este mes.</p>
                ) : (
                  <div className="space-y-4">
                    {resultado.detalleDefectos.map((def, idx) => (
                      <TablaDefectosPorOrden key={idx} defecto={def} catalogosMap={catalogosMap} />
                    ))}
                  </div>
                )}
              </AccordionSection>
            </AccordionSection>

            {/* Pareto por Proceso */}
            <AccordionSection title="Pareto por Proceso" icon={PieChart}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80">
                  <Bar
                    data={{
                      labels: resultado.paretoProcesos.map(r => catalogosMap[r.proceso] || r.proceso),
                      datasets: [{
                        label: 'Piezas Detectadas',
                        data: resultado.paretoProcesos.map(r => r.total),
                        backgroundColor: getChartColors(resultado.paretoProcesos.length),
                        borderRadius: 6,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Pareto por Proceso' }
                      },
                      scales: {
                        y: { beginAtZero: true }
                      }
                    }}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Tabla de Procesos</h4>
                  <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">Proceso</th>
                          <th className="px-4 py-2 text-right">Piezas</th>
                          <th className="px-4 py-2 text-right">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.paretoProcesos.map((r, idx) => {
                          const total = resultado.paretoProcesos.reduce((s, item) => s + item.total, 0);
                          const porcentaje = total > 0 ? (r.total / total) * 100 : 0;
                          return (
                            <tr key={idx} className="border-t">
                              <td className="px-4 py-2">{catalogosMap[r.proceso] || r.proceso}</td>
                              <td className="px-4 py-2 text-right">{r.total}</td>
                              <td className="px-4 py-2 text-right">{porcentaje.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </AccordionSection>

            {/* Ranking de Órdenes */}
            <AccordionSection title="Ranking de Órdenes" icon={TrendingUp}>
              <div className="space-y-4">
                <DataTable
                  title="Top Órdenes con Más Incidencias"
                  cols={['Orden', 'Cliente', 'Producto', 'Incidencias']}
                  rows={resultado.topOrders.map(r => [r.codigoOrden, r.cliente, r.producto, r.defectos])}
                />
                <DataTable
                  title="Top Calidad"
                  cols={['Orden', 'Calidad']}
                  rows={resultado.bestOrders.map(r => [r.codigoOrden, `${r.calidad.toFixed(2)}%`])}
                />
                <DataTable
                  title="Órdenes con Menor Calidad"
                  cols={['Orden', 'Calidad']}
                  rows={resultado.worstOrders.map(r => [r.codigoOrden, `${r.calidad.toFixed(2)}%`])}
                />
              </div>
            </AccordionSection>
          </div>
        </>
      )}

      {!mostrarResultados && !calculando && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Selecciona un mes y año, luego presiona "Calcular" para ver los indicadores.</p>
        </div>
      )}
    </div>
  );
}