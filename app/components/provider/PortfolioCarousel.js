import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';

const GLASS_BG = Platform.select({
    ios: 'rgba(255,255,255,0.06)',
    android: 'rgba(255,255,255,0.10)',
    default: 'rgba(255,255,255,0.08)',
});

const PortfolioCarousel = ({ portfolio }) => {
    if (!portfolio || portfolio.length === 0) return null;

    const items = portfolio;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Ionicons name="images" size={18} color="#93C5FD" />
                </View>
                <Text style={styles.title}>Trabajos Realizados</Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={Platform.OS === 'web' ? styles.horizontalScrollWeb : undefined}
            >
                {items.map((item, index) => (
                    <TouchableOpacity key={item.id || index} style={styles.card} activeOpacity={0.9}>
                        <Image source={{ uri: item.image || item.url }} style={styles.image} resizeMode="cover" />
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle} numberOfLines={1}>{item.title || item.descripcion || 'Trabajo realizado'}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 16,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(147,197,253,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F9FAFB',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    card: {
        width: 240,
        marginRight: 16,
        backgroundColor: GLASS_BG,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    image: {
        width: '100%',
        height: 180, // 4:3ish ratio relative to width
    },
    cardContent: {
        padding: 12,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.75)',
    },
    /** Deja el scroll vertical (rueda/trackpad) para el contenedor padre en web. */
    horizontalScrollWeb: {
        touchAction: 'pan-x',
        overscrollBehaviorX: 'contain',
    },
});

export default PortfolioCarousel;
