import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { FileText } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, withOpacity } from '../../design-system/tokens';
import {
  getMessageAttachmentUri,
  getMessageAttachmentMeta,
  getChatAttachmentKind,
  resolveChatAttachmentUri,
  normalizeMessageText,
  groupConsecutiveImageMessages,
} from '../../utils/chatAttachmentMedia';
import AudioMessageBubble from './AudioMessageBubble';
import VideoMessageBubble from './VideoMessageBubble';
import ImageGalleryBubble from './ImageGalleryBubble';

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const fileLabel = (uri, name) => {
  if (name) return name;
  if (typeof uri === 'string') {
    try {
      return decodeURIComponent(uri.split('?')[0].split('/').pop() || 'Documento');
    } catch {
      return uri.split('?')[0].split('/').pop() || 'Documento';
    }
  }
  return 'Documento';
};

const openAttachment = async (uri) => {
  if (!uri) return;
  try {
    const can = await Linking.canOpenURL(uri);
    if (can) {
      await Linking.openURL(uri);
    } else {
      Alert.alert('No se pudo abrir', 'Este archivo no se puede abrir en este dispositivo.');
    }
  } catch {
    Alert.alert('No se pudo abrir', 'Este archivo no se puede abrir en este dispositivo.');
  }
};

const ChatMessageRow = ({
  item,
  isMe,
  currentUserId,
  onImagePress,
  getMediaBase,
  showReadReceipt,
}) => {
  if (item.type === 'gallery') {
    const lastMsg = item.messages[item.messages.length - 1];
    const time = formatTime(lastMsg?.timestamp || lastMsg?.created_at || lastMsg?.fecha_envio);

    return (
      <View style={[styles.row, isMe ? styles.rowMe : styles.rowOther]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther, styles.mediaBubble]}>
          <ImageGalleryBubble
            messages={item.messages}
            onImagePress={onImagePress}
            getMediaBase={getMediaBase}
          />
          <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>{time}</Text>
        </View>
        {showReadReceipt ? <Text style={styles.readReceipt}>Leído</Text> : null}
      </View>
    );
  }

  const message = item.messages[0];
  const messageBody = normalizeMessageText(message.content ?? message.message ?? message.mensaje);
  const attachmentUri = getMessageAttachmentUri(message);
  const { mime, name } = getMessageAttachmentMeta(message);
  const hasAttachment = !!attachmentUri;
  const resolvedUri = hasAttachment
    ? resolveChatAttachmentUri(attachmentUri, getMediaBase)
    : '';
  const kind = hasAttachment ? getChatAttachmentKind(attachmentUri, mime, name) : null;
  const time = formatTime(message.timestamp || message.created_at || message.fecha_envio);
  const docName = fileLabel(attachmentUri, name);

  return (
    <View style={[styles.row, isMe ? styles.rowMe : styles.rowOther]}>
      <View
        style={[
          styles.bubble,
          isMe ? styles.bubbleMe : styles.bubbleOther,
          hasAttachment && kind !== 'audio' ? styles.mediaBubble : null,
        ]}
      >
        {hasAttachment && kind === 'image' && resolvedUri ? (
          <ImageGalleryBubble
            messages={[message]}
            onImagePress={onImagePress}
            getMediaBase={getMediaBase}
          />
        ) : null}

        {hasAttachment && kind === 'video' && resolvedUri ? (
          <VideoMessageBubble uri={resolvedUri} isMe={isMe} />
        ) : null}

        {hasAttachment && kind === 'audio' && resolvedUri ? (
          <AudioMessageBubble uri={resolvedUri} isMe={isMe} />
        ) : null}

        {hasAttachment && kind === 'file' ? (
          <TouchableOpacity
            style={styles.docRow}
            onPress={() => openAttachment(resolvedUri)}
            activeOpacity={0.8}
            disabled={!resolvedUri}
          >
            <View style={[styles.docIcon, isMe ? styles.docIconMe : styles.docIconOther]}>
              <FileText size={20} color={isMe ? COLORS.text.onPrimary : COLORS.primary[600]} />
            </View>
            <View style={styles.docMeta}>
              <Text
                style={[styles.docText, isMe ? styles.textMe : styles.textOther]}
                numberOfLines={2}
              >
                {docName}
              </Text>
              <Text style={[styles.docAction, isMe ? styles.timeMe : styles.timeOther]}>
                Toca para abrir
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {!!messageBody && (
          <Text
            style={[
              styles.body,
              isMe ? styles.textMe : styles.textOther,
              hasAttachment ? styles.bodyWithMedia : null,
            ]}
          >
            {messageBody}
          </Text>
        )}

        <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>{time}</Text>
      </View>
      {showReadReceipt ? <Text style={styles.readReceipt}>Leído</Text> : null}
    </View>
  );
};

export function prepareChatListItems(messages, currentUserId) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const chronological = [...messages].reverse();
  const groups = groupConsecutiveImageMessages(chronological, currentUserId);

  return groups
    .reverse()
    .map((g, idx) => ({
      ...g,
      key: g.messages.map((m) => m.id).join('-') || `group-${idx}`,
      isMe:
        g.isMe ??
        (currentUserId != null &&
          String(g.senderId ?? g.messages[0]?.sender_id) === String(currentUserId)),
    }));
}

const styles = StyleSheet.create({
  row: {
    marginBottom: SPACING.sm,
    maxWidth: '82%',
  },
  rowMe: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  rowOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    maxWidth: '100%',
  },
  bubbleMe: {
    backgroundColor: COLORS.neutral.gray[800],
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: COLORS.neutral.gray[100],
    borderBottomLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
  },
  mediaBubble: {
    padding: 6,
  },
  body: {
    ...TYPOGRAPHY.styles.body,
    lineHeight: 22,
  },
  bodyWithMedia: {
    marginTop: 6,
    paddingHorizontal: 4,
  },
  textMe: {
    color: COLORS.text.onPrimary,
  },
  textOther: {
    color: COLORS.text.primary,
  },
  time: {
    ...TYPOGRAPHY.styles.small,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeMe: {
    color: withOpacity(COLORS.text.onPrimary, 0.75),
  },
  timeOther: {
    color: COLORS.text.tertiary,
  },
  readReceipt: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
    marginTop: 2,
    marginRight: 4,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 180,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIconMe: {
    backgroundColor: withOpacity(COLORS.base.white, 0.15),
  },
  docIconOther: {
    backgroundColor: COLORS.primary[50],
  },
  docMeta: {
    flex: 1,
    gap: 2,
  },
  docText: {
    ...TYPOGRAPHY.styles.caption,
    maxWidth: 160,
    fontWeight: '600',
  },
  docAction: {
    ...TYPOGRAPHY.styles.small,
  },
});

export default ChatMessageRow;
