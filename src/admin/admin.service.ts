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

  async deleteVoucher(id: string) {
    return this.prisma.voucher.delete({ where: { id } });
  }

  // ==========================================
  // 4. QUẢN LÝ KHÁCH HÀNG
  // ==========================================

  // Lấy danh sách user kèm thông tin gói cước (plan) và ngày hết hạn
  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      include: { workspaces: { include: { workspace: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return users.map(user => {
      const workspace = user.workspaces[0]?.workspace;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        status: user.status || 'active',
        vouchers: user.vouchers || [],
        plan: workspace?.plan || (user as any).plan || 'FREE',
        planExpire: workspace?.planExpiry || (user as any).planExpire || null,
        createdAt: user.createdAt,
      };
    });
  }

  // Nâng cấp, Tăng/Giảm thời hạn gói (hỗ trợ số âm) hoặc Chọn trực tiếp ngày trên lịch
  async updateUserPlan(
    userId: string, 
    plan: string, 
    extraDays?: number, 
    customExpireDate?: string
  ) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId }
    });

    const workspace = member 
      ? await this.prisma.workspace.findUnique({ where: { id: member.workspaceId } })
      : await this.prisma.workspace.findFirst({ where: { ownerId: userId } });

    let newExpireDate: Date | null = null;
    const planUpper = plan ? plan.toUpperCase() : 'PRO';

    if (planUpper === 'FREE') {
      newExpireDate = null;
    } else if (customExpireDate) {
      // 1. Nếu Admin chọn một ngày cụ thể trên lịch
      newExpireDate = new Date(`${customExpireDate}T23:59:59.999Z`);
    } else if (typeof extraDays === 'number') {
      // 2. Nếu tăng (+5) hoặc giảm (-5, -1) số ngày
      const currentDate = workspace?.planExpiry && new Date(workspace.planExpiry) > new Date()
        ? new Date(workspace.planExpiry)
        : new Date();

      newExpireDate = new Date(currentDate);
      newExpireDate.setDate(currentDate.getDate() + Number(extraDays));
    } else {
      newExpireDate = workspace?.planExpiry || new Date();
    }

    // Cập nhật bảng Workspace nếu có
    if (workspace) {
      await this.prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          plan: planUpper,
          planExpiry: newExpireDate 
        }
      });
    }

    // Cập nhật đồng bộ vào bảng User nếu bảng User có các trường này
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          plan: planUpper,
          planExpire: newExpireDate
        } as any
      });
    } catch (e) {
      // Bỏ qua nếu schema User không lưu trực tiếp plan
    }

    const actionText = typeof extraDays === 'number' && extraDays < 0 
      ? `giảm ${Math.abs(extraDays)} ngày` 
      : customExpireDate 
        ? `đặt hạn đến ${newExpireDate?.toLocaleDateString('vi-VN')}` 
        : `thêm ${extraDays || 0} ngày`;

    return { 
      success: true, 
      message: `Đã cập nhật gói ${planUpper} (${actionText}) thành công.` 
    };
  }

  // Tặng Voucher
  async addVoucherToUser(userId: string, voucherCode: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Không tìm thấy user');

    const currentVouchers = user.vouchers || [];
    const updatedVouchers = [...currentVouchers, voucherCode];

    await this.prisma.user.update({
      where: { id: userId },
      data: { vouchers: updatedVouchers }
    });

    return { success: true, message: `Đã tặng voucher ${voucherCode}` };
  }

  // Xóa/Khóa tài khoản (Soft delete)
  async deleteUser(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'deleted' }
    });
    return { success: true, message: 'Đã khóa tài khoản' };
  }

  // Khôi phục tài khoản
  async restoreUser(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'active' }
    });
    return { success: true, message: 'Đã khôi phục tài khoản' };
  }

  // ==========================================
  // CÁC HÀM XÓA VÀ THAO TÁC HÀNG LOẠT (BULK)
  // ==========================================

  // Xóa cứng 1 user (Hard Delete)
  async hardDeleteUser(userId: string) {
    try {
      await this.prisma.workspaceMember.deleteMany({ where: { userId } }).catch(() => {});
      await this.prisma.user.delete({
        where: { id: userId }
      });
      return { success: true, message: 'Đã xóa vĩnh viễn tài khoản' };
    } catch (error) {
      console.error("LỖI XÓA USER:", error);
      throw error;
    }
  }

  // Khóa hàng loạt (Soft delete)
  async bulkLockUsers(userIds: string[]) {
    await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { status: 'deleted' }
    });
    return { success: true, message: `Đã khóa ${userIds.length} tài khoản` };
  }

  // Khôi phục hàng loạt
  async bulkRestoreUsers(userIds: string[]) {
    await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { status: 'active' }
    });
    return { success: true, message: `Đã khôi phục ${userIds.length} tài khoản` };
  }

  // Xóa cứng hàng loạt
  async bulkHardDeleteUsers(userIds: string[]) {
    try {
      await this.prisma.workspaceMember.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
      await this.prisma.user.deleteMany({
        where: { id: { in: userIds } }
      });
      return { success: true, message: `Đã xóa vĩnh viễn ${userIds.length} tài khoản` };
    } catch (error) {
      console.error("LỖI XÓA HÀNG LOẠT USER:", error);
      throw error;
    }
  }

  // ==========================================
  // 5. THÔNG BÁO GIA HẠN
  // ==========================================
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

  // ==========================================
  // 6. QUẢN LÝ CHIẾN DỊCH FLASHSALE VÀ POPUP TRANG CHỦ (MỚI)
  // ==========================================
  async getMarketingCampaigns() {
    let setting = await this.prisma.systemSetting.findUnique({
      where: { id: 'global' }
    });

    if (!setting) {
      setting = await this.prisma.systemSetting.create({
        data: {
          id: 'global',
          websiteName: 'KPost SaaS',
          flashSaleActive: false,
          popupActive: false
        }
      });
    }

    return setting;
  }

  async updateMarketingCampaigns(data: {
    flashSaleActive?: boolean;
    flashSaleEnd?: string | Date;
    flashSaleTitle?: string;
    flashSalePlans?: any;
    popupActive?: boolean;
    popupTitle?: string;
    popupContent?: string;
    popupImage?: string;
    popupButtonText?: string;
    popupButtonLink?: string;
  }) {
    const updateData: any = { ...data };
    if (data.flashSaleEnd) {
      updateData.flashSaleEnd = new Date(data.flashSaleEnd);
    }

    const updated = await this.prisma.systemSetting.upsert({
      where: { id: 'global' },
      update: updateData,
      create: {
        id: 'global',
        ...updateData
      }
    });

    return {
      success: true,
      message: 'Đã lưu chiến dịch Marketing thành công!',
      data: updated
    };
  }
}