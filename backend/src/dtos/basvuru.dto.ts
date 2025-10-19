export enum StajTipiEnum {
  IMU_402 = "IMU_402",
  IMU_404 = "IMU_404",
  MESLEKI_EGITIM_UYGULAMALI_DERS = "MESLEKI_EGITIM_UYGULAMALI_DERS",
  ISTEGE_BAGLI_STAJ = "ISTEGE_BAGLI_STAJ",
  ZORUNLU_STAJ = "ZORUNLU_STAJ"
}

export interface CreateBasvuruDTO {
  kurumAdi: string;
  kurumAdresi: string;
  sorumluTelefon: string;
  sorumluMail: string;
  yetkiliAdi: string;
  yetkiliUnvani: string;
  stajTipi: StajTipiEnum;
  baslangicTarihi: string | Date;
  bitisTarihi: string | Date;
  seciliGunler: string;
  toplamGun: number;
  saglikSigortasiDurumu: string;
  danismanMail?: string; 
  yurtDisi?: string | null;
  turkFirmasi?: string | null;
  sigortaDosyasi?: string | null;
  transkriptDosyasi?: string;
  hizmetDokumu?: string | null;
  // CAP başvuru bilgileri
  isCapBasvuru?: boolean;
  capId?: number;
  capFakulte?: string | null;
  capBolum?: string | null;
  capDepartman?: string | null;
}

// Update DTO removed: student/karier update flow has been deleted.

export interface BasvuruResponseDTO {
  id: number;
  ogrenciId: number;
  kurumAdi: string;
  kurumAdresi: string;
  sorumluTelefon: string;
  sorumluMail: string;
  yetkiliAdi: string;
  yetkiliUnvani: string;
  stajTipi: StajTipiEnum;
  baslangicTarihi: string;
  bitisTarihi: string;
  seciliGunler: string;
  toplamGun: number;
  saglikSigortasiDurumu: string;
  danismanMail: string;
  yurtDisi?: string | null;
  turkFirmasi?: string | null;
  sigortaDosyasi?: string | null;
  hizmetDokumu?: string | null;
  onayDurumu: string;
  iptalSebebi?: string;
  transkriptDosyasi?: string;
  createdAt: string;
  updatedAt: string;
  // CAP başvuru bilgileri
  isCapBasvuru?: boolean;
  capFakulte?: string | null;
  capBolum?: string | null;
  capDepartman?: string | null;
  // Student's department (optional) - useful for UI to display department instead of faculty
  department?: string | null;
}

export interface CancelBasvuruDTO {
  iptalSebebi: string;
}

export interface BasvuruListResponseDTO {
  basvurular: BasvuruResponseDTO[];
  toplam: number;
}

export interface BasvuruStatsDTO {
  beklemede: number;
  onaylandi: number;
  reddedildi: number;
  iptalEdildi: number;
  toplam: number;
}
export interface UpdateBasvuruTarihDTO {
  baslangicTarihi: string | Date;
  bitisTarihi: string | Date;
  toplamGun: number;
}

export interface UpdateBasvuruTarihResponseDTO {
  id: number;
  baslangicTarihi: string;
  bitisTarihi: string;
  toplamGun: number;
  updatedAt: string;
}
