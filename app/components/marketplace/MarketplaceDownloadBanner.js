import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAppStoreUrl, getPlayStoreUrl } from '../../config/publicListing';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';

/**
 * CTA para instalar la app (web o visitante sin sesión en ficha pública).
 */
const MarketplaceDownloadBanner = ({ style, compact = false, forPublicProfile = false }) => {
  const open = (url) => {
    Linking.openURL(url).catch(() => {});
  };

  const appStore = getAppStoreUrl();
  const playStore = getPlayStoreUrl();

  return (
    <View
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        forPublicProfile && styles.wrapPublicProfile,
        style,
      ]}
    >
      <View style={styles.titleRow}>
        <Ionicons name="phone-portrait-outline" size={20} color={COLORS.primary[500]} />
        <Text style={styles.title}>Consigue MecaniMóvil</Text>
      </View>
      <Text style={styles.sub}>
        {forPublicProfile
          ? 'Descarga la app para solicitar servicios, chatear con el especialista y agendar.'
          : Platform.OS === 'web'
          ? 'Oferta, chatea y cierra la compra con más funciones en la app.'
          : 'Para ofertar y negociar, usa la app MecaniMóvil.'}
      </Text>
      <View style={[styles.row, forPublicProfile && styles.rowPublicProfile]}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, forPublicProfile && styles.btnPublicProfile]}
          onPress={() => open(appStore)}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-apple" size={18} color={COLORS.text.inverse} />
          <Text style={styles.btnTextPrimary}>App Store</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary, forPublicProfile && styles.btnPublicProfile]}
          onPress={() => open(playStore)}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-google-playstore" size={18} color={COLORS.text.primary} />
          <Text style={styles.btnTextSecondary}>Google Play</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  wrapCompact: {
    marginHorizontal: 0,
    marginBottom: 12,
    padding: 12,
  },
  wrapPublicProfile: {
    marginHorizontal: 0,
    marginBottom: 0,
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  rowPublicProfile: {
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  btnPublicProfile: {
    flex: 1,
    minWidth: 142,
    maxWidth: Platform.OS === 'web' ? 220 : 200,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  sub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BORDERS.radius.full,
    minWidth: 130,
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: COLORS.primary[500],
  },
  btnSecondary: {
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  btnTextPrimary: {
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  btnTextSecondary: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

export default MarketplaceDownloadBanner;
