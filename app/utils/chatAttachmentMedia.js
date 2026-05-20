/**
 * URLs de adjuntos de chat (R2 presigned, cPanel legacy o file:// local).
 */

export function resolveChatAttachmentUri(uri, getMediaBase) {
  if (!uri) return '';
  const trimmed = String(uri).trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('file://')
  ) {
    return trimmed;
  }
  const base = typeof getMediaBase === 'function' ? getMediaBase() : null;
  if (base) {
    const root = base.replace(/\/$/, '');
    return `${root}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  }
  return trimmed;
}

export function isChatAttachmentImage(uri) {
  if (!uri || typeof uri !== 'string') return false;
  if (uri.startsWith('file://')) return true;
  const path = uri.split('?')[0];
  if (/\.(jpeg|jpg|png|gif|webp|bmp|heic)$/i.test(path)) return true;
  if (/chat_(solicitudes|attachments)\//i.test(uri)) return true;
  return false;
}
