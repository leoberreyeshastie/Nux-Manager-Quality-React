import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getExpedientes, createExpediente, updateExpediente, deleteExpediente } from '../services/expedientesService';
import { useAuth } from './AuthContext';

const ExpedientesContext = createContext();

export function ExpedientesProvider({ children }) {
  const { user } = useAuth();
  const [expedientes, setExpedientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expedienteActual, setExpedienteActual] = useState(null);

  const loadExpedientes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getExpedientes();
      setExpedientes(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadExpedientes();
  }, [loadExpedientes]);

  const crearExpediente = async (data) => {
    const nuevo = await createExpediente(data);
    setExpedientes(prev => [nuevo, ...prev]);
    return nuevo;
  };

  const actualizarExpediente = async (id, data) => {
    const actualizado = await updateExpediente(id, data);
    setExpedientes(prev => prev.map(e => e.id === id ? actualizado : e));
    if (expedienteActual?.id === id) setExpedienteActual(actualizado);
    return actualizado;
  };

  const anularExpediente = async (id, motivo) => {
    await deleteExpediente(id, motivo);
    setExpedientes(prev => prev.filter(e => e.id !== id));
    if (expedienteActual?.id === id) setExpedienteActual(null);
  };

  const cargarExpedienteActual = async (id) => {
    const exp = expedientes.find(e => e.id === id);
    if (exp) {
      setExpedienteActual(exp);
      return exp;
    }
    // Si no está en la lista, lo buscamos directamente
    const { getExpedienteById } = await import('../services/expedientesService');
    const data = await getExpedienteById(id);
    setExpedienteActual(data);
    return data;
  };

  return (
    <ExpedientesContext.Provider value={{
      expedientes,
      loading,
      error,
      expedienteActual,
      loadExpedientes,
      crearExpediente,
      actualizarExpediente,
      anularExpediente,
      cargarExpedienteActual,
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