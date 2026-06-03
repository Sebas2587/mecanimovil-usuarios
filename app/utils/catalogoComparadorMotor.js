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
  const raw =
    candidato?.tipo_motor
    ?? candidato?.servicios_ofrecidos?.[0]?.tipo_motor
    ?? '';
  return normalizeTipoMotorVehiculo(raw);
}

export function getMotorOfertaBadge(candidato, tipoMotorVehiculo = null) {
  const motorOferta = resolveTipoMotorCandidato(candidato);
  const motorVeh = normalizeTipoMotorVehiculo(tipoMotorVehiculo);
  const coincidencia = candidato?.motor_coincidencia
    ?? candidato?.servicios_ofrecidos?.[0]?.motor_coincidencia;

  if (coincidencia === 'exacta' || (motorVeh && motorOferta === motorVeh)) {
    return {
      label: labelTipoMotor(motorOferta),
      tone: 'exacta',
      hint: 'Precio para tu tipo de motor',
    };
  }
  if (!motorOferta) {
    return {
      label: 'Todos los motores',
      tone: 'universal',
      hint: motorVeh ? 'Aplica a tu motor' : null,
    };
  }
  return {
    label: labelTipoMotor(motorOferta),
    tone: 'especifico',
    hint: null,
  };
}

export function scoreAjusteMotor(candidato, tipoMotorVehiculo) {
  const motorV = normalizeTipoMotorVehiculo(tipoMotorVehiculo);
  if (!motorV) return 78;

  const coincidencia = candidato?.motor_coincidencia
    ?? candidato?.servicios_ofrecidos?.[0]?.motor_coincidencia;
  if (coincidencia === 'exacta') return 100;
  if (coincidencia === 'incompatible') return 12;

  const motorOferta = resolveTipoMotorCandidato(candidato);
  if (!motorOferta) return 72;
  if (motorOferta === motorV) return 100;
  return 15;
}
