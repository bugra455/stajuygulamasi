
import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import FormSection from '../../../components/forms/FormSection';

interface StajTaahhutnamesiProps {
  saglikSigortasiDurumu: string;
  setSaglikSigortasiDurumu: (value: string) => void;
  errors: { [key: string]: string[] | undefined };
}

export const StajTaahhutnamesi: React.FC<StajTaahhutnamesiProps> = ({
  saglikSigortasiDurumu,
  setSaglikSigortasiDurumu,
  errors
}) => {
  const { t } = useTranslation();
  return (
    <FormSection
      title={t('internshipForm.commitmentSectionTitle')}
      className="grid grid-cols-1 gap-4"
    >
      <div className="text-sm text-text-dark space-y-4">
        <p>{t('internshipForm.commitmentText')}</p>
        <p>{t('internshipForm.commitmentInsurance')}</p>
      </div>

      <div className="space-y-4 border-t border-b border-background-200 py-4">
        <div className="flex items-start">
          <input
            id="sigorta-var"
            name="saglikSigortasiDurumu"
            type="radio"
            value="ALIYORUM"
            checked={saglikSigortasiDurumu === "ALIYORUM"}
            onChange={e => setSaglikSigortasiDurumu(e.target.value)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-background-300 mt-1"
          />
          <label htmlFor="sigorta-var" className="ml-3 block text-sm text-text-dark">
            {t('internshipForm.commitmentOptionFamilyYes')}
          </label>
        </div>
        <div className="flex items-start">
          <input
            id="sigorta-yok"
            name="saglikSigortasiDurumu"
            type="radio"
            value="ALMIYORUM"
            checked={saglikSigortasiDurumu === "ALMIYORUM"}
            onChange={e => setSaglikSigortasiDurumu(e.target.value)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-background-300 mt-1"
          />
          <label htmlFor="sigorta-yok" className="ml-3 block text-sm text-text-dark">
            {t('internshipForm.commitmentOptionFamilyNo')}
          </label>
        </div>
        {errors.saglikSigortasiDurumu && (
          <p className="text-red-500 text-xs mt-1">
            {errors.saglikSigortasiDurumu[0]}
          </p>
        )}
      </div>

      <div className="text-xs text-text-light">
        <p>
          {t('internshipForm.commitmentKVKK')}
          {" "}
          <a
            href="https://www.uni.edu.tr/sayfa/kisisel-veriler-kvkk-921828"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-blue-600 hover:underline"
          >
            https://www.uni.edu.tr/sayfa/kisisel-veriler-kvkk-921828
          </a>
        </p>
      </div>
    </FormSection>
  );
};
