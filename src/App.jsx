import { useEffect, useState }
from 'react';

import {
  getCatalogos
}
from './services/catalogosService';

function App() {

  const [
      catalogos,
      setCatalogos
  ] = useState([]);

  useEffect(() => {

    load();

  }, []);

  async function load() {

    const data =
      await getCatalogos();

    setCatalogos(data);

  }

  return (

    <div className="container mt-4">

      <h1>
        NUX Quality Manager
      </h1>

      <hr />

      {
        catalogos.map(cat => (

          <div
            key={cat.id}
          >

            {cat.nombre}

          </div>

        ))
      }

    </div>

  );

}

export default App;