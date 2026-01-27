import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MemberCard = ({ user, onEditPress }) => {
    const insets = useSafeAreaInsets();

    // Safe data extraction
    const firstName = user?.firstName || user?.first_name || '';
    const lastName = user?.lastName || user?.last_name || '';
    const displayName = `${firstName} ${lastName}`.trim() || user?.username || 'Usuario';
    const email = user?.email || 'usuario@mecanimovil.com';

    // Profile picture logic
    const profilePic = user?.foto_perfil_url || user?.foto_perfil || user?.foto;
    const hasProfilePic = !!profilePic;

    return (
        <LinearGradient
            colors={['#0F172A', '#1E293B']} // Slate 900 -> 800
            style={[styles.container, { paddingTop: insets.top + 20 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            {/* Header Row */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Mi Perfil</Text>
            </View>

            {/* User Info Row */}
            <View style={styles.userInfoRow}>
                <View style={styles.avatarContainer}>
                    {hasProfilePic ? (
                        <Image source={{ uri: profilePic }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person" size={32} color={COLORS.neutral.gray[400]} />
                        </View>
                    )}

                    <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark" size={12} color="white" />
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
                    <Text style={styles.email} numberOfLines={1}>{email}</Text>

                    <TouchableOpacity style={styles.editButton} onPress={onEditPress} activeOpacity={0.7}>
                        <Ionicons name="pencil" size={12} color="#60A5FA" />
                        <Text style={styles.editButtonText}>Editar Perfil</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Status Footer */}
            <View style={styles.statusFooter}>
                <Text style={styles.statusLabel}>Estado de Cuenta</Text>
                <View style={styles.statusPill}>
                    <Text style={styles.statusText}>Verificado</Text>
                </View>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
        paddingBottom: 32,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    header: {
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.base.white,
    },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: COLORS.base.white,
    },
    avatarPlaceholder: {
        backgroundColor: COLORS.neutral.gray[100],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.base.white,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#10B981', // Emerald 500
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#1E293B', // Matches gradient end
    },
    textContainer: {
        flex: 1,
    },
    name: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.base.white,
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#94A3B8', // Slate 400
        marginBottom: 8,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    editButtonText: {
        fontSize: 14,
        color: '#60A5FA', // Blue 400
        fontWeight: '500',
    },
    statusFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    statusLabel: {
        fontSize: 14,
        color: '#CBD5E1', // Slate 300
        fontWeight: '500',
    },
    statusPill: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)', // Emerald with opacity
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.5)',
    },
    statusText: {
        color: '#34D399', // Emerald 400
        fontWeight: '600',
        fontSize: 12,
    },
});

export default MemberCard;
