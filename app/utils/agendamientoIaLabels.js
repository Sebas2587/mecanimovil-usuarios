/**
 * Etiquetas legibles para campos técnicos del asistente IA.
 */
const FUENTE_LABELS = {
  texto: 'Tu descripción',
  lexico: 'Síntomas detectados',
  'lexico+texto': 'Descripción y síntomas',
  salud: 'Estado del vehículo',
  aprendizaje: 'Experiencia de otros clientes',
  vehiculo: 'Compatible con tu auto',
};

export function labelFuenteAnalisis(fuente) {
  if (!fuente) return '';
  const key = String(fuente).toLowerCase();
  return FUENTE_LABELS[key] || fuente;
}

export function labelMotorAnalisis(motor) {
  if (!motor) return '';
  const m = String(motor).toLowerCase();
  if (m === 'lexico') return 'Análisis local';
  if (m === 'gemini' || m === 'huggingface' || m === 'ollama') return `Análisis ${m}`;
  return motor;
}
