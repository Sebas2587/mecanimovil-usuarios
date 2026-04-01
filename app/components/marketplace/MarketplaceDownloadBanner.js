import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAppStoreUrl, getPlayStoreUrl } from '../../config/publicListing';

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
        <Ionicons name="phone-portrait-outline" size={20} color="#93C5FD" />
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
          style={[styles.btn, styles.btnApple, forPublicProfile && styles.btnPublicProfile]}
          onPress={() => open(appStore)}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-apple" size={18} color="#fff" />
          <Text style={styles.btnText}>App Store</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnPlay, forPublicProfile && styles.btnPublicProfile]}
          onPress={() => open(playStore)}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-google-playstore" size={18} color="#fff" />
          <Text style={styles.btnText}>Google Play</Text>
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
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.25)',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  sub: {
    fontSize: 13,
    color: 'rgba(249,250,251,0.72)',
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
    borderRadius: 12,
    minWidth: 130,
    justifyContent: 'center',
  },
  btnApple: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  btnPlay: {
    backgroundColor: 'rgba(16,185,129,0.35)',
  },
  btnText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MarketplaceDownloadBanner;
