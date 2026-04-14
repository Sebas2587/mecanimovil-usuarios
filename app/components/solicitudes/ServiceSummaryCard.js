import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';

const GLASS_BG = Platform.select({
    ios: 'rgba(255,255,255,0.06)',
    android: 'rgba(255,255,255,0.10)',
    default: 'rgba(255,255,255,0.08)',
});

const ServiceSummaryCard = ({ solicitud }) => {
    const theme = useTheme();
    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    const styles = getStyles(colors, typography, spacing, borders);

    if (!solicitud) return null;

    // Determinar urgencia y color
    const getUrgencyConfig = (urgencia) => {
        switch (urgencia?.toLowerCase()) {
            case 'alta':
                return { color: '#FCA5A5', label: 'Urgencia Alta', bg: 'rgba(248,113,113,0.18)', icon: 'lightning-bolt' };
            case 'media':
                return { color: '#FCD34D', label: 'Urgencia Media', bg: 'rgba(245,158,11,0.20)', icon: 'clock-alert-outline' };
            default:
                return { color: '#6EE7B7', label: 'Urgencia Baja', bg: 'rgba(16,185,129,0.18)', icon: 'calendar-clock' };
        }
    };

    const urgencyConfig = getUrgencyConfig(solicitud.urgencia);

    const formatDate = (dateString) => {
        if (!dateString) return 'Pendiente';
        // Parsear YYYY-MM-DD manualmente para evitar desfase de zona horaria
        // (new Date('2026-03-31') crea UTC midnight → día anterior en timezones como Chile UTC-3).
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
        // Si viene como HH:MM:SS o HH:MM, tomar solo HH:MM
        return String(timeString).substring(0, 5);
    };

    /** Abierta a todos vs dirigida a uno o varios proveedores (backend: global | dirigida) */
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

    // Mostrar fecha preferida (la que eligió el usuario), no la fecha de creación del sistema
    const fechaPreferida = solicitud.fecha_preferida || solicitud.fecha_creacion;
    const horaPreferida = solicitud.hora_preferida || solicitud.preferencia_horario;

    return (
        <View style={styles.card}>
            {/* Header con Badge de Urgencia */}
            <View style={styles.header}>
                <View style={[styles.urgencyBadge, { backgroundColor: urgencyConfig.bg }]}>
                    <MaterialCommunityIcons name={urgencyConfig.icon} size={14} color={urgencyConfig.color} />
                    <Text style={[styles.urgencyText, { color: urgencyConfig.color }]}>
                        {urgencyConfig.label}
                    </Text>
                </View>
                <Text style={styles.idText}>#{solicitud.id ? solicitud.id.slice(0, 8) : '---'}</Text>
            </View>

            {/* Título y Descripción */}
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

            {/* Grid de Información */}
            <View style={styles.gridContainer}>
                {/* Fecha Preferida */}
                <View style={styles.gridItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="calendar-outline" size={18} color={colors.text?.secondary || '#6B7280'} />
                    </View>
                    <View>
                        <Text style={styles.gridLabel}>Fecha solicitada</Text>
                        <Text style={styles.gridValue}>{formatDate(fechaPreferida)}</Text>
                    </View>
                </View>

                {/* Ubicación */}
                <View style={styles.gridItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="location-outline" size={18} color={colors.text?.secondary || '#6B7280'} />
                    </View>
                    <View>
                        <Text style={styles.gridLabel}>Ubicación</Text>
                        <Text style={styles.gridValue} numberOfLines={1}>
                            {solicitud.direccion_servicio_texto || 'Domicilio'}
                        </Text>
                    </View>
                </View>

                {/* Horario Preferido */}
                <View style={styles.gridItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="time-outline" size={18} color={colors.text?.secondary || '#6B7280'} />
                    </View>
                    <View>
                        <Text style={styles.gridLabel}>Horario</Text>
                        <Text style={styles.gridValue} numberOfLines={1}>
                            {formatTime(horaPreferida) || 'Por coordinar'}
                        </Text>
                    </View>
                </View>

                {/* Modo de creación: global vs dirigida */}
                <View style={styles.gridItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons
                            name="git-network-outline"
                            size={18}
                            color={colors.text?.secondary || '#6B7280'}
                        />
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

const getStyles = (colors, typography, spacing, borders) => StyleSheet.create({
    card: {
        backgroundColor: GLASS_BG,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    urgencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999, // Pill shape
        gap: 4,
    },
    urgencyText: {
        fontSize: 12,
        fontWeight: '700', // Bold for badge
        textTransform: 'uppercase',
    },
    idText: {
        fontSize: 12,
        fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }), // Monospace look
        color: 'rgba(255,255,255,0.35)',
        fontWeight: '500',
    },
    title: {
        fontSize: 22, // H1 equivalent for card
        fontWeight: '900', // Black weight
        color: '#F9FAFB',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    description: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.55)',
        lineHeight: 22,
        marginBottom: 20,
        fontWeight: '400',
    },
    gridContainer: {
        flexDirection: 'column', // Changed from row to column to prevent overlap
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 16,
        padding: 16,
        gap: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    gridItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    gridItemTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
    },
    gridLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.40)',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    gridValue: {
        fontSize: 13,
        color: '#F9FAFB',
        fontWeight: '600',
    },
    gridValueSecondary: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.55)',
        fontWeight: '500',
        marginTop: 4,
        lineHeight: 18,
    },
});

export default ServiceSummaryCard;
