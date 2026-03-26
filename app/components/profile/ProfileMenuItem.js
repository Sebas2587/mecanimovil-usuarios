import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ProfileMenuItem = ({
    icon,
    label,
    onPress,
    isLast,
    badge,
    iconColor = '#93C5FD',
    iconBgColor = 'rgba(147,197,253,0.15)',
    isSwitch,
    switchValue,
    onSwitchChange
}) => {
    return (
        <View>
            <TouchableOpacity
                style={styles.container}
                onPress={onPress}
                activeOpacity={isSwitch ? 1 : 0.7}
                disabled={isSwitch}
            >
                <View style={styles.leftContent}>
                    <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
                        <Ionicons name={icon} size={18} color={iconColor} />
                    </View>
                    <Text style={styles.label}>{label}</Text>
                </View>

                <View style={styles.rightContent}>
                    {badge ? (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{badge}</Text>
                        </View>
                    ) : null}

                    {isSwitch ? (
                        <Switch
                            trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(16,185,129,0.45)' }}
                            thumbColor={switchValue ? '#6EE7B7' : 'rgba(255,255,255,0.55)'}
                            ios_backgroundColor="rgba(255,255,255,0.12)"
                            onValueChange={onSwitchChange}
                            value={switchValue}
                        />
                    ) : (
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.35)" />
                    )}
                </View>
            </TouchableOpacity>

            {!isLast ? <View style={styles.separator} /> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'transparent',
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F9FAFB',
    },
    rightContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        backgroundColor: 'rgba(248,113,113,0.85)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginLeft: 64,
    },
});

export default ProfileMenuItem;
