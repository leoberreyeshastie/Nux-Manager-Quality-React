import React, { createContext, useContext, useReducer, useCallback } from 'react';
import * as recepcionesService from '../services/recepcionesService';
import * as evidenciasService from '../services/evidenciasRecepcionService';
import { toast, confirm, errorAlert, ReactSwal } from '../lib/sweetAlert';

const initialState = {
  recepciones: [],
  total: 0,
  page: 1,
  limit: 10,
  search: '',
  estado: '',
  mes: '',
  anio: '',
  proveedorId: '',
  producto: '',
  fechaDesde: '',
  fechaHasta: '',
  loading: false,
  selectedRecepcion: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_RECEPCIONES':
      return {
        ...state,
        recepciones: action.payload.data,
        total: action.payload.count,
        page: action.payload.page,
        limit: action.payload.limit,
      };
    case 'SET_SEARCH':
      return { ...state, search: action.payload };
    case 'SET_ESTADO':
      return { ...state, estado: action.payload };
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    case 'SET_MES':
      return { ...state, mes: action.payload };
    case 'SET_ANIO':
      return { ...state, anio: action.payload };
    case 'SET_PROVEEDOR':
      return { ...state, proveedorId: action.payload };
    case 'SET_PRODUCTO':
      return { ...state, producto: action.payload };
    case 'SET_FECHA_DESDE':
      return { ...state, fechaDesde: action.payload };
    case 'SET_FECHA_HASTA':
      return { ...state, fechaHasta: action.payload };
    case 'SET_SELECTED':
      return { ...state, selectedRecepcion: action.payload };
    case 'ADD_RECEPCION':
      return {
        ...state,
        recepciones: [action.payload, ...state.recepciones],
        total: state.total + 1,
      };
    case 'UPDATE_RECEPCION':
      return {
        ...state,
        recepciones: state.recepciones.map((r) =>
          r.id === action.payload.id ? action.payload : r
        ),
        selectedRecepcion: action.payload,
      };
    case 'REMOVE_RECEPCION':
      return {
        ...state,
        recepciones: state.recepciones.filter((r) => r.id !== action.payload),
        total: state.total - 1,
      };
    default:
      return state;
  }
}

const RecepcionesContext = createContext();

