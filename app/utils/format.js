/**
 * Formatea un número como moneda (CLP)
 * @param {number|string} amount - Monto a formatear
 * @returns {string} Monto formateado
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '$0';
  
  // Convertir a número si es string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Formatear con separadores de miles
  return `$${numAmount.toLocaleString('es-CL')}`;
};

/**
 * Formatea una fecha ISO a formato legible
 * @param {string} isoDate - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
export const formatDate = (isoDate) => {
  if (!isoDate) return '';
  
  const date = new Date(isoDate);
  return date.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Formatea una hora ISO a formato legible
 * @param {string} isoDate - Fecha/hora en formato ISO
 * @returns {string} Hora formateada
 */
export const formatTime = (isoDate) => {
  if (!isoDate) return '';
  
  const date = new Date(isoDate);
  return date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Trunca un texto si excede la longitud máxima
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} Texto truncado
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}; 