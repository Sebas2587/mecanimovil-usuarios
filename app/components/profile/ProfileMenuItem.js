import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import Icon from '../base/Icon/Icon';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';

const ProfileMenuItem = ({
  icon,
  label,
  onPress,
  isLast,
  badge,
  iconColor = COLORS.text.primary,
  iconBgColor = COLORS.neutral.gray[100],
  isSwitch,
  switchValue,
  onSwitchChange,
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
          <View style={styles.iconContainer}>
            <Icon name={icon} size={18} color={iconColor} />
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
              trackColor={{ false: COLORS.neutral.gray[200], true: COLORS.success[200] }}
              thumbColor={switchValue ? COLORS.success[600] : COLORS.neutral.gray[400]}
              ios_backgroundColor={COLORS.neutral.gray[200]}
              onValueChange={onSwitchChange}
              value={switchValue}
            />
          ) : (
            <Icon name="chevron-forward" size={20} color={COLORS.text.tertiary} />
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
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: COLORS.error.main,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.sm,
  },
  badgeText: {
    color: COLORS.text.onPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
    marginLeft: 64,
  },
});

export default ProfileMenuItem;
