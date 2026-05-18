/**
 * Kilometraje de referencia SII (GetAPI mileage) y validación al registrar vehículo.
 */

export function getMileageSii(vehicleData) {
  if (!vehicleData) return null;
  const raw =
    vehicleData.mileage ??
    vehicleData.kilometraje_api ??
    vehicleData.raw_data?.mileage ??
    null;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export function tieneMileageSii(vehicleData) {
  if (!vehicleData) return false;
  if (vehicleData.tiene_mileage_sii === true) return true;
  if (vehicleData.tiene_mileage_sii === false) return false;
  return getMileageSii(vehicleData) != null;
}

/**
 * @returns {{ valid: boolean, nivel: string, mensaje: string, code?: string }}
 */
export function validarKilometrajeContraSii(kilometrajeInput, vehicleData) {
  const kmUser = parseInt(String(kilometrajeInput || '').replace(/\D/g, ''), 10);
  if (!Number.isFinite(kmUser) || kmUser <= 0) {
    return {
      valid: false,
      nivel: 'error',
      code: 'kilometraje_invalido',
      mensaje: 'El kilometraje debe ser un número mayor a 0.',
    };
  }

  const mileageSii = getMileageSii(vehicleData);
  const tieneRef = tieneMileageSii(vehicleData);

  if (tieneRef && mileageSii != null) {
    if (kmUser < mileageSii) {
      return {
        valid: false,
        nivel: 'error',
        code: 'km_menor_que_sii',
        mensaje:
          `El kilometraje ingresado (${kmUser.toLocaleString('es-CL')} km) no puede ser menor al registrado en el SII (${mileageSii.toLocaleString('es-CL')} km). Revisa el odómetro o corrige el valor.`,
      };
    }
    return { valid: true, nivel: 'ok', mensaje: '' };
  }

  return {
    valid: true,
    nivel: 'aviso',
    code: 'sin_mileage_sii',
    mensaje:
      'No hay kilometraje de referencia del SII para este vehículo (común en autos antiguos o sin dato en el registro). Verifica que el valor del odómetro sea correcto.',
  };
}
