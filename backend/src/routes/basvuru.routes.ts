import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAnyRole, AuthenticatedRequest } from '../lib/auth.js';
import { UserType } from '../generated/prisma/index.js';
import * as basvuruController from '../controllers/basvuru.controller.js';
import LoggerService, { LogAction } from '../services/logger.service.js';

export async function basvuruRoutes(app: FastifyInstance) {
  // SADECE ÖĞRENCİ ROUTE'LARI - Student endpoints only
  app.post('/', { preHandler: requireAnyRole([UserType.OGRENCI]) }, basvuruController.createBasvuru as never);
  app.get('/', { preHandler: requireAnyRole([UserType.OGRENCI]) }, basvuruController.getBasvurular as never);
  app.get('/:id', { preHandler: requireAnyRole([UserType.OGRENCI]) }, basvuruController.getBasvuruById as never);
  app.post('/:id/iptal', { preHandler: requireAnyRole([UserType.OGRENCI]) }, basvuruController.cancelBasvuru as never);
  app.put('/:id/tarih', { preHandler: requireAnyRole([UserType.OGRENCI]) }, basvuruController.updateBasvuruTarih as never);
}