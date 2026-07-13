import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Icon from '../base/Icon/Icon';
import { COLORS, SPACING, BORDERS, SHADOWS, TYPOGRAPHY } from '../../design-system/tokens';
import {
    resolveServiciosSolicitud,
    formatServiciosTitulo,
    formatCLPServicio,
} from '../../utils/solicitudServicios';
import {
    resolveRepuestosServicioMeta,
} from '../../utils/solicitudRepuestosServicio';
import { resolvePrecioTotalOfrecidoEfectivo } from '../../utils/ofertaPrecioRepuestos';
import {
    resolveModalidadServicio,
    resolveUbicacionServicioTexto,
    getModalidadServicioIcon,
    getUbicacionServicioLabel,
} from '../../utils/solicitudModalidadServicio';
import { getEstadoSolicitudSurface } from '../../utils/solicitudEstadoDisplay';
import { resolveTecnicoPreferido, especialidadesTecnicoTexto } from '../../utils/solicitudTecnicoPreferido';
import { useVehiculoFotoUrl } from '../../hooks/useResolvedMediaUrl';
import SolicitudDetalleRow from './SolicitudDetalleRow';

/** Colores de badge alineados a estados de solicitud pública. */
export function getEstadoBadgeMeta(solicitud, options = {}) {
    const surface = getEstadoSolicitudSurface(solicitud, options);
    return {
        label: surface.texto,
        color: surface.color,
        bg: surface.bg,
        border: surface.border,
    };
}

const getUrgencyConfig = (urgencia) => {
    switch (urgencia?.toLowerCase()) {
        case 'alta':
            return {
                color: COLORS.error[700],
                label: 'Urgencia alta',
                bg: COLORS.error[50],
                border: COLORS.error[200],
                icon: 'lightning-bolt',
            };
        case 'media':
            return {
                color: COLORS.warning[800],
                label: 'Urgencia media',
                bg: COLORS.warning[50],
                border: COLORS.warning[200],
                icon: 'clock-alert-outline',
            };
        default:
            return {
                color: COLORS.primary[700],
                label: 'Urgencia baja',
                bg: COLORS.primary[50],
                border: COLORS.primary[200],
                icon: 'calendar-clock',
            };
    }
};

function VehiculoStrip({ vehiculo, solicitud, solicitudIdShort = null }) {
    const fotoUrl = useVehiculoFotoUrl(vehiculo, solicitud);
    if (!vehiculo) return null;

    const year = vehiculo.year || vehiculo.anio || vehiculo.año;
    const meta = [year, vehiculo.cilindraje ? `${vehiculo.cilindraje}L` : null, vehiculo.patente]
        .filter(Boolean)
        .join(' · ');
    const marca = vehiculo.marca || vehiculo.marca_nombre;
    const modelo = vehiculo.modelo || vehiculo.modelo_nombre;

    return (
        <View style={styles.vehiculoStrip}>
            {fotoUrl ? (
                <Image
                    source={{ uri: fotoUrl }}
                    style={styles.vehiculoFoto}
                    contentFit="cover"
                    transition={200}
                />
            ) : (
                <View style={[styles.vehiculoFoto, styles.vehiculoFotoPlaceholder]}>
                    <Icon name="car-sport-outline" size={22} color={COLORS.primary[500]} />
                </View>
            )}
            <View style={styles.vehiculoTextWrap}>
                <Text style={styles.vehiculoEyebrow}>Vehículo</Text>
                <Text style={styles.vehiculoTitulo} numberOfLines={1}>
                    {[marca, modelo].filter(Boolean).join(' ')}
                </Text>
                {meta ? (
                    <Text style={styles.vehiculoMeta} numberOfLines={1}>
                        {meta}
                    </Text>
                ) : null}
            </View>
            {solicitudIdShort ? (
                <Text style={styles.idText} numberOfLines={1}>
                    #{solicitudIdShort}
                </Text>
            ) : null}
        </View>
    );
}

