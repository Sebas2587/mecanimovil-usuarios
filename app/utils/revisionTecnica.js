import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = '@mecanimovil/rt_renewal_due_';

const MONTH_MAP = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11,
};

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function parseMesRevisionTecnica(mesRaw) {
  if (mesRaw == null || mesRaw === '') return null;
  const s = stripAccents(String(mesRaw).trim().toLowerCase());
  if (!s) return null;
  const n = parseInt(s, 10);
  if (!Number.isNaN(n) && n >= 1 && n <= 12) return n - 1;
  const key = s.replace(/\./g, '');
  if (key in MONTH_MAP) return MONTH_MAP[key];
  for (const [name, idx] of Object.entries(MONTH_MAP)) {
    if (name.length >= 3 && key.startsWith(name)) return idx;
  }
  return null;
}

export function mesRevisionTecnicaLabel(month0) {
  if (month0 == null || month0 < 0 || month0 > 11) return '';
  return MONTH_NAMES[month0];
}

/** Último instante del mes de vencimiento, primera ocurrencia >= from */
export function getNextRevisionDeadlineEnd(month0, from = new Date()) {
  const y = from.getFullYear();
  let end = new Date(y, month0 + 1, 0, 23, 59, 59, 999);
  if (from.getTime() <= end.getTime()) return end;
  return new Date(y + 1, month0 + 1, 0, 23, 59, 59, 999);
}

