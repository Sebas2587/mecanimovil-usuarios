import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Play, X, Film } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, withOpacity } from '../../design-system/tokens';

const VideoMessageBubble = ({ uri, isMe }) => {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(open && uri ? uri : null, (p) => {
    p.loop = false;
    try {
      p.play();
    } catch (_) {
      // ignore autoplay failures on web
    }
  });

  return (
    <>
      <TouchableOpacity
        style={styles.thumbWrap}
        onPress={() => setOpen(true)}
        activeOpacity={0.9}
      >
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Film size={28} color={isMe ? COLORS.text.onPrimary : COLORS.text.secondary} />
        </View>
        <View style={styles.playOverlay}>
          <View style={[styles.playCircle, isMe ? styles.playCircleMe : styles.playCircleOther]}>
            <Play
              size={20}
              color={isMe ? COLORS.text.onPrimary : COLORS.primary[600]}
              fill={isMe ? COLORS.text.onPrimary : COLORS.primary[600]}
            />
          </View>
        </View>
        <Text style={[styles.label, isMe ? styles.labelMe : styles.labelOther]}>Video</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <TouchableOpacity
            style={[styles.closeBtn, { top: insets.top + 12 }]}
            onPress={() => setOpen(false)}
            hitSlop={12}
          >
            <X size={24} color={COLORS.text.inverse} />
          </TouchableOpacity>
          <View style={[styles.videoFrame, { paddingBottom: insets.bottom + 12, paddingTop: insets.top + 56 }]}>
            <VideoView
              style={styles.video}
              player={player}
              allowsFullscreen
              allowsPictureInPicture
              nativeControls
              contentFit="contain"
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  thumbWrap: {
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    width: 200,
    height: 140,
    backgroundColor: COLORS.neutral.gray[800],
  },
  thumb: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholder: {
    backgroundColor: COLORS.neutral.gray[700],
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(COLORS.base.inkBlack, 0.2),
  },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircleMe: {
    backgroundColor: withOpacity(COLORS.base.white, 0.3),
  },
  playCircleOther: {
    backgroundColor: withOpacity(COLORS.base.white, 0.9),
  },
  label: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    fontSize: 11,
    fontWeight: '600',
  },
  labelMe: {
    color: COLORS.text.onPrimary,
  },
  labelOther: {
    color: COLORS.text.primary,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: withOpacity(COLORS.base.inkBlack, 0.96),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 20,
    padding: 8,
    backgroundColor: withOpacity(COLORS.base.white, 0.15),
    borderRadius: 20,
  },
  videoFrame: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: SPACING.sm,
  },
  video: {
    width: '100%',
    flex: 1,
    minHeight: Platform.OS === 'web' ? '70vh' : 320,
    backgroundColor: COLORS.base.inkBlack,
  },
});

export default VideoMessageBubble;
