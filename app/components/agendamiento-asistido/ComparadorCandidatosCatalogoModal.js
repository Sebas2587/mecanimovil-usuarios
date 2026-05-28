import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Trophy, MapPin, Star, Sparkles, DollarSign, Wrench } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import { getHealthColor } from '../../utils/healthFormat';
import { formatDistance } from '../../utils/geoUtils';
import {
  CRITERIOS_CATALOGO,
  rankCandidatosCatalogo,
  getCandidatoCatalogoKey,
} from '../../utils/catalogoComparadorScoring';
import { buildProviderAvatarUri } from '../../utils/providerUtils';
import { getCoberturaMarcaBadge } from '../../utils/catalogoComparadorCobertura';
import ProveedorCoberturaMarcaChip from './ProveedorCoberturaMarcaChip';
import { Image } from 'expo-image';

function formatCLP(n) {
  return `$${Math.round(Number(n) || 0).toLocaleString('es-CL')}`;
}

const CRITERIO_ICONS = {
  MATCH_IA: Sparkles,
  CERCANIA: MapPin,
  PRECIO: DollarSign,
  RATING: Star,
  COBERTURA: Wrench,
};

function ScoreBar({ score }) {
  const color = getHealthColor(score);
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { width: `${Math.min(100, score)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.scoreVal, { color }]}>{Math.round(score)}</Text>
    </View>
  );
}

/**
 * Modal inferior: comparación de candidatos de catálogo con puntuación por criterios.
 */
export default function ComparadorCandidatosCatalogoModal({
  visible,
  onClose,
  candidatos = [],
  userCoords = null,
  requiereRepuestos = true,
  marcaVehiculoNombre = null,
  onConfirmar,
}) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();

  const ranked = useMemo(
    () => rankCandidatosCatalogo(candidatos, userCoords, requiereRepuestos),
    [candidatos, userCoords, requiereRepuestos],
  );

  const mejorKey = ranked[0] ? getCandidatoCatalogoKey(ranked[0].candidato) : null;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar comparación" />
      <View
        style={[
          styles.sheet,
          { maxHeight: winH * 0.88, paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Comparación detallada</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
            <X size={22} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          Match, distancia, precio y rating. El % puede diferir del resumen en la lista.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {ranked.map(({ candidato, total, porCriterio, distancia_km, matchDisplayPct }, index) => {
            const key = getCandidatoCatalogoKey(candidato);
            const esMejor = key === mejorKey;
            const nombre = candidato.proveedor?.nombre || candidato.nombre_proveedor || 'Proveedor';
            const avatarUri = buildProviderAvatarUri({
              ...candidato.proveedor,
              tipo_proveedor: candidato.tipo_proveedor || candidato.proveedor?.tipo,
              id: candidato.proveedor_id || candidato.proveedor?.proveedor_id,
              foto_perfil_url: candidato.foto_perfil_url || candidato.proveedor?.foto_perfil_url,
            });
            const precio =
              candidato.precio_total
              ?? candidato.precio_total_ofrecido
              ?? (requiereRepuestos ? candidato.precio_con_repuestos : candidato.precio_sin_repuestos);

            return (
              <View
                key={key}
                style={[styles.card, esMejor && styles.cardMejor]}
              >
                {esMejor ? (
                  <View style={styles.mejorBadge}>
                    <Trophy size={12} color={COLORS.text.onPrimary} />
                    <Text style={styles.mejorBadgeText}>MEJOR PARA TI</Text>
                  </View>
                ) : null}

                <View style={[styles.puntuacionBlock, esMejor && styles.puntuacionBlockMejor]}>
                  <Text style={styles.puntuacionLabel}>Puntuación</Text>
                  <Text style={[styles.puntuacionValor, { color: getHealthColor(total) }]}>
                    {Math.round(total)}
                  </Text>
                  <Text style={styles.puntuacionMax}>/100</Text>
                  <Text style={styles.matchHint}>Resumen lista: {matchDisplayPct}%</Text>
                </View>

                <View style={styles.provRow}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={styles.avatarPh} />
                  )}
                  <View style={styles.provInfo}>
                    <View style={styles.provMetaRow}>
                      <Text style={[styles.provNombre, styles.provNombreFlex]} numberOfLines={2}>
                        {nombre}
                      </Text>
                      <ProveedorCoberturaMarcaChip
                        badge={getCoberturaMarcaBadge(candidato, marcaVehiculoNombre)}
                        compact
                      />
                    </View>
                    {distancia_km != null ? (
                      <Text style={styles.distText}>
                        {formatDistance(distancia_km)} desde tu dirección
                      </Text>
                    ) : (
                      <Text style={styles.distText}>Distancia no disponible</Text>
                    )}
                  </View>
                </View>

                <Text style={styles.precio}>{formatCLP(precio)}</Text>

                <View style={styles.criterios}>
                  {Object.values(CRITERIOS_CATALOGO).map((cfg) => {
                    const Icon = CRITERIO_ICONS[cfg.key] || Sparkles;
                    const score = porCriterio[cfg.key] ?? 50;
                    return (
                      <View key={cfg.key} style={styles.criterioRow}>
                        <View style={styles.criterioLeft}>
                          <Icon size={14} color={COLORS.text.secondary} />
                          <Text style={styles.criterioLabel}>{cfg.nombre}</Text>
                        </View>
                        <ScoreBar score={score} />
                      </View>
                    );
                  })}
                </View>

                {onConfirmar ? (
                  <TouchableOpacity
                    style={[styles.confirmBtn, esMejor && styles.confirmBtnMejor]}
                    onPress={() => onConfirmar(candidato)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.confirmBtnText}>
                      {esMejor ? 'Elegir mejor opción' : 'Elegir este proveedor'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const CARD_W = 300;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background.overlay,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: BORDERS.radius.xl,
    borderTopRightRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    borderBottomWidth: 0,
    borderColor: COLORS.border.light,
    paddingTop: 8,
    ...SHADOWS.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.gray[300],
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 19,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  carousel: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 14,
  },
  card: {
    width: CARD_W,
    padding: 14,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.default,
  },
  cardMejor: {
    borderColor: COLORS.primary[400],
    borderWidth: 2,
  },
  mejorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
    marginBottom: 10,
  },
  mejorBadgeText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.onPrimary,
  },
  puntuacionBlock: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[50],
  },
  puntuacionBlockMejor: {
    backgroundColor: COLORS.primary[50],
  },
  puntuacionLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },
  puntuacionValor: {
    fontSize: 32,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  puntuacionMax: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
  },
  matchHint: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.text.tertiary,
  },
  provRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
  },
  avatarPh: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[200],
  },
  provInfo: {
    flex: 1,
    minWidth: 0,
  },
  provMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  provNombre: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  provNombreFlex: {
    flexShrink: 1,
    minWidth: 0,
  },
  distText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  precio: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  criterios: {
    gap: 8,
    marginBottom: 12,
  },
  criterioRow: {
    gap: 4,
  },
  criterioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  criterioLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.neutral.gray[200],
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreVal: {
    width: 28,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  confirmBtn: {
    paddingVertical: 12,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[800],
    alignItems: 'center',
  },
  confirmBtnMejor: {
    backgroundColor: COLORS.primary[500],
  },
  confirmBtnText: {
    color: COLORS.text.onPrimary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
