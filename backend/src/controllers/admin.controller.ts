import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, UserType, OnayDurumu, DefterDurumu, StajTipi, SaglikSigortasiDurumu } from '../generated/prisma/index.js';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import LoggerService, { LogAction, LogLevel } from '../services/logger.service.js';

const prisma = new PrismaClient();
const logger = LoggerService.getInstance();

// Validation schemas
const createUserSchema = z.object({
  tcKimlik: z.string().min(11).max(11),
  kullaniciAdi: z.string().min(3),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  userType: z.nativeEnum(UserType),
  studentId: z.string().optional(),
  faculty: z.string().optional(),
  class: z.string().optional()
});

const updateUserSchema = z.object({
  tcKimlik: z.string().min(11).max(11).optional(),
  kullaniciAdi: z.string().min(3).optional(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  userType: z.nativeEnum(UserType).optional(),
  studentId: z.string().optional(),
  faculty: z.string().optional(),
  class: z.string().optional()
});

const updateStajBasvuruSchema = z.object({
  kurumAdi: z.string().optional(),
  kurumAdresi: z.string().optional(),
  sorumluTelefon: z.string().optional(),
  sorumluMail: z.string().email().optional(),
  yetkiliAdi: z.string().optional(),
  yetkiliUnvani: z.string().optional(),
  stajTipi: z.nativeEnum(StajTipi).optional(),
  baslangicTarihi: z.string().optional(),
  bitisTarihi: z.string().optional(),
  seciliGunler: z.string().optional(),
  toplamGun: z.number().optional(),
  saglikSigortasiDurumu: z.nativeEnum(SaglikSigortasiDurumu).optional(),
  danismanMail: z.string().email().optional(),
  onayDurumu: z.nativeEnum(OnayDurumu).optional(),
  danismanOnayDurumu: z.number().optional(),
  danismanAciklama: z.string().optional(),
  kariyerMerkeziOnayDurumu: z.number().optional(),
  kariyerMerkeziAciklama: z.string().optional(),
  sirketOnayDurumu: z.number().optional(),
  sirketAciklama: z.string().optional(),
  yurtDisi: z.string().optional(),
  turkFirmasi: z.string().optional()
});

const updateDefterSchema = z.object({
  defterDurumu: z.nativeEnum(DefterDurumu).optional(),
  sirketOnayDurumu: z.number().optional(),
  sirketAciklama: z.string().optional(),
  danismanOnayDurumu: z.number().optional(),
  danismanAciklama: z.string().optional()
});

export const getAllUsers = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { page = 1, limit = 20, search = '', userType } = request.query as any;
    
    // Convert string parameters to numbers
    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 20;
    
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { kullaniciAdi: { contains: search } },
        { tcKimlik: { contains: search } }
      ];
    }
    
    if (userType) {
      where.userType = userType;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          tcKimlik: true,
          kullaniciAdi: true,
          name: true,
          email: true,
          userType: true,
          studentId: true,
          faculty: true,
          class: true,
          createdAt: true,
          updatedAt: true
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    await logger.log(request, {
      action: LogAction.USER_LIST,
      level: LogLevel.INFO,
      details: {
        action: 'getAllUsers',
        totalUsers: total,
        filters: { search, userType }
      }
    });

    return reply.send({
      users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    await logger.log(request, {
      action: LogAction.SERVER_ERROR,
      level: LogLevel.ERROR,
      details: { error: error?.message || 'Unknown error', operation: 'getAllUsers' }
    });
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const getUserById = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        basvurular: {
          include: {
            defter: true
          }
        },
        sessions: true
      }
    });

    if (!user) {
      return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return reply.send(userWithoutPassword);
  } catch (error: any) {
    await logger.log(request, {
      action: LogAction.SERVER_ERROR,
      level: LogLevel.ERROR,
      details: { error: error?.message || 'Unknown error', operation: 'getUserById' }
    });
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const createUser = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const validatedData = createUserSchema.parse(request.body);
    
    // Check if user already exists
    const orConditions: any[] = [
      { tcKimlik: validatedData.tcKimlik },
      { email: validatedData.email },
      { kullaniciAdi: validatedData.kullaniciAdi }
    ];

    // Only check studentId if it's provided and not empty
    if (validatedData.studentId && validatedData.studentId.trim() !== '') {
      orConditions.push({ studentId: validatedData.studentId });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: orConditions
      }
    });

    if (existingUser) {
      return reply.status(400).send({ error: 'Bu TC Kimlik, email veya kullanıcı adı zaten kullanılıyor' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Prepare data for creation, excluding empty studentId
    const createData: any = {
      ...validatedData,
      password: hashedPassword
    };

    // Remove studentId if it's empty or just whitespace
    if (!createData.studentId || createData.studentId.trim() === '') {
      delete createData.studentId;
    }

    const user = await prisma.user.create({
      data: createData,
      select: {
        id: true,
        tcKimlik: true,
        kullaniciAdi: true,
        name: true,
        email: true,
        userType: true,
        studentId: true,
        faculty: true,
        class: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await logger.log(request, {
      action: LogAction.USER_CREATE,
      level: LogLevel.INFO,
      details: {
        action: 'createUser',
        createdUserId: user.id,
        userType: user.userType
      }
    });

    return reply.status(201).send(user);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation error', details: error.errors });
    }
    
    await logger.log(request, {
      action: LogAction.SERVER_ERROR,
      level: LogLevel.ERROR,
      details: { error: error instanceof Error ? error.message : String(error), operation: 'createUser' }
    });
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const updateUser = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const validatedData = updateUserSchema.parse(request.body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
    }

    // Hash password if provided
    const updateData: any = { ...validatedData };
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        tcKimlik: true,
        kullaniciAdi: true,
        name: true,
        email: true,
        userType: true,
        studentId: true,
        faculty: true,
        class: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await logger.log(request, {
      action: LogAction.USER_UPDATE,
      level: LogLevel.INFO,
      details: {
        action: 'updateUser',
        updatedUserId: user.id,
        changes: Object.keys(validatedData)
      }
    });

    return reply.send(user);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation error', details: error.errors });
    }
    
    await logger.log(request, {
      action: LogAction.SERVER_ERROR,
      level: LogLevel.ERROR,
      details: { error: error instanceof Error ? error.message : String(error), operation: 'updateUser' }
    });
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const deleteUser = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const userId = parseInt(id);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
    }

    // Prevent self-deletion
    const currentUser = (request as any).user;
    if (currentUser.id === userId) {
      return reply.status(400).send({ error: 'Kendi hesabınızı silemezsiniz' });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    await logger.log(request, {
      action: LogAction.USER_DELETE,
      level: LogLevel.WARN,
      details: {
        action: 'deleteUser',
        deletedUserId: userId,
        deletedUserEmail: existingUser.email
      }
    });

    return reply.send({ message: 'Kullanıcı başarıyla silindi' });
  } catch (error: any) {
    await logger.log(request, {
      action: LogAction.SERVER_ERROR,
      level: LogLevel.ERROR,
      details: { error: error instanceof Error ? error.message : String(error), operation: 'deleteUser' }
    });
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

// STAJ BASVURU CRUD OPERATIONS
export const getAllStajBasvurulari = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { page = 1, limit = 20, search = '', onayDurumu, stajTipi } = request.query as any;
    
    // Convert string parameters to numbers
    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { kurumAdi: { contains: search } },
        { yetkiliAdi: { contains: search } },
        { ogrenci: { name: { contains: search } } }
      ];
    }
    
    if (onayDurumu) {
      where.onayDurumu = onayDurumu;
    }
    
    if (stajTipi) {
      where.stajTipi = stajTipi;
    }

    const [basvurular, total] = await Promise.all([
      prisma.stajBasvurusu.findMany({
        where,
        include: {
          ogrenci: {
            select: {
              id: true,
              name: true,
              email: true,
              studentId: true,
              faculty: true,
              class: true
            }
          }
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.stajBasvurusu.count({ where })
    ]);

    return reply.send({
      basvurular,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    await logger.log(request, {
      action: LogAction.SERVER_ERROR,
      level: LogLevel.ERROR,
      details: { error: error instanceof Error ? error.message : String(error), operation: 'getAllStajBasvurulari' }
    });
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const updateStajBasvurusu = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const validatedData = updateStajBasvuruSchema.parse(request.body);

    // Convert date strings to Date objects if provided
    const updateData: any = { ...validatedData };
    if (validatedData.baslangicTarihi) {
      updateData.baslangicTarihi = new Date(validatedData.baslangicTarihi);
    }
    if (validatedData.bitisTarihi) {
      updateData.bitisTarihi = new Date(validatedData.bitisTarihi);
    }

    const basvuru = await prisma.stajBasvurusu.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        ogrenci: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true
          }
        },
        defter: true
      }
    });

    await logger.log(request, {
      action: LogAction.BASVURU_UPDATE,
      level: LogLevel.INFO,
      details: {
        action: 'updateStajBasvurusu',
        basvuruId: basvuru.id,
        changes: Object.keys(validatedData)
      }
    });

    return reply.send(basvuru);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation error', details: error.errors });
    }
    
    await logger.log(request, {
      action: LogAction.SERVER_ERROR,
      level: LogLevel.ERROR,
      details: { error: error instanceof Error ? error.message : String(error), operation: 'updateStajBasvurusu' }
    });
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const deleteStajBasvurusu = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };

    await prisma.stajBasvurusu.delete({
      where: { id: parseInt(id) }
    });

    await logger.log(request, {
      action: LogAction.BASVURU_DELETE,
      level: LogLevel.WARN,
      details: {
        action: 'deleteStajBasvurusu',
        deletedBasvuruId: parseInt(id)
      }
    });

    return reply.send({ message: 'Staj başvurusu başarıyla silindi' });
  } catch (error: any) {
    await logger.log(request, {
      action: LogAction.SERVER_ERROR,
      level: LogLevel.ERROR,
      details: { error: error instanceof Error ? error.message : String(error), operation: 'deleteStajBasvurusu' }
    });
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

// DEFTER CRUD OPERATIONS
export const getAllDefterler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { page = 1, limit = 20, defterDurumu } = request.query as any;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (defterDurumu) {
      where.defterDurumu = defterDurumu;
    }

    const [defterler, total] = await Promise.all([
      prisma.stajDefteri.findMany({
        where,
        include: {
          stajBasvurusu: {
            include: {
              ogrenci: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  studentId: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.stajDefteri.count({ where })
    ]);

    return reply.send({
      defterler,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    await logger.log(request, {
      action: LogAction.SERVER_ERROR,
      level: LogLevel.ERROR,
      details: { error: error instanceof Error ? error.message : String(error), operation: 'getAllDefterler' }
    });
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const updateDefter = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const validatedData = updateDefterSchema.parse(request.body);

    const defter = await prisma.stajDefteri.update({
      where: { id: parseInt(id) },
      data: validatedData,
      include: {
        stajBasvurusu: {
          include: {
            ogrenci: {
              select: {
                id: true,
                name: true,
                email: true,
                studentId: true
              }
            }
          }
        }
      }
    });

    await logger.log(request, {
      action: LogAction.DEFTER_UPDATE,
      level: LogLevel.INFO,
      details: {
        action: 'updateDefter',
        defterId: defter.id,
        changes: Object.keys(validatedData)
      }
    });

    return reply.send(defter);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation error', details: error.errors });
    }
    
    await logger.log(request, {
      action: LogAction.SERVER_ERROR,
      level: LogLevel.ERROR,
      details: { error: error instanceof Error ? error.message : String(error), operation: 'updateDefter' }
    });
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

// STATISTICS
export const getStatistics = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const [
      totalUsers,
      totalBasvurular,
      totalDefterler,
      usersByType,
      basvurularByStatus,
      defterlerByStatus,
      recentActivity
    ] = await Promise.all([
      prisma.user.count(),
      prisma.stajBasvurusu.count(),
      prisma.stajDefteri.count(),
      prisma.user.groupBy({
        by: ['userType'],
        _count: { id: true }
      }),
      prisma.stajBasvurusu.groupBy({
        by: ['onayDurumu'],
        _count: { id: true }
      }),
      prisma.stajDefteri.groupBy({
        by: ['defterDurumu'],
        _count: { id: true }
      }),
      prisma.stajBasvurusu.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          ogrenci: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })
    ]);

    return reply.send({
      totals: {
        users: totalUsers,
        basvurular: totalBasvurular,
        defterler: totalDefterler
      },
      usersByType,
      basvurularByStatus,
      defterlerByStatus,
      recentActivity
    });
  } catch (error: any) {
    await logger.log(request, {
      action: LogAction.SERVER_ERROR,
      level: LogLevel.ERROR,
      details: { error: error instanceof Error ? error.message : String(error), operation: 'getStatistics' }
    });
    return reply.status(500).send({ error: 'Internal server error' });
  }
};
