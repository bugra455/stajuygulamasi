import React from 'react';
import FormSection from '../../../components/forms/FormSection';
import FormInput from '../../../components/forms/FormInput';
import { useTranslation } from '../../../hooks/useTranslation';

interface DanismanBelgeProps {
  danismanMail: string;
  setDanismanMail: (value: string) => void;
  danismanLoading?: boolean;
  handleDosyaSecimi: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors: { [key: string]: string[] | undefined };
}

export const DanismanBelge: React.FC<DanismanBelgeProps> = ({
  danismanMail,
  setDanismanMail,
  danismanLoading = false,
  handleDosyaSecimi,
  errors,
}) => {
  const { t } = useTranslation();

  return (
    <FormSection title={t("pages.muafiyetBasvuru.muafiyetBelge.title")}>
      <FormInput
        label={t("pages.muafiyetBasvuru.muafiyetBelge.advisorEmail")}
        id="danismanMail"
        type="email"
        value={danismanMail}
        onChange={(e) => setDanismanMail(e.target.value)}
        disabled={danismanLoading || !!danismanMail} 
        placeholder={danismanLoading ? "Danışman bilgisi yükleniyor..." : "Danışman email adresi otomatik doldurulacak"}
        required
        error={errors.danismanMail?.[0]}
      />
      <FormInput
        label={t("pages.muafiyetBasvuru.muafiyetBelge.uploadMuafiyetDocument")}
        id="sgk4a"
        type="file"
        accept=".pdf"
        onChange={handleDosyaSecimi}
        required
      />
    </FormSection>
  );
};
