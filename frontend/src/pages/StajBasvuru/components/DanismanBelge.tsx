import React from 'react';
import FormSection from '../../../components/forms/FormSection';
import FormInput from '../../../components/forms/FormInput';
import { StajTipiEnum } from '../../../types/common';
import { useTranslation } from '../../../hooks/useTranslation';

interface DanismanBelgeProps {
  danismanMail: string;
  setDanismanMail: (value: string) => void;
  danismanAdi?: string;
  danismanLoading?: boolean;
  handleDosyaSecimi: (e: React.ChangeEvent<HTMLInputElement>) => void;
  stajTipi: StajTipiEnum | "";
  setHizmetDokumu: (file: File | null) => void;
  errors: { [key: string]: string[] | undefined };
  isUpdate?: boolean;
  hasExistingTranskript?: boolean;
  hasExistingHizmetDokumu?: boolean;
}

export const DanismanBelge: React.FC<DanismanBelgeProps> = ({
  danismanMail,
  setDanismanMail,
  danismanAdi,
  danismanLoading = false,
  handleDosyaSecimi,
  stajTipi,
  setHizmetDokumu,
  errors,
  isUpdate = false,
  hasExistingTranskript = false,
  hasExistingHizmetDokumu = false,
}) => {
  const { t } = useTranslation();

  return (
    <FormSection title={t("pages.stajBasvuru.advisorInfo.title")}>
      <FormInput
        label={t("pages.stajBasvuru.advisorInfo.name")}
        id="danismanAdi"
        type="text"
        value={danismanAdi || ""}
        disabled
        placeholder="Danışman adı otomatik doldurulacak"
      />
      <FormInput
        label={t("pages.stajBasvuru.advisorInfo.email")}
        id="danismanMail"
        type="email"
        value={danismanMail}
        onChange={(e) => setDanismanMail(e.target.value)}
        disabled={danismanLoading || !!danismanMail} // Disable if loading or already loaded
        placeholder={danismanLoading ? "Danışman bilgisi yükleniyor..." : "Danışman email adresi otomatik doldurulacak"}
        required
        error={errors.danismanMail?.[0]}
      />
      <FormInput
        label={t("pages.stajBasvuru.documents.transcript")}
        id="transkript"
        type="file"
        accept=".pdf"
        onChange={handleDosyaSecimi}
        required={!isUpdate || !hasExistingTranskript}
      />
      {(stajTipi === StajTipiEnum.IMU_404) && (
        <FormInput
          label={t("pages.stajBasvuru.documents.serviceDocument")}
          id="hizmetDokumu"
          type="file"
          accept=".pdf"
          onChange={(e) => setHizmetDokumu(e.target.files?.[0] || null)}
          required={!isUpdate || !hasExistingHizmetDokumu}
          error={errors.hizmetDokumu?.[0]}
        />
      )}
    </FormSection>
  );
};
