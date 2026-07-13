/**
 * URLs de adjuntos de chat (R2 presigned, cPanel legacy o file:// local).
 */

import { Platform } from 'react-native';

export function normalizeMessageText(value) {
  if (value == null) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '[object Object]') return '';
    return trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function normalizeAttachmentRef(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '[object Object]') return null;
    return trimmed;
  }
  if (typeof value === 'object') {
    const candidate =
      value.url || value.uri || value.href || value.attachment || value.archivo_adjunto;
    return typeof candidate === 'string' ? candidate.trim() || null : null;
  }
  return null;
}

export function resolveChatAttachmentUri(uri, getMediaBase) {
  const normalized = normalizeAttachmentRef(uri);
  if (!normalized) return '';
  if (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('file://') ||
    normalized.startsWith('blob:')
  ) {
    return normalized;
  }
  const base = typeof getMediaBase === 'function' ? getMediaBase() : null;
  if (base) {
    const root = base.replace(/\/$/, '');
    return `${root}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
  }
  return normalized;
}

const IMAGE_EXT = /\.(jpeg|jpg|png|gif|webp|bmp|heic)$/i;
const VIDEO_EXT = /\.(mp4|mov|webm|3gp|m4v)$/i;
const AUDIO_EXT = /\.(mp3|m4a|ogg|wav|aac|caf)$/i;
const DOC_EXT = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar|rtf)$/i;

function pathFromUri(uri) {
  const normalized = normalizeAttachmentRef(uri);
  if (!normalized) return '';
  return normalized.split('?')[0];
}

function fileNameHint(uri, hintName) {
  if (hintName && typeof hintName === 'string') return hintName;
  const path = pathFromUri(uri);
  if (!path) return '';
  const parts = path.split('/');
  return parts[parts.length - 1] || '';
}

export function isChatAttachmentDocument(uri, hintMime, hintName) {
  if (hintMime) {
    if (
      hintMime === 'application/pdf' ||
      hintMime.includes('msword') ||
      hintMime.includes('officedocument') ||
      hintMime.includes('spreadsheet') ||
      hintMime.includes('presentation') ||
      hintMime === 'text/plain' ||
      hintMime === 'text/csv' ||
      hintMime === 'application/zip' ||
      hintMime === 'application/x-zip-compressed'
    ) {
      return true;
    }
  }
  const name = fileNameHint(uri, hintName);
  if (DOC_EXT.test(name)) return true;
  const path = pathFromUri(uri);
  return DOC_EXT.test(path);
}

export function isChatAttachmentImage(uri, hintMime, hintName) {
  if (hintMime?.startsWith('image/')) return true;
  if (isChatAttachmentDocument(uri, hintMime, hintName)) return false;
  if (hintMime?.startsWith('video/') || hintMime?.startsWith('audio/')) return false;

  const normalized = normalizeAttachmentRef(uri);
  if (!normalized) return false;

  const name = fileNameHint(uri, hintName);
  const path = pathFromUri(uri);

  if (IMAGE_EXT.test(path) || IMAGE_EXT.test(name)) return true;

  // blob:/file: solo imagen si el nombre/mime lo indican (PDF en web también es blob:)
  if (normalized.startsWith('blob:') || normalized.startsWith('file://')) {
    if (hintMime?.startsWith('image/')) return true;
    if (hintMime && !hintMime.startsWith('image/')) return false;
    if (name) return IMAGE_EXT.test(name);
    return true; // image picker sin meta
  }

  // Legacy: adjuntos en chat_attachments sin extensión → fotos antiguas
  if (/chat_(solicitudes|attachments)\//i.test(normalized)) {
    if (DOC_EXT.test(path) || DOC_EXT.test(name)) return false;
    if (VIDEO_EXT.test(path) || AUDIO_EXT.test(path)) return false;
    if (/\.[a-z0-9]{2,5}$/i.test(path) && !IMAGE_EXT.test(path)) return false;
    if (!/\.[a-z0-9]{2,5}$/i.test(path)) return true;
  }

  return false;
}

export function isChatAttachmentVideo(uri, hintMime, hintName) {
  if (hintMime?.startsWith('video/')) return true;
  if (isChatAttachmentDocument(uri, hintMime, hintName)) return false;
  const normalized = normalizeAttachmentRef(uri);
  if (!normalized) return false;
  const path = pathFromUri(uri);
  const name = fileNameHint(uri, hintName);
  return VIDEO_EXT.test(path) || VIDEO_EXT.test(name);
}

export function isChatAttachmentAudio(uri, hintMime, hintName) {
  if (hintMime?.startsWith('audio/')) return true;
  if (isChatAttachmentDocument(uri, hintMime, hintName)) return false;
  const normalized = normalizeAttachmentRef(uri);
  if (!normalized) return false;
  const path = pathFromUri(uri);
  const name = fileNameHint(uri, hintName);
  if (AUDIO_EXT.test(path) || AUDIO_EXT.test(name) || /^voice_/i.test(name)) return true;
  if (/voice_/i.test(path)) return true;
  return false;
}

export function getChatAttachmentKind(uri, hintMime, hintName) {
  const normalized = normalizeAttachmentRef(uri);
  if (!normalized) return 'file';
  // Orden: video/audio/doc antes que imagen (blob: ya no fuerza imagen)
  if (isChatAttachmentVideo(normalized, hintMime, hintName)) return 'video';
  if (isChatAttachmentAudio(normalized, hintMime, hintName)) return 'audio';
  if (isChatAttachmentDocument(normalized, hintMime, hintName)) return 'file';
  if (isChatAttachmentImage(normalized, hintMime, hintName)) return 'image';
  return 'file';
}

export function attachmentPreviewLabel(messageOrKind) {
  const kind =
    typeof messageOrKind === 'string'
      ? messageOrKind
      : getChatAttachmentKind(
          messageOrKind?.attachment ||
            messageOrKind?.archivo_adjunto ||
            messageOrKind?.attachment_url,
          messageOrKind?.attachment_mime || messageOrKind?.mime_type,
          messageOrKind?.attachment_name || messageOrKind?.name,
        );
  switch (kind) {
    case 'image':
      return 'Foto';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Mensaje de voz';
    default:
      return 'Adjunto';
  }
}

export function getMessageAttachmentUri(message) {
  return normalizeAttachmentRef(
    message?.attachment || message?.archivo_adjunto || message?.attachment_url,
  );
}

export function getMessageAttachmentMeta(message) {
  return {
    mime: message?.attachment_mime || message?.mime_type || message?.mimeType || null,
    name: message?.attachment_name || message?.name || null,
  };
}

/** Sube archivos de chat correctamente en web (File/Blob) y nativo ({ uri, name, type }). */
export async function appendChatFileToFormData(formData, fieldName, file) {
  if (!file?.uri) return formData;

  const mimeType = file.mimeType || file.mime || file.type || 'application/octet-stream';
  const fileName = file.name || `${fieldName}_${Date.now()}`;

  if (Platform.OS === 'web') {
    try {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const webFile = new File([blob], fileName, { type: mimeType || blob.type || 'application/octet-stream' });
      formData.append(fieldName, webFile);
      return formData;
    } catch (e) {
      console.warn('appendChatFileToFormData web fallback', e);
    }
  }

  formData.append(fieldName, {
    uri: file.uri,
    name: fileName,
    type: mimeType,
  });
  return formData;
}

export function normalizeChatMessage(raw = {}) {
  const { mime, name } = getMessageAttachmentMeta(raw);
  const attachment = getMessageAttachmentUri(raw);
  const inferredName =
    name || (attachment ? decodeURIComponent(attachment.split('?')[0].split('/').pop() || '') : null);
  let inferredMime = mime;
  if (!inferredMime && inferredName) {
    if (IMAGE_EXT.test(inferredName)) inferredMime = 'image/jpeg';
    else if (VIDEO_EXT.test(inferredName)) inferredMime = 'video/mp4';
    else if (AUDIO_EXT.test(inferredName)) inferredMime = 'audio/m4a';
    else if (/\.pdf$/i.test(inferredName)) inferredMime = 'application/pdf';
  }
  return {
    ...raw,
    content: normalizeMessageText(raw.content ?? raw.message ?? raw.mensaje),
    attachment,
    archivo_adjunto: attachment,
    attachment_mime: inferredMime,
    attachment_name: inferredName || null,
  };
}

/** Agrupa mensajes de imagen consecutivos del mismo remitente (ventana ~3s, sin texto). */
export function groupConsecutiveImageMessages(messages, currentUserId) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const groups = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];
    const senderId = msg.sender_id ?? msg.sender?.id ?? msg.enviado_por;
    const attachmentUri = getMessageAttachmentUri(msg);
    const { mime, name } = getMessageAttachmentMeta(msg);
    const hasText = !!normalizeMessageText(msg.content || msg.mensaje || msg.message)?.trim?.();
    const isImageOnly =
      attachmentUri && isChatAttachmentImage(attachmentUri, mime, name) && !hasText;

    if (!isImageOnly) {
      groups.push({ type: 'single', messages: [msg] });
      i += 1;
      continue;
    }

    const gallery = [msg];
    let j = i + 1;
    const baseTime = new Date(msg.timestamp || msg.fecha_envio).getTime();

    while (j < messages.length) {
      const next = messages[j];
      const nextSender = next.sender_id ?? next.sender?.id ?? next.enviado_por;
      const nextUri = getMessageAttachmentUri(next);
      const nextMeta = getMessageAttachmentMeta(next);
      const nextHasText = !!normalizeMessageText(next.content || next.mensaje || next.message)?.trim?.();
      const nextIsImageOnly =
        nextUri && isChatAttachmentImage(nextUri, nextMeta.mime, nextMeta.name) && !nextHasText;
      const nextTime = new Date(next.timestamp || next.fecha_envio).getTime();

      if (
        nextSender === senderId &&
        nextIsImageOnly &&
        Math.abs(nextTime - baseTime) <= 3000
      ) {
        gallery.push(next);
        j += 1;
      } else {
        break;
      }
    }

    groups.push({
      type: gallery.length > 1 ? 'gallery' : 'single',
      messages: gallery,
      senderId,
      isMe: senderId === currentUserId,
    });
    i = j;
  }

  return groups;
}
