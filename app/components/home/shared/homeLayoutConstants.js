import { Dimensions, Platform } from 'react-native';
import { SPACING } from '../../../design-system/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const H_PAD = SPACING.container.horizontal;
export const CARD_GAP = 12;
export const TAB_BAR_BASE_HEIGHT = 64;
export const SCROLL_BOTTOM_GAP = 10;

export const LAYOUT_WIDTH =
  Platform.OS === 'web' ? Math.min(SCREEN_WIDTH, 480) : SCREEN_WIDTH;

export const GRID_CARD_W = (LAYOUT_WIDTH - H_PAD * 2 - CARD_GAP) / 2;
export const QUICK_ACTION_CARD_W = GRID_CARD_W;
export const QUICK_ACTION_SNAP_INTERVAL = QUICK_ACTION_CARD_W + CARD_GAP;

export { SCREEN_WIDTH };
