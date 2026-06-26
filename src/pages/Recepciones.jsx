import React, { useEffect, useState, useMemo } from 'react';
import { useRecepciones } from '../context/RecepcionesContext';
import { useCatalogos } from '../context/CatalogosContext';
import { SearchInput } from '../components/ui/search-input';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.jsx';
import { Badge } from '../components/ui/badge.jsx';
import { Card, CardContent } from '../components/ui/card.jsx';
import { Plus, Save, FolderOpen, XCircle, CheckCircle2, AlertCircle, Loader2, List, PenSquare, Eye, ChevronRight, Calendar, Package, Truck, Trash2 } from 'lucide-react';
import { confirm } from '../lib/sweetAlert';
import { Link, useNavigate } from 'react-router-dom';
import { formatDateSpanish } from '../lib/utils';
import { cn } from '../lib/utils';

// Opciones para filtros (meses y años)
const MONTHS = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

const MES_OPCIONES = Object.entries(MONTHS).map(([id, nombre]) => ({
  value: id,
  label: nombre,
}));

const ANIOS_OPCIONES = Array.from({ length: 10 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: String(year), label: String(year) };
});

function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }
  return (
    <div className="flex gap-1">
      {pages.map((p) => (
        <Button
          key={p}
          variant={p === currentPage ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPageChange(p)}
        >
          {p}
        </Button>
      ))}
    </div>
  );
}

