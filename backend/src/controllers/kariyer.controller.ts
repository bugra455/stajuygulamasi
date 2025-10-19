import { FastifyRequest, FastifyReply } from "fastify";
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import * as userService from "../services/userService.js";
import * as basvuruService from "../services/kariyer.service.js";
import {
  RouteParams,
  RequestBody,
  BasvuruUpdateData,
  AppError,
  HocaData,
} from "../types/common.types.js";
import { prisma } from "../lib/prisma.js";

// Utility function for error handling
function handleControllerError(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
  context: string
): void {
  const appError = error as AppError;
  request.log.error(`${context} error:`, appError);
  reply.status(500).send({
    success: false,
    message: appError.message || `${context} işlemi sırasında hata oluştu`,
  });
}

// Başvuru Yönetimi
export async function getAllBasvurular(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const basvurular = await basvuruService.getAllBasvurularForKariyer();
    reply.send({ success: true, data: basvurular });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Başvuru listeleme");
  }
}

export async function getBasvuru(
  request: FastifyRequest<{ Params: RouteParams }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(request.params.id!);
    const basvuru = await basvuruService.getBasvuruByIdForKariyer(id);
    reply.send({ success: true, data: basvuru });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Başvuru detayını getirme");
  }
}

export async function onaylaBasvuru(
  request: FastifyRequest<{ Params: RouteParams; Body: { aciklama?: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(request.params.id!);
    const { aciklama } = request.body;
    const result = await basvuruService.kariyerOnaylaBasvuru(id, aciklama);
    reply.send({ success: true, data: result });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Başvuru onaylama");
  }
}

export async function reddetBasvuru(
  request: FastifyRequest<{ Params: RouteParams; Body: { redSebebi: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(request.params.id!);
    const { redSebebi } = request.body;
    const result = await basvuruService.kariyerReddetBasvuru(id, redSebebi);
    reply.send({ success: true, data: result });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Başvuru reddetme");
  }
}

// updateBasvuru removed: career center update endpoint is disabled.

// Kullanıcı Yönetimi
export async function getAllUsers(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const users = await userService.getAllUsers();
    reply.send({ success: true, data: users });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Kullanıcı listeleme");
  }
}

export async function getAllDanismanlar(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const danismanlar = await userService.getAllDanismanlar();
    reply.send({ success: true, data: danismanlar });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Danışman listeleme");
  }
}

export async function getAllOgrenciler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const ogrenciler = await userService.getAllOgrenciler();
    reply.send({ success: true, data: ogrenciler });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Öğrenci listeleme");
  }
}

export async function getAllSirketler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const sirketler = await userService.getAllSirketler();
    reply.send({ success: true, data: sirketler });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Şirket listeleme");
  }
}
// KM'nin Kullanici Bilgilerini Guncellemesini Iptal Ediyorum.
/*
export async function updateUser(
  request: FastifyRequest<{ Params: RouteParams; Body: RequestBody }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(request.params.id!);
    const updateData = request.body;
    const result = await userService.updateUser(id, updateData);
    reply.send({ success: true, data: result });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Kullanıcı güncelleme");
  }
}
*/

// Personel Bilgileri
export async function getPersonelBilgisi(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Dummy implementation - gerçek auth sistemi ile değiştirilecek
    const personel = await userService.getAllUsers();
    reply.send({
      success: true,
      data: personel.find((u) => u.userType === "KARIYER_MERKEZI"),
    });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Personel bilgisi getirme");
  }
}

export async function updatePersonelBilgisi(
  request: FastifyRequest<{ Body: Record<string, unknown> }>,
  reply: FastifyReply
) {
  try {
    const updateData = request.body;
    // Dummy implementation - gerçek auth sistemi ile değiştirilecek
    const result = await userService.updateUser(1, updateData); // userId = 1 (dummy)
    reply.send({ success: true, data: result });
  } catch (error: unknown) {
    const err = error as Error;
    reply.status(500).send({ success: false, message: err.message });
  }
}

// Hoca/Danışman Yönetimi
export async function getAllHocalar(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const hocalar = await userService.getAllDanismanlar();
    reply.send({ success: true, data: hocalar });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Hoca listeleme");
  }
}

