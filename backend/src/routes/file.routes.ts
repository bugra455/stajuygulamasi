import { FastifyInstance } from 'fastify';
import { verifyToken, AuthenticatedRequest } from '../lib/auth.js';
import {
  downloadTranskript,
  downloadHizmetDokumu,
  downloadSigortaDosyasi,
  downloadDefter
} from '../controllers/file.controller.js';

export default async function fileRoutes(fastify: FastifyInstance) {
  // Authentication middleware for all file routes
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      const payload = verifyToken(request) as { id: number; email: string; userType: string; sessionId: string };
      (request as AuthenticatedRequest).user = { 
        id: payload.id, 
        email: payload.email, 
        userType: payload.userType,
        sessionId: payload.sessionId || ''
      };
    } catch (error: unknown) {
      const err = error as Error;
      return reply.status(401).send({ message: err.message });
    }
  });

  // Transkript dosyası indirme
  fastify.get('/basvuru/:basvuruId/transkript', downloadTranskript);

  // Hizmet dökümü indirme
  fastify.get('/basvuru/:basvuruId/hizmet-dokumu', downloadHizmetDokumu);

  // Sigorta dosyası indirme
  fastify.get('/basvuru/:basvuruId/sigorta-dosyasi', downloadSigortaDosyasi);

  // Defter dosyası indirme
  fastify.get('/defter/:defterId/dosya', downloadDefter);
}
