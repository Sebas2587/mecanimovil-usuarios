/**
 * Helpers de modalidad de atención del proveedor (en taller / a domicilio / ambas).
 *
 * El backend expone `modalidad_atencion` en talleres unificados. Para registros
 * legacy o mecánicos a domicilio se deriva un valor sensato a partir del tipo.
 */

export const MODALIDAD_EN_TALLER = 'en_taller';
export const MODALIDAD_A_DOMICILIO = 'a_domicilio';
export const MODALIDAD_AMBAS = 'ambas';

const MODALIDADES_VALIDAS = new Set([
  MODALIDAD_EN_TALLER,
  MODALIDAD_A_DOMICILIO,
  MODALIDAD_AMBAS,
]);

/**
 * Devuelve la modalidad de atención del proveedor.
 * @returns {'en_taller'|'a_domicilio'|'ambas'|null}
 */
export function getProviderModalidad(provider) {
  if (!provider) return null;

  const raw = provider.modalidad_atencion;
  if (raw && MODALIDADES_VALIDAS.has(raw)) return raw;

  // Fallbacks por tipo de proveedor (legacy / mecánico a domicilio)
  const kind = provider._panelKind || provider.tipo_proveedor || provider.tipo;
  if (kind === 'mecanico' || kind === 'mecanico_domicilio') return MODALIDAD_A_DOMICILIO;
  if (kind === 'taller') return MODALIDAD_EN_TALLER;

  // Señales sueltas que algunos endpoints exponen
  if (provider.a_domicilio === true && provider.en_taller === true) return MODALIDAD_AMBAS;
  if (provider.a_domicilio === true) return MODALIDAD_A_DOMICILIO;
  return null;
}

/** Etiqueta corta de la modalidad. */
export function modalidadLabel(modalidad) {
  switch (modalidad) {
    case MODALIDAD_EN_TALLER:
      return 'En taller';
    case MODALIDAD_A_DOMICILIO:
      return 'A domicilio';
    case MODALIDAD_AMBAS:
      return 'Taller y domicilio';
    default:
      return '';
  }
}

/**
 * Lista de badges a mostrar. `ambas` se desglosa en dos chips.
 * @returns {Array<{ key: string, label: string, icon: string }>}
 */
export function modalidadBadges(provider) {
  const modalidad = getProviderModalidad(provider);
  if (!modalidad) return [];
  if (modalidad === MODALIDAD_AMBAS) {
    return [
      { key: MODALIDAD_EN_TALLER, label: 'En taller', icon: 'store' },
      { key: MODALIDAD_A_DOMICILIO, label: 'A domicilio', icon: 'directions-car' },
    ];
  }
  if (modalidad === MODALIDAD_A_DOMICILIO) {
    return [{ key: MODALIDAD_A_DOMICILIO, label: 'A domicilio', icon: 'directions-car' }];
  }
  return [{ key: MODALIDAD_EN_TALLER, label: 'En taller', icon: 'store' }];
}

/** ¿El proveedor atiende a domicilio? (a_domicilio o ambas) */
export function ofreceDomicilio(provider) {
  const m = getProviderModalidad(provider);
  return m === MODALIDAD_A_DOMICILIO || m === MODALIDAD_AMBAS;
}

/** ¿El proveedor atiende en taller físico? (en_taller o ambas) */
export function ofreceEnTaller(provider) {
  const m = getProviderModalidad(provider);
  return m === MODALIDAD_EN_TALLER || m === MODALIDAD_AMBAS;
}

/**
 * ¿El proveedor es compatible con la modalidad solicitada por el cliente?
 * Si no se solicita modalidad específica, todos son compatibles.
 */
export function proveedorCompatibleConModalidad(provider, modalidadSolicitada) {
  if (!modalidadSolicitada || modalidadSolicitada === MODALIDAD_AMBAS) return true;
  if (modalidadSolicitada === MODALIDAD_A_DOMICILIO) return ofreceDomicilio(provider);
  if (modalidadSolicitada === MODALIDAD_EN_TALLER) return ofreceEnTaller(provider);
  return true;
}

export function filtrarProveedoresPorModalidad(providers, modalidadSolicitada) {
  if (!modalidadSolicitada || modalidadSolicitada === MODALIDAD_AMBAS) return providers || [];
  return (providers || []).filter((p) => proveedorCompatibleConModalidad(p, modalidadSolicitada));
}
