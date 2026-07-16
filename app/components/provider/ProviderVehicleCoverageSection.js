import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Globe, Car } from 'lucide-react-native';
import SectionHeader from '../base/SectionHeader/SectionHeader';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';

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

function modelsCaption(brand) {
  if (brand.allModels && brand.modelos.length === 0) {
    return 'Todos los modelos';
  }
  if (brand.allModels && brand.modelos.length > 0) {
    return `Todos los modelos · Destaca: ${brand.modelos.slice(0, 4).join(', ')}`;
  }
  if (brand.modelos.length === 0) return 'Todos los modelos';
  if (brand.modelos.length <= 6) return brand.modelos.join(', ');
  return `${brand.modelos.slice(0, 5).join(', ')} +${brand.modelos.length - 5}`;
}

/**
 * Sección Airbnb: vehículos que atiende el taller (marcas → modelos).
 * Multimarca / servicios genéricos se indican explícitamente.
 */
const ProviderVehicleCoverageSection = ({ provider, servicios = [] }) => {
  const coverage = useMemo(
    () => buildProviderVehicleCoverage(provider, servicios),
    [provider, servicios],
  );

  const { esMultimarca, hasGenericOfertas, brands } = coverage;
  if (!esMultimarca && brands.length === 0 && !hasGenericOfertas) return null;

  const title = esMultimarca
    ? 'Vehículos que atiende'
    : brands.length > 1
      ? 'Marcas y modelos'
      : 'Marca y modelos';

  return (
    <View style={styles.section}>
      <SectionHeader title={title} />

      {esMultimarca ? (
        <View style={styles.multimarcaRow}>
          <View style={styles.multimarcaIcon}>
            <Globe size={20} color={COLORS.text.secondary} strokeWidth={2} />
          </View>
          <View style={styles.multimarcaText}>
            <Text style={styles.brandName}>Multimarca</Text>
            <Text style={styles.modelsCaption}>
              Atiende vehículos de cualquier marca. Los precios pueden variar según modelo.
            </Text>
          </View>
        </View>
      ) : null}

      {!esMultimarca && brands.length > 0 ? (
        <View style={styles.brandList}>
          {brands.map((brand, index) => (
            <View
              key={`brand-${brand.nombre}`}
              style={[
                styles.brandRow,
                index < brands.length - 1 || hasGenericOfertas ? styles.brandRowBorder : null,
              ]}
            >
              <View style={styles.brandIcon}>
                <Car size={16} color={COLORS.text.secondary} strokeWidth={2} />
              </View>
              <View style={styles.brandBody}>
                <Text style={styles.brandName}>{brand.nombre}</Text>
                <Text style={styles.modelsCaption}>{modelsCaption(brand)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {hasGenericOfertas ? (
        <View style={[styles.genericRow, !esMultimarca && brands.length > 0 && styles.genericTop]}>
          <Text style={styles.brandName}>Servicios genéricos</Text>
          <Text style={styles.modelsCaption}>
            Algunos servicios aplican a cualquier marca (sin restricción de modelo).
          </Text>
        </View>
      ) : null}

      {esMultimarca && brands.length > 0 ? (
        <View style={styles.specialPrices}>
          <Text style={styles.specialPricesTitle}>Precios por marca</Text>
          <Text style={styles.modelsCaption}>
            {brands.map((b) => b.nombre).slice(0, 8).join(' · ')}
            {brands.length > 8 ? ` +${brands.length - 8}` : ''}
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
  multimarcaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  multimarcaIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  multimarcaText: {
    flex: 1,
    minWidth: 0,
  },
  brandList: {
    marginTop: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  brandRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: COLORS.neutral.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  brandBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  brandName: {
    ...TYPOGRAPHY.styles.captionBold,
    fontSize: 15,
    color: COLORS.text.primary,
    letterSpacing: -0.2,
  },
  modelsCaption: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    lineHeight: 20,
  },
  genericRow: {
    gap: 2,
    paddingTop: SPACING.sm,
  },
  genericTop: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
  },
  specialPrices: {
    marginTop: SPACING.lg,
    gap: 2,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
  },
  specialPricesTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
});

export default ProviderVehicleCoverageSection;
