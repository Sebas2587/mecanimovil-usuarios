import React from 'react';
import { StyleSheet } from 'react-native';
import { SPACING } from '../../../design-system/tokens';
import SegmentedControl from '../../base/SegmentedControl/SegmentedControl';
import { EXPLORE_MODE_CERCA, EXPLORE_MODE_PARA_TI } from './exploreProvidersConstants';

const SEGMENTS = [
  { id: EXPLORE_MODE_PARA_TI, label: 'Para ti' },
  { id: EXPLORE_MODE_CERCA, label: 'Cerca de ti' },
];

const ExploreModeSegment = ({ value, onChange, segments = SEGMENTS, style }) => (
  <SegmentedControl
    segments={segments}
    value={value}
    onChange={onChange}
    style={[styles.control, style]}
  />
);

const styles = StyleSheet.create({
  control: {
    marginBottom: SPACING.sm,
  },
});

export default React.memo(ExploreModeSegment);
