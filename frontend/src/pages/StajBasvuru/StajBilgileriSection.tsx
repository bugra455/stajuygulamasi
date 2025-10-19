import React from 'react';
import { StajTipiSection } from './components/StajTipiSection';
import { StajTarihGun } from './components/StajTarihGun';
import { StajTipiEnum } from '../../types/common';
import type { ErrorMessages } from '../../types/common';

interface StajBilgileriSectionProps {
  stajTipi: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  toplamGun: number;
  seciliGunler: number[];
  onStajTipiChange: (value: string) => void;
  onBaslangicTarihiChange: (value: string) => void;
  onBitisTarihiChange: (value: string) => void;
  onSeciliGunlerChange?: (value: number[]) => void;
  handleGunSecimi?: (gunIndex: number, secildi: boolean) => void;
  errors: ErrorMessages;
}

const StajBilgileriSection: React.FC<StajBilgileriSectionProps> = ({
  stajTipi,
  baslangicTarihi,
  bitisTarihi,
  toplamGun,
  seciliGunler,
  onStajTipiChange,
  onBaslangicTarihiChange,
  onBitisTarihiChange,
  onSeciliGunlerChange,
  handleGunSecimi,
  errors,
}) => {

  // handleGunSecimi adaptörü - StajTarihGun'ın beklediği signature'a çevirir
  const handleGunSecimiAdaptor = (gunIndex: number, secildi: boolean) => {
    // Eğer doğrudan handleGunSecimi prop'u geçildiyse onu kullan
    if (handleGunSecimi) {
      handleGunSecimi(gunIndex, secildi);
    } 
    // Değilse onSeciliGunlerChange'i kullan
    else if (onSeciliGunlerChange) {
      const currentGuns = Array.isArray(seciliGunler) ? [...seciliGunler] : [];
      if (secildi) {
        if (!currentGuns.includes(gunIndex)) {
          onSeciliGunlerChange([...currentGuns, gunIndex]);
        }
      } else {
        onSeciliGunlerChange(currentGuns.filter(g => g !== gunIndex));
      }
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-6 text-accent-green-700">
        Staj Bilgileri
      </h2>
      
      <StajTipiSection
        stajTipi={stajTipi as StajTipiEnum | ""}
        setStajTipi={onStajTipiChange}
        errors={errors}
      />
      
      <StajTarihGun
        baslangicTarihi={baslangicTarihi}
        setBaslangicTarihi={onBaslangicTarihiChange}
        bitisTarihi={bitisTarihi}
        setBitisTarihi={onBitisTarihiChange}
        toplamGun={toplamGun}
        seciliGunler={seciliGunler}
        handleGunSecimi={handleGunSecimiAdaptor}
        stajTipi={stajTipi as StajTipiEnum | ""}
        errors={errors}
      />
    </div>
  );
};

export default StajBilgileriSection;
