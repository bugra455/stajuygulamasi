
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

export interface User {
  id: number;
  name: string;
  email: string;
  userType: string;
  studentId?: string;
  tcKimlik?: string;
  faculty?: string;
  class?: string;
  toplamBasvuru?: number;
  sonBasvuruTarihi?: string;
}

export interface BaseBasvuru {
  id: number;
  kurumAdi: string;
  stajTipi: StajTipiEnum;
  baslangicTarihi: string;
  bitisTarihi: string;
  onayDurumu: 'HOCA_ONAYI_BEKLIYOR' | 'KARIYER_MERKEZI_ONAYI_BEKLIYOR' | 'SIRKET_ONAYI_BEKLIYOR' | 'ONAYLANDI' | 'REDDEDILDI' | 'IPTAL_EDILDI';
  createdAt: string;
  iptalSebebi?: string | null;
  transkriptDosyasi?: string;
  sigortaDosyasi?: string;
  hizmetDokumu?: string;
  ogrenci: User;
}

export interface StajDefteri {
  id: number;
  stajBasvurusuId: number;
  dosyaYolu?: string;
  originalFileName?: string;
  fileSize?: number;
  uploadDate?: string;
  defterDurumu: string;
  createdAt: string;
  redSebebi?: string;
  stajBasvurusu?: {
    id: number;
    kurumAdi: string;
    stajTipi: StajTipiEnum;
    baslangicTarihi: string;
    bitisTarihi: string;
    onayDurumu: string;
  };
}

export interface Sirket {
  kurumAdi: string;
  kurumAdresi: string;
  yetkiliAdi: string;
  yetkiliUnvani: string;
  sorumluMail: string;
  sorumluTelefon: string;
}

export interface NotificationState {
  message: string;
  type: 'success' | 'error';
}

export type ErrorMessages = {
  [key: string]: string[] | undefined;
};
