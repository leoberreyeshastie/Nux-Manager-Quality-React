import { useState } from 'react';
import { useCatalogos } from '../context/CatalogosContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Settings, Database, Pencil, Trash2, Plus, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { getTiposCatalogo } from '../services/catalogosService';

// Componente Toast local (similar al de Expedientes)
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

// Componente Sidebar de tipos
function CatalogosSidebar({ tipos, tipoSeleccionado, onSelectTipo }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="w-5 h-5" />
          Tipos de Catálogo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tipos.map(tipo => (
            <button
              key={tipo.id}
              onClick={() => onSelectTipo(tipo)}
              className={cn(
                'w-full text-left px-4 py-3 rounded-lg border transition-all',
                tipoSeleccionado?.id === tipo.id
                  ? 'bg-primary text-white border-primary'
                  : 'hover:bg-muted'
              )}
            >
              {tipo.nombre}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente Lista de items
function CatalogosList({ items, onEdit, onDelete }) {
  if (items.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-8">
        No hay registros para este catálogo.
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      {items.map(item => (
        <div key={item.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
          <div>
            <div className="font-medium">{item.nombre}</div>
            {item.descripcion && (
              <div className="text-sm text-muted-foreground">{item.descripcion}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge>{item.codigo || 'ITEM'}</Badge>
            <Button size="icon" variant="ghost" onClick={() => onEdit(item)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(item)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Modal de formulario
function ItemFormModal({ open, onClose, editingItem, onSave, loading }) {
  const [form, setForm] = useState({
    nombre: editingItem?.nombre || '',
    codigo: editingItem?.codigo || '',
    descripcion: editingItem?.descripcion || '',
  });

  // Si editingItem cambia, actualizar el formulario
  useState(() => {
    if (editingItem) {
      setForm({
        nombre: editingItem.nombre || '',
        codigo: editingItem.codigo || '',
        descripcion: editingItem.descripcion || '',
      });
    } else {
      setForm({ nombre: '', codigo: '', descripcion: '' });
    }
  }, [editingItem, open]);

  const handleSubmit = () => {
    if (!form.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Editar registro' : 'Nuevo registro'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nombre *</Label>
            <Input
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre del item"
            />
          </div>
          <div>
            <Label>Código</Label>
            <Input
              value={form.codigo}
              onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
              placeholder="Código (opcional)"
            />
          </div>
          <div>
            <Label>Descripción</Label>
            <Input
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Descripción (opcional)"
            />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Página principal de Configuración
export default function Configuracion() {
  const { catalogos, loading, crearItem, actualizarItem, eliminarItem } = useCatalogos();
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Obtener tipos desde catalogos (las claves son los códigos, pero necesitamos los objetos)
  // Como catalogos es un objeto con clave codigo, necesitamos obtener los tipos desde la BD o desde otro lado.
  // Para simplificar, usaremos un estado local de tipos que se obtiene del contexto o lo cargamos.
  // Pero no tenemos tipos en el contexto, solo catalogos. Podemos obtenerlos haciendo una consulta.
  // Mejor: agregar un estado en el contexto para tipos, o aquí hacer una consulta.
  // Opción rápida: usar un useEffect para obtener tipos y guardarlos en estado local.
  // Pero como CatalogosContext solo tiene catalogos, podemos deducir los tipos de las claves,
  // pero eso no nos da el id del tipo.
  // Vamos a pedir los tipos directamente desde el servicio.
  
  const [tipos, setTipos] = useState([]);
  const [tiposLoading, setTiposLoading] = useState(true);

  // Cargar tipos al montar
  useState(() => {
    getTiposCatalogo()
      .then(data => {
        setTipos(data);
        if (data.length > 0) {
          setTipoSeleccionado(data[0]);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setTiposLoading(false));
  }, []);

  // Mostrar mensajes
  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  // Manejar selección de tipo
  const handleSelectTipo = (tipo) => {
    setTipoSeleccionado(tipo);
  };

  // Abrir modal para nuevo
  const handleNew = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  // Abrir modal para editar
  const handleEdit = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  // Guardar (crear o editar)
  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editingItem) {
        // Editar
        await actualizarItem(editingItem.id, {
          nombre: formData.nombre,
          codigo: formData.codigo,
          descripcion: formData.descripcion,
        });
        showMsg('success', 'Item actualizado correctamente');
      } else {
        // Crear
        await crearItem(tipoSeleccionado.id, {
          nombre: formData.nombre,
          codigo: formData.codigo,
          descripcion: formData.descripcion,
        });
        showMsg('success', 'Item creado correctamente');
      }
      setModalOpen(false);
      setEditingItem(null);
      // Opcional: recargar la lista de tipos para actualizar el sidebar (aunque no cambian)
      // Podemos recargar los tipos si se agregó uno nuevo, pero eso no sucede aquí.
    } catch (error) {
      showMsg('danger', error.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar
  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar ${item.nombre}?`)) return;
    try {
      await eliminarItem(item.id);
      showMsg('success', 'Item eliminado');
    } catch (error) {
      showMsg('danger', error.message || 'Error al eliminar');
    }
  };

  // Obtener items del tipo seleccionado
  const items = tipoSeleccionado ? (catalogos[tipoSeleccionado.codigo] || []) : [];

  if (loading || tiposLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast msg={msg} onClose={() => setMsg(null)} />

      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Catálogos
        </h2>
        <p className="text-muted-foreground">Administración centralizada de catálogos del sistema</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <CatalogosSidebar
            tipos={tipos}
            tipoSeleccionado={tipoSeleccionado}
            onSelectTipo={handleSelectTipo}
          />
        </div>
        <div className="col-span-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  {tipoSeleccionado?.nombre || 'Selecciona un tipo'}
                </CardTitle>
                <Button onClick={handleNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CatalogosList
                items={items}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <ItemFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingItem={editingItem}
        onSave={handleSave}
        loading={saving}
      />
    </div>
  );
}