import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Play, Pause } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, BORDERS, SPACING, withOpacity } from '../../design-system/tokens';

const formatDuration = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const AudioMessageBubble = ({ uri, isMe }) => {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const togglePlay = useCallback(() => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, status.playing]);

  const duration = status.duration || 0;
  const current = status.currentTime || 0;
  const progress = duration > 0 ? Math.min(current / duration, 1) : 0;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.playBtn, isMe ? styles.playBtnMe : styles.playBtnOther]}
        onPress={togglePlay}
        activeOpacity={0.8}
      >
        {status.playing ? (
          <Pause size={16} color={isMe ? COLORS.text.onPrimary : COLORS.primary[600]} fill={isMe ? COLORS.text.onPrimary : COLORS.primary[600]} />
        ) : (
          <Play size={16} color={isMe ? COLORS.text.onPrimary : COLORS.primary[600]} fill={isMe ? COLORS.text.onPrimary : COLORS.primary[600]} />
        )}
      </TouchableOpacity>
      <View style={styles.trackCol}>
        <View style={[styles.track, isMe ? styles.trackMe : styles.trackOther]}>
          <View
            style={[
              styles.fill,
              isMe ? styles.fillMe : styles.fillOther,
              { width: `${progress * 100}%` },
            ]}
          />
        </View>
        <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>
          {status.playing ? formatDuration(current) : formatDuration(duration)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minWidth: 180,
    paddingVertical: 4,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnMe: {
    backgroundColor: withOpacity(COLORS.base.white, 0.2),
  },
  playBtnOther: {
    backgroundColor: COLORS.primary[50],
  },
  trackCol: {
    flex: 1,
    gap: 4,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackMe: {
    backgroundColor: withOpacity(COLORS.base.white, 0.25),
  },
  trackOther: {
    backgroundColor: COLORS.neutral.gray[200],
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  fillMe: {
    backgroundColor: COLORS.text.onPrimary,
  },
  fillOther: {
    backgroundColor: COLORS.primary[500],
  },
  time: {
    ...TYPOGRAPHY.styles.small,
  },
  timeMe: {
    color: withOpacity(COLORS.text.onPrimary, 0.85),
  },
  timeOther: {
    color: COLORS.text.tertiary,
  },
});

export default AudioMessageBubble;
