// Staj Tipi Enum ve Labels
export enum StajTipiEnum {
  IMU_402 = "IMU-402",
  IMU_404 = "IMU-404", 
  MESLEKI_EGITIM_UYGULAMALI_DERS = "MESLEKI_EGITIM_UYGULAMALI_DERS",
  ISTEGE_BAGLI_STAJ = "ISTEGE_BAGLI_STAJ",
  ZORUNLU_STAJ = "ZORUNLU_STAJ"
}

export const stajTipiLabels: Record<StajTipiEnum, string> = {
  [StajTipiEnum.IMU_402]: "IMU-402",
  [StajTipiEnum.IMU_404]: "IMU-404",
  [StajTipiEnum.MESLEKI_EGITIM_UYGULAMALI_DERS]: "Mesleki Eğitim Uygulamalı Ders (SBF-SHMYO)",
  [StajTipiEnum.ISTEGE_BAGLI_STAJ]: "İsteğe Bağlı Staj (Fakülte - Yüksekokul)",
  [StajTipiEnum.ZORUNLU_STAJ]: "Zorunlu Staj (MYO)"
};

export const STAJ_TIPLERI = Object.values(StajTipiEnum);

export const HAFTA_GUNLERI = [
  { id: "pazartesi", etiket: "Pazartesi", gunIndex: 1 },
  { id: "sali", etiket: "Salı", gunIndex: 2 },
  { id: "carsamba", etiket: "Çarşamba", gunIndex: 3 },
  { id: "persembe", etiket: "Perşembe", gunIndex: 4 },
  { id: "cuma", etiket: "Cuma", gunIndex: 5 },
  { id: "cumartesi", etiket: "Cumartesi", gunIndex: 6 },
];
