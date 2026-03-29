import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { DollarSign, ChevronRight, Pencil } from 'lucide-react-native';

const VehicleValuationCard = ({ marketValue, suggestedValue, onSellPress, onEditPress }) => {
    const formatCurrency = (value) =>
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(value || 0);

    return (
        <View style={styles.container}>
            {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <DollarSign size={18} color="#6EE7B7" />
                </View>
                <Text style={styles.title}>Gestión de Activo</Text>
            </View>

            <View style={styles.valuesContainer}>
                <View style={styles.valueRow}>
                    <Text style={styles.valueLabel}>Valor de Mercado</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.valueText}>{formatCurrency(marketValue)}</Text>
                        {(marketValue === 0 || marketValue === '0') && onEditPress && (
                            <TouchableOpacity onPress={onEditPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <Pencil size={12} color="#93C5FD" />
                                <Text style={{ color: '#93C5FD', fontSize: 12, fontWeight: '600' }}>Establecer Valor</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.valueRow}>
                    <View>
                        <Text style={styles.valueLabel}>Valor Sugerido Certificado</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>+5% por Salud</Text>
                        </View>
                    </View>
                    <Text style={[styles.valueText, styles.highlightValue]}>{formatCurrency(suggestedValue)}</Text>
                </View>
            </View>

            <TouchableOpacity onPress={onSellPress} activeOpacity={0.8}>
                <LinearGradient
                    colors={['#007EA7', '#00A8E8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButton}
                >
                    <Text style={styles.actionButtonText}>Gestionar Venta</Text>
                    <ChevronRight size={16} color="#FFF" />
                </LinearGradient>
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
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(16,185,129,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    valuesContainer: {
        marginBottom: 16,
    },
    valueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 4,
    },
    valueLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
    },
    valueText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    highlightValue: {
        color: '#6EE7B7',
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginVertical: 10,
    },
    badge: {
        backgroundColor: 'rgba(16,185,129,0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginTop: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6EE7B7',
    },
    actionButton: {
        borderRadius: 12,
        paddingVertical: 13,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
        marginRight: 6,
    }
});

export default VehicleValuationCard;
