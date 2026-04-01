import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const GLASS_BG = Platform.select({
    ios: 'rgba(255,255,255,0.06)',
    android: 'rgba(255,255,255,0.10)',
    default: 'rgba(255,255,255,0.08)',
});

const ProviderHeader = ({
  provider,
  providerType,
  onShare,
  onToggleFavorite,
  isFavorite = false,
  onBack,
  showBackButton = true,
}) => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const name = provider?.nombre || 'Proveedor Profesional';
    const resolvedType = providerType || (provider?.tipo === 'taller' ? 'taller' : 'mecanico');
    const type = resolvedType === 'taller' ? 'Taller' : 'Mecánico a Domicilio';
    const location = provider?.direccion_fisica?.comuna || provider?.comuna || '';
    const rating = provider?.calificacion_promedio ?? '';
    const jobs = provider?.servicios_completados ?? provider?.trabajos_realizados ?? '';
    const experience = provider?.experiencia_anos ?? provider?.experiencia_anios ?? '';

    // Cover & Avatar fallbacks
    const coverImage = provider?.foto_portada || 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?q=80&w=1000&auto=format&fit=crop';
    const avatarImage = provider?.foto_perfil || provider?.usuario?.foto_perfil || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=256&auto=format&fit=crop';

    return (
        <View style={styles.container}>
            {/* Cover Image */}
            <View style={styles.coverContainer}>
                <Image source={{ uri: coverImage }} style={styles.coverImage} resizeMode="cover" />
                <View style={styles.coverOverlay} pointerEvents="none" />

                {/* Top Bar Actions */}
                <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                    {showBackButton ? (
                        <TouchableOpacity style={styles.iconButton} onPress={onBack || (() => navigation.goBack())}>
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.iconButton} accessibilityElementsHidden />
                    )}
                    <View style={styles.rightActions}>
                        {onShare ? (
                            <TouchableOpacity style={styles.iconButton} onPress={onShare}>
                                <Ionicons name="share-outline" size={24} color="white" />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.iconButton} />
                        )}
                        {onToggleFavorite && (
                            <TouchableOpacity style={styles.iconButton} onPress={onToggleFavorite}>
                                <Ionicons
                                    name={isFavorite ? 'heart' : 'heart-outline'}
                                    size={24}
                                    color={isFavorite ? COLORS.error.main : 'white'}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* Profile Card Overlay */}
            <View style={styles.profileCard}>
                {Platform.OS === 'ios' && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
                <View style={styles.avatarRow}>
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: avatarImage }} style={styles.avatar} />
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark" size={12} color="white" />
                        </View>
                    </View>
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Disponible hoy</Text>
                    </View>
                </View>

                <Text style={styles.name}>{name}</Text>
                <Text style={styles.type}>{[type, location].filter(Boolean).join(' • ') || type}</Text>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <View style={styles.ratingContainer}>
                            <Ionicons name="star" size={16} color="#FFB84D" />
                            <Text style={styles.statValue}>{rating !== '' ? rating : '—'}</Text>
                        </View>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{jobs !== '' ? `${jobs}+` : '—'}</Text>
                        <Text style={styles.statLabel}>Trabajos</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{experience !== '' ? `${experience} años` : '—'}</Text>
                        <Text style={styles.statLabel}>Experiencia</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    coverContainer: {
        height: 180,
        width: '100%',
        position: 'relative',
        backgroundColor: COLORS.neutral.gray[900],
    },
    coverImage: {
        width: '100%',
        height: '100%',
        opacity: 0.8,
    },
    coverOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingBottom: 8,
        zIndex: 10,
    },
    rightActions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileCard: {
        marginTop: -40,
        marginHorizontal: 16,
        backgroundColor: GLASS_BG,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
    },
    avatarRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'rgba(147,197,253,0.95)',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(3,7,18,0.9)',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16,185,129,0.16)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(110,231,183,0.25)',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#6EE7B7',
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6EE7B7',
    },
    name: {
        fontSize: 20,
        fontWeight: '700',
        color: '#F9FAFB',
        marginBottom: 4,
    },
    type: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.55)',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        paddingTop: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F9FAFB',
        marginLeft: 4,
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.45)',
    },
    statDivider: {
        width: 1,
        height: '80%',
        backgroundColor: 'rgba(255,255,255,0.10)',
        alignSelf: 'center',
    },
});

export default ProviderHeader;
