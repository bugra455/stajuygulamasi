import { PrismaClient } from '../generated/prisma/index.js';
import { config } from './config.js';

// Global singleton pattern for Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ??
  new PrismaClient({
    log: config.PRISMA_LOG_QUERIES 
      ? ['query', 'error', 'warn'] 
      : process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    
    // Query optimizasyonu
    transactionOptions: {
      timeout: 30000, // 30 saniye timeout
      maxWait: 5000,  // Max 5 saniye bekle
      isolationLevel: 'ReadCommitted',
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Graceful shutdown handler
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});