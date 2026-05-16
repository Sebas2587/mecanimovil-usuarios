import { Platform } from 'react-native';

/**
 * Convierte asset de expo-image-picker a { base64, mimeType, uri } en web cuando falta base64.
 */
export async function normalizeImagePickerAsset(asset) {
  if (!asset) return null;

  const mime = asset.mimeType || asset.type || 'image/jpeg';
  if (asset.base64) {
    return {
      uri: asset.uri,
      base64: asset.base64,
      mimeType: mime,
    };
  }

  if (Platform.OS === 'web' && asset.uri) {
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const match = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl));
      if (match) {
        return {
          uri: asset.uri,
          base64: match[2],
          mimeType: match[1] || mime,
        };
      }
    } catch (e) {
      console.warn('normalizeImagePickerAsset web', e);
    }
  }

  return null;
}
