import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

const GLASS_BG = Platform.select({
    ios: 'rgba(255,255,255,0.06)',
    android: 'rgba(255,255,255,0.10)',
    default: 'rgba(255,255,255,0.08)',
});

const ProfileMenuSection = ({ title, children, style }) => {
    return (
        <View style={[styles.container, style]}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            <View style={styles.card}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 22,
    },
    title: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.45)',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 10,
        marginLeft: 4,
    },
    card: {
        backgroundColor: GLASS_BG,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
    },
});

export default ProfileMenuSection;
