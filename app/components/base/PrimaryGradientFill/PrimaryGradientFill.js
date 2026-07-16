import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS } from '../../../design-system/tokens/gradients';

/**
 * Superficie con degradado primario Tinder (#FD2B7B → #FF7158).
 * SOLO botones/CTAs primarios. Tabs y chips de filtro no usan este fill.
 */
const PrimaryGradientFill = ({ style, children, colors = GRADIENTS.guestCta }) => (
  <LinearGradient
    colors={colors}
    locations={GRADIENTS.guestCtaLocations}
    start={{ x: 0, y: 0.5 }}
    end={{ x: 1, y: 0.5 }}
    style={style}
  >
    {children}
  </LinearGradient>
);

export default PrimaryGradientFill;
