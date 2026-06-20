import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  getTiposCatalogo, 
  getItemsCatalogo,
  createItemCatalogo,
  updateItemCatalogo,
  deleteItemCatalogo
} from '../services/catalogosService';

const CatalogosContext = createContext();

export function CatalogosProvider({ children }) {
  const [catalogos, setCatalogos] = useState({});
  const [catalogosMap, setCatalogosMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar todos los catálogos
  const loadCatalogos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const tipos = await getTiposCatalogo();
      const itemsPromises = tipos.map(tipo => getItemsCatalogo(tipo.codigo));
      const itemsArrays = await Promise.all(itemsPromises);
      
      const catalogosObj = {};
      const mapObj = {};
      tipos.forEach((tipo, index) => {
        const items = itemsArrays[index];
        catalogosObj[tipo.codigo] = items;
        items.forEach(item => {
          mapObj[item.id] = item.nombre;
        });
      });
      setCatalogos(catalogosObj);
      setCatalogosMap(mapObj);
    } catch (err) {
      console.error('Error cargando catálogos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Recargar (útil después de CRUD)
  const refreshCatalogos = useCallback(() => {
    return loadCatalogos();
  }, [loadCatalogos]);

  // Obtener nombre de un item por ID
  const getCatalogoNombre = useCallback((id) => {
    return catalogosMap[id] || id || '—';
  }, [catalogosMap]);

  // --- CRUD ---

  // Crear nuevo item
  const crearItem = useCallback(async (tipoId, data) => {
    try {
      const nuevoItem = await createItemCatalogo({
        tipo_id: tipoId,
        nombre: data.nombre,
        codigo: data.codigo || '',
        descripcion: data.descripcion || '',
        activo: true
      });
      // Actualizar el estado catalogos local
      // Primero encontrar el código del tipo
      const tipos = await getTiposCatalogo(); // Podríamos tener los tipos en estado, pero para simplificar los obtenemos
      const tipo = tipos.find(t => t.id === tipoId);
      if (tipo) {
        const codigo = tipo.codigo;
        setCatalogos(prev => ({
          ...prev,
          [codigo]: [...(prev[codigo] || []), nuevoItem]
        }));
        // Actualizar el mapa
        setCatalogosMap(prev => ({
          ...prev,
          [nuevoItem.id]: nuevoItem.nombre
        }));
      }
      return nuevoItem;
    } catch (err) {
      console.error('Error creando item:', err);
      throw err;
    }
  }, []);

  // Actualizar item existente
  const actualizarItem = useCallback(async (id, data) => {
    try {
      const itemActualizado = await updateItemCatalogo(id, data);
      // Actualizar estado: buscar en qué tipo está y reemplazar
      // Para saber el tipo, podemos obtener el item actualizado que incluye tipo_id
      // Pero updateItemCatalogo solo devuelve el item sin tipo_id (depende de la función)
      // Podemos obtener el tipo_id del item antes de actualizar o después con una consulta extra.
      // Para simplificar, recargamos todo después de actualizar.
      // Usaremos refreshCatalogos para asegurar consistencia.
      await refreshCatalogos();
      return itemActualizado;
    } catch (err) {
      console.error('Error actualizando item:', err);
      throw err;
    }
  }, [refreshCatalogos]);

  // Eliminar item (soft delete)
  const eliminarItem = useCallback(async (id) => {
    try {
      await deleteItemCatalogo(id);
      // Recargar catálogos para reflejar cambio
      await refreshCatalogos();
    } catch (err) {
      console.error('Error eliminando item:', err);
      throw err;
    }
  }, [refreshCatalogos]);

  // Cargar al montar
  useEffect(() => {
    loadCatalogos();
  }, [loadCatalogos]);

  return (
    <CatalogosContext.Provider value={{
      catalogos,
      catalogosMap,
      loading,
      error,
      getCatalogoNombre,
      refreshCatalogos,
      crearItem,
      actualizarItem,
      eliminarItem
    }}>
      {children}
    </CatalogosContext.Provider>
  );
}

export const useCatalogos = () => {
  const context = useContext(CatalogosContext);
  if (!context) {
    throw new Error('useCatalogos must be used within a CatalogosProvider');
  }
  return context;
};