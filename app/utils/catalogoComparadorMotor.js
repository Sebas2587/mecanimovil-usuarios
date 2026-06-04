/**
 * Etiquetas y scoring de tipo de motor en comparador de catálogo.
 */

export function normalizeTipoMotorVehiculo(value) {
  if (value == null || value === '') return '';
  const upper = String(value).toUpperCase().trim();
  if (upper.includes('DIESEL') || upper.includes('DIÉSEL')) return 'DIESEL';
  if (upper.includes('ELECTR')) return 'ELECTRICO';
  if (upper.includes('HIBR') || upper.includes('HYBR')) return 'HIBRIDO';
  if (upper.includes('BENCINA') || upper.includes('GASOL')) return 'GASOLINA';
  if (['GASOLINA', 'DIESEL', 'ELECTRICO', 'HIBRIDO'].includes(upper)) return upper;
  return '';
}

export function labelTipoMotor(value) {
  const norm = normalizeTipoMotorVehiculo(value);
  if (!norm) return 'Todos los motores';
  const labels = {
    GASOLINA: 'Gasolina',
    DIESEL: 'Diésel',
    ELECTRICO: 'Eléctrico',
    HIBRIDO: 'Híbrido',
  };
  return labels[norm] || norm;
}

export function resolveTipoMotorCandidato(candidato) {
  const top = normalizeTipoMotorVehiculo(candidato?.tipo_motor);
  if (top) return top;
  const servicios = Array.isArray(candidato?.servicios_ofrecidos)
    ? candidato.servicios_ofrecidos
    : [];
  for (const svc of servicios) {
    const m = normalizeTipoMotorVehiculo(svc?.tipo_motor);
    if (m) return m;
  }
  return '';
}

export function resolveMotorCoincidenciaCandidato(candidato) {
  return (
    candidato?.motor_coincidencia
    ?? candidato?.servicios_ofrecidos?.find((s) => s?.motor_coincidencia)?.motor_coincidencia
    ?? candidato?.servicios_ofrecidos?.[0]?.motor_coincidencia
    ?? ''
  );
}

export function getMotorOfertaBadge(candidato, tipoMotorVehiculo = null) {
  const motorOferta = resolveTipoMotorCandidato(candidato);
  const motorVeh = normalizeTipoMotorVehiculo(tipoMotorVehiculo);
  const coincidencia = resolveMotorCoincidenciaCandidato(candidato);

  if (coincidencia === 'incompatible') return null;

  if (coincidencia === 'exacta' || (motorVeh && motorOferta && motorOferta === motorVeh)) {
    const label = labelTipoMotor(motorOferta || motorVeh);
    if (!label || label === 'Todos los motores') return null;
    return {
      label,
      tone: 'exacta',
      hint: 'Precio para tu tipo de motor',
    };
  }

  if (coincidencia === 'universal' || !motorOferta) {
    if (motorVeh) {
      return {
        label: labelTipoMotor(motorVeh),
        tone: 'universal',
        hint: 'Oferta aplicable a tu motor',
      };
    }
    return {
      label: 'Todos los motores',
      tone: 'universal',
      hint: null,
    };
  }

  return {
    label: labelTipoMotor(motorOferta),
    tone: 'especifico',
    hint: motorVeh && motorOferta === motorVeh ? 'Precio para tu tipo de motor' : null,
  };
}

export function scoreAjusteMotor(candidato, tipoMotorVehiculo) {
  const motorV = normalizeTipoMotorVehiculo(tipoMotorVehiculo);
  if (!motorV) return 78;

  const coincidencia = resolveMotorCoincidenciaCandidato(candidato);
  if (coincidencia === 'exacta') return 100;
  if (coincidencia === 'incompatible') return 12;

  const motorOferta = resolveTipoMotorCandidato(candidato);
  if (!motorOferta) return 72;
  if (motorOferta === motorV) return 100;
  return 15;
}
