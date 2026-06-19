import { useEffect, useState } from 'react';

import {
  getTiposCatalogo,
  getItemsCatalogo
}
  from '../services/catalogosService';

import {
  createItemCatalogo,
  updateItemCatalogo,
  deleteItemCatalogo
}
  from '../services/catalogosService';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
}
  from '../components/ui/card.jsx';

import { Badge } from '../components/ui/badge.jsx';

import {
  Settings,
  Database
}
  from 'lucide-react';

import {
  Pencil,
  Trash2
}
  from 'lucide-react';

import { Input }
from '../components/ui/input.jsx';

import { Label }
from '../components/ui/label.jsx';

import { Button }
from '../components/ui/button.jsx';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
}
from '../components/ui/dialog.jsx';


export default function Configuracion() {

  const [tipos, setTipos] = useState([]);

  const [tipoSeleccionado, setTipoSeleccionado] =
    useState(null);

  const [items, setItems] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingItem, setEditingItem] =
      useState(null);

  const [nombre, setNombre] =
      useState('');

  const [codigo, setCodigo] =
      useState('');

  const [descripcion, setDescripcion] =
      useState('');

  function openCreateModal() {

    setEditingItem(null);

    setNombre('');
    setCodigo('');
    setDescripcion('');

    setModalOpen(true);
  }

  function openEditModal(item) {

    setEditingItem(item);

    setNombre(item.nombre || '');
    setCodigo(item.codigo || '');
    setDescripcion(item.descripcion || '');

    setModalOpen(true);
  }

  useEffect(() => {

    loadCatalogos();

  }, []);

  async function loadCatalogos() {

    try {

      const data =
        await getTiposCatalogo();

      setTipos(data);

      if (data.length > 0) {

        setTipoSeleccionado(
          data[0]
        );

        loadItems(
          data[0].codigo
        );
      }

    } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);

    }
  }

  async function loadItems(codigoTipo) {

    try {

      const data =
        await getItemsCatalogo(
          codigoTipo
        );

      setItems(data);

    } catch (error) {

      console.error(error);

    }
  }

  async function handleSelectTipo(tipo) {

    setTipoSeleccionado(tipo);

    await loadItems(
      tipo.codigo
    );
  }

  async function handleSave() {

    try {

      if (editingItem) {

        await updateItemCatalogo(
          editingItem.id,
          {
            nombre,
            codigo,
            descripcion
          }
        );

      } else {

        await createItemCatalogo({

          tipo_id:
            tipoSeleccionado.id,

          nombre,

          codigo,

          descripcion,

          activo: true

        });

      }

      await loadItems(
        tipoSeleccionado.codigo
      );

      setModalOpen(false);

    } catch (error) {

      console.error(error);

      alert(error.message);
    }
  }

  async function handleDelete(item) {

    if (
      !window.confirm(
        `¿Eliminar ${item.nombre}?`
      )
    ) {
      return;
    }

    try {

      await deleteItemCatalogo(
        item.id
      );

      await loadItems(
        tipoSeleccionado.codigo
      );

    } catch (error) {

      console.error(error);

      alert(error.message);
    }
  }

  if (loading) {

    return (
      <div>
        Cargando catálogos...
      </div>
    );
  }

  return (

    <div className="space-y-6 animate-fade-in">

      <div>

        <h2 className="text-2xl font-bold flex items-center gap-2">

          <Settings className="w-6 h-6 text-primary" />

          Catálogos

        </h2>

        <p className="text-muted-foreground">

          Administración centralizada de catálogos del sistema

        </p>

      </div>

      <div className="grid grid-cols-12 gap-6">

        <div className="col-span-4">

          <Card>

            <CardHeader>

              <div
                className="
                    flex
                    items-center
                    justify-between
                "
              >

                <CardTitle
                  className="
                      flex
                      items-center
                      gap-2
                  "
                >

                  <Database className="w-5 h-5" />

                  {tipoSeleccionado?.nombre}

                </CardTitle>

                
              </div>

            </CardHeader>

            <CardContent>

              <div className="space-y-2">

                {
                  tipos.map(tipo => (

                    <button
                      key={tipo.id}
                      onClick={() =>
                        handleSelectTipo(tipo)
                      }
                      className={`
                                                w-full
                                                text-left
                                                px-4
                                                py-3
                                                rounded-lg
                                                border
                                                transition-all

                                                ${tipoSeleccionado?.id === tipo.id
                          ? 'bg-primary text-white border-primary'
                          : 'hover:bg-muted'
                        }
                                            `}
                    >

                      {tipo.nombre}

                    </button>

                  ))
                }

              </div>

            </CardContent>

          </Card>

        </div>

        <div className="col-span-8">

          <Card>

            <CardHeader>

              <div
                  className="
                      flex
                      items-center
                      justify-between
                  "
              >

                  <CardTitle
                      className="
                          flex
                          items-center
                          gap-2
                      "
                  >

                      <Database className="w-5 h-5" />

                      {tipoSeleccionado?.nombre}

                  </CardTitle>

                  <Button
                      onClick={openCreateModal}
                  >
                      Nuevo
                  </Button>

              </div>

          </CardHeader>

            <CardContent>

              {
                items.length === 0
                  ? (
                    <div className="text-muted-foreground">

                      No existen registros.

                    </div>
                  )
                  : (

                    <div className="grid gap-2">

                      {
                        items.map(item => (

                          <div
                            key={item.id}
                            className="
                              flex
                              items-center
                              justify-between
                              border
                              rounded-lg
                              px-4
                              py-3
                          "
                          >

                            <div>

                              <div className="font-medium">

                                {
                                  item.nombre
                                }

                              </div>

                              {
                                item.descripcion &&
                                (
                                  <div className="text-sm text-muted-foreground">

                                    {
                                      item.descripcion
                                    }

                                  </div>
                                )
                              }

                            </div>

                            <div
                              className="
                                flex
                                items-center
                                gap-2
                              "
                            >

                              <Badge>
                                {item.codigo || 'ITEM'}
                              </Badge>

                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  openEditModal(item)
                                }
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  handleDelete(item)
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>

                            </div>

                          </div>

                        ))
                      }

                    </div>

                  )
              }

            </CardContent>

          </Card>

        </div>

      </div>
      <Dialog
        open={modalOpen}
        onOpenChange={setModalOpen}
      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>

              {
                editingItem
                  ? 'Editar registro'
                  : 'Nuevo registro'
              }

            </DialogTitle>

          </DialogHeader>

          <div className="space-y-4">

            <div>

              <Label>
                Nombre
              </Label>

              <Input
                value={nombre}
                onChange={e =>
                  setNombre(
                    e.target.value
                  )
                }
              />

            </div>

            <div>

              <Label>
                Código
              </Label>

              <Input
                value={codigo}
                onChange={e =>
                  setCodigo(
                    e.target.value
                  )
                }
              />

            </div>

            <div>

              <Label>
                Descripción
              </Label>

              <Input
                value={descripcion}
                onChange={e =>
                  setDescripcion(
                    e.target.value
                  )
                }
              />

            </div>

            <Button
              className="w-full"
              onClick={handleSave}
            >
              Guardar
            </Button>

          </div>

        </DialogContent>

      </Dialog>

    </div>
  );
}