import { createContext, useContext, useState, useEffect } from 'react';
import { getTiposCatalogo, getItemsCatalogo } from '../services/catalogosService';

const CatalogosContext = createContext();

export function CatalogosProvider({ children }) {
  const [catalogos, setCatalogos] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCatalogos() {
      try {
        const tipos = await getTiposCatalogo();
        const itemsPromises = tipos.map(tipo => getItemsCatalogo(tipo.codigo));
        const itemsArrays = await Promise.all(itemsPromises);
        const catalogosMap = {};
        tipos.forEach((tipo, index) => {
          catalogosMap[tipo.codigo] = itemsArrays[index];
        });
        setCatalogos(catalogosMap);
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      } finally {
        setLoading(false);
      }
    }
    loadCatalogos();
  }, []);

  return (
    <CatalogosContext.Provider value={{ catalogos, loading }}>
      {children}
    </CatalogosContext.Provider>
  );
}

export const useCatalogos = () => {
  const context = useContext(CatalogosContext);
  if (!context) throw new Error('useCatalogos must be used within CatalogosProvider');
  return context;
};