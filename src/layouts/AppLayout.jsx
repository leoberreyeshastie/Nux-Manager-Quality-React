import { Outlet, Link } from 'react-router-dom';


export default function AppLayout() {

    return (

        <div className="container-fluid">

            <div className="row">

                <div
                    className="
                        col-2
                        vh-100
                        border-end
                        p-3
                    "
                >

                    <h4>
                        NÜX STUDIO
                    </h4>

                    <hr />

                    <nav
                        className="
                            d-flex
                            flex-column
                            gap-2
                        "
                    >

                        <Link to="/">
                            Dashboard
                        </Link>

                        <Link to="/expedientes">
                            Expedientes
                        </Link>

                        <Link to="/configuracion">
                            Configuración
                        </Link>

                    </nav>

                </div>

                <div
                    className="
                        col
                        p-4
                    "
                >

                    <Outlet />

                </div>

            </div>

        </div>

    );

}