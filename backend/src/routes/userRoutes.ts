import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { comparePassword, generateToken, hashPassword, AuthenticatedRequest, requireAnyRole, verifyToken } from '../lib/auth.js';
import { loginSchema, registerSchema } from '../schemas/userSchemas.js';
import { UserType } from '../generated/prisma/index.js';
import LoggerService, { LogAction } from '../services/logger.service.js';
import { SessionService } from '../services/sessionService.js';

export async function userRoutes(app: FastifyInstance) {
  const logger = LoggerService.getInstance();

  app.post('/login', {
    schema: {
      tags: ['Authentication'],
      summary: 'User login',
      description: 'Authenticate user and generate JWT token',
      body: {
        type: 'object',
        required: ['kullaniciAdi', 'password'],
        properties: {
          kullaniciAdi: { 
            type: 'string', 
            description: 'Username or email address'
          },
          password: { 
            type: 'string', 
            description: 'User password'
          }
        }
      },
      response: {
        200: {
          description: 'Successful login',
          type: 'object',
          properties: {
            token: { 
              type: 'string', 
              description: 'JWT authentication token'
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                email: { type: 'string' },
                userType: {
                  type: 'string',
                  enum: ['OGRENCI', 'DANISMAN', 'KARIYER_MERKEZI', 'YONETICI']
                },
                girisYapti: {
                  type: 'number',
                  nullable: true
                }
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            message: { type: 'string' },
            errors: { type: 'object' }
          }
        },
        401: {
          description: 'Authentication failed',
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    // Validate input
    const validationResult = loginSchema.safeParse(request.body);
    if (!validationResult.success) {
      return reply.status(400).send({
        message: 'Girdi verileri geçersiz.',
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { kullaniciAdi, password } = validationResult.data;

    try {
      const user = await prisma.user.findUnique({ where: { kullaniciAdi } });
      if (!user) {
        // Log failed login attempt
        await logger.log(request, {
          action: LogAction.LOGIN_FAILED,
          userEmail: kullaniciAdi,
          details: { reason: 'User not found', kullaniciAdi },
          statusCode: 401
        });
        return reply.status(401).send({ message: 'Kullanıcı adı veya parola hatalı.' });
      }

      const isPasswordCorrect = await comparePassword(password, user.password ?? '');
      if (!isPasswordCorrect) {
        // Log failed login attempt
        await logger.logAuth(request, LogAction.LOGIN_FAILED, user.email ?? '', String(user.userType ?? ''), user.id, false);
        return reply.status(401).send({ message: 'Kullanıcı adı veya parola hatalı.' });
      }      // Generate session ID and create session
      const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      
      // Invalidate other sessions for this user (single session per device)
      await SessionService.invalidateOtherSessions(user.id, sessionId);
      
      // Create new session
      await SessionService.createSession(user.id, sessionId, request);
      
      // Generate token with session ID
      const token = generateToken({ 
        id: user.id, 
        email: user.email ?? '', 
        userType: user.userType ?? '', 
        sessionId 
      });
      
      // Exclude password from user data
      const { password: _, ...userData } = user;

      // Log successful login
  await logger.logAuth(request, LogAction.LOGIN, user.email ?? '', String(user.userType ?? ''), user.id, true);

      return reply.send({ token, user: userData });
    } catch (error: unknown) {
      console.error('Login error:', error);
      const errorObj = error as Error & { statusCode?: number };
      await logger.logError(request, errorObj);
      return reply.status(500).send({ message: 'Giriş işlemi sırasında bir hata oluştu.' });
    }
  });

  app.post('/register', {
    schema: {
      tags: ['Authentication'],
      summary: 'User registration',
      description: 'Register a new user in the system',
      body: {
        type: 'object',
        required: ['tcKimlik', 'kullaniciAdi', 'name', 'email', 'password', 'userType'],
        properties: {
          tcKimlik: { 
            type: 'string', 
            description: 'Turkish ID number',
            example: '12345678901'
          },
          kullaniciAdi: { 
            type: 'string', 
            description: 'Username',
            example: 'john_doe'
          },
          name: { 
            type: 'string', 
            description: 'Full name',
            example: 'John Doe'
          },
          email: { 
            type: 'string', 
            format: 'email',
            description: 'Email address',
            example: 'john@example.com'
          },
          password: { 
            type: 'string', 
            description: 'Password',
            example: 'password123'
          },
          userType: { 
            type: 'string', 
            enum: ['OGRENCI', 'DANISMAN', 'KARIYER_MERKEZI', 'YONETICI'],
            description: 'User role type',
            example: 'OGRENCI'
          },
          studentId: { 
            type: 'string', 
            description: 'Student ID (required for students)',
            example: '2021001001'
          },
          faculty: { 
            type: 'string', 
            description: 'Faculty (required for students)',
            example: 'Engineering'
          },
          class: { 
            type: 'string', 
            description: 'Class/Grade (required for students)',
            example: '3'
          }
        }
      },
      response: {
        201: {
          description: 'User successfully registered',
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john@example.com' },
            userType: { 
              type: 'string', 
              enum: ['OGRENCI', 'DANISMAN', 'KARIYER_MERKEZI', 'YONETICI'],
              example: 'OGRENCI'
            }
          }
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            message: { type: 'string' },
            errors: { type: 'object' }
          }
        },
        409: {
          description: 'User already exists',
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Bu e-posta, TC kimlik numarası veya kullanıcı adı zaten kayıtlı.' }
          }
        }
      }
    }
  }, async (request, reply) => {
    // Validate input
    const validationResult = registerSchema.safeParse(request.body);
    if (!validationResult.success) {
      return reply.status(400).send({
        message: 'Girdi verileri geçersiz.',
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { tcKimlik, kullaniciAdi, name, email, password, userType, studentId, faculty, class: userClass } = validationResult.data;

    try {
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { tcKimlik }, { kullaniciAdi }] },
      });

      if (existingUser) {
        return reply.status(409).send({ message: 'Bu e-posta, TC kimlik numarası veya kullanıcı adı zaten kayıtlı.' });
      }

      const hashedPassword = await hashPassword(password);

      const newUser = await prisma.user.create({
        data: {
          tcKimlik,
          kullaniciAdi,
          name,
          email,
          password: hashedPassword,
          userType: userType as UserType,
          studentId,
          faculty,
          class: userClass,
        },
      });
      
      const { password: _, ...userData } = newUser;
      return reply.status(201).send(userData);
    } catch (error) {
      console.error('Register error:', error);
      return reply.status(500).send({ message: 'Kayıt işlemi sırasında bir hata oluştu.' });
    }
  });

  // Logout endpoint
  app.post('/logout', {
    preHandler: requireAnyRole([UserType.OGRENCI, UserType.DANISMAN, UserType.YONETICI])
  }, async (request, reply) => {
    try {
      const authRequest = request as AuthenticatedRequest;
      const { user } = authRequest;

      // Invalidate the current session
      if (user.sessionId) {
        await SessionService.invalidateSession(user.sessionId);
      }

      // Log logout
  await logger.logAuth(request, LogAction.LOGOUT, user.email ?? '', String(user.userType ?? ''), user.id, true);

      return reply.send({ message: 'Başarıyla çıkış yapıldı.' });
    } catch (error: unknown) {
      console.error('Logout error:', error);
      const errorObj = error as Error & { statusCode?: number };
      await logger.logError(request, errorObj);
      return reply.status(500).send({ message: 'Çıkış işlemi sırasında bir hata oluştu.' });
    }
  });

  // Profile endpoint for token validation
  app.get('/profile', {
    preHandler: requireAnyRole([UserType.OGRENCI, UserType.DANISMAN, UserType.YONETICI, UserType.KARIYER_MERKEZI]),
    schema: {
      tags: ['Authentication'],
      summary: 'Get user profile',
      description: 'Get authenticated user profile information',
      response: {
        200: {
          description: 'Successful response',
          type: 'object',
          properties: {
            id: { type: 'number' },
            email: { type: 'string' },
            userType: {
              type: 'string',
              enum: ['OGRENCI', 'DANISMAN', 'KARIYER_MERKEZI', 'YONETICI']
            },
            sessionId: { type: 'string' },
            girisYapti: {
              type: 'number',
              nullable: true
            }
          }
        },
        500: {
          description: 'Server error',
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const authRequest = request as AuthenticatedRequest;
      const { user } = authRequest;

      // Return basic user info without sensitive data
      // Get full user data
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id }
      });
      
      return reply.send({
        id: user.id,
        email: user.email,
        userType: user.userType,
        sessionId: user.sessionId,
        girisYapti: fullUser?.girisYapti
      });
    } catch (error: unknown) {
      console.error('Profile error:', error);
      const errorObj = error as Error & { statusCode?: number };
      await logger.logError(request, errorObj);
      return reply.status(500).send({ message: 'Profil bilgileri alınırken hata oluştu.' });
    }
  });

  // Danışman bilgisini getiren endpoint (sadece öğrenciler için)
  app.get('/danisman-info', {
    preHandler: requireAnyRole([UserType.OGRENCI])
  }, async (request, reply) => {
    try {
      const authRequest = request as AuthenticatedRequest;
      const { user } = authRequest;

      const ogrenci = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          danisman: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!ogrenci) {
        return reply.status(404).send({ message: 'Öğrenci bulunamadı.' });
      }

      if (!ogrenci.danisman) {
        return reply.status(404).send({ message: 'Danışman bilgisi bulunamadı.' });
      }

      return reply.send({ 
        danisman: ogrenci.danisman
      });
    } catch (error: unknown) {
      console.error('Danisman info error:', error);
      const errorObj = error as Error & { statusCode?: number };
      await logger.logError(request, errorObj);
      return reply.status(500).send({ message: 'Danışman bilgileri alınırken hata oluştu.' });
    }
  });

  // Öğrencinin hem normal hem CAP kayıtlarını getiren endpoint
  app.get('/student-records', {
    preHandler: requireAnyRole([UserType.OGRENCI])
  }, async (request, reply) => {
    try {
      const authRequest = request as AuthenticatedRequest;
      const { user: authUser } = authRequest;

      // Öğrencinin tam bilgilerini al
      const user = await prisma.user.findUnique({
        where: { id: authUser.id },
        include: {
          danisman: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!user) {
        return reply.status(404).send({ message: 'Kullanıcı bulunamadı.' });
      }

      // Öğrencinin CAP kayıtlarını danışman bilgileriyle birlikte getir
      const capRecords = await prisma.capUser.findMany({
        where: { ogrenciId: user.id },
        select: {
          id: true,
          capFakulte: true,
          capBolum: true,
          capDepartman: true,
          capSinif: true,
          capDanisman: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Normal kayıt bilgisi
      const normalRecord = {
        id: 1, // Ana bölüm için ID 1
        faculty: user.faculty || '',
        department: user.department || '',
        class: user.class || '',
        type: 'NORMAL' as const,
        displayText: `${user.department || ''} - ${user.class || ''} (Ana Bölüm)`,
        advisor: user.danisman ? {
          id: user.danisman.id,
          name: user.danisman.name,
          email: user.danisman.email
        } : null
      };

      // CAP kayıtlarını frontend için uygun formata çevir
      const formattedCapRecords = capRecords.map((cap, index) => ({
        id: cap.id,
        faculty: cap.capFakulte,
        department: cap.capDepartman,
        class: cap.capSinif || `${cap.capBolum} - ${cap.capDepartman}`,
        type: 'CAP' as const,
        displayText: `${cap.capFakulte} - ${cap.capBolum} (CAP)`,
        advisor: cap.capDanisman ? {
          id: cap.capDanisman.id,
          name: cap.capDanisman.name,
          email: cap.capDanisman.email
        } : null
      }));

      return reply.send({ 
        normalRecord,
        capRecords: formattedCapRecords,
        userInfo: {
          tcKimlik: user.tcKimlik,
          studentId: user.studentId,
          name: user.name,
          email: user.email
        }
      });
    } catch (error: unknown) {
      const errorObj = error as Error & { statusCode?: number };
      await logger.logError(request, errorObj);
      return reply.status(500).send({ message: 'Öğrenci kayıtları alınırken hata oluştu.' });
    }
  });

  // Change password endpoint for advisors
  app.post('/change-password', {
    preHandler: requireAnyRole([UserType.DANISMAN]),
    schema: {
      tags: ['Authentication'],
      summary: 'Change password for advisors',
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 6 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        401: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const user = (request as AuthenticatedRequest).user;
    const { currentPassword, newPassword } = request.body as { currentPassword: string; newPassword: string };

    try {
      // Get current user with password
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id }
      });

      if (!currentUser) {
        return reply.status(404).send({ message: 'Kullanıcı bulunamadı.' });
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, currentUser.password ?? '');
      if (!isCurrentPasswordValid) {
        return reply.status(401).send({ message: 'Mevcut parola yanlış.' });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password and set girisYapti to 1
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedNewPassword,
          girisYapti: 1
        }
      });

      // Log password change
      await logger.logAuth(request, LogAction.PASSWORD_CHANGED, user.email, user.userType, user.id, true);

      return reply.send({ message: 'Parola başarıyla değiştirildi.' });
    } catch (error: unknown) {
      console.error('Password change error:', error);
      const errorObj = error as Error & { statusCode?: number };
      await logger.logError(request, errorObj);
      return reply.status(500).send({ message: 'parola değiştirilirken hata oluştu.' });
    }
  });
}