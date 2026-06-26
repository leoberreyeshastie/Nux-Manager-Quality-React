import { useEffect, useState, useMemo } from 'react';
import { useExpedientes } from '../context/ExpedientesContext';
import { useCatalogos } from '../context/CatalogosContext';
import { SearchInput } from '../components/ui/search-input';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { parseOrderCode } from '../services/orderParser';
import { SearchSelect } from '../components/ui/search-select';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Textarea } from '../components/ui/textarea.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog.jsx';
import { Plus, Save, FolderOpen, XCircle, CheckCircle2, AlertCircle, Loader2, List, PenSquare, Eye, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast, confirm, errorAlert } from '../lib/sweetAlert';
import { MONTHS } from '../data/months';


const ESTADO_BADGE = {
  ABIERTO: { variant: 'info', label: 'Abierto' },
  EN_PROCESO: { variant: 'warning', label: 'En Proceso' },
  CERRADO: { variant: 'success', label: 'Cerrado' },
  ANULADO: { variant: 'destructive', label: 'Anulado' },
};

// Opciones de filtro por mes
const MES_OPCIONES = Object.entries(MONTHS).map(([id, nombre]) => ({
  value: id,
  label: nombre
}));

// Opciones de año (últimos 5 años)
const ANIOS_OPCIONES = Array.from({ length: 5 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: String(year), label: String(year) };
});

// Estado inicial del formulario de creación
const EMPTY_FORM = {
  codigoOrden: '',
  cliente: '',
  producto: '',
  cantidadProducida: 0,
};

