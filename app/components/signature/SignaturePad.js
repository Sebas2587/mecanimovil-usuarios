import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';

const DEFAULT_PEN_COLOR = COLORS.text.primary;
const DEFAULT_BG_COLOR = withOpacity(COLORS.background.paper, 0);

const SignaturePad = forwardRef(function SignaturePad(
  {
    onOK,
    onEmpty,
    onBegin,
    style,
    height = 300,
    penColor = DEFAULT_PEN_COLOR,
    backgroundColor = DEFAULT_BG_COLOR,
    webStyle,
  },
  ref,
) {
  const signatureRef = useRef(null);

  useImperativeHandle(ref, () => ({
    clearSignature: () => signatureRef.current?.clearSignature(),
    readSignature: () => signatureRef.current?.readSignature(),
  }));

  return (
    <SignatureScreen
      ref={signatureRef}
      onOK={onOK}
      onEmpty={onEmpty}
      onBegin={onBegin}
      descriptionText=""
      clearText=""
      confirmText=""
      webStyle={webStyle}
      autoClear={false}
      backgroundColor={backgroundColor}
      penColor={penColor}
      minWidth={2}
      maxWidth={4}
      imageType="image/png"
      trimWhitespace
      scrollable={false}
      nestedScrollEnabled={false}
      showsVerticalScrollIndicator={false}
      style={[styles.canvas, { height }, style]}
    />
  );
});

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
  },
});

export default SignaturePad;
