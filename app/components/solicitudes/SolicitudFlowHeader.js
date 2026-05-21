import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS, BORDERS, SHADOWS } from '../../design-system/tokens';

/**
 * Header institucional (Coinbase-light) para pantallas del flujo Nueva Solicitud.
 */
export default function SolicitudFlowHeader({
  title,
  subtitle,
  icon: Icon,
  onBack,
}) {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.paper} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ArrowLeft size={22} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {Icon ? <Icon size={16} color={COLORS.primary[500]} /> : null}
          <View style={styles.titleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.headerSub} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  titleWrap: {
    flexShrink: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
});
