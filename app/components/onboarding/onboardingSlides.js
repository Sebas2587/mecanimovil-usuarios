/**
 * Contenido del onboarding Airbnb — una idea por slide + demo interactivo.
 * Fondos: fotos hi-res (evita pixelación de assets 682px).
 */
export const ONBOARDING_STORAGE_KEY = 'has_seen_onboarding_v2';

export const ONBOARDING_IMAGES = {
  discover: require('../../../assets/images/pexels-sunhung94-28389513.jpg'),
  /** Slide Agenda: fotos reales taller / domicilio (cambian con el tab). */
  book: require('../../../assets/images/onboarding-taller.jpg'),
  health: require('../../../assets/images/pexels-hh-meddia_-2148575819-32164493.jpg'),
  taller: require('../../../assets/images/onboarding-taller.jpg'),
  domicilio: require('../../../assets/images/onboarding-domicilio.jpg'),
  logo: require('../../../assets/images/Group 27logo_negro_mecanimovil.png'),
};

export const BRAND_CHIPS = [
  { id: 'toyota', label: 'Toyota' },
  { id: 'chevrolet', label: 'Chevrolet' },
  { id: 'hyundai', label: 'Hyundai' },
  { id: 'nissan', label: 'Nissan' },
  { id: 'kia', label: 'Kia' },
  { id: 'suzuki', label: 'Suzuki' },
];

export const SERVICE_MODES = [
  {
    id: 'taller',
    label: 'En taller',
    hint: 'Llevas el auto al local del especialista',
  },
  {
    id: 'domicilio',
    label: 'A domicilio',
    hint: 'El mecánico va a tu casa o trabajo',
  },
];

export const HEALTH_METRICS = [
  { id: 'aceite', label: 'Aceite', value: 72, tone: 'warn' },
  { id: 'frenos', label: 'Frenos', value: 91, tone: 'good' },
  { id: 'bateria', label: 'Batería', value: 58, tone: 'alert' },
  { id: 'neumaticos', label: 'Neumáticos', value: 84, tone: 'good' },
];

export const ONBOARDING_SLIDES = [
  {
    key: 'discover',
    demo: 'brands',
    image: ONBOARDING_IMAGES.discover,
    eyebrow: 'Descubre',
    title: 'Talleres expertos en tu marca',
    subtitle: 'Elige la marca de tu auto y encuentra talleres que la conocen.',
  },
  {
    key: 'book',
    demo: 'modes',
    image: ONBOARDING_IMAGES.book,
    eyebrow: 'Agenda',
    title: 'Taller o domicilio, tú eliges',
    subtitle: '¿Llevas el auto al taller o prefieres el servicio en tu casa?',
  },
  {
    key: 'health',
    demo: 'health',
    image: ONBOARDING_IMAGES.health,
    eyebrow: 'Cuida',
    title: 'Salud de tu auto a la vista',
    subtitle: 'Revisa aceite, frenos y más: te avisamos antes de un fallo.',
  },
];
