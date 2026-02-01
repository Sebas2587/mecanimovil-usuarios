import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';

const PortfolioCarousel = ({ portfolio }) => {
    if (!portfolio || portfolio.length === 0) return null;

    const items = portfolio;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Ionicons name="images" size={18} color={COLORS.primary[500]} />
                </View>
                <Text style={styles.title}>Trabajos Realizados</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
        backgroundColor: COLORS.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.base.inkBlack,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    card: {
        width: 240,
        marginRight: 16,
        backgroundColor: COLORS.base.white,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.neutral.gray[200],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
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
        color: COLORS.text.primary,
    },
});

export default PortfolioCarousel;
