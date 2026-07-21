/**
 * Vercel Edge Middleware: inject Open Graph HTML for link-preview crawlers.
 * Humans continue to the Expo SPA (index.html rewrite).
 *
 * Covers:
 * - /cotizacion/:token
 * - /reporte/:token  (informe / checklist)
 * - /provider/:type/:id
 * - /marketplace/vehicle/:id
 * - /marketplace/vehicle/ficha/:token
 * - /transferencia/claim/:token
 */

import {
  isLinkPreviewBot,
  matchShareRoute,
  buildOgHtml,
  buildPreviewForRoute,
  DEFAULT_API_BASE,
} from './og/buildPreview.js';

export const config = {
  matcher: [
    '/cotizacion/:token*',
    '/reporte/:token*',
    '/provider/:path*',
    '/marketplace/vehicle/:id*',
    '/marketplace/vehicle/ficha/:token*',
    '/transferencia/claim/:token*',
  ],
};

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!isLinkPreviewBot(ua)) {
    // Pass through to SPA / static assets.
    return;
  }

  const url = new URL(request.url);
  const route = matchShareRoute(url.pathname);
  if (!route) {
    return;
  }

  const apiBase =
    (typeof process !== 'undefined' && process.env && process.env.OG_API_BASE)
    || DEFAULT_API_BASE;

  const preview = await buildPreviewForRoute(route, {
    pageUrl: url.toString().split('#')[0],
    requestOrigin: url.origin,
    apiBase,
  });

  const html = buildOgHtml(preview);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Short TTL: WhatsApp/FB cache previews aggressively; avoid stale “en venta” copy.
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'X-Robots-Tag': 'noindex',
    },
  });
}
