import { FastifyRequest, FastifyReply } from 'fastify';
import { BasvuruService } from '../services/basvuru.service.js';
import { createBasvuruBodySchema, iptalBasvuruBodySchema } from '../schemas/basvuruSchemas.js';
import { AuthenticatedRequest } from '../lib/auth.js';
import { ValidationUtils } from '../utils/validation.utils.js';
import { ErrorHandler, BadRequestError, NotFoundError } from '../utils/error.utils.js';
import { FileService } from '../utils/file.utils.js';
import LoggerService, { LogAction, LogLevel } from '../services/logger.service.js';
import { config } from '../lib/config.js';
import { prisma } from '../lib/prisma.js';

export class BasvuruController {
  private basvuruService: BasvuruService;
  private logger: LoggerService;

  constructor() {
    this.basvuruService = new BasvuruService();
    this.logger = LoggerService.getInstance();
  }
  
  async createBasvuru(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Çoklu dosya desteği: transkript, hizmet dökümü, sigorta dosyası
      const files: Record<string, any> = {};
      const fields: Record<string, any> = {};
      const parts = request.parts({
        limits: { fileSize: config.MAX_FILE_SIZE * 3, files: 3 }
      });
      for await (const part of parts) {
        if (part.type === 'file') {
          // Alan adına göre dosyayı ayır
          if (part.fieldname === 'transkriptDosyasi' || part.fieldname === 'hizmetDokumu' || part.fieldname === 'sigortaDosyasi') {
            ValidationUtils.validateFile(part);
            files[part.fieldname] = await FileService.saveFile(part);
          }
        } else {
          let value = (part as any).value;
          // seciliGunler dizi olarak gelirse stringe çevir
          if ((part as any).fieldname === 'seciliGunler' && Array.isArray(value)) {
            value = value.join(',');
          }
          // yurtDisi encoding düzeltmesi (ör: yurtiÃ§i -> yurtiçi)
          if ((part as any).fieldname === 'yurtDisi' && typeof value === 'string') {
            value = value.replace('Ã§', 'ç').replace('Ã¼', 'ü').replace('Ã', 'Ç').replace('Ã', 'Ü').replace('Ä±', 'ı');
          }
          fields[(part as any).fieldname] = value;
        }
      }
      
      // Debug logging only in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`📁 FIELDS: ${JSON.stringify(fields)}`);
      }
      
      // Zorunlu dosya kontrolü (ör: transkript zorunlu)
      if (!files.transkriptDosyasi) {
        throw new BadRequestError('Transkript dosyası yüklenmelidir.');
      }
      
      // stajTipi enum dönüşümü (validation'dan önce yapılmalı)
      if (typeof fields.stajTipi === 'string') {
        const { StajTipiEnum } = await import('../dtos/basvuru.dto.js');
        fields.stajTipi = StajTipiEnum[fields.stajTipi as keyof typeof StajTipiEnum] as typeof StajTipiEnum[keyof typeof StajTipiEnum];
      }
      
