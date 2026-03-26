import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { HeartPulse, Clock, ChevronRight } from 'lucide-react-native';

const GlassCard = ({ children, style, onPress }) => (
    <TouchableOpacity style={[styles.card, style]} activeOpacity={0.7} onPress={onPress}>
        {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
        {children}
    </TouchableOpacity>
);

const QuickActionGrid = ({ healthScore, serviceCount, onHealthPress, onHistoryPress }) => {
    const getHealthColor = (score) => {
        if (score >= 80) return '#10B981';
        if (score >= 60) return '#F59E0B';
        if (score >= 40) return '#F97316';
        return '#EF4444';
    };

    const healthColor = getHealthColor(healthScore || 0);

    return (
        <View style={styles.container}>
            <GlassCard onPress={onHealthPress}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: `${healthColor}20` }]}>
                        <HeartPulse size={22} color={healthColor} />
                    </View>
                    <ChevronRight size={16} color="rgba(255,255,255,0.25)" />
                </View>
                <View>
                    <Text style={styles.title}>Salud del Motor</Text>
                    <Text style={styles.subtitle}>{healthScore || 0}% de condición óptima</Text>
                </View>
            </GlassCard>

            <GlassCard onPress={onHistoryPress}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
                        <Clock size={22} color="#FBBF24" />
                    </View>
                    <ChevronRight size={16} color="rgba(255,255,255,0.25)" />
                </View>
                <View>
                    <Text style={styles.title}>Historial</Text>
                    <Text style={styles.subtitle}>{serviceCount || 0} servicios registrados</Text>
                </View>
            </GlassCard>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 24,
        gap: 12,
    },
    card: {
        flex: 1,
        backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'space-between',
        minHeight: 140,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        lineHeight: 16,
    }
});

export default QuickActionGrid;
