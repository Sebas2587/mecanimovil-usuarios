import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';

const TrustSection = ({ documents }) => {
    if (!documents || documents.length === 0) return null;

    // Map document types to visual badges
    const getVerificationBadges = (docs) => {
        const badges = [];

        docs.forEach(doc => {
            const docName = doc.nombre || doc.tipo_documento || 'Documento Verificado';
            const docType = docName.toLowerCase();

            // Determine icon based on document type while keeping the REAL document name
            let icon = 'checkmark-circle';
            let color = COLORS.success[500];

            if (docType.includes('identidad') || docType.includes('cedula') || docType.includes('rut')) {
                icon = 'person-circle';
                color = COLORS.success[500];
            } else if (docType.includes('certificacion') || docType.includes('certificado') || docType.includes('titulo')) {
                icon = 'ribbon';
                color = COLORS.primary[500];
            } else if (docType.includes('antecedente') || docType.includes('penal')) {
                icon = 'shield-checkmark';
                color = COLORS.success[500];
            } else if (docType.includes('garantia') || docType.includes('seguro')) {
                icon = 'checkmark-done-circle';
                color = COLORS.primary[500];
            } else if (docType.includes('licencia') || docType.includes('permiso')) {
                icon = 'card';
                color = COLORS.primary[500];
            }

            // Always use the real document name from backend
            badges.push({
                icon,
                label: docName,
                color
            });
        });

        return badges;
    };

    const badges = getVerificationBadges(documents);
    if (badges.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Ionicons name="shield-checkmark" size={18} color={COLORS.primary[500]} />
                </View>
                <Text style={styles.title}>Verificaciones</Text>
            </View>

            <View style={styles.badgesGrid}>
                {badges.map((badge, index) => (
                    <View key={index} style={styles.badgeCard}>
                        <View style={[styles.badgeIconContainer, { backgroundColor: `${badge.color}15` }]}>
                            <Ionicons name={badge.icon} size={24} color={badge.color} />
                        </View>
                        <Text style={styles.badgeLabel}>{badge.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        marginBottom: 24,
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
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    badgeCard: {
        width: '48%',
        backgroundColor: COLORS.base.white,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.neutral.gray[100],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    badgeIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    badgeLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text.primary,
        textAlign: 'center',
        lineHeight: 16,
    },
});

export default TrustSection;
