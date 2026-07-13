import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, BORDERS, SPACING, SHADOWS } from '../../../design-system/tokens';

const BottomSheet = ({
  visible,
  onClose,
  title,
  children,
  footer,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            {title ? (
              <Text style={[TYPOGRAPHY.styles.h4, styles.title]}>{title}</Text>
            ) : null}
            <View style={styles.body}>{children}</View>
            {footer ? (
              <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                {footer}
              </View>
            ) : null}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.background.overlay,
    justifyContent: 'flex-end',
  },
  keyboard: { width: '100%' },
  sheet: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: BORDERS.radius.modal.lg,
    borderTopRightRadius: BORDERS.radius.modal.lg,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.container.horizontal,
    maxHeight: '90%',
    ...SHADOWS.modal,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.gray[300],
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  body: { paddingBottom: SPACING.md },
  footer: { paddingTop: SPACING.sm },
});

export default BottomSheet;
