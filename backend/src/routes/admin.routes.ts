import { FastifyInstance } from 'fastify';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser,
  getAllStajBasvurulari,
  updateStajBasvurusu,
  deleteStajBasvurusu,
  getAllDefterler,
  updateDefter,
  getStatistics,
  
} from '../controllers/admin.controller.js';
import { requireAnyRole } from '../lib/auth.js';
import { UserType } from '../generated/prisma/index.js';

export const adminRoutes = async (app: FastifyInstance) => {
  // Add admin authentication middleware for all admin routes
  app.addHook('preHandler', requireAnyRole([UserType.YONETICI]));

  // Users management
  app.get('/users', getAllUsers);
  app.get('/users/:id', getUserById);
  app.post('/users', createUser);
  app.put('/users/:id', updateUser);
  app.delete('/users/:id', deleteUser);

  // Staj Basvurulari management
  app.get('/staj-basvurulari', getAllStajBasvurulari);
  app.put('/staj-basvurulari/:id', updateStajBasvurusu);
  app.delete('/staj-basvurulari/:id', deleteStajBasvurusu);

  // Defterler management
  app.get('/defterler', getAllDefterler);
  app.put('/defterler/:id', updateDefter);

  // Statistics
  app.get('/statistics', getStatistics);
};

export default adminRoutes;
