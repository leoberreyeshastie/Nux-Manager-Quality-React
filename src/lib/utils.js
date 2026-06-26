import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function generateRecepcionId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  // Contar registros del mes para obtener consecutivo (opcional)
  // Por simplicidad, usamos timestamp
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `REC-${year}${month}-${random}`;
}

/**
 * Formatea una fecha en formato "día de semana, día de mes de año"
 * Ejemplo: "miércoles, 22 de junio de 2026"
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada
 */
export function formatDateSpanish(dateString) {
  if (!dateString) return '';
  // Parsear la fecha como UTC para evitar desfase horario
  const parts = dateString.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // mes en JS es 0-indexado
  const day = parseInt(parts[2]);
  const date = new Date(Date.UTC(year, month, day));
  
  const options = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    timeZone: 'UTC'
  };
  return date.toLocaleDateString('es-ES', options);
}

// Para formato corto (ej: 22/06/2026)
export function formatDateShort(dateString) {
  if (!dateString) return '';
  const parts = dateString.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}