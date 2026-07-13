/**
 * Fix web: Lucide/SVG con fill negro por defecto del motor SVG.
 * Solo anula fills negros accidentales; respeta fills brand intencionales (★, checks sólidos).
 */
import { Platform } from 'react-native';

const STYLE_ID = 'mecanimovil-lucide-fill-fix';

export function installLucideWebFillFix() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* Outline Lucide: nunca relleno negro accidental */
    svg[stroke][fill="black"],
    svg[stroke][fill="#000"],
    svg[stroke][fill="#000000"],
    svg[stroke][fill="rgb(0, 0, 0)"],
    svg[stroke][fill="rgba(0, 0, 0, 1)"] {
      fill: none !important;
    }
  `;
  document.head.appendChild(style);
}
