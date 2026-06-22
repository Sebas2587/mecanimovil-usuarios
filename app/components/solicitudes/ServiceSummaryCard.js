import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
                icon: 'lightning-bolt',
            };
        case 'media':
            return {
                color: COLORS.warning[800],
                label: 'Urgencia media',
                bg: COLORS.warning[50],
                icon: 'clock-alert-outline',
            };
        default:
            return {
                color: COLORS.success[700],
                label: 'Urgencia baja',
                bg: COLORS.success[50],
                icon: 'calendar-clock',
            };
    }
};

function VehiculoStrip({ vehiculo }) {
    if (!vehiculo) return null;
    const year = vehiculo.year || vehiculo.anio || vehiculo.año;
    const meta = [year, vehiculo.cilindraje ? `${vehiculo.cilindraje}L` : null, vehiculo.patente]
        .filter(Boolean)
        .join(' · ');

    return (
        <View style={styles.vehiculoStrip}>
            <View style={styles.vehiculoIcon}>
                <Ionicons name="car-sport-outline" size={18} color={COLORS.primary[600]} />
            </View>
            <View style={styles.vehiculoTextWrap}>
                <Text style={styles.vehiculoTitulo} numberOfLines={1}>
                    {[vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')}
                </Text>
                {meta ? (
                    <Text style={styles.vehiculoMeta} numberOfLines={1}>
                        {meta}
                    </Text>
                ) : null}
            </View>
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
}) => {
    if (!solicitud) return null;

    const urgencyConfig = getUrgencyConfig(solicitud.urgencia);
    const estadoBadge = getEstadoBadgeMeta(solicitud, { checklistPendienteFirma });

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
    const modalidadServicio = useMemo(() => resolveModalidadServicio(solicitud), [solicitud]);
    const ubicacionTexto = useMemo(
        () => resolveUbicacionServicioTexto(solicitud, modalidadServicio),
        [solicitud, modalidadServicio],
    );
    const fechaPreferida = solicitud.fecha_preferida || solicitud.fecha_creacion;
    const horaPreferida = solicitud.hora_preferida || solicitud.preferencia_horario;
    const horaTexto = formatTime(horaPreferida);
    const cuandoTexto = horaTexto
        ? `${formatDate(fechaPreferida)} · ${horaTexto}`
        : formatDate(fechaPreferida);

    const serviciosSolicitud = useMemo(() => resolveServiciosSolicitud(solicitud), [solicitud]);
    const multiServicio = serviciosSolicitud.length > 1;
    const tituloServicios = solicitud.servicio_nombre || formatServiciosTitulo(serviciosSolicitud);

    const lineasOfertaCatalogo = useMemo(() => {
        if (ocultarPreciosCatalogo) return [];
        const oferta = solicitud?.oferta_seleccionada_detail;
        const detalles = oferta?.detalles_servicios;
        if (!Array.isArray(detalles) || detalles.length <= 1) return [];
        return detalles.map((d) => ({
            id: d.id ?? d.servicio,
            nombre: d.servicio_nombre || 'Servicio',
            precio: parseFloat(d.precio_servicio || 0),
        }));
    }, [solicitud?.oferta_seleccionada_detail, ocultarPreciosCatalogo]);

    const repuestosMeta = useMemo(() => resolveRepuestosServicioMeta(solicitud), [solicitud]);
    const tecnicoPreferido = useMemo(() => resolveTecnicoPreferido(solicitud), [solicitud]);
    const vehiculoMostrar = vehiculo || solicitud.vehiculo_info || null;

    const estadoBadgeNode = (
        <View
            style={[
                styles.estadoBadge,
                { backgroundColor: estadoBadge.bg, borderColor: estadoBadge.border },
            ]}
        >
            <Text style={[styles.estadoBadgeText, { color: estadoBadge.color }]} numberOfLines={2}>
                {estadoBadge.label}
            </Text>
        </View>
    );

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
        !ocultarMetaCatalogo
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
            <VehiculoStrip vehiculo={vehiculoMostrar} />

            <View style={styles.header}>
                <View style={styles.headerBadges}>
                    <View style={[styles.chip, { backgroundColor: urgencyConfig.bg }]}>
                        <MaterialCommunityIcons
                            name={urgencyConfig.icon}
                            size={13}
                            color={urgencyConfig.color}
                        />
                        <Text style={[styles.chipText, { color: urgencyConfig.color }]}>
                            {urgencyConfig.label}
                        </Text>
                    </View>
                    {estadoBadgeNode}
                </View>
                <Text style={styles.idText}>#{solicitud.id ? solicitud.id.slice(0, 8) : '---'}</Text>
            </View>

            <Text style={styles.title}>{tituloServicios}</Text>

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
        borderRadius: BORDERS.radius.card.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        ...SHADOWS.sm,
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
        paddingBottom: SPACING.sm,
        borderBottomWidth: BORDERS.width.thin,
        borderBottomColor: COLORS.border.light,
    },
    vehiculoIcon: {
        width: 36,
        height: 36,
        borderRadius: BORDERS.radius.sm,
        backgroundColor: COLORS.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    vehiculoTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    vehiculoTitulo: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
    },
    vehiculoMeta: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    headerBadges: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
        alignItems: 'center',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        borderRadius: BORDERS.radius.badge.md,
        gap: 4,
    },
    chipText: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        textTransform: 'uppercase',
    },
    estadoBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        borderRadius: BORDERS.radius.badge.md,
        borderWidth: BORDERS.width.thin,
        maxWidth: '100%',
    },
    estadoBadgeText: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        lineHeight: 16,
    },
    idText: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
        color: COLORS.text.tertiary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        marginTop: 2,
    },
    title: {
        fontSize: TYPOGRAPHY.fontSize.xl,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xxs,
        letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    },
    serviciosLista: {
        marginBottom: SPACING.xs,
        gap: 2,
    },
    servicioNombre: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        lineHeight: 18,
    },
    description: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.secondary,
        lineHeight: 20,
        marginBottom: SPACING.sm,
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
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.secondary,
    },
    precioLineaValor: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
    },
    precioTotalLinea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.xxs,
        paddingTop: SPACING.xxs,
        borderTopWidth: BORDERS.width.thin,
        borderTopColor: COLORS.border.light,
    },
    precioTotalLabel: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
    },
    precioTotalValor: {
        fontSize: TYPOGRAPHY.fontSize.base,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.primary[700],
    },
    detailsSection: {
        marginTop: SPACING.xs,
        paddingTop: SPACING.xxs,
    },
});

export default ServiceSummaryCard;
