import { COLORS } from '../design-system/tokens';

/** Repuestos pagados por MP y mano de obra aún pendiente. */
export function tienePagoParcial(oferta) {
  if (!oferta) return false;
  return (
    oferta.estado_pago_repuestos === 'pagado'
    && (oferta.estado_pago_servicio || 'pendiente') === 'pendiente'
  );
}

/** Estados derivados en backend o frontend (no son SolicitudServicioPublica.estado crudo). */
const ESTADOS_DERIVADOS_UI = new Set([
  'pagada_parcialmente',
  'en_ejecucion_pago_pendiente',
  'pendiente_firma_cliente',
  'ofertas_adicionales_pendientes',
]);

/**
 * Estado lógico de la solicitud pública para badges (card, detalle, etc.).
 * @param {object} solicitud
 * @param {{ checklistPendienteFirma?: boolean }} [options]
 */
export function resolveEstadoEfectivoSolicitud(solicitud, options = {}) {
  const { checklistPendienteFirma = false } = options;

  // Priorizar estado calculado en backend (listas y detalle).
  const efectivoApi = solicitud?.estado_efectivo;
  if (
    efectivoApi
    && (
      efectivoApi !== solicitud?.estado
      || ESTADOS_DERIVADOS_UI.has(efectivoApi)
      || efectivoApi === 'ofertas_adicionales_pendientes'
    )
  ) {
    return efectivoApi;
  }

  const oferta = solicitud?.oferta_seleccionada_detail || solicitud?.oferta_seleccionada;

  let estado = solicitud?.estado_efectivo ?? solicitud?.estado;

  if (estado === 'pagada' && tienePagoParcial(oferta)) {
    return 'pagada_parcialmente';
  }

  if (
    checklistPendienteFirma
    && (estado === 'en_ejecucion' || oferta?.estado === 'en_ejecucion')
  ) {
    return 'pendiente_firma_cliente';
  }

  if (
    (estado === 'en_ejecucion' || oferta?.estado === 'en_ejecucion')
    && tienePagoParcial(oferta)
  ) {
    return 'en_ejecucion_pago_pendiente';
  }

  return estado;
}

const ESTADO_SOLICITUD_SURFACE = {
  creada: {
    color: COLORS.text.secondary,
    bg: COLORS.neutral.gray[100],
    border: COLORS.border.light,
    texto: 'Creada',
  },
  seleccionando_servicios: {
    color: COLORS.primary[700],
    bg: COLORS.primary[50],
    border: COLORS.primary[200],
    texto: 'Seleccionando',
  },
  publicada: {
    color: COLORS.primary[700],
    bg: COLORS.primary[50],
    border: COLORS.primary[200],
    texto: 'Publicada',
  },
  con_ofertas: {
    color: COLORS.warning[800],
    bg: COLORS.warning[50],
    border: COLORS.warning[200],
    texto: 'Con ofertas',
  },
  pendiente_confirmacion: {
    color: COLORS.primary[700],
    bg: COLORS.primary[50],
    border: COLORS.primary[200],
    texto: 'Esperando confirmación',
  },
  esperando_creditos_proveedor: {
    color: COLORS.warning[800],
    bg: COLORS.warning[50],
    border: COLORS.warning[300],
    texto: 'Esperando proveedor',
  },
  adjudicada: {
    color: COLORS.primary[700],
    bg: COLORS.primary[50],
    border: COLORS.primary[200],
    texto: 'Adjudicada',
  },
  pendiente_pago: {
    color: COLORS.warning[800],
    bg: COLORS.warning[50],
    border: COLORS.warning[200],
    texto: 'Pendiente de pago',
  },
  pagada: {
    color: COLORS.primary[700],
    bg: COLORS.primary[50],
    border: COLORS.primary[200],
    texto: 'Pagada',
  },
  pagada_parcialmente: {
    color: COLORS.warning[800],
    bg: COLORS.warning[50],
    border: COLORS.warning[200],
    texto: 'Pago parcial',
  },
  en_ejecucion: {
    color: COLORS.primary[700],
    bg: COLORS.primary[50],
    border: COLORS.primary[200],
    texto: 'Servicio en curso',
  },
  en_ejecucion_pago_pendiente: {
    color: COLORS.warning[800],
    bg: COLORS.warning[50],
    border: COLORS.warning[200],
    texto: 'En curso · saldo pendiente',
  },
  pendiente_firma_cliente: {
    color: COLORS.warning[800],
    bg: COLORS.warning[50],
    border: COLORS.warning[200],
    texto: 'Pendiente de tu firma',
  },
  completada: {
    color: COLORS.primary[700],
    bg: COLORS.primary[50],
    border: COLORS.primary[200],
    texto: 'Completada',
  },
  expirada: {
    color: COLORS.error[700],
    bg: COLORS.error[50],
    border: COLORS.error[200],
    texto: 'Expirada',
  },
  cancelada: {
    color: COLORS.error[700],
    bg: COLORS.error[50],
    border: COLORS.error[200],
    texto: 'Cancelada',
  },
  ofertas_adicionales_pendientes: {
    color: COLORS.warning[800],
    bg: COLORS.warning[50],
    border: COLORS.warning[200],
    texto: 'Ofertas adicionales',
  },
};

