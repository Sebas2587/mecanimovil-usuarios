/**
 * Modalidad del servicio (en taller vs a domicilio) y texto de ubicación en solicitudes públicas.
 * Con talleres unificados, la modalidad efectiva depende del técnico asignado/preferido.
 */
import { resolveTecnicoPreferido } from './solicitudTecnicoPreferido';
import {
  MODALIDAD_A_DOMICILIO,
  MODALIDAD_EN_TALLER,
  MODALIDAD_AMBAS,
  modalidadLabel,
} from './providerModalidad';

function modalidadTecnicoToServicio(modalidadTecnico, modalidadDisplay) {
  if (modalidadTecnico === MODALIDAD_A_DOMICILIO) {
    return {
      tipo: 'mecanico',
      label: modalidadDisplay || modalidadLabel(MODALIDAD_A_DOMICILIO),
      a_domicilio: true,
    };
  }
  if (modalidadTecnico === MODALIDAD_EN_TALLER) {
    return {
      tipo: 'taller',
      label: modalidadDisplay || modalidadLabel(MODALIDAD_EN_TALLER),
      a_domicilio: false,
    };
  }
  return null;
}

function inferirModalidadAmbas(solicitud) {
  if (solicitud?.direccion_usuario || solicitud?.direccion_usuario_info?.direccion) {
    return {
      tipo: 'mecanico',
      label: modalidadLabel(MODALIDAD_A_DOMICILIO),
      a_domicilio: true,
    };
  }
  const texto = (solicitud?.direccion_servicio_texto || '').trim();
  const dirTaller =
    solicitud?.oferta_seleccionada_detail?.direccion_proveedor
    || solicitud?.proveedores_dirigidos_detail?.[0]?.direccion_fisica?.direccion_completa
    || solicitud?.proveedores_dirigidos_detail?.[0]?.direccion;
  if (texto && dirTaller && texto.trim() !== String(dirTaller).trim()) {
    return {
      tipo: 'mecanico',
      label: modalidadLabel(MODALIDAD_A_DOMICILIO),
      a_domicilio: true,
    };
  }
  return {
    tipo: 'taller',
    label: modalidadLabel(MODALIDAD_EN_TALLER),
    a_domicilio: false,
  };
}

export function resolveModalidadServicio(solicitud, oferta = null) {
  if (!solicitud) return null;

  const tecnico = resolveTecnicoPreferido(solicitud, oferta);
  if (tecnico?.modalidad_tecnico) {
    const fromTecnico = modalidadTecnicoToServicio(
      tecnico.modalidad_tecnico,
      tecnico.modalidad_display,
    );
    if (fromTecnico) return fromTecnico;
    if (tecnico.modalidad_tecnico === MODALIDAD_AMBAS) {
      return inferirModalidadAmbas(solicitud);
    }
  }

  if (solicitud.modalidad_servicio?.label) {
    return solicitud.modalidad_servicio;
  }

  const tipo =
    solicitud.tipo_proveedor_servicio
    || oferta?.tipo_proveedor
    || solicitud.oferta_seleccionada_detail?.tipo_proveedor;
  if (tipo === 'taller') {
    return { tipo: 'taller', label: modalidadLabel(MODALIDAD_EN_TALLER), a_domicilio: false };
  }
  if (tipo === 'mecanico') {
    return { tipo: 'mecanico', label: modalidadLabel(MODALIDAD_A_DOMICILIO), a_domicilio: true };
  }
  return null;
}

export function servicioEsADomicilio(modalidad) {
  return modalidad?.a_domicilio === true || modalidad?.tipo === 'mecanico';
}

export function getUbicacionServicioLabel(modalidad) {
  if (!modalidad) return 'Ubicación';
  return servicioEsADomicilio(modalidad) ? 'Ubicación' : 'Taller';
}

export function getModalidadServicioIcon(modalidad) {
  if (!modalidad) return 'help-circle-outline';
  return servicioEsADomicilio(modalidad) ? 'home-outline' : 'business-outline';
}

export function resolveUbicacionServicioTexto(solicitud, modalidad) {
  const mod = modalidad || resolveModalidadServicio(solicitud);

  if (servicioEsADomicilio(mod)) {
    const dirUsuario =
      solicitud?.direccion_usuario_info?.direccion
      || solicitud?.direccion_usuario?.direccion;
    const texto = (dirUsuario || solicitud?.direccion_servicio_texto || '').trim();
    if (texto) {
      const detalles =
        solicitud?.direccion_usuario_info?.detalles
        || solicitud?.direccion_usuario?.detalles
        || solicitud?.detalles_ubicacion;
      if (detalles && !texto.includes(detalles)) {
        return `${texto} · ${detalles}`;
      }
      return texto;
    }
    return 'Tu domicilio';
  }

  const texto = (solicitud?.direccion_servicio_texto || '').trim();
  if (texto) return texto;
  return 'Ubicación no especificada';
}

/** Datos de ubicación al confirmar candidato/oferta de catálogo. */
export function resolveUbicacionConfirmacionFromOferta(oferta, options = {}) {
  const tecnico = options.tecnico || oferta?.miembro_taller_detail;
  const modalidadTecnico = tecnico?.modalidad_tecnico;
  const esDomicilioTecnico =
    modalidadTecnico === MODALIDAD_A_DOMICILIO
    || (modalidadTecnico === MODALIDAD_AMBAS && options.preferirDomicilio);

  const tipo =
    esDomicilioTecnico
      ? 'mecanico'
      : oferta?.tipo_proveedor
        || oferta?.proveedor?.tipo
        || (oferta?.a_domicilio === true
          ? 'mecanico'
          : oferta?.a_domicilio === false
            ? 'taller'
            : null);

  if (tipo !== 'taller') {
    return { tipo_proveedor: tipo || 'mecanico' };
  }
  const lat = oferta?.proveedor?.lat ?? oferta?.lat ?? null;
  const lng = oferta?.proveedor?.lng ?? oferta?.lng ?? null;
  const direccion =
    oferta?.direccion_proveedor
    || oferta?.proveedor?.direccion
    || oferta?.direccion_servicio_texto
    || '';
  return {
    tipo_proveedor: 'taller',
    direccion_servicio_texto: direccion,
    lat,
    lng,
  };
}
