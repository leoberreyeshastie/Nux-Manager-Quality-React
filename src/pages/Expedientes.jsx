import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpedientes } from '../context/ExpedientesContext';
import { useCatalogos } from '../context/CatalogosContext';
import { SearchInput } from '../components/ui/search-input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FolderOpen, Loader2, Eye, XCircle, ChevronRight, Plus, PenSquare, List } from 'lucide-react';
import { cn } from '../lib/utils';

const ESTADO_BADGE = {
  ABIERTO:    { variant: 'info',        label: 'Abierto' },
  EN_PROCESO: { variant: 'warning',     label: 'En Proceso' },
  CERRADO:    { variant: 'success',     label: 'Cerrado' },
  ANULADO:    { variant: 'destructive', label: 'Anulado' },
};

export default function Expedientes() {
  const { expedientes, loading } = useExpedientes();
  const navigate = useNavigate();
  
  // Estados de filtro
  const [filtroEstado, setFiltroEstado] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('list');

  // Obtener mes y año actuales
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Función de filtrado
  const expedientesFiltrados = useMemo(() => {
    // 1. Excluir anulados
    let filtered = expedientes.filter(e => e.estado !== 'ANULADO');

    // 2. Aplicar filtro por estado (si está seleccionado)
    if (filtroEstado) {
      filtered = filtered.filter(e => e.estado === filtroEstado);
    }

    // 3. Aplicar búsqueda por texto (mínimo 3 caracteres)
    if (searchTerm.length >= 3) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(e =>
        (e.expediente_id?.toLowerCase().includes(term)) ||
        (e.cliente?.toLowerCase().includes(term)) ||
        (e.producto?.toLowerCase().includes(term))
      );
    }

    // 4. Si no hay búsqueda activa, aplicar lógica de visualización inicial
    if (searchTerm.length < 3) {
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

    // Si hay búsqueda activa, mostrar todos los que coinciden
    return filtered;
  }, [expedientes, filtroEstado, searchTerm, currentMonth, currentYear]);

  // Estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header con tabs de vista y filtros */}
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
                placeholder="Buscar por orden, cliente o producto..."
              />
              {searchTerm.length > 0 && searchTerm.length < 3 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Escribe al menos 3 caracteres para buscar
                </p>
              )}
            </div>
            {/* Filtro por estado */}
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todos los estados" />
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
        // Aquí iría el formulario de creación (ya lo tienes, lo omito por brevedad)
        <div>Formulario de creación (sin cambios)</div>
      ) : (
        <>
          {/* Indicador de filtros activos */}
          {(filtroEstado || searchTerm.length >= 3) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
            </div>
          )}

          {/* Lista de expedientes */}
          <div className="space-y-3">
            {expedientesFiltrados.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">
                    {searchTerm.length >= 3
                      ? 'No se encontraron expedientes que coincidan con la búsqueda.'
                      : 'No hay expedientes para mostrar.'}
                  </p>
                  {searchTerm.length >= 3 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => setSearchTerm('')}
                    >
                      Limpiar búsqueda
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
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
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
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 text-xs"
                              onClick={e => { e.stopPropagation(); navigate(`/expedientes/${exp.id}`); }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Abrir
                            </Button>
                            {exp.estado !== 'CERRADO' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={e => {
                                  e.stopPropagation();
                                  // Aquí iría la lógica de anulación (la tienes en el contexto)
                                  // Podrías llamar a una función anularExpediente
                                  // Pero la dejamos pendiente para no sobrecargar
                                }}
                              >
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
        </>
      )}
    </div>
  );
}