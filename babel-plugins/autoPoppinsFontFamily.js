/**
 * autoPoppinsFontFamily — Babel plugin (build-time only, no runtime cost)
 *
 * Por qué existe: React Native NO sintetiza variantes de peso para fuentes
 * personalizadas. Si un estilo define `fontWeight` sin `fontFamily`, el texto
 * cae al font family por defecto del sistema (no Poppins), rompiendo la
 * consistencia visual Airbnb en cualquier pantalla que use `fontWeight` suelto
 * en lugar de `TYPOGRAPHY.styles.*`.
 *
 * Este plugin inyecta automáticamente el `fontFamily` de Poppins que
 * corresponde a cada `fontWeight` detectado, SOLO cuando el objeto de estilo
 * no ya define `fontFamily` explícitamente. No modifica los archivos fuente:
 * corre en el paso de transformación de Babel, así que el fix es 100%
 * retroactivo (código legacy) y a prueba de futuro (código nuevo).
 *
 * Se ignoran los diccionarios de tokens (p. ej. `fontWeight: { light: '300', ... }`)
 * porque su valor es un ObjectExpression, no un peso individual.
 */

const WEIGHT_TO_FAMILY = {
  100: 'Poppins_400Regular',
  200: 'Poppins_400Regular',
  300: 'Poppins_400Regular',
  400: 'Poppins_400Regular',
  500: 'Poppins_500Medium',
  600: 'Poppins_600SemiBold',
  700: 'Poppins_600SemiBold',
  800: 'Poppins_600SemiBold',
  900: 'Poppins_600SemiBold',
  normal: 'Poppins_400Regular',
  bold: 'Poppins_600SemiBold',
};

const MEMBER_NAME_TO_FAMILY = {
  light: 'Poppins_400Regular',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_600SemiBold',
};

module.exports = function autoPoppinsFontFamily({ types: t }) {
  function resolveFamily(valueNode) {
    if (!valueNode) return null;

    if (t.isStringLiteral(valueNode)) {
      return WEIGHT_TO_FAMILY[valueNode.value] || null;
    }

    if (t.isNumericLiteral(valueNode)) {
      return WEIGHT_TO_FAMILY[valueNode.value] || null;
    }

    if (
      (t.isMemberExpression(valueNode) || t.isOptionalMemberExpression(valueNode)) &&
      valueNode.property &&
      !valueNode.computed
    ) {
      const propName = valueNode.property.name;
      if (propName && MEMBER_NAME_TO_FAMILY[propName]) {
        return MEMBER_NAME_TO_FAMILY[propName];
      }
    }

    if (t.isLogicalExpression(valueNode)) {
      return resolveFamily(valueNode.left) || resolveFamily(valueNode.right);
    }

    return null;
  }

  return {
    name: 'auto-poppins-font-family',
    visitor: {
      ObjectExpression(path) {
        const props = path.node.properties;

        const hasFontFamily = props.some(
          (p) =>
            t.isObjectProperty(p) &&
            !p.computed &&
            ((t.isIdentifier(p.key) && p.key.name === 'fontFamily') ||
              (t.isStringLiteral(p.key) && p.key.value === 'fontFamily'))
        );
        if (hasFontFamily) return;

        const fontWeightProp = props.find(
          (p) =>
            t.isObjectProperty(p) &&
            !p.computed &&
            ((t.isIdentifier(p.key) && p.key.name === 'fontWeight') ||
              (t.isStringLiteral(p.key) && p.key.value === 'fontWeight'))
        );
        if (!fontWeightProp) return;

        // Diccionario de tokens (fontWeight: { light: '300', ... }) — no es un peso, ignorar.
        if (t.isObjectExpression(fontWeightProp.value)) return;

        const family = resolveFamily(fontWeightProp.value);
        if (!family) return;

        const insertIdx = props.indexOf(fontWeightProp);
        path.node.properties.splice(
          insertIdx,
          0,
          t.objectProperty(t.identifier('fontFamily'), t.stringLiteral(family))
        );
      },
    },
  };
};
