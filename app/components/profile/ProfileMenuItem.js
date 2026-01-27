import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';

const ProfileMenuItem = ({
    icon,
    label,
    onPress,
    isLast,
    badge,
    iconColor = COLORS.primary[500],
    iconBgColor = COLORS.primary[50],
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
                    {badge && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{badge}</Text>
                        </View>
                    )}

                    {isSwitch ? (
                        <Switch
                            trackColor={{ false: "#E2E8F0", true: COLORS.primary[200] }}
                            thumbColor={switchValue ? COLORS.primary[500] : "#94A3B8"}
                            ios_backgroundColor="#E2E8F0"
                            onValueChange={onSwitchChange}
                            value={switchValue}
                        />
                    ) : (
                        <Ionicons name="chevron-forward" size={20} color={COLORS.neutral.gray[400]} />
                    )}
                </View>
            </TouchableOpacity>

            {!isLast && <View style={styles.separator} />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: COLORS.base.white,
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
        color: COLORS.base.inkBlack,
    },
    rightContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        backgroundColor: COLORS.error[500],
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
        height: 1,
        backgroundColor: COLORS.neutral.gray[100],
        marginLeft: 64, // Align with text, skipping icon
    },
});

export default ProfileMenuItem;
