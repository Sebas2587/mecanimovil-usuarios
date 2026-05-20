import React, { useState, useEffect, useMemo } from 'react';
import HomeCollapsibleSection from '../shared/HomeCollapsibleSection';
import HomePatrimonyHeroSection from './HomePatrimonyHeroSection';
import HomeTelemetrySection from './HomeTelemetrySection';
import HomeWeatherPreviewSection from './HomeWeatherPreviewSection';
import { formatCLP } from '../shared/homeFormatters';

/**
 * Bloque colapsable: patrimonio + telemetría + clima (fuera del primer viewport).
 */
const HomeVehicleDashboardFold = ({
  visible,
  tripActive,
  expanded: expandedProp,
  onToggle,
  valuation,
  priceDelta,
  healthScore,
  healthScoreColor,
  odometer,
  motorType,
  onPressHealth,
  telemetry,
  weather,
}) => {
  const [expandedInternal, setExpandedInternal] = useState(false);
  const expanded = expandedProp != null ? expandedProp : expandedInternal;

  const handleToggle = () => {
    if (onToggle) onToggle();
    else setExpandedInternal((v) => !v);
  };

  useEffect(() => {
    if (tripActive && expandedProp == null) setExpandedInternal(true);
  }, [tripActive, expandedProp]);

  const collapsedSubtitle = useMemo(() => {
    if (!visible) return '';
    const parts = [];
    if (tripActive) {
      parts.push(`Viaje en curso · ${telemetry.tripKm.toFixed(1)} km`);
    }
    if (healthScore != null) parts.push(`Salud ${Math.round(healthScore)}%`);
    if (valuation > 0) parts.push(formatCLP(valuation));
    if (weather.available && weather.climateRiskPct != null) {
      parts.push(`Clima ${weather.climateRiskPct}% riesgo`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'Valor, salud, viajes y clima de tu auto';
  }, [visible, tripActive, telemetry.tripKm, healthScore, valuation, weather]);

  if (!visible) return null;

  return (
    <HomeCollapsibleSection
      title="Tu vehículo en detalle"
      subtitle={expanded ? 'Patrimonio, viaje GPS y clima' : collapsedSubtitle}
      expanded={expanded}
      onToggle={handleToggle}
      highlightHeader={tripActive && !expanded}
    >
      <HomePatrimonyHeroSection
        valuation={valuation}
        priceDelta={priceDelta}
        healthScore={healthScore}
        healthScoreColor={healthScoreColor}
        odometer={odometer}
        motorType={motorType}
        onPressHealth={onPressHealth}
      />
      <HomeTelemetrySection
        tripActive={telemetry.tripActive}
        tripKm={telemetry.tripKm}
        tripElapsed={telemetry.tripElapsed}
        currentSpeed={telemetry.currentSpeed}
        onStartTrip={telemetry.onStartTrip}
        onStopTrip={telemetry.onStopTrip}
      />
      <HomeWeatherPreviewSection {...weather} />
    </HomeCollapsibleSection>
  );
};

export default React.memo(HomeVehicleDashboardFold);
