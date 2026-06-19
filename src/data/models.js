function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function createExpediente() {
  return {
    expedienteId: generateId("EXP"),
    codigoOrden: "",
    interna: false,
    clienteNux: false,
    mesProduccion: null,
    anioProduccion: null,
    consecutivo: null,
    fechaCreacion: new Date().toISOString().split("T")[0],
    cliente: "",
    producto: "",
    cantidadProducida: 0,
    estado: "ABIERTO",
    fechaAnulacion: null,
    motivoAnulacion: "",
    hallazgos: []
  };
}

export function createHallazgo() {
  return {
    hallazgoId: generateId("HAL"),
    fechaDeteccion: new Date().toISOString().split("T")[0],
    proceso: "",
    maquina: "",
    defecto: "",
    categoria: "PRODUCTO_NO_CONFORME",
    piezasDetectadas: 0,
    accionTomada: "",
    piezasRecuperadas: 0,
    piezasRechazadas: 0,
    responsable: "",
    observaciones: "",
    estado: "ABIERTO",
    evidencias: []
  };
}

export function createEvidencia() {
  return {
    evidenciaId: generateId("EVD"),
    nombreArchivo: "",
    rutaArchivo: "",
    descripcion: "",
    tamanoKB: 0,
    imagenBase64: "",
    fechaCaptura: new Date().toISOString().split("T")[0]
  };
}
