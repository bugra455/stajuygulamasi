import { config } from '../lib/config.js';
import path from 'node:path';
import { FileUploadData } from './file.utils.js';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ValidationUtils {
  static validateId(id: string | number, fieldName: string = 'ID'): number {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;

    if (isNaN(numericId) || numericId <= 0) {
      throw new ValidationError(`Geçersiz ${fieldName}.`);
    }

    return numericId;
  }

  static validateFile(data: FileUploadData): void {
    if (!data) {
      throw new ValidationError('Dosya yüklenmedi.');
    }

    const allowedMimeTypes = config.ALLOWED_FILE_TYPES.split(',');
    const allowedExtensions = ['.pdf'];

    if (!allowedMimeTypes.includes(data.mimetype)) {
      throw new ValidationError('Sadece PDF dosyaları kabul edilir.');
    }

    const fileExtension = path.extname(data.filename).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      throw new ValidationError('Geçersiz dosya uzantısı.');
    }

    // Note: readableLength might not be available, use different size check
    // This will be handled during stream processing
  }

  static validateRequired(value: unknown, fieldName: string): void {
    if (value === undefined || value === null || value === '') {
      throw new ValidationError(`${fieldName} alanı zorunludur.`);
    }
  }

  static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Geçersiz e-posta adresi.');
    }
  }

  static validatePhoneNumber(phone: string): void {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phone) || phone.length < 10) {
      throw new ValidationError('Geçersiz telefon numarası.');
    }
  }

  static validateDateRange(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('Geçersiz tarih formatı.');
    }
    
    if (start >= end) {
      throw new ValidationError('Başlangıç tarihi bitiş tarihinden önce olmalıdır.');
    }
  }

  /**
   * Tarihin geçmişte olup olmadığını kontrol eder (sadece tarih kısmı, saat göz ardı edilir)
   * @param dateString ISO tarih string'i (YYYY-MM-DD veya YYYY-MM-DDTHH:mm:ss.sssZ)
   * @param fieldName Hata mesajında kullanılacak alan adı
   */
  static validateFutureDate(dateString: string, fieldName: string = 'Tarih'): void {
    const inputDate = new Date(dateString);
    
    if (isNaN(inputDate.getTime())) {
      throw new ValidationError(`Geçersiz ${fieldName.toLowerCase()} formatı.`);
    }
    
    // Sadece tarih kısmını karşılaştır (timezone sorunlarını önlemek için)
    const inputDateStr = inputDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (inputDateStr <= todayStr) {
      throw new ValidationError(`${fieldName} gelecekte olmalıdır.`);
    }
  }

  static validateStudentNumber(studentNumber: string): void {
    const studentNumberRegex = /^\d{8,12}$/;
    if (!studentNumberRegex.test(studentNumber)) {
      throw new ValidationError('Öğrenci numarası 8-12 haneli olmalıdır.');
    }
  }
}
