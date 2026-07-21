/**
 * Kilometraje de referencia SII (GetAPI mileage) y plausibilidad por edad al registrar.
 */

const KM_PER_YEAR_MIN = 3000;
const KM_PER_YEAR_TYPICAL = 12000;
const KM_PER_YEAR_MAX = 28000;
const KM_MAX_VEHICULO_NUEVO = 45000;
const KM_ABSOLUTE_MAX = 999999;

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

export function getVehicleYear(vehicleData) {
  if (!vehicleData) return null;
  const raw = vehicleData.year ?? vehicleData.anio ?? vehicleData.año ?? null;
  if (raw == null || raw === '') return null;
  const y = parseInt(String(raw), 10);
  const current = new Date().getFullYear();
  if (!Number.isFinite(y) || y < 1950 || y > current + 1) return null;
  return y;
}

function fmtKmCl(value) {
  return Math.floor(value).toLocaleString('es-CL');
}

/** Kilometraje para UI (es-CL: 235.000). */
export function formatKmDisplay(value) {
  if (value == null || value === '') return '—';
  const n = Number(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return '—';
  return fmtKmCl(n);
}

export function calcularBandaKilometraje(year) {
  if (year == null) return null;
  const y = typeof year === 'number' ? year : parseInt(String(year), 10);
  const current = new Date().getFullYear();
  if (!Number.isFinite(y) || y < 1950 || y > current + 1) return null;

  const añosVida = Math.max(0, current - y);
  if (añosVida <= 0) {
    return { year: y, años_vida: 0, min: 0, tipico: 8000, max: KM_MAX_VEHICULO_NUEVO };
  }
  return {
    year: y,
    años_vida: añosVida,
    min: añosVida * KM_PER_YEAR_MIN,
    tipico: añosVida * KM_PER_YEAR_TYPICAL,
    max: añosVida * KM_PER_YEAR_MAX,
  };
}

function detectarKmTypoSugerido(km, banda) {
  const candidatos = [];
  if (km >= 10) candidatos.push(Math.floor(km / 10));
  candidatos.push(km * 10);
  for (const alt of candidatos) {
    if (alt <= 0 || alt > KM_ABSOLUTE_MAX) continue;
    if (alt >= banda.min && alt <= banda.max) return alt;
  }
  return null;
}

export function mensajeSinMileageSii() {
  return (
    'No hay kilometraje de referencia del SII para este vehículo (común en autos antiguos ' +
    'o sin dato en el registro). Ingresa el valor actual del odómetro; validaremos que sea razonable según el año.'
  );
}

/**
 * Plausibilidad por edad (solo cuando no hay SII).
 * @returns {{ valid: boolean, nivel: string, mensaje: string, code?: string, requiere_confirmacion?: boolean, km_sugerido?: number, banda?: object }}
 */
export function validarPlausibilidadPorEdad(kilometrajeInput, vehicleData) {
  const kmUser = parseInt(String(kilometrajeInput || '').replace(/\D/g, ''), 10);
  if (!Number.isFinite(kmUser) || kmUser <= 0) {
    return {
      valid: false,
      nivel: 'error',
      code: 'kilometraje_invalido',
      mensaje: 'El kilometraje debe ser un número mayor a 0.',
      requiere_confirmacion: false,
    };
  }
  if (kmUser > KM_ABSOLUTE_MAX) {
    return {
      valid: false,
      nivel: 'error',
      code: 'km_absoluto_excesivo',
      mensaje: `El kilometraje (${fmtKmCl(kmUser)} km) supera el máximo permitido.`,
      requiere_confirmacion: false,
    };
  }

  const banda = calcularBandaKilometraje(getVehicleYear(vehicleData));
  if (!banda) {
    return {
      valid: true,
      nivel: 'aviso',
      code: 'sin_year_plausibilidad',
      mensaje:
        'No hay año del vehículo para estimar un rango de kilometraje esperado. Verifica que el valor del odómetro sea correcto.',
      requiere_confirmacion: false,
    };
  }

  const { min: kmMin, max: kmMax, años_vida: años } = banda;
  const rangoTxt = `${fmtKmCl(kmMin)}–${fmtKmCl(kmMax)} km`;

  const kmSugerido = detectarKmTypoSugerido(kmUser, banda);
  if (kmSugerido != null && kmSugerido !== kmUser) {
    return {
      valid: true,
      nivel: 'aviso',
      code: 'km_posible_typo',
      mensaje:
        `El valor ${fmtKmCl(kmUser)} km parece poco habitual para un vehículo de ${años} año(s) (rango habitual: ${rangoTxt}). ` +
        `¿Quisiste ingresar ${fmtKmCl(kmSugerido)} km?`,
      requiere_confirmacion: true,
      km_sugerido: kmSugerido,
      banda,
    };
  }

  if (kmUser < kmMin) {
    if (kmMin > 0 && kmUser < kmMin * 0.25) {
      return {
        valid: false,
        nivel: 'error',
        code: 'km_muy_bajo_edad',
        mensaje:
          `Para un vehículo del ${banda.year} (~${años} años), ${fmtKmCl(kmUser)} km es demasiado bajo. Rango habitual: ${rangoTxt}.`,
        requiere_confirmacion: false,
        banda,
      };
    }
    return {
      valid: true,
      nivel: 'aviso',
      code: 'km_bajo_edad',
      mensaje:
        `El kilometraje (${fmtKmCl(kmUser)} km) es bajo para un vehículo de ~${años} años (habitual: ${rangoTxt}). ` +
        'Si el odómetro es correcto, confirma para continuar.',
      requiere_confirmacion: true,
      banda,
    };
  }

  if (kmUser > kmMax) {
    if (kmUser > kmMax * 1.5) {
      return {
        valid: false,
        nivel: 'error',
        code: 'km_muy_alto_edad',
        mensaje:
          `Para un vehículo del ${banda.year} (~${años} años), ${fmtKmCl(kmUser)} km es demasiado alto. Rango habitual: ${rangoTxt}.`,
        requiere_confirmacion: false,
        banda,
      };
    }
    return {
      valid: true,
      nivel: 'aviso',
      code: 'km_alto_edad',
      mensaje:
        `El kilometraje (${fmtKmCl(kmUser)} km) es alto para un vehículo de ~${años} años (habitual: ${rangoTxt}). ` +
        'Si el odómetro es correcto, confirma para continuar.',
      requiere_confirmacion: true,
      banda,
    };
  }

  return {
    valid: true,
    nivel: 'ok',
    code: 'km_plausible_edad',
    mensaje: '',
    requiere_confirmacion: false,
    banda,
  };
}

/**
 * Validación completa al registrar: SII primero; plausibilidad por edad solo sin SII.
 * @returns {{ valid: boolean, nivel: string, mensaje: string, code?: string, requiere_confirmacion?: boolean, km_sugerido?: number }}
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
          `El kilometraje ingresado (${fmtKmCl(kmUser)} km) no puede ser menor al registrado en el SII (${fmtKmCl(mileageSii)} km). Revisa el odómetro o corrige el valor.`,
      };
    }
    return { valid: true, nivel: 'ok', code: 'km_coherente_sii', mensaje: '' };
  }

  const plaus = validarPlausibilidadPorEdad(kilometrajeInput, vehicleData);
  const avisoSii =
    'No hay kilometraje de referencia del SII para este vehículo (común en autos antiguos o sin dato en el registro). ';

  if (plaus.code === 'km_plausible_edad') {
    return { ...plaus, mensaje: '' };
  }
  if (plaus.code === 'sin_year_plausibilidad') {
    return { ...plaus, mensaje: avisoSii + plaus.mensaje };
  }
  if (plaus.mensaje) {
    return { ...plaus, mensaje: avisoSii + plaus.mensaje };
  }
  return plaus;
}

/**
 * Compara km ingresado contra el mayor kilometraje_servicio de informes pendientes.
 * Siempre aviso (no bloquea registro).
 */
export function compararKmConChecklist(kilometrajeInput, informesPendientes) {
  if (!Array.isArray(informesPendientes) || !informesPendientes.length) {
    return { valid: true, nivel: 'ok', mensaje: '', requiere_confirmacion: false };
  }

  const kmUser = parseInt(String(kilometrajeInput || '').replace(/\D/g, ''), 10);
  if (!Number.isFinite(kmUser) || kmUser <= 0) {
    return { valid: true, nivel: 'ok', mensaje: '', requiere_confirmacion: false };
  }

  const conKm = informesPendientes.filter((i) => Number(i?.kilometraje_servicio) > 0);
  if (!conKm.length) {
    return { valid: true, nivel: 'ok', mensaje: '', requiere_confirmacion: false };
  }

  const maxInforme = conKm.reduce((best, curr) => {
    if (!best || Number(curr.kilometraje_servicio) > Number(best.kilometraje_servicio)) {
      return curr;
    }
    return best;
  }, null);

  const kmChecklist = Number(maxInforme.kilometraje_servicio);
  if (kmUser >= kmChecklist) {
    return { valid: true, nivel: 'ok', mensaje: '', requiere_confirmacion: false };
  }

  const taller = maxInforme.taller_nombre || 'un taller de la red';
  let fechaTxt = '';
  if (maxInforme.fecha_servicio) {
    try {
      fechaTxt = ` (${new Date(maxInforme.fecha_servicio).toLocaleDateString('es-CL')})`;
    } catch {
      fechaTxt = '';
    }
  }

  return {
    valid: true,
    nivel: 'aviso',
    code: 'km_menor_que_checklist',
    mensaje:
      `El kilometraje ingresado (${fmtKmCl(kmUser)} km) es menor al registrado en un servicio anterior ` +
      `(${fmtKmCl(kmChecklist)} km en ${taller}${fechaTxt}). Si el odómetro es correcto, confirma para continuar.`,
    requiere_confirmacion: true,
  };
}

/** Fusiona hints de validación SII y checklist para el input de km. */
export function mergeKmValidationHints(siiResult, checklistResult) {
  const siiHint = kmValidacionToHint(siiResult);
  const checklistHint = kmValidacionToHint(checklistResult);
  if (siiHint?.tipo === 'error') return siiHint;
  if (siiHint?.mensaje && checklistHint?.mensaje) {
    return {
      tipo: 'aviso',
      mensaje: `${siiHint.mensaje}\n\n${checklistHint.mensaje}`,
      requiere_confirmacion: Boolean(
        siiHint.requiere_confirmacion || checklistHint.requiere_confirmacion,
      ),
      km_sugerido: siiHint.km_sugerido ?? null,
    };
  }
  return siiHint || checklistHint;
}

/** Mapea resultado de validación a hint del input. */
export function kmValidacionToHint(validacion) {
  if (!validacion?.mensaje) return null;
  return {
    tipo: validacion.valid === false ? 'error' : 'aviso',
    mensaje: validacion.mensaje,
    requiere_confirmacion: Boolean(validacion.requiere_confirmacion),
    km_sugerido: validacion.km_sugerido ?? null,
  };
}
