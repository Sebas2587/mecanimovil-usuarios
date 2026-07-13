import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Trophy } from 'lucide-react-native';
import { Image } from 'expo-image';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING, SHADOWS } from '../../design-system/tokens';
import { formatDistance } from '../../utils/geoUtils';
import {
  buildScoringContextFromForm,
  rankCandidatosCatalogo,
  getCandidatoCatalogoKey,
} from '../../utils/catalogoComparadorScoring';
import { RATING_NEUTRO_SIN_RESENAS } from '../../utils/catalogoComparadorMetricasModal';
import { buildProviderAvatarUri } from '../../utils/providerUtils';
import { getCoberturaMarcaBadge } from '../../utils/catalogoComparadorCobertura';
import { getMotorOfertaBadge } from '../../utils/catalogoComparadorMotor';
import ProveedorCoberturaMarcaChip from './ProveedorCoberturaMarcaChip';
import ComparadorMetricasPanel from './ComparadorMetricasPanel';

function formatCLP(n) {
  return `$${Math.round(Number(n) || 0).toLocaleString('es-CL')}`;
}

/**
 * Modal pantalla completa: comparación detallada por proveedor.
 */
export default function ComparadorCandidatosCatalogoModal({
  visible,
  onClose,
  candidatos = [],
  userCoords = null,
  requiereRepuestos = true,
  marcaVehiculoNombre = null,
  tipoMotorVehiculo = null,
  tipoProveedorPreferido = null,
  onConfirmar,
}) {
  const insets = useSafeAreaInsets();

  const scoringContext = useMemo(
    () => buildScoringContextFromForm({
      requiereRepuestos,
      marcaVehiculoNombre,
      tipoMotorVehiculo,
      tipoProveedorPreferido,
    }),
    [requiereRepuestos, marcaVehiculoNombre, tipoMotorVehiculo, tipoProveedorPreferido],
  );

  const ranked = useMemo(
    () => rankCandidatosCatalogo(candidatos, userCoords, scoringContext),
    [candidatos, userCoords, scoringContext],
  );

  const mejorKey = ranked[0] ? getCandidatoCatalogoKey(ranked[0].candidato) : null;

  if (!visible) return null;

  const bottomPad = Math.max(insets.bottom, SPACING.md) + SPACING.sm;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { paddingTop: insets.top + SPACING.xs }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Comparación detallada</Text>
            <Text style={styles.subtitle}>
              Análisis del match sin duplicar criterios · sin reseñas = {RATING_NEUTRO_SIN_RESENAS} pts
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityLabel="Cerrar comparación"
          >
            <X size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
        >
          {ranked.map(({ candidato, porCriterio, distancia_km, matchDisplayPct }, index) => {
            const key = getCandidatoCatalogoKey(candidato);
            const esMejor = key === mejorKey;
            const isLast = index === ranked.length - 1;
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
            const motorBadge = getMotorOfertaBadge(candidato, scoringContext.tipoMotorVehiculo);

            return (
              <View
                key={key}
                style={[styles.cardOuter, !isLast && styles.cardOuterSpacing]}
              >
                <View style={[styles.card, esMejor && styles.cardMejor]}>
                  {esMejor ? (
                    <View style={styles.mejorBadge}>
                      <Trophy size={12} color={COLORS.primary[700]} />
                      <Text style={styles.mejorText}>Mejor opción</Text>
                    </View>
                  ) : null}

                  <View style={styles.cardTop}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
                    ) : (
                      <View style={styles.avatarPh} />
                    )}
                    <View style={styles.cardMeta}>
                      <View style={styles.nameRow}>
                        <Text style={styles.nombre} numberOfLines={2}>
                          {nombre}
                        </Text>
                        <Text style={styles.matchPct}>{matchDisplayPct}%</Text>
                      </View>
                      <View style={styles.chipsRow}>
                        <ProveedorCoberturaMarcaChip
                          badge={getCoberturaMarcaBadge(candidato, marcaVehiculoNombre)}
                          compact
                        />
                        {motorBadge ? (
                          <Text style={styles.motorChip} numberOfLines={1}>
                            {motorBadge.label}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.metaLine} numberOfLines={1}>
                        {distancia_km != null
                          ? `${formatDistance(distancia_km)} · `
                          : ''}
                        {formatCLP(precio)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metricasBlock}>
                    <ComparadorMetricasPanel
                      candidato={candidato}
                      porCriterio={porCriterio}
                    />
                  </View>

                  {onConfirmar ? (
                    <TouchableOpacity
                      style={[styles.btn, esMejor && styles.btnMejor]}
                      onPress={() => onConfirmar(candidato)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.btnText}>
                        {esMejor ? 'Elegir mejor opción' : 'Elegir proveedor'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    paddingRight: SPACING.xs,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    lineHeight: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
  },
  cardOuter: {
    width: '100%',
  },
  cardOuterSpacing: {
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.cardPadding,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  cardMejor: {
    borderColor: COLORS.primary[200],
    backgroundColor: COLORS.primary[50],
  },
  mejorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: COLORS.background.paper,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
  },
  mejorText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[700],
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  avatarPh: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[200],
  },
  cardMeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  nombre: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  matchPct: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary[600],
    fontVariant: ['tabular-nums'],
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  motorChip: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.success[700],
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  metaLine: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  metricasBlock: {
    paddingTop: SPACING.xxs,
  },
  btn: {
    marginTop: SPACING.xxs,
    paddingVertical: 12,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[800],
    alignItems: 'center',
  },
  btnMejor: {
    backgroundColor: COLORS.primary[500],
  },
  btnText: {
    color: COLORS.text.onPrimary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
