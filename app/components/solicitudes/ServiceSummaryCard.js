import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDERS, SHADOWS, TYPOGRAPHY } from '../../design-system/tokens';

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
    const fechaPreferida = solicitud.fecha_preferida || solicitud.fecha_creacion;
    const horaPreferida = solicitud.hora_preferida || solicitud.preferencia_horario;

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

            <Text style={styles.title}>
                {solicitud.servicio_nombre ||
                    (solicitud.servicios_solicitados_detail && solicitud.servicios_solicitados_detail.length > 0
                        ? solicitud.servicios_solicitados_detail[0].nombre
                        : 'Servicio Mecánico')}
            </Text>

            {solicitud.descripcion_problema && (
                <Text style={styles.description} numberOfLines={3}>
                    {solicitud.descripcion_problema}
                </Text>
            )}

            <View style={styles.gridContainer}>
                <View style={styles.gridItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="calendar-outline" size={18} color={COLORS.text.secondary} />
                    </View>
                    <View>
                        <Text style={styles.gridLabel}>Fecha solicitada</Text>
                        <Text style={styles.gridValue}>{formatDate(fechaPreferida)}</Text>
                    </View>
                </View>

                <View style={styles.gridItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="location-outline" size={18} color={COLORS.text.secondary} />
                    </View>
                    <View>
                        <Text style={styles.gridLabel}>Ubicación</Text>
                        <Text style={styles.gridValue} numberOfLines={1}>
                            {solicitud.direccion_servicio_texto || 'Domicilio'}
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
});

export default ServiceSummaryCard;
