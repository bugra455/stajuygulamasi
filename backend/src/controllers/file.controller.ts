import { DebugUtils } from '../utils/debug.utils.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../lib/auth.js';
import { ValidationUtils } from '../utils/validation.utils.js';
import { ErrorHandler, NotFoundError, ForbiddenError } from '../utils/error.utils.js';
import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';

export class FileController {
  // Transkript dosyası indirme
  async downloadTranskript(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const authRequest = request as AuthenticatedRequest;
      const params = request.params as any || {};
      const rawId = params.basvuruId ?? params.id;
      const basvuruId = ValidationUtils.validateId(rawId, 'Başvuru ID');

      // Başvuruyu ve dosya yolunu getir
      const basvuru = await prisma.stajBasvurusu.findUnique({
        where: { id: basvuruId },
        select: {
          id: true,
          transkriptDosyasi: true,
          ogrenciId: true,
          danismanMail: true,
          sorumluMail: true,
          ogrenci: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      if (!basvuru) {
        throw new NotFoundError('Başvuru bulunamadı.');
      }

      if (!basvuru.transkriptDosyasi) {
        throw new NotFoundError('Transkript dosyası bulunamadı.');
      }

      // Yetki kontrolü - sadece ilgili kişiler indirebilir
      const userEmail = authRequest.user!.email;
      const isAuthorized = (
        basvuru.ogrenciId === authRequest.user!.id || // Öğrenci kendisinin
        userEmail === basvuru.danismanMail || // Danışman
        userEmail === basvuru.sorumluMail || // Şirket sorumlusu
        authRequest.user!.userType === 'KARIYER_MERKEZI' || // Kariyer merkezi
        authRequest.user!.userType === 'YONETICI' // Yönetici
      );

      if (!isAuthorized) {
        throw new ForbiddenError('Bu dosyaya erişim yetkiniz yok.');
      }

      // Dosya yolunu oluştur - eğer tam yol değilse uploads klasörüyle birleştir
      let filePath: string;
      if (path.isAbsolute(basvuru.transkriptDosyasi)) {
        filePath = basvuru.transkriptDosyasi;
      } else {
        // Relatif yol ise uploads klasörüyle birleştir
        filePath = path.resolve(process.cwd(), 'uploads', basvuru.transkriptDosyasi);
      }
      
      DebugUtils.log('📄 [FILE_DOWNLOAD] Dosya indirme işlemi');
      DebugUtils.log('📄 [FILE_DOWNLOAD] Başvuru ID:', basvuruId);
      DebugUtils.log('📄 [FILE_DOWNLOAD] Veritabanındaki yol:', basvuru.transkriptDosyasi);
      DebugUtils.log('📄 [FILE_DOWNLOAD] Hesaplanan dosya yolu:', filePath);
      DebugUtils.log('📄 [FILE_DOWNLOAD] İsteyen kullanıcı:', userEmail);

      // Dosyanın var olup olmadığını kontrol et
      if (!fs.existsSync(filePath)) {
        console.error('❌ [FILE_DOWNLOAD] Dosya disk üzerinde bulunamadı:', filePath);
        throw new NotFoundError('Dosya disk üzerinde bulunamadı.');
      }

      // Dosya bilgilerini al
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      
      // MIME type belirle
      const ext = path.extname(fileName).toLowerCase();
      let mimeType = 'application/octet-stream';
      if (ext === '.pdf') mimeType = 'application/pdf';
      
      reply.type(mimeType);
      reply.header('Content-Length', stats.size);
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      reply.header('Cache-Control', 'no-cache');

      const stream = fs.createReadStream(filePath);
      
      try {
        await pipeline(stream, reply.raw);
        DebugUtils.log('✅ [FILE_DOWNLOAD] Dosya başarıyla gönderildi');
      } catch (err) {
        console.error('❌ [FILE_DOWNLOAD] Pipeline hatası:', err);
        if (!reply.sent) {
          reply.code(500).send({ error: 'Dosya gönderme hatası' });
        }
      }
    } catch (error) {
      console.error('❌ [FILE_DOWNLOAD] Dosya indirme hatası:', error);
      ErrorHandler.handleError(error, reply);
    }
  }

  // Hizmet dökümü indirme
  async downloadHizmetDokumu(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const authRequest = request as AuthenticatedRequest;
      const params = request.params as any || {};
      const rawId = params.basvuruId ?? params.id;
      const basvuruId = ValidationUtils.validateId(rawId, 'Başvuru ID');

      const basvuru = await prisma.stajBasvurusu.findUnique({
        where: { id: basvuruId },
        select: {
          id: true,
          hizmetDokumu: true,
          ogrenciId: true,
          danismanMail: true,
          sorumluMail: true
        }
      });

      if (!basvuru || !basvuru.hizmetDokumu) {
        throw new NotFoundError('Hizmet dökümü bulunamadı.');
      }

      // Yetki kontrolü
      const userEmail = authRequest.user!.email;
      const isAuthorized = (
        basvuru.ogrenciId === authRequest.user!.id ||
        userEmail === basvuru.danismanMail ||
        userEmail === basvuru.sorumluMail ||
        authRequest.user!.userType === 'KARIYER_MERKEZI' ||
        authRequest.user!.userType === 'YONETICI'
      );

      if (!isAuthorized) {
        throw new ForbiddenError('Bu dosyaya erişim yetkiniz yok.');
      }

      // Dosya yolunu oluştur - eğer tam yol değilse uploads klasörüyle birleştir
      let filePath: string;
      if (path.isAbsolute(basvuru.hizmetDokumu)) {
        filePath = basvuru.hizmetDokumu;
      } else {
        // Relatif yol ise uploads klasörüyle birleştir
        filePath = path.resolve(process.cwd(), 'uploads', basvuru.hizmetDokumu);
      }
      
      DebugUtils.log('📄 [HIZMET_DOWNLOAD] Hizmet dökümü indirme işlemi');
      DebugUtils.log('📄 [HIZMET_DOWNLOAD] Başvuru ID:', basvuruId);
      DebugUtils.log('📄 [HIZMET_DOWNLOAD] Veritabanındaki yol:', basvuru.hizmetDokumu);
      DebugUtils.log('📄 [HIZMET_DOWNLOAD] Hesaplanan dosya yolu:', filePath);
      
      if (!fs.existsSync(filePath)) {
        console.error('❌ [HIZMET_DOWNLOAD] Dosya disk üzerinde bulunamadı:', filePath);
        throw new NotFoundError('Dosya disk üzerinde bulunamadı.');
      }

      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      
      reply.type('application/pdf');
      reply.header('Content-Length', stats.size);
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      
      const stream = fs.createReadStream(filePath);
      
      try {
        await pipeline(stream, reply.raw);
        DebugUtils.log('✅ [HIZMET_DOWNLOAD] Dosya başarıyla gönderildi');
      } catch (err) {
        console.error('❌ [HIZMET_DOWNLOAD] Pipeline hatası:', err);
        if (!reply.sent) {
          reply.code(500).send({ error: 'Dosya gönderme hatası' });
        }
      }

    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Sigorta dosyası indirme
  async downloadSigortaDosyasi(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const authRequest = request as AuthenticatedRequest;
      const params = request.params as any || {};
      const rawId = params.basvuruId ?? params.id;
      const basvuruId = ValidationUtils.validateId(rawId, 'Başvuru ID');

      const basvuru = await prisma.stajBasvurusu.findUnique({
        where: { id: basvuruId },
        select: {
          id: true,
          sigortaDosyasi: true,
          ogrenciId: true,
          danismanMail: true,
          sorumluMail: true
        }
      });

      if (!basvuru || !basvuru.sigortaDosyasi) {
        throw new NotFoundError('Sigorta dosyası bulunamadı.');
      }

      // Yetki kontrolü
      const userEmail = authRequest.user!.email;
      const isAuthorized = (
        basvuru.ogrenciId === authRequest.user!.id ||
        userEmail === basvuru.danismanMail ||
        userEmail === basvuru.sorumluMail ||
        authRequest.user!.userType === 'KARIYER_MERKEZI' ||
        authRequest.user!.userType === 'YONETICI'
      );

      if (!isAuthorized) {
        throw new ForbiddenError('Bu dosyaya erişim yetkiniz yok.');
      }

      // Dosya yolunu oluştur - eğer tam yol değilse uploads klasörüyle birleştir
      let filePath: string;
      if (path.isAbsolute(basvuru.sigortaDosyasi)) {
        filePath = basvuru.sigortaDosyasi;
      } else {
        // Relatif yol ise uploads klasörüyle birleştir
        filePath = path.resolve(process.cwd(), 'uploads', basvuru.sigortaDosyasi);
      }
      
      DebugUtils.log('📄 [SIGORTA_DOWNLOAD] Sigorta dosyası indirme işlemi');
      DebugUtils.log('📄 [SIGORTA_DOWNLOAD] Başvuru ID:', basvuruId);
      DebugUtils.log('📄 [SIGORTA_DOWNLOAD] Veritabanındaki yol:', basvuru.sigortaDosyasi);
      DebugUtils.log('📄 [SIGORTA_DOWNLOAD] Hesaplanan dosya yolu:', filePath);
      
      if (!fs.existsSync(filePath)) {
        console.error('❌ [SIGORTA_DOWNLOAD] Dosya disk üzerinde bulunamadı:', filePath);
        throw new NotFoundError('Dosya disk üzerinde bulunamadı.');
      }

      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      
      reply.type('application/pdf');
      reply.header('Content-Length', stats.size);
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      
      const stream = fs.createReadStream(filePath);
      
      try {
        await pipeline(stream, reply.raw);
        DebugUtils.log('✅ [SIGORTA_DOWNLOAD] Dosya başarıyla gönderildi');
      } catch (err) {
        console.error('❌ [SIGORTA_DOWNLOAD] Pipeline hatası:', err);
        if (!reply.sent) {
          reply.code(500).send({ error: 'Dosya gönderme hatası' });
        }
      }

    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }
  // SGK4A indirme
  async downloadSGK4ADosya(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const authRequest = request as AuthenticatedRequest;
      const sgkId = ValidationUtils.validateId((request.params as any).sgkId, 'Sgk ID');
      
      const sgk = await prisma.muafiyetBasvurusu.findUnique({
        where: { id: sgkId },
        select: {
          id: true,
          sgk4a: true,
            ogrenciId: true,
            danismanMail: true,
        }
      });

      if (!sgk || !sgk.sgk4a) {
        throw new NotFoundError('SGK4A dosyası bulunamadı.');
      }

      // Yetki kontrolü
      const userEmail = authRequest.user!.email;
      const isAuthorized = (
        sgk.ogrenciId === authRequest.user!.id ||
        userEmail === sgk.danismanMail ||
        authRequest.user!.userType === 'KARIYER_MERKEZI' ||
        authRequest.user!.userType === 'YONETICI'
      );

      if (!isAuthorized) {
        throw new ForbiddenError('Bu dosyaya erişim yetkiniz yok.');
      }

      // Dosya yolunu oluştur - eğer tam yol değilse uploads klasörüyle birleştir
      let filePath: string;
      if (path.isAbsolute(sgk.sgk4a)) {
        filePath = sgk.sgk4a;
      } else {
        // Relatif yol ise uploads klasörüyle birleştir
        filePath = path.resolve(process.cwd(), 'uploads', sgk.sgk4a);
      }

      DebugUtils.log('📄 [SGK4A_DOWNLOAD] SGK4A dosyası indirme işlemi');
      DebugUtils.log('📄 [SGK4A_DOWNLOAD] Başvuru ID:', sgkId);
      DebugUtils.log('📄 [SGK4A_DOWNLOAD] Veritabanındaki yol:', sgk.sgk4a);
      DebugUtils.log('📄 [SGK4A_DOWNLOAD] Hesaplanan dosya yolu:', filePath);

      if (!fs.existsSync(filePath)) {
        console.error('❌ [SGK4A_DOWNLOAD] Dosya disk üzerinde bulunamadı:', filePath);
        throw new NotFoundError('Dosya disk üzerinde bulunamadı.');
      }

      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      
      reply.type('application/pdf');
      reply.header('Content-Length', stats.size);
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      
      const stream = fs.createReadStream(filePath);
      
      try {
        await pipeline(stream, reply.raw);
        DebugUtils.log('✅ [SIGORTA_DOWNLOAD] Dosya başarıyla gönderildi');
      } catch (err) {
        console.error('❌ [SIGORTA_DOWNLOAD] Pipeline hatası:', err);
        if (!reply.sent) {
          reply.code(500).send({ error: 'Dosya gönderme hatası' });
        }
      }

    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Defter dosyası indirme
  async downloadDefter(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const authRequest = request as AuthenticatedRequest;
      const defterId = ValidationUtils.validateId((request.params as any).defterId, 'Defter ID');
      
      const defter = await prisma.stajDefteri.findUnique({
        where: { id: defterId },
        select: {
          id: true,
          dosyaYolu: true,
          stajBasvurusu: {
            select: {
              ogrenciId: true,
              danismanMail: true,
              sorumluMail: true
            }
          }
        }
      });

      if (!defter || !defter.dosyaYolu) {
        throw new NotFoundError('Defter dosyası bulunamadı.');
      }

      // Yetki kontrolü
      const userEmail = authRequest.user!.email;
      const isAuthorized = (
        defter.stajBasvurusu.ogrenciId === authRequest.user!.id ||
        userEmail === defter.stajBasvurusu.danismanMail ||
        userEmail === defter.stajBasvurusu.sorumluMail ||
        authRequest.user!.userType === 'KARIYER_MERKEZI' ||
        authRequest.user!.userType === 'YONETICI'
      );

      if (!isAuthorized) {
        throw new ForbiddenError('Bu dosyaya erişim yetkiniz yok.');
      }

      const filePath = path.resolve(process.cwd(), defter.dosyaYolu);
      
      if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Dosya disk üzerinde bulunamadı.');
      }

      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      
      reply.type('application/pdf');
      reply.header('Content-Length', stats.size);
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      
      const stream = fs.createReadStream(filePath);
      
      try {
        await pipeline(stream, reply.raw);
        DebugUtils.log('✅ [DEFTER_DOWNLOAD] Dosya başarıyla gönderildi');
      } catch (err) {
        console.error('❌ [DEFTER_DOWNLOAD] Pipeline hatası:', err);
        if (!reply.sent) {
          reply.code(500).send({ error: 'Dosya gönderme hatası' });
        }
      }

    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }
}

// Export controller instance and methods
const fileController = new FileController();

export const downloadTranskript = fileController.downloadTranskript.bind(fileController);
export const downloadHizmetDokumu = fileController.downloadHizmetDokumu.bind(fileController);
export const downloadSigortaDosyasi = fileController.downloadSigortaDosyasi.bind(fileController);
export const downloadDefter = fileController.downloadDefter.bind(fileController);

export default fileController;
