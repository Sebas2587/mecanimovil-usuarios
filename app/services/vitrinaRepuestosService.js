import { get, post } from './api';

export async function obtenerVitrinaRepuestos(token) {
  const safe = String(token || '').trim();
  if (!safe) throw new Error('Token de vitrina inválido');
  return get(`/ordenes/vitrinas-repuestos/${encodeURIComponent(safe)}/`, {}, {
    requiresAuth: false,
    forceRefresh: true,
  });
}

export async function seleccionarVitrinaRepuestos(token, selecciones) {
  const safe = String(token || '').trim();
  if (!safe) throw new Error('Token de vitrina inválido');
  return post(
    `/ordenes/vitrinas-repuestos/${encodeURIComponent(safe)}/seleccionar/`,
    { selecciones },
    { requiresAuth: false },
  );
}

export function getVitrinaTokenFromUrl(raw) {
  const trimmed = String(raw || '').trim();
  const match = trimmed.match(/\/repuestos\/([A-Za-z0-9_-]+)/i);
  return match ? match[1] : null;
}
