import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';

const ReviewCard = ({ review }) => {
    const {
        cliente_nombre,
        cliente_avatar,
        calificacion,
        comentario,
        fecha_hora_resena,
        service_context,
        photos = []
    } = review;

    // Relative Time Logic (Simple approximation)
    const getRelativeTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Hace un momento';
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `Hace ${diffInHours} h`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) return `Hace ${diffInDays} días`;
        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) return `Hace ${diffInMonths} meses`;
        return `Hace ${Math.floor(diffInDays / 365)} años`;
    };

    return (
        <View style={styles.cardContainer}>
            {/* Header Section */}
            <View style={styles.headerRow}>
                <View style={styles.userInfoLeft}>
                    <Image
                        source={{ uri: cliente_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(cliente_nombre || 'User')}&background=random` }}
                        style={styles.avatar}
                        contentFit="cover"
                        transition={200}
                    />
                    <View style={styles.nameColumn}>
                        <Text style={styles.userName}>{cliente_nombre}</Text>
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Ionicons
                                    key={star}
                                    name="star"
                                    size={10}
                                    color={star <= calificacion ? "#F59E0B" : COLORS.neutral.gray[300]} // Yellow-500 or Gray-300
                                />
                            ))}
                        </View>
                    </View>
                </View>
                <Text style={styles.relativeDate}>{getRelativeTime(fecha_hora_resena)}</Text>
            </View>

            {/* Context Badge */}
            {service_context && (
                <View style={styles.contextBadge}>
                    <Ionicons name="construct" size={12} color={COLORS.neutral.gray[500]} style={styles.contextIcon} />
                    <Text style={styles.contextText}>
                        {service_context.service_name} • {service_context.vehicle_model}
                    </Text>
                </View>
            )}

            {/* Comment Body */}
            <Text style={styles.commentText}>{comentario}</Text>

            {/* Photos Gallery */}
            {photos && photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
                    {photos.map((photoUrl, index) => (
                        <Image
                            key={index}
                            source={{ uri: photoUrl }}
                            style={styles.photoThumbnail}
                            contentFit="cover"
                        />
                    ))}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: COLORS.base.white,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        // Soft Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        // Subtle Border
        borderWidth: 1,
        borderColor: COLORS.neutral.gray[100], // #E5E7EB approximation
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    userInfoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: COLORS.neutral.gray[100],
    },
    nameColumn: {
        justifyContent: 'center',
    },
    userName: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.neutral.gray[900], // Darkest gray
        marginBottom: 2,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 2,
    },
    relativeDate: {
        fontSize: 12,
        color: COLORS.neutral.gray[400], // Gray-400
    },
    contextBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.neutral.gray[50], // Very light gray bg
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    contextIcon: {
        marginRight: 6,
    },
    contextText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.neutral.gray[600], // Medium gray text
    },
    commentText: {
        fontSize: 14,
        color: COLORS.neutral.gray[700], // #4B5563
        lineHeight: 20,
    },
    photosContainer: {
        marginTop: 12,
        flexDirection: 'row',
    },
    photoThumbnail: {
        width: 64, // w-16
        height: 64, // h-16
        borderRadius: 8,
        marginRight: 8,
        backgroundColor: COLORS.neutral.gray[100],
        borderWidth: 1,
        borderColor: COLORS.neutral.gray[200],
    }
});

export default ReviewCard;
