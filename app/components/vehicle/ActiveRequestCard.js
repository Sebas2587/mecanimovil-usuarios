import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { COLORS } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';

const ActiveRequestCard = ({ request, onPress }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();
    }, [pulseAnim]);

    if (!request) return null;

    const serviceName = request.servicio_solicitado || request.titulo || 'Servicio Mecánico';
    const status = request.estado || 'Pendiente';
    const offersCount = request.ofertas_count || request.ofertas?.length || 0;

    let statusText = 'Solicitud Activa';
    let statusColor = COLORS.primary[500];

    if (status === 'pendiente') {
        statusText = 'Buscando mecánicos...';
    } else if (status === 'confirmado') {
        statusText = 'Servicio Confirmado';
        statusColor = COLORS.success[600];
    } else if (status === 'en_camino') {
        statusText = 'Mecánico en camino';
        statusColor = COLORS.warning[600];
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

            <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={onPress}>
                <Text style={styles.buttonText}>{status === 'pendiente' ? 'Ver Ofertas' : 'Ver Detalles'}</Text>
                <ArrowRight size={16} color={COLORS.text.inverse} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.card.lg,
        padding: SPACING.md,
        marginHorizontal: SPACING.container.horizontal,
        marginTop: -40,
        marginBottom: SPACING.md,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        overflow: 'hidden',
        ...SHADOWS.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
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
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dateText: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.tertiary,
    },
    title: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xxs,
    },
    subtitle: {
        fontSize: TYPOGRAPHY.fontSize.base,
        color: COLORS.text.secondary,
        marginBottom: SPACING.md,
    },
    button: {
        borderRadius: BORDERS.radius.button.md,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.primary[500],
    },
    buttonText: {
        color: COLORS.text.inverse,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        fontSize: TYPOGRAPHY.fontSize.base,
        marginRight: 6,
    },
});

export default ActiveRequestCard;
