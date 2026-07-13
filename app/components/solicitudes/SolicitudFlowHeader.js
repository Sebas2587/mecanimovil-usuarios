import React from 'react';
import { StatusBar } from 'react-native';
import FlowHeader from '../navigation/FlowHeader';
import { COLORS } from '../../design-system/tokens';

/**
 * Wrapper legacy → FlowHeader (Airbnb wizard)
 */
export default function SolicitudFlowHeader({
  title,
  subtitle,
  onBack,
  step,
  totalSteps,
  onClose,
}) {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
      <FlowHeader
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        onClose={onClose}
        step={step}
        totalSteps={totalSteps}
      />
    </>
  );
}
