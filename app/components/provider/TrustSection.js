import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';

const TrustSection = ({ documents }) => {
    // Mock data if empty
    const docs = documents && documents.length > 0 ? documents : [
        { id: 1, label: 'Identidad Verificada' },
        { id: 2, label: 'Certificación Profesional' },
        { id: 3, label: 'Antecedentes Limpios' },
        { id: 4, label: 'Garantía MecaniMóvil' }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Ionicons name="shield-checkmark" size={18} color={COLORS.primary[500]} />
                </View>
                <Text style={styles.title}>Documentación y Garantías</Text>
            </View>

            <View style={styles.card}>
                {docs.map((doc, index) => (
                    <View key={doc.id || index} style={[
                        styles.itemRow,
                        index === docs.length - 1 && styles.lastItemRow
                    ]}>
                        <Text style={styles.itemText}>{doc.nombre || doc.label}</Text>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.success[500]} />
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
        marginBottom: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary[50], // Light Blue
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.base.inkBlack,
    },
    card: {
        backgroundColor: COLORS.base.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.neutral.gray[200],
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.neutral.gray[100],
    },
    lastItemRow: {
        borderBottomWidth: 0,
    },
    itemText: {
        fontSize: 14,
        color: COLORS.text.secondary,
        fontWeight: '500',
    },
});

export default TrustSection;
