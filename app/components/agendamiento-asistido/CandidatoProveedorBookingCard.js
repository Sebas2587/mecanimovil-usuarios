import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Star,
  Wrench,
  Package,
  MapPin,
  Car,
  Store,
  User,
  Fuel,
} from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS, SPACING } from '../../design-system/tokens';
import { buildProviderAvatarUri } from '../../utils/providerUtils';
import { formatDistance } from '../../utils/geoUtils';
import {
  calcularDesgloseIvaOferta,
  resolverDesgloseIvaMostrado,
} from '../../utils/ofertaPrecioDesglose';
import MatchPercentRing from './MatchPercentRing';
import ProveedorCoberturaMarcaChip from './ProveedorCoberturaMarcaChip';
import {
  etiquetaSolicitudRepuestos,
  etiquetaCatalogoSinRepuestos,
  resolveModoPrecioCandidato,
  solicitudRequiereRepuestos,
} from '../../utils/catalogoComparadorRepuestos';
import RepuestosExpandible from '../ofertas/RepuestosExpandible';
import {
  resolveLineasServicioConRepuestos,
  lineasTienenRepuestos,
} from '../../utils/ofertaRepuestos';

function formatCLP(n) {
  const v = Math.round(Number(n) || 0);
  return `$${v.toLocaleString('es-CL')}`;
}

function CardDivider() {
  return <View style={styles.divider} />;
}

/** Oculta frases de distancia del backend (ya se muestran con MapPin en cabecera). */
function sanitizeExplicacionCandidato(text) {
  if (!text) return null;
  let t = String(text).trim();
  t = t.replace(/muy cerca de ti\s*\([^)]*\)/gi, '');
  t = t.replace(/muy cerca de ti/gi, '');
  t = t.replace(/a\s*~?\d+(?:[.,]\d+)?\s*km\s+de\s+tu\s+ubicaci[oó]n/gi, '');
  t = t.replace(/a\s+\d+(?:[.,]\d+)?\s*km\s+de\s+tu\s+ubicaci[oó]n/gi, '');
  t = t.replace(/\s*·\s*·+/g, ' · ').replace(/^\s*·\s*|\s*·\s*$/g, '').trim();
  if (!t || t.length < 4) return null;
  return t;
}

const AVATAR_SIZE = 64;
const MATCH_RING_SIZE = 64;

/**
 * Card estilo booking (Coinbase-light + layout referencia Airbnb):
 * anillo match, cabecera proveedor, servicio, distancia, precio y CTA.
 */