/**
 * Superficie visual (texto + colores) para badge de estado de solicitud.
 */
export function getEstadoSolicitudSurface(solicitud, options = {}) {
  const efectivo = resolveEstadoEfectivoSolicitud(solicitud, options);
  const base = ESTADO_SOLICITUD_SURFACE[efectivo] || {
    color: COLORS.text.secondary,
    bg: COLORS.neutral.gray[100],
    border: COLORS.border.light,
    texto:
      solicitud?.estado_display_efectivo
      || solicitud?.estado_display
      || (typeof efectivo === 'string' ? efectivo.replace(/_/g, ' ') : '—'),
  };

  if (solicitud?.estado_display_efectivo) {
    return { ...base, texto: solicitud.estado_display_efectivo };
  }

  return base;
}

const OFERTA_ESTADO_ICON = {
  pendiente_pago: 'card-outline',
  pagada_parcialmente: 'wallet-outline',
  pagada: 'checkmark-circle-outline',
  en_ejecucion: 'construct-outline',
  en_ejecucion_pago_pendiente: 'construct-outline',
  pendiente_firma_cliente: 'create-outline',
  completada: 'checkmark-done-outline',
  pendiente_confirmacion: 'hourglass-outline',
  pendiente_creditos: 'hourglass-outline',
};

/**
 * Texto e icono para el bloque «Estado de la oferta» en OfferCardDetailed.
 */
export function getEstadoOfertaDisplay(oferta, options = {}) {
  const { checklistPendienteFirma = false, catalogoPendienteConfirmacion = false } = options;

  if (catalogoPendienteConfirmacion) {
    return {
      texto: 'Proveedor elegido',
      color: COLORS.warning[700],
      icon: 'hourglass-outline',
      pending: true,
    };
  }

  if (!oferta?.estado) {
    return {
      texto: 'Oferta aceptada',
      color: COLORS.primary[700],
      icon: 'checkmark-circle-outline',
      pending: false,
    };
  }

  if (checklistPendienteFirma && oferta.estado === 'en_ejecucion') {
    return {
      texto: 'Pendiente de tu firma',
      color: COLORS.warning[700],
      icon: 'create-outline',
      pending: true,
    };
  }

  if (oferta.estado === 'en_ejecucion' && tienePagoParcial(oferta)) {
    return {
      texto: 'En ejecución · saldo pendiente',
      color: COLORS.warning[700],
      icon: 'construct-outline',
      pending: true,
    };
  }

  if (
    (oferta.estado === 'pagada_parcialmente' || oferta.estado === 'pagada')
    && tienePagoParcial(oferta)
  ) {
    return {
      texto: 'Pago parcial · saldo pendiente',
      color: COLORS.warning[700],
      icon: 'wallet-outline',
      pending: true,
    };
  }

  const map = {
    aceptada: 'Aceptada · pendiente de pago',
    pendiente_pago: 'Pendiente de pago',
    pagada_parcialmente: 'Pago parcial',
    pagada: 'Pagada · listo para iniciar',
    en_ejecucion: 'Servicio en curso',
    completada: 'Servicio completado',
    rechazada: 'Rechazada',
    expirada: 'Expirada',
    retirada: 'Retirada',
  };

  const texto = map[oferta.estado] || 'Oferta aceptada';
  const pending = ['aceptada', 'pendiente_pago', 'pagada_parcialmente'].includes(oferta.estado)
    || (oferta.estado === 'en_ejecucion' && tienePagoParcial(oferta));

  return {
    texto,
    color: pending ? COLORS.warning[700] : COLORS.primary[700],
    icon: OFERTA_ESTADO_ICON[oferta.estado] || 'checkmark-circle-outline',
    pending,
  };
}