export default function Expedientes() {
  const { expedientes, loading, crearExpediente, anularExpediente } = useExpedientes();
  const navigate = useNavigate();
  const { catalogos, loading: catalogosLoading } = useCatalogos();

  // Funciones de formulario
  const [filtro, setFiltro] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [orderInfo, setOrderInfo] = useState(null);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);


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
      toast('warning', 'Debe ingresar una orden');
      return;
    }
    const parsed = parseOrderCode(form.codigoOrden);
    if (!parsed || !parsed.valid) {
      toast('danger', 'Código de orden inválido');
      return;
    }

    // Verificar si ya existe (por expediente_id)
    const exists = expedientes.some(e => e.expediente_id === parsed.codigo);
    if (exists) {
      toast('warning', 'La orden ya existe');
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
      toast('success', 'Expediente creado exitosamente');
      setForm(EMPTY_FORM);
      setOrderInfo(null);
      setView('list');
    } catch (error) {
      await errorAlert('Error al crear', error.message);
    } finally {
      setSaving(false);
    }
  };

  // Anular expediente
  const handleAnular = async (expedienteId) => {
    if (!window.confirm('¿Desea anular este expediente?')) return;
    try {
      await anularExpediente(expedienteId, 'Anulado por usuario');
      toast('success', 'Expediente anulado');
    } catch (error) {
      await errorAlert('Error al anular', error.message);
    }
  };

  // Abrir detalle
  const openDetail = (exp) => {
    navigate(`/expedientes/${exp.id}`);
  };


  // Estados de filtro
  const [filtroEstado, setFiltroEstado] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [view, setView] = useState('list');

  // Función de filtrado
  const expedientesFiltrados = useMemo(() => {
    // 1. Excluir anulados
    let filtered = expedientes.filter(e => e.estado !== 'ANULADO');

    // 2. Aplicar filtro por estado
    if (filtroEstado) {
      filtered = filtered.filter(e => e.estado === filtroEstado);
    }

    // 3. Aplicar filtro por mes
    if (filtroMes) {
      filtered = filtered.filter(e => e.mes_produccion === Number(filtroMes));
    }

    // 4. Aplicar filtro por año
    if (filtroAnio) {
      filtered = filtered.filter(e => e.anio_produccion === Number(filtroAnio));
    }

    // 5. Aplicar búsqueda por texto (mínimo 3 caracteres)
    if (searchTerm.length >= 3) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(e =>
        (e.expediente_id?.toLowerCase().includes(term)) ||
        (e.cliente?.toLowerCase().includes(term)) ||
        (e.producto?.toLowerCase().includes(term))
      );
    }

    // 6. Si NO hay filtros activos, aplicar visualización inicial inteligente
    const tieneFiltrosActivos = filtroEstado || filtroMes || filtroAnio || searchTerm.length >= 3;
    if (!tieneFiltrosActivos) {
      // Obtener mes y año actuales
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Filtrar por mes actual
      const delMesActual = filtered.filter(e =>
        e.mes_produccion === currentMonth && e.anio_produccion === currentYear
      );

      // Si hay al menos 10 del mes actual, mostrarlos
      if (delMesActual.length >= 10) {
        return delMesActual;
      }

      // Si no, mostrar los últimos 10 (más recientes)
      return [...filtered]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);
    }

    // Si hay filtros activos, mostrar todos los que coinciden
    return filtered;
  }, [expedientes, filtroEstado, searchTerm, filtroMes, filtroAnio]);

  // Contar filtros activos
  const filtrosActivos = [filtroEstado, filtroMes, filtroAnio, searchTerm.length >= 3 ? 'busqueda' : null]
    .filter(Boolean).length;

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltroEstado('');
    setFiltroMes('');
    setFiltroAnio('');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header con tabs de vista */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
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
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                view === 'create'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <PenSquare className="w-4 h-4" />
              Nuevo Expediente
            </button>
          </div>
        </div>

        {view === 'list' && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Buscador */}
            <div className="w-64">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por orden, cliente..."
              />
              {searchTerm.length > 0 && searchTerm.length < 3 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Escribe al menos 3 caracteres
                </p>
              )}
            </div>

            {/* Filtro por mes */}
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="w-36">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <SelectValue placeholder="Mes" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los meses</SelectItem>
                {MES_OPCIONES.map(mes => (
                  <SelectItem key={mes.value} value={mes.value}>
                    {mes.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por año */}
            <Select value={filtroAnio} onValueChange={setFiltroAnio}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los años</SelectItem>
                {ANIOS_OPCIONES.map(anio => (
                  <SelectItem key={anio.value} value={anio.value}>
                    {anio.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por estado */}
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-35">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="ABIERTO">Abiertos</SelectItem>
                <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                <SelectItem value="CERRADO">Cerrados</SelectItem>
              </SelectContent>
            </Select>


          </div>
        )}

      </div>

      {/* Contenido principal */}
      {view === 'create' ? (
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
      ) : (
        <>
          {/* Indicador de filtros activos (versión compacta) */}
          {filtrosActivos > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <span>Filtros activos:</span>
              {filtroEstado && (
                <Badge variant="outline" className="capitalize">
                  {filtroEstado.toLowerCase()}
                  <button
                    onClick={() => setFiltroEstado('')}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filtroMes && (
                <Badge variant="outline">
                  {MONTHS[Number(filtroMes)]}
                  <button
                    onClick={() => setFiltroMes('')}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filtroAnio && (
                <Badge variant="outline">
                  {filtroAnio}
                  <button
                    onClick={() => setFiltroAnio('')}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {searchTerm.length >= 3 && (
                <Badge variant="outline">
                  "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {/* Contador de filtros y botón limpiar */}
              {filtrosActivos > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limpiarFiltros}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Limpiar {filtrosActivos}
                </Button>
              )}
            </div>

          )}

          {/* Lista de expedientes */}
          <div className="space-y-3">
            {expedientesFiltrados.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">
                    {filtrosActivos > 0
                      ? 'No hay expedientes que coincidan con los filtros aplicados.'
                      : 'No hay expedientes para mostrar.'}
                  </p>
                  {filtrosActivos > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={limpiarFiltros}
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              expedientesFiltrados.map(exp => {
                const totalDefectos = (exp.hallazgos || []).reduce((s, h) => s + (h.piezas_detectadas || 0), 0);
                const pct = exp.cantidad_producida > 0 ? ((totalDefectos / exp.cantidad_producida) * 100).toFixed(2) : '0.00';
                const bd = ESTADO_BADGE[exp.estado] || { variant: 'secondary', label: exp.estado };

                return (
                  <Card
                    key={exp.id}
                    className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer group"
                    onClick={() => navigate(`/expedientes/${exp.id}`)}
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
                              <span className="text-xs text-muted-foreground">
                                {MONTHS[exp.mes_produccion] || ''} {exp.anio_produccion || ''}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {exp.cliente || 'Sin cliente'} · {exp.cantidad_producida + " Pzs" || 'Sin Cantidad'} · {exp.producto || 'Sin producto'}
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
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 text-xs"
                              onClick={e => { e.stopPropagation(); navigate(`/expedientes/${exp.id}`); }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Abrir
                            </Button>
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
        </>
      )}
    </div>
  );
}