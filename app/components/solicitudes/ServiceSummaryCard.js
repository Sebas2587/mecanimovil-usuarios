import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';

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
                return { color: '#EF4444', label: 'Urgencia Alta', bg: '#FEE2E2', icon: 'lightning-bolt' };
            case 'media':
                return { color: '#F59E0B', label: 'Urgencia Media', bg: '#FEF3C7', icon: 'clock-alert-outline' };
            default:
                return { color: '#10B981', label: 'Urgencia Baja', bg: '#D1FAE5', icon: 'calendar-clock' };
        }
    };

    const urgencyConfig = getUrgencyConfig(solicitud.urgencia);

    const formatDate = (dateString) => {
        if (!dateString) return 'Pendiente';
        return new Date(dateString).toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'long'
        });
    };

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
                {/* Fecha Creación */}
                <View style={styles.gridItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="calendar-outline" size={18} color={colors.text?.secondary || '#6B7280'} />
                    </View>
                    <View>
                        <Text style={styles.gridLabel}>Publicado</Text>
                        <Text style={styles.gridValue}>{formatDate(solicitud.fecha_creacion)}</Text>
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
                            {solicitud.preferencia_horario || 'Por coordinar'}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const getStyles = (colors, typography, spacing, borders) => StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        // Sombra suave elevation 2
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.neutral?.gray?.[100] || '#F3F4F6',
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
        color: colors.text?.tertiary || '#9CA3AF',
        fontWeight: '500',
    },
    title: {
        fontSize: 22, // H1 equivalent for card
        fontWeight: '900', // Black weight
        color: '#0F172A', // Slate-900
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    description: {
        fontSize: 14,
        color: '#475569', // Slate-600
        lineHeight: 22,
        marginBottom: 20,
        fontWeight: '400',
    },
    gridContainer: {
        flexDirection: 'column', // Changed from row to column to prevent overlap
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        gap: 16,
    },
    gridItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
    gridLabel: {
        fontSize: 10,
        color: '#64748B', // Slate-500
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    gridValue: {
        fontSize: 13,
        color: '#334155', // Slate-700
        fontWeight: '600',
    },
});

export default ServiceSummaryCard;
