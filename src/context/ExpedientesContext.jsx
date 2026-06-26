import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getExpedientes, getExpedienteById, createExpediente, updateExpediente, deleteExpediente } from '../services/expedientesService';
import { useAuth } from './AuthContext';

const ExpedientesContext = createContext();

export function ExpedientesProvider({ children }) {
  const { user } = useAuth();
  const [expedientes, setExpedientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expedienteActual, setExpedienteActual] = useState(null);

  // Función para recargar TODA la lista desde la base de datos
  const refreshExpedientes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getExpedientes();
      setExpedientes(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Cargar inicial (se ejecuta al montar o cuando cambia el usuario)
  useEffect(() => {
    refreshExpedientes();
  }, [refreshExpedientes]);

  // Función para cargar un expediente específico (actualiza expedienteActual y también la lista)
  const cargarExpedienteActual = useCallback(async (id) => {
    try {
      // Intentar obtener de la lista local primero
      let exp = expedientes.find(e => e.id === id);
      
      // Si no está en la lista, buscarlo directamente
      if (!exp) {
        exp = await getExpedienteById(id);
        // Opcional: agregarlo a la lista local
        setExpedientes(prev => {
          const exists = prev.some(e => e.id === id);
          if (!exists) {
            return [exp, ...prev];
          }
          return prev;
        });
      }
      
      setExpedienteActual(exp);
      return exp;
    } catch (error) {
      console.error('Error cargando expediente:', error);
      throw error;
    }
  }, [expedientes]);

  // Crear expediente (ya actualiza la lista)
  const crearExpediente = useCallback(async (data) => {
    try {
      const nuevo = await createExpediente(data);
      setExpedientes(prev => [nuevo, ...prev]);
      return nuevo;
    } catch (error) {
      throw error;
    }
  }, []);

  // Actualizar expediente (ya actualiza la lista)
  const actualizarExpediente = useCallback(async (id, data) => {
    try {
      const actualizado = await updateExpediente(id, data);
      setExpedientes(prev => prev.map(e => e.id === id ? actualizado : e));
      if (expedienteActual?.id === id) {
        setExpedienteActual(actualizado);
      }
      return actualizado;
    } catch (error) {
      throw error;
    }
  }, [expedienteActual]);

  // Anular expediente (actualiza la lista)
  const anularExpediente = useCallback(async (id, motivo) => {
    try {
      await deleteExpediente(id, motivo);
      setExpedientes(prev => prev.filter(e => e.id !== id));
      if (expedienteActual?.id === id) {
        setExpedienteActual(null);
      }
    } catch (error) {
      throw error;
    }
  }, [expedienteActual]);

  // NUEVO: Función para refrescar un expediente específico (después de cambiar hallazgos)
  const refreshExpedienteActual = useCallback(async (id) => {
    try {
      const exp = await getExpedienteById(id);
      // Actualizar en la lista
      setExpedientes(prev => prev.map(e => e.id === id ? exp : e));
      // Actualizar el actual si coincide
      if (expedienteActual?.id === id) {
        setExpedienteActual(exp);
      }
      return exp;
    } catch (error) {
      console.error('Error refrescando expediente:', error);
      throw error;
    }
  }, [expedienteActual]);

  return (
    <ExpedientesContext.Provider value={{
      expedientes,
      loading,
      error,
      expedienteActual,
      refreshExpedientes,
      cargarExpedienteActual,
      crearExpediente,
      actualizarExpediente,
      anularExpediente,
      refreshExpedienteActual,  // <--- NUEVA FUNCIÓN
      setExpedienteActual
    }}>
      {children}
    </ExpedientesContext.Provider>
  );
}

export const useExpedientes = () => {
  const context = useContext(ExpedientesContext);
  if (!context) throw new Error('useExpedientes must be used within ExpedientesProvider');
  return context;
};