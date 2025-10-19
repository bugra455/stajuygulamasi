import React from 'react';
import { KurumBilgileri } from './components/KurumBilgileri';
import type { ErrorMessages } from '../../types/common';

interface KurumBilgileriSectionProps {
  kurumAdi: string;
  kurumAdresi: string;
  sorumluTelefon: string;
  sorumluMail: string;
  yetkiliAdi: string;
  yetkiliUnvani: string;
  saglikSigortasiDurumu: string;
  onKurumAdiChange: (value: string) => void;
  onKurumAdresiChange: (value: string) => void;
  onSorumluTelefonChange: (value: string) => void;
  onSorumluMailChange: (value: string) => void;
  onYetkiliAdiChange: (value: string) => void;
  onYetkiliUnvaniChange: (value: string) => void;
  onSaglikSigortasiDurumuChange: (value: string) => void;
  errors: ErrorMessages;
}

const KurumBilgileriSection: React.FC<KurumBilgileriSectionProps> = ({
  kurumAdi,
  kurumAdresi,
  sorumluTelefon,
  sorumluMail,
  yetkiliAdi,
  yetkiliUnvani,
  saglikSigortasiDurumu,
  onKurumAdiChange,
  onKurumAdresiChange,
  onSorumluTelefonChange,
  onSorumluMailChange,
  onYetkiliAdiChange,
  onYetkiliUnvaniChange,
  onSaglikSigortasiDurumuChange,
  errors,
}) => {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-6 text-accent-green-700">
        Staj Yapacağı Kurum Bilgisi
      </h2>
      
      <KurumBilgileri
        kurumAdi={kurumAdi}
        setKurumAdi={onKurumAdiChange}
        kurumAdresi={kurumAdresi}
        setKurumAdresi={onKurumAdresiChange}
        sorumluTelefon={sorumluTelefon}
        setSorumluTelefon={onSorumluTelefonChange}
        sorumluMail={sorumluMail}
        setSorumluMail={onSorumluMailChange}
        yetkiliAdi={yetkiliAdi}
        setYetkiliAdi={onYetkiliAdiChange}
        yetkiliUnvani={yetkiliUnvani}
        setYetkiliUnvani={onYetkiliUnvaniChange}
        errors={errors}
      />
      
      {/* Additional saglikSigortasiDurumu field */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sağlık Sigortası Durumu
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="saglikSigortasiDurumu"
              value="ALIYORUM"
              checked={saglikSigortasiDurumu === "ALIYORUM"}
              onChange={(e) => onSaglikSigortasiDurumuChange(e.target.value)}
              className="mr-2"
            />
            Sağlık sigortası alıyorum
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="saglikSigortasiDurumu"
              value="ALMIYORUM"
              checked={saglikSigortasiDurumu === "ALMIYORUM"}
              onChange={(e) => onSaglikSigortasiDurumuChange(e.target.value)}
              className="mr-2"
            />
            Sağlık sigortası almıyorum
          </label>
        </div>
      </div>
    </div>
  );
};

export default KurumBilgileriSection;