const ServiceSummaryCard = ({
    solicitud,
    checklistPendienteFirma = false,
    vehiculo = null,
    embedded = false,
    ocultarPreciosCatalogo = false,
    ocultarMetaCatalogo = false,
    /** Si true, no pinta el badge de estado (p. ej. ya está en el header de la pantalla). */
    ocultarEstadoBadge = false,
}) => {
    const urgencyConfig = getUrgencyConfig(solicitud?.urgencia);
    const estadoBadge = useMemo(
        () => (solicitud ? getEstadoBadgeMeta(solicitud, { checklistPendienteFirma }) : null),
        [solicitud, checklistPendienteFirma],
    );

    const formatDate = (dateString) => {
        if (!dateString) return 'Pendiente';
        const match = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
            return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
        }
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return 'Pendiente';
        return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
    };

    const formatTime = (timeString) => {
        if (!timeString) return null;
        return String(timeString).substring(0, 5);
    };

    const modalidadServicio = useMemo(
        () => (solicitud ? resolveModalidadServicio(solicitud) : null),
        [solicitud],
    );
    const ubicacionTexto = useMemo(
        () => (solicitud ? resolveUbicacionServicioTexto(solicitud, modalidadServicio) : null),
        [solicitud, modalidadServicio],
    );
    const serviciosSolicitud = useMemo(
        () => (solicitud ? resolveServiciosSolicitud(solicitud) : []),
        [solicitud],
    );
    const lineasOfertaCatalogo = useMemo(() => {
        if (!solicitud || ocultarPreciosCatalogo) return [];
        const oferta = solicitud?.oferta_seleccionada_detail;
        const detalles = oferta?.detalles_servicios;
        if (!Array.isArray(detalles) || detalles.length <= 1) return [];
        return detalles.map((d) => ({
            id: d.id ?? d.servicio,
            nombre: d.servicio_nombre || 'Servicio',
            precio: parseFloat(d.precio_servicio || 0),
        }));
    }, [solicitud, ocultarPreciosCatalogo]);
    const repuestosMeta = useMemo(
        () => (solicitud ? resolveRepuestosServicioMeta(solicitud) : null),
        [solicitud],
    );
    const tecnicoPreferido = useMemo(
        () => (solicitud ? resolveTecnicoPreferido(solicitud) : null),
        [solicitud],
    );

    if (!solicitud || !estadoBadge) return null;

    const getModoSolicitud = () => {
        const tipo = String(solicitud.tipo_solicitud || 'global').toLowerCase();
        const proveedores = Array.isArray(solicitud.proveedores_dirigidos_detail)
            ? solicitud.proveedores_dirigidos_detail
            : [];
        if (tipo === 'dirigida') {
            if (proveedores.length > 0) {
                const nombres = proveedores.map((p) => {
                    const n = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
                    return n || p.username || (p.id != null ? `Proveedor #${p.id}` : 'Proveedor');
                });
                return {
                    titulo:
                        nombres.length === 1
                            ? 'Dirigida a un proveedor'
                            : `Dirigida a ${nombres.length} proveedores`,
                    detalle: nombres.join(', '),
                };
            }
            return { titulo: 'Dirigida a proveedores específicos', detalle: null };
        }
        return {
            titulo: 'Abierta a todos los proveedores',
            detalle: 'Cualquier taller o mecánico puede enviarte una oferta.',
        };
    };

    const modoSolicitud = getModoSolicitud();
    const fechaPreferida = solicitud.fecha_preferida || solicitud.fecha_creacion;
    const horaPreferida = solicitud.hora_preferida || solicitud.preferencia_horario;
    const horaTexto = formatTime(horaPreferida);
    const cuandoTexto = horaTexto
        ? `${formatDate(fechaPreferida)} · ${horaTexto}`
        : formatDate(fechaPreferida);

    const multiServicio = serviciosSolicitud.length > 1;
    const tituloServicios = solicitud.servicio_nombre || formatServiciosTitulo(serviciosSolicitud);
    const vehiculoMostrar =
        vehiculo
        || solicitud.vehiculo_info
        || solicitud.vehiculo_detail
        || null;

    const detailRows = [
        {
            key: 'cuando',
            icon: 'calendar-outline',
            label: 'Cuándo',
            value: cuandoTexto,
        },
        modalidadServicio
            ? {
                key: 'modalidad',
                icon: getModalidadServicioIcon(modalidadServicio),
                label: 'Modalidad',
                value: modalidadServicio.label,
            }
            : null,
        tecnicoPreferido
            ? {
                key: 'tecnico',
                icon: 'person-outline',
                label: 'Técnico',
                value: tecnicoPreferido.nombre,
                hint: especialidadesTecnicoTexto(tecnicoPreferido)
                    || tecnicoPreferido.modalidad_display
                    || null,
            }
            : null,
        {
            key: 'ubicacion',
            icon: 'location-outline',
            label: getUbicacionServicioLabel(modalidadServicio),
            value: ubicacionTexto,
        },
        !ocultarMetaCatalogo && repuestosMeta
            ? {
                key: 'repuestos',
                icon: repuestosMeta.incluye ? 'construct-outline' : 'remove-circle-outline',
                label: 'Repuestos',
                value: repuestosMeta.label,
                hint: repuestosMeta.fuente === 'proveedor' ? 'Según configuración del proveedor' : null,
            }
            : null,
        !ocultarMetaCatalogo
            ? {
                key: 'modo',
                icon: 'git-network-outline',
                label: 'Alcance',
                value: modoSolicitud.titulo,
                hint: modoSolicitud.detalle,
            }
            : null,
    ].filter(Boolean);

    return (
        <View style={[styles.card, embedded && styles.cardEmbedded]}>
            <VehiculoStrip
                vehiculo={vehiculoMostrar}
                solicitud={solicitud}
                solicitudIdShort={solicitud.id ? String(solicitud.id).slice(0, 8) : null}
            />

            <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>
                    {tituloServicios}
                </Text>
                <View
                    style={[
                        styles.chip,
                        {
                            backgroundColor: urgencyConfig.bg,
                            borderColor: urgencyConfig.border,
                        },
                    ]}
                >
                    <Icon name={urgencyConfig.icon} size={12} color={urgencyConfig.color} />
                    <Text style={[styles.chipText, { color: urgencyConfig.color }]}>
                        {urgencyConfig.label}
                    </Text>
                </View>
            </View>

            {multiServicio ? (
                <View style={styles.serviciosLista}>
                    {serviciosSolicitud.map((s) => (
                        <Text key={String(s.id ?? s.nombre)} style={styles.servicioNombre} numberOfLines={2}>
                            · {s.nombre}
                        </Text>
                    ))}
                </View>
            ) : null}

            {solicitud.descripcion_problema ? (
                <Text style={styles.description} numberOfLines={4}>
                    {solicitud.descripcion_problema}
                </Text>
            ) : null}

            {!ocultarEstadoBadge ? (
                <View style={styles.estadoRow}>
                    <View
                        style={[
                            styles.estadoBadge,
                            { backgroundColor: estadoBadge.bg, borderColor: estadoBadge.border },
                        ]}
                    >
                        <Text style={[styles.estadoBadgeText, { color: estadoBadge.color }]} numberOfLines={1}>
                            {estadoBadge.label}
                        </Text>
                    </View>
                </View>
            ) : null}

            {lineasOfertaCatalogo.length > 0 ? (
                <View style={styles.preciosInline}>
                    {lineasOfertaCatalogo.map((linea) => (
                        <View key={String(linea.id ?? linea.nombre)} style={styles.precioLinea}>
                            <Text style={styles.precioLineaNombre} numberOfLines={1}>
                                {linea.nombre}
                            </Text>
                            {linea.precio > 0 ? (
                                <Text style={styles.precioLineaValor}>{formatCLPServicio(linea.precio)}</Text>
                            ) : null}
                        </View>
                    ))}
                    {solicitud?.oferta_seleccionada_detail ? (
                        <View style={styles.precioTotalLinea}>
                            <Text style={styles.precioTotalLabel}>Total</Text>
                            <Text style={styles.precioTotalValor}>
                                {formatCLPServicio(
                                    resolvePrecioTotalOfrecidoEfectivo(
                                        solicitud.oferta_seleccionada_detail,
                                        solicitud,
                                    ),
                                )}
                            </Text>
                        </View>
                    ) : null}
                </View>
            ) : null}

            <View style={styles.detailsSection}>
                {detailRows.map((row, index) => (
                    <SolicitudDetalleRow
                        key={row.key}
                        icon={row.icon}
                        label={row.label}
                        value={row.value}
                        hint={row.hint}
                        isLast={index === detailRows.length - 1}
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.border.light,
    },
    cardEmbedded: {
        marginBottom: 0,
        borderWidth: 0,
        borderRadius: 0,
        ...SHADOWS.none,
        paddingBottom: SPACING.sm,
    },
    vehiculoStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
        paddingBottom: SPACING.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.border.light,
    },
    vehiculoFoto: {
        width: 56,
        height: 56,
        borderRadius: BORDERS.radius.md,
        backgroundColor: COLORS.neutral.gray[100],
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.border.light,
    },
    vehiculoFotoPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary[50],
        borderColor: COLORS.primary[100],
    },
    vehiculoTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    vehiculoEyebrow: {
        ...TYPOGRAPHY.styles.small,
        fontFamily: TYPOGRAPHY.fontFamily.medium,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    vehiculoTitulo: {
        ...TYPOGRAPHY.styles.h5,
        fontFamily: TYPOGRAPHY.fontFamily.semibold,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
    },
    vehiculoMeta: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    idText: {
        ...TYPOGRAPHY.styles.small,
        color: COLORS.text.tertiary,
        alignSelf: 'flex-start',
        marginTop: 2,
        flexShrink: 0,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: SPACING.sm,
        marginBottom: SPACING.xxs,
    },
    title: {
        ...TYPOGRAPHY.styles.h4,
        fontFamily: TYPOGRAPHY.fontFamily.semibold,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
        flex: 1,
        minWidth: 0,
    },
    serviciosLista: {
        marginBottom: SPACING.xs,
        gap: 2,
    },
    servicioNombre: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
        lineHeight: 18,
    },
    description: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
        lineHeight: 20,
        marginBottom: SPACING.sm,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 5,
        borderRadius: BORDERS.radius.pill,
        gap: 4,
        borderWidth: StyleSheet.hairlineWidth,
        flexShrink: 0,
        maxWidth: '46%',
    },
    chipText: {
        ...TYPOGRAPHY.styles.small,
        fontFamily: TYPOGRAPHY.fontFamily.semibold,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        flexShrink: 1,
    },
    estadoRow: {
        marginBottom: SPACING.md,
    },
    estadoBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 5,
        borderRadius: BORDERS.radius.sm,
        borderWidth: 1,
        maxWidth: '100%',
    },
    estadoBadgeText: {
        ...TYPOGRAPHY.styles.small,
        fontFamily: TYPOGRAPHY.fontFamily.semibold,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        lineHeight: 16,
    },
    preciosInline: {
        marginBottom: SPACING.sm,
        gap: SPACING.xxs,
    },
    precioLinea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    precioLineaNombre: {
        flex: 1,
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
    },
    precioLineaValor: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.primary,
    },
    precioTotalLinea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.xxs,
        paddingTop: SPACING.xxs,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.border.light,
    },
    precioTotalLabel: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.primary,
    },
    precioTotalValor: {
        ...TYPOGRAPHY.styles.h5,
        fontFamily: TYPOGRAPHY.fontFamily.semibold,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.primary[600],
    },
    detailsSection: {
        marginTop: SPACING.xxs,
        paddingTop: SPACING.xs,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.border.light,
    },
});

export default ServiceSummaryCard;
