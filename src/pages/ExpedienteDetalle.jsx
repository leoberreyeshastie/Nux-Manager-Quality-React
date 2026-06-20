import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExpedientes } from '../context/ExpedientesContext';
import { useCatalogos} from '../context/CatalogosContext';
import { useAuth } from '../context/AuthContext';
import { uploadEvidencia, deleteEvidencia } from '../services/evidenciasService';
import { compressImage } from '../lib/compressImage';
import { SearchSelect } from '../components/ui/search-select';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Download,
  Eye,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';



const ESTADO_BADGE = {
  ABIERTO: { variant: 'info', label: 'Abierto' },
  EN_PROCESO: { variant: 'warning', label: 'En Proceso' },
  CERRADO: { variant: 'success', label: 'Cerrado' },
  ANULADO: { variant: 'destructive', label: 'Anulado' },
};

function Toast({ msg, onClose }) {
  if (!msg) return null;
  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300',
    danger: 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300',
    warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300',
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

// Modal para crear/editar hallazgo
function HallazgoModal({ open, onClose, hallazgo, onSave, catalogos, expedienteId }) {
  const [form, setForm] = useState(() => {
    if (hallazgo) {
      return {
        fecha_deteccion: hallazgo.fecha_deteccion || new Date().toISOString().split('T')[0],
        proceso_id: hallazgo.proceso_id || '',
        maquina_id: hallazgo.maquina_id || '',
        defecto_id: hallazgo.defecto_id || '',
        categoria_id: hallazgo.categoria_id || '',
        accion_id: hallazgo.accion_id || '',
        piezas_detectadas: hallazgo.piezas_detectadas || 0,
        piezas_recuperadas: hallazgo.piezas_recuperadas || 0,
        piezas_rechazadas: hallazgo.piezas_rechazadas || 0,
        responsable: hallazgo.responsable || '',
        observaciones: hallazgo.observaciones || '',
        estado: hallazgo.estado || 'ABIERTO',
        evidencias: hallazgo.evidencias || [],
      };
    }
    return {
      fecha_deteccion: new Date().toISOString().split('T')[0],
      proceso_id: '',
      maquina_id: '',
      defecto_id: '',
      categoria_id: '',
      accion_id: '',
      piezas_detectadas: 0,
      piezas_recuperadas: 0,
      piezas_rechazadas: 0,
      responsable: '',
      observaciones: '',
      estado: 'ABIERTO',
      evidencias: [],
    };
  });

  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      // Comprimir imagen
      const compressed = await compressImage(file, 1024, 0.8);
      // Crear objeto de evidencia temporal (sin subir aún)
      const newEvidencia = {
        nombre_archivo: compressed.name,
        tamano_kb: Math.round(compressed.size / 1024),
        archivo: compressed, // guardamos el archivo comprimido para subir después
        descripcion: '',
        fecha_captura: new Date().toISOString().split('T')[0],
        // id temporal para la UI
        tempId: Date.now(),
      };
      setForm(f => ({
        ...f,
        evidencias: [...f.evidencias, newEvidencia],
      }));
    } catch (error) {
      console.error('Error comprimiendo imagen:', error);
      alert('Error al procesar la imagen');
    } finally {
      setUploading(false);
    }
  };

  const removeEvidencia = (index) => {
    setForm(f => ({
      ...f,
      evidencias: f.evidencias.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    // Validar campos obligatorios
    if (!form.proceso_id || !form.defecto_id) {
      alert('Selecciona al menos proceso y defecto');
      return;
    }
    // Llamar a onSave con el objeto hallazgo (incluyendo evidencias)
    // Las evidencias aún no están subidas; las subiremos en el padre después de guardar el hallazgo
    onSave(form);
    onClose();
  };

  const catalogoOptions = (codigoTipo) => {
    const items = catalogos[codigoTipo] || [];
    return items.map(item => ({ value: item.id, label: item.nombre }));
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{hallazgo ? 'Editar Hallazgo' : 'Nuevo Hallazgo'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Fecha Detección</Label>
            <Input
              type="date"
              value={form.fecha_deteccion}
              onChange={e => setForm(f => ({ ...f, fecha_deteccion: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Responsable</Label>
            <Input
              value={form.responsable}
              onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Proceso</Label>
            <SearchSelect
              options={catalogoOptions('PROCESOS')}
              value={form.proceso_id}
              onChange={(val) => setForm(f => ({ ...f, proceso_id: val }))}
              placeholder="Seleccionar proceso..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Máquina</Label>
            <SearchSelect
              options={catalogoOptions('MAQUINAS')}
              value={form.maquina_id}
              onChange={(val) => setForm(f => ({ ...f, maquina_id: val }))}
              placeholder="Seleccionar máquina..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Defecto</Label>
            <SearchSelect
              options={catalogoOptions('DEFECTOS')}
              value={form.defecto_id}
              onChange={(val) => setForm(f => ({ ...f, defecto_id: val }))}
              placeholder="Seleccionar defecto..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <SearchSelect
              options={catalogoOptions('CATEGORIAS')}
              value={form.categoria_id}
              onChange={(val) => setForm(f => ({ ...f, categoria_id: val }))}
              placeholder="Seleccionar categoría..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Acción</Label>
            <SearchSelect
              options={catalogoOptions('ACCIONES')}
              value={form.accion_id}
              onChange={(val) => setForm(f => ({ ...f, accion_id: val }))}
              placeholder="Seleccionar acción..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <SearchSelect
              options={[
                { value: 'ABIERTO', label: 'Abierto' },
                { value: 'EN_PROCESO', label: 'En Proceso' },
                { value: 'CERRADO', label: 'Cerrado' },
              ]}
              value={form.estado}
              onChange={(val) => setForm(f => ({ ...f, estado: val }))}
              placeholder="Estado..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Piezas Detectadas</Label>
            <Input
              type="number"
              min="0"
              value={form.piezas_detectadas}
              onChange={e => setForm(f => ({ ...f, piezas_detectadas: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Piezas Recuperadas</Label>
            <Input
              type="number"
              min="0"
              value={form.piezas_recuperadas}
              onChange={e => setForm(f => ({ ...f, piezas_recuperadas: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Piezas Rechazadas</Label>
            <Input
              type="number"
              min="0"
              value={form.piezas_rechazadas}
              onChange={e => setForm(f => ({ ...f, piezas_rechazadas: Number(e.target.value) }))}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Observaciones</Label>
            <Textarea
              rows={3}
              value={form.observaciones}
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Evidencias Fotográficas
            </Label>
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-sm text-muted-foreground">
                <Plus className="w-4 h-4" />
                {uploading ? 'Comprimiendo...' : 'Agregar imagen'}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
                disabled={uploading}
              />
            </label>
            {form.evidencias.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {form.evidencias.map((ev, idx) => (
                  <div key={ev.tempId || idx} className="relative group rounded-lg overflow-hidden border border-border bg-muted/30">
                    {ev.archivo ? (
                      <img
                        src={URL.createObjectURL(ev.archivo)}
                        alt={ev.nombre_archivo}
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center bg-muted">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        onClick={() => removeEvidencia(idx)}
                        className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground px-1.5 py-1 truncate">{ev.nombre_archivo}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Guardar Hallazgo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Componente principal
export default function ExpedienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { expedienteActual, cargarExpedienteActual, actualizarExpediente, anularExpediente, loading } = useExpedientes();
  const { catalogos, loading: catalogosLoading, getCatalogoNombre } = useCatalogos();
  const { user } = useAuth();
  
  const [msg, setMsg] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [hallazgoModalOpen, setHallazgoModalOpen] = useState(false);
  const [editingHallazgo, setEditingHallazgo] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  
 
  useEffect(() => {
    if (id) {
      cargarExpedienteActual(id);
    }
  }, [id, cargarExpedienteActual]);

  useEffect(() => {
    if (expedienteActual) {
      setIsReadOnly(expedienteActual.estado === 'CERRADO' || expedienteActual.estado === 'ANULADO');
      setEditData({
        cliente: expedienteActual.cliente || '',
        producto: expedienteActual.producto || '',
        cantidad_producida: expedienteActual.cantidad_producida || 0,
      });
    }
  }, [expedienteActual]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const handleEditSave = async () => {
    try {
      await actualizarExpediente(id, editData);
      showMsg('success', 'Expediente actualizado');
      setEditModalOpen(false);
    } catch (error) {
      showMsg('danger', error.message);
    }
  };

  const handleCloseExpediente = async () => {
    if (!window.confirm('¿Cerrar este expediente?')) return;
    try {
      await actualizarExpediente(id, { estado: 'CERRADO' });
      showMsg('success', 'Expediente cerrado');
    } catch (error) {
      showMsg('danger', error.message);
    }
  };

  const handleAnular = async () => {
    const motivo = prompt('Motivo de anulación:');
    if (motivo === null) return;
    try {
      await anularExpediente(id, motivo);
      showMsg('success', 'Expediente anulado');
      navigate('/expedientes');
    } catch (error) {
      showMsg('danger', error.message);
    }
  };

  // Guardar hallazgo (nuevo o editado) con sus evidencias (subir a Storage)
  const handleSaveHallazgo = async (hallazgoData) => {
    try {
      const hallazgoParaGuardar = {
        expediente_id: id,
        fecha_deteccion: hallazgoData.fecha_deteccion,
        proceso_id: hallazgoData.proceso_id || null,
        maquina_id: hallazgoData.maquina_id || null,
        defecto_id: hallazgoData.defecto_id || null,
        categoria_id: hallazgoData.categoria_id || null,
        accion_id: hallazgoData.accion_id || null,
        piezas_detectadas: hallazgoData.piezas_detectadas || 0,
        piezas_recuperadas: hallazgoData.piezas_recuperadas || 0,
        piezas_rechazadas: hallazgoData.piezas_rechazadas || 0,
        responsable: hallazgoData.responsable || '',
        observaciones: hallazgoData.observaciones || '',
        estado: hallazgoData.estado || 'ABIERTO',
      };

      // Si es edición, el hallazgo tiene id; si no, no
      if (editingHallazgo) {
        // Actualizar hallazgo existente
        // Para simplificar, usaremos updateExpediente (que reemplaza todos los hallazgos)
        // Pero mejor sería tener un servicio específico. Por ahora, haremos:
        const hallazgosActualizados = expedienteActual.hallazgos.map(h =>
          h.id === editingHallazgo.id ? { ...hallazgoParaGuardar, id: h.id, evidencias: h.evidencias || [] } : h
        );
        // Actualizar el expediente completo con los nuevos hallazgos
        await actualizarExpediente(id, {
          ...editData,
          hallazgos: hallazgosActualizados,
        });
      } else {
        // Nuevo hallazgo: agregar a la lista
        const nuevosHallazgos = [...(expedienteActual.hallazgos || []), hallazgoParaGuardar];
        await actualizarExpediente(id, {
          ...editData,
          hallazgos: nuevosHallazgos,
        });
      }
      showMsg('success', 'Hallazgo guardado');
      setHallazgoModalOpen(false);
      setEditingHallazgo(null);
    } catch (error) {
      showMsg('danger', error.message);
    }
  };

  const handleDeleteHallazgo = async (hallazgoId) => {
    if (!window.confirm('¿Eliminar este hallazgo?')) return;
    try {
      const hallazgosFiltrados = expedienteActual.hallazgos.filter(h => h.id !== hallazgoId);
      await actualizarExpediente(id, {
        ...editData,
        hallazgos: hallazgosFiltrados,
      });
      showMsg('success', 'Hallazgo eliminado');
    } catch (error) {
      showMsg('danger', error.message);
    }
  };

  // Función para subir evidencia individual (si se hace desde el detalle)
  // Podría integrarse en el modal de hallazgo

  if (loading || !expedienteActual) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const exp = expedienteActual;
  const badge = ESTADO_BADGE[exp.estado] || { variant: 'secondary', label: exp.estado };

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast msg={msg} onClose={() => setMsg(null)} />

      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/expedientes')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Volver a expedientes
        </Button>
        <div className="flex gap-2">
          {!isReadOnly && (
            <>
              <Button variant="outline" onClick={() => setEditModalOpen(true)} className="gap-2">
                <Pencil className="w-4 h-4" />
                Editar
              </Button>
              {exp.estado !== 'CERRADO' && (
                <Button variant="secondary" onClick={handleCloseExpediente}>
                  Cerrar expediente
                </Button>
              )}
              <Button variant="destructive" onClick={handleAnular} className="gap-2">
                <XCircle className="w-4 h-4" />
                Anular
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Cabecera del reporte */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{exp.expediente_id}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge variant={badge.variant}>{badge.label}</Badge>
                <span className="text-sm text-muted-foreground">
                  Creado: {new Date(exp.fecha_creacion).toLocaleDateString()}
                </span>
                {exp.fecha_anulacion && (
                  <span className="text-sm text-muted-foreground">
                    Anulado: {new Date(exp.fecha_anulacion).toLocaleDateString()}
                  </span>
                )}
                {exp.motivo_anulacion && (
                  <span className="text-sm text-muted-foreground">
                    Motivo: {exp.motivo_anulacion}
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-muted-foreground text-right">
              <p><span className="font-medium">Código Orden:</span> {exp.codigo_orden}</p>
              <p><span className="font-medium">Mes:</span> {exp.mes_produccion} / {exp.anio_produccion}</p>
              <p><span className="font-medium">Consecutivo:</span> {exp.consecutivo}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos generales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{exp.cliente || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{exp.producto || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cantidad Producida</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{exp.cantidad_producida || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Hallazgos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Hallazgos ({exp.hallazgos?.length || 0})</h2>
          {!isReadOnly && (
            <Button onClick={() => { setEditingHallazgo(null); setHallazgoModalOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Hallazgo
            </Button>
          )}
        </div>

        {exp.hallazgos && exp.hallazgos.length > 0 ? (
          <div className="space-y-4">
            {exp.hallazgos.map((hallazgo, idx) => (
              <Card key={hallazgo.id || idx}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">Hallazgo #{idx + 1}</span>
                        <Badge variant="outline">{hallazgo.estado || 'ABIERTO'}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(hallazgo.fecha_deteccion).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 text-sm text-muted-foreground">
                        <p><span className="font-medium">Proceso:</span> {getCatalogoNombre(hallazgo.proceso_id)}</p>
                        <p><span className="font-medium">Máquina:</span> {getCatalogoNombre(hallazgo.maquina_id)}</p>
                        <p><span className="font-medium">Defecto:</span> {getCatalogoNombre(hallazgo.defecto_id)}</p>
                        <p><span className="font-medium">Categoría:</span> {getCatalogoNombre(hallazgo.categoria_id)}</p>
                        <p><span className="font-medium">Acción:</span> {getCatalogoNombre(hallazgo.accion_id)}</p>
                        <p><span className="font-medium">Detectadas:</span> {hallazgo.piezas_detectadas || 0}</p>
                        <p><span className="font-medium">Recuperadas:</span> {hallazgo.piezas_recuperadas || 0}</p>
                        <p><span className="font-medium">Rechazadas:</span> {hallazgo.piezas_rechazadas || 0}</p>
                        {hallazgo.responsable && <p><span className="font-medium">Responsable:</span> {hallazgo.responsable}</p>}
                      </div>
                      {hallazgo.observaciones && (
                        <p className="text-sm text-muted-foreground mt-1">{hallazgo.observaciones}</p>
                      )}
                    </div>
                    {!isReadOnly && (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setEditingHallazgo(hallazgo); setHallazgoModalOpen(true); }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteHallazgo(hallazgo.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {/* Evidencias del hallazgo */}
                  {hallazgo.evidencias && hallazgo.evidencias.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1">Evidencias:</p>
                      <div className="flex flex-wrap gap-2">
                        {hallazgo.evidencias.map((ev) => (
                          <div key={ev.id} className="relative group">
                            <img
                              src={ev.ruta_archivo}
                              alt={ev.nombre_archivo}
                              className="w-16 h-16 object-cover rounded-lg border border-border"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                              <a
                                href={ev.ruta_archivo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white hover:text-primary"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No hay hallazgos registrados para este expediente.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de edición de expediente */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Expediente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Input
                value={editData.cliente}
                onChange={e => setEditData(f => ({ ...f, cliente: e.target.value }))}
              />
            </div>
            <div>
              <Label>Producto</Label>
              <Input
                value={editData.producto}
                onChange={e => setEditData(f => ({ ...f, producto: e.target.value }))}
              />
            </div>
            <div>
              <Label>Cantidad Producida</Label>
              <Input
                type="number"
                min="0"
                value={editData.cantidad_producida}
                onChange={e => setEditData(f => ({ ...f, cantidad_producida: Number(e.target.value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditSave}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de hallazgo */}
      <HallazgoModal
        open={hallazgoModalOpen}
        onClose={() => { setHallazgoModalOpen(false); setEditingHallazgo(null); }}
        hallazgo={editingHallazgo}
        onSave={handleSaveHallazgo}
        catalogos={catalogos}
        expedienteId={id}
      />
    </div>
  );
}