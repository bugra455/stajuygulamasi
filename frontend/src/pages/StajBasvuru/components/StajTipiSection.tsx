import React from 'react';
import FormSection from '../../../components/forms/FormSection';
import { StajTipiEnum } from '../../../types/common';
import { getStajTipiLabel } from '../../../utils/helpers';
import { useTranslation } from '../../../hooks/useTranslation';

const STAJ_TIPLERI = [
  StajTipiEnum.IMU_402,
  StajTipiEnum.IMU_404,
  StajTipiEnum.MESLEKI_EGITIM_UYGULAMALI_DERS,
  StajTipiEnum.ISTEGE_BAGLI_STAJ,
  StajTipiEnum.ZORUNLU_STAJ
];

interface StajTipiSectionProps {
  stajTipi: StajTipiEnum | "";
  setStajTipi: (value: string) => void;
  errors: { [key: string]: string[] | undefined };
}

export const StajTipiSection: React.FC<StajTipiSectionProps> = ({
  stajTipi,
  setStajTipi,
  errors
}) => {
  const { t } = useTranslation();

  return (
    <FormSection
      title={t("pages.stajBasvuru.internshipType")}
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4"
    >
      {STAJ_TIPLERI.map((tip) => (
        <div key={tip} className="flex items-center">
          <input
            id={tip}
            name="stajTipi"
            type="radio"
            checked={stajTipi === tip}
            onChange={() => setStajTipi(tip)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-background-300"
          />
          <label
            htmlFor={tip}
            className="ml-3 block text-sm font-medium text-text-dark"
          >
            {getStajTipiLabel(tip as StajTipiEnum, t)}
          </label>
        </div>
      ))}
      {errors.stajTipi && (
        <p className="text-red-500 text-xs mt-1 md:col-span-4">
          {errors.stajTipi[0]}
        </p>
      )}
    </FormSection>
  );
};
