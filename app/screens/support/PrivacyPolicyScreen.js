import React from 'react';
import LegalDocumentView from '../../components/support/LegalDocumentView';
import { PRIVACY_META, PRIVACY_SECTIONS, PRIVACY_FOOTER } from '../../content/legal/privacyPolicyContent';

const PrivacyPolicyScreen = () => (
  <LegalDocumentView meta={PRIVACY_META} sections={PRIVACY_SECTIONS} footer={PRIVACY_FOOTER} />
);

export default PrivacyPolicyScreen;
