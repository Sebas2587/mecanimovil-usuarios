import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS, SHADOWS } from '../../design-system/tokens';

const ProfileMenuSection = ({ title, children, style }) => {
  return (
    <View style={[styles.container, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
});

export default ProfileMenuSection;
