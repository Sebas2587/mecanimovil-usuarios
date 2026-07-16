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
  Package,
  MapPin,
  Car,
  Store,
  User,
  Fuel,
} from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS, SPACING } from '../../design-system/tokens';
import PrimaryGradientFill from '../base/PrimaryGradientFill/PrimaryGradientFill';
import { buildProviderAvatarUri } from '../../utils/providerUtils';
import { formatDistance } from '../../utils/geoUtils';
import {
  calcularDesgloseIvaOferta,
  resolverDesgloseIvaMostrado,
} from '../../utils/ofertaPrecioDesglose';
import MatchPercentRing from './MatchPercentRing';
import ProveedorCoberturaMarcaChip from './ProveedorCoberturaMarcaChip';
import {
  buildDesgloseCatalogoCandidato,
  buildExplicacionCandidatoContextual,
  candidatoBadgeIncluyeRepuestos,
  etiquetaBadgeRepuestosCatalogo,
  etiquetaCatalogoRepuestos,
  etiquetaModoPrecioServicio,
  resolvePrecioTotalCandidato,
  servicioOfreceRepuestosEnCatalogo,
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

/** Fallback: limpia frases genéricas del backend si no hay texto contextual. */
function sanitizeExplicacionCandidato(text) {
  if (!text) return null;
  let t = String(text).trim();
  t = t.replace(/muy cerca de ti\s*\([^)]*\)/gi, '');
  t = t.replace(/muy cerca de ti/gi, '');
  t = t.replace(/cercano a tu direcci[oó]n/gi, '');
  t = t.replace(/a\s*~?\d+(?:[.,]\d+)?\s*km\s+de\s+tu\s+ubicaci[oó]n/gi, '');
  t = t.replace(/a\s+\d+(?:[.,]\d+)?\s*km\s+de\s+tu\s+ubicaci[oó]n/gi, '');
  t = t.replace(/incluye repuestos en cat[aá]logo/gi, '');
  t = t.replace(/solo mano de obra(?:\s+en cat[aá]logo)?/gi, '');
  t = t.replace(/\s*·\s*·+/g, ' · ').replace(/^\s*·\s*|\s*·\s*$/g, '').trim();
  if (!t || t.length < 4) return null;
  return t;
}

