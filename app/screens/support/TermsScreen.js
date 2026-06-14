import React from 'react';
import LegalDocumentView from '../../components/support/LegalDocumentView';
import { TERMS_META, TERMS_SECTIONS, TERMS_FOOTER } from '../../content/legal/termsOfUseContent';

const TermsScreen = () => (
  <LegalDocumentView meta={TERMS_META} sections={TERMS_SECTIONS} footer={TERMS_FOOTER} />
);

export default TermsScreen;
