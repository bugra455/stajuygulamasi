import React from 'react';
import FormSection from '../../../components/forms/FormSection';
import FormInput from '../../../components/forms/FormInput';
import Checkbox from '../../../components/forms/Checkbox';
import { StajTipiEnum } from '../../../types/common';
import { useTranslation } from '../../../hooks/useTranslation';

interface StajTarihGunProps {
  baslangicTarihi: string;
  setBaslangicTarihi: (value: string) => void;
  bitisTarihi: string;
  setBitisTarihi: (value: string) => void;
  seciliGunler: number[];
  handleGunSecimi: (gunIndex: number, secildi: boolean) => void;
  toplamGun: number;
  stajTipi: StajTipiEnum | "";
  errors: { [key: string]: string[] | undefined };
}

export const StajTarihGun: React.FC<StajTarihGunProps> = ({
  baslangicTarihi,
  setBaslangicTarihi,
  bitisTarihi,
  setBitisTarihi,
  seciliGunler,
  handleGunSecimi,
  toplamGun,
  stajTipi,
  errors
}) => {
  const { t } = useTranslation();
  const HAFTA_GUNLERI = [
    { id: "pazartesi", etiket: t('common.days.monday'), gunIndex: 0 },
    { id: "sali", etiket: t('common.days.tuesday'), gunIndex: 1 },
    { id: "carsamba", etiket: t('common.days.wednesday'), gunIndex: 2 },
    { id: "persembe", etiket: t('common.days.thursday'), gunIndex: 3 },
    { id: "cuma", etiket: t('common.days.friday'), gunIndex: 4 },
    { id: "cumartesi", etiket: t('common.days.saturday'), gunIndex: 5 },
    { id: "pazar", etiket: t('common.days.sunday'), gunIndex: 6 }
  ];
  
  const handleBaslangicTarihiChange = (selectedDay: number, selectedMonth: number, selectedYear: number) => {
    const newDate = new Date(selectedYear, selectedMonth - 1, selectedDay, 12, 0, 0);
    const isoString = newDate.getFullYear() + '-' + 
      String(newDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(newDate.getDate()).padStart(2, '0');
    setBaslangicTarihi(isoString);
  };

  const handleBitisTarihiChange = (selectedDay: number, selectedMonth: number, selectedYear: number) => {
    const newDate = new Date(selectedYear, selectedMonth - 1, selectedDay, 12, 0, 0);
    const isoString = newDate.getFullYear() + '-' + 
      String(newDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(newDate.getDate()).padStart(2, '0');
    setBitisTarihi(isoString);
  };

  return (
    <FormSection title={t("internshipForm.datesSectionTitle")}>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-text-dark mb-2">
          {t("internshipForm.startDateLabel")}
        </label>
        <div className="grid grid-cols-3 gap-2">
          <select
            value={baslangicTarihi ? new Date(baslangicTarihi).getDate() : ''}
            onChange={(e) => {
              if (e.target.value) {
                const selectedDay = parseInt(e.target.value);
                const selectedMonth = baslangicTarihi ? new Date(baslangicTarihi).getMonth() : new Date().getMonth();
                const selectedYear = baslangicTarihi ? new Date(baslangicTarihi).getFullYear() : new Date().getFullYear();
                handleBaslangicTarihiChange(selectedDay, selectedMonth + 1, selectedYear);
              }
            }}
            className="px-3 py-2 border border-background-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="">{t("internshipForm.day")}</option>
            {(() => {
              const today = new Date();
              const currentMonth = today.getMonth();
              const currentYear = today.getFullYear();
              const selectedMonth = baslangicTarihi ? new Date(baslangicTarihi).getMonth() : currentMonth;
              const selectedYear = baslangicTarihi ? new Date(baslangicTarihi).getFullYear() : currentYear;
              
              if (selectedMonth !== currentMonth || selectedYear !== currentYear) {
                return [<option key="invalid" value="">Sadece bu ay için başvuru yapılabilir</option>];
              }
              
              const minDate = new Date(today);
              minDate.setDate(today.getDate() + 10);
              const maxDate = new Date(currentYear, currentMonth + 1, 0);
              
              const days = [];
              for (let day = 1; day <= maxDate.getDate(); day++) {
                const testDate = new Date(selectedYear, selectedMonth, day);
                if (testDate >= minDate && testDate <= maxDate) {
                  days.push(<option key={day} value={day}>{day}</option>);
                }
              }
              return days;
            })()}
          </select>
          <select
            value={baslangicTarihi ? `${new Date(baslangicTarihi).getMonth() + 1}-${new Date(baslangicTarihi).getFullYear()}` : ''}
            onChange={(e) => {
              if (e.target.value) {
                const [monthStr, yearStr] = e.target.value.split('-');
                const selectedMonth = parseInt(monthStr) - 1;
                const selectedYear = parseInt(yearStr);
                const selectedDay = baslangicTarihi ? new Date(baslangicTarihi).getDate() : 1;
                const newDate = new Date(selectedYear, selectedMonth, Math.min(selectedDay, 31));
                setBaslangicTarihi(newDate.toISOString().split('T')[0]);
              }
            }}
            className="px-3 py-2 border border-background-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="">{t("internshipForm.month")}</option>
            {(() => {
              const today = new Date();
              const currentMonth = today.getMonth();
              const currentYear = today.getFullYear();
              const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString('tr-TR', { month: 'long' });
              return [
                <option key={`${currentYear}-${currentMonth}`} value={`${currentMonth + 1}-${currentYear}`}>
                  {monthName} {currentYear}
                </option>
              ];
            })()}
          </select>
        </div>
        {errors.baslangicTarihi && (
          <p className="text-red-500 text-xs mt-1">{errors.baslangicTarihi[0]}</p>
        )}
        {baslangicTarihi && (() => {
          const selectedDate = new Date(baslangicTarihi + 'T12:00:00');
          const today = new Date();
          const minDate = new Date(today);
          minDate.setDate(today.getDate() + 10);
          
          if (selectedDate < minDate) {
            return <p className="text-red-500 text-xs mt-1">⚠️ Staj başlangıç tarihi başvuru tarihinden en az 10 gün sonra olmalıdır.</p>;
          }
          
          const currentMonth = today.getMonth();
          const currentYear = today.getFullYear();
          const selectedMonth = selectedDate.getMonth();
          const selectedYear = selectedDate.getFullYear();
          
          if (selectedMonth !== currentMonth || selectedYear !== currentYear) {
            return <p className="text-red-500 text-xs mt-1">⚠️ Staj başvurusu sadece bulunduğunuz ay için yapılabilir.</p>;
          }
          
          return null;
        })()}
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-text-dark mb-2">
          {t("internshipForm.endDateLabel")}
        </label>
        <div className="grid grid-cols-3 gap-2">
          <select
            value={bitisTarihi ? new Date(bitisTarihi).getDate() : ''}
            onChange={(e) => {
              if (e.target.value) {
                const selectedDay = parseInt(e.target.value);
                const selectedMonth = bitisTarihi ? new Date(bitisTarihi).getMonth() : new Date().getMonth();
                const selectedYear = bitisTarihi ? new Date(bitisTarihi).getFullYear() : new Date().getFullYear();
                handleBitisTarihiChange(selectedDay, selectedMonth + 1, selectedYear);
              }
            }}
            className="px-3 py-2 border border-background-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="">{t("internshipForm.day")}</option>
            {Array.from({length: 31}, (_, i) => i + 1).map(gun => (
              <option key={gun} value={gun}>{gun}</option>
            ))}
          </select>
          <select
            value={bitisTarihi ? `${new Date(bitisTarihi).getMonth() + 1}-${new Date(bitisTarihi).getFullYear()}` : ''}
            onChange={(e) => {
              if (e.target.value) {
                const [monthStr, yearStr] = e.target.value.split('-');
                const selectedMonth = parseInt(monthStr) - 1;
                const selectedYear = parseInt(yearStr);
                const selectedDay = bitisTarihi ? new Date(bitisTarihi).getDate() : 1;
                const newDate = new Date(selectedYear, selectedMonth, selectedDay);
                setBitisTarihi(newDate.toISOString().split('T')[0]);
              }
            }}
            className="px-3 py-2 border border-background-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="">{t("internshipForm.month")}</option>
            {(() => {
              const today = new Date();
              const currentMonth = today.getMonth();
              const currentYear = today.getFullYear();
              const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString('tr-TR', { month: 'long' });
              return [
                <option key={`${currentYear}-${currentMonth}`} value={`${currentMonth + 1}-${currentYear}`}>
                  {monthName} {currentYear}
                </option>
              ];
            })()}
          </select>
        </div>
        {errors.bitisTarihi && (
          <p className="text-red-500 text-xs mt-1">{errors.bitisTarihi[0]}</p>
        )}
        {bitisTarihi && baslangicTarihi && bitisTarihi <= baslangicTarihi && (
          <p className="text-red-500 text-xs mt-1">⚠️ {t('internshipForm.validation.endDateAfterStart')}</p>
        )}
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-text-dark mb-3">
          {t("internshipForm.selectedDays")}
        </label>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {HAFTA_GUNLERI.map((gun) => (
            <Checkbox
              key={gun.id}
              id={gun.id}
              label={gun.etiket}
              checked={seciliGunler.includes(gun.gunIndex)}
              onChange={(e) => handleGunSecimi(gun.gunIndex, e.target.checked)}
            />
          ))}
        </div>
        {errors.seciliGunler && (
          <p className="text-red-500 text-xs mt-1">{errors.seciliGunler[0]}</p>
        )}
      </div>

      <FormInput
        label={t("internshipForm.totalDays")}
        id="toplamGun"
        type="number"
        value={toplamGun}
        disabled
        error={errors.toplamGun?.[0]}
      />
      
      {toplamGun > 0 && (
        <div className="md:col-span-2 text-sm">
          {stajTipi === StajTipiEnum.ISTEGE_BAGLI_STAJ && (
            <p className={`${toplamGun > 30 ? 'text-red-500' : 'text-green-600'}`}>
              {toplamGun > 30 ? '⚠️' : '✅'} {t('internshipForm.status.voluntaryInternship', { current: toplamGun, max: 30 })}
            </p>
          )}
          {stajTipi === StajTipiEnum.IMU_404 && (
            <p className={`${toplamGun !== 70 ? 'text-red-500' : 'text-green-600'}`}>
              {toplamGun !== 70 ? '⚠️' : '✅'} IMU 404 stajı için tam olarak 70 iş günü gereklidir (Mevcut: {toplamGun} gün)
            </p>
          )}
          {stajTipi === StajTipiEnum.IMU_402 && (
            <p className={`${toplamGun > 70 ? 'text-red-500' : 'text-green-600'}`}>
              {toplamGun > 70 ? '⚠️' : '✅'} {t('internshipForm.status.imuInternship', { current: toplamGun, max: 70 })}
            </p>
          )}
          {stajTipi && !['ISTEGE_BAGLI_STAJ', 'IMU_402', 'IMU_404'].includes(stajTipi) && (
            <p className={`${toplamGun > 90 ? 'text-red-500' : 'text-green-600'}`}>
              {toplamGun > 90 ? '⚠️' : '✅'} {t('internshipForm.status.internshipDuration', { days: toplamGun })}
            </p>
          )}
        </div>
      )}
    </FormSection>
  );
};