import { FastifyInstance } from 'fastify';
import { ExcelController } from '../controllers/excel.controller.js';
import { requireAnyRole } from '../lib/auth.js';
import { UserType } from '../generated/prisma/index.js';

export const excelRoutes = async (app: FastifyInstance) => {
  // Add admin authentication middleware for all Excel routes
  app.addHook('preHandler', requireAnyRole([UserType.YONETICI]));

  // Hoca Excel upload
  app.post('/upload/hoca', ExcelController.uploadHocaExcel);

  // Öğrenci Excel upload
  app.post('/upload/ogrenci', ExcelController.uploadOgrenciExcel);

  // CAP Öğrenci Excel upload
  app.post('/upload/cap-ogrenci', ExcelController.uploadCapOgrenciExcel);

  // Upload durumu kontrol
  app.get('/upload/status/:id', ExcelController.getDosyaDurumu);

  // Upload geçmişi
  app.get('/upload/history', ExcelController.getUploadHistory);

  // Upload'ı iptal et
  app.post('/upload/cancel/:id', ExcelController.cancelUpload);
};
