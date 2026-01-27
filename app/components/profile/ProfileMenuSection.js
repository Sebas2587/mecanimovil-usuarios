import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../design-system/tokens/colors';

const ProfileMenuSection = ({ title, children, style }) => {
    return (
        <View style={[styles.container, style]}>
            {title && <Text style={styles.title}>{title}</Text>}
            <View style={styles.card}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    title: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.neutral.gray[500],
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 12,
        marginLeft: 4,
    },
    card: {
        backgroundColor: COLORS.base.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.neutral.gray[200],
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
});

export default ProfileMenuSection;