export function RecepcionesProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadRecepciones = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await recepcionesService.getRecepciones({
        page: state.page,
        limit: state.limit,
        search: state.search,
        estado: state.estado,
        mes: state.mes,
        anio: state.anio,
        proveedorId: state.proveedorId,
        producto: state.producto,
        fechaDesde: state.fechaDesde,
        fechaHasta: state.fechaHasta,
      });
      dispatch({ type: 'SET_RECEPCIONES', payload: result });
    } catch (error) {
      toast('error', error.message || 'Error al cargar recepciones');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [
    state.page,
    state.limit,
    state.search,
    state.estado,
    state.mes,
    state.anio,
    state.proveedorId,
    state.producto,
    state.fechaDesde,
    state.fechaHasta,
  ]);
  const loadRecepcionDetail = useCallback(async (id) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const data = await recepcionesService.getRecepcionById(id);
      dispatch({ type: 'SET_SELECTED', payload: data });
      return data;
    } catch (error) {
      toast('error', error.message || 'Error al cargar detalle');
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const createRecepcion = useCallback(async (data) => {
    ReactSwal.fire({
      title: 'Creando recepción...',
      allowOutsideClick: false,
      didOpen: () => ReactSwal.showLoading(),
    });
    try {
      const newRecep = await recepcionesService.createRecepcion(data);
      dispatch({ type: 'ADD_RECEPCION', payload: newRecep });
      ReactSwal.close();
      toast('success', 'Recepción creada exitosamente');
      return newRecep;
    } catch (error) {
      ReactSwal.close();
      await errorAlert('Error al crear', error.message || 'No se pudo crear la recepción');
      throw error;
    }
  }, []);

  const updateRecepcion = useCallback(async (id, data) => {
    ReactSwal.fire({
      title: 'Actualizando recepción...',
      allowOutsideClick: false,
      didOpen: () => ReactSwal.showLoading(),
    });
    try {
      const updated = await recepcionesService.updateRecepcion(id, data);
      dispatch({ type: 'UPDATE_RECEPCION', payload: updated });
      ReactSwal.close();
      toast('success', 'Recepción actualizada');
      return updated;
    } catch (error) {
      ReactSwal.close();
      await errorAlert('Error al actualizar', error.message || 'No se pudo actualizar');
      throw error;
    }
  }, []);

  const deleteRecepcion = useCallback(async (id) => {
    const result = await confirm(
      '¿Eliminar recepción?',
      'Esta acción no se puede deshacer. ¿Estás seguro?',
      'Sí, eliminar',
      'Cancelar'
    );
    if (!result.isConfirmed) return;

    ReactSwal.fire({
      title: 'Eliminando...',
      allowOutsideClick: false,
      didOpen: () => ReactSwal.showLoading(),
    });
    try {
      await recepcionesService.deleteRecepcion(id);
      dispatch({ type: 'REMOVE_RECEPCION', payload: id });
      ReactSwal.close();
      toast('success', 'Recepción eliminada');
    } catch (error) {
      ReactSwal.close();
      await errorAlert('Error al eliminar', error.message || 'No se pudo eliminar');
      throw error;
    }
  }, []);

  const addEvidencia = useCallback(async (file, recepcionId, tipo, descripcion) => {
    ReactSwal.fire({
      title: 'Subiendo evidencia...',
      allowOutsideClick: false,
      didOpen: () => ReactSwal.showLoading(),
    });
    try {
      const evidencia = await evidenciasService.uploadEvidencia(
        file,
        recepcionId,
        tipo,
        descripcion
      );
      if (state.selectedRecepcion && state.selectedRecepcion.id === recepcionId) {
        const updatedEvidencias = [
          evidencia,
          ...(state.selectedRecepcion.evidencias || []),
        ];
        dispatch({
          type: 'SET_SELECTED',
          payload: { ...state.selectedRecepcion, evidencias: updatedEvidencias },
        });
      }
      ReactSwal.close();
      toast('success', 'Evidencia subida correctamente');
      return evidencia;
    } catch (error) {
      ReactSwal.close();
      await errorAlert('Error al subir evidencia', error.message || 'No se pudo subir el archivo');
      throw error;
    }
  }, [state.selectedRecepcion]);

  const removeEvidencia = useCallback(async (evidenciaId, filePath) => {
    const result = await confirm(
      '¿Eliminar evidencia?',
      'Esta acción no se puede deshacer',
      'Sí, eliminar',
      'Cancelar'
    );
    if (!result.isConfirmed) return;

    ReactSwal.fire({
      title: 'Eliminando evidencia...',
      allowOutsideClick: false,
      didOpen: () => ReactSwal.showLoading(),
    });
    try {
      await evidenciasService.deleteEvidencia(evidenciaId, filePath);
      if (state.selectedRecepcion) {
        const filtered = state.selectedRecepcion.evidencias.filter(
          (e) => e.id !== evidenciaId
        );
        dispatch({
          type: 'SET_SELECTED',
          payload: { ...state.selectedRecepcion, evidencias: filtered },
        });
      }
      ReactSwal.close();
      toast('success', 'Evidencia eliminada');
    } catch (error) {
      ReactSwal.close();
      await errorAlert('Error al eliminar evidencia', error.message || 'No se pudo eliminar');
      throw error;
    }
  }, [state.selectedRecepcion]);

  const value = {
    ...state,
    loadRecepciones,
    loadRecepcionDetail,
    createRecepcion,
    updateRecepcion,
    deleteRecepcion,
    addEvidencia,
    removeEvidencia,
    setSearch: (search) => dispatch({ type: 'SET_SEARCH', payload: search }),
    setEstado: (estado) => dispatch({ type: 'SET_ESTADO', payload: estado }),
    setPage: (page) => dispatch({ type: 'SET_PAGE', payload: page }),
    setMes: (mes) => dispatch({ type: 'SET_MES', payload: mes }),
    setAnio: (anio) => dispatch({ type: 'SET_ANIO', payload: anio }),
    setProveedor: (proveedorId) => dispatch({ type: 'SET_PROVEEDOR', payload: proveedorId }),
    setProducto: (producto) => dispatch({ type: 'SET_PRODUCTO', payload: producto }),
    setFechaDesde: (fechaDesde) => dispatch({ type: 'SET_FECHA_DESDE', payload: fechaDesde }),
    setFechaHasta: (fechaHasta) => dispatch({ type: 'SET_FECHA_HASTA', payload: fechaHasta }),
  };

  return (
    <RecepcionesContext.Provider value={value}>
      {children}
    </RecepcionesContext.Provider>
  );
}

export function useRecepciones() {
  const context = useContext(RecepcionesContext);
  if (!context) {
    throw new Error('useRecepciones debe usarse dentro de RecepcionesProvider');
  }
  return context;
}