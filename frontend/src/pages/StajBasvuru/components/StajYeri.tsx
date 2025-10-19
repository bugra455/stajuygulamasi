import React from 'react';
import FormSection from '../../../components/forms/FormSection';
import FormInput from '../../../components/forms/FormInput';
import { useTranslation } from '../../../hooks/useTranslation';

interface StajYeriProps {
  yurtDisi: "yurtiçi" | "yurtdışı" | "";
  setYurtDisi: (value: "yurtiçi" | "yurtdışı") => void;
  turkFirmasi: "evet" | "hayır" | "";
  setTurkFirmasi: (value: "evet" | "hayır") => void;
  setSigortaDosyasi: (file: File | null) => void;
  errors: { [key: string]: string[] | undefined };
  isUpdate?: boolean;
  hasExistingSigortaDosyasi?: boolean;
}

export const StajYeri: React.FC<StajYeriProps> = ({
  yurtDisi,
  setYurtDisi,
  turkFirmasi,
  setTurkFirmasi,
  setSigortaDosyasi,
  errors,
  isUpdate = false,
  hasExistingSigortaDosyasi = false,
}) => {
  const { t } = useTranslation();

  return (
    <FormSection title={t("pages.stajBasvuru.companyInfo.title")}>
      <label className="block text-sm font-medium text-text-dark mb-2">{t("pages.stajBasvuru.companyInfo.location")}:</label>
      <div className="flex gap-6 mb-2">
        <label>
          <input 
            type="radio" 
            name="yurtDisi" 
            value="yurtiçi" 
            checked={yurtDisi === "yurtiçi"} 
            onChange={() => setYurtDisi("yurtiçi")} 
          />
          <span className="ml-1">{t("pages.stajBasvuru.companyInfo.turkish")}</span>
        </label>
        <label>
          <input 
            type="radio" 
            name="yurtDisi" 
            value="yurtdışı" 
            checked={yurtDisi === "yurtdışı"} 
            onChange={() => setYurtDisi("yurtdışı")} 
          />
          <span className="ml-1">{t("pages.stajBasvuru.companyInfo.abroad")}</span>
        </label>
      </div>
      {yurtDisi === "yurtdışı" && (
        <div className="mb-2">
          <label className="block text-sm font-medium text-text-dark mb-2">{t("pages.stajBasvuru.companyInfo.turkishOrigin")}</label>
          <div className="flex gap-6">
            <label>
              <input 
                type="radio" 
                name="turkFirmasi" 
                value="evet" 
                checked={turkFirmasi === "evet"} 
                onChange={() => setTurkFirmasi("evet")} 
              />
              <span className="ml-1">{t("common.yes")}</span>
            </label>
            <label>
              <input 
                type="radio" 
                name="turkFirmasi" 
                value="hayır" 
                checked={turkFirmasi === "hayır"} 
                onChange={() => setTurkFirmasi("hayır")} 
              />
              <span className="ml-1">{t("common.no")}</span>
            </label>
          </div>
          {turkFirmasi === "hayır" && (
            <FormInput
              label={t("pages.stajBasvuru.documents.insurance")}
              id="sigortaDosyasi"
              type="file"
              accept=".pdf"
              onChange={(e) => setSigortaDosyasi(e.target.files?.[0] || null)}
              required={!isUpdate || !hasExistingSigortaDosyasi}
              error={errors.sigortaDosyasi?.[0]}
            />
          )}
        </div>
      )}
      {errors.yurtDisi && <p className="text-red-500 text-xs mt-1">{errors.yurtDisi[0]}</p>}
      {errors.turkFirmasi && <p className="text-red-500 text-xs mt-1">{errors.turkFirmasi[0]}</p>}
    </FormSection>
  );
};
