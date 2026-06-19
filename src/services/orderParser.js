import { MONTHS } from '../data/months.js';

export function parseOrderCode(code) {
  if (!code) return null;

  code = code.trim().toUpperCase();
  let interna = false;
  let clienteNux = false;
  let workingCode = code;

  if (workingCode.startsWith("IN")) {
    interna = true;
    clienteNux = true;
    workingCode = workingCode.substring(2);
  } else if (workingCode.startsWith("N")) {
    clienteNux = true;
    workingCode = workingCode.substring(1);
  }

  const parts = workingCode.split("-");
  if (parts.length !== 3) {
    return { valid: false, message: "Formato inválido" };
  }

  const mes = parseInt(parts[0]);
  const consecutivo = parseInt(parts[1]);
  const anio = parseInt(parts[2]);

  if (mes < 1 || mes > 12) {
    return { valid: false, message: "Mes inválido" };
  }

  return {
    valid: true,
    codigo: code,
    interna,
    clienteNux,
    mes,
    mesNombre: MONTHS[mes],
    consecutivo,
    anio: 2000 + anio
  };
}
