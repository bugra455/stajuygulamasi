import { z } from 'zod';

// Helper function to sanitize and validate strings
const sanitizedString = (min: number, max: number = 255) => 
  z.string()
    .min(min)
    .max(max)
    .regex(/^[^<>"\\'&]*$/, { message: 'Özel karakterler kullanılamaz.' })
    .transform(str => str.trim());

// Email validation with more specific rules
const emailSchema = z.string()
  .email({ message: 'Geçerli bir e-posta adresi giriniz.' })
  .max(255)
  .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, { 
    message: 'E-posta formatı geçersiz.' 
  });

// Phone number validation
const phoneSchema = z.string()
  .regex(/^[\d\s\-\+\(\)]{10,15}$/, { 
    message: 'Geçerli bir telefon numarası giriniz.' 
  });

// Base schema without refinements for partial updates
const baseBasvuruSchema = z.object({
  kurumAdi: sanitizedString(3, 100),
  kurumAdresi: sanitizedString(10, 300),
  sorumluTelefon: phoneSchema,
  sorumluMail: emailSchema,
  yetkiliAdi: sanitizedString(1, 100),
  yetkiliUnvani: sanitizedString(1, 100),
  stajTipi: z.enum([
    'IMU_402', 'IMU_404', 'MESLEKI_EGITIM_UYGULAMALI_DERS', 'ISTEGE_BAGLI_STAJ', 'ZORUNLU_STAJ'
  ], {
    errorMap: () => ({ message: 'Geçerli bir staj tipi seçilmelidir.' })
  }),
  baslangicTarihi: z.coerce.date({
    errorMap: () => ({ message: 'Geçerli bir başlangıç tarihi giriniz.' }),
  }).refine(date => {
    const now = new Date();
    const minStartDate = new Date(now);
    minStartDate.setDate(now.getDate() + 10); // En az 10 gün sonra olmalı
    return date >= minStartDate;
  }, {
    message: 'Staj başlangıç tarihi başvuru tarihinden en az 10 gün sonra olmalıdır.'
  }).refine(date => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const startMonth = date.getMonth();
    const startYear = date.getFullYear();
    return startMonth === currentMonth && startYear === currentYear;
  }, {
    message: 'Staj başvurusu sadece bulunduğunuz ay için yapılabilir.'
  }),
  bitisTarihi: z.coerce.date({
    errorMap: () => ({ message: 'Geçerli bir bitiş tarihi giriniz.' }),
  }),
  seciliGunler: sanitizedString(1, 50),
  toplamGun: z.coerce.number()
    .int({ message: 'Toplam gün tam sayı olmalıdır.' })
    .min(1, { message: 'Toplam gün en az 1 olmalıdır.' })
    .max(365, { message: 'Toplam gün maksimum 365 olabilir.' }),
  saglikSigortasiDurumu: z.enum(['ALIYORUM', 'ALMIYORUM'], {
    errorMap: () => ({ message: 'Sağlık sigortası durumu belirtilmelidir.' })
  }),
  danismanMail: emailSchema.optional(), // Artık opsiyonel - otomatik doldurulacak
  // Yeni alanlar (opsiyonel veya nullable olarak eklendi)
  yurtDisi: z.enum(["yurtiçi", "yurtdışı"]).nullable().optional(),
  turkFirmasi: z.enum(["evet", "hayır"]).nullable().optional(),
  sigortaDosyasi: z.string().nullable().optional(), // Dosya backend'de multer ile alınır, burada path veya orijinal isim tutulabilir
  hizmetDokumu: z.string().nullable().optional(), // Hizmet dökümü dosyası
  transkriptDosyasi: z.string().nullable().optional(), // Transkript dosyası
  // CAP başvuru bilgileri
  isCapBasvuru: z.boolean().optional(),
  capId: z.coerce.number().optional(),
  capFakulte: z.string().nullable().optional(),
  capBolum: z.string().nullable().optional(),
  capDepartman: z.string().nullable().optional(),
});

export const createBasvuruBodySchema = baseBasvuruSchema.refine(
  data => data.bitisTarihi > data.baslangicTarihi, {
    message: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır.',
    path: ['bitisTarihi']
  }
);

// updateBasvuruBodySchema removed: update flow was deleted.

export const iptalBasvuruBodySchema = z.object({
  iptalSebebi: sanitizedString(10, 500),
});
export const updateBasvuruTarihBodySchema = z.object({
  baslangicTarihi: z.coerce.date({
    errorMap: () => ({ message: 'Geçerli bir başlangıç tarihi giriniz.' }),
  }).refine(date => {
    const now = new Date();
    const minStartDate = new Date(now);
    minStartDate.setDate(now.getDate() + 10); // En az 10 gün sonra olmalı
    return date >= minStartDate;
  }, {
    message: 'Staj başlangıç tarihi başvuru tarihinden en az 10 gün sonra olmalıdır.'
  }).refine(date => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const startMonth = date.getMonth();
    const startYear = date.getFullYear();
    return startMonth === currentMonth && startYear === currentYear;
  }, {
    message: 'Staj başvurusu sadece bulunduğunuz ay için yapılabilir.'
  }),
  bitisTarihi: z.coerce.date({
    errorMap: () => ({ message: 'Geçerli bir bitiş tarihi giriniz.' }),
  }),
  toplamGun: z.coerce.number()
    .int({ message: 'Toplam gün tam sayı olmalıdır.' })
    .min(1, { message: 'Toplam gün en az 1 olmalıdır.' })
    .max(365, { message: 'Toplam gün maksimum 365 olabilir.' }),
}).refine(
  data => data.bitisTarihi > data.baslangicTarihi, {
    message: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır.',
    path: ['bitisTarihi']
  }
);
