import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MessageCircle, ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../base/Button/Button';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';

const StickyFooter = ({ onChatPress, onQuotePress }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.chatButton} onPress={onChatPress} activeOpacity={0.85}>
          <MessageCircle size={22} color={COLORS.icon.active} />
          <Text style={styles.chatText}>Chat</Text>
        </TouchableOpacity>

        <Button
          title="Cotizar Servicio"
          onPress={onQuotePress}
          style={styles.quoteButton}
          iconNode={<ArrowRight size={20} color={COLORS.text.onPrimary} />}
          iconPosition="right"
        />
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
  },
});

export default StickyFooter;
