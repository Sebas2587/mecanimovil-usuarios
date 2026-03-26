import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';

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
    let statusColor = '#93C5FD';

    if (status === 'pendiente') {
        statusText = 'Buscando mecánicos...';
    } else if (status === 'confirmado') {
        statusText = 'Servicio Confirmado';
        statusColor = '#6EE7B7';
    } else if (status === 'en_camino') {
        statusText = 'Mecánico en camino';
        statusColor = '#FBBF24';
    }

    return (
        <View style={styles.container}>
            {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
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
                <LinearGradient colors={['#6366F1', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                <Text style={styles.buttonText}>{status === 'pendiente' ? 'Ver Ofertas' : 'Ver Detalles'}</Text>
                <ArrowRight size={16} color="#FFF" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginTop: -40,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
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
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dateText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.35)',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 16,
    },
    button: {
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
        marginRight: 6,
    },
});

export default ActiveRequestCard;
