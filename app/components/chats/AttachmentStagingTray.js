import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { CircleX, FileText, Film, Music } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, withOpacity } from '../../design-system/tokens';

const AttachmentStagingTray = ({ attachments, onRemove }) => {
  if (!attachments?.length) return null;

  const count = attachments.length;
  const hint =
    count === 1
      ? '1 archivo listo · toca ↑ para enviar'
      : `${count} archivos listos · toca ↑ para enviar`;

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>{hint}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {attachments.map((item, index) => {
          const isImage = item.type === 'image';
          const isVideo = item.type === 'video';
          const isAudio = item.type === 'audio';

          return (
            <View key={`${item.uri}-${index}`} style={styles.chip}>
              {isImage ? (
                <Image source={{ uri: item.uri }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.mediaThumb, isVideo && styles.videoThumb, isAudio && styles.audioThumb]}>
                  {isVideo ? (
                    <Film size={22} color={COLORS.text.onPrimary} />
                  ) : isAudio ? (
                    <Music size={22} color={COLORS.primary[600]} />
                  ) : (
                    <FileText size={22} color={COLORS.text.secondary} />
                  )}
                  <Text style={[styles.mediaLabel, isVideo && styles.mediaLabelOnDark]} numberOfLines={1}>
                    {isVideo ? 'Video' : isAudio ? 'Audio' : item.name || 'Archivo'}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => onRemove(index)}
                hitSlop={8}
                accessibilityLabel="Quitar archivo"
              >
                <CircleX size={18} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.background.paper,
    paddingTop: SPACING.xs,
    paddingBottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
  },
  hint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  scroll: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  chip: {
    position: 'relative',
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.neutral.gray[50],
  },
  thumb: {
    width: 56,
    height: 56,
  },
  mediaThumb: {
    width: 88,
    height: 56,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.neutral.gray[100],
  },
  videoThumb: {
    backgroundColor: COLORS.neutral.gray[800],
    width: 72,
  },
  audioThumb: {
    backgroundColor: COLORS.primary[50],
    width: 72,
  },
  mediaLabel: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.secondary,
    maxWidth: 72,
    textAlign: 'center',
  },
  mediaLabelOnDark: {
    color: withOpacity(COLORS.text.onPrimary, 0.9),
  },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.background.paper,
    borderRadius: 10,
  },
});

export default AttachmentStagingTray;
