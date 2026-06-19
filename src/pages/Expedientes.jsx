import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpedientes } from '../context/ExpedientesContext';
import { useCatalogos } from '../context/CatalogosContext';
import { parseOrderCode } from '../services/orderParser';
import { SearchSelect } from '../components/ui/search-select';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Textarea } from '../components/ui/textarea.jsx';
import { Badge } from '../components/ui/badge.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.jsx';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '../components/ui/dialog.jsx';

import {
  Plus, Save, FolderOpen, XCircle, CheckCircle2,
  AlertCircle, Loader2, List, PenSquare, Eye, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

// Constante para badges de estado
const ESTADO_BADGE = {
  ABIERTO:    { variant: 'info',        label: 'Abierto' },
  EN_PROCESO: { variant: 'warning',     label: 'En Proceso' },
  CERRADO:    { variant: 'success',     label: 'Cerrado' },
  ANULADO:    { variant: 'destructive', label: 'Anulado' },
};

// Toast reutilizable (igual que en otros archivos)
function Toast({ msg, onClose }) {
  if (!msg) return null;
  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300',
    danger:  'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300',
    warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300',
    info:    'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300',
  };
  const icons = { success: CheckCircle2, danger: XCircle, warning: AlertCircle, info: AlertCircle };
  const Icon = icons[msg.type] || AlertCircle;
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border mb-4 animate-fade-in text-sm font-medium', colors[msg.type])}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{msg.text}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">✕</button>
    </div>
  );
}

// Estado inicial del formulario de creación
const EMPTY_FORM = {
  codigoOrden: '',
  cliente: '',
  producto: '',
  cantidadProducida: 0,
};

