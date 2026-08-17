import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.product.create({ data });
  }

  async findAll(workspaceId: string) {
    return this.prisma.product.findMany({ where: { workspaceId } });
  }

  // Logic Xóa
  async remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  // Logic Cập nhật
  async update(id: string, data: any) {
    return this.prisma.product.update({
      where: { id },
      data: data,
    });
  }
}