export default function CandidatoProveedorBookingCard({
  candidato,
  variant = 'recomendado',
  requiereRepuestos = true,
  onConfirmar,
  procesando = false,
  confirmandoEsta = false,
  selectable = false,
  selected = false,
  onToggleSelect,
  matchDisplayPct = null,
  coberturaMarcaBadge = null,
  motorOfertaBadge = null,
}) {
  const solicitudConRepuestos = solicitudRequiereRepuestos(requiereRepuestos);
  const modoPrecio = candidato
    ? resolveModoPrecioCandidato(candidato, solicitudConRepuestos)
    : 'solo_mano_obra';
  const precioUsaRepuestos = modoPrecio === 'con_repuestos';

  const serviciosOfrecidos = useMemo(() => {
    if (Array.isArray(candidato?.servicios_ofrecidos) && candidato.servicios_ofrecidos.length) {
      return candidato.servicios_ofrecidos;
    }
    if (candidato?.servicio?.nombre) {
      return [{
        id: candidato.servicio.id,
        nombre: candidato.servicio.nombre,
        precio: precioUsaRepuestos
          ? candidato?.precio_con_repuestos
          : candidato?.precio_sin_repuestos,
        oferta_servicio_id: candidato?.oferta_servicio_id,
      }];
    }
    return [];
  }, [candidato, precioUsaRepuestos]);

  const desglose = useMemo(() => {
    const d = candidato?.desglose || {};
    const total = candidato?.precio_total
      ?? (precioUsaRepuestos
        ? candidato?.precio_con_repuestos
        : candidato?.precio_sin_repuestos);
    const calc = calcularDesgloseIvaOferta({
      costoManoObra: d.mano_obra,
      costoRepuestos: d.repuestos,
      costoGestionCompra: d.gestion,
      precioTotalOfrecido: total ?? d.precio_publicado_cliente,
    });
    return resolverDesgloseIvaMostrado(null, calc);
  }, [candidato, precioUsaRepuestos]);

  const lineasConRepuestos = useMemo(
    () => resolveLineasServicioConRepuestos(candidato),
    [candidato],
  );
  const mostrarListaRepuestos = solicitudConRepuestos
    && precioUsaRepuestos
    && lineasTienenRepuestos(lineasConRepuestos);

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

  const repuestosSolicitudLabel = etiquetaSolicitudRepuestos(solicitudConRepuestos);
  const catalogoSinRepuestosLabel = etiquetaCatalogoSinRepuestos(
    solicitudConRepuestos,
    candidato,
  );

  const nombre = candidato.proveedor?.nombre || 'Proveedor';
  const aDomicilio = Boolean(
    candidato.a_domicilio
    || candidato.tipo_proveedor === 'mecanico'
    || candidato.proveedor?.tipo === 'mecanico',
  );
  const tipoLabel = aDomicilio ? 'A domicilio' : 'En taller';
  const TipoIcon = aDomicilio ? Car : Store;
  const rating = candidato.proveedor?.rating;
  const distKm = candidato.distancia_km;
  const matchPct = matchDisplayPct != null
    ? matchDisplayPct
    : (candidato.score_match != null
      ? Math.round(Number(candidato.score_match) * 100)
      : null);
  const servicioPrincipal = serviciosOfrecidos[0]?.nombre || candidato.servicio?.nombre;
  const multiServicio = serviciosOfrecidos.length > 1;
  const coberturaParcial = candidato.servicios_pedidos != null
    && candidato.servicios_cubiertos != null
    && candidato.servicios_cubiertos < candidato.servicios_pedidos;
  const esExacta =
    variant === 'recomendado'
    || candidato.es_coincidencia_exacta
    || candidato.es_recomendado
    || candidato.nivel_coincidencia === 'exacta';

  const btnDisabled = procesando;
  const btnLoading = confirmandoEsta && procesando;
  const d = candidato.desglose || {};
  const tieneDesgloseLineas = (d.mano_obra > 0 || d.repuestos > 0 || d.gestion > 0);
  const explicacionVisible = sanitizeExplicacionCandidato(candidato.explicacion);
  const distanciaLabel = distKm != null
    ? formatDistance(distKm)
    : null;

  const cardStyle = [styles.card, selectable && selected && styles.cardSelected];

  const contenidoSeleccionable = (
    <>
      {selectable ? (
        <Text style={styles.compareTitle}>Compara esta oferta</Text>
      ) : null}

      {/* Cabecera: avatar | meta proveedor | match */}
      <View style={styles.headerRow}>
        <View style={styles.avatarColumn}>
          {activeUri ? (
            <Image
              source={{ uri: activeUri }}
              style={styles.thumb}
              contentFit="cover"
              transition={120}
              onError={onImageError}
            />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <User size={28} color={COLORS.text.tertiary} />
            </View>
          )}
        </View>

        <View style={styles.providerMeta}>
          <View style={styles.tipoCoberturaRow}>
            {coberturaMarcaBadge ? (
              <ProveedorCoberturaMarcaChip badge={coberturaMarcaBadge} compact />
            ) : null}
            <View style={styles.tipoBadge}>
              <TipoIcon size={12} color={COLORS.text.tertiary} />
              <Text style={styles.tipoLabel}>{tipoLabel}</Text>
            </View>
          </View>
          <Text style={styles.proveedorNombre} numberOfLines={2}>
            {nombre}
          </Text>
          <View style={styles.metaChipsRow}>
            <View
              style={[
                styles.repuestosBadge,
                solicitudConRepuestos ? styles.repuestosBadgeSolicitudCon : styles.repuestosBadgeSolicitudSin,
              ]}
            >
              <Package
                size={10}
                color={solicitudConRepuestos ? COLORS.primary[600] : COLORS.text.secondary}
              />
              <Text
                style={[
                  styles.repuestosBadgeText,
                  solicitudConRepuestos ? styles.repuestosCon : styles.repuestosSin,
                ]}
              >
                {repuestosSolicitudLabel}
              </Text>
            </View>
            {catalogoSinRepuestosLabel ? (
              <View style={styles.catalogoSinRepBadge}>
                <Text style={styles.catalogoSinRepText} numberOfLines={1}>
                  {catalogoSinRepuestosLabel}
                </Text>
              </View>
            ) : null}
            {motorOfertaBadge ? (
              <View
                style={[
                  styles.motorBadge,
                  motorOfertaBadge.tone === 'exacta' && styles.motorBadgeExacta,
                ]}
              >
                <Fuel
                  size={10}
                  color={
                    motorOfertaBadge.tone === 'exacta'
                      ? COLORS.success[700]
                      : COLORS.text.secondary
                  }
                />
                <Text
                  style={[
                    styles.motorBadgeText,
                    motorOfertaBadge.tone === 'exacta' && styles.motorBadgeTextExacta,
                  ]}
                  numberOfLines={1}
                >
                  {motorOfertaBadge.label}
                </Text>
              </View>
            ) : null}
            {rating != null && Number(rating) > 0 ? (
              <View style={styles.ratingRow}>
                <Star size={12} color={COLORS.warning.main} fill={COLORS.warning.main} />
                <Text style={styles.ratingText}>{Number(rating).toFixed(1)}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.distanciaBlock}>
            <MapPin size={12} color={COLORS.primary[500]} style={styles.distanciaPin} />
            {distanciaLabel != null ? (
              <Text style={styles.distanciaText}>
                <Text style={styles.distanciaKm}>{distanciaLabel}</Text>
                <Text style={styles.distanciaCaption}> desde tu dirección</Text>
              </Text>
            ) : (
              <Text style={styles.distanciaUnavailable}>Distancia no disponible</Text>
            )}
          </View>
        </View>

        <View style={styles.matchColumn}>
          <MatchPercentRing
            percent={matchPct ?? 0}
            label={esExacta ? 'Match' : 'Parcial'}
            esExacta={esExacta}
            size={MATCH_RING_SIZE}
          />
        </View>
      </View>

      <CardDivider />

      {/* Servicio destacado */}
      {servicioPrincipal ? (
        <View style={styles.servicioBlock}>
          <View style={styles.servicioRow}>
            <Wrench size={16} color={COLORS.primary[500]} />
            <Text style={styles.servicioNombre} numberOfLines={2}>
              {servicioPrincipal}
            </Text>
          </View>
          {multiServicio ? (
            <View style={styles.serviciosExtra}>
              {serviciosOfrecidos.slice(1).map((s) => (
                <View key={`${s.id}-${s.oferta_servicio_id}`} style={styles.servicioExtraRow}>
                  <Text style={styles.servicioExtraNombre} numberOfLines={1}>
                    {s.nombre || 'Servicio'}
                  </Text>
                  <Text style={styles.servicioExtraPrecio}>{formatCLP(s.precio)}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {coberturaParcial ? (
            <Text style={styles.coberturaText}>
              Cubre {candidato.servicios_cubiertos}/{candidato.servicios_pedidos} servicios
            </Text>
          ) : null}
        </View>
      ) : null}

      <CardDivider />

      {/* Detalle de precio (estilo “Price details”) */}
      <View style={styles.priceSection}>
        <Text style={styles.priceSectionTitle}>Detalle del precio</Text>
        {tieneDesgloseLineas ? (
          <>
            {d.mano_obra > 0 ? (
              <View style={styles.priceLine}>
                <Text style={styles.priceLineLabel}>Mano de obra</Text>
                <Text style={styles.priceLineValue}>{formatCLP(d.mano_obra)}</Text>
              </View>
            ) : null}
            {precioUsaRepuestos && d.repuestos > 0 ? (
              <View style={styles.priceLine}>
                <Text style={styles.priceLineLabel}>Repuestos</Text>
                <Text style={styles.priceLineValue}>{formatCLP(d.repuestos)}</Text>
              </View>
            ) : null}
            {precioUsaRepuestos && d.gestion > 0 ? (
              <View style={styles.priceLine}>
                <Text style={styles.priceLineLabel}>Gestión de compra</Text>
                <Text style={styles.priceLineValue}>{formatCLP(d.gestion)}</Text>
              </View>
            ) : null}
            {mostrarListaRepuestos ? (
              <View style={styles.repuestosDetalleBlock}>
                {lineasConRepuestos.map((linea) => (
                  linea.repuestos_info?.length > 0 ? (
                    <RepuestosExpandible
                      key={String(linea.id ?? linea.nombre)}
                      repuestos={linea.repuestos_info}
                      servicioNombre={
                        lineasConRepuestos.length > 1 ? linea.nombre : null
                      }
                    />
                  ) : null
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.priceLine}>
            <Text style={styles.priceLineLabel}>Precio publicado</Text>
            <Text style={styles.priceLineValue}>{formatCLP(desglose.total)}</Text>
          </View>
        )}
        <CardDivider />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total estimado</Text>
          <Text style={styles.totalValue}>{formatCLP(desglose.total)}</Text>
        </View>
      </View>

      {explicacionVisible ? (
        <Text style={styles.explicacion} numberOfLines={3}>
          {explicacionVisible}
        </Text>
      ) : null}
    </>
  );

  return (
    <View style={cardStyle}>
      {selectable ? (
        <TouchableOpacity
          style={styles.selectableBody}
          onPress={onToggleSelect}
          activeOpacity={0.92}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={
            selected
              ? 'Oferta seleccionada para comparar'
              : 'Compara esta oferta, toca para seleccionar'
          }
        >
          {contenidoSeleccionable}
        </TouchableOpacity>
      ) : (
        contenidoSeleccionable
      )}

      <TouchableOpacity
        style={[
          styles.confirmBtn,
          selectable && styles.confirmBtnSpaced,
          btnDisabled && styles.confirmBtnDisabled,
        ]}
        onPress={onConfirmar}
        disabled={btnDisabled}
        activeOpacity={0.85}
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
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    padding: 16,
    ...SHADOWS.sm,
  },
  cardSelected: {
    borderColor: COLORS.primary[400],
    borderWidth: 2,
    backgroundColor: COLORS.primary[50],
  },
  compareTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[700],
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  selectableBody: {
    marginHorizontal: -4,
    marginTop: -4,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  confirmBtnSpaced: {
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  avatarColumn: {
    width: AVATAR_SIZE,
    flexShrink: 0,
  },
  distanciaBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xxs,
    marginTop: 2,
  },
  distanciaPin: {
    flexShrink: 0,
  },
  distanciaText: {
    flex: 1,
    flexShrink: 1,
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: 16,
  },
  distanciaKm: {
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary[700],
    fontVariant: ['tabular-nums'],
  },
  distanciaCaption: {
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.primary[600],
  },
  distanciaUnavailable: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
    lineHeight: 16,
  },
  providerMeta: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xxs,
    paddingTop: 2,
  },
  metaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'flex-start',
    gap: 6,
  },
  matchColumn: {
    width: MATCH_RING_SIZE,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  thumb: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  thumbPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipoCoberturaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  tipoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  tipoLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  proveedorNombre: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    lineHeight: 26,
  },
  repuestosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
  },
  ratingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  repuestosBadgeText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    lineHeight: 13,
  },
  repuestosCon: {
    color: COLORS.primary[700],
  },
  repuestosSin: {
    color: COLORS.text.secondary,
  },
  repuestosBadgeSolicitudCon: {
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[200],
  },
  repuestosBadgeSolicitudSin: {
    backgroundColor: COLORS.neutral.gray[100],
    borderColor: COLORS.border.light,
  },
  catalogoSinRepBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.warning[50],
    borderWidth: 1,
    borderColor: COLORS.warning[200],
    flexShrink: 0,
  },
  catalogoSinRepText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.warning[800],
  },
  motorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: 1,
    borderColor: COLORS.border.light,
    flexShrink: 0,
  },
  motorBadgeExacta: {
    backgroundColor: COLORS.success[50],
    borderColor: COLORS.success[200],
  },
  motorBadgeText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  motorBadgeTextExacta: {
    color: COLORS.success[800],
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: 14,
  },
  servicioBlock: {
    gap: 8,
  },
  servicioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  servicioNombre: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  serviciosExtra: {
    marginLeft: 26,
    gap: 6,
  },
  servicioExtraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  servicioExtraNombre: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  servicioExtraPrecio: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  coberturaText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.warning[800],
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginLeft: 26,
  },
  priceSection: {
    gap: 10,
  },
  priceSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  priceLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  priceLineLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  repuestosDetalleBlock: {
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  priceLineValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    fontVariant: ['tabular-nums'],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  totalValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    fontVariant: ['tabular-nums'],
  },
  explicacion: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginTop: 12,
    lineHeight: 17,
  },
  confirmBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    minHeight: 48,
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
