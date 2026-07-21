/**
 * Open Graph / link-preview helpers for MecaniMovil public share URLs.
 * Used by Vercel Edge Middleware (crawlers only; humans get the SPA).
 */

export const DEFAULT_API_BASE = 'https://mecanimovil-api.onrender.com/api';

export const BOT_UA_RE =
  /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|skypeuripreview|applebot|googlebot|bingbot|baiduspider|embedly|quora link preview|pinterest|redditbot|vkshare|w3c_validator|iframely|outbrain|rogerbot|showyoubot|tumblr|bitlybot|flipboard|nuzzel|qwantify|pinterestbot|opengraph|meta-externalagent|threads/i;

export function isLinkPreviewBot(userAgent) {
  return BOT_UA_RE.test(String(userAgent || ''));
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function truncate(text, max = 180) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trim()}…`;
}

export function formatClp(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

export function vehicleLabel({ marca, modelo, anio, patente } = {}) {
  const name = [marca, modelo].filter(Boolean).join(' ').trim();
  const year = anio ? String(anio) : '';
  const plate = patente ? String(patente).toUpperCase() : '';
  const parts = [];
  if (name && year) parts.push(`${name} · ${year}`);
  else if (name) parts.push(name);
  else if (year) parts.push(year);
  if (plate) parts.push(`Patente ${plate}`);
  return parts.join(' · ');
}

export function absoluteMediaUrl(maybeUrl, apiBase) {
  if (!maybeUrl || typeof maybeUrl !== 'string') return null;
  const trimmed = maybeUrl.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = String(apiBase || DEFAULT_API_BASE).replace(/\/api\/?$/i, '');
  return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export function defaultOgImage(requestOrigin) {
  return `${String(requestOrigin || '').replace(/\/$/, '')}/og-default.png`;
}

/**
 * @returns {{ kind: string, token?: string, id?: string, type?: string } | null}
 */
export function matchShareRoute(pathname) {
  const path = String(pathname || '').split('?')[0].split('#')[0];

  let m = path.match(/^\/cotizacion\/([A-Za-z0-9_-]+)\/?$/i);
  if (m) return { kind: 'cotizacion', token: m[1] };

  m = path.match(/^\/reporte\/([A-Za-z0-9_-]+)\/?$/i);
  if (m) return { kind: 'informe', token: m[1] };

  m = path.match(/^\/provider\/(taller|mecanico|proveedor)\/(\d+)(?:\/[^/]*)?\/?$/i);
  if (m) {
    const type = m[1].toLowerCase() === 'mecanico' ? 'mecanico' : 'taller';
    return { kind: 'provider', type, id: m[2] };
  }

  m = path.match(/^\/marketplace\/vehicle\/(\d+)\/?$/i);
  if (m) return { kind: 'vehicle', id: m[1] };

  return null;
}

export function buildOgHtml({
  title,
  description,
  image,
  url,
  siteName = 'MecaniMovil',
}) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const img = escapeHtml(image);
  const u = escapeHtml(url);
  const site = escapeHtml(siteName);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${t}</title>
  <meta name="description" content="${d}"/>
  <link rel="canonical" href="${u}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="${site}"/>
  <meta property="og:locale" content="es_CL"/>
  <meta property="og:title" content="${t}"/>
  <meta property="og:description" content="${d}"/>
  <meta property="og:url" content="${u}"/>
  <meta property="og:image" content="${img}"/>
  <meta property="og:image:alt" content="${t}"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${t}"/>
  <meta name="twitter:description" content="${d}"/>
  <meta name="twitter:image" content="${img}"/>
</head>
<body>
  <main>
    <h1>${t}</h1>
    <p>${d}</p>
    <p><a href="${u}">Abrir en MecaniMovil</a></p>
  </main>
</body>
</html>`;
}

