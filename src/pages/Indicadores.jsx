import { useEffect, useState } from 'react';
import { useExpedientes } from '../context/ExpedientesContext';
import { MONTHS } from '../data/months.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Label } from '../components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.jsx';
import { Input } from '../components/ui/input.jsx';
import { BarChart2, Calculator, Loader2 } from 'lucide-react';
import { useCatalogos } from '../context/CatalogosContext';

function getMonthlyMetrics(exps, mes, anio) {
  const filtered = exps.filter(e => e.estado !== 'ANULADO' && e.mes_produccion === mes && e.anio_produccion === anio);
  let piezasProduccion = 0, piezasDetectadas = 0, piezasRecuperadas = 0, piezasRechazadas = 0;
  filtered.forEach(exp => {
    piezasProduccion += exp.cantidad_producida || 0;
    (exp.hallazgos || []).forEach(h => {
      piezasDetectadas += h.piezas_detectadas || 0;
      piezasRecuperadas += h.piezas_recuperadas || 0;
      piezasRechazadas += h.piezas_rechazadas || 0;
    });
  });
  return { totalOrdenes: filtered.length, piezasProduccion, piezasDetectadas, piezasRecuperadas, piezasRechazadas };
}

function calculateKPIs(m) {
  return {
    porcentajeDefectos: m.piezasProduccion ? (m.piezasDetectadas / m.piezasProduccion) * 100 : 0,
    porcentajeRecuperacion: m.piezasDetectadas ? (m.piezasRecuperadas / m.piezasDetectadas) * 100 : 0,
    porcentajeRechazo: m.piezasDetectadas ? (m.piezasRechazadas / m.piezasDetectadas) * 100 : 0,
  };
}

function getParetoDefectos(exps, mes, anio) {
  const resumen = {};
  exps.filter(e => e.estado !== 'ANULADO' && e.mes_produccion === mes && e.anio_produccion === anio)
    .forEach(exp => (exp.hallazgos || []).forEach(h => {
      const defecto = h.defecto_id || 'Otro';
      resumen[defecto] = (resumen[defecto] || 0) + (h.piezas_detectadas || 0);
    }));
  return Object.entries(resumen).map(([defecto, total]) => ({ defecto, total })).sort((a, b) => b.total - a.total);
}

function getParetoProcesos(exps, mes, anio) {

  const resumen = {};
  exps.filter(e => e.estado !== 'ANULADO' && e.mes_produccion === mes && e.anio_produccion === anio)
    .forEach(exp => (exp.hallazgos || []).forEach(h => {
      const proceso = h.proceso_id || 'Otro';
      resumen[proceso] = (resumen[proceso] || 0) + (h.piezas_detectadas || 0);
    }));
  return Object.entries(resumen).map(([proceso, total]) => ({ proceso, total })).sort((a, b) => b.total - a.total);
}

function getOrdersRanking(exps, mes, anio) {
  return exps
    .filter(e => e.estado !== 'ANULADO' && e.mes_produccion === mes && e.anio_produccion === anio)
    .map(exp => {
      let defectos = 0;
      (exp.hallazgos || []).forEach(h => { defectos += h.piezas_detectadas || 0; });
      const produccion = exp.cantidad_producida || 0;
      const calidad = produccion > 0 ? ((produccion - defectos) / produccion) * 100 : 0;
      return { codigoOrden: exp.expediente_id, cliente: exp.cliente, producto: exp.producto, produccion, defectos, calidad };
    });
}

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

export default function Indicadores() {
  const { expedientes, loading } = useExpedientes();
  const { catalogosMap } = useCatalogos();

  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [resultado, setResultado] = useState(null);

  function calcular() {
    const m = Number(mes);
    const a = Number(anio);
    const metrics = getMonthlyMetrics(expedientes, m, a);
    const kpis = calculateKPIs(metrics);
    const paretoDefectos = getParetoDefectos(expedientes, m, a);
    const paretoProcesos = getParetoProcesos(expedientes, m, a);
    const orders = getOrdersRanking(expedientes, m, a);
    const topOrders = [...orders].sort((a, b) => b.defectos - a.defectos).slice(0, 10);
    const bestOrders = [...orders].sort((a, b) => b.calidad - a.calidad).slice(0, 10);
    const worstOrders = [...orders].sort((a, b) => a.calidad - b.calidad).slice(0, 10);
    setResultado({ metrics, kpis, paretoDefectos, paretoProcesos, topOrders, bestOrders, worstOrders });
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
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
            <Button onClick={calcular} className="gap-2">
              <Calculator className="w-4 h-4" />
              Calcular
            </Button>
          </div>
        </CardContent>
      </Card>

      {resultado && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resumen Mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                {[
                  ['Órdenes', resultado.metrics.totalOrdenes, 'info'],
                  ['Producción', resultado.metrics.piezasProduccion, 'secondary'],
                  ['Detectadas', resultado.metrics.piezasDetectadas, 'destructive'],
                  ['Recuperadas', resultado.metrics.piezasRecuperadas, 'success'],
                  ['Rechazadas', resultado.metrics.piezasRechazadas, 'warning'],
                ].map(([label, val, variant]) => (
                  <div key={label} className="text-center p-3 rounded-xl bg-muted/50 border border-border">
                    <p className="text-2xl font-bold text-foreground">{val}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  ['% Defectos', resultado.kpis.porcentajeDefectos, 'text-rose-600'],
                  ['% Recuperación', resultado.kpis.porcentajeRecuperacion, 'text-emerald-600'],
                  ['% Rechazo', resultado.kpis.porcentajeRechazo, 'text-amber-600'],
                ].map(([label, val, color]) => (
                  <div key={label} className="text-center p-3 rounded-xl bg-muted/50 border border-border">
                    <p className={`text-2xl font-bold ${color}`}>{val.toFixed(2)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <DataTable title="Pareto de Defectos" cols={['Defecto', 'Piezas']}
            rows={resultado.paretoDefectos.map(r => [catalogosMap[r.defecto] || r.defecto,r.total])} />
          <DataTable title="Pareto por Proceso" cols={['Proceso', 'Piezas']}
            rows={resultado.paretoProcesos.map(r => [catalogosMap[r.proceso] || r.proceso,r.total])} />
          <DataTable title="Top Órdenes con Más Incidencias" cols={['Orden', 'Cliente', 'Producto', 'Incidencias']}
            rows={resultado.topOrders.map(r => [r.codigoOrden, r.cliente, r.producto, r.defectos])} />
          <DataTable title="Top Calidad" cols={['Orden', 'Calidad']}
            rows={resultado.bestOrders.map(r => [r.codigoOrden, `${r.calidad.toFixed(2)}%`])} />
          <DataTable title="Órdenes con Menor Calidad" cols={['Orden', 'Calidad']}
            rows={resultado.worstOrders.map(r => [r.codigoOrden, `${r.calidad.toFixed(2)}%`])} />
        </div>
      )}
    </div>
  );
}