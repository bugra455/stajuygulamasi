import { FastifyRequest, FastifyReply } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { AuthenticatedRequest } from '../lib/auth.js';
import { ValidationUtils } from '../utils/validation.utils.js';
import { ErrorHandler, BadRequestError, NotFoundError, ForbiddenError } from '../utils/error.utils.js';
import * as danismanService from '../services/danisman.service.js';
import { UserType } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';

export class DanismanController {

  // Danışmanın öğrencilerini listele
  async getOgrenciler(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const ogrenciler = await danismanService.getDanismanOgrencileri(request.user!.id);
      reply.send(ErrorHandler.createSuccessResponse({ ogrenciler }));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Danışmanın başvurularını listele
  async getBasvurular(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const basvurular = await danismanService.getDanismanBasvurulari(request.user!.id);
      reply.send(ErrorHandler.createSuccessResponse({ basvurular }));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Bölüm listesini getir
  async getBolumler(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      // Öğrencilerden benzersiz bölümleri çek
      const bolumler = await prisma.user.findMany({
        where: {
          userType: UserType.OGRENCI,
          faculty: {
            not: null
          }
        },
        select: {
          faculty: true
        },
        distinct: ['faculty']
      });

      const bolumListesi = bolumler
        .map((b: { faculty: string | null }) => b.faculty)
        .filter((b: string | null) => b !== null)
        .sort();

      reply.send(ErrorHandler.createSuccessResponse({ bolumler: bolumListesi }));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Basit arama fonksiyonu - başvurular için
  async searchBasvurular(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const { 
        search = '', 
        page = '1', 
        limit = '200', 
        onayDurumu 
      } = request.query as any;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      // Service fonksiyonunu kullan
      const { searchDanismanBasvurular } = await import('../services/danisman.service.js');
      const result = await searchDanismanBasvurular(
        request.user!.email,
        search.trim() || undefined,
        onayDurumu || undefined,
        pageNum,
        limitNum
      );

      const totalPages = Math.ceil(result.totalCount / limitNum);

      reply.send(ErrorHandler.createSuccessResponse({
        basvurular: result.data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.totalCount,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Danışmanın defterlerini ara ve paginate et
  async searchDefterler(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const { 
        search = '', 
        page = '1', 
        limit = '200', 
        defterDurumu 
      } = request.query as any;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      // Service fonksiyonunu kullan
      const { searchDanismanDefterler } = await import('../services/danisman.service.js');
      const result = await searchDanismanDefterler(
        request.user!.email,
        search.trim() || undefined,
        defterDurumu || undefined,
        pageNum,
        limitNum
      );

      const totalPages = Math.ceil(result.totalCount / limitNum);

      reply.send(ErrorHandler.createSuccessResponse({
        defterler: result.data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.totalCount,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Danışmanın öğrencilerini ara ve paginate et
  async searchOgrenciler(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const { 
        search = '', 
        page = '1', 
        limit = '200' 
      } = request.query as any;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      // Service fonksiyonunu kullan
      const { searchDanismanOgrenciler } = await import('../services/danisman.service.js');
      const result = await searchDanismanOgrenciler(
        request.user!.id,
        search.trim() || undefined,
        pageNum,
        limitNum
      );

      const totalPages = Math.ceil(result.totalCount / limitNum);

      reply.send(ErrorHandler.createSuccessResponse({
        ogrenciler: result.data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.totalCount,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Belirli bir başvuruyu getir
  async getBasvuru(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const basvuruId = ValidationUtils.validateId((request.params as any).id, 'Başvuru ID');
      const basvuru = await danismanService.getBasvuruDetayi(basvuruId, request.user!.id);
      
      reply.send(ErrorHandler.createSuccessResponse(basvuru));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Başvuruyu onaylama
  async onaylaBasvuru(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const basvuruId = ValidationUtils.validateId((request.params as any).id, 'Başvuru ID');
      const { aciklama } = request.body as any;

      const updatedBasvuru = await danismanService.onaylaBasvuru(
        basvuruId, 
        request.user!.id, 
        request.user!.email,
        aciklama
      );

      reply.send(ErrorHandler.createSuccessResponse(updatedBasvuru, 'Başvuru başarıyla onaylandı.'));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Başvuruyu reddetme
  async reddetBasvuru(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const basvuruId = ValidationUtils.validateId((request.params as any).id, 'Başvuru ID');
      const { redSebebi } = request.body as any;

      ValidationUtils.validateRequired(redSebebi, 'Red sebebi');

      const updatedBasvuru = await danismanService.reddetBasvuru(
        basvuruId, 
        request.user!.id, 
        request.user!.email,
        redSebebi
      );

      reply.send(ErrorHandler.createSuccessResponse(updatedBasvuru, 'Başvuru başarıyla reddedildi.'));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Danışmanın defterlerini listele
  async getDefterler(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const defterler = await danismanService.getDanismanDefterler(request.user!.email);
      reply.send(ErrorHandler.createSuccessResponse({ defterler }));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Belirli bir defteri getir
  async getDefter(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const defterId = ValidationUtils.validateId((request.params as any).id, 'Defter ID');
      const defter = await danismanService.getDefterDetayi(defterId, request.user!.email);
      
      reply.send(ErrorHandler.createSuccessResponse(defter));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Defter durumu güncelleme
  async updateDefterDurumu(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const defterId = ValidationUtils.validateId((request.params as any).id, 'Defter ID');
      const { durum, sebep } = request.body as any;

      ValidationUtils.validateRequired(durum, 'Defter durumu');

      const updatedDefter = await danismanService.updateDefterDurumu(
        defterId, 
        request.user!.email, 
        durum,
        sebep
      );

      reply.send(ErrorHandler.createSuccessResponse(updatedDefter, 'Defter durumu başarıyla güncellendi.'));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Defter PDF'ini indirme
  async downloadDefterPdf(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const defterId = ValidationUtils.validateId((request.params as any).id, 'Defter ID');
      
      // Önce danışmanın bu deftere erişimi olduğunu kontrol et
      const defter = await danismanService.getDefterDetayi(defterId, request.user!.email);
      
      if (!defter.dosyaYolu) {
        throw new NotFoundError('Bu defter için henüz PDF yüklenmemiş.');
      }

      // Defter servisinden PDF download fonksiyonunu kullan
      const defterService = await import('../services/defter.service.js');
      const { buffer, filename } = await defterService.downloadDefterPdfByPath(defter.dosyaYolu, defter.originalFileName || undefined);
      
      reply
        .type('application/pdf')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(buffer);
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Başvuru transkriptini indirme
  async downloadBasvuruTranscript(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const basvuruId = ValidationUtils.validateId((request.params as any).id, 'Başvuru ID');
      const basvuru = await danismanService.getBasvuruDetayi(basvuruId, request.user!.id);

      if (!basvuru.transkriptDosyasi) {
        throw new NotFoundError('Bu başvuru için transkript yüklenmemiş.');
      }

      const filePath = path.resolve(basvuru.transkriptDosyasi);

      try {
        await fs.promises.access(filePath);
      } catch {
        console.error(`File not found at path: ${filePath}`);
        throw new NotFoundError('Transkript dosyası sunucuda bulunamadı.');
      }
      
      const fileName = path.basename(filePath);
      const buffer = await fs.promises.readFile(filePath);

      reply
        .type('application/octet-stream')
        .header('Content-Disposition', `attachment; filename="${fileName}"`)
        .send(buffer);

    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Danışman için öğrenci detay (kişisel + CAP bilgileri)
  async getOgrenciDetay(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const ogrenciId = ValidationUtils.validateId((request.params as any).ogrenciId || (request.params as any).id, 'Öğrenci ID');
      const ogrenciDetay = await danismanService.getDanismanOgrenciDetay(ogrenciId, request.user!.email);
      reply.send(ErrorHandler.createSuccessResponse(ogrenciDetay));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Başvuru sigorta dosyasını indirme
  async downloadSigortaDosyasi(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const basvuruId = ValidationUtils.validateId((request.params as any).id, 'Başvuru ID');
      const basvuru = await danismanService.getBasvuruDetayi(basvuruId, request.user!.id);

      if (!basvuru.sigortaDosyasi) {
        throw new NotFoundError('Bu başvuru için sigorta dosyası yüklenmemiş.');
      }

      const filePath = path.resolve(basvuru.sigortaDosyasi);

      try {
        await fs.promises.access(filePath);
      } catch {
        console.error(`File not found at path: ${filePath}`);
        throw new NotFoundError('Sigorta dosyası sunucuda bulunamadı.');
      }
      const fileName = path.basename(filePath);
      const buffer = await fs.promises.readFile(filePath);

      reply
        .type('application/octet-stream')
        .header('Content-Disposition', `attachment; filename="${fileName}"`)
        .send(buffer);
      

    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Öğrencinin tüm başvurularını getir (danışman kısıtlaması ile)
  async getOgrenciTumBasvurulari(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const { ogrenciId } = request.params as { ogrenciId: string };
      const ogrenciIdNum = ValidationUtils.validateId(parseInt(ogrenciId), 'Öğrenci ID');
      
      const basvurular = await danismanService.getOgrenciTumBasvurulari(ogrenciIdNum, request.user!.id);
      reply.send(ErrorHandler.createSuccessResponse({ basvurular }));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Öğrencinin tüm başvurularını getir (modal için - kısıtlama olmadan)
  async getOgrenciTumBasvurulariModal(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const { ogrenciId } = request.params as { ogrenciId: string };
      const ogrenciIdNum = ValidationUtils.validateId(parseInt(ogrenciId), 'Öğrenci ID');
      
      const basvurular = await danismanService.getOgrenciTumBasvurulariModal(ogrenciIdNum);
      reply.send(ErrorHandler.createSuccessResponse({ basvurular }));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Defter onayı (yeni defter onay sistemi için)
  async onaylaDefteri(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      // Kullanıcının danışman olduğunu kontrol et
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const defterId = ValidationUtils.validateId((request.params as any).id, 'Defter ID');
      const { onayDurumu, aciklama } = request.body as { onayDurumu: 'ONAYLANDI' | 'REDDEDILDI'; aciklama?: string };

      ValidationUtils.validateRequired(onayDurumu, 'Onay durumu');

      const result = await danismanService.danismanDefterOnay(
        defterId,
        request.user!.email,
        onayDurumu,
        aciklama
      );

      reply.send(ErrorHandler.createSuccessResponse(result, result.message));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // MUAFIYET BAŞVURU YÖNETİMİ

  // Danışmanın muafiyet başvurularını listele
  async getMuafiyetBasvurular(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const muafiyetBasvurular = await danismanService.getDanismanMuafiyetBasvurulari(request.user!.email);
      reply.send(ErrorHandler.createSuccessResponse({ muafiyetBasvurular }));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Muafiyet başvurusunu onayla
  async onaylaMuafiyetBasvuru(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const muafiyetId = ValidationUtils.validateId((request.params as any).id, 'Muafiyet ID');
      const { aciklama } = request.body as any;

      const updatedMuafiyet = await danismanService.onaylaMuafiyetBasvuru(
        muafiyetId, 
        request.user!.email,
        aciklama
      );

      reply.send(ErrorHandler.createSuccessResponse(
        updatedMuafiyet, 
        'Muafiyet başvurusu başarıyla onaylandı.'
      ));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Muafiyet başvurusunu reddet
  async reddetMuafiyetBasvuru(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const muafiyetId = ValidationUtils.validateId((request.params as any).id, 'Muafiyet ID');
      const { redSebebi } = request.body as any;

      if (!redSebebi?.trim()) {
        throw new BadRequestError('Red sebebi belirtilmelidir.');
      }

      const updatedMuafiyet = await danismanService.reddetMuafiyetBasvuru(
        muafiyetId, 
        request.user!.email,
        redSebebi.trim()
      );

      reply.send(ErrorHandler.createSuccessResponse(
        updatedMuafiyet, 
        'Muafiyet başvurusu başarıyla reddedildi.'
      ));
    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }

  // Muafiyet SGK 4A dosyasını indirme
  async downloadMuafiyetSgk4a(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    try {
      if (request.user!.userType !== UserType.DANISMAN) {
        throw new ForbiddenError('Bu işlem için danışman yetkisi gereklidir.');
      }

      const muafiyetId = ValidationUtils.validateId((request.params as any).id, 'Muafiyet ID');
      const muafiyet = await danismanService.getMuafiyetDetayi(muafiyetId, request.user!.email);

      if (!muafiyet.sgk4a) {
        throw new NotFoundError('Bu muafiyet başvurusu için SGK 4A dosyası yüklenmemiş.');
      }

      // Build file path similar to other download endpoints
      let filePath: string;
      if (path.isAbsolute(muafiyet.sgk4a)) {
        filePath = muafiyet.sgk4a;
      } else {
        filePath = path.resolve(process.cwd(), 'uploads', muafiyet.sgk4a);
      }

      if (!fs.existsSync(filePath)) {
        console.error(`File not found at path: ${filePath}`);
        throw new NotFoundError('SGK 4A dosyası sunucuda bulunamadı.');
      }

      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);

      // SGK 4A is PDF
      reply.type('application/pdf');
      reply.header('Content-Length', stats.size);
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      reply.header('Cache-Control', 'no-cache');

      const stream = fs.createReadStream(filePath);
      try {
        await pipeline(stream, reply.raw);
      } catch (err) {
        console.error('❌ [MUAFIYET_SGK_DOWNLOAD] Pipeline hatası:', err);
        if (!reply.sent) reply.code(500).send({ error: 'Dosya gönderme hatası' });
      }

    } catch (error) {
      ErrorHandler.handleError(error, reply);
    }
  }
}

// Export controller instance and individual methods
const danismanController = new DanismanController();

export const getOgrenciler = danismanController.getOgrenciler.bind(danismanController);
export const getBolumler = danismanController.getBolumler.bind(danismanController);
export const searchOgrenciler = danismanController.searchOgrenciler.bind(danismanController);
export const getBasvurular = danismanController.getBasvurular.bind(danismanController);
export const searchBasvurular = danismanController.searchBasvurular.bind(danismanController);
export const getBasvuru = danismanController.getBasvuru.bind(danismanController);
export const onaylaBasvuru = danismanController.onaylaBasvuru.bind(danismanController);
export const reddetBasvuru = danismanController.reddetBasvuru.bind(danismanController);
export const getDefterler = danismanController.getDefterler.bind(danismanController);
export const searchDefterler = danismanController.searchDefterler.bind(danismanController);
export const getDefter = danismanController.getDefter.bind(danismanController);
export const updateDefterDurumu = danismanController.updateDefterDurumu.bind(danismanController);
export const onaylaDefteri = danismanController.onaylaDefteri.bind(danismanController);
export const downloadDefterPdf = danismanController.downloadDefterPdf.bind(danismanController);
export const downloadBasvuruTranscript = danismanController.downloadBasvuruTranscript.bind(danismanController);
export const downloadSigortaDosyasi = danismanController.downloadSigortaDosyasi.bind(danismanController);
export const getOgrenciTumBasvurulari = danismanController.getOgrenciTumBasvurulari.bind(danismanController);
export const getOgrenciTumBasvurulariModal = danismanController.getOgrenciTumBasvurulariModal.bind(danismanController);
export const getOgrenciDetay = danismanController.getOgrenciDetay.bind(danismanController);
export const getMuafiyetBasvurular = danismanController.getMuafiyetBasvurular.bind(danismanController);
export const onaylaMuafiyetBasvuru = danismanController.onaylaMuafiyetBasvuru.bind(danismanController);
export const reddetMuafiyetBasvuru = danismanController.reddetMuafiyetBasvuru.bind(danismanController);
export const downloadMuafiyetSgk4a = danismanController.downloadMuafiyetSgk4a.bind(danismanController);

export default danismanController;
