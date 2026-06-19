import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Expedientes from './pages/Expedientes.jsx';
import Indicadores from './pages/Indicadores.jsx';
import Ordenes from './pages/Ordenes.jsx';
import Reportes from './pages/Reportes.jsx';
import Configuracion from './pages/Configuracion.jsx';
import ExpedienteDetalle from './pages/ExpedienteDetalle';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/expedientes" element={<Expedientes />} />
                <Route path="/expedientes/:id" element={<ExpedienteDetalle />} />
                <Route path="/indicadores" element={<Indicadores />} />
                <Route path="/ordenes" element={<Ordenes />} />
                <Route path="/reportes" element={<Reportes />} />
                <Route path="/configuracion" element={<Configuracion />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
