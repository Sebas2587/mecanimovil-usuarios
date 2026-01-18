/**
 * Funciones de utilidad para la aplicación
 */

/**
 * Formatea una fecha en formato legible
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
export const formatDate = (date) => {
  if (!date) return 'Fecha no disponible';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Fecha inválida';
  }
  
  const options = { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return dateObj.toLocaleDateString('es-ES', options);
};

/**
 * Formatea un precio en formato de moneda (MXN)
 * @param {number} price - Precio a formatear
 * @returns {string} - Precio formateado
 */
export const formatCurrency = (price) => {
  if (price === undefined || price === null) return '$0.00';
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(price);
};

/**
 * Trunca un texto y añade puntos suspensivos si excede la longitud
 * @param {string} text - Texto a truncar
 * @param {number} length - Longitud máxima
 * @returns {string} - Texto truncado
 */
export const truncateText = (text, length = 50) => {
  if (!text) return '';
  if (text.length <= length) return text;
  
  return text.slice(0, length - 3) + '...';
};

/**
 * Obtiene las iniciales de un nombre completo
 * @param {string} name - Nombre completo
 * @returns {string} - Iniciales
 */
export const getInitials = (name) => {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
};

/**
 * Obtiene un color aleatorio en formato hexadecimal
 * @returns {string} - Color en formato hexadecimal
 */
export const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

/**
 * Comprueba si un objeto está vacío
 * @param {object} obj - Objeto a comprobar
 * @returns {boolean} - true si está vacío, false en caso contrario
 */
export const isEmptyObject = (obj) => {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
};

/**
 * Genera una cadena aleatoria de longitud específica
 * @param {number} length - Longitud de la cadena
 * @returns {string} - Cadena aleatoria
 */
export const generateRandomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}; 