export async function getHoca(
  request: FastifyRequest<{ Params: { tcKimlik: string } }>,
  reply: FastifyReply
) {
  try {
    const { tcKimlik } = request.params;
    const hocalar = await userService.getAllDanismanlar();
    const hoca = hocalar.find(
      (h: Record<string, unknown>) =>
        (h as { tcKimlik?: string }).tcKimlik === tcKimlik
    );
    if (!hoca) {
      return reply
        .status(404)
        .send({ success: false, message: "Hoca bulunamadı" });
    }
    reply.send({ success: true, data: hoca });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Hoca detayını getirme");
  }
}

export async function updateHoca(
  request: FastifyRequest<{
    Params: { tcKimlik: string };
    Body: Record<string, unknown>;
  }>,
  reply: FastifyReply
) {
  try {
    const { tcKimlik } = request.params;
    const updateData = request.body;
    // Bu işlem için ayrı servis fonksiyonu gerekebilir
    const result = await userService.updateUser(1, updateData); // Dummy implementation
    reply.send({ success: true, data: result });
  } catch (error: unknown) {
    const err = error as Error;
    reply.status(500).send({ success: false, message: err.message });
  }
}

// Detay Modal Endpoints
export async function getOgrenciDetay(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(request.params.id);
    const ogrenciDetay = await userService.getOgrenciDetay(id);
    if (!ogrenciDetay) {
      return reply
        .status(404)
        .send({ success: false, message: "Öğrenci bulunamadı" });
    }
    reply.send({ success: true, data: ogrenciDetay });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Öğrenci detayını getirme");
  }
}

export async function getDanismanDetay(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const id = parseInt(request.params.id);
    const danismanDetay = await userService.getDanismanDetay(id);
    if (!danismanDetay) {
      return reply
        .status(404)
        .send({ success: false, message: "Danışman bulunamadı" });
    }
    reply.send({ success: true, data: danismanDetay });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Danışman detayını getirme");
  }
}

export async function getSirketDetay(
  request: FastifyRequest<{ Params: { kurumAdi: string } }>,
  reply: FastifyReply
) {
  try {
    const kurumAdi = decodeURIComponent(request.params.kurumAdi);
    const sirketDetay = await userService.getSirketDetay(kurumAdi);
    if (!sirketDetay) {
      return reply
        .status(404)
        .send({ success: false, message: "Şirket bulunamadı" });
    }
    reply.send({ success: true, data: sirketDetay });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Şirket detayını getirme");
  }
}

// Arama ve Filtreleme Endpoints
export async function searchOgrenciler(
  request: FastifyRequest<{
    Querystring: { q?: string; faculty?: string; class?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { q = "", faculty, class: classFilter } = request.query;
    const ogrenciler = await userService.searchOgrenciler(
      q,
      faculty,
      classFilter
    );
    reply.send({ success: true, data: ogrenciler });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Öğrenci arama");
  }
}

export async function searchDanismanlar(
  request: FastifyRequest<{
    Querystring: { q?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { q = "" } = request.query;
    const danismanlar = await userService.searchDanismanlar(q);
    reply.send({ success: true, data: danismanlar });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Danışman arama");
  }
}

export async function searchSirketler(
  request: FastifyRequest<{
    Querystring: { q?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { q = "" } = request.query;
    const sirketler = await userService.searchSirketler(q);
    reply.send({ success: true, data: sirketler });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Şirket arama");
  }
}

export async function searchBasvurular(
  request: FastifyRequest<{ Querystring: { q?: string; status?: string } }>,
  reply: FastifyReply
) {
  try {
    const { q: searchTerm, status } = request.query;
    const basvurular = await basvuruService.searchBasvurular(
      searchTerm,
      status
    );
    reply.send({ success: true, data: basvurular });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Başvuru arama");
  }
}

// Bölümleri getir (dropdown için)
export async function getBolumler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const bolumler = await prisma.user.findMany({
      select: {
        faculty: true,
      },
      where: {
        faculty: {
          not: null,
        },
      },
      distinct: ["faculty"],
    });

    const bolumListesi = bolumler
      .map((user) => user.faculty)
      .filter((faculty) => faculty !== null && faculty !== undefined)
      .sort();

    reply.send({ success: true, data: bolumListesi });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Bölüm listesi getirme");
  }
}

// Staj tiplerini getirme
export async function getStajTipleri(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const stajTipleri = [
      "IMU_402",
      "IMU_404",
      "MESLEKI_EGITIM_UYGULAMALI_DERS",
      "ISTEGE_BAGLI_STAJ",
      "ZORUNLU_STAJ",
    ];

    reply.send({ success: true, data: stajTipleri });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Staj tipi listesi getirme");
  }
}

