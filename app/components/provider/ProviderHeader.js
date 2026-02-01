import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';
import { useNavigation } from '@react-navigation/native';

const ProviderHeader = ({ provider, onShare, onToggleFavorite, isFavorite = false }) => {
    const navigation = useNavigation();

    const name = provider?.nombre || 'Proveedor Profesional';
    const type = provider?.tipo === 'taller' ? 'Taller Certificado' : 'Mecánico Experto';
    const location = provider?.direccion_fisica?.comuna || provider?.comuna || '';
    const rating = provider?.calificacion_promedio ?? '';
    const jobs = provider?.servicios_completados ?? provider?.trabajos_realizados ?? '';
    const experience = provider?.experiencia_anios ?? '';

    // Cover & Avatar fallbacks
    const coverImage = provider?.foto_portada || 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?q=80&w=1000&auto=format&fit=crop';
    const avatarImage = provider?.foto_perfil || provider?.usuario?.foto_perfil || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=256&auto=format&fit=crop';

    return (
        <View style={styles.container}>
            {/* Cover Image */}
            <View style={styles.coverContainer}>
                <Image source={{ uri: coverImage }} style={styles.coverImage} resizeMode="cover" />
                <View style={styles.coverOverlay} />

                {/* Top Bar Actions */}
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.rightActions}>
                        <TouchableOpacity style={styles.iconButton} onPress={onShare}>
                            <Ionicons name="share-outline" size={24} color="white" />
                        </TouchableOpacity>
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
        top: Platform.OS === 'ios' ? 44 : 20,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
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
        backgroundColor: COLORS.base.white,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
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
        borderColor: COLORS.base.white,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.primary[500], // Blue
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.base.white,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.success[50],
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.success[100],
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.success[500],
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.success[700],
    },
    name: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.base.inkBlack,
        marginBottom: 4,
    },
    type: {
        fontSize: 14,
        color: COLORS.text.secondary,
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: COLORS.neutral.gray[100],
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
        color: COLORS.base.inkBlack,
        marginLeft: 4,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.text.secondary,
    },
    statDivider: {
        width: 1,
        height: '80%',
        backgroundColor: COLORS.neutral.gray[200],
        alignSelf: 'center',
    },
});

export default ProviderHeader;
