import { FastifyRequest, FastifyReply } from 'fastify';
import { ExcelService } from '../services/excel.service.js';
import { queue } from '../worker/excel.worker.js';
import LoggerService, { LogAction, LogLevel } from '../services/logger.service.js';
import WebSocketNotificationService from '../services/websocket.service.js';
import * as path from 'path';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';

const logger = LoggerService.getInstance();

export class ExcelController {
  
  // Upload'ı iptal et
  static async cancelUpload(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const dosyaId = parseInt(request.params.id);
      
      if (isNaN(dosyaId)) {
        return reply.status(400).send({
          success: false,
          message: 'Geçersiz dosya ID'
        });
      }

      const wsService = WebSocketNotificationService.getInstance();
      
      // Cancel the upload
      wsService.cancelUpload(dosyaId);
      
      await logger.log(request, {
        level: LogLevel.INFO,
        action: 'UPLOAD_CANCELLED' as any,
        details: { dosyaId }
      });

      reply.send({
        success: true,
        message: 'Dosya yükleme iptal edildi'
      });

    } catch (error: any) {
      await logger.log(request, {
        level: LogLevel.ERROR,
        action: LogAction.API_ERROR,
        details: { error: error.message }
      });

      reply.status(500).send({
        success: false,
        message: 'Upload iptal edilirken hata oluştu',
        error: error.message
      });
    }
  }
  
  // Hoca Excel dosyasını yükle ve işle
  static async uploadHocaExcel(request: FastifyRequest, reply: FastifyReply) {
    let filePath: string | undefined;
    
    try {
      await logger.log(request, {
        level: LogLevel.DEBUG,
        action: LogAction.API_REQUEST,
        details: { endpoint: 'upload-hoca-excel' }
      });

      // İşlenmekte olan dosya kontrolü
      const prismaModule = await import('../generated/prisma/index.js');
      const prisma = new prismaModule.PrismaClient();
      
      const wsNotificationService = WebSocketNotificationService.getInstance();
      
      // Check if another upload is in progress
      if (!wsNotificationService.canStartUpload()) {
        await prisma.$disconnect();
        return reply.status(409).send({
          success: false,
          message: 'Zaten işlenmekte olan bir dosya var. Lütfen işlem tamamlanana kadar bekleyin.'
        });
      }
      
      const processingFile = await prisma.yuklenenDosya.findFirst({
        where: {
          dosyaTipi: 'hoca',
          durumu: {
            in: ['KUYRUKTA', 'ISLENIYOR']
          }
        }
      });
      
      if (processingFile) {
        await prisma.$disconnect();
        return reply.status(409).send({
          success: false,
          message: 'Zaten işlenmekte olan bir hoca Excel dosyası var. Lütfen işlem tamamlanana kadar bekleyin.',
          processingFile: {
            id: processingFile.id,
            fileName: processingFile.dosyaAdi,
            status: processingFile.durumu
          }
        });
      }
      
      await prisma.$disconnect();

      // Dosya kontrolü
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          message: 'Excel dosyası bulunamadı'
        });
      }

      // Dosya formatı kontrolü
      if (!data.filename.match(/\.(xlsx|xls)$/i)) {
        return reply.status(400).send({
          success: false,
          message: 'Sadece Excel dosyaları (.xlsx, .xls) kabul edilir'
        });
      }

      // Dosya boyutu kontrolü (50MB)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      const buffer = await data.toBuffer();
      if (buffer.length > MAX_FILE_SIZE) {
        return reply.status(400).send({
          success: false,
          message: 'Dosya boyutu 50MB\'dan büyük olamaz'
        });
      }

      // Uploads klasörünü oluştur (mutlak path kullan)
      const uploadsDir = path.resolve(process.cwd(), 'uploads', 'excel');
      console.log('📁 [UPLOAD] Uploads dizini:', uploadsDir);
      await fsPromises.mkdir(uploadsDir, { recursive: true });

      // Benzersiz dosya adı oluştur
      const fileExtension = path.extname(data.filename);
      const fileName = `hoca_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExtension}`;
      filePath = path.resolve(uploadsDir, fileName);
      
      console.log('📄 [UPLOAD] Dosya bilgileri:');
      console.log('  - Orijinal dosya adı:', data.filename);
      console.log('  - Yeni dosya adı:', fileName);
      console.log('  - Tam dosya yolu:', filePath);
      console.log('  - Working directory:', process.cwd());

      // Dosyayı güvenli bir şekilde kaydet
      let fileSaved = false;
      let saveAttempts = 0;
      const maxSaveAttempts = 3;
      
  // Start upload tracking - will be updated with real dosyaId from Excel service
  if (!wsNotificationService.startUpload(0)) { // Use 0 as placeholder, will be updated
    return reply.status(409).send({
      success: false,
      message: 'Zaten işlenmekte olan bir dosya var. Lütfen işlem tamamlanana kadar bekleyin.'
    });
  }
  
  // Send initial progress
  wsNotificationService.notifyProgressUpdate(0, 0, 'uploading');
      
      while (!fileSaved && saveAttempts < maxSaveAttempts) {
        try {
          saveAttempts++;
          console.log(`📝 [UPLOAD] Dosya kaydetme denemesi ${saveAttempts}/${maxSaveAttempts}: ${fileName}`);
          
          // Check if upload was cancelled
          if (await wsNotificationService.isUploadAborted(0)) {
            throw new Error('Upload was cancelled');
          }
          
          // Send progress update during file write
          const writeProgress = Math.floor((saveAttempts / maxSaveAttempts) * 50); // 0-50% for file writing
          wsNotificationService.notifyProgressUpdate(0, writeProgress, 'uploading');
          
          // Dosyayı kaydet
          await fsPromises.writeFile(filePath, buffer, { flag: 'w' });
          
          // Dosyanın tamamen yazıldığından emin olmak için fsync kullan
          const fd = await fsPromises.open(filePath, 'r+');
          await fd.sync(); // Force write to disk
          await fd.close();
          
          // Dosya varlığını ve boyutunu doğrula
          const stats = await fsPromises.stat(filePath);
          console.log(`📊 [UPLOAD] Yazılan dosya boyutu: ${stats.size}, Beklenen: ${buffer.length}`);
          
          if (stats.size !== buffer.length) {
            throw new Error(`Dosya yazma işlemi tamamlanmamış, boyut uyumsuzluğu. Yazılan: ${stats.size}, Beklenen: ${buffer.length}`);
          }
          
          // Dosyaya okuma erişimi test et
          await fsPromises.access(filePath, fs.constants.R_OK);
          
          // Dosya içeriğini bir kez okuyup test et
          const testBuffer = await fsPromises.readFile(filePath);
          if (testBuffer.length !== buffer.length) {
            throw new Error('Dosya okuma testi başarısız, boyut uyumsuzluğu');
          }
          
          fileSaved = true;
          console.log('✅ [UPLOAD] Dosya başarıyla kaydedildi ve doğrulandı');
          
          // Send progress update after successful file save
          wsNotificationService.notifyProgressUpdate(0, 70, 'uploading');
          
        } catch (saveError: any) {
          console.error(`❌ [UPLOAD] Dosya kaydetme denemesi ${saveAttempts} başarısız:`, saveError.message);
          
          if (saveAttempts >= maxSaveAttempts) {
            throw new Error(`Dosya ${maxSaveAttempts} deneme sonrası kaydedilemedi: ${saveError.message}`);
          }
          
          // Başarısız dosyayı temizle
          try {
            if (await fsPromises.stat(filePath)) {
              await fsPromises.unlink(filePath);
            }
          } catch (cleanupError) {
            // Cleanup hatası önemli değil
          }
          
          // 200ms bekle ve tekrar dene
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Son bir kontrol daha - 100ms bekle
      await new Promise(resolve => setTimeout(resolve, 100));

  // Send progress before processing
  wsNotificationService.notifyProgressUpdate(0, 80, 'processing');

  // Excel'i işle - dosya ID'si service tarafından oluşturulacak
  const result = await ExcelService.processHocaExcel(filePath, data.filename);

  // Update upload tracking with real dosya ID and check for cancellation
  if (result.dosyaId && result.dosyaId > 0) {
    // Update the tracking to use real dosya ID
    wsNotificationService.finishUpload(0); // Clear placeholder
    wsNotificationService.startUpload(result.dosyaId); // Start tracking with real ID
    
    // Send progress update with real dosya ID so frontend can track it
    wsNotificationService.notifyProgressUpdate(result.dosyaId, 100, 'processing');
    
    if (await wsNotificationService.isUploadAborted(result.dosyaId)) {
      // Clean up the file if upload was cancelled
      try {
        await fsPromises.unlink(filePath);
        console.log('🧹 [UPLOAD] Cancelled upload file cleaned up:', filePath);
      } catch (cleanupError: any) {
        console.error('⚠️ [UPLOAD] Cancelled file cleanup error:', cleanupError.message);
      }
      
      // Finish tracking
      wsNotificationService.finishUpload(result.dosyaId);
      
      return reply.status(200).send({
        success: false,
        message: 'Dosya yükleme iptal edildi',
        cancelled: true
      });
    }
    
    // Finish tracking after successful completion
    wsNotificationService.finishUpload(result.dosyaId);
  } else {
    // Finish upload tracking with placeholder if no dosya ID
    wsNotificationService.finishUpload(0);
  }

      // Send completion notification
      const wsService = WebSocketNotificationService.getInstance();
  wsService.notifyExcelComplete(result.dosyaId || 0, result.success, {
        totalRows: result.totalRows,
        successfulRows: result.successfulRows,
        errorRows: result.errorRows,
        errors: result.errors
      });

      await logger.log(request, {
        level: LogLevel.INFO,
        action: 'EXCEL_UPLOAD' as any,
        details: { 
          fileName: data.filename,
          processedRows: result.processedRows,
          successfulRows: result.successfulRows,
          errorRows: result.errorRows
        }
      });

      // İşlem sonucu döndür
      reply.send({
        success: result.success,
        message: result.success 
          ? 'Excel dosyası başarıyla işlendi' 
          : 'Excel dosyası işlendi ancak bazı hatalar oluştu',
        data: {
          dosyaId: result.dosyaId,
          totalRows: result.totalRows,
          processedRows: result.processedRows,
          successfulRows: result.successfulRows,
          errorRows: result.errorRows,
          errors: result.errors.slice(0, 10) // İlk 10 hatayı göster
        }
      });

    } catch (error: any) {
      await logger.log(request, {
        level: LogLevel.ERROR,
        action: LogAction.API_ERROR,
        details: { error: error.message }
      });

      // Send WebSocket notification for upload error
      const wsService = WebSocketNotificationService.getInstance();
      wsService.notifyProgress(0, `❌ Hoca dosya yükleme hatası: ${error.message}`);

      // Hata durumunda dosyayı temizle
      if (filePath) {
        try {
          await fsPromises.unlink(filePath);
          console.log('🧹 [UPLOAD] Hatalı dosya temizlendi:', filePath);
        } catch (cleanupError: any) {
          console.error('⚠️ [UPLOAD] Dosya temizleme hatası:', cleanupError.message);
        }
      }

      reply.status(500).send({
        success: false,
        message: 'Excel dosyası işlenirken hata oluştu',
        error: error.message
      });
    }
  }

  // Öğrenci Excel dosyasını yükle ve işle
  static async uploadOgrenciExcel(request: FastifyRequest, reply: FastifyReply) {
    let filePath: string | undefined;
    
    try {
      await logger.log(request, {
        level: LogLevel.DEBUG,
        action: LogAction.API_REQUEST,
        details: { endpoint: 'upload-ogrenci-excel' }
      });

      // İşlenmekte olan dosya kontrolü
      const prismaModule = await import('../generated/prisma/index.js');
      const prisma = new prismaModule.PrismaClient();
      
      const wsNotificationService = WebSocketNotificationService.getInstance();
      
      // Check if another upload is in progress
      if (!wsNotificationService.canStartUpload()) {
        await prisma.$disconnect();
        return reply.status(409).send({
          success: false,
          message: 'Zaten işlenmekte olan bir dosya var. Lütfen işlem tamamlanana kadar bekleyin.'
        });
      }
      
      const processingFile = await prisma.yuklenenDosya.findFirst({
        where: {
          dosyaTipi: 'ogrenci',
          durumu: {
            in: ['KUYRUKTA', 'ISLENIYOR']
          }
        }
      });
      
      if (processingFile) {
        await prisma.$disconnect();
        return reply.status(409).send({
          success: false,
          message: 'Zaten işlenmekte olan bir öğrenci Excel dosyası var. Lütfen işlem tamamlanana kadar bekleyin.',
          processingFile: {
            id: processingFile.id,
            fileName: processingFile.dosyaAdi,
            status: processingFile.durumu
          }
        });
      }
      
      await prisma.$disconnect();

      // Dosya kontrolü
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          message: 'Excel dosyası bulunamadı'
        });
      }

      // Dosya formatı kontrolü
      if (!data.filename.match(/\.(xlsx|xls)$/i)) {
        return reply.status(400).send({
          success: false,
          message: 'Sadece Excel dosyaları (.xlsx, .xls) kabul edilir'
        });
      }

      // Dosya boyutu kontrolü (50MB)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      const buffer = await data.toBuffer();
      if (buffer.length > MAX_FILE_SIZE) {
        return reply.status(400).send({
          success: false,
          message: 'Dosya boyutu 50MB\'dan büyük olamaz'
        });
      }

      // Uploads klasörünü oluştur (mutlak path kullan)
      const uploadsDir = path.resolve(process.cwd(), 'uploads', 'excel');
      console.log('📁 [UPLOAD] Uploads dizini:', uploadsDir);
      await fsPromises.mkdir(uploadsDir, { recursive: true });

      // Benzersiz dosya adı oluştur
      const fileExtension = path.extname(data.filename);
      const fileName = `ogrenci_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExtension}`;
      filePath = path.resolve(uploadsDir, fileName);
      
      console.log('📄 [UPLOAD] Öğrenci dosya bilgileri:');
      console.log('  - Orijinal dosya adı:', data.filename);
      console.log('  - Yeni dosya adı:', fileName);
      console.log('  - Tam dosya yolu:', filePath);
      console.log('  - Working directory:', process.cwd());

      // Dosyayı güvenli bir şekilde kaydet
      let fileSaved = false;
      let saveAttempts = 0;
      const maxSaveAttempts = 3;
      
      // Start upload tracking - will be updated with real dosyaId from Excel service
      if (!wsNotificationService.startUpload(0)) { // Use 0 as placeholder, will be updated
        return reply.status(409).send({
          success: false,
          message: 'Zaten işlenmekte olan bir dosya var. Lütfen işlem tamamlanana kadar bekleyin.'
        });
      }
      
      // Send initial progress
      wsNotificationService.notifyProgressUpdate(0, 0, 'uploading');
      
      while (!fileSaved && saveAttempts < maxSaveAttempts) {
        try {
          saveAttempts++;
          console.log(`📝 [UPLOAD] Öğrenci dosya kaydetme denemesi ${saveAttempts}/${maxSaveAttempts}: ${fileName}`);
          
          // Check if upload was cancelled
          if (await wsNotificationService.isUploadAborted(0)) {
            throw new Error('Upload was cancelled');
          }
          
          // Send progress update during file write
          const writeProgress = Math.floor((saveAttempts / maxSaveAttempts) * 50); // 0-50% for file writing
          wsNotificationService.notifyProgressUpdate(0, writeProgress, 'uploading');
          
          // Dosyayı kaydet
          await fsPromises.writeFile(filePath, buffer, { flag: 'w' });
          
          // Dosyanın tamamen yazıldığından emin olmak için fsync kullan
          const fd = await fsPromises.open(filePath, 'r+');
          await fd.sync(); // Force write to disk
          await fd.close();
          
          // Dosya varlığını ve boyutunu doğrula
          const stats = await fsPromises.stat(filePath);
          console.log(`📊 [UPLOAD] Yazılan dosya boyutu: ${stats.size}, Beklenen: ${buffer.length}`);
          
          if (stats.size !== buffer.length) {
            throw new Error(`Dosya yazma işlemi tamamlanmamış, boyut uyumsuzluğu. Yazılan: ${stats.size}, Beklenen: ${buffer.length}`);
          }
          
          // Dosyaya okuma erişimi test et
          await fsPromises.access(filePath, fs.constants.R_OK);
          
          // Dosya içeriğini bir kez okuyup test et
          const testBuffer = await fsPromises.readFile(filePath);
          if (testBuffer.length !== buffer.length) {
            throw new Error('Dosya okuma testi başarısız, boyut uyumsuzluğu');
          }
          
          fileSaved = true;
          console.log('✅ [UPLOAD] Öğrenci dosyası başarıyla kaydedildi ve doğrulandı');
          
          // Send progress update after successful file save
          wsNotificationService.notifyProgressUpdate(0, 70, 'uploading');
          
        } catch (saveError: any) {
          console.error(`❌ [UPLOAD] Öğrenci dosya kaydetme denemesi ${saveAttempts} başarısız:`, saveError.message);
          
          if (saveAttempts >= maxSaveAttempts) {
            throw new Error(`Öğrenci dosyası ${maxSaveAttempts} deneme sonrası kaydedilemedi: ${saveError.message}`);
          }
          
          // Başarısız dosyayı temizle
          try {
            if (await fsPromises.stat(filePath)) {
              await fsPromises.unlink(filePath);
            }
          } catch (cleanupError) {
            // Cleanup hatası önemli değil
          }
          
          // 200ms bekle ve tekrar dene
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Son bir kontrol daha - 100ms bekle
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send progress before processing
      wsNotificationService.notifyProgressUpdate(0, 80, 'processing');

      // Create a yuklenenDosya record and enqueue job to process it in background worker
      const yuklenen = await (async () => {
        // create minimal record upfront so worker can pick it up
        try {
          const prisma = (await import('../generated/prisma/index.js')).PrismaClient ? undefined : undefined;
        } catch (e) {
          // noop - prisma will be used inside ExcelService
        }
        // ExcelService will create/update the record if necessary; but create a light record here for immediate id
        const prismaModule = await import('../generated/prisma/index.js');
        const prisma = new prismaModule.PrismaClient();
        const created = await prisma.yuklenenDosya.create({ data: { dosyaAdi: data.filename, dosyaTipi: 'ogrenci', dosyaYolu: filePath, durumu: 'KUYRUKTA' } });
        await prisma.$disconnect();
        return created;
      })();

      // Update upload tracking with real dosya ID and check for cancellation
      if (yuklenen.id && yuklenen.id > 0) {
        // Update the tracking to use real dosya ID
        wsNotificationService.finishUpload(0); // Clear placeholder
        wsNotificationService.startUpload(yuklenen.id); // Start tracking with real ID
        
        // Send progress update with real dosya ID so frontend can track it
        wsNotificationService.notifyProgressUpdate(yuklenen.id, 85, 'processing');
        
        if (await wsNotificationService.isUploadAborted(yuklenen.id)) {
          // Clean up the file if upload was cancelled
          try {
            await fsPromises.unlink(filePath);
            console.log('🧹 [UPLOAD] Cancelled upload file cleaned up:', filePath);
          } catch (cleanupError: any) {
            console.error('⚠️ [UPLOAD] Cancelled file cleanup error:', cleanupError.message);
          }
          
          // Finish tracking
          wsNotificationService.finishUpload(yuklenen.id);
          
          return reply.status(200).send({
            success: false,
            message: 'Dosya yükleme iptal edildi',
            cancelled: true
          });
        }
      } else {
        // Finish upload tracking with placeholder if no dosya ID
        wsNotificationService.finishUpload(0);
      }

      // Enqueue processing job
      await queue.add('process-ogrenci', { filePath, fileName: data.filename, dosyaId: yuklenen.id }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

      const result = { success: true, dosyaId: yuklenen.id, processedRows: 0, successfulRows: 0, errorRows: 0, totalRows: 0, errors: [] };

      // Send completion notification - note: actual processing happens in worker
      const wsService = WebSocketNotificationService.getInstance();
      wsService.notifyProgressUpdate(yuklenen.id, 100, 'queued');
      
      // Finish tracking since we've queued the job
      wsService.finishUpload(yuklenen.id);

      await logger.log(request, {
        level: LogLevel.INFO,
        action: 'EXCEL_UPLOAD' as any,
        details: { 
          fileName: data.filename,
          processedRows: result.processedRows,
          successfulRows: result.successfulRows,
          errorRows: result.errorRows
        }
      });

      // İşlem sonucu döndür
      reply.send({
        success: result.success,
        message: result.success 
          ? 'Öğrenci Excel dosyası başarıyla işlendi' 
          : 'Öğrenci Excel dosyası işlendi ancak bazı hatalar oluştu',
        data: {
          dosyaId: result.dosyaId,
          totalRows: result.totalRows,
          processedRows: result.processedRows,
          successfulRows: result.successfulRows,
          errorRows: result.errorRows,
          errors: result.errors.slice(0, 10) // İlk 10 hatayı göster
        }
      });

    } catch (error: any) {
      await logger.log(request, {
        level: LogLevel.ERROR,
        action: LogAction.API_ERROR,
        details: { error: error.message }
      });

      // Send WebSocket notification for upload error
      const wsService = WebSocketNotificationService.getInstance();
      wsService.notifyProgress(0, `❌ Öğrenci dosya yükleme hatası: ${error.message}`);

      // Cleanup upload tracking
      wsService.finishUpload(0);

      // Hata durumunda dosyayı temizle
      if (filePath) {
        try {
          await fsPromises.unlink(filePath);
          console.log('🧹 [UPLOAD] Hatalı öğrenci dosyası temizlendi:', filePath);
        } catch (cleanupError: any) {
          console.error('⚠️ [UPLOAD] Öğrenci dosya temizleme hatası:', cleanupError.message);
        }
      }

      reply.status(500).send({
        success: false,
        message: 'Öğrenci Excel dosyası işlenirken hata oluştu',
        error: error.message
      });
    }
  }

  // Upload durumunu kontrol et
  static async getDosyaDurumu(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const dosyaId = parseInt(request.params.id);
      
      if (isNaN(dosyaId)) {
        return reply.status(400).send({
          success: false,
          message: 'Geçersiz dosya ID'
        });
      }

      const dosya = await ExcelService.getDosyaDurumu(dosyaId);
      
      if (!dosya) {
        return reply.status(404).send({
          success: false,
          message: 'Dosya bulunamadı'
        });
      }

      reply.send({
        success: true,
        data: dosya
      });

    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Dosya durumu kontrolünde hata oluştu',
        error: error.message
      });
    }
  }

  // Upload geçmişini getir
  static async getUploadHistory(request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit) : 50;
      const history = await ExcelService.getUploadHistory(limit);

      reply.send({
        success: true,
        data: history
      });

    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Upload geçmişi alınırken hata oluştu',
        error: error.message
      });
    }
  }

  // CAP Öğrenci Excel dosyası yükle
  static async uploadCapOgrenciExcel(request: FastifyRequest, reply: FastifyReply) {
    let filePath: string | undefined;
    
    try {
      await logger.log(request, {
        level: LogLevel.DEBUG,
        action: LogAction.API_REQUEST,
        details: { endpoint: 'upload-cap-ogrenci-excel' }
      });

      // İşlenmekte olan dosya kontrolü
      const prismaModule = await import('../generated/prisma/index.js');
      const prisma = new prismaModule.PrismaClient();
      
      const wsNotificationService = WebSocketNotificationService.getInstance();
      
      // Check if another upload is in progress
      if (!wsNotificationService.canStartUpload()) {
        await prisma.$disconnect();
        return reply.status(409).send({
          success: false,
          message: 'Zaten işlenmekte olan bir dosya var. Lütfen işlem tamamlanana kadar bekleyin.'
        });
      }
      
      const processingFile = await prisma.yuklenenDosya.findFirst({
        where: {
          dosyaTipi: 'cap-ogrenci',
          durumu: {
            in: ['KUYRUKTA', 'ISLENIYOR']
          }
        }
      });
      
      if (processingFile) {
        await prisma.$disconnect();
        return reply.status(409).send({
          success: false,
          message: 'Zaten işlenmekte olan bir CAP öğrenci Excel dosyası var. Lütfen işlem tamamlanana kadar bekleyin.',
          processingFile: {
            id: processingFile.id,
            fileName: processingFile.dosyaAdi,
            status: processingFile.durumu
          }
        });
      }
      
      await prisma.$disconnect();

      // Dosya kontrolü
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          message: 'Excel dosyası bulunamadı'
        });
      }

      // Dosya formatı kontrolü
      if (!data.filename.match(/\.(xlsx|xls)$/i)) {
        return reply.status(400).send({
          success: false,
          message: 'Sadece Excel dosyaları (.xlsx, .xls) kabul edilir'
        });
      }

      // Dosya boyutu kontrolü (50MB)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      const buffer = await data.toBuffer();
      if (buffer.length > MAX_FILE_SIZE) {
        return reply.status(400).send({
          success: false,
          message: 'Dosya boyutu 50MB\'dan büyük olamaz'
        });
      }

      // Uploads klasörünü oluştur (mutlak path kullan)
      const uploadsDir = path.resolve(process.cwd(), 'uploads', 'excel');
      console.log('📁 [CAP UPLOAD] Uploads dizini:', uploadsDir);
      await fsPromises.mkdir(uploadsDir, { recursive: true });

      // Benzersiz dosya adı oluştur
      const fileExtension = path.extname(data.filename);
      const fileName = `cap-ogrenci_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExtension}`;
      filePath = path.resolve(uploadsDir, fileName);
      
      console.log('📄 [CAP UPLOAD] CAP dosya bilgileri:');
      console.log('  - Orijinal dosya adı:', data.filename);
      console.log('  - Yeni dosya adı:', fileName);
      console.log('  - Tam dosya yolu:', filePath);
      console.log('  - Working directory:', process.cwd());

      // Dosyayı güvenli bir şekilde kaydet
      let fileSaved = false;
      let saveAttempts = 0;
      const maxSaveAttempts = 3;
      
      // Start upload tracking - will be updated with real dosyaId from Excel service
      if (!wsNotificationService.startUpload(0)) { // Use 0 as placeholder, will be updated
        return reply.status(409).send({
          success: false,
          message: 'Zaten işlenmekte olan bir dosya var. Lütfen işlem tamamlanana kadar bekleyin.'
        });
      }
      
      // Send initial progress
      wsNotificationService.notifyProgressUpdate(0, 0, 'uploading');
      
      while (!fileSaved && saveAttempts < maxSaveAttempts) {
        try {
          saveAttempts++;
          console.log(`� [CAP UPLOAD] CAP dosya kaydetme denemesi ${saveAttempts}/${maxSaveAttempts}: ${fileName}`);
          
          // Check if upload was cancelled
          if (await wsNotificationService.isUploadAborted(0)) {
            throw new Error('Upload was cancelled');
          }
          
          // Send progress update during file write
          const writeProgress = Math.floor((saveAttempts / maxSaveAttempts) * 50); // 0-50% for file writing
          wsNotificationService.notifyProgressUpdate(0, writeProgress, 'uploading');
          
          // Dosyayı kaydet
          await fsPromises.writeFile(filePath, buffer, { flag: 'w' });
          
          // Dosyanın tamamen yazıldığından emin olmak için fsync kullan
          const fd = await fsPromises.open(filePath, 'r+');
          await fd.sync(); // Force write to disk
          await fd.close();
          
          // Dosya varlığını ve boyutunu doğrula
          const stats = await fsPromises.stat(filePath);
          console.log(`📊 [CAP UPLOAD] Yazılan dosya boyutu: ${stats.size}, Beklenen: ${buffer.length}`);
          
          if (stats.size !== buffer.length) {
            throw new Error(`Dosya yazma işlemi tamamlanmamış, boyut uyumsuzluğu. Yazılan: ${stats.size}, Beklenen: ${buffer.length}`);
          }
          
          // Dosyaya okuma erişimi test et
          await fsPromises.access(filePath, fs.constants.R_OK);
          
          // Dosya içeriğini bir kez okuyup test et
          const testBuffer = await fsPromises.readFile(filePath);
          if (testBuffer.length !== buffer.length) {
            throw new Error('Dosya okuma testi başarısız, boyut uyumsuzluğu');
          }
          
          fileSaved = true;
          console.log('✅ [CAP UPLOAD] CAP dosyası başarıyla kaydedildi ve doğrulandı');
          
          // Send progress update after successful file save
          wsNotificationService.notifyProgressUpdate(0, 70, 'uploading');
          
        } catch (saveError: any) {
          console.error(`❌ [CAP UPLOAD] CAP dosya kaydetme denemesi ${saveAttempts} başarısız:`, saveError.message);
          
          if (saveAttempts >= maxSaveAttempts) {
            throw new Error(`CAP dosyası ${maxSaveAttempts} deneme sonrası kaydedilemedi: ${saveError.message}`);
          }
          
          // Başarısız dosyayı temizle
          try {
            if (await fsPromises.stat(filePath)) {
              await fsPromises.unlink(filePath);
            }
          } catch (cleanupError) {
            // Cleanup hatası önemli değil
          }
          
          // 200ms bekle ve tekrar dene
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Son bir kontrol daha - 100ms bekle
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send progress before processing
      wsNotificationService.notifyProgressUpdate(0, 80, 'processing');

      // Create a yuklenenDosya record and enqueue job to process it in background worker
      const yuklenen = await (async () => {
        // create minimal record upfront so worker can pick it up
        const prismaModule = await import('../generated/prisma/index.js');
        const prisma = new prismaModule.PrismaClient();
        const created = await prisma.yuklenenDosya.create({ 
          data: { 
            dosyaAdi: data.filename, 
            dosyaTipi: 'cap-ogrenci', 
            dosyaYolu: filePath, 
            durumu: 'KUYRUKTA' 
          } 
        });
        await prisma.$disconnect();
        return created;
      })();

      // Update upload tracking with real dosya ID and check for cancellation
      if (yuklenen.id && yuklenen.id > 0) {
        // Update the tracking to use real dosya ID
        wsNotificationService.finishUpload(0); // Clear placeholder
        wsNotificationService.startUpload(yuklenen.id); // Start tracking with real ID
        
        // Send progress update with real dosya ID so frontend can track it
        wsNotificationService.notifyProgressUpdate(yuklenen.id, 85, 'processing');
        
        if (await wsNotificationService.isUploadAborted(yuklenen.id)) {
          // Clean up the file if upload was cancelled
          try {
            await fsPromises.unlink(filePath);
            console.log('🧹 [CAP UPLOAD] Cancelled upload file cleaned up:', filePath);
          } catch (cleanupError: any) {
            console.error('⚠️ [CAP UPLOAD] Cancelled file cleanup error:', cleanupError.message);
          }
          
          // Finish tracking
          wsNotificationService.finishUpload(yuklenen.id);
          
          return reply.status(200).send({
            success: false,
            message: 'Dosya yükleme iptal edildi',
            cancelled: true
          });
        }
      } else {
        // Finish upload tracking with placeholder if no dosya ID
        wsNotificationService.finishUpload(0);
      }

      // Enqueue processing job
      await queue.add('process-cap-ogrenci-excel', { 
        filePath, 
        fileName: data.filename, 
        dosyaId: yuklenen.id,
        jobType: 'cap-ogrenci'
      }, { 
        attempts: 3, 
        backoff: { type: 'exponential', delay: 2000 } 
      });

      const result = { success: true, dosyaId: yuklenen.id, processedRows: 0, successfulRows: 0, errorRows: 0, totalRows: 0, errors: [] };

      // Send completion notification - note: actual processing happens in worker
      const wsService = WebSocketNotificationService.getInstance();
      wsService.notifyProgressUpdate(yuklenen.id, 100, 'queued');
      
      // Finish tracking since we've queued the job
      wsService.finishUpload(yuklenen.id);

      await logger.log(request, {
        level: LogLevel.INFO,
        action: 'CAP_OGRENCI_EXCEL_UPLOAD' as any,
        details: { 
          fileName: data.filename,
          processedRows: result.processedRows,
          successfulRows: result.successfulRows,
          errorRows: result.errorRows
        }
      });

      // İşlem sonucu döndür
      reply.send({
        success: result.success,
        message: result.success 
          ? 'CAP öğrenci Excel dosyası başarıyla yüklendi ve işleme alındı' 
          : 'CAP öğrenci Excel dosyası yüklendi ancak bazı hatalar oluştu',
        data: {
          dosyaId: result.dosyaId,
          totalRows: result.totalRows,
          processedRows: result.processedRows,
          successfulRows: result.successfulRows,
          errorRows: result.errorRows,
          errors: result.errors.slice(0, 10) // İlk 10 hatayı göster
        }
      });

    } catch (error: any) {
      await logger.log(request, {
        level: LogLevel.ERROR,
        action: LogAction.API_ERROR,
        details: { error: error.message }
      });

      // Upload tracking'i temizle
      const wsService = WebSocketNotificationService.getInstance();
      wsService.finishUpload(0);

      // Başarısız dosyayı temizle
      if (filePath) {
        try {
          await fsPromises.unlink(filePath);
          console.log('🧹 [CAP UPLOAD] Error cleanup - file removed:', filePath);
        } catch (cleanupError: any) {
          console.error('⚠️ [CAP UPLOAD] Error cleanup failed:', cleanupError.message);
        }
      }

      // 409 Conflict - Already processing
      if (error.message.includes('işlenmekte olan')) {
        return reply.status(409).send({
          success: false,
          message: error.message
        });
      }

      reply.status(500).send({
        success: false,
        message: 'CAP öğrenci Excel dosyası yüklenirken hata oluştu',
        error: error.message
      });
    }
  }
}
