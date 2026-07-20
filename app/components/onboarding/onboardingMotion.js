/**
 * Motion ligero del onboarding.
 * Solo opacity por scroll — sin parallax/scale (evita jank y carga en JS).
 */

export function slideNeighborRange(index, slideWidth) {
  const w = slideWidth;
  return [(index - 1) * w, index * w, (index + 1) * w];
}

/** Fade suave al cambiar de slide. */
export function interpolateFade(scrollX, index, slideWidth) {
  return scrollX.interpolate({
    inputRange: slideNeighborRange(index, slideWidth),
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
}