export function toISODateOnly(d) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODateOnly(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

function startOfToday() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

/** Meses completos aproximados desde `from` hasta `to` (to inclusive de mes) */
export function wholeMonthsBetween(from, to) {
  if (!to || !from) return 0;
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

function storageKey(vehicleId) {
  return `${STORAGE_PREFIX}${vehicleId}`;
}

export async function loadRtRenewalDueISO(vehicleId) {
  if (vehicleId == null || vehicleId === '') return null;
  try {
    const raw = await AsyncStorage.getItem(storageKey(vehicleId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const iso = parsed?.nextDueISO;
    if (!iso) return null;
    const dt = parseISODateOnly(iso);
    if (!dt || dt.getTime() < startOfToday().getTime()) {
      await AsyncStorage.removeItem(storageKey(vehicleId));
      return null;
    }
    return iso;
  } catch {
    return null;
  }
}

/**
 * Tras confirmar RT en el mes de vencimiento: próximo plazo = fin del mismo mes al año siguiente.
 */
export async function saveRtRenewalAfterConfirm(vehicleId, mesRaw) {
  const month0 = parseMesRevisionTecnica(mesRaw);
  if (month0 === null || vehicleId == null || vehicleId === '') return null;
  const now = new Date();
  const currentEnd = getNextRevisionDeadlineEnd(month0, now);
  const next = new Date(currentEnd);
  next.setFullYear(next.getFullYear() + 1);
  const nextDueISO = toISODateOnly(next);
  await AsyncStorage.setItem(
    storageKey(vehicleId),
    JSON.stringify({ nextDueISO, updatedAt: new Date().toISOString() })
  );
  return nextDueISO;
}

/** Glass dark: borde / acento / fondo suave por tono */
export function getRevisionTecnicaToneStyles(tone) {
  const map = {
    calm: {
      border: 'rgba(6,182,212,0.35)',
      accent: '#22D3EE',
      subtext: 'rgba(165,243,252,0.85)',
      bg: 'rgba(6,182,212,0.08)',
    },
    soon: {
      border: 'rgba(245,158,11,0.45)',
      accent: '#FBBF24',
      subtext: 'rgba(253,230,138,0.9)',
      bg: 'rgba(245,158,11,0.1)',
    },
    urgent: {
      border: 'rgba(249,115,22,0.55)',
      accent: '#FB923C',
      subtext: 'rgba(254,215,170,0.95)',
      bg: 'rgba(249,115,22,0.12)',
    },
    expiry_month: {
      border: 'rgba(250,204,21,0.5)',
      accent: '#FDE047',
      subtext: 'rgba(254,249,195,0.92)',
      bg: 'rgba(250,204,21,0.12)',
    },
    renewed: {
      border: 'rgba(16,185,129,0.45)',
      accent: '#6EE7B7',
      subtext: 'rgba(167,243,208,0.9)',
      bg: 'rgba(16,185,129,0.1)',
    },
    overdue: {
      border: 'rgba(239,68,68,0.5)',
      accent: '#FCA5A5',
      subtext: 'rgba(254,202,202,0.95)',
      bg: 'rgba(239,68,68,0.1)',
    },
  };
  return map[tone] || map.calm;
}

/**
 * @param {string|null|undefined} mesRaw - mes_revision_tecnica del vehículo
 * @param {string|null|undefined} renewalDueISO - próximo vencimiento guardado localmente (dueño)
 * @param {{ publicViewer?: boolean }} opts - si true, no hay "renewed" por almacenamiento local
 */
export function getRevisionTecnicaUiState(mesRaw, renewalDueISO, opts = {}) {
  const publicViewer = opts.publicViewer === true;
  const month0 = parseMesRevisionTecnica(mesRaw);
  if (month0 === null) return null;

  const now = new Date();
  const monthName = mesRevisionTecnicaLabel(month0);

  let effectiveRenewalISO = renewalDueISO;
  if (effectiveRenewalISO) {
    const r = parseISODateOnly(effectiveRenewalISO);
    if (!r || r.getTime() < startOfToday().getTime()) effectiveRenewalISO = null;
  }

  const baseDeadline = getNextRevisionDeadlineEnd(month0, now);
  const storedEnd = effectiveRenewalISO ? parseISODateOnly(effectiveRenewalISO) : null;

  const hasRenewedAhead =
    !publicViewer && storedEnd != null && storedEnd.getTime() > baseDeadline.getTime();

  const inExpiryMonth = now.getMonth() === month0;
  const endOfThisExpiryMonth = new Date(now.getFullYear(), month0 + 1, 0, 23, 59, 59, 999);

  const showConfirmButton =
    !publicViewer &&
    inExpiryMonth &&
    (!storedEnd || storedEnd.getTime() <= endOfThisExpiryMonth.getTime());

  const overdue = hasRenewedAhead
    ? now.getTime() > storedEnd.getTime()
    : now.getTime() > baseDeadline.getTime();

  const countdownEnd = hasRenewedAhead && storedEnd ? storedEnd : baseDeadline;
  const monthsLeft = wholeMonthsBetween(now, countdownEnd);

  let tone = 'calm';
  let hint = '';

  if (overdue) {
    tone = 'overdue';
    hint = `El plazo del mes de revisión técnica (${monthName}) ya pasó. Agenda en una planta de revisión y confirma aquí cuando la realices.`;
  } else if (hasRenewedAhead) {
    tone = 'renewed';
    hint = `Registraste la revisión para este ciclo. Próximo vencimiento referencial: ${formatHintDate(storedEnd)} (${monthName}).`;
  } else if (showConfirmButton) {
    tone = 'expiry_month';
    hint = `Estás en el mes de revisión técnica (${monthName}). Si ya la realizaste en planta, confírmalo abajo.`;
  } else if (monthsLeft <= 1) {
    tone = 'urgent';
    hint = `Queda poco tiempo: en aproximadamente ${monthsLeft === 0 ? 'este' : '1'} mes llega tu mes de revisión técnica (${monthName}).`;
  } else if (monthsLeft <= 3) {
    tone = 'soon';
    hint = `Faltan aproximadamente ${monthsLeft} meses para el mes de revisión técnica (${monthName}).`;
  } else {
    tone = 'calm';
    hint = `Faltan aproximadamente ${monthsLeft} meses para el mes de revisión técnica (${monthName}).`;
  }

  return {
    month0,
    monthName,
    tone,
    hint,
    showConfirmButton,
    overdue,
    monthsLeft,
    deadlineISO: toISODateOnly(countdownEnd),
  };
}

function formatHintDate(d) {
  if (!d) return '';
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}
