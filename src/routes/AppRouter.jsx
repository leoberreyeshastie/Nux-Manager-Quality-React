import {
    BrowserRouter,
    Routes,
    Route
}
from 'react-router-dom';

import AppLayout
from '../layouts/AppLayout';

import DashboardPage
from '../pages/Dashboard/DashboardPage';

import ExpedientesPage
from '../pages/Expedientes/ExpedientesPage';

import ConfiguracionPage
from '../pages/Configuracion/ConfiguracionPage';

export default function AppRouter() {

    return (

        <BrowserRouter>

            <Routes>

                <Route
                    element={<AppLayout />}
                >

                    <Route
                        path="/"
                        element={
                            <DashboardPage />
                        }
                    />

                    <Route
                        path="/expedientes"
                        element={
                            <ExpedientesPage />
                        }
                    />

                    <Route
                        path="/configuracion"
                        element={
                            <ConfiguracionPage />
                        }
                    />

                </Route>

            </Routes>

        </BrowserRouter>

    );

}