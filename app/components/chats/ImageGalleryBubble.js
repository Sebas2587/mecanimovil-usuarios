import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Text } from 'react-native';
import { Image } from 'expo-image';
import { ImageOff } from 'lucide-react-native';
import { BORDERS, COLORS, TYPOGRAPHY } from '../../design-system/tokens';
import {
  getMessageAttachmentUri,
  getMessageAttachmentMeta,
  getChatAttachmentKind,
  resolveChatAttachmentUri,
} from '../../utils/chatAttachmentMedia';

const ImageGalleryBubble = ({ messages, onImagePress, getMediaBase }) => {
  const [failed, setFailed] = useState({});

  const uris = messages
    .map((m) => {
      const raw = getMessageAttachmentUri(m);
      const { mime, name } = getMessageAttachmentMeta(m);
      const kind = getChatAttachmentKind(raw, mime, name);
      if (kind !== 'image') return null;
      return raw ? resolveChatAttachmentUri(raw, getMediaBase) : null;
    })
    .filter(Boolean);

  if (uris.length === 0) return null;

  const count = uris.length;
  const isGrid = count > 1;
  const cachePolicy = Platform.OS === 'web' ? 'none' : 'disk';

  const renderTile = (uri, index, style) => {
    const isFailed = failed[uri];
    return (
      <TouchableOpacity
        key={`${uri}-${index}`}
        style={[styles.tile, style]}
        onPress={() => !isFailed && onImagePress?.(uri)}
        activeOpacity={0.9}
        disabled={!!isFailed}
      >
        {isFailed ? (
          <View style={styles.failed}>
            <ImageOff size={22} color={COLORS.text.tertiary} />
            <Text style={styles.failedText}>No se pudo cargar</Text>
          </View>
        ) : (
          <Image
            source={{ uri }}
            style={styles.image}
            contentFit="cover"
            cachePolicy={cachePolicy}
            onError={() => setFailed((prev) => ({ ...prev, [uri]: true }))}
          />
        )}
      </TouchableOpacity>
    );
  };

  if (count === 1) {
    return (
      <View style={styles.single}>
        {renderTile(uris[0], 0, styles.singleTile)}
      </View>
    );
  }

  if (count === 2) {
    return (
      <View style={styles.row}>
        {uris.map((uri, i) => renderTile(uri, i, styles.halfTile))}
      </View>
    );
  }

  if (count === 3) {
    return (
      <View style={styles.grid3}>
        {renderTile(uris[0], 0, styles.grid3Main)}
        <View style={styles.grid3Side}>
          {renderTile(uris[1], 1, styles.grid3Small)}
          {renderTile(uris[2], 2, styles.grid3Small)}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.grid4}>
      {uris.slice(0, 4).map((uri, i) =>
        renderTile(uri, i, [styles.quarterTile, i >= 2 && isGrid ? styles.quarterBottom : null]),
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  single: {
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
  },
  singleTile: {
    width: 220,
    height: 160,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
  },
  halfTile: {
    width: 108,
    height: 108,
  },
  grid3: {
    flexDirection: 'row',
    gap: 4,
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
  },
  grid3Main: {
    width: 140,
    height: 140,
  },
  grid3Side: {
    gap: 4,
  },
  grid3Small: {
    width: 68,
    height: 68,
  },
  grid4: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 220,
    gap: 4,
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
  },
  quarterTile: {
    width: 108,
    height: 80,
  },
  quarterBottom: {},
  tile: {
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.gray[200],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  failed: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: COLORS.neutral.gray[100],
  },
  failedText: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
});

export default ImageGalleryBubble;
