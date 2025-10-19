import 'dotenv/config';
import util from 'node:util';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import jwt from 'jsonwebtoken';
import { userRoutes } from './routes/userRoutes.js';
import { basvuruRoutes } from './routes/basvuru.routes.js';
import { danismanRoutes } from './routes/danisman.routes.js';
import { ogrenciRoutes } from './routes/ogrenci.routes.js';
import { sirketRoutes } from './routes/sirket.routes.js';
import kariyerRoutes from './routes/kariyer.routes.js';
import cronRoutes from './routes/cron.routes.js';
import { config } from './lib/config.js';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import LoggerService, { LogAction, LogLevel } from './services/logger.service.js';
import { SessionService } from './services/sessionService.js';
import { prisma } from './lib/prisma.js';
import WebSocketNotificationService from './services/websocket.service.js';
import { WebSocketServer } from 'ws';
import { StartupService } from './services/startup.service.js';
import { requireAnyRole } from './lib/auth.js';
import { UserType } from './generated/prisma/index.js';
import { cronService } from './services/cron.service.js';

// Debug environment variables in development
if (config.isDevelopment()) {
  config.debug();
}

// Validate environment variables
config.validate();

// Initialize logger instance
const logger = LoggerService.getInstance();

const app = Fastify({ 
  // Disable Fastify's built-in logger to use our MongoDB logger
  logger: false,
  genReqId: () => `req-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  connectionTimeout: 120000, // 2 minutes for large file uploads
  bodyLimit: config.BODY_LIMIT, // Use configured body limit
  requestTimeout: 120000, // 2 minutes request timeout
  // Relax AJV strict mode to allow non-standard keywords like `example` used in some schemas
  ajv: {
    customOptions: {
      // disable strict mode which treats unknown keywords (e.g. `example`) as errors
      strict: false
    }
  }
});

// Add logging hooks
app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
  const startTime = Date.now();
  (request as any).startTime = startTime;
  
  // Log incoming request
  await logger.log(request, {
    action: LogAction.API_REQUEST,
    level: LogLevel.DEBUG,
    details: {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      contentType: request.headers['content-type']
    }
  });
});

app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
  const responseTime = Date.now() - ((request as any).startTime || Date.now());
  
  // Determine log level based on status code
  let level = LogLevel.INFO;
  if (reply.statusCode >= 400 && reply.statusCode < 500) {
    level = LogLevel.WARN;
  } else if (reply.statusCode >= 500) {
    level = LogLevel.ERROR;
  }
  
  await logger.log(request, {
    action: LogAction.API_RESPONSE,
    level,
    statusCode: reply.statusCode,
    responseTime,
    details: {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime
    }
  });
});

// Schedule session cleanup every hour
setInterval(async () => {
  try {
    await SessionService.cleanupExpiredSessions();
    if (config.isDevelopment()) {
      await logger.log(null, {
        action: LogAction.SYSTEM_CLEANUP,
        level: LogLevel.INFO,
        details: { task: 'session_cleanup', status: 'completed' }
      });
    }
  } catch (error) {
    await logger.logError(null, error as Error);
  }
}, 60 * 60 * 1000); // 1 hour

// CORS ayarlarını önce register et (Helmet'ten önce)
app.register(cors, {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or server-to-server)
    if (!origin) return callback(null, true);
    
    // Allow specific production origins (add your domain here)
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://10.1.33.127:5173',
      'http://localhost',
      'http://127.0.0.1',
      // Add your production domain here
      // 'https://yourdomain.com',
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development, be more permissive
    if (config.isDevelopment()) {
      console.log('⚠️ CORS: Allowing origin for development:', origin);
      return callback(null, true);
    }
    
    // Reject other origins in production
    console.log('❌ CORS: Blocked origin:', origin);
    callback(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
});

// Security headers (CORS'tan sonra)
app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
});

// Multipart form data desteği with security
if (config.isDevelopment()) {
  console.log(`📁 Multipart config - MAX_FILE_SIZE: ${config.MAX_FILE_SIZE} bytes (${(config.MAX_FILE_SIZE / 1024 / 1024).toFixed(2)} MB)`);
}

app.register(multipart, {
  limits: {
    fileSize: config.MAX_FILE_SIZE,
    files: 3, // Allow multiple files
    fieldNameSize: 200, // Field name size artırıldı
    fieldSize: 10240,   // Field size artırıldı (10KB)
    fields: 50          // Field count artırıldı
  },
  attachFieldsToBody: false,
  throwFileSizeLimit: true
});

// Static file serving - uploads klasörü için
app.register(fastifyStatic, {
  root: path.join(__dirname, '../uploads'),
  prefix: '/uploads/',
});

// OpenAPI/Swagger documentation
app.register(swagger, {
  swagger: {
    info: {
      title: 'StajKontrol API',
      description: 'Student Internship Management System API Documentation',
      version: '1.0.0'
    },
    host: `localhost:${config.PORT}`,
    schemes: ['http', 'https'],
    consumes: ['application/json', 'multipart/form-data'],
    produces: ['application/json'],
    securityDefinitions: {
      Bearer: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"'
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Students', description: 'Student management endpoints' },
      { name: 'Advisors', description: 'Advisor management endpoints' },
      { name: 'Career Center', description: 'Career center management endpoints' },
      { name: 'Companies', description: 'Company management endpoints' },
      { name: 'Applications', description: 'Internship application endpoints' },
      { name: 'Admin', description: 'Administrative endpoints' }
    ]
  }
});

// ...duplicate handler removed (implemented earlier before swaggerUi registration)

// Swagger UI with role-based access control
app.register(swaggerUi, {
  routePrefix: '/api/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    displayOperationId: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    displayRequestDuration: true,
    tryItOutEnabled: true,
    filter: true,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch']
  },
  uiHooks: {
    onRequest: async function (request, reply) {
      // Server-side JWT handling for docs access.
      // Behavior:
      // - If ?token=<JWT> is provided, verify JWT and session server-side, then set a short HttpOnly cookie for subsequent asset requests.
      // - If cookie 'stajdocs' exists, use it as the token for authorization checks.
      // - Perform role/session checks server-side and deny access if invalid.
      try {
        const q = request.query as any;

        // simple cookie parser
        const parseCookies = (cookieHeader: string | undefined) => {
          const map: Record<string,string> = {};
          if (!cookieHeader) return map;
          cookieHeader.split(';').forEach((c) => {
            const idx = c.indexOf('=');
            if (idx === -1) return;
            const k = c.slice(0, idx).trim();
            const v = c.slice(idx + 1).trim();
            map[k] = decodeURIComponent(v);
          });
          return map;
        };

        const cookies = parseCookies(request.headers.cookie as string | undefined);

        let tokenFromQuery: string | null = null;
        if (q && typeof q.token === 'string' && q.token.trim().length > 0) {
          tokenFromQuery = q.token.trim();
        }

        let tokenToUse: string | null = tokenFromQuery || cookies['stajdocs'] || null;

        if (tokenFromQuery) {
          // Verify token server-side and session validity
          if (!config.JWT_SECRET) throw new Error('JWT_SECRET not configured');
          let decoded: any;
          try {
            decoded = jwt.verify(tokenFromQuery, config.JWT_SECRET, {
              issuer: 'stajkontrol-app',
              audience: 'stajkontrol-users'
            });
          } catch (err) {
            throw new Error('Geçersiz veya süresi dolmuş token.');
          }

          // Validate sessionId if present
          if (!decoded || !decoded.sessionId) {
            throw new Error('Token sessionId bilgisi içermiyor.');
          }

          const isValidSession = await SessionService.isSessionValid(decoded.sessionId);
          if (!isValidSession) {
            throw new Error('Oturum geçersiz veya süresi dolmuş.');
          }

          // Set cookie for subsequent asset requests. Short-lived and HttpOnly.
          const maxAge = 60 * 60; // 1 hour
          const secureFlag = config.isProduction() ? '; Secure' : '';
          // Note: We scope the cookie to /api/docs so it will be sent for asset requests under that path
          reply.header('Set-Cookie', `stajdocs=${encodeURIComponent(tokenFromQuery)}; Path=/api/docs; HttpOnly; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`);
          tokenToUse = tokenFromQuery;
        }

        // If we have a token (from cookie or query) attach it to headers so existing requireAuth/requireAnyRole works
        if (tokenToUse) {
          (request as any).headers = Object.assign({}, request.headers, {
            authorization: `Bearer ${tokenToUse}`,
          });
        }

        const restrictedAccess = requireAnyRole([
          UserType.YONETICI,
        ]);

        // Run role check (this will call requireAuth and validate session)
        await restrictedAccess(request, reply);
        if (reply.sent) return;
      } catch (error) {
        return reply.code(403).send({
          error: 'API Dokümantasyonuna erişim yetkiniz bulunmamaktadır.',
          message: (error as Error).message || 'Bu sayfaya sadece yetkili personel erişebilir.'
        });
      }
    }
  }
});

// Routes
app.register(userRoutes, { prefix: '/api/users' });
app.register(basvuruRoutes, { prefix: '/api/basvurular' });
app.register(danismanRoutes, { prefix: '/api/danisman' });
app.register(sirketRoutes, { prefix: '/api/sirket' });
app.register(kariyerRoutes, { prefix: '/api/kariyer-merkezi' });

// Role-based routes
app.register(ogrenciRoutes, { prefix: '/api/ogrenci' });

// Admin routes
import { adminRoutes } from './routes/admin.routes.js';
app.register(adminRoutes, { prefix: '/api/admin' });

// Excel routes
import { excelRoutes } from './routes/excel.routes.js';
app.register(excelRoutes, { prefix: '/api/excel' });

// File download routes
import fileRoutes from './routes/file.routes.js';
import MongoDBConnection from './lib/mongodb.js';
app.register(fileRoutes, { prefix: '/api/files' });

// Cron management routes (admin only)
app.register(cronRoutes, { prefix: '/api/cron' });

// Health check endpoint
app.get('/', async (request, reply) => {
  return { status: 'OK', timestamp: new Date().toISOString() };
});



// Server date endpoint - Auth gerektirmez
app.get('/api/server-date', async (request, reply) => {
  return reply.send({ 
    serverDate: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone 
  });
});

// Endpoint to establish a short-lived cookie for Swagger UI assets without exposing the full JWT in URLs.
// The Admin UI should call this endpoint with the existing Authorization header (Bearer <token>).
// This endpoint verifies the token and session server-side and sets the HttpOnly 'stajdocs' cookie scoped to /api/docs.
app.post('/api/docs/session', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const auth = (request.headers.authorization || '') as string;
    if (!auth.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Authorization header missing or invalid' });
    }

    const token = auth.slice('Bearer '.length).trim();
    if (!token) return reply.code(401).send({ error: 'Token missing' });

    if (!config.JWT_SECRET) throw new Error('JWT_SECRET not configured');

    let decoded: any;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET, {
        issuer: 'stajkontrol-app',
        audience: 'stajkontrol-users'
      });
    } catch (err) {
      return reply.code(401).send({ error: 'Geçersiz veya süresi dolmuş token.' });
    }

    if (!decoded || !decoded.sessionId) {
      return reply.code(401).send({ error: 'Token sessionId bilgisi içermiyor.' });
    }

    const isValidSession = await SessionService.isSessionValid(decoded.sessionId);
    if (!isValidSession) {
      return reply.code(401).send({ error: 'Oturum geçersiz veya süresi dolmuş.' });
    }

    const maxAge = 60 * 60; // 1 hour
    const secureFlag = config.isProduction() ? '; Secure' : '';
    reply.header('Set-Cookie', `stajdocs=${encodeURIComponent(token)}; Path=/api/docs; HttpOnly; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`);

    return reply.send({ ok: true });
  } catch (error) {
    await logger.logError(request, error as Error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Global error handler
app.setErrorHandler(async (error, request, reply) => {
  // Log the error using our MongoDB logger
  await logger.logError(request, error, 
    (request as any).user?.email, 
    (request as any).user?.userType, 
    (request as any).user?.id
  );
  
  // Don't expose internal errors in production
  if (config.isProduction()) {
    return reply.status(500).send({ 
      message: 'Bir hata oluştu.',
      traceId: request.id
    });
  }
  
  return reply.status(500).send({ 
    message: error.message || 'Sunucu hatası',
    traceId: request.id
  });
});

const start = async () => {
  try {
    // İlk olarak startup temizliğini yap
    console.log('🧹 [STARTUP] Sistem temizliği başlatılıyor...');
    await StartupService.initialize();
    
    // Database connection optimization
    await prisma.$connect();
    console.log('✅ MariaDB bağlantısı başarılı');
    
    // Connection pool status kontrolü
    const connectionInfo = await prisma.$queryRaw`SELECT CONNECTION_ID() as connection_id`;
    console.log('🔗 Database connection established:', connectionInfo);
    
    // Initialize both MongoDB and MariaDB connections at startup
    console.log('🔌 Veritabanı bağlantıları kuruluyor...');
    
    // Initialize MongoDB first
    const mongoConnection = MongoDBConnection.getInstance();
    await mongoConnection.connect();
    // MongoDB success message is already logged in MongoDBConnection.connect()
    
    // Test Prisma connection (MariaDB)
    await prisma.$connect();
    console.log('✅ MariaDB bağlantısı başarılı');
    
    // Initialize logger service AFTER MongoDB is connected
    await logger.initialize();
    // Logger initialization success message is already logged in LoggerService.initialize()

    // Start cron jobs for reminders
    cronService.startAllJobs();
    console.log('⏰ Cron service başlatıldı - Hatırlatma job\'ları aktif');

    // Log system startup
    await logger.log(null, {
      action: LogAction.SYSTEM_STARTUP,
      level: LogLevel.INFO,
      details: {
        port: config.PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        mongodb: 'connected',
        mariadb: 'connected'
      }
    });

    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    
    // Start WebSocket server on port 3001 for notifications
    const wsServer = new WebSocketServer({ port: config.PORT + 1 });
    const wsService = WebSocketNotificationService.getInstance();
    
    wsServer.on('connection', (ws: any) => {
      wsService.addClient(ws);
      
      // Handle incoming messages from client
      ws.on('message', async (message: string) => {
        try {
          console.log('📡 [WS] Received message:', message);
          const data = JSON.parse(message);
          if (data.type === 'cancel_upload' && data.dosyaId) {
            console.log(`📡 [WS] Processing cancel_upload for dosyaId: ${data.dosyaId}`);
            await wsService.cancelUpload(data.dosyaId);
            console.log(`📡 [WS] Upload cancelled for dosyaId: ${data.dosyaId}`);
          } else {
            console.log('📡 [WS] Unknown message type or missing dosyaId:', data);
          }
        } catch (error) {
          console.error('📡 [WS] Failed to parse message:', error);
        }
      });
    });
    
    if (config.isDevelopment()) {
      console.log(`🚀 Backend server is running on http://localhost:${config.PORT}`);
      console.log(`📡 WebSocket server is running on ws://localhost:${config.PORT + 1}`);
      console.log(`📊 MongoDB logging enabled`);
      console.log(`🗄️  MariaDB connection active`);
    }
    
    // Optionally start the background Excel worker inside this process
    // Set environment variable START_WORKER=true to enable. This allows the
    // server process to run the worker after DB and logger are initialized.
    if (process.env.START_WORKER === 'true') {
      try {
        console.log('🔧 START_WORKER=true detected — starting excel worker inside backend process');
        // Dynamic import to avoid circular imports at module load time
        await import('./worker/excel.worker.js');
        console.log('✅ Excel worker started inside backend process');
      } catch (workerErr) {
        console.error('❌ Failed to start excel worker inside backend process:', workerErr);
      }
    }
    
  } catch (err) {
    // Normalize any thrown value to an Error to avoid crashes when code throws plain objects
    let error: Error;
    if (err instanceof Error) {
      error = err;
    } else if (typeof err === 'string') {
      error = new Error(err);
    } else {
      try {
        error = new Error(JSON.stringify(err));
      } catch {
        // Fallback if circular or non-serializable
        error = new Error(String(err));
      }
    }

    console.error('❌ Server başlatma hatası:', error.message);

    // Defensive checks before using message
    const msg = error.message || '';
    if (msg.includes('MongoDB')) {
      console.error('💀 MongoDB bağlantısı kurulamadı - Uygulama kapatılıyor');
    }

    if (msg.includes('MariaDB') || msg.includes('Prisma')) {
      console.error('💀 MariaDB bağlantısı kurulamadı - Uygulama kapatılıyor');
    }

    // Try to log error if possible
    try {
      await logger.logError(null, error);
    } catch (logError) {
      console.error('❌ Error logging failed:', logError);
    }

    process.exit(1);
  }
};

// Graceful shutdown - close both connections
const gracefulShutdown = async (signal: string) => {
  console.log(`🔄 ${signal} alındı, graceful shutdown başlatılıyor...`);
  
  try {
    // Stop cron jobs
    cronService.stopAllJobs();
    console.log('⏰ Cron job\'ları durduruldu');
    
    // Startup service cleanup'ını çağır
    await StartupService.cleanup();
    
    // MongoDB connection'ı kapat
    const mongoConnection = MongoDBConnection.getInstance();
    await mongoConnection.disconnect();
    console.log('✅ MongoDB bağlantısı kapatıldı');
    
    // MariaDB connection pool'u kapat
    await prisma.$disconnect();
    console.log('✅ MariaDB connection pool kapatıldı');
    
    // Fastify server'ı kapat
    await app.close();
    console.log('✅ Server kapatıldı');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Graceful shutdown hatası:', err);
    process.exit(1);
  }
};

// Signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();