export async function fetchJson(url, { timeoutMs = 4500 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'MecaniMovil-OGPreview/1.0',
      },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function buildPreviewForRoute(route, {
  pageUrl,
  requestOrigin,
  apiBase = DEFAULT_API_BASE,
}) {
  const fallbackImage = defaultOgImage(requestOrigin);
  const base = String(apiBase || DEFAULT_API_BASE).replace(/\/$/, '');

  if (route.kind === 'cotizacion') {
    const data = await fetchJson(`${base}/ordenes/cotizaciones-publicas/${encodeURIComponent(route.token)}/`);
    if (!data) {
      return {
        title: 'Cotización · MecaniMovil',
        description: 'Revisa esta cotización de servicio automotriz en MecaniMovil.',
        image: fallbackImage,
        url: pageUrl,
      };
    }
    const veh = vehicleLabel({
      marca: data.vehiculo_marca,
      modelo: data.vehiculo_modelo,
      anio: data.vehiculo_anio,
      patente: data.vehiculo_patente,
    });
    const taller = (data.taller && data.taller.nombre) || 'Taller';
    const servicio = data.servicio_nombre || 'Servicio';
    const total = formatClp(data.total_clp);
    const modalidad =
      data.modalidad === 'domicilio' ? 'A domicilio' : data.modalidad === 'taller' ? 'En taller' : '';
    const title = truncate(
      veh ? `Cotización · ${veh}` : `Cotización · ${servicio}`,
      90,
    );
    const description = truncate(
      [servicio, taller, total, modalidad, 'Revisa y responde en MecaniMovil']
        .filter(Boolean)
        .join(' · '),
      200,
    );
    const image =
      absoluteMediaUrl(data.taller && data.taller.foto_perfil, base) || fallbackImage;
    return { title, description, image, url: pageUrl };
  }

  if (route.kind === 'informe') {
    const data = await fetchJson(`${base}/checklists/informes/${encodeURIComponent(route.token)}/`);
    if (!data) {
      return {
        title: 'Informe de servicio · MecaniMovil',
        description: 'Revisa el informe y checklist de tu servicio en MecaniMovil.',
        image: fallbackImage,
        url: pageUrl,
      };
    }
    const veh = vehicleLabel(data.vehiculo || {});
    const taller = data.taller_nombre || 'Taller';
    const servicio =
      (data.checklist && data.checklist.template_nombre)
      || data.servicio_descripcion
      || 'Servicio';
    const estado = data.estado === 'FIRMADO' || data.checklist?.firma_cliente_presente
      ? 'Firmado por el cliente'
      : 'Pendiente de firma';
    const title = truncate(
      veh ? `Informe de servicio · ${veh}` : `Informe de servicio · ${servicio}`,
      90,
    );
    const description = truncate(
      [servicio, taller, estado, 'Checklist e informe en MecaniMovil']
        .filter(Boolean)
        .join(' · '),
      200,
    );
    const firstFoto =
      Array.isArray(data.fotos_evidencia) && data.fotos_evidencia[0]
        ? (
          data.fotos_evidencia[0].imagen_url
          || data.fotos_evidencia[0].url
          || data.fotos_evidencia[0].image
        )
        : null;
    const image = absoluteMediaUrl(firstFoto, base) || fallbackImage;
    return { title, description, image, url: pageUrl };
  }

  if (route.kind === 'provider') {
    const path =
      route.type === 'mecanico'
        ? `${base}/usuarios/mecanicos-domicilio/${encodeURIComponent(route.id)}/`
        : `${base}/usuarios/talleres/${encodeURIComponent(route.id)}/`;
    const data = await fetchJson(path);
    if (!data) {
      return {
        title: route.type === 'mecanico' ? 'Mecánico · MecaniMovil' : 'Taller · MecaniMovil',
        description: 'Perfil de proveedor en MecaniMovil.',
        image: fallbackImage,
        url: pageUrl,
      };
    }
    const nombre =
      data.nombre
      || data.nombre_taller
      || data.nombre_comercial
      || (data.usuario && (data.usuario.nombre || `${data.usuario.first_name || ''} ${data.usuario.last_name || ''}`.trim()))
      || (route.type === 'mecanico' ? 'Mecánico' : 'Taller');
    const rating = data.calificacion_promedio ?? data.rating_average ?? data.rating;
    const reviews = data.total_resenas ?? data.total_reviews ?? data.reviews_count;
    const ciudad =
      data.ciudad
      || data.comuna
      || (data.direccion_fisica && (data.direccion_fisica.comuna || data.direccion_fisica.ciudad))
      || '';
    const kindLabel = route.type === 'mecanico' ? 'Mecánico a domicilio' : 'Taller';
    const title = truncate(`${nombre} · ${kindLabel}`, 70);
    const ratingBit =
      rating != null && Number(rating) > 0
        ? `${Number(rating).toFixed(1)}★${reviews != null ? ` (${reviews})` : ''}`
        : '';
    const description = truncate(
      [kindLabel, ciudad, ratingBit, 'Agenda y pide servicio en MecaniMovil']
        .filter(Boolean)
        .join(' · '),
    );
    const foto =
      data.foto_perfil
      || data.logo
      || (data.usuario && data.usuario.foto_perfil)
      || (typeof data.foto_perfil === 'object' && data.foto_perfil?.url);
    const fotoUrl =
      typeof foto === 'string'
        ? foto
        : (foto && (foto.url || foto.uri)) || null;
    const image = absoluteMediaUrl(fotoUrl, base) || fallbackImage;
    return { title, description, image, url: pageUrl };
  }

  if (route.kind === 'vehicle') {
    const data = await fetchJson(
      `${base}/vehiculos/${encodeURIComponent(route.id)}/ficha-publica/`,
    );
    if (!data) {
      return {
        title: 'Ficha de vehículo · MecaniMovil',
        description: 'Salud, servicios y talleres en MecaniMovil.',
        image: fallbackImage,
        url: pageUrl,
      };
    }
    const veh = vehicleLabel({
      marca: data.marca,
      modelo: data.modelo,
      anio: data.anio,
    });
    const cilindraje = data.cilindraje ? String(data.cilindraje) : '';
    const health =
      data.health_score != null ? `Salud ${Math.round(Number(data.health_score))}%` : '';
    const servicios =
      data.servicios_count != null
        ? `${data.servicios_count} ${Number(data.servicios_count) === 1 ? 'servicio' : 'servicios'}`
        : '';
    const title = truncate(`${veh || 'Vehículo'} · Ficha de salud`, 90);
    const description = truncate(
      [cilindraje, health, servicios, 'Historial y talleres en MecaniMovil']
        .filter(Boolean)
        .join(' · '),
      200,
    );
    return { title, description, image: fallbackImage, url: pageUrl };
  }

  return {
    title: 'MecaniMovil',
    description: 'Servicios automotrices, talleres y cotizaciones.',
    image: fallbackImage,
    url: pageUrl,
  };
}
