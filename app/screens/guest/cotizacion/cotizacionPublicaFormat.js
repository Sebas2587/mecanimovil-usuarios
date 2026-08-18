import { COLORS } from '../../../design-system/tokens';

const TALLER_ACCENT_POOL = [
  COLORS.brand.magenta,
  COLORS.brand.orange,
  '#6366F1',
  '#0EA5E9',
];

export function formatCLP(value) {
  const n = Number(value || 0);
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

export function desgloseIvaDesdeTotal(totalIvaIncl) {
  const total = Math.round(Number(totalIvaIncl) || 0);
  const neto = Math.round(total / 1.19);
  const iva = total - neto;
  return { neto, iva, total };
}

export function vehicleHeadline(data) {
  if (!data) return '';
  const parts = [data.vehiculo_marca, data.vehiculo_modelo, data.vehiculo_anio].filter(Boolean);
  const base = parts.join(' ');
  if (data.vehiculo_patente) {
    return base ? `${base} · ${data.vehiculo_patente}` : data.vehiculo_patente;
  }
  return base;
}

export function formatFechaCorta(iso) {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatFechaHoraPropuesta(fecha, hora) {
  if (!fecha) return '';
  const iso = String(fecha).split('T')[0];
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  if (!y || !m || !d) return '';
  const parsed = new Date(y, m - 1, d);
  const fechaTxt = parsed.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const horaTxt = String(hora || '').substring(0, 5);
  return horaTxt ? `${fechaTxt} a las ${horaTxt}` : fechaTxt;
}

export function duracionLabel(minutos) {
  const m = Number(minutos) || 0;
  if (!m) return '';
  if (m >= 60) {
    const horas = Math.round((m / 60) * 2) / 2;
    if (horas === Math.trunc(horas)) return `${horas} h est.`;
    return `${horas} h est.`;
  }
  return `${m} min est.`;
}

export function mensajeAceptacionAdicional(data) {
  if (data?.ejecucion_adicional === 'nueva_fecha') {
    const slot = formatFechaHoraPropuesta(data.fecha_propuesta, data.hora_propuesta);
    if (slot) return `Quedó agendado para el ${slot}.`;
    return 'Quedó agendado en la fecha acordada con el taller.';
  }
  return 'El taller puede continuar este trabajo adicional en la misma visita.';
}

export function hintFooterAceptacion(data) {
  if (data?.es_trabajo_adicional) {
    if (data.ejecucion_adicional === 'nueva_fecha') {
      const slot = formatFechaHoraPropuesta(data.fecha_propuesta, data.hora_propuesta);
      if (slot) {
        return `Al aceptar, confirmas el día y hora propuestos (${slot}). No necesitas crear una cuenta.`;
      }
      return 'Al aceptar, confirmas la fecha acordada con el taller. No necesitas crear una cuenta.';
    }
    return 'Al aceptar, el taller puede continuar este trabajo en la misma visita. No necesitas crear una cuenta.';
  }
  return 'Al aceptar, el taller te contactará para confirmar el horario. No necesitas crear una cuenta.';
}

export function estadoMeta(estado) {
  if (estado === 'aceptada') return { label: 'Aceptada', tone: 'ok' };
  if (estado === 'rechazada') return { label: 'Rechazada', tone: 'muted' };
  if (estado === 'enviada') return { label: 'Pendiente de respuesta', tone: 'muted' };
  if (estado === 'cancelada') return { label: 'Cancelada', tone: 'muted' };
  if (estado === 'expirada') return { label: 'Expirada', tone: 'muted' };
  return estado ? { label: String(estado), tone: 'muted' } : null;
}

export function tallerAccentColor(nombre) {
  const s = String(nombre || 'Taller');
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return TALLER_ACCENT_POOL[hash % TALLER_ACCENT_POOL.length];
}

export function tallerInitials(nombre) {
  const parts = String(nombre || 'T').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || 'T').toUpperCase();
}

export function resolveCliente(data) {
  const fromObj = data?.cliente && typeof data.cliente === 'object' ? data.cliente : {};
  const nombre = (fromObj.nombre || data?.cliente_nombre || '').trim();
  const telefono = (fromObj.telefono || '').trim();
  const direccion = (fromObj.direccion || data?.direccion_servicio || '').trim();
  if (!nombre && !telefono && !direccion) return null;
  return { nombre, telefono, direccion };
}

export function buildLineas(data) {
  const rows = [];
  const mo = Number(data?.mano_obra_clp) || 0;
  const servicio = (data?.servicio_nombre || '').trim();
  if (mo > 0 || servicio) {
    rows.push({
      key: 'servicio',
      nombre: servicio || 'Servicio',
      tipo: 'Servicio',
      qty: 1,
      unitLabel: '',
      unitario: mo,
      subtotal: mo,
      meta: '',
    });
  }
  const reps = Array.isArray(data?.repuestos) ? data.repuestos : [];
  reps.forEach((rep, idx) => {
    const qty = Number(rep.cantidad) || 1;
    const unit = Number(rep.precio_unitario_clp) || 0;
    const marca = (rep.marca_repuesto || '').trim();
    const comentario = (rep.comentario || '').trim();
    rows.push({
      key: `${rep.id || rep.nombre || 'rep'}-${idx}`,
      nombre: rep.nombre || 'Repuesto',
      tipo: 'Repuesto',
      qty,
      unitLabel: 'und',
      unitario: unit,
      subtotal: unit * qty,
      meta: [marca, comentario].filter(Boolean).join(' · '),
    });
  });
  return rows;
}