export default function Recepciones() {
  const navigate = useNavigate();
  const { catalogos } = useCatalogos();
  const {
    recepciones,
    total,
    page,
    limit,
    search,
    estado,
    loading,
    loadRecepciones,
    setSearch,
    setEstado,
    setPage,
    deleteRecepcion,
  } = useRecepciones();

  // Estados de filtro adicionales
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroProducto, setFiltroProducto] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [searchTerm, setSearchTerm] = useState(search);

  // View: 'list' o 'create'
  const [view, setView] = useState('list');

  // Cargar recepciones cuando cambian los filtros
  useEffect(() => {
    loadRecepciones();
  }, [
    page,
    search,
    estado,
    filtroMes,
    filtroAnio,
    filtroProveedor,
    filtroProducto,
    filtroFechaDesde,
    filtroFechaHasta,
    loadRecepciones,
  ]);

  // Manejar búsqueda por texto (se dispara al hacer clic en buscar o al escribir 3 caracteres)
  const handleSearch = (value) => {
    setSearchTerm(value);
    if (value.length >= 3 || value === '') {
      setSearch(value);
    }
  };

  // Contar filtros activos
  const filtrosActivos = [
    estado,
    filtroMes,
    filtroAnio,
    filtroProveedor,
    filtroProducto,
    filtroFechaDesde,
    filtroFechaHasta,
    searchTerm.length >= 3 ? 'busqueda' : null,
  ].filter(Boolean).length;

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    setEstado('');
    setFiltroMes('');
    setFiltroAnio('');
    setFiltroProveedor('');
    setFiltroProducto('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setSearchTerm('');
    setSearch('');
  };

  // Obtener proveedores del catálogo
  const proveedores = catalogos?.['PROVEEDORES'] || [];

  // Eliminar recepción
  const handleDelete = async (id, recepcionId) => {
    const result = await confirm(
      `¿Eliminar recepción ${recepcionId}?`,
      'Esta acción no se puede deshacer',
      'Sí, eliminar',
      'Cancelar'
    );
    if (result.isConfirmed) {
      await deleteRecepcion(id);
      loadRecepciones();
    }
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
              onClick={() => {
                setView('create');
                navigate('/recepciones/nuevo');
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                view === 'create'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <PenSquare className="w-4 h-4" />
              Nueva Recepción
            </button>
          </div>
        </div>

        {view === 'list' && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Buscador */}
            <div className="w-64">
              <SearchInput
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Buscar por folio, proveedor..."
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
                {MES_OPCIONES.map((mes) => (
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
                {ANIOS_OPCIONES.map((anio) => (
                  <SelectItem key={anio.value} value={anio.value}>
                    {anio.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por proveedor */}
            <Select value={filtroProveedor} onValueChange={setFiltroProveedor}>
              <SelectTrigger className="w-48">
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5" />
                  <SelectValue placeholder="Proveedor" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los proveedores</SelectItem>
                {proveedores.map((prov) => (
                  <SelectItem key={prov.id} value={prov.id}>
                    {prov.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por estado */}
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="COMPLETADA">Completada</SelectItem>
                <SelectItem value="RECHAZADA">Rechazada</SelectItem>
                <SelectItem value="ANULADA">Anulada</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por rango de fechas (opcional) */}
            
          </div>
        )}
      </div>
     
      {/* Contenido principal */}
      {view === 'create' ? (
        // El formulario se renderiza en la ruta /recepciones/nuevo, aquí solo redirigimos
        <div className="text-center py-10 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          Redirigiendo al formulario...
        </div>
      ) : (
        <>
          {/* Indicador de filtros activos */}
          {filtrosActivos > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <span>Filtros activos:</span>
              {estado && (
                <Badge variant="outline" className="capitalize">
                  {estado.toLowerCase()}
                  <button
                    onClick={() => setEstado('')}
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
              {filtroProveedor && (
                <Badge variant="outline">
                  {proveedores.find((p) => p.id === filtroProveedor)?.nombre || 'Proveedor'}
                  <button
                    onClick={() => setFiltroProveedor('')}
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
                    onClick={() => {
                      setSearchTerm('');
                      setSearch('');
                    }}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filtroFechaDesde && (
                <Badge variant="outline">
                  Desde: {formatDateSpanish(filtroFechaDesde)}
                  <button
                    onClick={() => setFiltroFechaDesde('')}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filtroFechaHasta && (
                <Badge variant="outline">
                  Hasta: {formatDateSpanish(filtroFechaHasta)}
                  <button
                    onClick={() => setFiltroFechaHasta('')}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={limpiarFiltros}
                className="text-muted-foreground hover:text-foreground"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Limpiar {filtrosActivos}
              </Button>
            </div>
          )}

          {/* Lista de recepciones */}
          <div className="space-y-3">
            {recepciones.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">
                    {filtrosActivos > 0
                      ? 'No hay recepciones que coincidan con los filtros aplicados.'
                      : 'No hay recepciones registradas.'}
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
                  {!filtrosActivos && (
                    <Link to="/recepciones/nuevo">
                      <Button className="mt-4">
                        <Plus className="mr-2 h-4 w-4" />
                        Crear primera recepción
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              recepciones.map((recep) => {
                const tipoDocLabel = {
                  FACTURA: 'Factura',
                  REMISION: 'Remisión',
                  ORDEN_COMPRA: 'Orden de compra',
                }[recep.tipo_documento] || 'Documento';

                // Calcular total de productos y unidades para el resumen
                const totalProductos = recep.resumen?.length || 0;
                const totalCantidad = recep.resumen?.reduce(
                  (sum, d) => sum + Number(d.cantidad),
                  0
                ) || 0;

                return (
                  <Card
                    key={recep.id}
                    className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer group"
                    onClick={() => navigate(`/recepciones/${recep.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground">
                                {recep.factura && (
                                    <span className="text-xs text-muted-foreground">
                                    {tipoDocLabel}: {recep.factura}
                                    </span>
                                )}
                              </span>
                              
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
                              <span className="text-xs text-muted-foreground">
                                {formatDateSpanish(recep.fecha_recepcion)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              Proveedor: {recep.proveedor_nombre || 'N/A'}
                              
                              {recep.resumen && recep.resumen.length > 0 && (
                                <>
                                  {' · '}
                                  {recep.resumen
                                    .map(
                                      (d) =>
                                        `${d.producto} (${d.cantidad} ${d.unidad_medida})`
                                    )
                                    .join(', ')}
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-4 text-sm flex-shrink-0">
                          <div className="text-center">
                            <p className="font-semibold text-foreground">
                              {totalProductos}
                            </p>
                            <p className="text-xs text-muted-foreground">Productos</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-foreground">
                              {totalCantidad}
                            </p>
                            <p className="text-xs text-muted-foreground">Unidades</p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/recepciones/${recep.id}`);
                              }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1.5 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/recepciones/editar/${recep.id}`);
                              }}
                            >
                              <PenSquare className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1.5 text-xs text-red-500 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(recep.id, recep.recepcion_id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* Paginación */}
          {total > limit && (
            <div className="flex justify-center mt-6">
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(total / limit)}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}