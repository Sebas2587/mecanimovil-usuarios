import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';

/**
 * ActiveRequestCard
 * Displays a high-priority active request for the vehicle.
 * Includes a pulsing status indicator and action button.
 */
const ActiveRequestCard = ({ request, onPress }) => {
    const theme = useTheme();
    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    const styles = getStyles(colors, typography, spacing, borders);

    // Animation for pulsing dot
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.4,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [pulseAnim]);

    if (!request) return null;

    // Extract data safely
    const serviceName = request.servicio_solicitado || request.titulo || 'Servicio Mecánico';
    const status = request.estado || 'Pendiente';
    const offersCount = request.ofertas_count || request.ofertas?.length || 0;

    // Format info based on status
    let statusText = 'Solicitud Activa';
    let statusColor = colors.primary?.[400] || '#3397C1';
    let statusIcon = 'time-outline';

    if (status === 'pendiente') {
        statusText = 'Buscando mecánicos...';
        statusIcon = 'search-outline';
    } else if (status === 'confirmado') {
        statusText = 'Servicio Confirmado';
        statusColor = colors.success?.[500] || '#10B981';
        statusIcon = 'calendar-outline';
    } else if (status === 'en_camino') {
        statusText = 'Mecánico en camino';
        statusColor = colors.warning?.[500] || '#F59E0B';
        statusIcon = 'bicycle-outline';
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.statusContainer}>
                    <Animated.View style={[styles.pulseDot, { opacity: pulseAnim, backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                </View>
                <Text style={styles.dateText}>Hoy</Text>
            </View>

            <Text style={styles.title} numberOfLines={1}>{serviceName}</Text>

            {offersCount > 0 ? (
                <Text style={styles.subtitle}>
                    {offersCount} {offersCount === 1 ? 'mecánico ha' : 'mecánicos han'} ofertado
                </Text>
            ) : (
                <Text style={styles.subtitle}>Esperando ofertas...</Text>
            )}

            <TouchableOpacity
                style={styles.button}
                activeOpacity={0.8}
                onPress={onPress}
            >
                <Text style={styles.buttonText}>
                    {status === 'pendiente' ? 'Ver Ofertas' : 'Ver Detalles'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={colors.base?.white || '#FFFFFF'} />
            </TouchableOpacity>
        </View>
    );
};

const getStyles = (colors, typography, spacing, borders) => StyleSheet.create({
    container: {
        backgroundColor: colors.background?.paper || '#FFFFFF',
        borderRadius: borders.radius?.lg || 16,
        padding: spacing.md || 16,
        marginHorizontal: spacing.md || 16,
        marginTop: -40, // Negative margin to overlap header slightly
        marginBottom: spacing.md || 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs || 8,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: typography.fontSize?.xs || 12,
        fontWeight: typography.fontWeight?.semibold || '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dateText: {
        fontSize: typography.fontSize?.xs || 12,
        color: colors.neutral?.gray?.[400] || '#9CA3AF',
    },
    title: {
        fontSize: typography.fontSize?.lg || 18,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.text?.primary || '#111827',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: typography.fontSize?.sm || 14,
        color: colors.text?.secondary || '#6B7280',
        marginBottom: spacing.md || 16,
    },
    button: {
        backgroundColor: '#2563EB', // Blue-600
        borderRadius: borders.radius?.md || 8,
        paddingVertical: spacing.sm || 10,
        paddingHorizontal: spacing.md || 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: colors.base?.white || '#FFFFFF',
        fontWeight: typography.fontWeight?.semibold || '600',
        fontSize: typography.fontSize?.sm || 14,
        marginRight: 6,
    },
});

export default ActiveRequestCard;
