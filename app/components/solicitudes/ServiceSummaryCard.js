import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDERS, SHADOWS, TYPOGRAPHY } from '../../design-system/tokens';
import {
    resolveServiciosSolicitud,
    formatServiciosTitulo,
    formatCLPServicio,
} from '../../utils/solicitudServicios';
import RepuestosExpandible from '../ofertas/RepuestosExpandible';
import {
    resolveLineasServicioConRepuestos,
    lineasTienenRepuestos,
    ofertaDebeMostrarRepuestos,
} from '../../utils/ofertaRepuestos';
import {
    resolveRepuestosServicioMeta,
    getRepuestosServicioIcon,
} from '../../utils/solicitudRepuestosServicio';
import {
    resolveModalidadServicio,
    resolveUbicacionServicioTexto,
    getModalidadServicioIcon,
} from '../../utils/solicitudModalidadServicio';

/** Colores de badge alineados a estados de solicitud pública (Coinbase / superficies suaves). */
export function getEstadoBadgeMeta(solicitud) {
    const efectivo = solicitud.estado_efectivo ?? solicitud.estado;
    const label =
        efectivo === 'ofertas_adicionales_pendientes' && solicitud.estado_display_efectivo
            ? solicitud.estado_display_efectivo
            : solicitud.estado_display ||
              (typeof efectivo === 'string' ? efectivo.replace(/_/g, ' ') : '—');
    const map = {
        creada: { color: COLORS.text.secondary, bg: COLORS.neutral.gray[100], border: COLORS.border.light },
        seleccionando_servicios: { color: COLORS.primary[700], bg: COLORS.primary[50], border: COLORS.primary[200] },
        publicada: { color: COLORS.primary[700], bg: COLORS.primary[50], border: COLORS.primary[200] },
        con_ofertas: { color: COLORS.warning[800], bg: COLORS.warning[50], border: COLORS.warning[200] },
        esperando_creditos_proveedor: { color: COLORS.warning[800], bg: COLORS.warning[50], border: COLORS.warning[300] },
        adjudicada: { color: COLORS.success[800], bg: COLORS.success.light, border: COLORS.success[200] },
        pendiente_pago: { color: COLORS.success[800], bg: COLORS.success.light, border: COLORS.success[200] },
        pagada: { color: COLORS.success[800], bg: COLORS.success.light, border: COLORS.success[200] },
        en_ejecucion: { color: COLORS.primary[700], bg: COLORS.primary[50], border: COLORS.primary[200] },
        completada: { color: COLORS.success[800], bg: COLORS.success.light, border: COLORS.success[200] },
        expirada: { color: COLORS.error[700], bg: COLORS.error[50], border: COLORS.error[200] },
        cancelada: { color: COLORS.error[700], bg: COLORS.error[50], border: COLORS.error[200] },
        ofertas_adicionales_pendientes: { color: COLORS.warning[800], bg: COLORS.warning[50], border: COLORS.warning[200] },
    };
    const c = map[efectivo] || {
        color: COLORS.text.secondary,
        bg: COLORS.neutral.gray[100],
        border: COLORS.border.light,
    };
    return { label, ...c };
}

const getUrgencyConfig = (urgencia) => {
    switch (urgencia?.toLowerCase()) {
        case 'alta':
            return {
                color: COLORS.error[700],
                label: 'Urgencia Alta',
                bg: COLORS.error[50],
                icon: 'lightning-bolt',
            };
        case 'media':
            return {
                color: COLORS.warning[800],
                label: 'Urgencia Media',
                bg: COLORS.warning[50],
                icon: 'clock-alert-outline',
            };
        default:
            return {
                color: COLORS.success[700],
                label: 'Urgencia Baja',
                bg: COLORS.success[50],
                icon: 'calendar-clock',
            };
    }
};