/** Ubicación / modalidad según distancia real y tipo de atención. */
function buildLocationLabelCandidato(distKm, aDomicilio) {
  if (distKm != null && Number.isFinite(Number(distKm))) {
    const km = Number(distKm);
    if (km <= 1.5) {
      return aDomicilio
        ? 'Cercano a tu dirección · a domicilio'
        : 'Cercano a tu dirección';
    }
    const dist = formatDistance(km);
    return aDomicilio
      ? `A domicilio · ${dist} de tu dirección`
      : `${dist} de tu dirección`;
  }
  if (aDomicilio) return 'Atiende a domicilio en tu zona';
  return 'Según tu dirección seleccionada';
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

  const serviciosOfrecidos = useMemo(() => {
    if (Array.isArray(candidato?.servicios_ofrecidos) && candidato.servicios_ofrecidos.length) {
      return candidato.servicios_ofrecidos;
    }
    if (candidato?.servicio?.nombre) {
      return [{
        id: candidato.servicio.id,
        nombre: candidato.servicio.nombre,
        precio: resolvePrecioTotalCandidato(candidato),
        oferta_servicio_id: candidato?.oferta_servicio_id,
      }];
    }
    return [];
  }, [candidato]);

  const desglose = useMemo(() => {
    const d = buildDesgloseCatalogoCandidato(candidato);
    const total = resolvePrecioTotalCandidato(candidato);
    const calc = calcularDesgloseIvaOferta({
      costoManoObra: d.mano_obra,
      costoRepuestos: d.repuestos,
      costoGestionCompra: d.gestion,
      precioTotalOfrecido: total,
    });
    return resolverDesgloseIvaMostrado(null, calc);
  }, [candidato]);

  const desgloseLineas = useMemo(
    () => buildDesgloseCatalogoCandidato(candidato),
    [candidato],
  );
  const mostrarLineasRepuestos = (desgloseLineas.repuestos > 0 || desgloseLineas.gestion > 0);

  const lineasConRepuestos = useMemo(
    () => resolveLineasServicioConRepuestos(candidato),
    [candidato],
  );
  const mostrarListaRepuestos = mostrarLineasRepuestos
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

  const repuestosCatalogoLabel = etiquetaBadgeRepuestosCatalogo(candidato);
  const badgeIncluyeRepuestos = candidatoBadgeIncluyeRepuestos(candidato);
  const desajusteSolicitudLabel = etiquetaCatalogoRepuestos(
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
  const d = desgloseLineas;
  const tieneDesgloseLineas = (d.mano_obra > 0 || d.repuestos > 0 || d.gestion > 0);
  const unServicio = serviciosOfrecidos.length === 1;
  const mostrarBadgeRepuestosHeader = Boolean(repuestosCatalogoLabel && !unServicio);
  const totalRepuestosItems = lineasConRepuestos.reduce(
    (acc, linea) => acc + (linea.repuestos_info?.length || 0),
    0,
  );
  const explicacionVisible = buildExplicacionCandidatoContextual({
    locationLabel: buildLocationLabelCandidato(distKm, aDomicilio),
    aDomicilio,
    solicitudConRepuestos,
    candidato,
  }) || sanitizeExplicacionCandidato(candidato.explicacion);
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
            {mostrarBadgeRepuestosHeader ? (
              <View
                style={[
                  styles.repuestosBadge,
                  badgeIncluyeRepuestos
                    ? styles.repuestosBadgeSolicitudCon
                    : styles.repuestosBadgeSolicitudSin,
                ]}
              >
                <Package
                  size={10}
                  color={
                    badgeIncluyeRepuestos
                      ? COLORS.selection.icon
                      : COLORS.text.secondary
                  }
                />
                <Text
                  style={[
                    styles.repuestosBadgeText,
                    badgeIncluyeRepuestos ? styles.repuestosCon : styles.repuestosSin,
                  ]}
                >
                  {repuestosCatalogoLabel}
                </Text>
              </View>
            ) : null}
            {desajusteSolicitudLabel ? (
              <View style={styles.catalogoSinRepBadge}>
                <Text style={styles.catalogoSinRepText} numberOfLines={1}>
                  {desajusteSolicitudLabel}
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
            <MapPin size={12} color={COLORS.icon.active} style={styles.distanciaPin} />
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

      {/* Servicios + desglose unificado (estilo checkout Coinbase) */}
      <View style={styles.pricePanel}>
        {serviciosOfrecidos.length > 0 ? (
          <View style={styles.priceServiciosBlock}>
            {serviciosOfrecidos.map((s) => {
              const modoLabel = etiquetaModoPrecioServicio(s);
              const esDestacado = unServicio;
              const svcConRepuestos = servicioOfreceRepuestosEnCatalogo(s);
              return (
                <View
                  key={`${s.id}-${s.oferta_servicio_id}`}
                  style={styles.priceServicioRow}
                >
                  <View style={styles.servicioTextCol}>
                    {modoLabel ? (
                      <View
                        style={[
                          styles.servicioModoChip,
                          svcConRepuestos
                            ? styles.servicioModoChipCon
                            : styles.servicioModoChipSin,
                        ]}
                      >
                        <Text
                          style={[
                            styles.servicioModoChipText,
                            svcConRepuestos ? styles.servicioModoChipTextCon : null,
                          ]}
                        >
                          {modoLabel}
                        </Text>
                      </View>
                    ) : null}
                    <Text
                      style={[
                        styles.servicioNombre,
                        esDestacado && styles.servicioNombreDestacado,
                      ]}
                      numberOfLines={2}
                    >
                      {s.nombre || 'Servicio'}
                    </Text>
                  </View>
                  {!unServicio && Number(s.precio) > 0 ? (
                    <Text style={styles.servicioPrecioMulti}>{formatCLP(s.precio)}</Text>
                  ) : null}
                </View>
              );
            })}
            {coberturaParcial ? (
              <Text style={styles.coberturaText}>
                Cubre {candidato.servicios_cubiertos}/{candidato.servicios_pedidos} servicios
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.priceBreakdown}>
          {tieneDesgloseLineas ? (
            <>
              {d.mano_obra > 0 ? (
                <View style={styles.priceLine}>
                  <Text style={styles.priceLineLabel}>Mano de obra</Text>
                  <Text style={styles.priceLineValue}>{formatCLP(d.mano_obra)}</Text>
                </View>
              ) : null}
              {mostrarLineasRepuestos && d.repuestos > 0 ? (
                <View style={styles.priceLine}>
                  <Text style={styles.priceLineLabel}>
                    {totalRepuestosItems > 0
                      ? `Repuestos (${totalRepuestosItems} ${totalRepuestosItems === 1 ? 'ítem' : 'ítems'})`
                      : 'Repuestos'}
                  </Text>
                  <Text style={styles.priceLineValue}>{formatCLP(d.repuestos)}</Text>
                </View>
              ) : null}
              {mostrarLineasRepuestos && d.gestion > 0 ? (
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
                        showHeaderTotal={false}
                        showListTotal={false}
                        compact
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
        </View>

        <View style={styles.pricePanelFooter}>
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
          styles.confirmBtnWrap,
          selectable && styles.confirmBtnSpaced,
          btnDisabled && styles.confirmBtnDisabled,
        ]}
        onPress={onConfirmar}
        disabled={btnDisabled}
        activeOpacity={0.85}
      >
        <PrimaryGradientFill style={styles.confirmBtn}>
          {btnLoading ? (
            <ActivityIndicator color={COLORS.text.onPrimary} size="small" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirmar con este proveedor</Text>
          )}
        </PrimaryGradientFill>
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
    borderColor: COLORS.brand.orange,
    borderWidth: 2,
    backgroundColor: COLORS.background.paper,
  },
  compareTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
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
    color: COLORS.text.primary,
    fontVariant: ['tabular-nums'],
  },
  distanciaCaption: {
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
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
    color: COLORS.selection.text,
  },
  repuestosSin: {
    color: COLORS.text.secondary,
  },
  repuestosBadgeSolicitudCon: {
    backgroundColor: COLORS.selection.background,
    borderColor: COLORS.selection.border,
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
  pricePanel: {
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[50],
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  priceServiciosBlock: {
    gap: SPACING.xs,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  priceServicioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  servicioTextCol: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xxs,
  },
  servicioNombre: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  servicioNombreDestacado: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    lineHeight: 24,
  },
  servicioModoChip: {
    alignSelf: 'flex-start',
    marginBottom: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.full,
    borderWidth: 1,
  },
  servicioModoChipCon: {
    backgroundColor: COLORS.selection.background,
    borderColor: COLORS.selection.border,
  },
  servicioModoChipSin: {
    backgroundColor: COLORS.neutral.gray[100],
    borderColor: COLORS.border.light,
  },
  servicioModoChipText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  servicioModoChipTextCon: {
    color: COLORS.selection.text,
  },
  servicioPrecioMulti: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
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
  },
  priceBreakdown: {
    gap: 8,
    paddingTop: SPACING.xs,
  },
  pricePanelFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    marginTop: SPACING.xxs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
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
  confirmBtnWrap: {
    marginTop: 14,
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
  },
  confirmBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
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
