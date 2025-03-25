// src/utils/calculationUtils.js

/**
 * Calcula la diferencia de tiempo entre dos horas en formato "HH:MM"
 * @param {string} startTime - Hora de inicio en formato "HH:MM"
 * @param {string} endTime - Hora de fin en formato "HH:MM"
 * @returns {number} Diferencia en horas (decimal)
 */
export const calculateTimeDifference = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;

  // Crear objetos de fecha para hoy con las horas especificadas
  const today = new Date().toDateString();
  let start = new Date(`${today} ${startTime}`);
  let end = new Date(`${today} ${endTime}`);

  // Si la hora de fin es menor que la de inicio, asumir que es del día siguiente
  if (end < start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }

  // Calcular diferencia en milisegundos y convertir a horas
  const diffMs = end - start;
    //Asegurar que sea un número para no causar problemas al usarlo
  const diffHours =  Number(diffMs / (1000 * 60 * 60)) || 0;

  return diffHours;
};

/**
 * Convierte una cadena de tiempo "HH:MM" a horas decimales
 * @param {string} timeString - Tiempo en formato "HH:MM"
 * @returns {number} Horas en formato decimal
 */
 export const convertToHours = (timeString) => {
  if (!timeString) return 0;

  const [hours, minutes] = timeString.split(':');
    // Usar parseInt con base 10 y manejar NaN
  const parsedHours = parseInt(hours, 10);
  const parsedMinutes = parseInt(minutes, 10);
  if (isNaN(parsedHours) || isNaN(parsedMinutes)) {
    return 0; //Devolver NaN
  }

  return parsedHours + (parsedMinutes / 60);
};

/**
 * Calcula el número de semana del año para una fecha dada (ISO-8601)
 * @param {string} dateString - Fecha en formato "YYYY-MM-DD"
 * @returns {number} Número de semana
 */
export const getWeekNumber = (dateString) => {
  const date = new Date(dateString);
  const dayNum = date.getUTCDay() || 7; // Obtener día (0-6, 0 es Domingo).  Si es 0, convertir a 7.
  date.setUTCDate(date.getUTCDate() + 4 - dayNum); // Ajustar al JUEVES de la semana.
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1)); // 1 de enero del año.
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7); // Calcular número de semana.
};


/**
 * Formatea un número como moneda en euros
 * @param {number} value - Valor a formatear
 * @returns {string} Valor formateado como moneda (ej: "1.234,56 €")
 */
export const formatCurrency = (value) => {
  const numValue = Number(value) || 0; 
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true // Asegura que se usen separadores de miles
  }).format(numValue);
};

/**
 * Formatea un número con dos decimales
 * @param {number} value - Valor a formatear
 * @returns {string} Valor formateado con dos decimales
 */
export const formatNumber = (value) => {
    // Usar 0 como valor por defecto si es null o undefined
  const numValue = Number(value) || 0; // Convertir a número y manejar NaN
  return numValue.toFixed(2);
};