const ServiceSummaryCard = ({ solicitud }) => {
    if (!solicitud) return null;

    const urgencyConfig = getUrgencyConfig(solicitud.urgencia);

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
                const lista = nombres.join(', ');
                return {
                    titulo:
                        nombres.length === 1
                            ? 'Dirigida a un proveedor'
                            : `Dirigida a ${nombres.length} proveedores`,
                    detalle: lista,
                };
            }
            return {
                titulo: 'Dirigida a proveedores específicos',
                detalle: null,
            };
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
    const estadoBadge = getEstadoBadgeMeta(solicitud);
    const fechaPreferida = solicitud.fecha_preferida || solicitud.fecha_creacion;
    const horaPreferida = solicitud.hora_preferida || solicitud.preferencia_horario;

    const serviciosSolicitud = useMemo(() => resolveServiciosSolicitud(solicitud), [solicitud]);
    const multiServicio = serviciosSolicitud.length > 1;
    const tituloServicios = solicitud.servicio_nombre || formatServiciosTitulo(serviciosSolicitud);

    const lineasOfertaCatalogo = useMemo(() => {
        const oferta = solicitud?.oferta_seleccionada_detail;
        const detalles = oferta?.detalles_servicios;
        if (!Array.isArray(detalles) || detalles.length <= 1) return [];
        return detalles.map((d) => ({
            id: d.id ?? d.servicio,
            nombre: d.servicio_nombre || 'Servicio',
            precio: parseFloat(d.precio_servicio || 0),
        }));
    }, [solicitud?.oferta_seleccionada_detail]);

    const repuestosMeta = useMemo(() => resolveRepuestosServicioMeta(solicitud), [solicitud]);
    const lineasRepuestosOferta = useMemo(() => {
        if (!repuestosMeta.incluye) return [];
        return resolveLineasServicioConRepuestos(solicitud?.oferta_seleccionada_detail);
    }, [solicitud?.oferta_seleccionada_detail, repuestosMeta.incluye]);
    const mostrarRepuestosOferta = useMemo(() => {
        const oferta = solicitud?.oferta_seleccionada_detail;
        if (!oferta) return false;
        return (
            repuestosMeta.incluye
            && ofertaDebeMostrarRepuestos(oferta, solicitud)
            && lineasTienenRepuestos(lineasRepuestosOferta)
        );
    }, [solicitud, repuestosMeta.incluye, lineasRepuestosOferta]);

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={[styles.urgencyBadge, { backgroundColor: urgencyConfig.bg }]}>
                    <MaterialCommunityIcons name={urgencyConfig.icon} size={14} color={urgencyConfig.color} />
                    <Text style={[styles.urgencyText, { color: urgencyConfig.color }]}>
                        {urgencyConfig.label}
                    </Text>
                </View>
                <Text style={styles.idText}>#{solicitud.id ? solicitud.id.slice(0, 8) : '---'}</Text>
            </View>

            <Text style={styles.title}>{tituloServicios}</Text>

            {multiServicio ? (
                <View style={styles.serviciosLista}>
                    {serviciosSolicitud.map((s) => (
                        <View key={String(s.id ?? s.nombre)} style={styles.servicioRow}>
                            <Ionicons name="construct-outline" size={14} color={COLORS.text.tertiary} />
                            <Text style={styles.servicioNombre} numberOfLines={2}>
                                {s.nombre}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {lineasOfertaCatalogo.length > 0 ? (
                <View style={styles.ofertaPreciosBlock}>
                    <Text style={styles.ofertaPreciosLabel}>Precio por servicio (oferta seleccionada)</Text>
                    {lineasOfertaCatalogo.map((linea) => (
                        <View key={String(linea.id ?? linea.nombre)} style={styles.servicioRow}>
                            <Text style={styles.servicioNombre} numberOfLines={2}>
                                {linea.nombre}
                            </Text>
                            {linea.precio > 0 ? (
                                <Text style={styles.servicioPrecio}>{formatCLPServicio(linea.precio)}</Text>
                            ) : null}
                        </View>
                    ))}
                    {solicitud?.oferta_seleccionada_detail?.precio_total_ofrecido != null ? (
                        <View style={styles.totalOfertaRow}>
                            <Text style={styles.totalOfertaLabel}>Total oferta</Text>
                            <Text style={styles.totalOfertaValue}>
                                {formatCLPServicio(solicitud.oferta_seleccionada_detail.precio_total_ofrecido)}
                            </Text>
                        </View>
                    ) : null}
                </View>
            ) : null}

            {solicitud.descripcion_problema && (
                <Text style={styles.description} numberOfLines={3}>
                    {solicitud.descripcion_problema}
                </Text>
            )}

            <View style={styles.gridContainer}>
                <View style={styles.gridItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="flag-outline" size={18} color={COLORS.text.secondary} />
                    </View>
                    <View style={styles.gridItemTextWrap}>
                        <Text style={styles.gridLabel}>Estado</Text>
                        <View
                            style={[
                                styles.estadoBadge,
                                {
                                    backgroundColor: estadoBadge.bg,
                                    borderColor: estadoBadge.border,
                                },
                            ]}
                        >
                            <Text style={[styles.estadoBadgeText, { color: estadoBadge.color }]} numberOfLines={2}>
                                {estadoBadge.label}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.gridItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="calendar-outline" size={18} color={COLORS.text.secondary} />
                    </View>
                    <View>
                        <Text style={styles.gridLabel}>Fecha solicitada</Text>
                        <Text style={styles.gridValue}>{formatDate(fechaPreferida)}</Text>
                    </View>
                </View>

                {modalidadServicio ? (
                    <View style={styles.gridItem}>
                        <View style={styles.iconContainer}>
                            <Ionicons
                                name={getModalidadServicioIcon(modalidadServicio)}
                                size={18}
                                color={COLORS.text.secondary}
                            />
                        </View>
                        <View>
                            <Text style={styles.gridLabel}>Modalidad</Text>
                            <Text style={styles.gridValue}>{modalidadServicio.label}</Text>
                        </View>
                    </View>
                ) : null}

                <View style={styles.gridItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="location-outline" size={18} color={COLORS.text.secondary} />
                    </View>
                    <View style={styles.gridItemTextWrap}>
                        <Text style={styles.gridLabel}>
                            {modalidadServicio?.tipo === 'taller' ? 'Dirección del taller' : 'Ubicación'}
                        </Text>
                        <Text style={styles.gridValue} numberOfLines={2}>
                            {ubicacionTexto}
                        </Text>
                    </View>
                </View>

                <View style={styles.gridItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="time-outline" size={18} color={COLORS.text.secondary} />
                    </View>
                    <View>
                        <Text style={styles.gridLabel}>Horario</Text>
                        <Text style={styles.gridValue} numberOfLines={1}>
                            {formatTime(horaPreferida) || 'Por coordinar'}
                        </Text>
                    </View>
                </View>

                <View style={styles.gridItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="git-network-outline" size={18} color={COLORS.text.secondary} />
                    </View>
                    <View style={styles.gridItemTextWrap}>
                        <Text style={styles.gridLabel}>Modo de solicitud</Text>
                        <Text style={styles.gridValue}>{modoSolicitud.titulo}</Text>
                        {modoSolicitud.detalle ? (
                            <Text style={styles.gridValueSecondary} numberOfLines={4}>
                                {modoSolicitud.detalle}
                            </Text>
                        ) : null}
                    </View>
                </View>

                <View style={styles.gridItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons
                            name={getRepuestosServicioIcon(repuestosMeta.incluye)}
                            size={18}
                            color={COLORS.text.secondary}
                        />
                    </View>
                    <View style={styles.gridItemTextWrap}>
                        <Text style={styles.gridLabel}>Repuestos</Text>
                        <Text style={styles.gridValue}>{repuestosMeta.label}</Text>
                        {repuestosMeta.fuente === 'proveedor' ? (
                            <Text style={styles.gridValueSecondary} numberOfLines={2}>
                                Según configuración del proveedor
                            </Text>
                        ) : null}
                    </View>
                </View>
            </View>

            {mostrarRepuestosOferta ? (
                <View style={styles.repuestosOfertaSection}>
                    <Text style={styles.repuestosOfertaTitle}>Repuestos incluidos en la oferta</Text>
                    {lineasRepuestosOferta.map((linea) => (
                        linea.repuestos_info?.length > 0 ? (
                            <RepuestosExpandible
                                key={String(linea.id ?? linea.nombre)}
                                repuestos={linea.repuestos_info}
                                servicioNombre={
                                    lineasRepuestosOferta.length > 1 ? linea.nombre : null
                                }
                            />
                        ) : null
                    ))}
                </View>
            ) : null}
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    urgencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        borderRadius: BORDERS.radius.badge.md,
        gap: SPACING.xxs,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    urgencyText: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        textTransform: 'uppercase',
    },
    idText: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
        color: COLORS.text.tertiary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    title: {
        fontSize: TYPOGRAPHY.fontSize.xl,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
        letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    },
    serviciosLista: {
        marginBottom: SPACING.sm,
        gap: SPACING.xs,
    },
    servicioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    servicioNombre: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    servicioPrecio: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
    },
    ofertaPreciosBlock: {
        backgroundColor: COLORS.neutral.gray[100],
        borderRadius: BORDERS.radius.md,
        padding: SPACING.sm,
        marginBottom: SPACING.sm,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        gap: SPACING.xs,
    },
    ofertaPreciosLabel: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        color: COLORS.text.tertiary,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        textTransform: 'uppercase',
        marginBottom: SPACING.xxs,
    },
    totalOfertaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.xs,
        paddingTop: SPACING.xs,
        borderTopWidth: BORDERS.width.thin,
        borderTopColor: COLORS.border.light,
    },
    totalOfertaLabel: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
    },
    totalOfertaValue: {
        fontSize: TYPOGRAPHY.fontSize.base,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.primary[700],
    },
    description: {
        fontSize: TYPOGRAPHY.fontSize.base,
        color: COLORS.text.secondary,
        lineHeight: 22,
        marginBottom: SPACING.md,
        fontWeight: TYPOGRAPHY.fontWeight.regular,
    },
    gridContainer: {
        flexDirection: 'column',
        backgroundColor: COLORS.neutral.gray[100],
        borderRadius: BORDERS.radius.md,
        padding: SPACING.md,
        gap: SPACING.md,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    gridItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
    },
    gridItemTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: BORDERS.radius.sm,
        backgroundColor: COLORS.background.paper,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    gridLabel: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        color: COLORS.text.tertiary,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    gridValue: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.primary,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
    },
    gridValueSecondary: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        marginTop: SPACING.xxs,
        lineHeight: 18,
    },
    estadoBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        borderRadius: BORDERS.radius.badge.md,
        borderWidth: BORDERS.width.thin,
        maxWidth: '100%',
    },
    estadoBadgeText: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        lineHeight: 18,
    },
    repuestosOfertaSection: {
        marginTop: SPACING.md,
        gap: SPACING.xs,
    },
    repuestosOfertaTitle: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.secondary,
        marginBottom: SPACING.xxs,
    },
});

export default ServiceSummaryCard;