export async function searchKariyerOgrenciler(
  request: FastifyRequest<{
    Querystring: {
      search?: string;
      faculty?: string;
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { search, faculty, page = "1", limit = "200" } = request.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      userType: "OGRENCI",
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { studentId: { contains: search } },
        { tcKimlik: { contains: search } },
        { email: { contains: search } },
        { kullaniciAdi: { contains: search } },
      ];
    }

    if (faculty) {
      where.faculty = faculty;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          name: true,
          email: true,
          userType: true,
          studentId: true,
          tcKimlik: true,
          faculty: true,
          class: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    reply.send({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Kariyer öğrenci arama");
  }
}

export async function searchKariyerDanismanlar(
  request: FastifyRequest<{
    Querystring: {
      search?: string;
      faculty?: string;
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { search, faculty, page = "1", limit = "200" } = request.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      userType: "DANISMAN",
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { kullaniciAdi: { contains: search } },
      ];
    }

    if (faculty) {
      where.faculty = faculty;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    reply.send({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Kariyer danışman arama");
  }
}

export async function searchKariyerSirketler(
  request: FastifyRequest<{
    Querystring: { search?: string; page?: string; limit?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { search, page = "1", limit = "200" } = request.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { kurumAdi: { contains: search } },
        { kurumAdresi: { contains: search } },
        { yetkiliAdi: { contains: search } },
        { sorumluMail: { contains: search } },
      ];
    }

    // Get unique companies from applications
    const [sirketler, total] = await Promise.all([
      prisma.stajBasvurusu.findMany({
        where,
        select: {
          kurumAdi: true,
          kurumAdresi: true,
          yetkiliAdi: true,
          yetkiliUnvani: true,
          sorumluMail: true,
          sorumluTelefon: true,
        },
        distinct: ["kurumAdi"],
        skip,
        take: Number(limit),
        orderBy: { kurumAdi: "asc" },
      }),
      prisma.stajBasvurusu
        .groupBy({
          by: ["kurumAdi"],
          where,
          _count: true,
        })
        .then((groups) => groups.length),
    ]);

    reply.send({
      success: true,
      data: sirketler,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Kariyer şirket arama");
  }
}

export async function searchKariyerBasvurular(
  request: FastifyRequest<{
    Querystring: {
      search?: string;
      onayDurumu?: string;
      faculty?: string;
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const {
      search,
      onayDurumu,
      faculty,
      page = "1",
      limit = "200",
    } = request.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (search) {
      where.OR = [
        {
          ogrenci: {
            OR: [
              { name: { contains: search } },
              { studentId: { contains: search } },
              { email: { contains: search } },
              { kullaniciAdi: { contains: search } },
            ],
          },
        },
        { kurumAdi: { contains: search } },
      ];
    }

    if (onayDurumu) {
      where.onayDurumu = onayDurumu;
    }

    if (faculty) {
      where.ogrenci = {
        ...where.ogrenci,
        faculty: faculty,
      };
    }

    const [basvurular, total] = await Promise.all([
      prisma.stajBasvurusu.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          ogrenci: {
            select: {
              id: true,
              name: true,
              email: true,
              studentId: true,
              faculty: true,
              kullaniciAdi: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.stajBasvurusu.count({ where }),
    ]);

    reply.send({
      success: true,
      data: basvurular,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Kariyer başvuru arama");
  }
}

// Onaylanmış başvurular için arama ve filtreleme
export async function searchOnaylanmisBasvurular(
  request: FastifyRequest<{
    Querystring: {
      search?: string;
      faculty?: string;
      stajTipi?: string;
      baslangicTarihiFrom?: string;
      baslangicTarihiTo?: string;
      bitisTarihiFrom?: string;
      bitisTarihiTo?: string;
      page?: string;
      limit?: string;
      export?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const {
      search,
      faculty,
      stajTipi,
      baslangicTarihiFrom,
      baslangicTarihiTo,
      bitisTarihiFrom,
      bitisTarihiTo,
      page = "1",
      limit = "200",
      export: isExport,
    } = request.query;

    const where: any = { onayDurumu: "ONAYLANDI" };

    // Sadece search varsa OR ekle
    if (search && search.trim() !== "") {
      where.OR = [
        {
          ogrenci: {
            OR: [
              { name: { contains: search } },
              { studentId: { contains: search } },
              { email: { contains: search } },
              { kullaniciAdi: { contains: search } },
              { tcKimlik: { contains: search } },
            ],
          },
        },
        { kurumAdi: { contains: search } },
        { sorumluTelefon: { contains: search } },
      ];
    }

    // Sadece faculty varsa ogrenci objesi ekle
    if (faculty && faculty.trim() !== "") {
      if (!where.ogrenci) where.ogrenci = {};
      where.ogrenci.faculty = faculty;
    }

    if (stajTipi && stajTipi.trim() !== "") {
      where.stajTipi = stajTipi;
    }

    if (baslangicTarihiFrom || baslangicTarihiTo) {
      where.baslangicTarihi = {};
      if (baslangicTarihiFrom) {
        where.baslangicTarihi.gte = new Date(baslangicTarihiFrom);
      }
      if (baslangicTarihiTo) {
        where.baslangicTarihi.lte = new Date(baslangicTarihiTo);
      }
    }

    if (bitisTarihiFrom || bitisTarihiTo) {
      where.bitisTarihi = {};
      if (bitisTarihiFrom) {
        where.bitisTarihi.gte = new Date(bitisTarihiFrom);
      }
      if (bitisTarihiTo) {
        where.bitisTarihi.lte = new Date(bitisTarihiTo);
      }
    }

    // Excel export işlemi
    if (isExport === "true") {
      const allBasvurular = await prisma.stajBasvurusu.findMany({
        where,
        include: {
          ogrenci: {
            select: {
              id: true,
              name: true,
              email: true,
              studentId: true,
              tcKimlik: true,
              faculty: true,
              class: true,
              kullaniciAdi: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // xlsx ile export
      const workbook = XLSX.utils.book_new();
      
      // Başlık ve alt başlık için veri hazırla
      const headerRows = [
        ["ONAYLANMIŞ STAJ BAŞVURULARI LİSTESİ"],
        ["Üniversite Kariyer Merkezi"],
        [`Tarih Aralığı: ${baslangicTarihiFrom || "-"} - ${bitisTarihiTo || "-"}`],
        [], // Boş satır
        // Tablo başlıkları
        [
          "Öğrenci Adı",
          "Öğrenci No",
          "Öğrenci TC Kimlik",
          "Bölüm (Normal)",
          "Bölüm (CAP)",
          "Staj Yapılan Bölüm",
          "Sınıf",
          "Şirket Adı",
          "Staj Tipi",
          "Başlangıç Tarihi",
          "Bitiş Tarihi",
          "Toplam Gün",
          "Başvuru Tarihi",
        ]
      ];

      // Veri satırlarını topla
      const dataRows = allBasvurular.map((basvuru, idx) => {
        // Normal department (from ogrenci)
        const normalBolum = `${basvuru.ogrenci.faculty || ""}${basvuru.ogrenci.class ? ` / ${basvuru.ogrenci.class}` : ""}`.trim();

        // CAP department (from basvuru.cap* fields)
        const capBolumParts = [];
        if ((basvuru as any).capFakulte) capBolumParts.push((basvuru as any).capFakulte);
        if ((basvuru as any).capBolum) capBolumParts.push((basvuru as any).capBolum);
        if ((basvuru as any).capDepartman) capBolumParts.push((basvuru as any).capDepartman);
        const capBolum = capBolumParts.join(' / ');

        // Staj yapılan bölüm: tercih CAP ise CAP bilgisi, değilse normal
        const stajYapilanBolum = (basvuru as any).isCapBasvuru ? (capBolum || normalBolum) : normalBolum;

        return [
          basvuru.ogrenci.name,
          basvuru.ogrenci.studentId || "",
          basvuru.ogrenci.tcKimlik || "",
          normalBolum || "",
          capBolum || "",
          stajYapilanBolum || "",
          basvuru.ogrenci.class || "",
          basvuru.kurumAdi,
          basvuru.stajTipi,
          basvuru.baslangicTarihi.toISOString().split("T")[0],
          basvuru.bitisTarihi.toISOString().split("T")[0],
          basvuru.toplamGun.toString(),
          basvuru.createdAt.toISOString().split("T")[0],
        ];
      });

      // Tüm satırları birleştir
      const allRows = [...headerRows, ...dataRows];
      
      // Worksheet oluştur
      const worksheet = XLSX.utils.aoa_to_sheet(allRows);
      
      // Sütun genişlikleri ayarla
      worksheet['!cols'] = [
        { width: 20 }, // Öğrenci Adı
        { width: 15 }, // Öğrenci No
        { width: 18 }, // TC
        { width: 25 }, // Bölüm (Normal)
        { width: 25 }, // Bölüm (CAP)
        { width: 30 }, // Staj Yapılan Bölüm
        { width: 10 }, // Sınıf
        { width: 25 }, // Şirket Adı
        { width: 18 }, // Staj Tipi
        { width: 15 }, // Başlangıç
        { width: 15 }, // Bitiş
        { width: 10 }, // Toplam Gün
        { width: 15 }, // Başvuru Tarihi
      ];

      // Worksheet'i workbook'a ekle
      XLSX.utils.book_append_sheet(workbook, worksheet, "Onaylanmış Başvurular");

      // Excel dosyasını buffer olarak oluştur
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      reply
        .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .header(
          "Content-Disposition",
          `attachment; filename="onaylanmis-basvurular-${
            new Date().toISOString().split("T")[0]
          }.xlsx"`
        )
        .send(buffer);
      return;
    }

    // Normal pagination response
    const skip = (Number(page) - 1) * Number(limit);

    const [basvurular, total] = await Promise.all([
      prisma.stajBasvurusu.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          ogrenci: {
            select: {
              id: true,
              name: true,
              email: true,
              studentId: true,
              faculty: true,
              class: true,
              kullaniciAdi: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.stajBasvurusu.count({ where }),
    ]);

    reply.send({
      success: true,
      data: basvurular,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Onaylanmış başvuru arama");
  }
}

// Başvuru transkriptini indirme
export async function downloadBasvuruTranscript(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const basvuruId = parseInt(request.params.id);
    const basvuru = await basvuruService.getBasvuruByIdForKariyer(basvuruId);

    if (!basvuru || !basvuru.transkriptDosyasi) {
      return reply.status(404).send({
        success: false,
        message: "Başvuru veya transkript dosyası bulunamadı.",
      });
    }

    const filePath = path.resolve(basvuru.transkriptDosyasi);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`);
      return reply.status(404).send({
        success: false,
        message: "Transkript dosyası sunucuda bulunamadı.",
      });
    }

    const fileName = path.basename(filePath);
    const buffer = fs.readFileSync(filePath);

    reply
      .type("application/octet-stream")
      .header("Content-Disposition", `attachment; filename="${fileName}"`)
      .send(buffer);
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Başvuru transkripti indirme");
  }
}

// Başvuru sigorta dosyasını indirme
export async function downloadSigortaDosyasi(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const basvuruId = parseInt(request.params.id);
    const basvuru = await basvuruService.getBasvuruByIdForKariyer(basvuruId);

    if (!basvuru || !basvuru.sigortaDosyasi) {
      return reply.status(404).send({
        success: false,
        message: "Başvuru veya sigorta dosyası bulunamadı.",
      });
    }

    const filePath = path.resolve(basvuru.sigortaDosyasi);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`);
      return reply.status(404).send({
        success: false,
        message: "Sigorta dosyası sunucuda bulunamadı.",
      });
    }

    const fileName = path.basename(filePath);
    const buffer = fs.readFileSync(filePath);

    reply
      .type("application/octet-stream")
      .header("Content-Disposition", `attachment; filename="${fileName}"`)
      .send(buffer);
  } catch (error: unknown) {
    handleControllerError(
      error,
      request,
      reply,
      "Başvuru sigorta dosyası indirme"
    );
  }
}

// Başvuru hizmet dökümü dosyasını indirme
export async function downloadHizmetDokumu(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const basvuruId = parseInt(request.params.id);
    const basvuru = await basvuruService.getBasvuruByIdForKariyer(basvuruId);

    if (!basvuru || !basvuru.hizmetDokumu) {
      return reply.status(404).send({
        success: false,
        message: "Başvuru veya hizmet dökümü dosyası bulunamadı.",
      });
    }

    const filePath = path.resolve(basvuru.hizmetDokumu);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`);
      return reply.status(404).send({
        success: false,
        message: "Hizmet dökümü dosyası sunucuda bulunamadı.",
      });
    }

    const fileName = path.basename(filePath);
    const buffer = fs.readFileSync(filePath);

    reply
      .type("application/octet-stream")
      .header("Content-Disposition", `attachment; filename="${fileName}"`)
      .send(buffer);
  } catch (error: unknown) {
    handleControllerError(
      error,
      request,
      reply,
      "Başvuru hizmet dökümü dosyası indirme"
    );
  }
}

// Belirli bir öğrencinin tüm başvurularını getir (kariyer merkezi)
export async function getOgrenciTumBasvurulari(
  request: FastifyRequest<{ Params: RouteParams }>,
  reply: FastifyReply
) {
  try {
    const ogrenciId = parseInt(request.params.ogrenciId!);
    if (isNaN(ogrenciId)) {
      return reply
        .status(400)
        .send({ success: false, message: "Geçersiz öğrenci ID" });
    }
    const basvurular = await basvuruService.getOgrenciTumBasvurulariForKariyer(
      ogrenciId
    );
    reply.send({ success: true, data: { basvurular } });
  } catch (error: unknown) {
    handleControllerError(
      error,
      request,
      reply,
      "Öğrenci tüm başvurularını getirme"
    );
  }
}

// Genel dosya indirme endpoint'i
export async function downloadBasvuruDosyasi(
  request: FastifyRequest<{ Params: { id: string; fileType: string } }>,
  reply: FastifyReply
) {
  try {
    const basvuruId = parseInt(request.params.id);
    const fileType = request.params.fileType;
    const basvuru = await basvuruService.getBasvuruByIdForKariyer(basvuruId);

    if (!basvuru) {
      return reply
        .status(404)
        .send({ success: false, message: "Başvuru bulunamadı." });
    }

    let filePath: string | null = null;
    let fileFieldName = "";

    switch (fileType) {
      case "transkript":
        filePath = basvuru.transkriptDosyasi;
        fileFieldName = "transkript dosyası";
        break;
      case "sigorta":
        filePath = basvuru.sigortaDosyasi;
        fileFieldName = "sigorta dosyası";
        break;
      case "hizmet":
        filePath = basvuru.hizmetDokumu;
        fileFieldName = "hizmet dökümü dosyası";
        break;
      default:
        return reply
          .status(400)
          .send({ success: false, message: "Geçersiz dosya tipi." });
    }

    if (!filePath) {
      return reply.status(404).send({
        success: false,
        message: `Başvuru ${fileFieldName} bulunamadı.`,
      });
    }

    const resolvedPath = path.resolve(filePath);

    if (!fs.existsSync(resolvedPath)) {
      console.error(`File not found at path: ${resolvedPath}`);
      return reply.status(404).send({
        success: false,
        message: `${fileFieldName} sunucuda bulunamadı.`,
      });
    }

    const fileName = path.basename(resolvedPath);
    const buffer = fs.readFileSync(resolvedPath);

    reply
      .type("application/octet-stream")
      .header("Content-Disposition", `attachment; filename="${fileName}"`)
      .send(buffer);
  } catch (error: unknown) {
    handleControllerError(error, request, reply, "Başvuru dosyası indirme");
  }
}
