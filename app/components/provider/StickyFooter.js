import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';

const StickyFooter = ({ onChatPress, onQuotePress }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.chatButton} onPress={onChatPress} activeOpacity={0.85}>
          <Ionicons name="chatbubble-outline" size={22} color={COLORS.primary[500]} />
          <Text style={styles.chatText}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quoteButton} onPress={onQuotePress} activeOpacity={0.85}>
          <Text style={styles.quoteText}>Cotizar Servicio</Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color={COLORS.text.inverse}
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    paddingTop: 16,
    paddingHorizontal: SPACING.container.horizontal,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BORDERS.radius.button?.md ?? BORDERS.radius.full,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.neutral.gray[100],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatText: {
    marginLeft: 8,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  quoteButton: {
    flex: 1,
    backgroundColor: COLORS.primary[500],
    borderRadius: BORDERS.radius.button?.md ?? BORDERS.radius.full,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteText: {
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
});

export default StickyFooter;
