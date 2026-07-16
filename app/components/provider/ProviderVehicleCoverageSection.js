import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Globe } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import { chunkCatalogServiceRows } from './providerServiceCardStyles';

/**
 * Agrupa marcas/modelos desde ofertas del catálogo + marcas declaradas del proveedor.
 * - Oferta sin marca → servicio genérico (cualquier marca).
 * - Oferta con marca y sin modelo → todos los modelos de esa marca.
 * - Oferta con marca + modelo → modelo concreto.
 */
export function buildProviderVehicleCoverage(provider, servicios = []) {
  const tipo = provider?.tipo_cobertura_marca;
  const declaredBrands = Array.isArray(provider?.marcas_atendidas_nombres)
    ? provider.marcas_atendidas_nombres.filter(Boolean)
    : [];
  const esMultimarca =
    tipo === 'multimarca'
    || (!tipo && declaredBrands.length === 0);

  const brandMap = new Map();
  let hasGenericOfertas = false;

  for (const svc of servicios || []) {
    if (svc?.disponible === false) continue;
    const marca =
      svc.marca_vehiculo_nombre
      || svc.marca_vehiculo_info?.nombre
      || null;
    const modelo =
      svc.modelo_vehiculo_nombre
      || svc.modelo_vehiculo_info?.nombre
      || null;

    if (!marca) {
      hasGenericOfertas = true;
      continue;
    }

    if (!brandMap.has(marca)) {
      brandMap.set(marca, { modelos: new Set(), allModels: false });
    }
    const entry = brandMap.get(marca);
    if (modelo) entry.modelos.add(String(modelo).trim());
    else entry.allModels = true;
  }

  for (const brand of declaredBrands) {
    if (!brandMap.has(brand)) {
      brandMap.set(brand, { modelos: new Set(), allModels: true });
    }
  }

  const brands = Array.from(brandMap.entries())
    .map(([nombre, value]) => {
      const modelos = Array.from(value.modelos).filter(Boolean).sort((a, b) =>
        a.localeCompare(b, 'es'),
      );
      return {
        nombre,
        modelos,
        allModels: value.allModels || modelos.length === 0,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return {
    esMultimarca,
    hasGenericOfertas,
    brands,
  };
}

function BrandCoverageCard({ brand }) {
  const showAllModelsOnly = brand.allModels && brand.modelos.length === 0;
  const modelTags = brand.modelos.slice(0, 10);
  const overflow = Math.max(0, brand.modelos.length - modelTags.length);

  return (
    <View style={styles.card} accessibilityRole="text">
      <Text style={styles.brandTitle} numberOfLines={1}>
        {brand.nombre}
      </Text>

      <View style={styles.cardBody}>
        {showAllModelsOnly ? (
          <Text style={styles.allModelsText}>Todos los modelos</Text>
        ) : (
          <View style={styles.modelGrid}>
            {brand.allModels ? (
              <View style={styles.modelTag}>
                <Text style={styles.modelTagText}>Todos</Text>
              </View>
            ) : null}
            {modelTags.map((modelo) => (
              <View key={`${brand.nombre}-${modelo}`} style={styles.modelTag}>
                <Text style={styles.modelTagText} numberOfLines={1}>
                  {modelo}
                </Text>
              </View>
            ))}
            {overflow > 0 ? (
              <View style={styles.modelTag}>
                <Text style={styles.modelTagText}>+{overflow}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Grid Airbnb de cards por marca (2 columnas en web/móvil ancho; 1 en estrecho).
 * Marca = título tipográfico; modelos = tags meta.
 */
const ProviderVehicleCoverageSection = ({ provider, servicios = [] }) => {
  const { width } = useWindowDimensions();
  /** Mobile estrecho: 1 col; resto (mobile/web): 2 cols como catálogo de servicios. */
  const columns = width < 360 ? 1 : 2;

  const coverage = useMemo(
    () => buildProviderVehicleCoverage(provider, servicios),
    [provider, servicios],
  );
  const { esMultimarca, hasGenericOfertas, brands } = coverage;

  const brandRows = useMemo(() => {
    if (columns === 1) return brands.map((b) => [b]);
    return chunkCatalogServiceRows(brands);
  }, [brands, columns]);

  if (!esMultimarca && brands.length === 0 && !hasGenericOfertas) return null;

  const title = esMultimarca
    ? 'Vehículos que atiende'
    : brands.length > 1
      ? 'Marcas y modelos'
      : 'Marca y modelos';

  const hint = esMultimarca
    ? 'Atiende cualquier marca. Algunos servicios pueden tener precio por modelo.'
    : 'Marcas en las que se especializa y los modelos con precio en su catálogo.';

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>

      {esMultimarca ? (
        <View style={styles.multimarcaCallout}>
          <View style={styles.multimarcaIcon}>
            <Globe size={18} color={COLORS.badge.multimarca.icon} strokeWidth={2} />
          </View>
          <View style={styles.multimarcaBody}>
            <Text style={styles.multimarcaTitle}>Multimarca</Text>
            <Text style={styles.multimarcaSub}>
              Sin restricción de marca en la mayoría de sus servicios.
            </Text>
          </View>
        </View>
      ) : null}

      {!esMultimarca && brands.length > 0 ? (
        <View style={styles.grid}>
          {brandRows.map((row, rowIdx) => (
            <View key={`brand-row-${rowIdx}`} style={styles.gridRow}>
              {row.map((brand) => (
                <BrandCoverageCard key={`brand-${brand.nombre}`} brand={brand} />
              ))}
              {columns === 2 && row.length === 1 ? (
                <View style={styles.cardSpacer} />
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {esMultimarca && brands.length > 0 ? (
        <View style={styles.grid}>
          <Text style={styles.secondaryLabel}>También con precios por marca</Text>
          {chunkCatalogServiceRows(brands).map((row, rowIdx) => (
            <View key={`mm-row-${rowIdx}`} style={styles.gridRow}>
              {row.map((brand) => (
                <BrandCoverageCard key={`mm-${brand.nombre}`} brand={brand} />
              ))}
              {row.length === 1 ? <View style={styles.cardSpacer} /> : null}
            </View>
          ))}
        </View>
      ) : null}

      {hasGenericOfertas ? (
        <View style={styles.genericCallout}>
          <Text style={styles.genericTitle}>Servicios genéricos</Text>
          <Text style={styles.genericSub}>
            Parte del catálogo aplica a cualquier marca, sin modelo fijo.
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  hint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  multimarcaCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.badge.multimarca.background,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.badge.multimarca.border,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  multimarcaIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multimarcaBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  multimarcaTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    fontSize: 15,
    color: COLORS.badge.multimarca.text,
  },
  multimarcaSub: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    lineHeight: 18,
  },
  grid: {
    gap: SPACING.md,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    gap: SPACING.md,
  },
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
      : SHADOWS.sm),
  },
  cardSpacer: {
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    fontSize: 16,
    color: COLORS.text.primary,
    letterSpacing: -0.2,
    marginBottom: SPACING.sm,
  },
  cardBody: {
    flexGrow: 1,
  },
  allModelsText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    lineHeight: 18,
  },
  modelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs + 2,
  },
  modelTag: {
    backgroundColor: COLORS.badge.meta.background,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.badge.meta.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: BORDERS.radius.full,
    maxWidth: '100%',
  },
  modelTagText: {
    ...TYPOGRAPHY.styles.caption,
    fontSize: 12,
    color: COLORS.badge.meta.text,
  },
  secondaryLabel: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.secondary,
  },
  genericCallout: {
    marginTop: SPACING.md,
    gap: 2,
    backgroundColor: COLORS.selection.background,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.selection.border,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
  },
  genericTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.selection.text,
  },
  genericSub: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    lineHeight: 18,
  },
});

export default ProviderVehicleCoverageSection;
