import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface CreateIndustryDTO {
  name: string;
  nib?: string | null;
  sector?: string | null;
  npwp?: string | null;
  logoUrl?: string | null;
  address: string;
  rt?: string | null;
  rw?: string | null;
  dusun?: string | null;
  desaKelurahan?: string | null;
  subDistrict?: string | null;
  postalCode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  fax?: string | null;
  email?: string | null;
  website?: string | null;
  totalQuota?: number;
}

export interface UpdateIndustryDTO extends Partial<CreateIndustryDTO> {}

export class IndustryService {
  /**
   * Mengambil daftar DUDI dengan Fitur Pagination, Search, & Filter
   */
  static async getAllIndustries(params: {
    page?: number;
    limit?: number;
    search?: string;
    sector?: string;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.IndustryWhereInput = {};

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { address: { contains: params.search, mode: 'insensitive' } },
        { contactPerson: { contains: params.search, mode: 'insensitive' } },
        { nib: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.sector) {
      where.sector = { equals: params.sector, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.industry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          placements: {
            select: {
              id: true,
              status: true,
              student: {
                select: { id: true, name: true, className: true },
              },
            },
          },
        },
      }),
      prisma.industry.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mengambil Detail DUDI berdasarkan ID
   */
  static async getIndustryById(id: string) {
    const industry = await prisma.industry.findUnique({
      where: { id },
      include: {
        placements: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!industry) {
      throw new Error(`DUDI dengan ID "${id}" tidak ditemukan.`);
    }

    return industry;
  }

  /**
   * Menambahkan Data DUDI Baru
   */
  static async createIndustry(payload: CreateIndustryDTO) {
    // Validasi Duplikasi Nama DUDI
    const existing = await prisma.industry.findUnique({
      where: { name: payload.name },
    });

    if (existing) {
      throw new Error(`DUDI dengan nama "${payload.name}" sudah terdaftar.`);
    }

    return await prisma.industry.create({
      data: {
        name: payload.name,
        nib: payload.nib || null,
        sector: payload.sector || null,
        npwp: payload.npwp || null,
        logoUrl: payload.logoUrl || null,
        address: payload.address,
        rt: payload.rt || null,
        rw: payload.rw || null,
        dusun: payload.dusun || null,
        desaKelurahan: payload.desaKelurahan || null,
        subDistrict: payload.subDistrict || null,
        postalCode: payload.postalCode || null,
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
        contactPerson: payload.contactPerson || null,
        phone: payload.phone || null,
        fax: payload.fax || null,
        email: payload.email || null,
        website: payload.website || null,
        totalQuota: payload.totalQuota ?? 0,
      },
    });
  }

  /**
   * Mengubah / Update Data DUDI
   */
  static async updateIndustry(id: string, payload: UpdateIndustryDTO) {
    await this.getIndustryById(id); // Memastikan ID ada

    return await prisma.industry.update({
      where: { id },
      data: {
        ...payload,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Menghapus Data DUDI
   */
  static async deleteIndustry(id: string) {
    await this.getIndustryById(id); // Memastikan ID ada

    return await prisma.industry.delete({
      where: { id },
    });
  }
}