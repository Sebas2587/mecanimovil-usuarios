/**
 * Utilidad de logging que solo muestra logs en desarrollo (__DEV__)
 * En producción (APK), todos los logs se silencian automáticamente
 * 
 * Uso:
 * import logger from './utils/logger';
 * logger.error('Mensaje de error', data); // Solo en desarrollo
 * logger.warn('Advertencia', data); // Solo en desarrollo
 * logger.info('Información', data); // Solo en desarrollo
 * logger.debug('Debug', data); // Solo en desarrollo
 */

// Verificar si estamos en modo desarrollo
const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

const logger = {
  /**
   * Log de errores (solo en desarrollo)
   * @param {...any} args - Argumentos a loguear
   */
  error: (...args) => {
    if (isDevelopment) {
      console.error(...args);
    }
  },

  /**
   * Log de advertencias (solo en desarrollo)
   * @param {...any} args - Argumentos a loguear
   */
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log de información (solo en desarrollo)
   * @param {...any} args - Argumentos a loguear
   */
  info: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log de debug (solo en desarrollo)
   * @param {...any} args - Argumentos a loguear
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Log normal (solo en desarrollo)
   * @param {...any} args - Argumentos a loguear
   */
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
};

export default logger;
