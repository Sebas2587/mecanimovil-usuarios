/**
 * Cobertura de marca del proveedor: especialista (atiende marcas específicas)
 * vs multimarca (atiende cualquier marca).
 *
 * Campos reales del backend (talleres / mecanicos-domicilio):
 * - `tipo_cobertura_marca`: 'multimarca' | 'especialista' | 'por_marca'
 * - `marcas_atendidas_nombres`: string[] con nombres de marcas del especialista
 * - `marcas_atendidas` | `marcas_atendidas_ids`: ids (números u objetos {id})
 * - `_esMultimarca`: flag agregado en cliente por los servicios del panel
 */

import { isProviderMultimarca } from './providerUtils';

function normalizeBrandName(value) {
  if (value == null || value === '') return '';
  return String(value).trim().toLowerCase();
}

/**
 * Deriva la cobertura de marca del proveedor.
 * @returns {{ isMultimarca: boolean, brandNames: string[] }}
 */
export function getProviderBrandCoverage(provider) {
  const isMultimarca = isProviderMultimarca(provider);
  const brandNames = Array.isArray(provider?.marcas_atendidas_nombres)
    ? provider.marcas_atendidas_nombres
        .map((n) => (n == null ? '' : String(n).trim()))
        .filter(Boolean)
    : [];
  return { isMultimarca, brandNames };
}

/**
 * ¿El proveedor cubre la marca indicada (id numérico o nombre)?
 * Multimarca cubre todo. Si no hay marca que comparar, o el proveedor no expone
 * datos suficientes para negarlo, se asume cubierta (el backend ya filtra por
 * vehiculo_id / marca en los endpoints del panel).
 */
export function coversBrand(provider, marca) {
  if (!provider) return false;
  const { isMultimarca, brandNames } = getProviderBrandCoverage(provider);
  if (isMultimarca) return true;
  if (marca == null || String(marca).trim() === '') return true;

  const marcaNum = Number(marca);
  if (Number.isFinite(marcaNum)) {
    const rawIds = provider?.marcas_atendidas ?? provider?.marcas_atendidas_ids;
    if (Array.isArray(rawIds) && rawIds.length > 0) {
      return rawIds.some((m) => Number(m?.id ?? m) === marcaNum);
    }
    return true;
  }

  const target = normalizeBrandName(marca);
  if (!target || brandNames.length === 0) return true;
  return brandNames.some((n) => {
    const nn = normalizeBrandName(n);
    return nn === target || nn.includes(target) || target.includes(nn);
  });
}
