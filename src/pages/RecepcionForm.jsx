import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecepciones } from '../context/RecepcionesContext';
import { useCatalogos } from '../context/CatalogosContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Textarea } from '../components/ui/textarea.jsx';
import { Button } from '../components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.jsx';
import { SearchSelect } from '../components/ui/search-select.jsx';
import { toast } from '../lib/sweetAlert';
import { Save, Loader2, Plus, Trash2 } from 'lucide-react';

// Componente para una fila de producto (con mejor distribución)
function ProductoRow({ index, producto, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-end border-b border-border pb-2 mb-2">
      <div className="col-span-4">
        <Label className="text-xs">Producto *</Label>
        <Input
          value={producto.producto}
          onChange={(e) => onChange(index, 'producto', e.target.value)}
          placeholder="Nombre del producto"
        />
      </div>
      <div className="col-span-2">
        <Label className="text-xs">Cantidad *</Label>
        <Input
          type="number"
          step="0.001"
          value={producto.cantidad}
          onChange={(e) => onChange(index, 'cantidad', parseFloat(e.target.value) || 0)}
          placeholder="0"
        />
      </div>
      <div className="col-span-2">
        <Label className="text-xs">Unidad *</Label>
        <Input
          value={producto.unidad_medida}
          onChange={(e) => onChange(index, 'unidad_medida', e.target.value)}
          placeholder="kg, unid, etc."
        />
      </div>
      <div className="col-span-3">
        <Label className="text-xs">Descripción</Label>
        <Input
          value={producto.descripcion || ''}
          onChange={(e) => onChange(index, 'descripcion', e.target.value)}
          placeholder="Opcional"
        />
      </div>
      <div className="col-span-1 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)}>
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}

export default function RecepcionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { createRecepcion, updateRecepcion, loadRecepcionDetail } = useRecepciones();
  const { catalogos } = useCatalogos();

  const [formData, setFormData] = useState({
    fecha_recepcion: new Date().toISOString().split('T')[0],
    responsable: '',
    factura: '',
    tipo_documento: 'FACTURA', // nuevo campo
    proveedor_id: '',
    proveedor_nombre: '',
    observaciones: '',
    estado: 'PENDIENTE',
  });

  const [productos, setProductos] = useState([]);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(id);

  const proveedores = catalogos?.['PROVEEDORES'] || [];

  useEffect(() => {
    if (isEdit) {
      loadRecepcionDetail(id).then((data) => {
        if (data) {
          setFormData({
            fecha_recepcion: data.fecha_recepcion,
            responsable: data.responsable || '',
            factura: data.factura || '',
            tipo_documento: data.tipo_documento || 'FACTURA',
            proveedor_id: data.proveedor_id || '',
            proveedor_nombre: data.proveedor_nombre || '',
            observaciones: data.observaciones || '',
            estado: data.estado || 'PENDIENTE',
          });
          if (data.detalles) {
            setProductos(
              data.detalles.map((d) => ({
                producto: d.producto,
                cantidad: d.cantidad,
                unidad_medida: d.unidad_medida,
                descripcion: d.descripcion || '',
              }))
            );
          }
        }
      });
    } else {
      setProductos([{ producto: '', cantidad: 0, unidad_medida: '', descripcion: '' }]);
    }
  }, [id, isEdit, loadRecepcionDetail]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addProducto = () => {
    setProductos([...productos, { producto: '', cantidad: 0, unidad_medida: '', descripcion: '' }]);
  };

  const removeProducto = (index) => {
    if (productos.length === 1) {
      toast('warning', 'Debe haber al menos un producto');
      return;
    }
    setProductos(productos.filter((_, i) => i !== index));
  };

  const updateProducto = (index, field, value) => {
    const updated = [...productos];
    updated[index][field] = value;
    setProductos(updated);
  };

  // Función segura para obtener opciones de catálogo
  const catalogoOptions = (codigoTipo) => {
    if (!catalogos || !catalogos[codigoTipo]) return [];
    return catalogos[codigoTipo].map(item => ({ value: item.id, label: item.nombre }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fecha_recepcion) {
      toast('error', 'La fecha de recepción es obligatoria');
      return;
    }
    if (!formData.proveedor_nombre && !formData.proveedor_id) {
      toast('error', 'Debes seleccionar o escribir un proveedor');
      return;
    }

    if (productos.length === 0) {
      toast('error', 'Debes agregar al menos un producto');
      return;
    }
    for (let p of productos) {
      if (!p.producto.trim()) {
        toast('error', 'Todos los productos deben tener nombre');
        return;
      }
      if (!p.cantidad || p.cantidad <= 0) {
        toast('error', 'La cantidad debe ser mayor a 0');
        return;
      }
      if (!p.unidad_medida.trim()) {
        toast('error', 'Todos los productos deben tener unidad de medida');
        return;
      }
    }

    setSaving(true);
    try {
      const dataToSend = {
        ...formData,
        proveedor_id: formData.proveedor_id || null,
        proveedor_nombre:
          formData.proveedor_nombre ||
          (formData.proveedor_id
            ? proveedores?.find((p) => p.id === formData.proveedor_id)?.nombre
            : ''),
        detalles: productos,
      };

      if (isEdit) {
        await updateRecepcion(id, dataToSend);
      } else {
        await createRecepcion(dataToSend);
      }
      navigate('/recepciones');
    } catch (error) {
      // el contexto maneja el toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">{isEdit ? 'Editar Recepción' : 'Nueva Recepción'}</h2>
        <p className="text-muted-foreground">
          {isEdit ? 'Modifica los datos de la recepción' : 'Registra la entrada de materia prima'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Save className="w-5 h-5 text-primary" />
            {isEdit ? 'Actualizar recepción' : 'Crear recepción'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Cabecera */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fecha de Recepción *</Label>
                <Input
                  type="date"
                  name="fecha_recepcion"
                  value={formData.fecha_recepcion}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Responsable</Label>
                <Input
                  name="responsable"
                  value={formData.responsable}
                  onChange={handleChange}
                  placeholder="Nombre de quien recibe"
                />
              </div>
              <div className="space-y-1.5">
                
                <div className="flex flex-wrap items-center gap-0.5 bg-muted/30 p-0.5 rounded-lg">
                  <span className="text-sm font-medium">Tipo:</span>
                  <div className="flex items-center gap-3">
                    {['FACTURA', 'REMISION', 'ORDEN_COMPRA'].map((tipo) => (
                      <label key={tipo} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="tipo_documento"
                          value={tipo}
                          checked={formData.tipo_documento === tipo}
                          onChange={handleChange}
                          className="accent-primary"
                        />
                        {tipo === 'FACTURA' ? 'Factura' : tipo === 'REMISION' ? 'Remisión' : 'Orden de compra'}
                      </label>
                    ))}
                  </div>
                </div>
                <Input
                  name="factura"
                  value={formData.factura}
                  onChange={handleChange}
                  placeholder="Número de documento (ej: A-1234)"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Proveedor *</Label>
                <SearchSelect
                  options={catalogoOptions('PROVEEDORES')}
                  value={formData.proveedor_id}
                  onChange={(val) => setFormData(f => ({ ...f, proveedor_id: val }))}
                  placeholder="Seleccionar Proveedor..."
                />
                {formData.proveedor_nombre && !formData.proveedor_id && (
                  <p className="text-xs text-muted-foreground mt-1">Nuevo: {formData.proveedor_nombre}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(val) => handleSelectChange('estado', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="COMPLETADA">Completada</SelectItem>
                    <SelectItem value="RECHAZADA">Rechazada</SelectItem>
                    <SelectItem value="ANULADA">Anulada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Observaciones</Label>
                <Textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleChange}
                  rows={2}
                />
              </div>
            </div>

            {/* Productos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Productos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addProducto}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </div>
              {productos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay productos agregados.</p>
              ) : (
                <div className="space-y-1">
                  {productos.map((p, idx) => (
                    <ProductoRow
                      key={idx}
                      index={idx}
                      producto={p}
                      onChange={updateProducto}
                      onRemove={removeProducto}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/recepciones')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEdit ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}