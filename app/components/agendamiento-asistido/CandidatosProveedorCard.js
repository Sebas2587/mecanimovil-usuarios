import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { MapPin, Star, Wrench, Package, User } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import { buildProviderAvatarUri } from '../../utils/providerUtils';
import { formatDistance } from '../../utils/geoUtils';
import {
  calcularDesgloseIvaOferta,
  resolverDesgloseIvaMostrado,
} from '../../utils/ofertaPrecioDesglose';

function formatCLP(n) {
  const v = Math.round(Number(n) || 0);
  return `$${v.toLocaleString('es-CL')}`;
}

/**
 * Card de proveedor en comparador catálogo (Coinbase-light).
 */
export default function CandidatosProveedorCard({
  candidato,
  variant = 'recomendado',
  requiereRepuestos = true,
  onConfirmar,
  procesando = false,
  confirmandoEsta = false,
}) {
  const desglose = useMemo(() => {
    const d = candidato?.desglose || {};
    const total = requiereRepuestos
      ? candidato?.precio_con_repuestos
      : candidato?.precio_sin_repuestos;
    const calc = calcularDesgloseIvaOferta({
      costoManoObra: d.mano_obra,
      costoRepuestos: d.repuestos,
      costoGestionCompra: d.gestion,
      precioTotalOfrecido: total ?? d.precio_publicado_cliente,
    });
    return resolverDesgloseIvaMostrado(null, calc);
  }, [candidato, requiereRepuestos]);

  const providerForAvatar = useMemo(() => {
    const p = candidato?.proveedor || {};
    const foto =
      p.foto_perfil_url || p.foto_perfil
      || candidato?.foto_perfil_url || candidato?.proveedor_foto_url;
    return {
      ...p,
      foto_perfil_url: foto,
      foto_perfil: p.foto_perfil || candidato?.foto_perfil || foto,
      tipo_proveedor: p.tipo || candidato?.tipo_proveedor || (candidato?.a_domicilio ? 'mecanico' : 'taller'),
      id: p.proveedor_id || candidato?.proveedor_id,
    };
  }, [candidato]);

  const avatarUris = useMemo(() => {
    const uri = buildProviderAvatarUri(providerForAvatar);
    return uri ? [uri] : [];
  }, [providerForAvatar]);

  const [uriIndex, setUriIndex] = useState(0);
  useEffect(() => {
    setUriIndex(0);
  }, [avatarUris.join('|')]);

  const activeUri = avatarUris[uriIndex] || null;
  const onImageError = useCallback(() => {
    setUriIndex((i) => (i + 1 < avatarUris.length ? i + 1 : i));
  }, [avatarUris.length]);

  if (!candidato) return null;

  const nombre = candidato.proveedor?.nombre || 'Proveedor';
  const tipo = candidato.a_domicilio ? 'A domicilio' : 'En taller';
  const rating = candidato.proveedor?.rating;
  const distKm = candidato.distancia_km;
  const matchPct =
    candidato.score_match != null ? Math.round(Number(candidato.score_match) * 100) : null;
  const servicioNombre = candidato.servicio?.nombre;
  const esExacta =
    variant === 'recomendado'
    || candidato.es_coincidencia_exacta
    || candidato.es_recomendado
    || candidato.nivel_coincidencia === 'exacta';

  const btnDisabled = procesando;
  const btnLoading = confirmandoEsta && procesando;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.avatarWrap}>
          {activeUri ? (
            <Image
              source={{ uri: activeUri }}
              style={styles.avatar}
              contentFit="cover"
              transition={120}
              onError={onImageError}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={28} color={COLORS.text.tertiary} />
            </View>
          )}
        </View>

        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.nombre} numberOfLines={2}>
              {nombre}
            </Text>
            {matchPct != null ? (
              <View style={[styles.matchPill, !esExacta && styles.matchPillParcial]}>
                <Text style={[styles.matchPillText, !esExacta && styles.matchPillTextParcial]}>
                  {matchPct}% {esExacta ? 'match' : 'parcial'}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.repuestosBadge}>
            <Package size={12} color={requiereRepuestos ? COLORS.primary[600] : COLORS.text.secondary} />
            <Text
              style={[
                styles.repuestosBadgeText,
                requiereRepuestos ? styles.repuestosCon : styles.repuestosSin,
              ]}
            >
              {requiereRepuestos ? 'Con repuestos' : 'Sin repuestos (solo MO)'}
            </Text>
          </View>
        </View>
      </View>

      {servicioNombre ? (
        <View style={styles.metaRow}>
          <Wrench size={13} color={COLORS.text.tertiary} />
          <Text style={styles.meta} numberOfLines={2}>
            {servicioNombre}
          </Text>
        </View>
      ) : null}

      <View style={styles.distanciaRow}>
        <MapPin size={14} color={COLORS.primary[500]} />
        <Text style={styles.distanciaText}>
          {distKm != null
            ? `${formatDistance(distKm)} desde tu dirección`
            : 'Distancia no disponible'}
        </Text>
      </View>

      <Text style={styles.tipoText}>{tipo}</Text>

      {rating != null && Number(rating) > 0 ? (
        <View style={styles.metaRow}>
          <Star size={13} color={COLORS.warning.main} fill={COLORS.warning.main} />
          <Text style={styles.meta}>{Number(rating).toFixed(1)}</Text>
        </View>
      ) : null}

      <View style={styles.precioBlock}>
        <Text style={styles.precio}>{formatCLP(desglose.total)}</Text>
        <Text style={styles.precioHint}>
          Precio estimado según tu elección · IVA incluido
        </Text>
      </View>

      {candidato.explicacion ? (
        <Text style={styles.explicacion} numberOfLines={3}>
          {candidato.explicacion}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[styles.confirmBtn, btnDisabled && styles.confirmBtnDisabled]}
        onPress={onConfirmar}
        disabled={btnDisabled}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Confirmar con este proveedor"
      >
        {btnLoading ? (
          <ActivityIndicator color={COLORS.text.onPrimary} size="small" />
        ) : (
          <Text style={styles.confirmBtnText}>Confirmar con este proveedor</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    ...SHADOWS.sm,
  },
  topRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  nombre: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  matchPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.primary[100],
  },
  matchPillText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[700],
    fontVariant: ['tabular-nums'],
  },
  matchPillParcial: {
    backgroundColor: COLORS.neutral.gray[100],
  },
  matchPillTextParcial: {
    color: COLORS.text.secondary,
  },
  repuestosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  repuestosBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  repuestosCon: {
    color: COLORS.primary[700],
  },
  repuestosSin: {
    color: COLORS.text.secondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  meta: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  distanciaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  distanciaText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[700],
    fontVariant: ['tabular-nums'],
  },
  tipoText: {
    marginTop: 4,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
  },
  precioBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  precio: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    fontVariant: ['tabular-nums'],
  },
  precioHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  explicacion: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginTop: 8,
    lineHeight: 17,
  },
  confirmBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[500],
    borderWidth: 1,
    borderColor: COLORS.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...SHADOWS.md,
  },
  confirmBtnDisabled: {
    opacity: 0.55,
  },
  confirmBtnText: {
    color: COLORS.text.onPrimary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
