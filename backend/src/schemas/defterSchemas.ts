import { z } from 'zod';

// Defter durumu enum
export const DefterDurumuEnum = z.enum(['Beklemede', 'Yuklendi', 'Onaylandi']);

// Route parametreleri için şemalar
export const DefterParams = z.object({
  id: z.string(),
});

export const DefterUploadParams = z.object({
  basvuruId: z.string(),
});

// PDF yükleme şeması
export const defterPdfUploadSchema = z.object({
  basvuruId: z.number().int().positive('Başvuru ID pozitif bir sayı olmalıdır.'),
});

// Defter durumunu güncelleme şeması
export const updateDefterDurumuSchema = z.object({
  yeniDurum: DefterDurumuEnum,
});

// PDF dosya tipini kontrol için
export const allowedMimeTypes = ['application/pdf'];
export const maxFileSize = 50 * 1024 * 1024; // 50MB
