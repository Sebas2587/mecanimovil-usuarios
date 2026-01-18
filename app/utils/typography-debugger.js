/**
 * Typography Debugger - Interceptor Global
 * Este debe ser el PRIMER archivo importado en App.js
 */

// Guardar la referencia original de Object.keys
const originalObjectKeys = Object.keys;

// Contador de llamadas
let callCount = 0;

// Override Object.keys para detectar accesos a typography
Object.keys = function (obj) {
    callCount++;

    try {
        // Intentar obtener el stack trace
        const stack = new Error().stack;

        // Si el objeto es undefined o null, loggear el error
        if (obj === null || obj === undefined) {
            console.error(`⚠️ Object.keys llamado con ${obj} (call #${callCount})`);
            console.error('Stack:', stack);
            return [];
        }

        // Si estamos accediendo a algo relacionado con typography, loggear
        if (stack && stack.includes('typography')) {
            console.log(`📊 Object.keys en typography (call #${callCount})`);
            console.log('Objeto:', obj);
            console.log('Tipo:', typeof obj);
            console.log('Es objeto:', obj && typeof obj === 'object');
        }

        return originalObjectKeys.call(this, obj);
    } catch (error) {
        console.error(`❌ Error en Object.keys interceptor (call #${callCount}):`, error);
        console.error('Objeto recibido:', obj);
        console.error('Tipo:', typeof obj);

        // Intentar continuar con el original
        try {
            return originalObjectKeys.call(this, obj || {});
        } catch (e2) {
            return [];
        }
    }
};

// Interceptor para accesos a propiedades
const createSafeProxy = (target, name) => {
    if (!target || typeof target !== 'object') {
        return target;
    }

    return new Proxy(target, {
        get(obj, prop) {
            if (prop === 'typography') {
                const value = obj[prop];
                console.log(`🔍 Acceso a .typography en ${name}:`, {
                    exists: prop in obj,
                    type: typeof value,
                    value: value,
                    stack: new Error().stack?.split('\n').slice(0, 5).join('\n')
                });
            }
            return obj[prop];
        }
    });
};

export { createSafeProxy };

console.log('🐛 Typography Debugger activado');
