import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import Icon from '../base/Icon/Icon';
import { Swipeable } from 'react-native-gesture-handler';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';

const ACTION_WIDTH = 88;
const OPEN_THRESHOLD = 56;

/** Cierra el resto de filas abiertas al deslizar una nueva */
const openRowRegistry = new Map();

function closeOtherRows(activeKey) {
  openRowRegistry.forEach((ref, key) => {
    if (key !== activeKey && ref?.close) {
      ref.close();
    }
  });
}

/**
 * Fila de chat con gesto swipe izquierda → elimina al superar el umbral.
 */
export default function ChatSwipeableRow({ rowKey, onDelete, disabled, children }) {
  const swipeRef = useRef(null);
  const [deleting, setDeleting] = React.useState(false);

  const runDelete = useCallback(async () => {
    if (disabled || deleting) return;
    setDeleting(true);
    swipeRef.current?.close();
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }, [disabled, deleting, onDelete]);

  const renderRightActions = useCallback(
    (progress, dragX) => {
      const translateX = dragX.interpolate({
        inputRange: [-ACTION_WIDTH, 0],
        outputRange: [0, ACTION_WIDTH],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View style={[styles.actionContainer, { transform: [{ translateX }] }]}>
          <Pressable
            style={styles.actionPressable}
            onPress={runDelete}
            accessibilityRole="button"
            accessibilityLabel="Eliminar conversación"
          >
            <Icon name="trash-outline" size={24} color={COLORS.text.inverse} />
            <Text style={styles.actionLabel}>Eliminar</Text>
          </Pressable>
        </Animated.View>
      );
    },
    [runDelete],
  );

  const handleSwipeableOpen = useCallback(() => {
    runDelete();
  }, [runDelete]);

  const handleSwipeableWillOpen = useCallback(() => {
    closeOtherRows(rowKey);
  }, [rowKey]);

  const setRef = useCallback(
    (ref) => {
      swipeRef.current = ref;
      if (ref) {
        openRowRegistry.set(rowKey, ref);
      } else {
        openRowRegistry.delete(rowKey);
      }
    },
    [rowKey],
  );

  return (
    <Swipeable
      ref={setRef}
      friction={2}
      overshootRight={false}
      rightThreshold={OPEN_THRESHOLD}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={handleSwipeableWillOpen}
      onSwipeableOpen={handleSwipeableOpen}
      enabled={!disabled && !deleting}
      containerStyle={styles.swipeContainer}
    >
      <View style={styles.rowContent}>
        {children}
        {deleting ? (
          <View style={styles.deletingOverlay}>
            <ActivityIndicator size="small" color={COLORS.primary[500]} />
          </View>
        ) : null}
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: SPACING.md,
  },
  rowContent: {
    position: 'relative',
  },
  actionContainer: {
    width: ACTION_WIDTH,
    marginBottom: 0,
  },
  actionPressable: {
    flex: 1,
    backgroundColor: COLORS.error.main,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDERS.radius.lg,
    paddingHorizontal: SPACING.sm,
    gap: 4,
  },
  actionLabel: {
    color: COLORS.text.inverse,
    fontSize: 12,
    fontWeight: '700',
  },
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: withOpacity(COLORS.base.white, 0.75),
    borderRadius: BORDERS.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
