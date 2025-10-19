import * as XLSX from 'xlsx';
import { PrismaClient, UserType } from '../generated/prisma/index.js';
import LoggerService from './logger.service.js';
import WebSocketNotificationService from './websocket.service.js';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const logger = LoggerService.getInstance();

interface ExcelImportResult {
  success: boolean;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  errorRows: number;
  errors: string[];
  dosyaId: number;
}

interface HocaExcelRow {
  D?: string;  // İsim - ilk kısım
  E?: string;  // İsim - ikinci kısım
  G?: string;  // Email (username olarak da kullanılacak)
  F?: string;  // TC Kimlik
  H?: string;  // Fakulte
  I?: string;  // Department
}

interface OgrenciExcelRow {
  A?: string;  // TC Kimlik (aynı zamanda parola)
  B?: string;  // Student ID
  C?: string;  // İsim - ilk kısım
  D?: string;  // İsim - ikinci kısım
  E?: string;  // Danışman adı
  F?: string;  // (Artık kullanılmıyor)
  N?: string;  // Faculty
  O?: string;  // Department
  R?: string;  // Class
}

interface CapOgrenciExcelRow {
  A?: string;  // UstBirimAdi
  B?: string;  // BirimAdi
  C?: string;  // ProgramAdi
  D?: string;  // OgrenciNo (Student ID for username)
  E?: string;  // T.C. (TC Kimlik - for password)
  F?: string;  // ad (First name)
  G?: string;  // soyad (Last name)
  H?: string;  // sinif (Class)
  I?: string;  // KayitYili
  J?: string;  // KayitDonemi
  K?: string;  // Ortalama
  L?: string;  // DalTipi
  M?: string;  // AnadalDurum
  N?: string;  // CiftYandalDurum
  O?: string;  // CiftYandalDetaydurum
  P?: string;  // CiftAnadalUstBirimAdi
  Q?: string;  // CiftAnadalBirimAdi
  R?: string;  // CiftAnadalProgramAdi
  S?: string;  // TamamlananKredi
  T?: string;  // TamamlananEcts
  U?: string;  // CiftyandalDanisman (Danışman adı)
  V?: string;  // BolumSiralamasi
}