export default function Expedientes() {
  const navigate = useNavigate();
  const { expedientes, loading, crearExpediente, anularExpediente } = useExpedientes();
  const { catalogos, loading: catalogosLoading } = useCatalogos();

  const [filtro, setFiltro] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'create'
  const [form, setForm] = useState(EMPTY_FORM);
  const [orderInfo, setOrderInfo] = useState(null);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  // Mostrar toast
  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  // Manejar cambio en código de orden
  const handleOrderChange = (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, codigoOrden: val }));
    const parsed = val.length >= 5 ? parseOrderCode(val) : null;
    setOrderInfo(parsed);
  };

  // Crear expediente
  const handleSave = async () => {
    if (!form.codigoOrden.trim()) {
      showMsg('warning', 'Debe ingresar una orden');
      return;
    }
    const parsed = parseOrderCode(form.codigoOrden);
    if (!parsed || !parsed.valid) {
      showMsg('danger', 'Código de orden inválido');
      return;
    }

    // Verificar si ya existe (por expediente_id)
    const exists = expedientes.some(e => e.expediente_id === parsed.codigo);
    if (exists) {
      showMsg('warning', 'La orden ya existe');
      return;
    }

    setSaving(true);
    try {
      const expedienteData = {
        expediente_id: parsed.codigo,
        codigo_orden: parsed.codigo,
        interna: parsed.interna,
        cliente_nux: parsed.clienteNux,
        mes_produccion: parsed.mes,
        anio_produccion: parsed.anio,
        consecutivo: parsed.consecutivo,
        fecha_creacion: new Date().toISOString().split('T')[0],
        cliente: form.cliente || null,
        producto: form.producto || null,
        cantidad_producida: Number(form.cantidadProducida) || 0,
        estado: 'ABIERTO',
        hallazgos: [], // por ahora sin hallazgos
      };

      await crearExpediente(expedienteData);
      showMsg('success', 'Expediente creado exitosamente');
      setForm(EMPTY_FORM);
      setOrderInfo(null);
      setView('list');
    } catch (error) {
      showMsg('danger', error.message);
    } finally {
      setSaving(false);
    }
  };

  // Anular expediente
  const handleAnular = async (expedienteId) => {
    if (!window.confirm('¿Desea anular este expediente?')) return;
    try {
      await anularExpediente(expedienteId, 'Anulado por usuario');
      showMsg('success', 'Expediente anulado');
    } catch (error) {
      showMsg('danger', error.message);
    }
  };

  // Abrir detalle
  const openDetail = (exp) => {
    navigate(`/expedientes/${exp.id}`);
  };

  // Filtrar expedientes (excluir anulados)
  const filtrados = expedientes
    .filter(e => e.estado !== 'ANULADO')
    .filter(e => !filtro || e.estado === filtro);

  // Mostrar loading
  if (loading || catalogosLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Toast msg={msg} onClose={() => setMsg(null)} />

      {/* Header con vistas */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setView('list')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
              view === 'list'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <List className="w-4 h-4" />
            Lista
          </button>
          <button
            onClick={() => setView('create')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
              view === 'create'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <PenSquare className="w-4 h-4" />
            Nuevo Expediente
          </button>
        </div>

        {view === 'list' && (
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="ABIERTO">Abiertos</SelectItem>
              <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
              <SelectItem value="CERRADO">Cerrados</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Vista de creación */}
      {view === 'create' && (
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="w-5 h-5 text-primary" />
              Crear Nuevo Expediente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Código de Orden <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Ej: IN06-025-26"
                  value={form.codigoOrden}
                  onChange={handleOrderChange}
                  className={orderInfo && !orderInfo.valid ? 'border-destructive' : ''}
                />
                {orderInfo && orderInfo.valid && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {orderInfo.mesNombre} {orderInfo.anio} — {orderInfo.interna ? 'Interna' : 'Externa'}
                  </p>
                )}
                {orderInfo && !orderInfo.valid && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <XCircle className="w-3 h-3" />
                    {orderInfo.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Input
                  placeholder="Nombre del cliente"
                  value={form.cliente}
                  onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Producto</Label>
                <Input
                  placeholder="Descripción del producto"
                  value={form.producto}
                  onChange={e => setForm(f => ({ ...f, producto: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cantidad Producida</Label>
                <Input
                  type="number" min="0"
                  value={form.cantidadProducida}
                  onChange={e => setForm(f => ({ ...f, cantidadProducida: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => { setForm(EMPTY_FORM); setOrderInfo(null); setView('list'); }}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Crear Expediente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista de lista */}
      {view === 'list' && (
        <div className="space-y-3">
          {filtrados.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No hay expedientes registrados.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setView('create')}>
                  Crear primer expediente
                </Button>
              </CardContent>
            </Card>
          ) : (
            filtrados.map(exp => {
              const totalDefectos = (exp.hallazgos || []).reduce((s, h) => s + (h.piezas_detectadas || 0), 0);
              const pct = exp.cantidad_producida > 0 ? ((totalDefectos / exp.cantidad_producida) * 100).toFixed(2) : '0.00';
              const bd = ESTADO_BADGE[exp.estado] || { variant: 'secondary', label: exp.estado };

              return (
                <Card key={exp.id}
                  className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer group"
                  onClick={() => openDetail(exp)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FolderOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">{exp.expediente_id}</span>
                            <Badge variant={bd.variant}>{bd.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {exp.cliente || 'Sin cliente'} · {exp.producto || 'Sin producto'}
                          </p>
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center gap-4 text-sm flex-shrink-0">
                        <div className="text-center">
                          <p className="font-semibold text-foreground">{exp.hallazgos?.length || 0}</p>
                          <p className="text-xs text-muted-foreground">Hallazgos</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-foreground">{totalDefectos}</p>
                          <p className="text-xs text-muted-foreground">Defectos</p>
                        </div>
                        <div className="text-center">
                          <p className={cn('font-semibold', Number(pct) > 5 ? 'text-rose-600' : 'text-emerald-600')}>
                            {pct}%
                          </p>
                          <p className="text-xs text-muted-foreground">% Defectos</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
                            onClick={e => { e.stopPropagation(); openDetail(exp); }}>
                            <Eye className="w-3.5 h-3.5" />
                            Abrir
                          </Button>
                          {exp.estado !== 'CERRADO' && exp.estado !== 'ANULADO' && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={e => { e.stopPropagation(); handleAnular(exp.id); }}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors sm:hidden flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}