import React from 'react';
import { DanismanBelge } from './components/DanismanBelge';
import { StajYeri } from './components/StajYeri';
import { StajTipiEnum } from '../../types/common';
import type { ErrorMessages } from '../../types/common';

interface DosyaUploadSectionProps {
  danismanMail: string;
  yurtDisi: string;
  turkFirmasi: string;
  onDanismanMailChange: (value: string) => void;
  onTranskriptDosyasiChange: (file: File | null) => void;
  onHizmetDokumuChange: (file: File | null) => void;
  onYurtDisiChange: (value: string) => void;
  onTurkFirmasiChange: (value: string) => void;
  onSigortaDosyasiChange: (file: File | null) => void;
  errors: ErrorMessages;
  // Optional props for update form
  isUpdate?: boolean;
  hasExistingTranskript?: boolean;
  hasExistingHizmetDokumu?: boolean;
  hasExistingSigortaDosyasi?: boolean;
}

const DosyaUploadSection: React.FC<DosyaUploadSectionProps> = ({
  danismanMail,
  yurtDisi,
  turkFirmasi,
  onDanismanMailChange,
  onTranskriptDosyasiChange,
  onHizmetDokumuChange,
  onYurtDisiChange,
  onTurkFirmasiChange,
  onSigortaDosyasiChange,
  errors,
  isUpdate = false,
  hasExistingTranskript = false,
  hasExistingHizmetDokumu = false,
  hasExistingSigortaDosyasi = false,
}) => {
  const handleDosyaSecimi = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (e.target.id === 'transkript') {
      onTranskriptDosyasiChange(file);
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-6 text-accent-green-700">
        Belgeler ve Dosyalar
      </h2>
      
      <DanismanBelge
        danismanMail={danismanMail}
        setDanismanMail={onDanismanMailChange}
        danismanLoading={isUpdate} // Update formlarında danışman mailini disable et
        handleDosyaSecimi={handleDosyaSecimi}
        stajTipi={StajTipiEnum.IMU_402}
        setHizmetDokumu={onHizmetDokumuChange}
        errors={errors}
        isUpdate={isUpdate}
        hasExistingTranskript={hasExistingTranskript}
        hasExistingHizmetDokumu={hasExistingHizmetDokumu}
      />
      
      <StajYeri
        yurtDisi={yurtDisi as "yurtiçi" | "yurtdışı" | ""}
        setYurtDisi={onYurtDisiChange as (value: "yurtiçi" | "yurtdışı") => void}
        turkFirmasi={turkFirmasi as "evet" | "hayır" | ""}
        setTurkFirmasi={onTurkFirmasiChange as (value: "evet" | "hayır") => void}
        setSigortaDosyasi={onSigortaDosyasiChange}
        errors={errors}
        isUpdate={isUpdate}
        hasExistingSigortaDosyasi={hasExistingSigortaDosyasi}
      />
    </div>
  );
};

export default DosyaUploadSection;