export class ExcelService {
  // Placeholder char (regular space) to store for empty cells
  private static readonly PLACEHOLDER = ' ';
  // Hoca Excel dosyasını oku ve işle
  static async processHocaExcel(filePath: string, originalFileName: string, existingDosyaId?: number): Promise<ExcelImportResult> {
  let actualDosyaId = existingDosyaId || 0;
    const errors: string[] = [];
    let totalRows = 0;
    let processedRows = 0;
    let successfulRows = 0;
    let errorRows = 0;
    let skippedRows = 0;
    
    const wsService = WebSocketNotificationService.getInstance();

    try {
      // Yüklenen dosya kaydını oluştur
      const yuklenenDosya = await prisma.yuklenenDosya.create({
        data: {
          dosyaAdi: originalFileName,
          dosyaTipi: 'danisman',
          dosyaYolu: filePath,
          durumu: 'ISLENIYOR'
        }
      });
      
      actualDosyaId = yuklenenDosya.id;
      logger.log(null, {
        level: 'INFO' as any,
        action: 'EXCEL_IMPORT_START' as any,
        details: { message: `Hoca Excel işlemi başladı: ${originalFileName}` }
      });

  // Debug flag - set EXCEL_DEBUG=true in environment to enable verbose logs
  const debug = process.env.EXCEL_DEBUG === 'true';

      // Dosya varlığını kontrol et ve hazır olmasını bekle
      console.log('📁 [EXCEL] Dosya yolu:', filePath);
      console.log('📁 [EXCEL] Dosya yolu (absolute):', path.resolve(filePath));
      console.log('📁 [EXCEL] Working directory:', process.cwd());
      
      // Dosya varlık kontrolü
      const absoluteFilePath = path.resolve(filePath);
      if (!fs.existsSync(absoluteFilePath)) {
        console.error('❌ [EXCEL] Dosya bulunamadı:', absoluteFilePath);
        throw new Error(`Excel dosyası bulunamadı: ${absoluteFilePath}`);
      }
      console.log('✅ [EXCEL] Dosya var');

      // Dosyanın tamamen yazıldığından ve erişilebilir olduğundan emin olmak için kontroller
      const maxRetries = 15;
      let retries = 0;
      let fileReady = false;
      
      while (!fileReady && retries < maxRetries) {
        try {
          retries++;
          console.log(`📊 [EXCEL] Dosya hazırlık kontrolü ${retries}/${maxRetries}...`);
          
          // Dosya boyutu kontrolü
          const stats = fs.statSync(absoluteFilePath);
          if (stats.size === 0) {
            throw new Error('Dosya boyutu 0');
          }
          
          // Dosya erişim kontrolü
          fs.accessSync(absoluteFilePath, fs.constants.R_OK);
          
          // Dosyayı açma testi
          const fd = fs.openSync(absoluteFilePath, 'r');
          fs.closeSync(fd);
          
          // Buffer okuma testi
          const testBuffer = fs.readFileSync(absoluteFilePath, { encoding: null });
          if (testBuffer.length === 0) {
            throw new Error('Dosya içeriği boş');
          }
          
          console.log(`✅ [EXCEL] Dosya hazır - Boyut: ${stats.size} bytes`);
          fileReady = true;
          
        } catch (error: any) {
          console.log(`⏳ [EXCEL] Dosya henüz hazır değil (${retries}/${maxRetries}):`, error.message);
          
          if (retries >= maxRetries) {
            throw new Error(`Dosya ${maxRetries} deneme sonrası hâlâ hazır değil: ${absoluteFilePath}. Son hata: ${error.message}`);
          }
          
          // Exponential backoff: 50ms, 100ms, 150ms, 200ms...
          const waitTime = Math.min(50 * retries, 500);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      // Excel dosyasını oku
      console.log('📖 [EXCEL] Excel dosyası okunuyor...');
      let workbook: any;
      let jsonData: HocaExcelRow[];
      
      try {
        // Dosya istatistiklerini kontrol et
        const stats = fs.statSync(absoluteFilePath);
        console.log('📊 [EXCEL] Final dosya boyutu:', stats.size, 'bytes');
        console.log('📊 [EXCEL] Dosya son değişiklik:', stats.mtime);
        console.log('📊 [EXCEL] Dosya erişim zamanı:', stats.atime);
        
        // Dosya boş mu kontrol et
        if (stats.size === 0) {
          throw new Error('Excel dosyası boş');
        }
        
        let readAttempts = 0;
        const maxReadAttempts = 5;
        let lastError: Error;
        
        while (readAttempts < maxReadAttempts) {
          try {
            // Workbook okuma - buffer ile
            console.log(`📖 [EXCEL] Excel okuma denemesi ${readAttempts}/${maxReadAttempts}...`);
            console.log(`📖 [EXCEL] Okunacak dosya: ${absoluteFilePath}`);
            
            // Dosya erişim son kontrol
            fs.accessSync(absoluteFilePath, fs.constants.R_OK);
            
            // Dosyayı buffer olarak oku
            const fileBuffer = fs.readFileSync(absoluteFilePath);
            console.log(`📖 [EXCEL] Buffer boyutu: ${fileBuffer.length} bytes`);
            
            // Buffer'dan workbook oluştur
            workbook = XLSX.read(fileBuffer, { 
              type: 'buffer',
              cellDates: true, 
              cellText: false,
              raw: false
            });
            
            // Workbook doğrulama
            if (!workbook || !workbook.SheetNames) {
              throw new Error('Workbook geçersiz veya bozuk');
            }
            
            console.log(`✅ [EXCEL] Workbook başarıyla okundu (deneme: ${readAttempts})`);
            break;
            
          } catch (readError: any) {
            lastError = readError;
            console.log(`⚠️ [EXCEL] Okuma denemesi ${readAttempts} başarısız:`, readError.message);
            
            if (readAttempts >= maxReadAttempts) {
              throw new Error(`Excel dosyası ${maxReadAttempts} deneme sonrası okunamadı. Dosya: ${absoluteFilePath}. Son hata: ${readError.message}`);
            }
            
            // Progressive wait: 100ms, 200ms, 400ms, 800ms...
            const waitTime = 100 * Math.pow(2, readAttempts - 1);
            console.log(`⏳ [EXCEL] ${waitTime}ms bekleniyor...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
        
        console.log('📖 [EXCEL] Sheet sayısı:', workbook.SheetNames.length);
        console.log('📋 [EXCEL] Sheet isimleri:', workbook.SheetNames);
        
        if (workbook.SheetNames.length === 0) {
          throw new Error('Excel dosyasında sheet bulunamadı');
        }
        
        const sheetName = workbook.SheetNames[0];
        console.log('📋 [EXCEL] Kullanılacak sheet:', sheetName);
        
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          throw new Error(`Sheet '${sheetName}' bulunamadı`);
        }
        
        console.log('📝 [EXCEL] Worksheet alındı');
        
        // JSON'a çevir - use column letters as headers so we get A,B,C... keys
        jsonData = (XLSX.utils.sheet_to_json<HocaExcelRow>(worksheet, {
          header: 'A',
          defval: '',
          blankrows: false
        }) as HocaExcelRow[])
          .map(r => ExcelService.normalizeRow(r));
        console.log('🔄 [EXCEL] JSON dönüşümü başarılı, toplam satır:', jsonData.length);
        if (debug) {
          console.log('🔍 [EXCEL][DEBUG] İlk 50 satır (ham):', JSON.stringify(jsonData.slice(0, 50), null, 2));
        }
        
      } catch (excelError: any) {
        console.error('❌ [EXCEL] Excel okuma hatası:', excelError.message);
        console.error('❌ [EXCEL] Hata detayı:', excelError);
        console.error('❌ [EXCEL] Dosya yolu:', absoluteFilePath);
        console.error('❌ [EXCEL] Dosya var mı:', fs.existsSync(absoluteFilePath));
        if (fs.existsSync(absoluteFilePath)) {
          const errorStats = fs.statSync(absoluteFilePath);
          console.error('❌ [EXCEL] Dosya boyutu:', errorStats.size);
        }
        throw new Error(`Excel dosyası okunamadı: ${excelError.message}`);
      }

      totalRows = jsonData.length;
      
      await prisma.yuklenenDosya.update({
        where: { id: actualDosyaId },
        data: { toplamSatir: totalRows }
      });

      // 5000'lik chunk'larda işle
      const chunkSize = 5000;
      for (let i = 0; i < jsonData.length; i += chunkSize) {
        const chunk = jsonData.slice(i, i + chunkSize);
        
        // Send progress update
        const progressPercentage = Math.floor((i / jsonData.length) * 100);
  wsService.notifyProgressUpdate(actualDosyaId, 80 + Math.floor(progressPercentage * 0.2), 'processing');
        
        for (const row of chunk) {
          processedRows++;
          
          // Check for cancellation every 5 rows for faster response
          if (processedRows % 5 === 0 && await wsService.isUploadAborted(actualDosyaId)) {
            console.log(`🚫 [EXCEL] Hoca upload cancelled at row ${processedRows}, stopping...`);
            
            // Mark DB record as cancelled
            try {
              await prisma.yuklenenDosya.update({
                where: { id: actualDosyaId },
                data: { durumu: 'IPTAL', tamamlanmaTarih: new Date(), hataMesaji: 'Kullanıcı tarafından iptal edildi' }
              });
            } catch (dbErr) {
              console.error('❌ [EXCEL] Failed to mark upload as cancelled in DB:', dbErr);
            }

            // Notify clients about cancellation
            wsService.notifyProgress(actualDosyaId, 'Dosya yükleme iptal edildi');
            wsService.broadcast({ type: 'upload_cancelled', dosyaId: actualDosyaId, message: 'Dosya yükleme iptal edildi', timestamp: new Date().toISOString() } as any);

            // Stop processing immediately
            return {
              success: false,
              totalRows,
              processedRows,
              successfulRows,
              errorRows,
              errors: [...errors, 'Kullanıcı iptali'],
              dosyaId: actualDosyaId
            } as ExcelImportResult;
          }
          
          try {
            if (debug) {
              console.log(`🔎 [EXCEL][DEBUG] İşlenen satır ${processedRows} (raw):`, JSON.stringify(row));
            }
            // Excel verilerini al (placeholder kullan; trim etmiyoruz)
            const name = this.buildName(row.D, row.E);
            const email = (row.G !== undefined && row.G !== null) ? String(row.G) : ExcelService.PLACEHOLDER;
            const tcKimlik = (row.F !== undefined && row.F !== null) ? String(row.F) : ExcelService.PLACEHOLDER;
            const faculty = (row.H !== undefined && row.H !== null) ? String(row.H) : ExcelService.PLACEHOLDER;
            const department = (row.I !== undefined && row.I !== null) ? String(row.I) : ExcelService.PLACEHOLDER;

            // Minimal validation policy: do not enforce format checks (data may be messy).
            // Instead sanitize all fields to prevent string-based attacks before DB writes.
            const sanitizedName = ExcelService.sanitizeString(name, 255);
            const sanitizedEmail = ExcelService.sanitizeString(email === ExcelService.PLACEHOLDER ? ExcelService.PLACEHOLDER : email, 254);
            const sanitizedTC = ExcelService.sanitizeString(tcKimlik === ExcelService.PLACEHOLDER ? ExcelService.PLACEHOLDER : tcKimlik, 32);
            const sanitizedFaculty = ExcelService.sanitizeString(faculty === ExcelService.PLACEHOLDER ? ExcelService.PLACEHOLDER : faculty, 255);
            const sanitizedDepartment = ExcelService.sanitizeString(department === ExcelService.PLACEHOLDER ? ExcelService.PLACEHOLDER : department, 255);

            // Parola oluştur: "htc" + TC Kimlik
            // Skip rows when email or TC are empty (placeholder)
            if (sanitizedEmail === ExcelService.PLACEHOLDER || sanitizedTC === ExcelService.PLACEHOLDER) {
              // Do not treat skipped rows as errors; just skip processing
              skippedRows++;
              if (debug) console.log(`⏭️ [EXCEL][DEBUG] Satır ${processedRows} atlandı (skip): email veya TC boş`);
              continue;
            }

            const password = 'htc' + sanitizedTC;
            const hashedPassword = await bcrypt.hash(password, 10);
            if (debug) {
              console.log(`🔐 [EXCEL][DEBUG] Satır ${processedRows} hashedPassword length:`, hashedPassword.length);
            }

            // Kullanıcıyı kontrol et ve güncelle/ekle
            const existingUser = await prisma.user.findFirst({
              where: {
                OR: [
                  { email: sanitizedEmail },
                  { tcKimlik: sanitizedTC },
                  { kullaniciAdi: sanitizedEmail }
                ]
              }
            });

    if (existingUser) {
              // Güncelle
              const updateResult = await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  name: sanitizedName,
                  email: sanitizedEmail,
                  kullaniciAdi: sanitizedEmail,
                  password: hashedPassword,
                  tcKimlik: sanitizedTC,
                  userType: UserType.DANISMAN,
                  faculty: sanitizedFaculty,
      department: sanitizedDepartment,
      yuklemeNo: actualDosyaId
                }
              });
              if (debug) console.log(`🗃️ [EXCEL][DEBUG] Satır ${processedRows} updateResult:`, JSON.stringify({ id: updateResult.id }));
            } else {
              // Yeni ekle
        const createResult = await prisma.user.create({
                data: {
                  name: sanitizedName,
                  email: sanitizedEmail,
                  kullaniciAdi: sanitizedEmail,
                  password: hashedPassword,
                  tcKimlik: sanitizedTC,
                  userType: UserType.DANISMAN,
                  faculty: sanitizedFaculty,
          department: sanitizedDepartment,
          yuklemeNo: actualDosyaId
                }
              });
              if (debug) console.log(`🗃️ [EXCEL][DEBUG] Satır ${processedRows} createResult:`, JSON.stringify({ id: createResult.id }));
            }

            successfulRows++;
            
          } catch (error: any) {
            errors.push(`Satır ${processedRows}: ${error.message}`);
            errorRows++;
            logger.log(null, {
              level: 'ERROR' as any,
              action: 'EXCEL_ROW_ERROR' as any,
              details: { message: `Hoca Excel satır hatası: ${error.message}` }
            });
          }

          // Progress güncelle (her 1000 satirda bir)
          if (processedRows % 1000 === 0) {
            await prisma.yuklenenDosya.update({
              where: { id: actualDosyaId },
              data: { 
                islenenSatir: processedRows,
                basariliSatir: successfulRows,
                hataliSatir: errorRows
              }
            });
            
            // WebSocket progress notification gönder
            const { WebSocketNotificationService } = await import('./websocket.service.js');
            const wsService = WebSocketNotificationService.getInstance();
            const progressPercentage = Math.round((processedRows / totalRows) * 100);
            wsService.notifyProgressUpdate(actualDosyaId, progressPercentage, 'processing');
          }
        }
      }

      // Final güncelleme
      await prisma.yuklenenDosya.update({
        where: { id: actualDosyaId },
        data: {
          durumu: errorRows === 0 ? 'TAMAMLANDI' : 'HATA',
          islenenSatir: processedRows,
          basariliSatir: successfulRows,
          hataliSatir: errorRows,
          // store errors or include skippedRows count when no errors
          hataMesaji: errors.length > 0 ? errors.slice(0, 10).join('; ') : (skippedRows > 0 ? `Skipped rows: ${skippedRows}` : null),
          tamamlanmaTarih: new Date()
        }
      });

      logger.log(null, {
        level: 'INFO' as any,
        action: 'EXCEL_IMPORT_COMPLETE' as any,
        details: { message: `Hoca Excel tamamlandı. Başarılı: ${successfulRows}, Hatalı: ${errorRows}` }
      });

      if (debug) {
        console.log('✅ [EXCEL][DEBUG] İşlem özeti:', JSON.stringify({ totalRows, processedRows, successfulRows, errorRows, errors: errors.slice(0, 50) }, null, 2));
      }

      return {
        success: errorRows < totalRows / 2, // %50'den fazla başarılıysa success
        totalRows,
        processedRows,
        successfulRows,
        errorRows,
        errors: errors.slice(0, 20), // İlk 20 hatayı döndür
        dosyaId: actualDosyaId
      };

    } catch (error: any) {
      logger.log(null, {
        level: 'ERROR' as any,
        action: 'EXCEL_IMPORT_ERROR' as any,
        details: { message: `Hoca Excel hatası: ${error.message}` }
      });
      
      if (actualDosyaId > 0) {
        await prisma.yuklenenDosya.update({
          where: { id: actualDosyaId },
          data: {
            durumu: 'HATA',
            hataMesaji: error.message,
            tamamlanmaTarih: new Date()
          }
        });
      }

      return {
        success: false,
        totalRows,
        processedRows,
        successfulRows,
        errorRows: totalRows,
        errors: [error.message],
        dosyaId: actualDosyaId
      };
    }
  }

  // İsim birleştirme (D ve E sütunları)
  private static buildName(firstPart?: string, secondPart?: string): string {
    // Preserve placeholder (single space) and avoid trimming it away
    const parts = [firstPart, secondPart].map(p => {
      if (p === undefined || p === null) return '';
      if (p === ExcelService.PLACEHOLDER) return ExcelService.PLACEHOLDER;
      return String(p).trim();
    }).filter(p => p !== '');
    return parts.join(' ');
  }

  // Email validasyon
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // TC Kimlik validasyon
  private static isValidTCKimlik(tcKimlik: string): boolean {
    if (!/^\d{11}$/.test(tcKimlik)) {
      return false;
    }
    return true;
  }

  // Basit string sanitizer: kontrol karakterlerini kaldırır, max uzunluk uygular ve temel HTML kaçış yapar
  private static sanitizeString(value: string, maxLen: number): string {
    if (value === ExcelService.PLACEHOLDER) return ExcelService.PLACEHOLDER;
    let s = String(value);
    // Remove null bytes
    s = s.replace(/\x00/g, '');
    // Replace control chars (except common whitespace) with space
    s = s.replace(/[\x00-\x1F\x7F]/g, ' ');
    // Basic HTML escape to mitigate XSS when rendered
    s = s.replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;')
         .replace(/'/g, '&#39;');
    // Collapse multiple spaces to single
    s = s.replace(/\s+/g, ' ');
    s = s.trim();
    if (s.length === 0) return ExcelService.PLACEHOLDER;
    if (s.length > maxLen) s = s.slice(0, maxLen);
    return s;
  }

  // Dosya upload durumunu getir
  static async getDosyaDurumu(dosyaId: number) {
    return await prisma.yuklenenDosya.findUnique({
      where: { id: dosyaId }
    });
  }

  // Tüm upload geçmişini getir
  static async getUploadHistory(limit: number = 50) {
    return await prisma.yuklenenDosya.findMany({
      orderBy: { yuklenenTarih: 'desc' },
      take: limit
    });
  }

  // Hücreyi normalize et: undefined/null/boş -> tek boşluk, değilse trim edilmiş string
  private static normalizeCell(value?: string): string {
    if (value === undefined || value === null) return ExcelService.PLACEHOLDER;
    const s = String(value).trim();
    return s.length === 0 ? ExcelService.PLACEHOLDER : s;
  }

  // Satırdaki beklenen alanları normalize et
  private static normalizeRow(row: HocaExcelRow): HocaExcelRow {
    return {
      H: this.normalizeCell(row.H),
      I: this.normalizeCell(row.I),
      D: this.normalizeCell(row.D),
      E: this.normalizeCell(row.E),
      F: this.normalizeCell(row.F),
      G: this.normalizeCell(row.G),
    };
  }

  // Öğrenci satırlarını normalize et
  private static normalizeOgrenciRow(row: OgrenciExcelRow): OgrenciExcelRow {
    return {
      A: this.normalizeCell(row.A), // TC Kimlik (aynı zamanda parola)
      B: this.normalizeCell(row.B), // stdID  
      C: this.normalizeCell(row.C), // name first part
      D: this.normalizeCell(row.D), // name second part
      E: this.normalizeCell(row.E), // danişman adı
      N: this.normalizeCell(row.N), // faculty
      O: this.normalizeCell(row.O), // department
      R: this.normalizeCell(row.R), // class
    };
  }

  // Öğrenci Excel dosyasını oku ve işle
  // If dosyaId is provided, it will update the existing uploaded file record
  static async processOgrenciExcel(filePath: string, originalFileName: string, existingDosyaId?: number): Promise<ExcelImportResult> {
    let dosyaId = 0;
    const errors: string[] = [];
    let totalRows = 0;
    let processedRows = 0;
    let successfulRows = 0;
    let errorRows = 0;
    let skippedRows = 0;
    
    const wsService = WebSocketNotificationService.getInstance();

    try {
      // Yüklenen dosya kaydını oluştur veya var olanı kullan
      if (existingDosyaId && existingDosyaId > 0) {
        dosyaId = existingDosyaId;
        await prisma.yuklenenDosya.update({ where: { id: dosyaId }, data: { durumu: 'ISLENIYOR', dosyaYolu: filePath } });
      } else {
        const yuklenenDosya = await prisma.yuklenenDosya.create({
          data: {
            dosyaAdi: originalFileName,
            dosyaTipi: 'ogrenci',
            dosyaYolu: filePath,
            durumu: 'ISLENIYOR'
          }
        });
        dosyaId = yuklenenDosya.id;
      }
      logger.log(null, {
        level: 'INFO' as any,
        action: 'EXCEL_IMPORT_START' as any,
        details: { message: `Öğrenci Excel işlemi başladı: ${originalFileName}` }
      });

      // Debug flag
      const debug = process.env.EXCEL_DEBUG === 'true';

      // Dosya varlığını kontrol et ve hazır olmasını bekle
      console.log('📁 [EXCEL] Öğrenci dosya yolu:', filePath);
      console.log('📁 [EXCEL] Dosya yolu (absolute):', path.resolve(filePath));
      console.log('📁 [EXCEL] Working directory:', process.cwd());
      
      // Dosya varlık kontrolü
      const absoluteFilePath = path.resolve(filePath);
      if (!fs.existsSync(absoluteFilePath)) {
        console.error('❌ [EXCEL] Dosya bulunamadı:', absoluteFilePath);
        throw new Error(`Excel dosyası bulunamadı: ${absoluteFilePath}`);
      }
      console.log('✅ [EXCEL] Dosya var');

      // Dosyanın tamamen yazıldığından ve erişilebilir olduğundan emin olmak için kontroller
      const maxRetries = 15;
      let retries = 0;
      let fileReady = false;
      
      while (!fileReady && retries < maxRetries) {
        try {
          retries++;
          console.log(`📊 [EXCEL] Dosya hazırlık kontrolü ${retries}/${maxRetries}...`);
          
          // Dosya boyutu kontrolü
          const stats = fs.statSync(absoluteFilePath);
          if (stats.size === 0) {
            throw new Error('Dosya boyutu 0');
          }
          
          // Dosya erişim kontrolü
          fs.accessSync(absoluteFilePath, fs.constants.R_OK);
          
          // Dosyayı açma testi
          const fd = fs.openSync(absoluteFilePath, 'r');
          fs.closeSync(fd);
          
          // Buffer okuma testi
          const testBuffer = fs.readFileSync(absoluteFilePath, { encoding: null });
          if (testBuffer.length === 0) {
            throw new Error('Dosya içeriği boş');
          }
          
          console.log(`✅ [EXCEL] Dosya hazır - Boyut: ${stats.size} bytes`);
          fileReady = true;
          
        } catch (error: any) {
          console.log(`⏳ [EXCEL] Dosya henüz hazır değil (${retries}/${maxRetries}):`, error.message);
          
          if (retries >= maxRetries) {
            throw new Error(`Dosya ${maxRetries} deneme sonrası hâlâ hazır değil: ${absoluteFilePath}. Son hata: ${error.message}`);
          }
          
          // Exponential backoff: 50ms, 100ms, 150ms, 200ms...
          const waitTime = Math.min(50 * retries, 500);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      // Excel dosyasını oku
      console.log('📖 [EXCEL] Excel dosyası okunuyor...');
      let workbook: any;
      let jsonData: OgrenciExcelRow[];
      
      try {
        // Dosya istatistiklerini kontrol et
        const stats = fs.statSync(absoluteFilePath);
        console.log('📊 [EXCEL] Final dosya boyutu:', stats.size, 'bytes');
        console.log('📊 [EXCEL] Dosya son değişiklik:', stats.mtime);
        console.log('📊 [EXCEL] Dosya erişim zamanı:', stats.atime);
        
        // Dosya boş mu kontrol et
        if (stats.size === 0) {
          throw new Error('Excel dosyası boş');
        }
        
        let readAttempts = 0;
        const maxReadAttempts = 5;
        let lastError: Error;
        
        while (readAttempts < maxReadAttempts) {
          try {
            // Workbook okuma - buffer ile
            console.log(`📖 [EXCEL] Excel okuma denemesi ${readAttempts + 1}/${maxReadAttempts}...`);
            console.log(`📖 [EXCEL] Okunacak dosya: ${absoluteFilePath}`);
            
            // Dosya erişim son kontrol
            fs.accessSync(absoluteFilePath, fs.constants.R_OK);
            
            // Dosyayı buffer olarak oku
            const fileBuffer = fs.readFileSync(absoluteFilePath);
            console.log(`📖 [EXCEL] Buffer boyutu: ${fileBuffer.length} bytes`);
            
            // Buffer'dan workbook oluştur
            workbook = XLSX.read(fileBuffer, { 
              type: 'buffer',
              cellDates: true, 
              cellText: false,
              raw: false
            });
            
            // Workbook doğrulama
            if (!workbook || !workbook.SheetNames) {
              throw new Error('Workbook geçersiz veya bozuk');
            }
            
            console.log(`✅ [EXCEL] Workbook başarıyla okundu (deneme: ${readAttempts + 1})`);
            break;
            
          } catch (readError: any) {
            lastError = readError;
            console.log(`⚠️ [EXCEL] Okuma denemesi ${readAttempts + 1} başarısız:`, readError.message);
            
            if (readAttempts >= maxReadAttempts - 1) {
              throw new Error(`Excel dosyası ${maxReadAttempts} deneme sonrası okunamadı. Dosya: ${absoluteFilePath}. Son hata: ${readError.message}`);
            }
            
            // Progressive wait: 100ms, 200ms, 400ms, 800ms...
            const waitTime = 100 * Math.pow(2, readAttempts);
            console.log(`⏳ [EXCEL] ${waitTime}ms bekleniyor...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            readAttempts++;
          }
        }
        
        console.log('📖 [EXCEL] Sheet sayısı:', workbook.SheetNames.length);
        console.log('📋 [EXCEL] Sheet isimleri:', workbook.SheetNames);
        
        if (workbook.SheetNames.length === 0) {
          throw new Error('Excel dosyasında sheet bulunamadı');
        }
        
        const sheetName = workbook.SheetNames[0];
        console.log('📋 [EXCEL] Kullanılacak sheet:', sheetName);
        
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          throw new Error(`Sheet '${sheetName}' bulunamadı`);
        }
        
        console.log('📝 [EXCEL] Worksheet alındı');
        
        // JSON'a çevir - öğrenci sütunları için
        jsonData = (XLSX.utils.sheet_to_json<OgrenciExcelRow>(worksheet, {
          header: 'A',
          defval: '',
          blankrows: false
        }) as OgrenciExcelRow[])
          .map(r => ExcelService.normalizeOgrenciRow(r));
        console.log('🔄 [EXCEL] JSON dönüşümü başarılı, toplam satır:', jsonData.length);
        if (debug) {
          console.log('🔍 [EXCEL][DEBUG] İlk 50 öğrenci satırı (ham):', JSON.stringify(jsonData.slice(0, 50), null, 2));
        }
        
      } catch (excelError: any) {
        console.error('❌ [EXCEL] Excel okuma hatası:', excelError.message);
        console.error('❌ [EXCEL] Hata detayı:', excelError);
        console.error('❌ [EXCEL] Dosya yolu:', absoluteFilePath);
        console.error('❌ [EXCEL] Dosya var mı:', fs.existsSync(absoluteFilePath));
        if (fs.existsSync(absoluteFilePath)) {
          const errorStats = fs.statSync(absoluteFilePath);
          console.error('❌ [EXCEL] Dosya boyutu:', errorStats.size);
        }
        throw new Error(`Excel dosyası okunamadı: ${excelError.message}`);
      }

      totalRows = jsonData.length;
      
      await prisma.yuklenenDosya.update({
        where: { id: dosyaId },
        data: { toplamSatir: totalRows }
      });

      // 5000'lik chunk'larda işle
      const chunkSize = 5000;
      for (let i = 0; i < jsonData.length; i += chunkSize) {
        const chunk = jsonData.slice(i, i + chunkSize);
        
        for (const row of chunk) {
          processedRows++;
          
          // Check for cancellation every 50 rows for faster response
          if (processedRows % 50 === 0 && await wsService.isUploadAborted(dosyaId)) {
            console.log(`🚫 [EXCEL] Student upload cancelled at row ${processedRows}, stopping...`);
            
            // Mark DB record as cancelled
            try {
              await prisma.yuklenenDosya.update({
                where: { id: dosyaId },
                data: { durumu: 'IPTAL', tamamlanmaTarih: new Date(), hataMesaji: 'Kullanıcı tarafından iptal edildi' }
              });
            } catch (dbErr) {
              console.error('❌ [EXCEL] Failed to mark student upload as cancelled in DB:', dbErr);
            }

            // Notify clients about cancellation
            wsService.notifyProgress(dosyaId, 'Öğrenci dosya yükleme iptal edildi');
            wsService.broadcast({ type: 'upload_cancelled', dosyaId: dosyaId, message: 'Öğrenci dosya yükleme iptal edildi', timestamp: new Date().toISOString() } as any);

            // Stop processing gracefully
            return {
              success: false,
              totalRows,
              processedRows,
              successfulRows,
              errorRows,
              errors: [...errors, 'Kullanıcı iptali'],
              dosyaId
            } as ExcelImportResult;
          }
          
          try {
            if (debug) {
              console.log(`🔎 [EXCEL][DEBUG] Öğrenci satır ${processedRows} (raw):`, JSON.stringify(row));
            }

            // Excel verilerini al (C+D -> name, B -> student ID, A -> TC kimlik ve parola, etc.)
            const name = this.buildName(row.C, row.D);
            const stdID = (row.B !== undefined && row.B !== null) ? String(row.B) : ExcelService.PLACEHOLDER;
            const email = stdID === ExcelService.PLACEHOLDER ? ExcelService.PLACEHOLDER : stdID + "@std.uni.edu.tr";
            const tcKimlik = (row.A !== undefined && row.A !== null) ? String(row.A) : ExcelService.PLACEHOLDER;
            const danismanAdi = (row.E !== undefined && row.E !== null) ? String(row.E) : ExcelService.PLACEHOLDER;
            const faculty = (row.N !== undefined && row.N !== null) ? String(row.N) : ExcelService.PLACEHOLDER;
            const department = (row.O !== undefined && row.O !== null) ? String(row.O) : ExcelService.PLACEHOLDER;
            const className = (row.R !== undefined && row.R !== null) ? String(row.R) : ExcelService.PLACEHOLDER;
            
            // Sanitize all fields
            const sanitizedName = ExcelService.sanitizeString(name, 255);
            const sanitizedStdID = ExcelService.sanitizeString(stdID === ExcelService.PLACEHOLDER ? ExcelService.PLACEHOLDER : stdID, 50);
            const sanitizedEmail = ExcelService.sanitizeString(email === ExcelService.PLACEHOLDER ? ExcelService.PLACEHOLDER : email, 254);
            const sanitizedTcKimlik = ExcelService.sanitizeString(tcKimlik === ExcelService.PLACEHOLDER ? ExcelService.PLACEHOLDER : tcKimlik, 32);
            const sanitizedDanismanAdi = ExcelService.sanitizeString(danismanAdi === ExcelService.PLACEHOLDER ? ExcelService.PLACEHOLDER : danismanAdi, 255);
            const sanitizedFaculty = ExcelService.sanitizeString(faculty === ExcelService.PLACEHOLDER ? ExcelService.PLACEHOLDER : faculty, 255);
            const sanitizedDepartment = ExcelService.sanitizeString(department === ExcelService.PLACEHOLDER ? ExcelService.PLACEHOLDER : department, 255);
            const sanitizedClassName = ExcelService.sanitizeString(className === ExcelService.PLACEHOLDER ? ExcelService.PLACEHOLDER : className, 100);

            // Skip rows when stdID or tcKimlik are empty
            if (sanitizedStdID === ExcelService.PLACEHOLDER || sanitizedTcKimlik === ExcelService.PLACEHOLDER) {
              // Do not treat skipped rows as errors; just skip processing
              skippedRows++;
              if (debug) console.log(`⏭️ [EXCEL][DEBUG] Öğrenci satır ${processedRows} atlandı (skip): stdID veya TC kimlik boş`);
              continue;
            }

            // Hash password using TC kimlik
            const hashedPassword = await bcrypt.hash(sanitizedTcKimlik, 10);
            if (debug) {
              console.log(`🔐 [EXCEL][DEBUG] Öğrenci satır ${processedRows} hashedPassword length:`, hashedPassword.length);
            }

            // Danışman ID'sini bul (select top 1 from users where name = E and userType = DANISMAN)
            let danismanId: number | null = null;
            if (sanitizedDanismanAdi !== ExcelService.PLACEHOLDER) {
              try {
                const danisman = await prisma.user.findFirst({
                  where: {
                    name: sanitizedDanismanAdi,
                    userType: UserType.DANISMAN
                  },
                  select: { id: true }
                });
                
                if (danisman) {
                  danismanId = danisman.id;
                  if (debug) console.log(`👨‍🏫 [EXCEL][DEBUG] Danışman bulundu: ${sanitizedDanismanAdi} -> ID: ${danismanId}`);
                } else {
                  if (debug) console.log(`❌ [EXCEL][DEBUG] Danışman bulunamadı: ${sanitizedDanismanAdi}`);
                }
              } catch (danismanError: any) {
                console.log(`⚠️ [EXCEL][DEBUG] Danışman arama hatası:`, danismanError.message);
              }
            }

            // Öğrenciyi kontrol et ve güncelle/ekle
            const existingStudent = await prisma.user.findFirst({
              where: {
                OR: [
                  { email: sanitizedEmail },
                  { studentId: sanitizedStdID },
                  { kullaniciAdi: sanitizedStdID }
                ]
              }
            });

            const studentData = {
              name: sanitizedName,
              email: sanitizedEmail,
              // Use student number as username per requirement
              kullaniciAdi: sanitizedStdID,
              password: hashedPassword,
              userType: UserType.OGRENCI,
              studentId: sanitizedStdID,
              faculty: sanitizedFaculty,
              department: sanitizedDepartment,
              class: sanitizedClassName,
              danismanId: danismanId,
              tcKimlik: sanitizedTcKimlik
            };

            if (existingStudent) {
              // Güncelle
              const updateResult = await prisma.user.update({
                where: { id: existingStudent.id },
                data: studentData
              });
              if (debug) console.log(`🗃️ [EXCEL][DEBUG] Öğrenci satır ${processedRows} güncellendi:`, JSON.stringify({ id: updateResult.id }));
            } else {
              // Yeni ekle
              const createResult = await prisma.user.create({
                data: {
                  ...studentData,
                  yuklemeNo: dosyaId
                }
              });
              if (debug) console.log(`🗃️ [EXCEL][DEBUG] Öğrenci satır ${processedRows} oluşturuldu:`, JSON.stringify({ id: createResult.id }));
            }

            successfulRows++;
            
          } catch (error: any) {
            errors.push(`Satır ${processedRows}: ${error.message}`);
            errorRows++;
            logger.log(null, {
              level: 'ERROR' as any,
              action: 'EXCEL_ROW_ERROR' as any,
              details: { message: `Öğrenci Excel satır hatası: ${error.message}` }
            });
          }

          // Progress güncelle (her 1000 satirda bir)
          if (processedRows % 1000 === 0) {
            await prisma.yuklenenDosya.update({
              where: { id: dosyaId },
              data: { 
                islenenSatir: processedRows,
                basariliSatir: successfulRows,
                hataliSatir: errorRows
              }
            });
            
            // WebSocket progress notification gönder
            const { WebSocketNotificationService } = await import('./websocket.service.js');
            const wsService = WebSocketNotificationService.getInstance();
            const progressPercentage = Math.round((processedRows / totalRows) * 100);
            wsService.notifyProgressUpdate(dosyaId, progressPercentage, 'processing');
          }
        }
      }

      // Final güncelleme
      await prisma.yuklenenDosya.update({
        where: { id: dosyaId },
        data: {
          durumu: errorRows === 0 ? 'TAMAMLANDI' : 'HATA',
          islenenSatir: processedRows,
          basariliSatir: successfulRows,
          hataliSatir: errorRows,
          // store errors or include skippedRows count when no errors
          hataMesaji: errors.length > 0 ? errors.slice(0, 10).join('; ') : (skippedRows > 0 ? `Skipped rows: ${skippedRows}` : null),
          tamamlanmaTarih: new Date()
        }
      });

      logger.log(null, {
        level: 'INFO' as any,
        action: 'EXCEL_IMPORT_COMPLETE' as any,
        details: { message: `Öğrenci Excel tamamlandı. Başarılı: ${successfulRows}, Hatalı: ${errorRows}` }
      });

      if (debug) {
        console.log('✅ [EXCEL][DEBUG] Öğrenci işlem özeti:', JSON.stringify({ totalRows, processedRows, successfulRows, errorRows, skippedRows, errors: errors.slice(0, 50) }, null, 2));
      }

      return {
        success: errorRows < totalRows / 2, // %50'den fazla başarılıysa success
        totalRows,
        processedRows,
        successfulRows,
        errorRows,
        errors: errors.slice(0, 20), // İlk 20 hatayı döndür
        dosyaId
      };

    } catch (error: any) {
      logger.log(null, {
        level: 'ERROR' as any,
        action: 'EXCEL_IMPORT_ERROR' as any,
        details: { message: `Öğrenci Excel hatası: ${error.message}` }
      });
      
      if (dosyaId > 0) {
        await prisma.yuklenenDosya.update({
          where: { id: dosyaId },
          data: {
            durumu: 'HATA',
            hataMesaji: error.message,
            tamamlanmaTarih: new Date()
          }
        });
      }

      return {
        success: false,
        totalRows,
        processedRows,
        successfulRows,
        errorRows: totalRows,
        errors: [error.message],
        dosyaId
      };
    }
  }

  // CAP Öğrenci Excel dosyasını oku ve işle
  static async processCapOgrenciExcel(filePath: string, originalFileName: string, dosyaId?: number): Promise<ExcelImportResult> {
    let actualDosyaId = dosyaId || 0;
    const errors: string[] = [];
    let totalRows = 0;
    let processedRows = 0;
    let successfulRows = 0;
    let errorRows = 0;
    let skippedRows = 0;
    let actualDataRows = 0; // Gerçek veri satır sayısı
    let startIndex = 0; // Header atlamak için
    
    const wsService = WebSocketNotificationService.getInstance();

    try {
      // Dosya kaydını güncelle (kayıt zaten controller'da oluşturuldu)
      if (dosyaId) {
        await prisma.yuklenenDosya.update({
          where: { id: dosyaId },
          data: { durumu: 'ISLENIYOR' }
        });
        actualDosyaId = dosyaId;
      } else {
        throw new Error('DosyaId gerekli - controller dosya kaydını oluşturmalı');
      }
      
      logger.log(null, {
        level: 'INFO' as any,
        action: 'EXCEL_IMPORT_START' as any,
        details: { message: `CAP Öğrenci Excel işlemi başladı: ${originalFileName}` }
      });

      const debug = process.env.EXCEL_DEBUG === 'true';

      // Improved file reading with retry logic (based on hoca service pattern)
      const tryReadFile = async (filePath: string, maxRetries = 3): Promise<Buffer> => {
        const absoluteFilePath = path.resolve(filePath);
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`📊 [CAP EXCEL] Attempt ${attempt}: Checking file at ${absoluteFilePath}`);
            
            if (!fs.existsSync(absoluteFilePath)) {
              throw new Error(`Excel dosyası bulunamadı: ${absoluteFilePath}`);
            }

            const stats = fs.statSync(absoluteFilePath);
            if (stats.size === 0) {
              throw new Error(`Excel dosyası boş: ${absoluteFilePath}`);
            }

            console.log(`📊 [CAP EXCEL] File exists, size: ${stats.size} bytes`);
            return fs.readFileSync(absoluteFilePath);
          } catch (error: any) {
            console.warn(`⚠️ [CAP EXCEL] Attempt ${attempt} failed:`, error.message);
            
            if (attempt === maxRetries) {
              throw new Error(`Dosya okuma hatası ${maxRetries} denemeden sonra: ${error.message}`);
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
        
        throw new Error('Unexpected error in file reading');
      };

      // Read file with buffer approach
      console.log('📊 [CAP EXCEL] Reading Excel file...');
      const fileBuffer = await tryReadFile(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Excel dosyasında geçerli sayfa bulunamadı');
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      if (!worksheet) {
        throw new Error(`Excel sayfası okunamadı: ${firstSheetName}`);
      }
      
      // Excel verisini JSON'a çevir
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 'A', defval: '' }) as any[];
      
      if (!jsonData || jsonData.length === 0) {
        throw new Error('Excel dosyası boş veya veri içermiyor');
      }

      totalRows = jsonData.length;
      console.log(`📊 [CAP EXCEL] Toplam ${totalRows} satır bulundu`);

      // Progress tracking
      wsService.notifyProgressUpdate(actualDosyaId, 0, 'processing');
      let lastNotifiedPercentage = 0;

      // Header satırını kontrol et ve atla
      if (jsonData.length > 0) {
        const firstRow = jsonData[0];
        // Header satırını tespit et (öğrenci numarası yerine "OgrenciNo" gibi başlık varsa)
        if (firstRow.D && (
          firstRow.D.toString().toLowerCase().includes('ogrenci') ||
          firstRow.D.toString().toLowerCase().includes('student') ||
          firstRow.D.toString().toLowerCase().includes('numara') ||
          firstRow.D.toString().toLowerCase().includes('no') ||
          firstRow.D.toString() === 'OgrenciNo'
        )) {
          startIndex = 1; // Header satırını atla
          console.log(`📊 [CAP EXCEL] Header satırı tespit edildi, ${startIndex}. satırdan başlanacak`);
        }
      }

      actualDataRows = totalRows - startIndex;
      console.log(`📊 [CAP EXCEL] İşlenecek veri satırı: ${actualDataRows} (toplam ${totalRows} - header ${startIndex})`);

      // Her satırı işle (header atlanarak)
      for (let i = startIndex; i < jsonData.length; i++) {
        const row = jsonData[i] as CapOgrenciExcelRow;
        const rowIndex = i + 1;
        const dataRowIndex = i - startIndex + 1; // Gerçek veri satır numarası
        
        // Progress update (her 100 satırda bir) - gerçek veri satırlarına göre hesapla
        if ((i - startIndex) % 100 === 0 || i === jsonData.length - 1) {
          const percentage = Math.round(((i - startIndex) / actualDataRows) * 100);
          if (percentage > lastNotifiedPercentage) {
            wsService.notifyProgressUpdate(actualDosyaId, percentage, 'processing');
            lastNotifiedPercentage = percentage;
          }
        }

        // Upload iptal kontrolü
        if (await wsService.isUploadAborted(actualDosyaId)) {
          console.log(`🚫 [CAP EXCEL] Upload cancelled at row ${rowIndex}, stopping...`);
          wsService.notifyProgress(actualDosyaId, 'CAP öğrenci dosya yükleme iptal edildi');
          wsService.notifyUploadCancelled(actualDosyaId, 'CAP öğrenci dosya yükleme iptal edildi');
          break;
        }

        try {
          processedRows++;

          // Excel'den gelen verileri güvenli şekilde string'e çevir
          const studentIdRaw = row.D !== undefined && row.D !== null ? String(row.D) : '';
          const tcKimlikRaw = row.E !== undefined && row.E !== null ? String(row.E) : '';
          const firstNameRaw = row.F !== undefined && row.F !== null ? String(row.F) : '';
          const lastNameRaw = row.G !== undefined && row.G !== null ? String(row.G) : '';
          const className = row.H !== undefined && row.H !== null ? String(row.H) : '';
          const ustBirimAdi = row.A !== undefined && row.A !== null ? String(row.A) : '';
          const birimAdi = row.B !== undefined && row.B !== null ? String(row.B) : '';
          const programAdi = row.C !== undefined && row.C !== null ? String(row.C) : '';
          const danismanName = row.U !== undefined && row.U !== null ? String(row.U) : '';

          // Debug bilgileri
          if (debug) {
            console.log(`🔍 [CAP EXCEL][DEBUG] Veri satır ${dataRowIndex} veri tipleri:`, {
              D: typeof row.D, D_value: row.D, // OgrenciNo
              E: typeof row.E, E_value: row.E, // T.C.
              F: typeof row.F, F_value: row.F, // ad
              G: typeof row.G, G_value: row.G, // soyad
              H: typeof row.H, H_value: row.H, // sinif
              A: typeof row.A, A_value: row.A, // UstBirimAdi
              B: typeof row.B, B_value: row.B, // BirimAdi
              C: typeof row.C, C_value: row.C  // ProgramAdi
            });
          }

          // Zorunlu alan kontrolü: studentId (D), tcKimlik (E), firstName (F) - bunlar boş olamaz
          const requiredMissing: string[] = [];
          if (!studentIdRaw) requiredMissing.push('D (OgrenciNo)');
          if (!tcKimlikRaw) requiredMissing.push('E (T.C.)');
          if (!firstNameRaw) requiredMissing.push('F (Ad)');

          if (requiredMissing.length > 0) {
            const msg = `Veri satır ${dataRowIndex} (Excel satır ${rowIndex}): Hata - Eksik zorunlu alan(lar): ${requiredMissing.join(', ')}`;
            errors.push(msg);
            errorRows++;
            if (debug) {
              console.log(`❌ [CAP EXCEL][DEBUG] ${msg} - D="${studentIdRaw}", E="${tcKimlikRaw}", F="${firstNameRaw}"`);
            }
            continue; // skip this row
          }

          // Güvenli atamalar: zorunlu alanlar mevcut, diğerleri boş ise boş string olarak kullan
          const studentId = String(studentIdRaw);
          const tcKimlik = String(tcKimlikRaw);
          const firstName = firstNameRaw || '';
          const lastName = lastNameRaw || '';
          const safeClassName = className || '';

          // Öğrenci numarası format kontrolü (11 veya 12 hane) - geçersiz ise hata olarak say ve atla
          if (!/^\d{11,12}$/.test(studentId)) {
            const msg = `Veri satır ${dataRowIndex} (Excel satır ${rowIndex}): Hata - Geçersiz öğrenci numarası formatı: ${studentId}`;
            errors.push(msg);
            errorRows++;
            if (debug) {
              console.log(`❌ [CAP EXCEL][DEBUG] ${msg}`);
            }
            continue;
          }

          // TC Kimlik format kontrolü (11 hane) - geçersiz ise hata olarak say ve atla
          if (!/^\d{11}$/.test(tcKimlik)) {
            const msg = `Veri satır ${dataRowIndex} (Excel satır ${rowIndex}): Hata - Geçersiz TC Kimlik formatı: ${tcKimlik}`;
            errors.push(msg);
            errorRows++;
            if (debug) {
              console.log(`❌ [CAP EXCEL][DEBUG] ${msg}`);
            }
            continue;
          }
          
          const fullName = `${firstName} ${lastName}`;
          const email = `${studentId}@std.uni.edu.tr`;

          // Determine faculty and department from BirimAdi and ProgramAdi
          const faculty = birimAdi || 'CAP-YAP OGRENCISI';
          const department = programAdi || 'CAP-YAP';
          const capBolum = programAdi || '';

          // Önce users tablosunda bu öğrenci var mı kontrol et
          let user = await prisma.user.findFirst({
            where: { studentId: studentId }
          });

          // Eğer user yoksa oluştur
      if (!user) {
        // For CAP-YAP students, use TC Kimlik as password; for others use studentId
        const isCapYapStudent = department === 'CAP-YAP' || faculty.includes('CAP-YAP') || 
                               programAdi.includes('CAP-YAP') || birimAdi.includes('CAP-YAP');
        const passwordToHash = isCapYapStudent ? tcKimlik : studentId;
        const hashedPassword = await bcrypt.hash(passwordToHash, 10);
        
        try {
          user = await prisma.user.create({
            data: {
              name: fullName,
              email: email,
              password: hashedPassword,
              userType: UserType.OGRENCI,
              studentId: studentId,
              tcKimlik: tcKimlik, // Store TC Kimlik in the user record
              faculty: faculty,
              class: className,
              kullaniciAdi: studentId, // Use studentId as username
              department: department,
              yuklemeNo: actualDosyaId
            }
          });

          if (debug) {
            console.log(`✅ [CAP EXCEL][DEBUG] User created - Veri satır ${dataRowIndex}: ${fullName} (${studentId}) - Password based on: ${isCapYapStudent ? 'TC Kimlik' : 'Student ID'}`);
          }
        } catch (userError: any) {
          // Duplicate user handling
          if (userError.code === 'P2002') {
            user = await prisma.user.findFirst({
              where: { studentId: studentId }
            });
            
            if (!user) {
              errors.push(`Veri satır ${dataRowIndex} (Excel satır ${rowIndex}): Kullanıcı oluşturma hatası - ${userError.message}`);
              errorRows++;
              continue;
            }
            
            if (debug) {
              console.log(`ℹ️ [CAP EXCEL][DEBUG] User found after duplicate error - Veri satır ${dataRowIndex}: ${fullName} (${studentId})`);
            }
          } else {
            throw userError;
          }
        }
      } else {
        // Update existing user with new TC Kimlik and other data
        const isCapYapStudent = department === 'CAP-YAP' || faculty.includes('CAP-YAP') || 
                               programAdi.includes('CAP-YAP') || birimAdi.includes('CAP-YAP');
        const passwordToHash = isCapYapStudent ? tcKimlik : studentId;
        const hashedPassword = await bcrypt.hash(passwordToHash, 10);
        
        await prisma.user.update({
          where: { id: user.id },
          data: {
            name: fullName,
            tcKimlik: tcKimlik,
            password: hashedPassword, // Update password with TC Kimlik for CAP-YAP students
            faculty: faculty,
            department: department,
            class: className,
            yuklemeNo: actualDosyaId
          }
        });
        
        if (debug) {
          console.log(`ℹ️ [CAP EXCEL][DEBUG] User updated - Veri satır ${dataRowIndex}: ${fullName} (${studentId}) - Password based on: ${isCapYapStudent ? 'TC Kimlik' : 'Student ID'}`);
        }
      }

          // Danışman ara (sadece isim ile)
          let danisman = null;
          if (danismanName) {
            danisman = await prisma.user.findFirst({
              where: {
                name: danismanName,
                userType: UserType.DANISMAN
              },
              orderBy: { id: 'asc' } // İlk bulunanı al
            });
          }

          // CAP öğrencisini capUsers tablosuna kaydet veya güncelle
          try {
            const existingCapUser = await prisma.capUser.findFirst({
              where: { ogrenciId: user.id }
            });

            if (!existingCapUser) {
              await prisma.capUser.create({
                data: {
                  ogrenciId: user.id,
                  capBolum: capBolum,
                  capDepartman: department,
                  capFakulte: faculty,
                  capSinif: className,
                  capDanismanId: danisman?.id || null
                }
              });

              if (debug) {
                console.log(`✅ [CAP EXCEL][DEBUG] CAP User created - Veri satır ${dataRowIndex}: ${fullName} - Fakülte: ${faculty}, Bölüm: ${department}`);
              }
            } else {
              // Güncelle
              await prisma.capUser.update({
                where: { id: existingCapUser.id },
                data: {
                  capBolum: capBolum,
                  capDepartman: department,
                  capFakulte: faculty,
                  capDanismanId: danisman?.id || null,
                  capSinif: className
                }
              });

              if (debug) {
                console.log(`🔄 [CAP EXCEL][DEBUG] CAP User updated - Veri satır ${dataRowIndex}: ${fullName} - Fakülte: ${faculty}, Bölüm: ${department}`);
              }
            }
          } catch (capError: any) {
            // CAP user record handling
            if (capError.code === 'P2002') {
              // Duplicate record, try to update
              const existingCapUser = await prisma.capUser.findFirst({
                where: { ogrenciId: user.id }
              });
              
              if (existingCapUser) {
                await prisma.capUser.update({
                  where: { id: existingCapUser.id },
                  data: {
                    capBolum: capBolum,
                    capDepartman: department,
                    capFakulte: faculty,
                    capDanismanId: danisman?.id || null,
                    capSinif: className
                  }
                });
                
                if (debug) {
                  console.log(`🔄 [CAP EXCEL][DEBUG] CAP User updated after duplicate error - Veri satır ${dataRowIndex}: ${fullName}`);
                }
              }
            } else {
              throw capError;
            }
          }

          successfulRows++;

        } catch (error: any) {
          errorRows++;
          const errorMessage = `Veri satır ${dataRowIndex} (Excel satır ${rowIndex}): ${error.message}`;
          errors.push(errorMessage);
          
          if (debug) {
            console.error(`❌ [CAP EXCEL][DEBUG] Error processing data row ${dataRowIndex}:`, error);
          }
        }
      }

      // Final durum güncelleme
      await prisma.yuklenenDosya.update({
        where: { id: actualDosyaId },
        data: {
          durumu: 'TAMAMLANDI',
          tamamlanmaTarih: new Date(),
          toplamSatir: actualDataRows, // Gerçek veri satır sayısı
          basariliSatir: successfulRows,
          hataliSatir: errorRows
        }
      });

      // WebSocket bildirimi
      wsService.notifyExcelComplete(actualDosyaId, true, {
        totalRows: actualDataRows, // Gerçek veri satır sayısı
        successfulRows,
        errorRows,
        errors: errors.slice(0, 10)
      });

      logger.log(null, {
        level: 'INFO' as any,
        action: 'EXCEL_IMPORT_COMPLETE' as any,
        details: { message: `CAP Öğrenci Excel tamamlandı. Toplam veri: ${actualDataRows}, Başarılı: ${successfulRows}, Hatalı: ${errorRows}` }
      });

      if (debug) {
        console.log('✅ [CAP EXCEL][DEBUG] İşlem özeti:', JSON.stringify({ 
          totalExcelRows: totalRows,
          headerRows: startIndex,
          actualDataRows,
          processedRows, 
          successfulRows, 
          errorRows,
          errors: errors.slice(0, 50)
        }, null, 2));
      }

      return {
        success: errorRows < actualDataRows / 2, // %50'den fazla başarılıysa success
        totalRows: actualDataRows, // Gerçek veri satır sayısı
        processedRows,
        successfulRows,
        errorRows,
        errors: errors.slice(0, 20), // İlk 20 hatayı döndür
        dosyaId: actualDosyaId
      };

    } catch (error: any) {
      logger.log(null, {
        level: 'ERROR' as any,
        action: 'EXCEL_IMPORT_ERROR' as any,
        details: { message: `CAP Öğrenci Excel hatası: ${error.message}` }
      });
      
      if (actualDosyaId > 0) {
        try {
          await prisma.yuklenenDosya.update({
            where: { id: actualDosyaId },
            data: {
              durumu: 'HATA',
              hataMesaji: error.message,
              tamamlanmaTarih: new Date()
            }
          });
        } catch (dbError: any) {
          console.error('❌ [CAP EXCEL] Database update error:', dbError.message);
        }
      }

      // WebSocket error notification
      wsService.notifyExcelComplete(actualDosyaId, false, {
        totalRows: actualDataRows > 0 ? actualDataRows : totalRows,
        successfulRows,
        errorRows: actualDataRows > 0 ? actualDataRows : totalRows,
        errors: [error.message]
      });

      return {
        success: false,
        totalRows: actualDataRows > 0 ? actualDataRows : totalRows,
        processedRows,
        successfulRows,
        errorRows: actualDataRows > 0 ? actualDataRows : totalRows,
        errors: [error.message],
        dosyaId: actualDosyaId
      };
    }
  }
}
