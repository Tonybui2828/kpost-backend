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
        plan: workspace?.plan || 'FREE',
        planExpire: workspace?.planExpiry || null,
        createdAt: user.createdAt,
      };
    });
  }

  // Nâng cấp hoặc tặng ngày sử dụng
  async updateUserPlan(userId: string, plan: string, extraDays: number) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId }
    });

    if (!member) throw new Error('Người dùng chưa có Workspace');

    const workspace = await this.prisma.workspace.findUnique({ where: { id: member.workspaceId } });
    const currentDate = workspace?.planExpiry && workspace.planExpiry > new Date() 
                        ? new Date(workspace.planExpiry) 
                        : new Date();

    const newExpireDate = new Date(currentDate);
    newExpireDate.setDate(currentDate.getDate() + Number(extraDays));

    await this.prisma.workspace.update({
      where: { id: member.workspaceId },
      data: {
        plan: plan.toUpperCase(),
        planExpiry: newExpireDate 
      }
    });

    return { success: true, message: `Đã nâng cấp lên gói ${plan} và thêm ${extraDays} ngày.` };
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

  // Xóa/Khóa tài khoản
  async deleteUser(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'deleted' }
    });
    return { success: true, message: 'Đã khóa tài khoản' };
  }

  // Khôi phục
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
    await this.prisma.user.delete({
      where: { id: userId }
    });
    return { success: true, message: 'Đã xóa vĩnh viễn tài khoản' };
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
    await this.prisma.user.deleteMany({
      where: { id: { in: userIds } }
    });
    return { success: true, message: `Đã xóa vĩnh viễn ${userIds.length} tài khoản` };
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