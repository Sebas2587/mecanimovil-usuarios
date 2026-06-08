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

export async function appendImageToFormData(formData, fieldName, uri, asset = null) {
  if (Platform.OS === 'web') {
    const normalized = asset ? await normalizeImagePickerAsset(asset) : null;
    const blobUri = normalized?.uri || uri;
    if (!blobUri) return formData;
    const response = await fetch(blobUri);
    const blob = await response.blob();
    const mime = normalized?.mimeType || blob.type || 'image/jpeg';
    const file = new File([blob], `${fieldName}_${Date.now()}.jpg`, { type: mime });
    formData.append(fieldName, file);
    return formData;
  }

  formData.append(fieldName, {
    uri,
    type: asset?.mimeType || asset?.type || 'image/jpeg',
    name: `${fieldName}_${Date.now()}.jpg`,
  });
  return formData;
}
