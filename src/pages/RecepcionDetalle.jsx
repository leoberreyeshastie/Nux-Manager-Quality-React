import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRecepciones } from '../context/RecepcionesContext';
import { Card, CardContent } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Badge } from '../components/ui/badge.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog.jsx';
import { confirm, toast, errorAlert } from '../lib/sweetAlert';
import { formatDateSpanish } from '../lib/utils';
import { getSignedUrl } from '../services/evidenciasRecepcionService';
import { compressImage } from '../lib/compressImage';
import {
  ArrowLeft,
  Upload,
  Trash2,
  Download,
  File,
  Loader2,
  Image as ImageIcon,
  Plus,
  X,
  Package,
  FileText,
} from 'lucide-react';

export default function RecepcionDetalle() {
  const { id } = useParams();
  const { selectedRecepcion, loadRecepcionDetail, addEvidencia, removeEvidencia } = useRecepciones();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Estado para URLs firmadas de evidencias
  const [evidenciasConUrl, setEvidenciasConUrl] = useState([]);

  // Estado para el modal de subida
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState(null); // Archivo original o comprimido
  const [tipoArchivo, setTipoArchivo] = useState('foto_producto');
  const [descripcion, setDescripcion] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  // Estado para el modal de visualización de imagen ampliada
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Cargar detalle y generar URLs firmadas
  useEffect(() => {
    if (id) {
      loadRecepcionDetail(id)
        .then(async (data) => {
          if (data && data.evidencias) {
            const evidenciasConUrlPromises = data.evidencias.map(async (ev) => {
              try {
                const signedUrl = await getSignedUrl(ev.ruta_archivo, 300);
                return { ...ev, signedUrl };
              } catch (error) {
                console.error('Error al generar URL para:', ev.nombre_archivo, error);
                return { ...ev, signedUrl: null };
              }
            });
            const evidenciasConUrl = await Promise.all(evidenciasConUrlPromises);
            setEvidenciasConUrl(evidenciasConUrl);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [id, loadRecepcionDetail]);

  // Manejar selección de archivo (con compresión si es imagen)
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Si es imagen, comprimir (igual que en Expedientes)
    if (selectedFile.type.startsWith('image/')) {
      try {
        setIsCompressing(true);
        const compressed = await compressImage(selectedFile, 1024, 0.8);
        setFile(compressed);
        toast('info', 'Imagen comprimida correctamente');
      } catch (error) {
        console.error('Error al comprimir imagen:', error);
        await errorAlert('Error al comprimir imagen', 'Se usará la imagen original');
        setFile(selectedFile); // fallback: usar original
      } finally {
        setIsCompressing(false);
      }
    } else {
      // No es imagen (ej. PDF), se usa el archivo original
      setFile(selectedFile);
    }
  };

  // Subir evidencia desde el modal
  const handleUpload = async () => {
    if (!file) {
      toast('error', 'Selecciona un archivo');
      return;
    }
    setUploading(true);
    try {
      await addEvidencia(file, id, tipoArchivo, descripcion);
      setFile(null);
      setDescripcion('');
      setTipoArchivo('foto_producto');
      setShowUploadModal(false);
      // Recargar detalle
      const data = await loadRecepcionDetail(id);
      if (data && data.evidencias) {
        const evidenciasConUrlPromises = data.evidencias.map(async (ev) => {
          try {
            const signedUrl = await getSignedUrl(ev.ruta_archivo, 300);
            return { ...ev, signedUrl };
          } catch (error) {
            return { ...ev, signedUrl: null };
          }
        });
        const evidenciasConUrl = await Promise.all(evidenciasConUrlPromises);
        setEvidenciasConUrl(evidenciasConUrl);
      }
    } catch (error) {
      // ya manejado en contexto
    } finally {
      setUploading(false);
    }
  };

  // Eliminar evidencia
  const handleDeleteEvidencia = async (evidencia) => {
    const result = await confirm(
      `¿Eliminar evidencia "${evidencia.nombre_archivo}"?`,
      'Esta acción no se puede deshacer',
      'Sí, eliminar',
      'Cancelar'
    );
    if (result.isConfirmed) {
      const filePath = evidencia.ruta_archivo;
      await removeEvidencia(evidencia.id, filePath);
      setEvidenciasConUrl((prev) => prev.filter((e) => e.id !== evidencia.id));
      await loadRecepcionDetail(id);
    }
  };

  // Abrir modal de imagen ampliada
  const openImageViewer = (imageUrl, fileName) => {
    setSelectedImage({ url: imageUrl, name: fileName });
    setShowImageModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedRecepcion) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Recepción no encontrada
        </CardContent>
      </Card>
    );
  }

  const recep = selectedRecepcion;

  // Calcular cantidad total de productos
  const totalCantidad = recep.detalles?.reduce((sum, d) => sum + Number(d.cantidad), 0) || 0;
  const resumenUnidades = recep.detalles?.reduce((acc, d) => {
    acc[d.unidad_medida] = (acc[d.unidad_medida] || 0) + Number(d.cantidad);
    return acc;
  }, {});

  // Obtener etiqueta del tipo de documento
  const tipoDocLabel = {
    FACTURA: 'Factura',
    REMISION: 'Remisión',
    ORDEN_COMPRA: 'Orden de compra',
  }[recep.tipo_documento] || 'Documento';

  // Contar evidencias
  const totalEvidencias = evidenciasConUrl?.length || 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Recepción {formatDateSpanish(recep.fecha_recepcion)}</h2>
        </div>
        <Link to="/recepciones">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>

      {/* Información principal */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label>Documento</Label>
              <p className="font-medium">
                {recep.factura ? `${tipoDocLabel}: ${recep.factura}` : 'N/A'}
              </p>
            </div>
            <div className="col-span-2">
              <Label>Proveedor</Label>
              <p className="font-medium">{recep.proveedor_nombre || 'N/A'}</p>
            </div>
            <div>
              <Label>Total Productos</Label>
              <p className="font-medium flex items-center gap-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                {totalCantidad}
                {Object.entries(resumenUnidades).map(([unidad, cantidad]) => (
                  <span key={unidad} className="text-xs text-muted-foreground ml-1">
                    ({cantidad} {unidad})
                  </span>
                ))}
              </p>
            </div>
            <div>
              <Label>Responsable</Label>
              <p className="font-medium">{recep.responsable || 'N/A'}</p>
            </div>
            <div>
              <Label>Estado</Label>
              <Badge
                variant={
                  recep.estado === 'COMPLETADA'
                    ? 'success'
                    : recep.estado === 'PENDIENTE'
                    ? 'warning'
                    : recep.estado === 'RECHAZADA'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {recep.estado}
              </Badge>
            </div>
            <div className="col-span-6">
              <Label>Observaciones</Label>
              <p className="text-muted-foreground">{recep.observaciones || 'Sin observaciones'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de productos */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Productos</h3>
        {recep.detalles && recep.detalles.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left">Producto</th>
                  <th className="px-4 py-2 text-right">Cantidad</th>
                  <th className="px-4 py-2 text-left">Unidad</th>
                  <th className="px-4 py-2 text-left">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {recep.detalles.map((d, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">{d.producto}</td>
                    <td className="px-4 py-2 text-right">{d.cantidad}</td>
                    <td className="px-4 py-2">{d.unidad_medida}</td>
                    <td className="px-4 py-2 text-muted-foreground">{d.descripcion || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">No hay productos registrados.</p>
        )}
      </div>

      {/* Evidencias */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Evidencias {totalEvidencias > 0 && <span className="text-muted-foreground">({totalEvidencias})</span>}
          </h3>
          <Button size="sm" onClick={() => setShowUploadModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Subir evidencia
          </Button>
        </div>

        {/* Galería */}
        {evidenciasConUrl && evidenciasConUrl.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {evidenciasConUrl.map((ev) => {
              const isImage =
                ev.tipo_archivo === 'foto_producto' ||
                ev.tipo_archivo === 'foto_recepcion' ||
                ev.nombre_archivo?.match(/\.(jpeg|jpg|png|gif|webp)$/i);
              const isPdf = ev.nombre_archivo?.endsWith('.pdf') || ev.tipo_archivo === 'factura_pdf';

              if (!ev.signedUrl) {
                return (
                  <div key={ev.id} className="relative border rounded-lg overflow-hidden group">
                    <div className="h-32 bg-gray-100 flex items-center justify-center">
                      <File className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div className="p-2 text-sm truncate">{ev.nombre_archivo}</div>
                    <div className="p-2 text-xs text-red-500">Error al cargar</div>
                  </div>
                );
              }

              return (
                <div key={ev.id} className="relative border rounded-lg overflow-hidden group">
                  {isImage ? (
                    <img
                      src={ev.signedUrl}
                      alt={ev.nombre_archivo}
                      className="h-32 w-full object-cover cursor-pointer"
                      onClick={() => openImageViewer(ev.signedUrl, ev.nombre_archivo)}
                      onError={(e) => {
                        e.target.src = '';
                        e.target.alt = 'Error al cargar imagen';
                        e.target.className = 'h-32 w-full object-cover bg-gray-100';
                      }}
                    />
                  ) : isPdf ? (
                    <div className="h-32 bg-gray-100 flex items-center justify-center">
                      <FileText className="h-12 w-12 text-red-500" />
                    </div>
                  ) : (
                    <div className="h-32 bg-gray-100 flex items-center justify-center">
                      <File className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-2 text-sm truncate">{ev.nombre_archivo}</div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    {isImage && ev.signedUrl && (
                      <button
                        onClick={() => openImageViewer(ev.signedUrl, ev.nombre_archivo)}
                        className="p-1 bg-white rounded shadow"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </button>
                    )}
                    {ev.signedUrl && (
                      <a
                        href={ev.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 bg-white rounded shadow"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteEvidencia(ev)}
                      className="p-1 bg-white rounded shadow text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-muted-foreground">No hay evidencias cargadas.</div>
        )}
      </div>

      {/* MODAL PARA SUBIR EVIDENCIA */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subir evidencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="file">Archivo (imagen o PDF)</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept="image/*,application/pdf"
                className="mt-1"
                disabled={isCompressing}
              />
              {isCompressing && (
                <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Comprimiendo imagen...
                </p>
              )}
              {file && !isCompressing && (
                <p className="text-xs text-muted-foreground mt-1">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={tipoArchivo} onValueChange={setTipoArchivo}>
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="foto_producto">Foto producto</SelectItem>
                  <SelectItem value="foto_recepcion">Foto recepción</SelectItem>
                  <SelectItem value="factura_pdf">Factura PDF</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="desc">Descripción (opcional)</Label>
              <Input
                id="desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Breve descripción"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={!file || uploading || isCompressing}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
              Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL PARA VER IMAGEN AMPLIADA */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
          <div className="relative bg-black">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 z-10"
            >
              <X className="h-6 w-6" />
            </button>
            {selectedImage && (
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="w-full h-auto max-h-[80vh] object-contain"
                onError={(e) => {
                  e.target.src = '';
                  e.target.alt = 'Error al cargar imagen';
                }}
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <p className="text-white text-sm">{selectedImage?.name}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}