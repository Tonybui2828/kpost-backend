import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // 1. LẤY THỐNG KÊ TỔNG QUAN (Doanh thu, Tăng trưởng, Khách hàng)
  async getDashboardStats() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Tổng số khách hàng
    const totalUsers = await this.prisma.user.count();
    
    // Doanh thu tổng từ trước đến nay
    const totalRevenue = await this.prisma.transaction.aggregate({
      where: { status: 'success' },
      _sum: { amount: true }
    });

    // Doanh thu tháng này
    const thisMonthRevenue = await this.prisma.transaction.aggregate({
      where: { 
        status: 'success',
        createdAt: { gte: firstDayOfMonth }
      },
      _sum: { amount: true }
    });

    // Doanh thu tháng trước
    const lastMonthRevenue = await this.prisma.transaction.aggregate({
      where: { 
        status: 'success',
        createdAt: { gte: firstDayOfLastMonth, lt: firstDayOfMonth }
      },
      _sum: { amount: true }
    });

    // Tính % tăng trưởng doanh thu
    const currentVal = thisMonthRevenue._sum.amount || 0;
    const lastVal = lastMonthRevenue._sum.amount || 0;
    let growth = 0;
    if (lastVal > 0) {
      growth = ((currentVal - lastVal) / lastVal) * 100;
    }

    return {
      totalUsers,
      totalRevenue: totalRevenue._sum.amount || 0,
      thisMonthRevenue: currentVal,
      growthRate: growth.toFixed(2) + '%',
      newUsersThisMonth: await this.prisma.user.count({ where: { createdAt: { gte: firstDayOfMonth } } })
    };
  }

  // 2. QUẢN LÝ CẤU HÌNH WEBSITE (Logo, Tên web...)
  async getSystemSettings() {
    return this.prisma.systemSetting.upsert({
      where: { id: 'global' },
      update: {},
      create: { id: 'global', websiteName: 'Dropbuy SaaS' }
    });
  }

  async updateSystemSettings(data: any) {
    return this.prisma.systemSetting.update({
      where: { id: 'global' },
      data: data
    });
  }

  // 3. QUẢN LÝ VOUCHER
  async getAllVouchers() {
    return this.prisma.voucher.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createVoucher(data: any) {
    return this.prisma.voucher.create({ data });
  }

  // --- MỚI THÊM: Xóa Voucher ---
  async deleteVoucher(id: string) {
    return this.prisma.voucher.delete({ where: { id } });
  }

  // 4. QUẢN LÝ KHÁCH HÀNG (MỚI THÊM)
  // Lấy danh sách user kèm thông tin gói cước (plan) và ngày hết hạn
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        workspaces: {
          select: {
            workspace: {
              select: {
                name: true,
                plan: true,
                planExpiry: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // 5. THÔNG BÁO GIA HẠN (Tự động quét các Workspace sắp hết hạn)
  async checkExpiringWorkspaces() {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringWorkspaces = await this.prisma.workspace.findMany({
      where: {
        planExpiry: {
          lte: threeDaysFromNow,
          gte: new Date()
        }
      }
    });

    // Tạo thông báo cho từng Workspace sắp hết hạn
    for (const ws of expiringWorkspaces) {
      await this.prisma.systemNotification.create({
        data: {
          targetId: ws.id,
          title: "Thông báo gia hạn gói cước",
          content: `Gói cước của không gian ${ws.name} sẽ hết hạn vào ngày ${ws.planExpiry?.toLocaleDateString()}. Vui lòng gia hạn để không bị gián đoạn dịch vụ.`,
          type: "renewal"
        }
      });
    }
    return { count: expiringWorkspaces.length };
  }
}