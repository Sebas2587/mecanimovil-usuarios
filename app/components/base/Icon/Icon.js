/**
 * Icon Component - MecaniMóvil
 * Wrapper Lucide con mapeo de nombres legacy (Ionicons / Material).
 */

import React, { memo } from 'react';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpCircle,
  Award,
  BarChart3,
  Bell,
  BellOff,
  Bookmark,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  Camera,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Chrome,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  CirclePlus,
  CircleX,
  Clock,
  ClockAlert,
  CloudUpload,
  CreditCard,
  Download,
  Droplet,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  Gauge,
  Headphones,
  Heart,
  Home,
  Image as ImageIcon,
  Info,
  KeyRound,
  Lightbulb,
  Link,
  ListChecks,
  Lock,
  Mail,
  Map,
  MapPin,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Minus,
  Navigation,
  Pencil,
  Phone,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  ScanLine,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Square,
  SquareCheck,
  Star,
  StarHalf,
  Store,
  Tag,
  Tags,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  Wallet,
  Wifi,
  WifiOff,
  Wrench,
  X,
  Zap,
} from 'lucide-react-native';
import { COLORS } from '../../../design-system/tokens';
import { LUCIDE_FILL_NONE, LUCIDE_STROKE_WIDTH } from '../../../design-system/icons/lucideDefaults';

export const ICON_STROKE_WIDTH = LUCIDE_STROKE_WIDTH;

const LEGACY_MAP = {
  'add-circle': CirclePlus,
  'add-circle-outline': CirclePlus,
  add: Plus,
  'alert-circle': CircleAlert,
  'alert-circle-outline': CircleAlert,
  analytics: BarChart3,
  'arrow-back': ArrowLeft,
  'arrow-down-circle-outline': ArrowDownCircle,
  'arrow-forward': ArrowRight,
  'arrow-up-circle-outline': ArrowUpCircle,
  bookmark: Bookmark,
  briefcase: Briefcase,
  'briefcase-outline': Briefcase,
  build: Wrench,
  'bulb-outline': Lightbulb,
  business: Building2,
  'business-outline': Building2,
  calendar: CalendarDays,
  'calendar-clock': CalendarClock,
  'calendar-outline': CalendarDays,
  camera: Camera,
  car: Car,
  'car-outline': Car,
  'car-sport': Car,
  'car-sport-outline': Car,
  card: CreditCard,
  'card-outline': CreditCard,
  check: Check,
  checkmark: Check,
  'checkmark-circle': CheckCircle2,
  'checkmark-circle-outline': CircleCheck,
  'checkmark-done': ListChecks,
  'checkmark-done-circle-outline': CircleCheck,
  'checkmark-done-outline': ListChecks,
  'chevron-back': ChevronLeft,
  'chevron-down': ChevronDown,
  'chevron-forward': ChevronRight,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'clock-alert-outline': ClockAlert,
  close: X,
  'close-circle': CircleX,
  'cloud-upload-outline': CloudUpload,
  cog: Settings,
  'cog-outline': Settings,
  'compare-arrows': ArrowLeftRight,
  construct: Wrench,
  'construct-outline': Wrench,
  'create-outline': Pencil,
  'directions-car': Car,
  'document-text': FileText,
  'document-text-outline': FileText,
  'edit-3': Pencil,
  'eye-off-outline': EyeOff,
  'eye-outline': Eye,
  'folder-open-outline': FolderOpen,
  'hardware-chip-outline': Smartphone,
  'headset-outline': Headphones,
  heart: Heart,
  'heart-outline': Heart,
  home: Home,
  'home-outline': Home,
  'help-circle-outline': CircleHelp,
  'image-outline': ImageIcon,
  images: ImageIcon,
  'information-circle': Info,
  'information-circle-outline': Info,
  key: KeyRound,
  'key-outline': KeyRound,
  'lightbulb-outline': Lightbulb,
  'lightning-bolt': Zap,
  'link-outline': Link,
  location: MapPin,
  'location-on': MapPin,
  'location-outline': MapPin,
  'lock-closed-outline': Lock,
  'logo-apple': Smartphone,
  'logo-google': Chrome,
  'logo-google-playstore': Download,
  'logo-whatsapp': MessageCircle,
  mail: Mail,
  'mail-outline': Mail,
  map: Map,
  'map-outline': Map,
  'map-pin': MapPin,
  'message-text-outline': MessageSquare,
  'chatbubble-outline': MessageCircle,
  'chatbubble-ellipses-outline': MessageCircle,
  'chatbubbles-outline': MessagesSquare,
  navigation: Navigation,
  notifications: Bell,
  'notifications-off-outline': BellOff,
  'notifications-outline': Bell,
  person: User,
  'person-outline': User,
  pencil: Pencil,
  phone: Phone,
  'phone-portrait-outline': Smartphone,
  'call-outline': Phone,
  pricetag: Tag,
  'pricetag-outline': Tag,
  'pricetags-outline': Tags,
  'qr-code-outline': QrCode,
  receipt: Receipt,
  'receipt-outline': Receipt,
  refresh: RefreshCw,
  remove: Minus,
  'ribbon-outline': Award,
  'scan-outline': ScanLine,
  search: Search,
  'search-outline': Search,
  send: Send,
  'share-outline': Share2,
  'shield-checkmark': ShieldCheck,
  'shield-checkmark-outline': ShieldCheck,
  shield: Shield,
  'sparkles-outline': Sparkles,
  square: Square,
  'square-outline': Square,
  checkbox: SquareCheck,
  star: Star,
  'star-half': StarHalf,
  'star-outline': Star,
  store: Store,
  sync: RefreshCw,
  time: Clock,
  'time-outline': Clock,
  'trash-outline': Trash2,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
  trophy: Trophy,
  'wallet-outline': Wallet,
  warning: AlertTriangle,
  'warning-outline': AlertTriangle,
  'water-outline': Droplet,
  'calculator-outline': Gauge,
  'speedometer-outline': Gauge,
  'wifi-off': WifiOff,
  wifi: Wifi,
};

export function resolveLucideIcon(name) {
  if (!name) return Info;
  const key = typeof name === 'string' ? name : String(name);
  return LEGACY_MAP[key] ?? Info;
}

/**
 * @param {string} name - Nombre legacy o Lucide
 * @param {number} size - Tamaño del icono
 * @param {string} color - Color del icono
 * @param {string} variant - Variante de color del design system
 * @param {number} strokeWidth - Grosor de trazo Lucide
 */
const Icon = ({
  name,
  library,
  size = 24,
  color = null,
  variant = null,
  strokeWidth = ICON_STROKE_WIDTH,
  style,
  fill,
  ...props
}) => {
  const getColor = () => {
    if (color) return color;

    if (variant) {
      switch (variant) {
        case 'primary':
          return COLORS.primary[500];
        case 'secondary':
          return COLORS.secondary[500];
        case 'accent':
          return COLORS.accent[500];
        case 'success':
          return COLORS.success[500];
        case 'warning':
          return COLORS.warning[500];
        case 'error':
          return COLORS.error[500];
        case 'info':
          return COLORS.info[500];
        default:
          return COLORS.text.primary;
      }
    }

    return COLORS.text.primary;
  };

  const Cmp = resolveLucideIcon(name);
  const iconColor = getColor();

  return (
    <Cmp
      size={size}
      color={iconColor}
      strokeWidth={strokeWidth}
      fill={fill == null ? LUCIDE_FILL_NONE : fill}
      style={style}
      {...props}
    />
  );
};

export default memo(Icon);
