// DTOs for Defter (Internship Diary) operations

export interface DefterPdfUploadDTO {
  basvuruId: number;
  file: Buffer;
  originalName: string;
  mimeType: string;
}

export interface DefterResponseDTO {
  id: number;
  stajBasvurusuId: number;
  dosyaYolu?: string;
  originalFileName?: string;
  fileSize?: number;
  uploadDate?: Date;
  defterDurumu: string;
  createdAt: Date;
  updatedAt: Date;
  stajBasvurusu?: {
    id: number;
    kurumAdi: string;
    stajTipi: string;
    baslangicTarihi: Date;
    bitisTarihi: Date;
    onayDurumu: string;
  };
}

export interface DefterListResponseDTO {
  defterler: DefterResponseDTO[];
  toplam: number;
}

export interface DefterStatsDTO {
  toplamDefter: number;
  yuklenmis: number;
  onaylanan: number;
  bekleyen: number;
}
