import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../lib/auth.js';
import { ValidationUtils } from '../utils/validation.utils.js';
import { ErrorHandler, BadRequestError, NotFoundError } from '../utils/error.utils.js';
import * as defterService from '../services/defter.service.js';
import { DefterPdfUploadDTO } from '../dtos/defter.dto.js';
import LoggerService, { LogAction, LogLevel } from '../services/logger.service.js';

export class DefterController {
  private logger: LoggerService;

  constructor() {
    this.logger = LoggerService.getInstance();
  }

  async getDefterler(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const defterler = await defterService.getDefterlerByUserId(request.user!.id);
      reply.send(ErrorHandler.createSuccessResponse(defterler));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  async getDefterById(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const defterId = ValidationUtils.validateId((request.params as any).id, 'Defter ID');
      const defter = await defterService.getDefterById(defterId, request.user!.id);
      
      if (!defter) {
        throw new NotFoundError('Defter bulunamadı.');
      }
      
      reply.send(ErrorHandler.createSuccessResponse(defter));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  async uploadDefterPdf(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Get basvuruId from URL params
      const basvuruId = ValidationUtils.validateId((request.params as any).basvuruId, 'Başvuru ID');
      
      let fileData: any = null;
      let fileName: string = '';
      let mimeType: string = '';
      
      // Use parts() with higher limits for this specific route
      const parts = request.parts({
        limits: {
          fileSize: 60 * 1024 * 1024, // 60MB per part
          files: 1,
          fieldNameSize: 200,
          fieldSize: 10240,
          fields: 50
        }
      });

      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          fileName = part.filename || 'staj-defteri.pdf';
          mimeType = part.mimetype;
          fileData = await part.toBuffer();
          break;
        }
      }
      
      if (!fileData) {
        throw new BadRequestError('PDF dosyası gereklidir.');
      }

      // Dosya tipini kontrol et
      if (mimeType !== 'application/pdf') {
        throw new BadRequestError('Sadece PDF dosyaları yüklenebilir.');
      }
      
      // Debug log for file size - only in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`📁 File upload debug - Name: ${fileName}, Size: ${fileData.length} bytes (${(fileData.length / 1024 / 1024).toFixed(2)} MB)`);
      }

      const uploadData: DefterPdfUploadDTO = {
        basvuruId,
        file: fileData,
        originalName: fileName,
        mimeType: mimeType
      };

      const result = await defterService.uploadDefterPdf(uploadData, request.user!.id);
      
      // Log defter upload
      await this.logger.log(request, {
        action: LogAction.DEFTER_UPLOAD,
        level: LogLevel.INFO,
        userId: request.user!.id,
        userEmail: request.user!.email,
        userType: request.user!.userType,
        details: {
          defterId: result.id,
          basvuruId,
          fileName: fileName,
          fileSize: fileData.length
        },
        statusCode: 200
      });
      
      reply.status(201).send(ErrorHandler.createSuccessResponse(result, 'Staj defteri PDF\'i başarıyla yüklendi.'));
    } catch (error) {
      // Enhanced error logging for debugging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('📁 File upload error:', error);
      }
      
      await this.logger.log(request, {
        action: LogAction.DEFTER_UPLOAD,
        level: LogLevel.ERROR,
        userId: request.user?.id,
        userEmail: request.user?.email,
        userType: request.user?.userType,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          basvuruId: (request.params as any).basvuruId
        },
        statusCode: 500
      });
      
      ErrorHandler.handleError(error, reply);
    }
  }

  async downloadDefterPdf(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const defterId = ValidationUtils.validateId((request.params as any).id, 'Defter ID');
      
      const { buffer, filename } = await defterService.downloadDefterPdf(defterId, request.user!.id);
      
      // Log defter download
      await this.logger.log(request, {
        action: LogAction.DEFTER_DOWNLOAD,
        level: LogLevel.INFO,
        userId: request.user!.id,
        userEmail: request.user!.email,
        userType: request.user!.userType,
        details: {
          defterId,
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

  async deleteDefterPdf(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const defterId = ValidationUtils.validateId((request.params as any).id, 'Defter ID');
      
      await defterService.deleteDefterPdf(defterId, request.user!.id);
      
      // Log defter delete
      await this.logger.log(request, {
        action: LogAction.DEFTER_DELETE,
        level: LogLevel.INFO,
        userId: request.user!.id,
        userEmail: request.user!.email,
        userType: request.user!.userType,
        details: {
          defterId
        },
        statusCode: 200
      });
      
      reply.send(ErrorHandler.createSuccessResponse(null, 'Staj defteri PDF\'i başarıyla silindi.'));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  async updateDefterDurumu(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      const defterId = ValidationUtils.validateId((request.params as any).id, 'Defter ID');
      const { yeniDurum } = request.body as any;
      
      ValidationUtils.validateRequired(yeniDurum, 'Yeni durum');
      
      const validStatuses = ['Beklemede', 'Yuklendi', 'Onaylandi'];
      if (!validStatuses.includes(yeniDurum)) {
        throw new BadRequestError('Geçersiz durum. İzin verilen durumlar: ' + validStatuses.join(', '));
      }
      
      const updatedDefter = await defterService.updateDefterDurumu(defterId, request.user!.id, yeniDurum);
      
      reply.send(ErrorHandler.createSuccessResponse(updatedDefter, 'Defter durumu başarıyla güncellendi.'));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }
}

// Export controller instance and individual methods for backward compatibility
const defterController = new DefterController();

export const getDefterler = defterController.getDefterler.bind(defterController);
export const getDefterById = defterController.getDefterById.bind(defterController);
export const uploadDefterPdf = defterController.uploadDefterPdf.bind(defterController);
export const downloadDefterPdf = defterController.downloadDefterPdf.bind(defterController);
export const deleteDefterPdf = defterController.deleteDefterPdf.bind(defterController);
export const updateDefterDurumu = defterController.updateDefterDurumu.bind(defterController);

export default defterController;