      // CAP field dönüşümleri (validation'dan önce yapılmalı)
      if (typeof fields.isCapBasvuru === 'string') {
        fields.isCapBasvuru = fields.isCapBasvuru === 'true';
      }
      if (typeof fields.capId === 'string') {
        fields.capId = parseInt(fields.capId, 10);
      }
      if (typeof fields.toplamGun === 'string') {
        fields.toplamGun = parseInt(fields.toplamGun, 10);
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 [CAP DEBUG] isCapBasvuru: ${fields.isCapBasvuru} (type: ${typeof fields.isCapBasvuru})`);
        console.log(`🔍 [CAP DEBUG] capId: ${fields.capId} (type: ${typeof fields.capId})`);
        console.log(`🔍 [CAP DEBUG] capFakulte: ${fields.capFakulte}`);
        console.log(`🔍 [CAP DEBUG] capBolum: ${fields.capBolum}`);
        console.log(`🔍 [CAP DEBUG] capDepartman: ${fields.capDepartman}`);
      }
      
      // Form validasyonu
      const validationResult = createBasvuruBodySchema.safeParse(fields);
      if (!validationResult.success) {
        // Yüklenen dosyaları sil
        for (const filePath of Object.values(files)) {
          await FileService.deleteFile(filePath as string);
        }
        // Hataları logla - sadece development'te console'a yaz
        if (process.env.NODE_ENV === 'development') {
          console.error('Validation errors:', validationResult.error.flatten());
        }
        // İlk hatalı alanı detaylı döndür
        const errors = validationResult.error.flatten();
        const fieldErrors = errors.fieldErrors;
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (messages && messages.length > 0) {
            throw new BadRequestError(`${field}: ${messages[0]}`);
          }
        }
        throw new BadRequestError('Girdi verileri geçersiz.');
      }
      const validatedData = validationResult.data;
      // Tüm dosyaları DTO'ya ekle
      (validatedData as any).transkriptDosyasi = files.transkriptDosyasi;
      (validatedData as any).hizmetDokumu = files.hizmetDokumu || null;
      (validatedData as any).sigortaDosyasi = files.sigortaDosyasi || null;
      
      // Track uploaded files for cleanup on error
      const uploadedFiles = Object.values(files).filter(Boolean) as string[];
      
      try {
        // Service çağrısında tüm dosyaları gönder
        const basvuru = await this.basvuruService.createBasvuru(
          validatedData as import('../dtos/basvuru.dto.js').CreateBasvuruDTO, 
          request.user!.id, 
          {
            transkriptDosyasi: files.transkriptDosyasi,
            hizmetDokumu: files.hizmetDokumu || null,
            sigortaDosyasi: files.sigortaDosyasi || null
          }
        );
        
        // Log başvuru oluşturma
        await this.logger.logBasvuru(
          request, 
          LogAction.BASVURU_CREATE, 
          request.user!.email, 
          request.user!.userType, 
          request.user!.id,
          {
            basvuruId: basvuru.id,
            kurumAdi: validatedData.kurumAdi,
            stajTipi: validatedData.stajTipi,
            uploadedFiles: Object.keys(files)
          }
        );

        reply.status(201).send(ErrorHandler.createSuccessResponse(basvuru, 'Başvuru başarıyla oluşturuldu.'));
      } catch (serviceError) {
        // Clean up uploaded files if database operation fails
        await FileService.cleanupFiles(uploadedFiles);
        throw serviceError;
      }
    } catch (error: unknown) {
      // Log error
      const errorObj = error as Error & { statusCode?: number };
      await this.logger.logError(request, errorObj, request.user?.email, request.user?.userType, request.user?.id);
      ErrorHandler.handleError(error, reply);
    }
  }

  async createMuafiyetBasvuru(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const files: Record<string, any> = {};
      const fields: Record<string, any> = {};
      const parts = request.parts({
        limits: { fileSize: config.MAX_FILE_SIZE, files: 1 }
      });
      
      for await (const part of parts) {
        if (part.type === 'file') {
          // Sadece SGK 4A dosyası
          if (part.fieldname === 'sgk4a') {
            ValidationUtils.validateFile(part);
            files[part.fieldname] = await FileService.saveFile(part);
          }
        } else {
          // Form alanları
          fields[(part as any).fieldname] = (part as any).value;
        }
      }

      // Debug logging only in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`📁 MUAFIYET FIELDS: ${JSON.stringify(fields)}`);
        console.log(`📁 MUAFIYET FILES: ${JSON.stringify(Object.keys(files))}`);
      }
      
      // Zorunlu dosya kontrolü
      if (!files.sgk4a) {
        throw new BadRequestError('SGK 4A hizmet dökümü dosyası yüklenmelidir.');
      }

      // CAP bilgilerini parse et
      const capData = fields.isCapBasvuru === 'true' ? {
        isCapBasvuru: true,
        capFakulte: fields.capFakulte || null,
        capBolum: fields.capBolum || null,
        capDepartman: fields.capDepartman || null,
        capId: fields.capId ? parseInt(fields.capId) : undefined,
      } : { isCapBasvuru: false };

      // Debug CAP data
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 [MUAFIYET] CAP Data Parsed:`, JSON.stringify(capData, null, 2));
        console.log(`🔍 [MUAFIYET] isCapBasvuru field value:`, fields.isCapBasvuru);
        console.log(`🔍 [MUAFIYET] capId field value:`, fields.capId);
        console.log(`🔍 [MUAFIYET] capFakulte field value:`, fields.capFakulte);
      }
      
      // Track uploaded files for cleanup on error
      const uploadedFiles = Object.values(files).filter(Boolean) as string[];
      
      try {
        // Service çağrısında muafiyet service kullan
        const muafiyetBasvuru = await this.basvuruService.createMuafiyetBasvuru(
          request.user!.id,
          files.sgk4a,
          capData
        );
        
        // Log muafiyet başvuru oluşturma
        await this.logger.logBasvuru(
          request, 
          LogAction.BASVURU_CREATE, 
          request.user!.email, 
          request.user!.userType, 
          request.user!.id,
          {
            basvuruId: muafiyetBasvuru.id,
            basvuruType: 'MUAFIYET',
            uploadedFiles: Object.keys(files)
          }
        );

        reply.status(201).send(ErrorHandler.createSuccessResponse(muafiyetBasvuru, 'Muafiyet başvurusu başarıyla oluşturuldu.'));
      } catch (serviceError) {
        // Clean up uploaded files if database operation fails
        await FileService.cleanupFiles(uploadedFiles);
        throw serviceError;
      }
    } catch (error: unknown) {
      // Log error
      const errorObj = error as Error & { statusCode?: number };
      await this.logger.logError(request, errorObj, request.user?.email, request.user?.userType, request.user?.id);
      ErrorHandler.handleError(error, reply);
    }
  }

  async getMuafiyetBasvurular(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const muafiyetBasvurular = await this.basvuruService.getMuafiyetBasvurularByUserId(request.user!.id);
      reply.send(ErrorHandler.createSuccessResponse(muafiyetBasvurular));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  async downloadMuafiyetPdf(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const muafiyetId = ValidationUtils.validateId((request.params as any).id, 'Muafiyet ID');
      
      const { buffer, filename } = await this.basvuruService.downloadMuafiyetPdf(muafiyetId, request.user!.id);
      
      // Log muafiyet download
      await this.logger.log(request, {
        action: LogAction.DEFTER_DOWNLOAD, // We can reuse this or create a new one
        level: LogLevel.INFO,
        userId: request.user!.id,
        userEmail: request.user!.email,
        userType: request.user!.userType,
        details: {
          muafiyetId,
          fileName: filename
        },
        statusCode: 200
      });
      
      reply
        .type('application/pdf')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(buffer);
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  async getBasvurular(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const basvurular = await this.basvuruService.getAllBasvurularByUserId(request.user!.id);
      reply.send(ErrorHandler.createSuccessResponse(basvurular));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  async getBasvuruById(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const basvuruId = ValidationUtils.validateId((request.params as any).id, 'Başvuru ID');
      const basvuru = await this.basvuruService.getBasvuruById(basvuruId, request.user!.id);
      
      reply.send(ErrorHandler.createSuccessResponse(basvuru));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // updateBasvuru removed: student update endpoint deleted.

  async cancelBasvuru(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const basvuruId = ValidationUtils.validateId((request.params as any).id, 'Başvuru ID');
      const userId = request.user!.id;

      const validationResult = iptalBasvuruBodySchema.safeParse(request.body);

      if (!validationResult.success) {
        throw new BadRequestError('Girdi verileri geçersiz.');
      }

      const { iptalSebebi } = validationResult.data;
      const guncellenmisBasvuru = await this.basvuruService.cancelBasvuru(basvuruId, userId, { iptalSebebi });
      
      reply.send(ErrorHandler.createSuccessResponse(guncellenmisBasvuru, 'Başvuru başarıyla iptal edildi.'));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
 }
  async updateBasvuruTarih(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const basvuruId = ValidationUtils.validateId((request.params as any).id, 'Başvuru ID');
      const userId = request.user!.id;

      // Validate request body
      const validationResult = (await import('../schemas/basvuruSchemas.js')).updateBasvuruTarihBodySchema.safeParse(request.body);

      if (!validationResult.success) {
        throw new BadRequestError('Girdi verileri geçersiz.');
      }

      const updateData = validationResult.data;
      const guncellenmisBasvuru = await this.basvuruService.updateBasvuruTarih(basvuruId, userId, updateData);
      
      reply.send(ErrorHandler.createSuccessResponse(guncellenmisBasvuru, 'Başvuru tarihi başarıyla güncellendi.'));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // ADVISOR/TEACHER METHODS
  async getDanismanOgrencileri(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const danismanId = request.user!.id;
      const { getDanismanOgrencileri } = await import('../services/danisman.service.js');
      const ogrenciler = await getDanismanOgrencileri(danismanId);
      reply.send(ErrorHandler.createSuccessResponse(ogrenciler));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  async getDanismanBasvurular(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const danismanId = request.user!.id;
      const { getDanismanBasvurulari } = await import('../services/danisman.service.js');
      const basvurular = await getDanismanBasvurulari(danismanId);
      reply.send(ErrorHandler.createSuccessResponse(basvurular));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  async getDanismanBasvuruDetay(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const basvuruId = ValidationUtils.validateId((request.params as any).id, 'Başvuru ID');
      const danismanId = request.user!.id;
      const { getBasvuruDetayi } = await import('../services/danisman.service.js');
      const basvuru = await getBasvuruDetayi(basvuruId, danismanId);
      reply.send(ErrorHandler.createSuccessResponse(basvuru));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  async onaylaBasvuru(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const basvuruId = ValidationUtils.validateId((request.params as any).id, 'Başvuru ID');
      const danismanId = request.user!.id;
      const danismanEmail = request.user!.email;
      const { aciklama } = request.body as any;
      
      const { onaylaBasvuru } = await import('../services/danisman.service.js');
      const updatedBasvuru = await onaylaBasvuru(basvuruId, danismanId, danismanEmail, aciklama);
      reply.send(ErrorHandler.createSuccessResponse(updatedBasvuru));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  async reddetBasvuru(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const basvuruId = ValidationUtils.validateId((request.params as any).id, 'Başvuru ID');
      const danismanId = request.user!.id;
      const danismanEmail = request.user!.email;
      const { redSebebi } = request.body as any;
      
      ValidationUtils.validateRequired(redSebebi, 'Red sebebi');
      
      const { reddetBasvuru } = await import('../services/danisman.service.js');
      const updatedBasvuru = await reddetBasvuru(basvuruId, danismanId, danismanEmail, redSebebi);
      reply.send(ErrorHandler.createSuccessResponse(updatedBasvuru));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  async getDanismanDefterler(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const danismanEmail = request.user!.email;
      const { getDanismanDefterler } = await import('../services/danisman.service.js');
      const defterler = await getDanismanDefterler(danismanEmail);
      reply.send(ErrorHandler.createSuccessResponse(defterler));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  async getDanismanDefterDetay(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const defterId = ValidationUtils.validateId((request.params as any).id, 'Defter ID');
      const danismanEmail = request.user!.email;
      const { getDefterDetayi } = await import('../services/danisman.service.js');
      const defter = await getDefterDetayi(defterId, danismanEmail);
      reply.send(ErrorHandler.createSuccessResponse(defter));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  async updateDefterDurumu(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const defterId = ValidationUtils.validateId((request.params as any).id, 'Defter ID');
      const danismanEmail = request.user!.email;
      const { yeniDurum, aciklama } = request.body as any;
      
      ValidationUtils.validateRequired(yeniDurum, 'Yeni durum');
      
      const { updateDefterDurumu } = await import('../services/danisman.service.js');
      const updatedDefter = await updateDefterDurumu(defterId, danismanEmail, yeniDurum, aciklama);
      reply.send(ErrorHandler.createSuccessResponse(updatedDefter));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Private helper methods
  private parseFormFields(fields: any): { [key: string]: any } {
    const parsedFields: { [key: string]: any } = {};
    
    if (fields) {
      for (const key in fields) {
        const field = fields[key];
        if (field && typeof field === 'object' && 'value' in field) {
          parsedFields[key] = (field as any).value;
        }
      }
    }
    
    return parsedFields;
  }
}

// Export controller instance and individual methods for backward compatibility
const basvuruController = new BasvuruController();

export const createBasvuru = basvuruController.createBasvuru.bind(basvuruController);
export const createMuafiyetBasvuru = basvuruController.createMuafiyetBasvuru.bind(basvuruController);
export const getMuafiyetBasvurular = basvuruController.getMuafiyetBasvurular.bind(basvuruController);
export const downloadMuafiyetPdf = basvuruController.downloadMuafiyetPdf.bind(basvuruController);
export const getBasvurular = basvuruController.getBasvurular.bind(basvuruController);
export const getBasvuruById = basvuruController.getBasvuruById.bind(basvuruController);
export const cancelBasvuru = basvuruController.cancelBasvuru.bind(basvuruController);
export const updateBasvuruTarih = basvuruController.updateBasvuruTarih.bind(basvuruController);

// Advisor/Teacher methods
export const getDanismanOgrencileri = basvuruController.getDanismanOgrencileri.bind(basvuruController);
export const getDanismanBasvurular = basvuruController.getDanismanBasvurular.bind(basvuruController);
export const getDanismanBasvuruDetay = basvuruController.getDanismanBasvuruDetay.bind(basvuruController);
export const onaylaBasvuru = basvuruController.onaylaBasvuru.bind(basvuruController);
export const reddetBasvuru = basvuruController.reddetBasvuru.bind(basvuruController);
export const getDanismanDefterler = basvuruController.getDanismanDefterler.bind(basvuruController);
export const getDanismanDefterDetay = basvuruController.getDanismanDefterDetay.bind(basvuruController);
export const updateDefterDurumu = basvuruController.updateDefterDurumu.bind(basvuruController);

export default basvuruController;
