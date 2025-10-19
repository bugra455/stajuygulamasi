import React from 'react';
import FormSection from '../../../components/forms/FormSection';
import FormInput from '../../../components/forms/FormInput';
import { useTranslation } from '../../../hooks/useTranslation';

interface KurumBilgileriProps {
  kurumAdi: string;
  setKurumAdi: (value: string) => void;
  kurumAdresi: string;
  setKurumAdresi: (value: string) => void;
  sorumluTelefon: string;
  setSorumluTelefon: (value: string) => void;
  sorumluMail: string;
  setSorumluMail: (value: string) => void;
  yetkiliAdi: string;
  setYetkiliAdi: (value: string) => void;
  yetkiliUnvani: string;
  setYetkiliUnvani: (value: string) => void;
  errors: { [key: string]: string[] | undefined };
}

export const KurumBilgileri: React.FC<KurumBilgileriProps> = ({
  kurumAdi,
  setKurumAdi,
  kurumAdresi,
  setKurumAdresi,
  sorumluTelefon,
  setSorumluTelefon,
  sorumluMail,
  setSorumluMail,
  yetkiliAdi,
  setYetkiliAdi,
  yetkiliUnvani,
  setYetkiliUnvani,
  errors
}) => {
  const { t } = useTranslation();

  return (
    <FormSection title={t("pages.stajBasvuru.companyInfo.address")}>
      <FormInput
        label={t("pages.stajBasvuru.companyInfo.name")}
        id="kurumAdi"
        type="text"
        value={kurumAdi}
        onChange={(e) => setKurumAdi(e.target.value)}
        required
        error={errors.kurumAdi?.[0]}
      />
      <FormInput
        label={t("pages.stajBasvuru.companyInfo.address2")}
        id="kurumAdresi"
        type="text"
        value={kurumAdresi}
        onChange={(e) => setKurumAdresi(e.target.value)}
        required
        error={errors.kurumAdresi?.[0]}
      />
      <FormInput
        label={t("pages.stajBasvuru.companyInfo.responsiblePhone")}
        id="sorumluTelefon"
        type="tel"
        value={sorumluTelefon}
        onChange={(e) => setSorumluTelefon(e.target.value)}
        required
        error={errors.sorumluTelefon?.[0]}
      />
      <FormInput
        label={t("pages.stajBasvuru.companyInfo.responsibleEmail")}
        id="sorumluMail"
        type="email"
        value={sorumluMail}
        onChange={(e) => setSorumluMail(e.target.value)}
        required
        error={errors.sorumluMail?.[0]}
      />
      <FormInput
        label={t("pages.stajBasvuru.companyInfo.authorizedName")}
        id="yetkiliAdi"
        type="text"
        value={yetkiliAdi}
        onChange={(e) => setYetkiliAdi(e.target.value)}
        required
        error={errors.yetkiliAdi?.[0]}
      />
      <FormInput
        label={t("pages.stajBasvuru.companyInfo.responsibleTitle")}
        id="yetkiliUnvani"
        type="text"
        value={yetkiliUnvani}
        onChange={(e) => setYetkiliUnvani(e.target.value)}
        required
        error={errors.yetkiliUnvani?.[0]}
      />
    </FormSection>
  );
};
